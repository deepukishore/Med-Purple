import { ArrowClockwise, BookOpen, WarningCircle } from "@phosphor-icons/react";
import Button from "./Button";
import s from "./ui.module.css";
export function PageSkeleton() {
  return (
    <div
      className={s.pageSkeleton}
      aria-label="Loading your study space"
      aria-busy="true"
    >
      <div className={s.skeleton} style={{ width: "55%", height: 42 }} />
      <div className={s.skeleton} style={{ height: 240 }} />
      <div className={s.skeleton} style={{ height: 170 }} />
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className={s.error} role="alert">
      <WarningCircle size={40} />
      <h2>Let’s try that again</h2>
      <p>{message}</p>
      <Button onClick={onRetry}>
        <ArrowClockwise size={18} />
        Retry
      </Button>
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description,
  children,
}) {
  return (
    <div className={s.empty}>
      <BookOpen size={38} weight="duotone" />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
