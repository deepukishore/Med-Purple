import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { SocialTabs } from "./SocialFeed";
import { PageSkeleton, ErrorState } from "../components/States";
import Button from "../components/Button";
import s from "./Social.module.css";

function ProfileHighlights({ userId }) {
  const { data, error, loading } = useData(`/stories/highlights/${userId}`);
  if (loading && !data) return null;
  if (error) return <p role="status">Study highlights could not be loaded.</p>;
  if (!data?.items?.length) return null;
  const collections = [...new Set(data.items.map((story) => story.highlight))];
  return (
    <section className={s.card}>
      <span className={s.eyebrow}>STUDY HIGHLIGHTS</span>
      <h2>Stories worth keeping</h2>
      <div className={s.studentGrid}>
        {collections.map((collection) => {
          const story = data.items.find((item) => item.highlight === collection);
          const count = data.items.filter((item) => item.highlight === collection).length;
          return (
            <Link
              className={s.card}
              key={collection}
              to={`/community?story=${encodeURIComponent(story.id)}`}
            >
              <h3>{collection}</h3>
              <p>{count} {count === 1 ? "story" : "stories"}</p>
              <strong>{story.title}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Students() {
  const { id } = useParams();
  const [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0);
  usePageMeta(id ? "Student profile" : "Students");
  const { data, loading, error, reload } = useData(
    id
      ? `/profiles/${id}`
      : `/profiles?${new URLSearchParams({ search, offset })}`,
  );
  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <span className={s.eyebrow}>YOUR LEARNING COMMUNITY</span>
          <h1>{id ? "A student’s learning journey." : "Meet the students."}</h1>
          <p>
            Find a familiar name. See how learning and helping others add up.
          </p>
        </div>
      </header>
      <SocialTabs />
      {!id && (
        <label className={s.form}>
          Find a student
          <input
            value={search}
            type="search"
            placeholder="Search by name"
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
          />
        </label>
      )}
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : id ? (
        <>
          <section className={s.profileHero}>
            <span className={s.bigAvatar}>{data.name[0]}</span>
            <div>
              <span className={s.eyebrow}>STUDENT PROFILE</span>
              <h2>{data.name}</h2>
              <p>{data.year}</p>
              <strong>
                Level {data.level} · {data.xp} XP
              </strong>
            </div>
            <div className={s.profileProgress}>
              <div className={s.bar}>
                <span style={{ width: `${data.level_progress}%` }} />
              </div>
              <p>
                {100 - data.level_progress} XP to level {data.level + 1}
              </p>
            </div>
          </section>
          <div className={s.studentGrid}>
            {[
              [data.posts, "Medical posts"],
              [data.doubts, "Doubts asked"],
              [data.solutions, "Accepted solutions"],
            ].map(([count, title]) => (
              <section className={s.card} key={title}>
                <h2>{count}</h2>
                <p>{title}</p>
              </section>
            ))}
          </div>
          <ProfileHighlights userId={id} />
          <Button variant="secondary" to="/students">
            All students
          </Button>
        </>
      ) : (
        <>
          <div className={s.studentGrid}>
            {data.items.map((person) => (
              <Link
                className={`${s.card} ${s.student}`}
                key={person.id}
                to={`/students/${person.id}`}
              >
                <span className={s.avatar}>{person.name[0]}</span>
                <h2>{person.name}</h2>
                <p>{person.year}</p>
                <strong className={s.tag}>
                  Level {person.level} · {person.xp} XP
                </strong>
              </Link>
            ))}
          </div>
          {!data.items.length && <p>No students match this name.</p>}
          <div className={s.actions}>
            <Button
              variant="secondary"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!data.has_more}
              onClick={() => setOffset(offset + 20)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
