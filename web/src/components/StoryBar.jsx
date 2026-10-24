import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useData from "../hooks/useData";
import s from "../pages/Desk.module.css";

const baseSubjects = ["Anatomy", "Physiology", "Pharmacology", "Medicine", "NEET PG"];

export default function StoryBar() {
  const [subject, setSubject] = useState("");
  const { data, error, loading, reload } = useData(
    `/stories?subject=${encodeURIComponent(subject)}`,
  );
  const navigate = useNavigate();
  const items = data?.items || [];
  const creators = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const key = item.creator_id || item.id;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, { ...item, stories: [item] });
      } else {
        current.stories.push(item);
        if (current.seen && !item.seen) Object.assign(current, item, { stories: current.stories });
      }
    }
    return [...groups.values()];
  }, [items]);
  const subjects = [...new Set([...baseSubjects, ...items.map((item) => item.subject)])];

  return (
    <section className={s.homeStoryBar} aria-label="Study stories">
      <header>
        <div>
          <p className={s.overline}>STUDY WITH YOUR COMMUNITY</p>
          <h2>Stories</h2>
        </div>
        <button type="button" onClick={() => navigate("/community?createStory=1")}>
          + Your story
        </button>
      </header>
      <div className={s.homeStorySubjects} aria-label="Filter stories by subject">
        <button type="button" aria-pressed={!subject} onClick={() => setSubject("")}>All</button>
        {subjects.map((tag) => (
          <button
            type="button"
            key={tag}
            aria-pressed={subject.toLowerCase() === tag.toLowerCase()}
            onClick={() => setSubject(subject === tag ? "" : tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      {error ? (
        <p className={s.homeStoryError} role="status">
          <span>Stories could not be loaded.</span>
          <button type="button" onClick={reload}>Retry</button>
        </p>
      ) : loading && !data ? (
        <p aria-live="polite">Loading stories…</p>
      ) : creators.length ? (
        <div className={s.homeStoryItems}>
          {creators.map((creator) => {
            const story = creator.stories.find((item) => !item.seen) || creator.stories[0];
            return (
              <button
                type="button"
                className={s.homeStoryItem}
                key={creator.creator_id || creator.id}
                onClick={() => navigate(`/community?story=${encodeURIComponent(story.id)}`)}
                aria-label={`${story.creator}, ${story.title}, ${story.seen ? "seen" : "unseen"}`}
              >
                <span className={`${s.homeStoryAvatar} ${story.seen ? s.seen : s.unseen}`}>
                  {story.creator?.[0] || "S"}
                </span>
                <strong>{story.creator}</strong>
                <small>{story.subject}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <p>No live stories yet. Share a useful study tip.</p>
      )}
    </section>
  );
}
