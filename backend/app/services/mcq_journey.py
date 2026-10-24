"""Monotonic, one-time learning rewards derived from persisted study activity."""

LEVELS = (
    ("Foundation", "Build your basics", 3, 30),
    ("Applied", "Put concepts to work", 3, 50),
    ("Challenge", "Test deeper recall", 2, 75),
)


def mcq_journey(attempts, questions, completions):
    mastered = {a.question_id for a in attempts if a.correct}
    missed, recovered = set(), set()
    for attempt in attempts:
        if not attempt.correct:
            missed.add(attempt.question_id)
        elif attempt.question_id in missed:
            recovered.add(attempt.question_id)
    levels, tasks = [], []

    def task(key, title, current, target, xp):
        return dict(key=key, title=title, current=min(current, target), target=target,
                    xp=xp, done=current >= target)

    tasks.append(task("first_set", "Finish a question set", len(completions), 1, 25))
    tasks.append(task("perfect_set", "Get every answer right in a set", sum(c.correct == c.total for c in completions), 1, 25))
    tasks.append(task("comeback", "Correct a previous mistake", len(recovered), 1, 15))
    for number, (name, description, target, xp) in enumerate(LEVELS, 1):
        ids = {q.id for q in questions if q.difficulty == name}
        count = len(ids & mastered)
        quest = task(name.lower(), f"Master {target} {name} questions", count, target, xp)
        tasks.append(quest)
        levels.append(dict(name=name, number=number, description=description,
                           total=len(ids), mastered=count, target=target, xp=xp, done=quest["done"]))
    return dict(levels=levels, tasks=tasks, completed_sets=len(completions),
                bonus_xp=sum(t["xp"] for t in tasks if t["done"]))
