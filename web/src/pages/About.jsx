import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Heart, Sparkle } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import useData from "../hooks/useData";
import QuickRecall from "../components/QuickRecall";
import content from "../../../shared/legal.json";
import s from "./Information.module.css";

const icons = [BookOpen, Sparkle, Heart];
const AnatomyCanvas = lazy(() => import("../components/AnatomyCanvas"));
const introNodes = [
  {
    id: "purpose",
    label: "Med Purple",
    eyebrow: "OUR PURPOSE",
    title: content.about.title,
    body: content.about.mission,
  },
  ...content.about.people.map(({ name, role, bio }) => ({
    id: name,
    label: name,
    eyebrow: role,
    title: name,
    body: bio,
  })),
];
const chapters = [
  {
    number: "01",
    eyebrow: "SEE IT",
    title: "Start by looking closer.",
    body: "Turn the schematic heart and explore a chamber. The model is a study aid, with labels and notes to guide the next step.",
    path: "/anatomy",
    action: "Explore anatomy",
    structure: "lv",
  },
  {
    number: "02",
    eyebrow: "TEST IT",
    title: "Try a question while it is fresh.",
    body: "Answer a real multiple-choice question, then read the explanation and its source before you move on.",
    path: "/mcqs",
    action: "Open question practice",
    structure: null,
  },
  {
    number: "03",
    eyebrow: "KEEP IT",
    title: "Save the thought you want to recall.",
    body: "Turn a useful prompt into a flashcard, reveal your own answer, and return when you are ready to review.",
    path: "/flashcards",
    action: "Open your recall cards",
    structure: null,
  },
];
export default function About() {
  usePageMeta("About Med Purple");
  const journeyRef = useRef(null);
  const modelRef = useRef(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeIntro, setActiveIntro] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(chapters[0].structure);
  const flashcards = useData("/flashcards");
  const savedCard = flashcards.data?.[0];
  const structureNames = {
    ra: "Right atrium",
    rv: "Right ventricle",
    lv: "Left ventricle",
    la: "Left atrium",
  };

  useEffect(() => setCardRevealed(false), [activeChapter]);

  useEffect(() => {
    let frame = 0;
    const updateScene = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const journey = journeyRef.current;
        if (!journey) return;
        const bounds = journey.getBoundingClientRect();
        const travel = Math.max(1, bounds.height - window.innerHeight * 0.55);
        const progress = Math.max(
          0,
          Math.min(1, (window.innerHeight * 0.25 - bounds.top) / travel),
        );
        modelRef.current?.pose?.(progress);

        const steps = [...journey.querySelectorAll("[data-journey-step]")];
        const center = window.innerHeight * 0.5;
        let nearest = 0;
        let nearestDistance = Infinity;
        steps.forEach((step, index) => {
          const rect = step.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height * 0.5 - center);
          if (distance < nearestDistance) {
            nearest = index;
            nearestDistance = distance;
          }
        });
        setActiveChapter((current) => current === nearest ? current : nearest);
        if (chapters[nearest].structure)
          setSelectedStructure((current) =>
            current === chapters[nearest].structure
              ? current
              : chapters[nearest].structure,
          );
      });
    };
    updateScene();
    window.addEventListener("scroll", updateScene, { passive: true });
    window.addEventListener("resize", updateScene);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScene);
      window.removeEventListener("resize", updateScene);
    };
  }, []);

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>ABOUT MED PURPLE</span>
          <h1>{content.about.title}</h1>
          <p>{content.about.intro}</p>
          <Link className={s.primaryLink} to="/learn">
            Explore your revision toolkit <ArrowUpRight size={18} />
          </Link>
        </div>
        <div
          className={s.heroIntro}
          role="group"
          aria-label="Interactive introduction to Med Purple and its co-founders"
        >
          <div
            className={s.introStage}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              if (
                document.documentElement.dataset.calm === "true" ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ) {
                event.currentTarget.style.setProperty("--intro-tilt-x", "0deg");
                event.currentTarget.style.setProperty("--intro-tilt-y", "0deg");
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width - 0.5;
              const y = (event.clientY - bounds.top) / bounds.height - 0.5;
              event.currentTarget.style.setProperty("--intro-tilt-x", `${-y * 12}deg`);
              event.currentTarget.style.setProperty("--intro-tilt-y", `${x * 14}deg`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.setProperty("--intro-tilt-x", "0deg");
              event.currentTarget.style.setProperty("--intro-tilt-y", "0deg");
            }}
          >
            <span className={`${s.introOrbit} ${s.introOrbitOne}`} aria-hidden="true" />
            <span className={`${s.introOrbit} ${s.introOrbitTwo}`} aria-hidden="true" />
            <button
              type="button"
              className={`${s.introNode} ${s.introCore} ${activeIntro === 0 ? s.introNodeActive : ""}`}
              aria-pressed={activeIntro === 0}
              onClick={() => setActiveIntro(0)}
            >
              <span>Med Purple</span>
              <small>OUR PURPOSE</small>
            </button>
            {introNodes.slice(1).map((node, index) => (
              <button
                key={node.id}
                type="button"
                className={`${s.introNode} ${s.introFounderNode} ${index === 0 ? s.introFounderLeft : s.introFounderRight} ${activeIntro === index + 1 ? s.introNodeActive : ""}`}
                aria-pressed={activeIntro === index + 1}
                onClick={() => setActiveIntro(index + 1)}
              >
                <span>{node.label}</span>
                <small>{node.eyebrow}</small>
              </button>
            ))}
          </div>
          <div className={s.introDetail} aria-live="polite" key={introNodes[activeIntro].id}>
            <span>{introNodes[activeIntro].eyebrow}</span>
            <strong>{introNodes[activeIntro].title}</strong>
            <p>{introNodes[activeIntro].body}</p>
          </div>
        </div>
        <span className={s.heroMark} aria-hidden="true">m<span>+</span></span>
      </header>
      <section className={s.mission} aria-labelledby="mission-title">
        <span className={s.eyebrow}>OUR PURPOSE</span>
        <div>
          <h2 id="mission-title">Supporting everyday medical study</h2>
          <p>{content.about.mission}</p>
        </div>
      </section>
      <section className={s.challenge} aria-labelledby="challenge-title">
        <div className={s.challengeIntro}>
          <span className={s.eyebrow}>THE LEARNING REALITY</span>
          <h2 id="challenge-title">One subject can ask you to think in several ways.</h2>
        </div>
        <div className={s.challengeStory}>
          <p>
            Medical study moves between structures, mechanisms, questions, and the details you want to remember later. Finding the next useful step can take time when those activities are scattered.
          </p>
          <div className={s.challengeThreads}>
            <span><b>01</b><strong>See it</strong><small>Explore a structure or concept.</small></span>
            <i aria-hidden="true" />
            <span><b>02</b><strong>Test it</strong><small>Try a question and read its explanation.</small></span>
            <i aria-hidden="true" />
            <span><b>03</b><strong>Keep it</strong><small>Save a note or a recall card.</small></span>
          </div>
        </div>
      </section>
      <section className={s.journey} ref={journeyRef} aria-label="Explore the Med Purple study journey">
        <div className={s.journeyStage}>
          <div
            className={s.scenePanel}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width;
              const y = (event.clientY - bounds.top) / bounds.height;
              event.currentTarget.style.setProperty("--spot-x", `${x * 100}%`);
              event.currentTarget.style.setProperty("--spot-y", `${y * 100}%`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.setProperty("--spot-x", "50%");
              event.currentTarget.style.setProperty("--spot-y", "48%");
            }}
          >
            <div className={s.sceneHeading}>
              <span className={s.eyebrow}>SCROLL THROUGH THREE STUDY STATES</span>
              <span className={s.sceneCounter}>0{activeChapter + 1} / 03</span>
            </div>
            {activeChapter === 0 && (
              <>
                <span className={s.sceneKind}>SCHEMATIC HEART / INTERACTIVE STUDY MODEL</span>
                <div className={s.sceneOrbit} aria-hidden="true" />
                <div className={s.sceneOrbitAlt} aria-hidden="true" />
                <Suspense fallback={<div className={s.modelFallback}>Preparing the schematic heart…</div>}>
                  <AnatomyCanvas
                    compact
                    modelId="heart"
                    resetOnLeave={false}
                    controlsRef={modelRef}
                    selected={selectedStructure}
                    onSelect={setSelectedStructure}
                  />
                </Suspense>
              </>
            )}
            {activeChapter === 1 && (
              <div className={s.questionScene}>
                <span className={s.sceneKind}>A REAL QUESTION / SOURCE-LINKED FEEDBACK</span>
                <QuickRecall tone="focused" />
              </div>
            )}
            {activeChapter === 2 && (
              <div className={s.savedCardScene}>
                <span className={s.sceneKind}>YOUR SAVED RECALL / TAP TO TURN</span>
                {savedCard ? (
                  <button
                    type="button"
                    className={`${s.aboutFlipCard} ${cardRevealed ? s.aboutFlipRevealed : ""}`}
                    aria-pressed={cardRevealed}
                    onClick={() => setCardRevealed((value) => !value)}
                  >
                    <span className={s.aboutFlipInner}>
                      <span className={s.aboutFlipFace} aria-hidden={cardRevealed}>
                        <small>{savedCard.subject} / PROMPT</small>
                        <strong>{savedCard.title}</strong>
                        <span>Think it through, then turn the card.</span>
                      </span>
                      <span className={`${s.aboutFlipFace} ${s.aboutFlipBack}`} aria-hidden={!cardRevealed}>
                        <small>SAVED ANSWER</small>
                        <strong>{savedCard.title}</strong>
                        <span>{savedCard.content}</span>
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className={s.savedCardEmpty}>
                    <span className={s.emptyCardGlyph}><BookOpen size={24} /></span>
                    <strong>Your first recall card can start here.</strong>
                    <span>Create a prompt and save your own answer for review.</span>
                    <Link to="/flashcards">Create a flashcard <ArrowUpRight size={15} /></Link>
                  </div>
                )}
                {savedCard && (
                  <div className={s.aboutCardActions}>
                    <button type="button" onClick={() => setCardRevealed((value) => !value)}>{cardRevealed ? "Show prompt" : "Reveal answer"}</button>
                    <Link to="/flashcards?review=1">Open due cards <ArrowUpRight size={14} /></Link>
                  </div>
                )}
              </div>
            )}
            <div className={s.sceneCaption}>
              <span>{chapters[activeChapter].eyebrow}</span>
              <strong>{chapters[activeChapter].title}</strong>
              <small>{activeChapter === 0 ? "Scroll to travel · drag to turn · select a chamber" : activeChapter === 1 ? "Choose an answer and read the explanation." : "Tap the saved card to reveal its answer."}</small>
            </div>
          </div>
          {activeChapter === 0 && (
            <div className={s.structurePicker} aria-label="Highlight a heart chamber">
              {Object.entries(structureNames).map(([id, name]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={selectedStructure === id}
                  onClick={() => setSelectedStructure(id)}
                  title={name}
                >
                  {id.toUpperCase()}
                </button>
              ))}
              <span>{structureNames[selectedStructure]}</span>
            </div>
          )}
          <div className={s.sceneProgress} aria-hidden="true">
            {chapters.map((chapter, index) => (
              <span className={index <= activeChapter ? s.progressActive : ""} key={chapter.number} />
            ))}
          </div>
        </div>
        <div className={s.journeySteps}>
          {chapters.map((chapter, index) => (
            <article
              className={`${s.journeyStep} ${index === activeChapter ? s.stepActive : ""}`}
              data-journey-step
              key={chapter.number}
              aria-current={index === activeChapter ? "step" : undefined}
            >
              <span className={s.stepNumber}>{chapter.number}</span>
              <span className={s.eyebrow}>{chapter.eyebrow}</span>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
              <Link to={chapter.path} className={s.stepLink}>
                {chapter.action} <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className={s.platformApproach} aria-labelledby="platform-approach-title">
        <div className={s.platformApproachHead}>
          <div>
            <span className={s.eyebrow}>THE MED PURPLE APPROACH</span>
            <h2 id="platform-approach-title">A connected set of tools for your next study move.</h2>
          </div>
          <p>Choose one way in, then follow the links that help you continue. Each part opens a working area of the app.</p>
        </div>
        <div className={s.featureGrid} aria-label="Ways to learn">
        {content.about.features.map((feature, index) => {
          const Icon = icons[index];
          return (
            <Link to={feature.path} className={s.card} key={feature.heading}>
              <Icon className={s.featureIcon} size={27} weight="duotone" />
              <h2>{feature.heading}</h2>
              <p>{feature.body}</p>
              <span className={s.cardAction}>
                Take a look <ArrowUpRight size={17} />
              </span>
            </Link>
          );
        })}
        </div>
      </section>
      <section className={s.founders} aria-labelledby="founders-title">
        <div>
          <span className={s.eyebrow}>THE PEOPLE BEHIND MED PURPLE</span>
          <h2 id="founders-title">{content.about.teamHeading}</h2>
          <p>{content.about.founderNote}</p>
        </div>
        <div className={s.founderGrid}>
          {content.about.people.map(({ name, role, bio }, index) => (
            <article
              className={s.founder}
              key={name}
              onPointerMove={(event) => {
                if (event.pointerType !== "mouse") return;
                if (
                  document.documentElement.dataset.calm === "true" ||
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ) {
                  event.currentTarget.style.setProperty("--tilt-x", "0deg");
                  event.currentTarget.style.setProperty("--tilt-y", "0deg");
                  return;
                }
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                event.currentTarget.style.setProperty("--tilt-x", `${-y * 7}deg`);
                event.currentTarget.style.setProperty("--tilt-y", `${x * 8}deg`);
              }}
              onPointerLeave={(event) => {
                event.currentTarget.style.setProperty("--tilt-x", "0deg");
                event.currentTarget.style.setProperty("--tilt-y", "0deg");
              }}
            >
              <div className={`${s.founderArt} ${index === 0 ? s.designArt : s.buildArt}`} aria-hidden="true">
                {index === 0 ? (
                  <div className={s.notebook}>
                    <div className={s.notebookHeader}><span>MED PURPLE</span><i>IDEA BOOK</i></div>
                    <div className={s.notebookBody}>
                      <span className={s.notebookTag}>STUDY, YOUR WAY</span>
                      <div className={s.notebookSketch}>
                        <Heart size={34} weight="duotone" />
                        <span><i /><i /><i /></span>
                      </div>
                      <div className={s.notebookLines}><i /><i /><i /><i /></div>
                    </div>
                    <span className={s.notebookSpine} />
                  </div>
                ) : (
                  <div className={s.devDesk}>
                    <div className={s.codeWindow}>
                      <div className={s.codeTopbar}><span /><span /><span /><b>study-desk.jsx</b></div>
                      <div className={s.codeBody}>
                        <code><i>const</i> study = <em>learn</em>();</code>
                        <code>study.<em>practice</em>("MCQs");</code>
                        <code>study.<em>explore</em>("anatomy");</code>
                        <code><i>return</i> progress;</code>
                      </div>
                    </div>
                    <div className={s.deskBase} />
                    <span className={s.deskGlow} />
                  </div>
                )}
              </div>
              <div className={s.founderInfo}>
                <span className={s.founderFocus}>
                  {index === 0 ? "VISION & DESIGN" : "PRODUCT & DEVELOPMENT"}
                </span>
                <h3>{name}</h3>
                <p className={s.founderRole}>{role}</p>
                <p>{bio}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className={s.trust}>
        <div>
          <h2>A study companion, with clear boundaries.</h2>
          <p>
            Med Purple supports education and revision. Always verify clinical
            information with current authoritative sources and qualified
            guidance.
          </p>
        </div>
        <Link to="/legal">
          Visit our legal centre <ArrowUpRight size={18} />
        </Link>
      </aside>
      <section className={s.closing} aria-labelledby="about-closing-title">
        <div>
          <span className={s.eyebrow}>READY WHEN YOU ARE</span>
          <h2 id="about-closing-title">Start with one useful next step.</h2>
          <p>Open a study tool or take a closer look at the interactive atlas.</p>
        </div>
        <div className={s.closingActions}>
          <Link to="/learn" className={s.closingPrimary}>Explore the toolkit <ArrowUpRight size={17} /></Link>
          <Link to="/anatomy" className={s.closingSecondary}>Open anatomy <ArrowUpRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
