import {
  colors as c,
  spacing as s,
  typography as t,
  motion as m,
} from "@med-purple/design-tokens";
export function applyTheme() {
  const values = {
    ink: c.ink,
    muted: c.muted,
    canvas: c.canvas,
    surface: c.surface,
    line: c.line,
    accent: c.accent,
    "accent-ink": c.accentInk,
    success: c.success,
    "success-tint": c.successTint,
    danger: c.danger,
    "danger-tint": c.dangerTint,
    anatomy: c.anatomy,
    cyan: c.cyan,
    lavender: c.lavender,
    "font-body": t.body,
    "font-display": t.display,
    "shadow-low": s.elevation.low,
    "shadow-raised": s.elevation.raised,
    "shadow-hero": s.elevation.hero,
  };
  for (const [key, value] of Object.entries(c.purple))
    values[`purple-${key}`] = value;
  for (const [key, value] of Object.entries(values))
    document.documentElement.style.setProperty(`--${key}`, value);
  document.documentElement.style.setProperty(
    "--ease",
    `cubic-bezier(${m.ease.join(",")})`,
  );
}
