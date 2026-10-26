import { useId, useState } from "react";
import { getAvatar } from "../../../shared/avatar-presets.js";
import s from "./AvatarPortrait.module.css";

function HairShape({ avatar, gradientId }) {
  const base = avatar.gender === "female";
  const fill = `url(#${gradientId})`;
  if (avatar.hairstyle === "afro")
    return <path d="M35 56C26 38 33 23 45 24c6-13 19-15 27-7 14-1 22 13 16 26 6 4 7 10 3 17l-9-4-3-14c-12 7-27 8-41 3l-1 12z" fill={fill} />;
  if (avatar.hairstyle === "curl")
    return <path d="M36 55c-8-17 0-29 11-29 3-10 17-12 22-4 11-4 20 7 15 17 9 7 5 19-1 22l-5-15c-12 6-25 7-39 3l-2 10z" fill={fill} />;
  if (avatar.hairstyle === "long" || avatar.hairstyle === "braid")
    return <path d="M35 57c-5-21 3-35 18-37 17-4 32 7 32 26v39l-10 6-2-46c-7 6-17 7-28 3l-2 43-10-5z" fill={fill} />;
  if (avatar.hairstyle === "bun")
    return <path d="M36 57c-5-21 5-35 19-37 17-3 31 8 31 26v34l-9 7-3-45c-7 6-17 7-28 3l-3 42-9-7z" fill={fill} />;
  if (avatar.hairstyle === "bob")
    return <path d="M35 58c-6-21 3-36 19-38 18-2 31 10 31 29v25c-7 6-13 7-19 3l2-30c-9 4-19 5-31 1l1 28c-6 4-12 2-17-2z" fill={fill} />;
  if (avatar.hairstyle === "swept")
    return <path d="M36 57c-4-20 4-32 19-36 11-3 24 2 30 12-8-3-17-3-25 0-7 3-13 9-18 17l-1 8z" fill={fill} />;
  if (avatar.hairstyle === "part")
    return <path d="M36 58c-4-20 4-34 18-37 15-4 29 6 31 20-8-8-17-11-26-9-9 2-16 8-20 18l-1 8z" fill={fill} />;
  if (avatar.hairstyle === "fade" || avatar.hairstyle === "crop")
    return <path d="M38 53c-3-14 4-27 15-31 12-4 25 1 30 12-8-3-14-3-20 0-6 4-12 9-18 19z" fill={fill} />;
  if (avatar.hairstyle === "wave")
    return <path d="M36 56c-3-18 5-32 19-35 15-3 27 5 29 18-8-7-16-9-24-7-9 2-16 9-21 20z" fill={fill} />;
  return <path d={base ? "M36 56c-4-18 4-32 19-35 16-4 29 6 30 21-6-6-13-9-21-8-11 1-19 8-25 21z" : "M37 54c-4-15 3-28 16-32 12-4 25 1 30 12-8-3-15-3-22 0-7 4-13 10-18 20z"} fill={fill} />;
}

function HairCap({ avatar, gradientId }) {
  const cap = ["long", "braid", "bun", "bob"].includes(avatar.hairstyle)
    ? "M39 57c0-19 7-31 20-34 14-3 23 8 23 25-7-7-14-10-21-9-8 1-15 6-22 18z"
    : avatar.hairstyle === "afro"
      ? "M36 56c-6-17 0-28 10-31 5-12 17-13 23-6 12-3 20 7 17 18-10-8-23-9-34-2-5 4-9 11-12 21z"
      : avatar.hairstyle === "curl"
        ? "M37 56c-5-15 1-25 11-28 4-8 15-9 20-3 10-2 16 5 16 14-12-7-29-4-40 7-3 3-5 7-7 10z"
        : null;
  return cap ? <path d={cap} fill={`url(#${gradientId})`} /> : null;
}

