import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookmarkSimple, CheckCircle, Clock, MagnifyingGlass, PlayCircle } from "@phosphor-icons/react";
import { playableAnatomyLessons, plannedAnatomyLessons } from "@med-purple/anatomy";
import usePageMeta from "../hooks/usePageMeta";
import s from "./AnatomyAnimationLibrary.module.css";

const SAVED_KEY = "mp:anatomy-video-saved:v1";
const RECENT_KEY = "mp:anatomy-video-recent:v1";
const PROGRESS_KEY = "mp:anatomy-video-progress:v1";

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function AnatomyAnimationLibrary() {
  usePageMeta("3D Anatomy Library");
  const [search, setSearch] = useState("");
  const [system, setSystem] = useState("All systems");
  const [saved, setSaved] = useState(() => new Set(readJson(SAVED_KEY, [])));
  const recentIds = readJson(RECENT_KEY, []);
  const progress = readJson(PROGRESS_KEY, {});
  const normalized = search.trim().toLowerCase();
  const availableSystems = [...new Set(playableAnatomyLessons.map((lesson) => lesson.system))];
  const filtered = useMemo(() => playableAnatomyLessons.filter((lesson) => {
    const matchesSystem = system === "All systems" || lesson.system === system;
    const searchable = [lesson.title, lesson.subtitle, lesson.system, lesson.topic, ...lesson.searchTerms].join(" ").toLowerCase();
    return matchesSystem && (!normalized || searchable.includes(normalized));
  }), [normalized, system]);
  const recent = recentIds.map((id) => playableAnatomyLessons.find((lesson) => lesson.id === id)).filter(Boolean);

  const toggleSaved = (id) => {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  return (
    <main className={s.page}>
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>THE ANATOMY STUDIO / 3D LESSONS</span>
          <h1>Study the structure.<br /><em>See how it fits.</em></h1>
          <p>Guided, source-linked anatomy scenes built from the named mesh layers already in the atlas. Pause, explore, then continue in the quiz flow.</p>
          <div className={s.heroStats}><span><strong>{playableAnatomyLessons.length}</strong> complete lessons</span><i /><span><strong>0</strong> rigged source models</span><i /><span><strong>9</strong> atlas layers retained</span></div>
        </div>
        <div className={s.heroArt} role="img" aria-label="Rendered skeletal and cardiovascular atlas layers">
          <img src="/anatomy-previews/body-systems.webp" alt="" />
          <span className={s.heroMarker}>ATLAS / LAYER STUDY</span>
          <span className={s.heroRing} aria-hidden="true" />
        </div>
      </header>

      {recent.length > 0 && <section className={s.recentSection} aria-labelledby="recent-title">
        <div className={s.sectionTitle}><div><span className={s.eyebrow}>PICK UP WHERE YOU LEFT OFF</span><h2 id="recent-title">Recently viewed</h2></div></div>
        <div className={s.recentList}>{recent.map((lesson) => <Link key={lesson.id} to={`/anatomy-videos/${lesson.id}`} className={s.recentItem}><span>{lesson.system}</span><strong>{lesson.title}</strong><small>{progress[lesson.id]?.completed ? "Completed · replay anytime" : `Resume at ${formatTime(progress[lesson.id]?.time || 0)}`}</small><ArrowUpRight size={17} /></Link>)}</div>
      </section>}

      <section className={s.library} aria-labelledby="library-title">
        <div className={s.sectionTitle}>
          <div><span className={s.eyebrow}>PLAYABLE SCENES / TIMELINE-DRIVEN</span><h2 id="library-title">The 3D video library</h2></div>
          <span className={s.count}>{filtered.length} available</span>
        </div>
        <div className={s.filters}>
          <label className={s.search}><MagnifyingGlass size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anatomy, structure or topic" aria-label="Search 3D anatomy lessons" /></label>
          <label className={s.systemSelect}>Body system<select value={system} onChange={(event) => setSystem(event.target.value)}><option>All systems</option>{availableSystems.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className={s.lessonGrid}>
          {filtered.map((lesson, index) => {
            const savedTime = progress[lesson.id]?.time || 0;
            const completed = Boolean(progress[lesson.id]?.completed);
            return (
              <article className={s.lessonCard} key={lesson.id}>
                <Link to={`/anatomy-videos/${lesson.id}`} className={s.previewLink} aria-label={`Open ${lesson.title}`}>
                  <img className={s.preview} src={lesson.preview} alt="" loading={index > 0 ? "lazy" : "eager"} />
                  <span className={s.previewBadge}><PlayCircle size={17} weight="fill" /> 3D SCENE</span>
                  <span className={s.previewDuration}><Clock size={13} /> {lesson.duration}s</span>
                </Link>
                <div className={s.cardBody}>
                  <div className={s.cardMeta}><span>{lesson.system}</span><button type="button" aria-pressed={saved.has(lesson.id)} aria-label={saved.has(lesson.id) ? `Remove ${lesson.title} from saved lessons` : `Save ${lesson.title}`} onClick={() => toggleSaved(lesson.id)}><BookmarkSimple size={19} weight={saved.has(lesson.id) ? "fill" : "regular"} /></button></div>
                  <h3><Link to={`/anatomy-videos/${lesson.id}`}>{lesson.title}</Link></h3>
                  <p>{lesson.subtitle}</p>
                  <div className={s.cardFoot}><span>{completed ? <><CheckCircle size={15} /> Completed</> : savedTime > 0 ? `Continue · ${formatTime(savedTime)}` : `${lesson.chapters.length} chapters`}</span><Link to={`/anatomy-videos/${lesson.id}`}>{savedTime > 0 && !completed ? "Continue" : "Watch lesson"} <ArrowUpRight size={15} /></Link></div>
                  <div className={s.miniProgress} aria-label={completed ? "Lesson complete" : `${Math.round((savedTime / lesson.duration) * 100)} percent complete`}><i style={{ width: completed ? "100%" : `${Math.min(100, (savedTime / lesson.duration) * 100)}%` }} /></div>
                </div>
              </article>
            );
          })}
          {!filtered.length && <p className={s.noResults}>No available lessons match that search. Try a structure name such as “aorta” or “diaphragm”.</p>}
        </div>
      </section>

      <section className={s.pipeline} aria-labelledby="pipeline-title">
        <div className={s.pipelineHead}><span className={s.eyebrow}>FUTURE CAPABILITIES</span><h2 id="pipeline-title">Build on the 3D lesson set.</h2><p>All five starter lessons are ready. Future expansions can add fuller lung and pleural relationships, a rigged elbow model and recorded narration.</p></div>
        <div className={s.pipelineList}>{plannedAnatomyLessons.map((lesson, index) => <article key={lesson.id} className={s.pipelineItem}><span>{String(playableAnatomyLessons.length + index + 1).padStart(2, "0")}</span><div><small>{lesson.system} · {lesson.topic}</small><h3>{lesson.title}</h3><p>{lesson.requirement}</p></div><b>In production</b></article>)}</div>
      </section>
      <aside className={s.scopeNote}><span>MODEL SCOPE</span><p>The source GLBs contain no rigs or clips. The elbow lesson uses an explicitly simplified rigid hinge, and the circulation lesson uses a schematic route marker. Neither depicts validated physiological motion.</p><Link to="/anatomy">Explore the complete anatomy atlas <ArrowUpRight size={15} /></Link></aside>
    </main>
  );
}
