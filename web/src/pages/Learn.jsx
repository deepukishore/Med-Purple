import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Books,
  BookmarkSimple,
  Brain,
  CalendarDots,
  ChartLineUp,
  ChatsCircle,
  CheckSquare,
  Cube,
  ListChecks,
  MagnifyingGlass,
  Notebook,
  PlayCircle,
  SlidersHorizontal,
  Sparkle,
  Stack,
  Toolbox,
  Tray,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import s from "./Studio.module.css";

const tools = [
  ["Question practice", "/mcqs", "Practice with explanations and revisit the questions that need another look.", Brain, "Practice", "violet"],
  ["Mistake review", "/mcqs?mode=mistakes", "Return to missed answers and read each explanation again.", BookmarkSimple, "Practice", "peach"],
  ["Anatomy atlas", "/anatomy", "Explore named structures in the layered body atlas or study schematic organs.", Cube, "Explore", "mint"],
  ["MedBytes", "/medbytes", "Watch a short, captioned concept when you want a change of pace.", PlayCircle, "Explore", "blue"],
  ["Notes", "/notes", "Keep your own explanations, clinical topics, and useful reminders together.", Notebook, "Create", "peach"],
  ["Flashcards", "/flashcards", "Make recall cards and review them when you are ready.", Stack, "Remember", "violet"],
  ["Study planner", "/planner", "Arrange a realistic week and return to the next planned block.", CalendarDots, "Organise", "mint"],
  ["Progress", "/progress", "See the question practice, streaks, and achievements recorded for you.", ChartLineUp, "Reflect", "blue"],
  ["Study sets", "/study-tools", "Combine questions, flashcards, notes, and videos into a focused session.", ListChecks, "Organise", "violet"],
  ["Lectures", "/lectures", "Choose a captioned foundation animation by subject.", PlayCircle, "Explore", "blue"],
  ["Study coach", "/tutor", "Find source-linked explanations from the learning library.", ChatsCircle, "Understand", "mint"],
  ["Community", "/community", "Share medical ideas and learn with other students.", ChatsCircle, "Connect", "peach"],
  ["Doubts", "/doubts", "Ask a question or explain a concept to help someone move forward.", ChatsCircle, "Connect", "mint"],
  ["Reference toolbox", "/toolbox", "Search formulas, calculators, diagrams, and definitions.", Toolbox, "Understand", "blue"],
  ["Capture inbox", "/captures", "Sort ideas, photos, links, and voice notes saved on the go.", Tray, "Create", "peach"],
  ["Resources", "/resources", "Open textbook readings and revision resources.", Books, "Understand", "violet"],
  ["Preferences", "/preferences", "Choose study subjects, language, difficulty, and display settings.", SlidersHorizontal, "Organise", "mint"],
];

const filters = ["Everything", "Test myself", "Understand it", "Get organised"];
const matchesFilter = (tool, filter) => {
  if (filter === "Test myself") return ["Practice", "Remember"].includes(tool[4]);
  if (filter === "Understand it") return ["Explore", "Understand"].includes(tool[4]);
  if (filter === "Get organised") return ["Create", "Organise", "Reflect", "Connect"].includes(tool[4]);
  return true;
};

