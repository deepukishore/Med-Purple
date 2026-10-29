import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Brain,
  Cube,
  PlayCircle,
  Sparkle,
  Stack,
  Target,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import HomeSpecimenStage from "../components/HomeSpecimenStage";
import QuickRecall from "../components/QuickRecall";
import StoryBar from "../components/StoryBar";
import s from "./Desk.module.css";

export default function Home() {
  usePageMeta(
    "Med Purple — study in three dimensions",
    "Explore a named skeletal reference, practise with real questions, and keep your medical revision moving.",
  );
  const dashboard = useData("/dashboard");
  const progress = useData("/progress");
  const quickLesson = useData("/medbytes?limit=1");
  const record = progress.data;
  const totalAnswered = record?.total_answered || 0;
  const subjects = Array.isArray(record?.subjects) ? record.subjects : [];
  const weakest = subjects
    .filter((subject) => subject.answered > 0 && Number.isFinite(subject.accuracy))
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const nextPath = weakest
    ? `/mcqs?subject=${encodeURIComponent(weakest.subject)}`
    : "/mcqs?set=5";
  const nextLabel = weakest ? `Continue ${weakest.subject}` : "Start a 5-question sprint";
  const lesson = quickLesson.data?.items?.[0];
  const d = dashboard.data;
  const goals = Array.isArray(d?.goals) ? d.goals : [];
  const completedGoals = goals.filter((goal) => goal.done).length;

  return (
    <main className={`${s.desk} ${s.homeWorld}`}>
      <header className={s.opening}>
        <div className={s.openingLayout}>
          <div className={s.openingCopy}>
            <span className={s.openingKicker}><i /> MED PURPLE / ANATOMY IN MOTION</span>
            <h1>See the body.<br /><em>Understand the why.</em></h1>
            <p>
              Step into a medical study space made for looking closer, testing what you know, and keeping the ideas that matter.
            </p>
            <nav className={s.openingActions} aria-label="Start studying">
              <Link className={s.actionPrimary} to="/anatomy">
                Enter the anatomy atlas <ArrowRight size={17} />
              </Link>
              <Link className={s.actionSecondary} to={nextPath}>
                {nextLabel} <ArrowUpRight size={16} />
              </Link>
            </nav>
            <div className={s.heroProof} aria-label="Anatomy reference details">
              <span><strong>9</strong><small>layers</small></span>
              <i aria-hidden="true" />
              <span><strong>2,491</strong><small>named mesh parts</small></span>
              <i aria-hidden="true" />
              <span><strong>01</strong><small>reference specimen</small></span>
            </div>
            {record && (
              <Link className={s.heroProgress} to="/progress">
                <span className={s.progressGlyph}><Target size={17} /></span>
                <span>
                  <strong>{totalAnswered.toLocaleString()} questions answered</strong>
                  <small>{record.streak ? `${record.streak} day study streak` : "Your practice history is ready to grow"}</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            )}
            {progress.error && (
              <button className={s.inlineRetry} type="button" onClick={progress.reload}>
                Study totals are unavailable. Retry
              </button>
            )}
          </div>
          <HomeSpecimenStage className={s.openingStage} />
        </div>
        <a className={s.scrollCue} href="#study-path">
          <span>SCROLL INTO YOUR NEXT STUDY MOVE</span><ArrowDown size={15} />
        </a>
      </header>

      <section className={s.studyPath} id="study-path" aria-labelledby="study-path-title">
        <div className={s.pathIntro}>
          <div>
            <span className={s.sectionKicker}>A STUDY SESSION, IN THREE MOVES</span>
            <h2 id="study-path-title">Look closer.<br /><em>Bring it back.</em></h2>
          </div>
          <p>Move from an anatomical view to a real question, then save a prompt for the next time you sit down.</p>
        </div>
        <div className={s.pathRail}>
          <Link to="/anatomy" className={`${s.pathStop} ${s.pathSee}`}>
            <span className={s.pathStepNo}>01 / SEE</span>
            <span className={s.pathSymbol}><Cube size={23} weight="duotone" /></span>
            <span className={s.pathTitle}>Explore a structure</span>
            <span className={s.pathCopy}>Turn the reference model and select a named part.</span>
            <span className={s.pathLink}>Open the atlas <ArrowUpRight size={15} /></span>
          </Link>
          <Link to={nextPath} className={`${s.pathStop} ${s.pathTest}`}>
            <span className={s.pathStepNo}>02 / TEST</span>
            <span className={s.pathSymbol}><Brain size={23} weight="duotone" /></span>
            <span className={s.pathTitle}>{weakest ? `Revisit ${weakest.subject}` : "Try a question set"}</span>
            <span className={s.pathCopy}>{weakest ? `${weakest.accuracy}% recorded accuracy from ${weakest.answered} answers.` : "Start with five questions and source-linked explanations."}</span>
            <span className={s.pathLink}>Start practice <ArrowUpRight size={15} /></span>
          </Link>
          <Link to="/learn" className={`${s.pathStop} ${s.pathKeep}`}>
            <span className={s.pathStepNo}>03 / KEEP</span>
            <span className={s.pathSymbol}><Stack size={23} weight="duotone" /></span>
            <span className={s.pathTitle}>Make it yours</span>
            <span className={s.pathCopy}>Build a recall card, organise notes, or choose a small revision block.</span>
            <span className={s.pathLink}>Open the toolkit <ArrowUpRight size={15} /></span>
          </Link>
        </div>
        <div className={s.pathBaseline} aria-hidden="true"><span /><span /><span /><span /></div>
      </section>

      <section className={s.practiceScene} aria-labelledby="practice-title">
        <div className={s.practiceIntro}>
          <span className={s.sectionKicker}>ACTIVE RECALL / LIVE QUESTION</span>
          <h2 id="practice-title">Make the idea<br /><em>come back to you.</em></h2>
          <p>Choose an answer, submit it, and read the explanation. Your response is recorded in your practice history.</p>
          <Link to="/mcqs" className={s.textRoute}>Browse question practice <ArrowRight size={16} /></Link>
        </div>
        <div className={s.questionStage}>
          <span className={s.stageIndex}>PRACTICE WINDOW / 01</span>
          <QuickRecall onCompleted={() => { dashboard.reload(); progress.reload(); }} />
        </div>
      </section>

      <section className={s.learningRecord} aria-labelledby="learning-record-title">
        <div className={s.recordHeading}>
          <span className={s.sectionKicker}>YOUR STUDY RECORD / REAL ACTIVITY</span>
          <h2 id="learning-record-title">A little progress,<br /><em>made visible.</em></h2>
          <p>Keep going from the practice already recorded for you. These totals come from your saved study history.</p>
          <Link to="/progress" className={s.textRoute}>Open study history <ArrowUpRight size={16} /></Link>
        </div>
        <div className={s.recordInstrument}>
          <div className={s.recordArc} aria-hidden="true"><span /></div>
          <div className={s.recordData}>
            <div><span>ANSWERS</span><strong>{record ? totalAnswered.toLocaleString() : "—"}</strong></div>
            <div><span>ACCURACY</span><strong>{record && totalAnswered ? `${record.accuracy}%` : "—"}</strong></div>
            <div><span>STREAK</span><strong>{record?.streak ?? "—"}<small>{record ? " days" : ""}</small></strong></div>
          </div>
          <div className={s.recordFocus}>
            <span className={s.recordFocusIcon}>{weakest ? <Target size={18} /> : <Sparkle size={18} />}</span>
            <div>
              <span>{weakest ? "LOWEST RECORDED SUBJECT" : "FIRST STUDY MOVE"}</span>
              <strong>{weakest ? weakest.subject : "Start with one question set"}</strong>
            </div>
            <Link to={nextPath} aria-label={weakest ? `Continue ${weakest.subject}` : "Start a five question set"}><ArrowUpRight size={18} /></Link>
          </div>
          {dashboard.error && <button className={s.inlineRetry} type="button" onClick={dashboard.reload}>Dashboard activity is unavailable. Retry</button>}
        </div>
      </section>

      <section className={s.medbyteScene} aria-labelledby="medbyte-title">
        <div className={s.lessonNumber} aria-hidden="true">MP / 03</div>
        <div className={s.lessonCopy}>
          <span className={s.sectionKicker}>A SHORT CHANGE OF PACE / MEDBYTES</span>
          {lesson ? (
            <>
              <h2 id="medbyte-title">{lesson.title}</h2>
              <p>{lesson.takeaway}</p>
              <span className={s.lessonSubject}>{lesson.subject} <i /> Captioned lesson</span>
            </>
          ) : (
            <>
              <h2 id="medbyte-title">One idea.<br /><em>A few focused minutes.</em></h2>
              <p>{quickLesson.error ? "The featured lesson is unavailable right now." : "Browse short, captioned medical lessons and quick concept checks."}</p>
            </>
          )}
          <Link className={s.lessonLink} to={lesson ? `/medbytes?subject=${encodeURIComponent(lesson.subject)}` : "/medbytes"}>
            {lesson ? "Open this MedByte" : "Browse MedBytes"} <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className={s.lessonStage} aria-hidden="true">
          <span className={s.lessonScan} />
          <span className={s.lessonPlate}><PlayCircle size={50} weight="light" /></span>
          <span className={s.lessonMeasure}>CONCEPT / 03 MIN</span>
          <span className={s.lessonRule} />
        </div>
      </section>

      <section className={s.continueSection} aria-labelledby="continue-title">
        <div className={s.continueHead}>
          <div>
            <span className={s.sectionKicker}>KEEP THE STUDY MOVING</span>
            <h2 id="continue-title">Your next move is ready.</h2>
          </div>
          <Link to="/learn">All study tools <ArrowUpRight size={16} /></Link>
        </div>
        <div className={s.continueLine}>
          <Link to={nextPath} className={s.continueLead}>
            <span>CONTINUE LEARNING</span>
            <strong>{weakest ? weakest.subject : "Build your practice baseline"}</strong>
            <small>{weakest ? `${weakest.accuracy}% across ${weakest.answered} answered ${weakest.answered === 1 ? "question" : "questions"}` : "A five-question set gives your progress a starting point."}</small>
            <b>{nextLabel} <ArrowRight size={16} /></b>
          </Link>
          <Link to="/flashcards" className={s.continueNode}>
            <span><Stack size={19} /></span><small>RECALL</small><strong>Review a card</strong><ArrowUpRight size={16} />
          </Link>
          <Link to="/notes" className={s.continueNode}>
            <span><BookOpenText size={19} /></span><small>ORGANISE</small><strong>Open notes</strong><ArrowUpRight size={16} />
          </Link>
          {d && (
            <div className={s.goalDial} aria-label={`${completedGoals} of ${goals.length} recorded daily goals completed`}>
              <div className={s.goalDialText}><strong>{goals.length ? `${completedGoals}/${goals.length}` : "—"}</strong><span>daily goals</span></div>
              <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><circle className={s.goalProgress} cx="50" cy="50" r="44" style={{ strokeDashoffset: goals.length ? 276.46 * (1 - completedGoals / goals.length) : 276.46 }} /></svg>
            </div>
          )}
        </div>
      </section>

      <StoryBar />
      <footer className={s.homeFooter}>
        <span>MED PURPLE / EDUCATION AND REVISION</span>
        <Link to="/about">The story behind the study space <ArrowUpRight size={15} /></Link>
        <span className={s.footerNote}>Clinical information should be checked against current authoritative sources.</span>
      </footer>
    </main>
  );
}
