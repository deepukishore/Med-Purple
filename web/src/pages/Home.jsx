import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle,
  Lightning,
  Target,
  CalendarCheck,
  Trophy,
  Brain,
  PlayCircle,
  Cube,
  Stack,
  CalendarDots,
  BookmarkSimple,
  Sparkle,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { PageSkeleton, ErrorState } from "../components/States";
import Button from "../components/Button";
import FocusTimer from "../components/FocusTimer";
import StudyLaunchpad from "../components/StudyLaunchpad";
import QuickRecall from "../components/QuickRecall";
import StoryBar from "../components/StoryBar";
import s from "./Desk.module.css";
export default function Home() {
  usePageMeta(
    "Study desk",
    "Your medical revision desk: question practice, viva recall, and a realistic study plan.",
  );
  const dashboard = useData("/dashboard"),
    progress = useData("/progress"),
    storyOfDay = useData("/stories/featured");
  if (
    (dashboard.loading && !dashboard.data) ||
    (progress.loading && !progress.data)
  )
    return <PageSkeleton />;
  if (dashboard.error || progress.error)
    return (
      <ErrorState
        message={dashboard.error || progress.error}
        onRetry={() => {
          dashboard.reload();
          progress.reload();
        }}
      />
    );
  const d = dashboard.data,
    p = progress.data;
  const weakest = [...p.subjects]
    .filter((x) => x.answered > 0 && x.accuracy < 100)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const quests = [
    {
      title: "Question practice",
      detail: `${d.answered_today} of ${d.daily_target} questions completed today`,
      to: "/mcqs?set=5",
      done: d.answered_today >= d.daily_target,
      icon: Brain,
      color: "violet",
    },
    {
      title: "Review a medical concept",
      detail: `${d.clips_today} MedBytes watched today`,
      to: "/medbytes",
      done: d.clips_today > 0,
      icon: PlayCircle,
      color: "peach",
    },
    {
      title: "Explore anatomy",
      detail: "Review one structure in the atlas",
      to: "/anatomy",
      done: d.goals.find((x) => x.key === "anatomy")?.done,
      icon: Cube,
      color: "mint",
    },
  ];
  return (
    <div className={s.desk}>
      <header className={s.welcome}>
        <div>
          <p className={s.overline}>MED PURPLE / STUDY DESK</p>
          <h1>
            Welcome back, <span>{d.user.name.split(" ")[0]}.</span>
          </h1>
          <p>Your progress, your pace. Let’s make today count.</p>
        </div>
        <Link to="/progress" className={s.streak}>
          <CalendarCheck size={22} weight="light" />
          <div>
            <b>{p.streak} day study streak</b>
            <small>
              {p.streak
                ? "Consistent study, day by day."
                : "Start a consistent study habit today."}
            </small>
          </div>
        </Link>
      </header>
      <StoryBar />
      <div className={s.columns}>
        <div className={s.mainColumn}>
          <div className={s.statStrip}>
            <Link to="/progress">
              <span className={s.statIcon}>
                <Lightning size={21} weight="fill" />
              </span>
              <div>
                <strong>{p.xp}</strong>
                <small>Experience points</small>
              </div>
            </Link>
            <Link to="/progress">
              <span className={s.statIcon}>
                <Target size={21} />
              </span>
              <div>
                <strong>{p.total_answered ? p.accuracy + "%" : "—"}</strong>
                <small>Question accuracy</small>
              </div>
            </Link>
            <Link to="/progress">
              <span className={s.statIcon}>
                <Trophy size={21} />
              </span>
              <div>
                <strong>
                  {p.badges.filter((b) => b.earned).length}
                  <i> / {p.badges.length}</i>
                </strong>
                <small>Achievements</small>
              </div>
            </Link>
          </div>
          <section className={s.storyOfDay} aria-label="Story of the day">
            <div>
              <p className={s.overline}>COMMUNITY PICK</p>
              <h2>Story of the day</h2>
              {storyOfDay.data?.item ? (
                <>
                  <p>
                    {storyOfDay.data.item.title} · {storyOfDay.data.item.subject}
                  </p>
                  <Link to={`/community?story=${encodeURIComponent(storyOfDay.data.item.id)}`}>
                    Read this story <ArrowRight size={16} />
                  </Link>
                </>
              ) : storyOfDay.error ? (
                <p role="status">The featured story could not be loaded.</p>
              ) : (
                <p>A helpful community story will appear here.</p>
              )}
            </div>
            {storyOfDay.error && (
              <button type="button" onClick={storyOfDay.reload}>Retry</button>
            )}
          </section>
          <StudyLaunchpad
            subjects={p.subjects}
            recommendedSubject={weakest?.subject || ""}
          />
          <QuickRecall
            onCompleted={() => {
              dashboard.reload();
              progress.reload();
            }}
          />
          <section>
            <div className={s.sectionHead}>
              <div>
                <p className={s.overline}>STUDY TOOLS</p>
                <h2>Continue your studies</h2>
              </div>
              <Link to="/learn">
                The whole toolkit <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className={s.shortcuts}>
              {[
                [
                  "/mcqs?mode=mistakes",
                  "Mistake review",
                  "Revisit missed questions and strengthen recall.",
                  BookmarkSimple,
                  "peach",
                  "REVISIT",
                ],
                [
                  "/flashcards",
                  "Viva rehearsal",
                  "Practice concise answers for your next viva.",
                  Stack,
                  "violet",
                  "RECALL",
                ],
                [
                  "/anatomy",
                  "3D anatomy atlas",
                  "Explore body systems and named structures in 3D.",
                  Cube,
                  "mint",
                  "EXPLORE",
                ],
              ].map(([to, title, copy, Icon, color, tag]) => (
                <Link className={`${s.shortcut} ${s[color]}`} key={to} to={to}>
                  <div>
                    <Icon size={28} weight="duotone" />
                    <ArrowUpRight size={18} />
                  </div>
                  <small>{tag}</small>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </Link>
              ))}
            </div>
          </section>
          <section className={s.revision}>
            <span className={s.revisionIcon}>
              <Sparkle size={26} />
            </span>
            <div>
              <p className={s.overline}>STUDY INSIGHT</p>
              <h3>
                {weakest
                  ? "Prioritise " + weakest.subject + " next."
                  : "Build your progress baseline."}
              </h3>
              <p>
                {weakest
                  ? `Current question accuracy is ${weakest.accuracy}%. A focused review can strengthen this area.`
                  : "Complete a question set to see a personalised subject review here."}
              </p>
            </div>
            <Button
              small
              variant="secondary"
              to={
                weakest
                  ? "/mcqs?subject=" + encodeURIComponent(weakest.subject)
                  : "/mcqs?set=5"
              }
            >
              Review subject <ArrowRight size={16} />
            </Button>
          </section>
        </div>
        <aside className={s.rail}>
          <section className={s.identity}>
            <div className={s.identityTop}>
              <span>STUDENT PROFILE</span>
              <Sparkle size={17} />
            </div>
            <div className={s.identityMain}>
              <span className={s.level}>L{p.level}</span>
              <div>
                <h3>{d.user.name}</h3>
                <p>{d.user.year}</p>
              </div>
            </div>
            <div className={s.identityProgress}>
              <span style={{ width: p.level_progress + "%" }} />
            </div>
            <div className={s.identityBottom}>
              <span>
                {100 - p.level_progress} XP to level {p.level + 1}
              </span>
              <Link to="/progress">View progress</Link>
            </div>
          </section>
          <section className={s.questPanel}>
            <div className={s.sectionHead}>
              <div>
                <p className={s.overline}>DAILY CHALLENGES</p>
                <h2>Today’s quests</h2>
              </div>
              <span className={s.counter}>
                {quests.filter((q) => q.done).length} of 3 complete
              </span>
            </div>
            <div className={s.challengeProgress}>
              <div>
                <span>Challenge progress</span>
                <strong>
                  {Math.round(
                    (quests.filter((q) => q.done).length / quests.length) * 100,
                  )}
                  %
                </strong>
              </div>
              <span className={s.challengeTrack}>
                <i
                  style={{
                    width: `${(quests.filter((q) => q.done).length / quests.length) * 100}%`,
                  }}
                />
              </span>
            </div>
            {quests.map((q, i) => (
              <Link key={q.to} to={q.to} className={s.quest}>
                <span className={`${s.questIcon} ${s[q.color]}`}>
                  {q.done ? (
                    <CheckCircle size={25} weight="fill" />
                  ) : (
                    <q.icon size={25} weight="duotone" />
                  )}
                </span>
                <div>
                  <h3>{q.title}</h3>
                  <p>{q.detail}</p>
                </div>
                <span className={s.questStatus}>
                  {q.done ? "DONE" : "0" + (i + 1)}
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </section>
          <FocusTimer />
          <section className={s.schedule}>
            <div className={s.sectionHead}>
              <div>
                <p className={s.overline}>YOUR NEXT CHECKPOINT</p>
                <h2>{d.user.exam_name}</h2>
              </div>
              <CalendarDots size={23} />
            </div>
            <div className={s.countdown}>
              <strong>{d.days_to_exam}</strong>
              <span>
                days remaining
                <br />
                <Link to="/profile">Edit exam date ↗</Link>
              </span>
            </div>
            <div className={s.scheduleLabel}>
              TODAY'S PLAN <span>{d.schedule.length} sessions</span>
            </div>
            {d.schedule.length ? (
              d.schedule.slice(0, 3).map((b, i) => (
                <div className={s.scheduleItem} key={i}>
                  <time>{b.time}</time>
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className={s.noPlan}>
                No sessions planned yet.
                <br />
                Add a focused study block when ready.
              </p>
            )}
            <Link to="/planner" className={s.planLink}>
              Open study planner <ArrowUpRight size={17} />
            </Link>
          </section>
          <Link to="/community" className={s.circle}>
            <div className={s.circleDots} aria-hidden="true">
              <span>?</span>
              <span>!</span>
              <span>✳</span>
            </div>
            <h3>Study with peers.</h3>
            <p>Ask a question, compare ideas, and learn with other students.</p>
            <b>
              Open community <ArrowUpRight size={18} />
            </b>
          </Link>
        </aside>
      </div>
    </div>
  );
}