export default function Learn() {
  usePageMeta("Revision toolkit", "A focused study space for question practice, anatomy, notes, flashcards, and revision planning.");
  const [filter, setFilter] = useState("Everything");
  const [search, setSearch] = useState("");
  const progress = useData("/progress");
  const flashcards = useData("/flashcards");
  const notes = useData("/notes");
  const subjects = progress.data?.subjects || [];
  const practicedSubjects = subjects
    .filter((subject) => subject.answered > 0 && Number.isFinite(subject.accuracy))
    .sort((a, b) => a.accuracy - b.accuracy);
  const focusSubject = practicedSubjects[0];
  const totalAnswered = progress.data?.total_answered || 0;
  const accuracy = totalAnswered ? `${progress.data.accuracy}%` : "—";
  const reviewTo = flashcards.data?.length ? "/flashcards?review=1" : "/flashcards";
  const reviewLabel = flashcards.data?.length ? "Review your cards" : "Create your first card";
  const query = search.trim().toLocaleLowerCase();
  const visibleTools = tools.filter((tool) =>
    matchesFilter(tool, filter) && (!query || `${tool[0]} ${tool[2]} ${tool[4]}`.toLocaleLowerCase().includes(query)),
  );
  const nextPath = focusSubject
    ? `/mcqs?subject=${encodeURIComponent(focusSubject.subject)}`
    : "/mcqs?set=5";

  return (
    <div className={`${s.page} ${s.toolkitPage}`}>
      <section className={s.toolkitHero} aria-labelledby="toolkit-title">
        <div className={s.toolkitHeroCopy}>
          <p className={s.eyebrow}>THE REVISION TOOLKIT / YOUR STUDY SPACE</p>
          <h1 id="toolkit-title">For the way your brain works.</h1>
          <p className={s.toolkitIntro}>
            Pick a question, a concept, or a quiet place to organise your notes. Start with the kind of session you have room for today.
          </p>
          <div className={s.toolkitHeroActions}>
            <Link to={nextPath} className={s.toolkitPrimary}>
              <Brain size={19} weight="fill" />
              {focusSubject ? `Review ${focusSubject.subject}` : "Start a question sprint"}
              <ArrowRight size={17} />
            </Link>
            <Link to="/anatomy" className={s.toolkitSecondary}>
              Explore anatomy <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        <aside className={s.studyCompass} aria-label="Recommended next study step">
          <div className={s.compassTop}>
            <span><Sparkle size={15} /> YOUR NEXT STEP</span>
            <span className={s.compassLive}><i /> READY</span>
          </div>
          {focusSubject ? (
            <>
              <p className={s.compassLabel}>A topic to revisit</p>
              <h2>{focusSubject.subject}</h2>
              <p className={s.compassCopy}>
                {focusSubject.accuracy}% accuracy across {focusSubject.answered} answered {focusSubject.answered === 1 ? "question" : "questions"}. Pick up here when you want a focused review.
              </p>
              <div className={s.compassTrack} aria-label={`${focusSubject.accuracy}% question accuracy`}>
                <span style={{ width: `${focusSubject.accuracy}%` }} />
              </div>
            </>
          ) : (
            <>
              <p className={s.compassLabel}>Start with a baseline</p>
              <h2>One small set.</h2>
              <p className={s.compassCopy}>Answer a few questions to give your study space a real starting point.</p>
              <div className={s.compassSteps}><span>Choose</span><i /><span>Recall</span><i /><span>Review</span></div>
            </>
          )}
          <Link to={nextPath} className={s.compassLink}>
            {focusSubject ? "Continue this review" : "Choose a question set"} <ArrowRight size={16} />
          </Link>
        </aside>
      </section>

      <section className={s.toolkitMetrics} aria-label="Your recorded study activity">
        <article className={s.metricPractice}>
          <span className={s.metricIcon}><CheckSquare size={20} /></span>
          <div><strong>{progress.data ? totalAnswered.toLocaleString() : "—"}</strong><span>Questions answered</span></div>
          <small>{totalAnswered ? "Across your practice" : "Your activity will appear here"}</small>
        </article>
        <article className={s.metricAccuracy}>
          <span className={s.metricIcon}><ChartLineUp size={20} /></span>
          <div><strong>{progress.data ? accuracy : "—"}</strong><span>Question accuracy</span></div>
          <small>{totalAnswered ? "Based on recorded answers" : "Unlocks after your first answer"}</small>
        </article>
        <article className={s.metricSaved}>
          <span className={s.metricIcon}><Stack size={20} /></span>
          <div><strong>{flashcards.data ? flashcards.data.length : "—"}</strong><span>Saved recall cards</span></div>
          <small>{flashcards.data?.length ? "Ready for a review session" : "Build a small deck as you learn"}</small>
        </article>
      </section>

      <section className={s.toolkitWorkspace}>
        <div className={s.toolkitPrimaryColumn}>
          <div className={s.toolkitSectionHead}>
            <div>
              <p className={s.eyebrow}>CHOOSE YOUR FORMAT</p>
              <h2>Make this session count.</h2>
              <p>Move between active recall, visual exploration, and the notes you are building.</p>
            </div>
            <Link to="/progress">See your progress <ArrowUpRight size={16} /></Link>
          </div>

          <div className={s.studyMoves}>
            <Link to="/mcqs?mode=mistakes" className={`${s.studyMove} ${s.moveMistakes}`}>
              <span className={s.moveNumber}>01 / REVISIT</span>
              <span className={s.moveIcon}><BookmarkSimple size={22} weight="duotone" /></span>
              <h3>Review missed answers</h3>
              <p>Open the mistake set and work back through the explanations.</p>
              <b>Open mistake review <ArrowRight size={16} /></b>
            </Link>
            <Link to={reviewTo} className={`${s.studyMove} ${s.moveRecall}`}>
              <span className={s.moveNumber}>02 / RETRIEVE</span>
              <span className={s.moveIcon}><Stack size={22} weight="duotone" /></span>
              <h3>{reviewLabel}</h3>
              <p>{flashcards.data?.length ? `${flashcards.data.length} saved ${flashcards.data.length === 1 ? "card" : "cards"} in your deck.` : "Save a prompt from your studies, then practise answering before you reveal it."}</p>
              <b>{flashcards.data?.length ? "Open flashcard review" : "Build a recall card"} <ArrowRight size={16} /></b>
            </Link>
            <Link to="/notes" className={`${s.studyMove} ${s.moveNotes}`}>
              <span className={s.moveNumber}>03 / ORGANISE</span>
              <span className={s.moveIcon}><Notebook size={22} weight="duotone" /></span>
              <h3>Keep your own notes</h3>
              <p>{notes.data?.length ? `${notes.data.length} saved ${notes.data.length === 1 ? "note" : "notes"} to return to.` : "Create a clinical topic, viva outline, or mistake review in your own words."}</p>
              <b>Open your notebook <ArrowRight size={16} /></b>
            </Link>
          </div>

          <section className={s.subjectShelf} aria-labelledby="subject-shelf-title">
            <div className={s.subjectShelfHead}>
              <div>
                <p className={s.eyebrow}>FROM YOUR QUESTION PRACTICE</p>
                <h2 id="subject-shelf-title">Pick a subject to revisit.</h2>
              </div>
              <Link to="/mcqs">All question sets <ArrowUpRight size={15} /></Link>
            </div>
            {practicedSubjects.length ? (
              <div className={s.subjectList}>
                {practicedSubjects.slice(0, 4).map((subject, index) => (
                  <Link key={subject.subject} to={`/mcqs?subject=${encodeURIComponent(subject.subject)}`} className={s.subjectRow}>
                    <span className={s.subjectIndex}>0{index + 1}</span>
                    <span className={s.subjectName}>{subject.subject}<small>{subject.answered} answered {subject.answered === 1 ? "question" : "questions"}</small></span>
                    <span className={s.subjectProgress}><i style={{ width: `${subject.accuracy}%` }} /></span>
                    <strong>{subject.accuracy}%</strong>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className={s.subjectEmpty}>
                <span><Target size={20} /></span>
                <p>Once you answer questions, your subjects and recorded accuracy will appear here.</p>
                <Link to="/mcqs?set=5">Start your first set <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>
        </div>

        <aside className={s.toolkitRail}>
          <section className={s.toolkitSavedPanel}>
            <div className={s.railPanelTop}><span><BookmarkSimple size={18} /> YOUR LIBRARY</span><ArrowUpRight size={16} /></div>
            <h2>Keep the useful bits close.</h2>
            <p>Notes and cards are yours to build. Save a concept now and return when it is time to revise.</p>
            <div className={s.libraryCounts}>
              <Link to="/notes"><Notebook size={18} /><span><b>{notes.data ? notes.data.length : "—"}</b><small>Notes</small></span><ArrowRight size={15} /></Link>
              <Link to="/flashcards"><Stack size={18} /><span><b>{flashcards.data ? flashcards.data.length : "—"}</b><small>Flashcards</small></span><ArrowRight size={15} /></Link>
            </div>
          </section>
          <Link to="/medbytes" className={s.toolkitVideoPanel}>
            <span className={s.videoOrb}><PlayCircle size={25} weight="fill" /></span>
            <span className={s.eyebrow}>A CHANGE OF PACE</span>
            <h2>One idea, a few minutes.</h2>
            <p>Open MedBytes for short captioned lessons and quick concept checks.</p>
            <b>Browse MedBytes <ArrowRight size={16} /></b>
          </Link>
          {focusSubject && (
            <div className={s.toolkitNudge}>
              <Sparkle size={18} />
              <p>Your current lowest recorded subject is <strong>{focusSubject.subject}</strong>. This is a suggestion based on your answered questions.</p>
            </div>
          )}
        </aside>
      </section>

      <section className={s.toolDirectory} aria-labelledby="tool-directory-title">
        <div className={s.toolDirectoryHead}>
          <div>
            <p className={s.eyebrow}>THE FULL TOOLKIT</p>
            <h2 id="tool-directory-title">Find the right place to begin.</h2>
            <p>Search the tools or narrow the list by the kind of work you want to do.</p>
          </div>
          <label className={s.toolSearch}>
            <MagnifyingGlass size={18} />
            <span className="visually-hidden">Search study tools</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes, anatomy, planning…" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear study tool search">Clear</button>}
          </label>
        </div>
        <div className={s.toolkitFilters} role="group" aria-label="Filter study tools">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>
          ))}
          <span aria-live="polite">{visibleTools.length} {visibleTools.length === 1 ? "tool" : "tools"}</span>
        </div>
        {visibleTools.length ? (
          <div className={s.toolDirectoryGrid}>
            {visibleTools.map(([title, to, description, Icon, category, color], index) => (
              <Link key={to} to={to} className={`${s.directoryTool} ${s[`toolTint${color}`]} ${index === 0 && filter === "Everything" && !query ? s.directoryFeatured : ""}`}>
                <span className={s.directoryIcon}><Icon size={21} weight="duotone" /></span>
                <span className={s.directoryCopy}><small>{category.toUpperCase()}</small><strong>{title}</strong><span>{description}</span></span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className={s.toolkitNoResults}>
            <MagnifyingGlass size={22} />
            <p>No tools match “{search}”. Try another search or choose a different filter.</p>
            <button type="button" onClick={() => { setSearch(""); setFilter("Everything"); }}>Show all tools</button>
          </div>
        )}
      </section>
    </div>
  );
}
