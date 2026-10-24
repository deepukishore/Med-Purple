import { useEffect, useState } from "react";
import { Check, Palette } from "@phosphor-icons/react";
import s from "./RoomVibes.module.css";
const vibes = [
  {
    id: "lilac",
    name: "Lilac haze",
    color: "#cdb0f2",
    canvas: "#f5f1fa",
    dark: "#302044",
    soft: "#ece1fa",
    accent: "#dff49b",
  },
  {
    id: "matcha",
    name: "Matcha mood",
    color: "#c0d497",
    canvas: "#f0f3eb",
    dark: "#253c36",
    soft: "#e3edd5",
    accent: "#d8efad",
  },
  {
    id: "peach",
    name: "Peach hour",
    color: "#f0b798",
    canvas: "#faf2eb",
    dark: "#473039",
    soft: "#f5e0d1",
    accent: "#ffe0a5",
  },
];
export default function RoomVibes() {
  const [vibe, setVibe] = useState(() => {
    try {
      return localStorage.getItem("mp:room-vibe") || "lilac";
    } catch {
      return "lilac";
    }
  });
  const selected = vibes.find((x) => x.id === vibe) || vibes[0];
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.roomVibe = selected.id;
    root.style.setProperty("--canvas", selected.canvas);
    for (const key of ["dark", "soft", "accent"])
      root.style.setProperty("--room-" + key, selected[key]);
    try {
      localStorage.setItem("mp:room-vibe", selected.id);
    } catch {}
  }, [selected]);
  return (
    <section className={s.vibes} aria-label="Study room colours">
      <div className={s.heading}>
        <Palette size={17} />
        <span>MAKE IT YOUR SPACE</span>
      </div>
      <div className={s.options}>
        {vibes.map((x) => (
          <button
            key={x.id}
            title={x.name}
            aria-label={x.name}
            aria-pressed={selected.id === x.id}
            onClick={() => setVibe(x.id)}
            style={{ "--swatch": x.color }}
          >
            {selected.id === x.id ? (
              <Check size={19} weight="bold" />
            ) : (
              <span />
            )}
          </button>
        ))}
      </div>
      <p>
        {selected.name}
        <span>saved on this device</span>
      </p>
    </section>
  );
}
