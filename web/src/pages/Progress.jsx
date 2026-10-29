import { useState } from "react";
import { Trophy, Fire, Lightning, Target } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { PageSkeleton, ErrorState } from "../components/States";
import Button from "../components/Button";
import s from "./Studio.module.css";
export default function Progress() {
  usePageMeta("Progress & rewards");
  const { data, loading, error, reload } = useData("/progress");
  const [wrappedStatus, setWrappedStatus] = useState("");
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const max = Math.max(1, ...data.activity.map((x) => x.xp || 0));
  const strongest = [...data.subjects]
    .filter((subject) => subject.answered > 0)
    .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0];
  const archetype = strongest ? `${strongest.subject} menace` : data.total_answered ? "Steady builder" : "Curious explorer";
  async function shareWrapped() {
    const text = `My Med Purple Study Wrapped: ${archetype} · ${data.total_answered} questions · ${data.accuracy}% accuracy · ${data.streak}-day streak · Level ${data.level}.`;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 560;
      const context = canvas.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 1000, 560);
      gradient.addColorStop(0, "#241634");
      gradient.addColorStop(1, "#473065");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#c9f2e7";
      context.font = "700 30px Manrope, sans-serif";
      context.fillText("MED PURPLE / STUDY WRAPPED", 70, 82);
      context.fillStyle = "#fffaf1";
      context.font = "700 70px Manrope, sans-serif";
      context.fillText(archetype, 70, 190);
      context.font = "700 46px Manrope, sans-serif";
      context.fillText(`${data.total_answered} questions · ${data.accuracy}% accuracy`, 70, 302);
      context.fillText(`${data.streak}-day streak · Level ${data.level} · ${data.xp} XP`, 70, 384);
      context.fillStyle = "#d6c4e6";
      context.font = "500 28px Manrope, sans-serif";
      context.fillText("A little more understood, one session at a time.", 70, 482);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], "med-purple-study-wrapped.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "My Med Purple Study Wrapped", text, files: [file] });
          setWrappedStatus("Study Wrapped card shared.");
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: "My Med Purple Study Wrapped", text });
        setWrappedStatus("Study Wrapped shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setWrappedStatus("Study Wrapped summary copied.");
      } else setWrappedStatus(text);
    } catch {
      setWrappedStatus("Sharing was cancelled or unavailable.");
    }
  }
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
      <section className={s.panel} aria-labelledby="study-wrapped-title">
        <div className={s.sectionHead}>
          <div>
            <h2 id="study-wrapped-title">Your Study Wrapped</h2>
            <p className={s.muted}>A shareable snapshot of the practice you have actually recorded.</p>
          </div>
          <Button small variant="secondary" onClick={shareWrapped}>Make my card</Button>
        </div>
        <p className={s.chip} style={{ display: "inline-flex", marginTop: 4 }}>{archetype}</p>
        <span role="status" aria-live="polite" style={{ marginLeft: 12 }}>{wrappedStatus}</span>
      </section>
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
        <p className={s.muted}>Earned badges work as stickers: drag one onto your profile area on desktop, or pin it from Profile on touch screens.</p>
        <div className={s.grid}>
          {data.badges.map((b) => (
            <div
              key={b.name}
              className={`${s.badge} ${b.earned ? s.earned : ""}`}
              draggable={b.earned}
              onDragStart={(event) => {
                if (!b.earned) return;
                event.dataTransfer.setData("application/x-med-purple-badge", b.name);
                event.dataTransfer.setData("text/plain", b.name);
                event.dataTransfer.effectAllowed = "copy";
              }}
              aria-label={`${b.name}, ${b.earned ? "earned badge sticker, draggable" : "not yet earned"}`}
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