export default function AvatarPortrait({ avatarId, name = "student", size = 56, interactive = true, focusable = true, className = "" }) {
  const avatar = getAvatar(avatarId);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = Object.fromEntries(["bg", "skin", "hair", "shirt", "shine"].map((key) => [key, `${key}-${avatar.id}-${reactId}`]));
  const [greeting, setGreeting] = useState(false);
  const firstName = name.trim().split(/\s+/)[0] || "friend";
  const hello = name === "friend" ? avatar.greeting : `${avatar.greeting.replace(/[.!?]$/, "")}, ${firstName}!`;
  const index = Number(avatar.id.slice(-2));
  return (
    <span
      className={`${s.portrait} ${greeting ? s.greeting : ""} ${className}`}
      style={{ "--avatar-size": `${size}px` }}
      role="img"
      aria-label={`${name}'s 3D avatar`}
      tabIndex={interactive && focusable ? 0 : undefined}
      onMouseEnter={() => setGreeting(true)}
      onMouseLeave={() => setGreeting(false)}
      onFocus={() => setGreeting(true)}
      onBlur={() => setGreeting(false)}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={ids.bg} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F1E8FC" />
            <stop offset=".54" stopColor="#E7D8F7" />
            <stop offset="1" stopColor="#D1B9EC" />
          </linearGradient>
          <radialGradient id={ids.skin} cx=".3" cy=".2" r=".85">
            <stop stopColor={avatar.skinLight} />
            <stop offset=".52" stopColor={avatar.skin} />
            <stop offset="1" stopColor={avatar.skinShadow} />
          </radialGradient>
          <linearGradient id={ids.hair} x1=".15" y1="0" x2=".9" y2="1">
            <stop stopColor={avatar.hairLight} stopOpacity=".55" />
            <stop offset=".2" stopColor={avatar.hair} />
            <stop offset="1" stopColor="#29183E" />
          </linearGradient>
          <linearGradient id={ids.shirt} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={avatar.shirt} />
            <stop offset="1" stopColor="#432166" />
          </linearGradient>
          <radialGradient id={ids.shine} cx=".25" cy=".08" r=".85">
            <stop stopColor="#fff" stopOpacity=".68" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="3" y="3" width="114" height="114" rx="37" fill={`url(#${ids.bg})`} />
        <circle cx="60" cy="58" r="47" fill="none" stroke="#fff" strokeOpacity=".52" strokeWidth="1.2" />
        <path d="M13 87c18-18 74-23 95 0" fill="none" stroke="#A878D7" strokeOpacity=".22" />
        <ellipse cx="60" cy="110" rx="35" ry="7" fill="#432166" opacity=".12" />
        <path d="M22 120c2-22 14-34 38-35 24 1 36 13 38 35z" fill={`url(#${ids.shirt})`} />
        <path d="m47 85 13 15 13-15 9 35H38z" fill="#FFFDFF" opacity=".92" />
        <path d="m56 101 4 4 4-4-1 19h-6z" fill="#DDF48E" />
        <path d="M41 77v15m38-15v15" stroke={avatar.skinShadow} strokeWidth="12" strokeLinecap="round" />
        {avatar.gender === "female" && <HairShape avatar={avatar} gradientId={ids.hair} />}
        {avatar.gender === "male" && (avatar.hairstyle === "afro" || avatar.hairstyle === "curl") && <HairShape avatar={avatar} gradientId={ids.hair} />}
        <path d="M40 58c0-18 9-28 21-28s21 10 21 28v12c0 17-9 28-21 28S40 87 40 70z" fill={`url(#${ids.skin})`} />
        <ellipse cx="39" cy="66" rx="4" ry="7" fill={avatar.skin} />
        <ellipse cx="83" cy="66" rx="4" ry="7" fill={avatar.skinShadow} />
        {!(avatar.gender === "female" && ["long", "braid", "bun", "bob"].includes(avatar.hairstyle)) && !(avatar.gender === "male" && ["afro", "curl"].includes(avatar.hairstyle)) && <HairShape avatar={avatar} gradientId={ids.hair} />}
        <path d="M47 61q5-4 10 0m7 0q5-4 10 0" fill="none" stroke={avatar.hair} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="52" cy="67" rx="1.8" ry="2.5" fill="#29183E" />
        <ellipse cx="69" cy="67" rx="1.8" ry="2.5" fill="#29183E" />
        <path d="M60 68l-2 8q2 2 5 0" fill="none" stroke={avatar.skinShadow} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M54 81q6 5 12 0" fill="none" stroke="#7139AB" strokeWidth="2" strokeLinecap="round" />
        {(avatar.gender === "female" || ["afro", "curl"].includes(avatar.hairstyle)) && <HairCap avatar={avatar} gradientId={ids.hair} />}
        {avatar.beard && <path d="M45 76q2 17 15 19 13-2 15-19l-6 4-3 7-6 2-6-2-3-7z" fill={avatar.hair} opacity=".82" />}
        {index % 3 === 0 && <g fill="none" stroke={avatar.hair} strokeWidth="1.8"><rect x="44" y="63" width="15" height="11" rx="4" /><rect x="62" y="63" width="15" height="11" rx="4" /><path d="M59 67h3" /></g>}
        <path d="M39 82q2 16 21 18" fill="none" stroke={`url(#${ids.shine})`} strokeWidth="5" opacity=".75" />
        <g className={s.waveArm}>
          <path d="M82 91c10-4 13-15 13-26" fill="none" stroke={avatar.skin} strokeWidth="9" strokeLinecap="round" />
          <path d="M82 91c10-4 13-15 13-26" fill="none" stroke="#fff" strokeOpacity=".27" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="95" cy="61" rx="6" ry="7" fill={`url(#${ids.skin})`} />
          <path d="M96 57v-5m-4 7-3-4m9 4 3-4" stroke={avatar.skin} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <circle cx="97" cy="98" r="3" fill="#DDF48E" />
        <circle cx="22" cy="37" r="2" fill="#fff" opacity=".9" />
      </svg>
      {interactive && <span className={s.speech} aria-hidden="true">{hello}</span>}
    </span>
  );
}
