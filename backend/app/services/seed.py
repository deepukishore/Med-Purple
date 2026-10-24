from sqlalchemy import select
from app.models import Question, Clip
from .content import QUESTIONS, CLIPS


def seed_content(db):
    for row in QUESTIONS:
        if not db.get(Question, row[0]):
            db.add(
                Question(
                    **dict(
                        zip(
                            [
                                "id",
                                "subject",
                                "topic",
                                "difficulty",
                                "stem",
                                "options",
                                "correct_index",
                                "explanation",
                                "source_url",
                            ],
                            row,
                        )
                    )
                )
            )
    for item in CLIPS:
        if not db.get(Clip, item["id"]):
            db.add(
                Clip(
                    **item,
                    video_path=f"/media/{item['id']}.mp4",
                    poster_path=f"/media/{item['id']}.webp",
                )
            )
    db.commit()
