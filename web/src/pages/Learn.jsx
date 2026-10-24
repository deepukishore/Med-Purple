import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Cube,
  Notebook,
  Stack,
  PlayCircle,
  CalendarDots,
  ChartLineUp,
  ChatsCircle,
  ArrowUpRight,
  Books,
  Toolbox,
  ListChecks,
  SlidersHorizontal,
  Tray,
} from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import DepthCard from "../components/DepthCard";
import s from "./Studio.module.css";
const tools = [
  [
    "Community",
    "/community",
    "Share medical ideas and learn with other students.",
    ChatsCircle,
    "Connect",
    "#f0e8fc",
  ],
  [
    "Doubts",
    "/doubts",
    "Ask a doubt, explain a concept, and help someone move forward.",
    ChatsCircle,
    "Connect",
    "#e9f6f3",
  ],
  [
    "Question sprints",
    "/mcqs",
    "Practice with explanations and revisit the tricky questions.",
    CheckSquare,
    "Practice",
    "#f0e8fc",
  ],
  [
    "Anatomy lab",
    "/anatomy",
    "Explore an interactive heart, one structure at a time.",
    Cube,
    "Explore",
    "#eaf5ef",
  ],
  [
    "My clinical notebook",
    "/notes",
    "Write your own notes and catch the ideas worth keeping.",
    Notebook,
    "Create",
    "#fff5df",
  ],
  [
    "Viva & recall cards",
    "/flashcards",
    "Build cards and review them when they're due.",
    Stack,
    "Remember",
    "#fcebf0",
  ],
  [
    "Video lessons",
    "/lectures",
    "Pick a captioned foundation animation by subject.",
    PlayCircle,
    "Watch",
    "#e8f0fc",
  ],
  [
    "Study planner",
    "/planner",
    "Give your week some structure and room to breathe.",
    CalendarDots,
    "Plan",
    "#f1eafb",
  ],
  [
    "Study coach",
    "/tutor",
    "Find source-linked explanations from your learning library.",
    ChatsCircle,
    "Understand",
    "#e9f6f3",
  ],
  [
    "Progress & rewards",
    "/progress",
    "See your strengths, next steps, and well-earned badges.",
    ChartLineUp,
    "Reflect",
    "#fff4dd",
  ],
  [
    "Resource library",
    "/resources",
    "Find textbook readings and a handy revision template.",
    Books,
    "Read",
    "#eaf0f7",
  ],
  [
    "Custom study sets",
    "/study-tools",
    "Mix MCQs, flashcards, notes and videos into a timed session.",
    ListChecks,
    "Plan",
    "#f1eafb",
  ],
  [
    "Reference toolbox",
    "/toolbox",
    "Search values, formulas, calculators, diagrams and definitions.",
    Toolbox,
    "Read",
    "#eaf0f7",
  ],
  [
    "Personalize my desk",
    "/preferences",
    "Choose language, difficulty, focus subjects and home widgets.",
    SlidersHorizontal,
    "Get organised",
    "#fff4dd",
  ],
  [
    "Capture inbox",
    "/captures",
    "Sort the ideas, photos, links and voice memos you grabbed on the go.",
    Tray,
    "Create",
    "#e9f6f3",
  ],
];
export default function Learn() {
  usePageMeta("Revision toolkit");
  const [filter, setFilter] = useState("Everything");
  const groups = {
    Everything: tools,
    "Test myself": tools.filter((x) => ["Practice", "Remember"].includes(x[4])),
    "Understand it": tools.filter((x) =>
      ["Explore", "Watch", "Understand", "Read"].includes(x[4]),
    ),
    "Get organised": tools.filter((x) =>
      ["Create", "Plan", "Reflect"].includes(x[4]),
    ),
  };
  return (
    <div className={`${s.page} ${s.toolkitPage}`}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>YOUR STUDY TOOLKIT / 15 WAYS TO LEVEL UP</span>
          <h1>Make your next study move.</h1>
          <p>Pick a study mode, find the right tool, and jump straight into learning.</p>
        </div>
        <span className={s.toolkitSticker}>Study mode: on <span aria-hidden="true">*</span></span>
      </div>
      <div
        className={s.filterTabs}
        role="group"
        aria-label="Filter revision tools"
      >
        {Object.keys(groups).map((group) => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            aria-pressed={group === filter}
          >
            {group}
          </button>
        ))}
      </div>
      <div className={s.toolkitHint} aria-live="polite">
        <span>{filter}</span>
        <span>{groups[filter].length} tools to explore</span>
      </div>
      <div className={s.grid}>
        {groups[filter].map(([title, to, description, Icon, tag, color]) => (
          <DepthCard key={to}>
            <Link
              to={to}
              className={`${s.card} ${s.resource}`}
              style={{ height: "100%" }}
            >
              <span className={s.icon} style={{ background: color }}>
                <Icon size={29} weight="duotone" />
              </span>
              <span className={s.eyebrow}>{tag}</span>
              <h2>{title}</h2>
              <p>{description}</p>
              <div className={s.row}>
                <b style={{ fontSize: 13 }}>Open tool</b>
                <span className={s.cardArrow}><ArrowUpRight size={18} /></span>
              </div>
            </Link>
          </DepthCard>
        ))}
      </div>
    </div>
  );
}

