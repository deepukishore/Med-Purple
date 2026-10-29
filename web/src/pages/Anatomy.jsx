import { useRef, useState } from "react";
import { referenceModels } from "@med-purple/anatomy";
import {
  Plus,
  Minus,
  ArrowCounterClockwise,
  Check,
  Cube,
  ArrowsOutSimple,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import AnatomyCanvas from "../components/AnatomyCanvas";
import BodyAtlas from "../components/BodyAtlas";
import TissueStudies from "../components/TissueStudies";
import Button from "../components/Button";
import { PageSkeleton, ErrorState } from "../components/States";
import u from "../components/ui.module.css";
import s from "./Anatomy.module.css";
export default function Anatomy() {
  usePageMeta(
    "Human Body Atlas",
    "Explore layered 3D human anatomy, named structures, organ studies, and tissue teaching diagrams.",
  );
  const [tab, setTab] = useState("atlas");
  return (
    <>
      <div className={s.studyModePicker} role="group" aria-label="Anatomy study mode">
        <button aria-pressed={tab === "atlas"} onClick={() => setTab("atlas")}>
          Human body atlas
        </button>
        <button
          aria-pressed={tab === "organs"}
          onClick={() => setTab("organs")}
        >
          Organ studies
        </button>
        <button
          aria-pressed={tab === "tissues"}
          onClick={() => setTab("tissues")}
        >
          Tissues & histology
        </button>
      </div>
      {tab === "atlas" ? (
        <BodyAtlas />
      ) : tab === "tissues" ? (
        <TissueStudies />
      ) : (
        <OrganStudies />
      )}
    </>
  );
}
function OrganStudies() {
  usePageMeta(
    "3D Anatomy",
    "Explore 360-degree schematic models of the heart, lungs, brain, and kidney with labelled structures and study references.",
  );
  const { data, loading, error, reload } = useData("/anatomy");
  const [selected, setSelected] = useState("lv"),
    [exploded, setExploded] = useState(false),
    [vessels, setVessels] = useState(true),
    [pending, setPending] = useState(false),
    [studied, setStudied] = useState(new Set()),
    [quiz, setQuiz] = useState(false),
    [feedback, setFeedback] = useState("");
  const engine = useRef();
  const [modelId, setModelId] = useState("heart");
  const [autoRotate, setAutoRotate] = useState(false);
  const models = [
    { id: "heart", name: "The human heart", system: "Cardiovascular" },
    ...referenceModels,
  ];
  const model = models.find((item) => item.id === modelId);
  const { notify } = useApp();
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const structures =
    modelId === "heart"
      ? data.structures
      : model.structures.map((item) => ({
          ...item,
          category: model.system,
          source_url: model.source_url,
        }));
  const structure = structures.find((x) => x.id === selected) || structures[0];
  const isStudied = structure.studied || studied.has(selected);
  function choose(id) {
    setSelected(id);
    if (quiz && modelId === "heart")
      api
        .post("/anatomy/recall", { structure_id: id })
        .then((r) => {
          if (r.xp_earned) notify(`Recall complete. +${r.xp_earned} XP`);
        })
        .catch((e) => notify(e.message));
    if (quiz && modelId === "heart")
      setFeedback(
        id === "rv"
          ? "Correct. The right ventricle supplies the pulmonary circuit."
          : "Try again. Find the ventricle that supplies the lungs.",
      );
  }
  async function mark() {
    if (modelId !== "heart") {
      setStudied((x) => new Set([...x, selected]));
      return;
    }
    setPending(true);
    try {
      await api.put(`/anatomy/${selected}/studied`);
      setStudied((x) => new Set([...x, selected]));
      notify(`${structure.name} added to your study progress.`);
    } catch (e) {
      notify(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className={u.pageHead}>
        <div>
          <h1>Get a feel for anatomy.</h1>
          <p>Look closer. Make the connections.</p>
        </div>
        <span className={u.pill}>
          <Cube size={16} />
          {model.system} / {structures.length} structures
        </span>
      </div>
      <div className={s.modelPicker} aria-label="Choose an anatomy model">
        {models.map((item) => (
          <button
            key={item.id}
            aria-pressed={modelId === item.id}
            onClick={() => {
              setModelId(item.id);
              setSelected(item.id === "heart" ? "lv" : item.structures[0].id);
              setQuiz(false);
              setFeedback("");
              setAutoRotate(false);
              setExploded(false);
            }}
          >
            <Cube size={22} />
            <span>
              <strong>{item.name}</strong>
              <small>{item.system} · 360° view</small>
            </span>
          </button>
        ))}
      </div>
      <div className={s.studio}>
        <section className={s.stage} aria-label={`${model.name} model`}>
          <div className={s.stageHeader}>
            <div>
              <h2>{model.name}</h2>
              <p>Schematic study model</p>
            </div>
            <span className={s.orientation}>
              Anatomical right starts on your left
            </span>
          </div>
          <div className={s.canvas}>
            <AnatomyCanvas
              selected={selected}
              onSelect={choose}
              controlsRef={engine}
              exploded={exploded}
              showVessels={vessels}
              modelId={modelId}
              autoRotate={autoRotate}
            />
          </div>
          <div className={s.tools}>
            <select
              className={s.toggle}
              aria-label="Standard model view"
              defaultValue="front"
              key={modelId}
              onChange={(event) => {
                setAutoRotate(false);
                if (engine.current) {
                  engine.current.targets.x = 0;
                  engine.current.targets.y = {
                    front: 0,
                    back: Math.PI,
                    left: -Math.PI / 2,
                    right: Math.PI / 2,
                  }[event.target.value];
                }
              }}
            >
              <option value="front">Anterior view</option>
              <option value="back">Posterior view</option>
              <option value="left">Left lateral view</option>
              <option value="right">Right lateral view</option>
            </select>
            <button
              className={u.iconButton}
              aria-label="Zoom in"
              onClick={() => engine.current?.zoom(-0.6)}
            >
              <Plus size={20} />
            </button>
            <button
              className={u.iconButton}
              aria-label="Zoom out"
              onClick={() => engine.current?.zoom(0.6)}
            >
              <Minus size={20} />
            </button>
            <button
              className={u.iconButton}
              aria-label="Reset view"
              onClick={() => {
                setAutoRotate(false);
                engine.current?.reset();
              }}
            >
              <ArrowCounterClockwise size={20} />
            </button>
            <button
              className={s.toggle}
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((value) => !value)}
            >
              {autoRotate ? "Pause rotation" : "Rotate 360°"}
            </button>
            {modelId === "heart" && (
              <>
                <button
                  className={s.toggle}
                  aria-pressed={exploded}
                  onClick={() => setExploded((x) => !x)}
                >
                  Separate chambers
                </button>
                <button
                  className={s.toggle}
                  aria-pressed={vessels}
                  onClick={() => setVessels((x) => !x)}
                >
                  Great vessels
                </button>
              </>
            )}
          </div>
          <p className={s.hint}>
            Drag to rotate / Pinch to zoom / Select a structure
          </p>
        </section>
        <aside className={s.inspector}>
          <div>
            <p className={s.groupLabel}>Explore the structures</p>
            <div className={s.list}>
              {structures.map((item) => (
                <button
                  key={item.id}
                  onClick={() => choose(item.id)}
                  aria-pressed={item.id === selected}
                  className={`${s.structure} ${item.id === selected ? s.selected : ""}`}
                >
                  <span
                    className={s.swatch}
                    style={{ background: item.color }}
                  />
                  {item.name}
                  {(item.studied || studied.has(item.id)) && (
                    <Check size={15} style={{ marginLeft: "auto" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className={s.info}>
            <span className={u.pill}>{structure.category}</span>
            <h2>{structure.name}</h2>
            <p>{structure.description}</p>
            <h3>Make the connection</h3>
            <p>{structure.clinical_note}</p>
            <Button disabled={pending || isStudied} onClick={mark}>
              {isStudied ? (
                <>
                  <Check size={17} />
                  Studied
                </>
              ) : pending ? (
                "Saving…"
              ) : (
                "Mark as studied"
              )}
            </Button>
            {modelId !== "heart" && (
              <p className={s.sessionNote}>
                Study marks for this reference model last for this visit.
              </p>
            )}
            <a href={structure.source_url} target="_blank" rel="noreferrer">
              Read in OpenStax
            </a>
          </div>
        </aside>
      </div>
      <p className={s.scope}>
        {modelId === "heart"
          ? data.scope
          : "Original schematic reference model. Shapes, proportions, and surface details are simplified for orientation; use the linked textbook figures for detailed anatomy."}
      </p>
      {modelId === "heart" && (
        <section className={s.quiz}>
          <h3>{quiz ? "Find it on the model" : "A quick recall moment"}</h3>
          <p>
            {quiz
              ? "Which chamber pumps blood toward the lungs? Select it in the model or structure list."
              : "Turn exploration into understanding with a structure-finding question."}
          </p>
          {feedback && (
            <p
              role="status"
              style={{
                marginTop: 12,
                color: "var(--purple-700)",
                fontWeight: 700,
              }}
            >
              {feedback}
            </p>
          )}
          <div className={s.quizActions}>
            <Button
              variant="secondary"
              small
              onClick={() => {
                setQuiz((x) => !x);
                setFeedback("");
              }}
            >
              {quiz ? "Close recall question" : "Test my recall"}
            </Button>
            <Button to="/mcqs?topic=Cardiac%20anatomy" variant="ghost" small>
              Practice cardiac MCQs
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
