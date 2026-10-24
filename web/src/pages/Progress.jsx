import { Trophy, Fire, Lightning, Target } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { PageSkeleton, ErrorState } from "../components/States";
import Button from "../components/Button";
import s from "./Studio.module.css";
export default function Progress() {
  usePageMeta("Progress & rewards");
  const { data, loading, error, reload } = useData("/progress");
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const max = Math.max(1, ...data.activity.map((x) => x.xp || 0));
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>EVERY SMALL WIN COUNTS</span>
          <h1>Look how far you've come.</h1>
          <p>Your real activity. Your pace. Your next level.</p>
        </div>
        <Button to="/learn">Explore ways to earn XP</Button>
      </div>
      <div className={s.grid}>
        {[
          [Lightning, data.xp, "Total XP"],
          [Fire, data.streak, "Day streak"],
          [Target, data.accuracy + "%", "Overall accuracy"],
        ].map(([Icon, value, title]) => (
          <div className={s.stat} key={title}>
            <Icon size={25} color="#8052c2" />
            <strong>{value}</strong>
            <span>{title}</span>
          </div>
        ))}
      </div>
      <section className={s.panel}>
        <div className={s.sectionHead}>
          <h2>Level {data.level} explorer</h2>
          <span className={s.chip}>
            {100 - data.level_progress} XP to level {data.level + 1}
          </span>
        </div>
        <div className={s.bar}>
          <span style={{ width: data.level_progress + "%" }} />
        </div>
        <p className={s.muted} style={{ marginTop: 14 }}>
          One level across the entire app. Study, create, plan, and help other
          students to earn XP. Every 100 XP advances your level. Earned XP stays
          with you even if you remove a note or post later.
        </p>
      </section>
      <div className={s.two}>
        <section className={s.panel}>
          <h2>Your last 14 days</h2>
          <div className={s.chart}>
            {data.activity.map((day) => (
              <div
                className={s.chartDay}
                key={day.day}
                title={`${day.day}: ${day.xp || 0} XP across the app`}
              >
                <div
                  style={{
                    height: Math.max(3, ((day.xp || 0) / max) * 110),
                  }}
                />
                <small>{day.day.slice(8)}</small>
              </div>
            ))}
          </div>
          <p className={s.muted}>
            XP earned across every part of the app. Hover or explore the daily
            totals below.
          </p>
          <details style={{ marginTop: 14 }}>
            <summary>Daily activity totals</summary>
            {data.activity.map((d) => (
              <p key={d.day} className={s.muted}>
                {d.day}: {d.xp || 0} XP · {d.questions} questions, {d.videos}{" "}
                videos
              </p>
            ))}
          </details>
        </section>
        <section className={s.panel}>
          <h2>Where to focus next</h2>
          {data.subjects.map((item) => (
            <div key={item.subject} className={s.quest}>
              <div>
                <h3>{item.subject}</h3>
                <small>
                  {item.answered} / {item.total} questions tried ·{" "}
                  {item.accuracy === null
                    ? "No attempts yet"
                    : item.accuracy + "% latest-answer accuracy"}
                </small>
                <div className={s.bar} style={{ marginTop: 10 }}>
                  <span
                    style={{ width: (item.answered / item.total) * 100 + "%" }}
                  />
                </div>
              </div>
              <Button
                to={"/mcqs?subject=" + encodeURIComponent(item.subject)}
                small
                variant="secondary"
              >
                Practice
              </Button>
            </div>
          ))}
        </section>
      </div>
      <section className={s.panel}>
        <h2>Ways to earn XP</h2>
        <p className={s.muted}>
          Library rewards are earned once per item. Contributions have daily
          limits, and repeat replies, likes, and completion requests do not
          duplicate rewards.
        </p>
        <div className={s.grid} style={{ marginTop: 20 }}>
          {data.reward_rules?.map((rule) => (
            <Button key={rule.activity} variant="secondary" to={rule.route}>
              {rule.title} · {rule.points ? `+${rule.points} XP` : "Quest XP"}
              {rule.daily_cap ? ` (up to ${rule.daily_cap}/day)` : ""}
            </Button>
          ))}
        </div>
      </section>
      <section className={s.panel}>
        <h2>Recent XP activity</h2>
        {data.xp_history?.length ? (
          data.xp_history.map((event) => (
            <div key={event.id} className={s.quest}>
              <span>
                {data.reward_rules.find(
                  (rule) => rule.activity === event.activity,
                )?.title || event.activity}
                <small style={{ display: "block" }}>{event.day}</small>
              </span>
              <strong>+{event.points} XP</strong>
            </div>
          ))
        ) : (
          <p className={s.muted}>
            Your first learning activity starts your XP story.
          </p>
        )}
      </section>
      <section>
        <div className={s.sectionHead}>
          <h2>Your badge shelf</h2>
          <span className={s.chip}>
            {data.badges.filter((b) => b.earned).length} / {data.badges.length}{" "}
            unlocked
          </span>
        </div>
        <div className={s.grid}>
          {data.badges.map((b) => (
            <div
              key={b.name}
              className={`${s.badge} ${b.earned ? s.earned : ""}`}
            >
              <Trophy size={38} weight={b.earned ? "duotone" : "regular"} />
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <small>{b.earned ? "Unlocked!" : "Keep exploring"}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
