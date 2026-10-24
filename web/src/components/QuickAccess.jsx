import { Link } from "react-router-dom";
import {
  VideoCamera,
  Notebook,
  CheckSquare,
  Stack,
  PlayCircle,
  Cube,
  CalendarDots,
  ChartLineUp,
} from "@phosphor-icons/react";
import DepthCard from "./DepthCard";
import s from "../pages/Home.module.css";
export const tools = [
  ["MCQs", "/mcqs", CheckSquare],
  ["MedBytes", "/medbytes", PlayCircle],
  ["Notes", "/notes", Notebook],
  ["Flashcards", "/flashcards", Stack],
  ["3D Anatomy", "/anatomy", Cube],
  ["Progress", "/progress", ChartLineUp],
  ["Lectures", "/lectures", VideoCamera],
  ["Study Planner", "/planner", CalendarDots],
];
export default function QuickAccess() {
  return (
    <div className={s.quickGrid}>
      {tools.map(([title, to, Icon], i) => (
        <Link to={to} key={to} className={s.quickLink}>
          <DepthCard
            className={`${s.quickIcon} ${i < 2 || i === 4 ? s.featuredIcon : ""}`}
          >
            <Icon size={28} weight="duotone" />
          </DepthCard>
          <span>{title}</span>
        </Link>
      ))}
    </div>
  );
}
