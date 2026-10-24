from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.security import (
    current_user,
    optional_user,
    passwords,
    issue_tokens,
    token_hash,
    check_origin,
)
from app.models import (
    User,
    RefreshSession,
    Attempt,
    Bookmark,
    ClipView,
    SavedItem,
    Goal,
    AnatomyVisit,
)
from app.schemas.contracts import *

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/guest", response_model=TokenOut)
def guest(request: Request, response: Response, db: Session = Depends(get_db)):
    check_origin(request)
    user = User()
    db.add(user)
    db.flush()
    return issue_tokens(user, db, response, request.headers.get("x-client") == "native")


@router.post("/register", response_model=TokenOut, status_code=201)
def register(
    data: RegisterIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    existing=Depends(optional_user),
):
    check_origin(request)
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account already uses this email. Sign in instead.")
    user = existing if existing and existing.is_guest else User()
    user.email = email
    if data.profile:
        for key, value in data.profile.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
    user.name = data.name.strip()
    user.password_hash = passwords.hash(data.password)
    user.is_guest = False
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already uses this email.")
    db.execute(delete(RefreshSession).where(RefreshSession.user_id == user.id))
    from app.services.xp import award
    award(db, user, "profile:setup", "profile")
    return issue_tokens(user, db, response, request.headers.get("x-client") == "native")


@router.post("/login", response_model=TokenOut)
def login(
    data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)
):
    check_origin(request)
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    # Equal-cost verification prevents a fast missing-email timing oracle.
    hashed = user.password_hash if user and user.password_hash else DUMMY_HASH
    valid = passwords.verify(data.password, hashed)
    if not user or not valid:
        raise HTTPException(401, "Email or password is incorrect.")
    return issue_tokens(user, db, response, request.headers.get("x-client") == "native")


DUMMY_HASH = passwords.hash("unusable-dummy-password")


@router.post("/refresh", response_model=TokenOut)
def refresh(
    data: RefreshIn, request: Request, response: Response, db: Session = Depends(get_db)
):
    check_origin(request)
    token = data.refresh_token or request.cookies.get("mp_refresh")
    if not token:
        raise HTTPException(401, "No active session.")
    session = db.scalar(
        select(RefreshSession)
        .where(RefreshSession.token_hash == token_hash(token))
        .with_for_update()
    )
    if (
        not session
        or session.revoked
        or session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    ):
        raise HTTPException(401, "Session expired. Sign in again.")
    session.revoked = True
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Account not found.")
    return issue_tokens(user, db, response, bool(data.refresh_token))


@router.post("/logout", response_model=Success)
def logout(
    data: RefreshIn, request: Request, response: Response, db: Session = Depends(get_db)
):
    check_origin(request)
    token = data.refresh_token or request.cookies.get("mp_refresh")
    if token:
        session = db.scalar(
            select(RefreshSession).where(RefreshSession.token_hash == token_hash(token))
        )
        if session:
            session.revoked = True
            db.commit()
    response.delete_cookie("mp_refresh", path="/api/v1/auth")
    return Success()


@router.get("/me", response_model=UserOut)
def me(user=Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    data: ProfileIn, user=Depends(current_user), db: Session = Depends(get_db)
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value.strip() if isinstance(value, str) else value)
    from app.services.xp import award
    award(db, user, "profile:setup", "profile")
    db.commit()
    return user


@router.delete("/me", status_code=204)
def delete_me(
    response: Response, user=Depends(current_user), db: Session = Depends(get_db)
):
    from app.models import CardReview, StudyBlock, Discussion, DiscussionReply, MCQCompletion, MCQExamSession, DiscussionLike, DiscussionReplyLike, XPEvent, FocusSession, FeatureState, QuickCapture, StudySet, StudyHistory, StudyRoomMessage, CollaborativeNote
    from sqlalchemy import update
    owned_threads = select(Discussion.id).where(Discussion.user_id == user.id)
    owned_replies = select(DiscussionReply.id).where(DiscussionReply.user_id == user.id)
    db.execute(update(Discussion).where(Discussion.accepted_reply_id.in_(owned_replies)).values(accepted_reply_id=None))
    db.execute(delete(DiscussionLike).where(DiscussionLike.discussion_id.in_(owned_threads)))
    db.execute(delete(DiscussionReply).where(DiscussionReply.discussion_id.in_(owned_threads)))
    db.execute(delete(CollaborativeNote).where(CollaborativeNote.owner_id == user.id))
    for model in (
        DiscussionLike,
        DiscussionReplyLike,
        FeatureState,
        QuickCapture,
        StudySet,
        StudyHistory,
        StudyRoomMessage,
        XPEvent,
        FocusSession,
        MCQCompletion,
        MCQExamSession,
        DiscussionReply,
        Discussion,
        CardReview,
        StudyBlock,
        RefreshSession,
        Attempt,
        Bookmark,
        ClipView,
        SavedItem,
        Goal,
        AnatomyVisit,
    ):
        db.execute(delete(model).where(model.user_id == user.id))
    db.delete(user)
    db.commit()
    response.delete_cookie("mp_refresh", path="/api/v1/auth")
