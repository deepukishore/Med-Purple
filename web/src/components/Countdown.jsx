import { useState, useEffect } from "react";
export default function Countdown({ date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(date).getTime() - now);
  if (!ms) return <span>Exam day is here</span>;
  const days = Math.floor(ms / 86400000),
    hours = Math.floor(ms / 3600000) % 24,
    minutes = Math.floor(ms / 60000) % 60;
  return (
    <span>
      {days}d <span style={{ opacity: 0.45 }}>/</span> {hours}h{" "}
      <span style={{ opacity: 0.45 }}>/</span> {minutes}m
    </span>
  );
}
