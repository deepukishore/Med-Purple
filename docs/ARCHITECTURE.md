# Architecture

React/Vite and Expo share only the REST transport, design tokens, anatomical geometry, and policy content. Each interface owns its native rendering, navigation, input patterns, and components.

## Data flow

Both apps use `/api/v1`. FastAPI validates requests with Pydantic, authenticates access JWTs, and uses SQLAlchemy sessions against MySQL. Every private record is scoped by the authenticated user id. SQLite is supported only for lightweight local tests; production configuration rejects it. The explicit Alembic revision contains the initial tables, indexes, uniqueness constraints, and foreign keys.

The client starts by refreshing an existing session. Only a 401 starts a fresh guest session; connection/server errors show a retry state. Registering while authenticated as a guest upgrades that same user. Logging in to an existing account intentionally switches to that account and does not merge another guest history.

## Auth and security

- Argon2id password hashing through pwdlib.
- Access JWT: HS256, issuer/audience/expiry checks, 15-minute default lifetime.
- Refresh: random 48-byte opaque secret; only its SHA-256 hash is stored. Rotation marks the old session revoked inside a row lock before issuing the next token.
- Web refresh cookie: HTTP-only, SameSite=Strict; Secure required in production.
- Native refresh token: Expo SecureStore; never AsyncStorage.
- Explicit auth origin checks, bounded request schemas, protected endpoint dependencies, and user ownership checks.
- Registration invalidates earlier refresh sessions. Deleting an account removes owned records and immediately invalidates access tokens by making their subject unavailable.
- Sign-out revokes the current refresh session. Existing access JWTs expire naturally within 15 minutes. This is documented in the privacy policy.
- A per-process auth limiter protects local development. A shared gateway limiter is required when scaling.

## Study calculations

Progress is the percentage of seeded questions attempted at least once. Accuracy uses all submitted attempts. Daily question counts use distinct questions, preventing repeated answers from inflating the daily goal. Streaks include days with question attempts, completed clips, or newly recorded anatomy study, calculated in the profile’s IANA timezone. A streak remains current when the last active day was yesterday.

Mistake review includes questions whose most recent answer was wrong. A later correct answer resolves them. A question submission UUID prevents double-counting network retries. Reuse of the UUID for different content returns 409. Bookmark and clip-save operations are idempotent.

MCQ Practice mode returns correctness and explanations after each submitted answer. Timed Exam mode instead persists a fixed question list, answer selections, pass mark, and deadline in `mcq_exam_sessions`; its answer endpoint never returns correctness. Only the completion endpoint exposes scoring and explanations. The server checks pass thresholds without rounding, makes completion idempotent, persists attempts for progress, and applies capped XP rewards. Exam mode defaults to 60 seconds per question and a 70% pass mark.

## Study stories

Study stories use migrations `a8c2e6f130bd` and `b47de291a6c0`. Each record contains a JSON slide list, audience and exclusions, scheduling and expiry timestamps, and an optional highlight collection. Slides support multiple keyed stickers; story views and slide views, sticker responses, reactions, follows, group membership, upload ownership, and moderation flags are stored separately. Feed results put unseen stories first and can be filtered by subject. Published stories expire after their selected duration unless pinned; the API promotes scheduled stories and marks expired records while removing their media during its periodic maintenance task. Expired rows remain available for reporting and are excluded from feeds.

Images and short videos are stored under `backend/app/private/stories`, outside the public static-media mount. Clients upload validated PNG, JPEG, WebP, MP4, or WebM data, subject to 10 MB image and 30 MB video limits and a per-user limit of 20 uploads per hour. Uploads must be owned by the posting account and can be associated with only one story. Clients receive a story-specific, signed media URL when an authorized story is serialized. The URL is a 10-minute bearer link and should be treated as sensitive; media fetches check visibility against the authorized recipient bound into the token. Do not move this directory beneath the public `/media` mount.

Quiz answers are hidden until submission; owners receive per-sticker response breakdowns. Poll results are returned to voters and owners. Posting, responding, reacting, creator streaks, and featured stories award XP through the shared ledger with idempotency keys and daily caps. The home story bar and browser/native viewers support subject filters, audience controls, highlights, multi-slide navigation, and story interactions. Three incorrect-information reports trigger review escalation, while patient-photo/identifier content is rejected before publication.

The composer still creates one slide and one sticker at a time even though the API supports slide arrays and multiple stickers per slide. Saved story text can become a note or flashcard, but story media is not copied into durable note attachments. Senior/doctor verification and birthday data do not yet have trusted account workflows, so the app must not present unverified credentials or generate birthday milestones. Group stories currently support a shared audience, not multi-author slide editing. Mobile diagram stories accept uploaded media but do not yet include an in-app drawing canvas.

MedBytes completion is recorded once per user, clip, and local calendar day. Playback completion is client-reported and is a learning convenience, not an anti-cheating or credentialing system. The explicit goal checklist may be checked manually; it never fabricates question attempts.

## 3D and motion

`shared/anatomy` constructs an original six-structure study model. Web renders with Three.js and pointer/key controls. Native renders the same scene through Expo GL and PanResponder; optional DeviceMotion subscriptions run only when enabled and focused. Both renderers release GPU resources on unmount and pause inactive views. OS/browser reduced-motion preferences disable ornamental movement.

The heart is a conceptual shape study, not a segmented scan or clinical atlas. Labels and educational facts come from the API; no clinical claims depend on exact mesh proportions.

## Extending the app

Add a model and migration, Pydantic schemas, a service, and a router for new backend capabilities. Add the shared transport call to each platform’s independent screen. Keep new visual values in the token JSON package. Extend the catalog in `backend/app/services/content.py`; consider a content migration or editorial CMS once records can be edited after release. The starter seeder deliberately inserts missing IDs rather than overwriting existing content.

The optional `open_study_section` WebMCP tool only navigates among existing routes, validates its input, and is feature-detected. It does not bypass API authorization or submit answers.
