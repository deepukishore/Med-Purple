import { useParams } from "react-router-dom";
import {
  CalendarDots,
  UsersThree,
  ChatsCircle,
  ChartLine,
  Books,
  FirstAidKit,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { PageSkeleton, ErrorState } from "../components/States";
import Button from "../components/Button";
import s from "./Library.module.css";
import u from "../components/ui.module.css";
const icons = {
  planner: CalendarDots,
  community: UsersThree,
  tutor: ChatsCircle,
  progress: ChartLine,
  lectures: Books,
  resources: FirstAidKit,
};
export default function ComingSoon({ feature }) {
  const { data, loading, error, reload } = useData(`/${feature}`);
  usePageMeta(data?.title || "Coming soon");
  const Icon = icons[feature] || Books;
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <section className={s.soon}>
      <div className={s.soonIcon}>
        <Icon size={42} weight="duotone" />
      </div>
      <div>
        <span className={u.pill}>Coming soon</span>
      </div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
      <Button to={feature === "community" ? "/medbytes" : "/mcqs"}>
        {feature === "community"
          ? "Explore MedBytes"
          : "Practice a few questions"}
      </Button>
    </section>
  );
}
