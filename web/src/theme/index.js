import {
  colors as c,
  spacing as s,
  typography as t,
  motion as m,
} from "@med-purple/design-tokens";
export function applyTheme(mode) {
  let selected = mode;
  if (!selected && typeof document !== "undefined")
    selected = document.documentElement.dataset.theme;
  if (!selected && typeof localStorage !== "undefined") {
    try { selected = localStorage.getItem("mp:theme"); } catch { /* Use system preference when storage is unavailable. */ }
  }
  if (!selected && typeof matchMedia === "function")
    selected = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  selected = selected === "dark" ? "dark" : "light";
  const palette = selected === "dark" ? { ...c, ...c.dark } : c;
  const purple = selected === "dark" ? { ...c.purple, ...c.dark.purple } : c.purple;
  const values = {
    ink: palette.ink,
    muted: palette.muted,
    canvas: palette.canvas,
    paper: palette.canvas,
    "paper-raised": palette.surface,
    surface: palette.surface,
    line: palette.line,
    accent: palette.accent,
    "accent-ink": palette.accentInk,
    success: palette.success,
    "success-tint": palette.successTint,
    danger: palette.danger,
    "danger-tint": palette.dangerTint,
    anatomy: palette.anatomy,
    link: palette.link,
    mint: palette.mint,
    "mint-ink": palette.mintInk,
    "font-body": t.body,
    "font-display": t.display,
    "text-caption": `${t.sizes.caption}px`,
    "text-small": `${t.sizes.small}px`,
    "text-body": `${t.sizes.body}px`,
    "text-subheading": `${t.sizes.subheading}px`,
    "text-heading": `${t.sizes.heading}px`,
    "text-hero": `${t.sizes.hero}px`,
    "text-display": `${t.sizes.display}px`,
    "shadow-low": s.elevation.low,
    "shadow-raised": s.elevation.raised,
    "shadow-hero": s.elevation.hero,
    "radius-small": `${s.radii.small}px`,
    "radius-control": `${s.radii.control}px`,
    "radius-card": `${s.radii.card}px`,
    "radius-hero": `${s.radii.hero}px`,
    "dur-micro": `${m.duration.micro}ms`,
    "dur-short": `${m.duration.normal}ms`,
    "dur-celebration": `${m.duration.celebration}ms`,
    "ease-out": `cubic-bezier(${m.ease.join(",")})`,
    "ease-in": `cubic-bezier(${m.easeIn.join(",")})`,
    "ease-in-out": `cubic-bezier(${m.easeInOut.join(",")})`,
  };
  for (const [key, value] of Object.entries(purple))
    values[`purple-${key}`] = value;
  for (const [key, value] of Object.entries(values))
    document.documentElement.style.setProperty(`--${key}`, value);
  document.documentElement.style.setProperty(
    "--ease",
    `cubic-bezier(${m.ease.join(",")})`,
  );
  document.documentElement.dataset.theme = selected;
  document.documentElement.dataset.night = String(selected === "dark");
  document.documentElement.style.colorScheme = selected;
}
