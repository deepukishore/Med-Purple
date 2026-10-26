import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { AVATARS } from "../../../shared/avatar-presets.js";
import AvatarPortrait from "./AvatarPortrait";
import s from "./AvatarPicker.module.css";

export default function AvatarPicker({ value, onChange, saved, onSave, saving, compact = false }) {
  const [gender, setGender] = useState(() => value?.startsWith("male-") ? "male" : "female");
  useEffect(() => setGender(value?.startsWith("male-") ? "male" : "female"), [value]);
  const options = AVATARS.filter((avatar) => avatar.gender === gender);
  return (
    <section className={`${s.panel} ${compact ? s.compact : ""}`} aria-labelledby="avatar-picker-title">
      <div className={s.heading}>
        <div>
          <span className={s.eyebrow}>MAKE IT YOURS</span>
          <h2 id="avatar-picker-title">Choose your avatar</h2>
          <p>20 original portraits with a little personality. Hover to get a hello.</p>
        </div>
        <button className={s.save} type="button" disabled={saving || value === saved} onClick={onSave}>
          {saving ? "Saving…" : value === saved ? "Avatar saved" : "Save avatar"}
        </button>
      </div>
      <div className={s.categories} role="tablist" aria-label="Avatar style">
        {[ ["female", "Female avatars"], ["male", "Male avatars"] ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={gender === key} onClick={() => setGender(key)}>
            {label}<span>{AVATARS.filter((avatar) => avatar.gender === key).length}</span>
          </button>
        ))}
      </div>
      <div className={s.grid}>
        {options.map((avatar) => (
          <button
            type="button"
            key={avatar.id}
            className={`${s.choice} ${value === avatar.id ? s.selected : ""}`}
            aria-label={`Choose ${avatar.gender} avatar ${avatar.id.slice(-2)}`}
            aria-pressed={value === avatar.id}
            onClick={() => onChange(avatar.id)}
          >
            <AvatarPortrait
              avatarId={avatar.id}
              name="friend"
              size={compact ? 54 : 64}
              focusable={false}
              className={compact ? s.compactPortrait : ""}
            />
            <small>{avatar.id.slice(-2)}</small>
            {value === avatar.id && <Check className={s.check} weight="bold" size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <p className={s.hint}>Your portrait appears on your profile.</p>
    </section>
  );
}
