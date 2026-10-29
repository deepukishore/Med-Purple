import { useEffect, useMemo, useRef, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import StudyBuddy from "./StudyBuddy";
import s from "./StudyEffects.module.css";

const celebration = ["💊", "🦴", "🫀", "🧬", "✦", "✦", "✦", "🦴", "💊", "🫀", "✦", "🧬"];

function play(ctx, type) {
  if (ctx && type === "defib") {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, start);
    oscillator.frequency.exponentialRampToValueAtTime(880, start + 0.56);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.036, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.58);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.6);
    return;
  }
  if (ctx && type === "explode") {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(420, start);
    oscillator.frequency.exponentialRampToValueAtTime(105, start + 0.32);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.36);
    return;
  }
  const notes = {
    "answer-correct": [[660, 0.08], [880, 0.13]],
    "answer-wrong": [[210, 0.18]],
    "bone-found": [[540, 0.07], [810, 0.13]],
    "level-up": [[523, 0.09], [659, 0.09], [784, 0.2]],
    heartbeat: [[78, 0.11], [56, 0.15]],
  }[type];
  if (!ctx || !notes) return;
  let offset = 0;
  for (const [frequency, duration] of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + offset;
    oscillator.type = type === "answer-wrong" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.055, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    offset += duration * 0.72;
  }
}

export default function StudyEffects({ calm = false }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [burst, setBurst] = useState(false);
  const [pip, setPip] = useState(null);
  const audio = useRef(null);
  const timers = useRef([]);
  const pipTimer = useRef(0);
  const reducedMotion = useRef(false);
  const particles = useMemo(
    () => celebration.map((emoji, index) => ({
      emoji,
      left: `${(index * 37 + 13) % 100}%`,
      delay: `${(index % 5) * 42}ms`,
      spin: `${(index % 2 ? 1 : -1) * (90 + index * 17)}deg`,
    })),
    [],
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = preference.matches;
    const update = (event) => { reducedMotion.current = event.matches; };
    preference.addEventListener("change", update);
    const onEvent = (event) => {
      const type = event.detail?.type;
      if (!type) return;
      if (soundEnabled && !calm) play(audio.current, type);
      const messages = {
        "answer-correct": ["That answer was right. Keep the reasoning, too.", "happy"],
        "answer-wrong": ["Useful miss. The explanation is where it sticks.", "oops"],
        "bone-found": [`New find: ${event.detail.name || "a named skeletal part"}.`, "happy"],
        "level-up": [`Level ${event.detail.level || "up"}. Your practice is adding up.`, "happy"],
      };
      if (messages[type]) {
        setPip({ message: messages[type][0], expression: messages[type][1] });
        window.clearTimeout(pipTimer.current);
        pipTimer.current = window.setTimeout(() => setPip(null), 4200);
      }
      if (type === "answer-wrong" && !calm && !reducedMotion.current) {
        const monitor = document.querySelector("[data-heart-stage]");
        if (monitor) {
          monitor.classList.add(s.rattle);
          timers.current.push(window.setTimeout(() => monitor.classList.remove(s.rattle), 280));
        }
      }
      if (type !== "level-up" || calm || reducedMotion.current) return;

      setBurst(true);
      const shell = document.querySelector("[data-app-shell]");
      if (shell) {
        shell.classList.add(s.hitStop);
        timers.current.push(window.setTimeout(() => {
          shell.classList.remove(s.hitStop);
          shell.classList.add(s.shake);
          timers.current.push(window.setTimeout(() => shell.classList.remove(s.shake), 260));
        }, 60));
      }
      timers.current.push(window.setTimeout(() => setBurst(false), 1350));
    };
    window.addEventListener("mp:event", onEvent);
    return () => {
      preference.removeEventListener("change", update);
      window.removeEventListener("mp:event", onEvent);
      timers.current.forEach(window.clearTimeout);
      window.clearTimeout(pipTimer.current);
      if (audio.current) audio.current.close().catch(() => {});
    };
  }, [calm, soundEnabled]);

  async function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false);
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      audio.current ||= new AudioContext();
      await audio.current.resume();
      setSoundEnabled(true);
    } catch {
      setSoundEnabled(false);
    }
  }

  return (
    <>
      <button
        className={s.soundToggle}
        type="button"
        aria-pressed={soundEnabled && !calm}
        aria-label={calm ? "Sound effects are paused by Calm mode" : soundEnabled ? "Mute study sound effects" : "Enable study sound effects"}
        title={calm ? "Sound effects are paused in Calm mode" : soundEnabled ? "Mute sound effects" : "Enable sound effects"}
        disabled={calm}
        onClick={toggleSound}
      >
        {soundEnabled && !calm ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />}
        <span>{calm ? "Sound paused" : soundEnabled ? "Sound on" : "Sound off"}</span>
      </button>
      {burst && (
        <div className={s.burst} aria-hidden="true">
          {particles.map((particle, index) => (
            <span
              key={`${index}-${particle.emoji}`}
              style={{ "--particle-left": particle.left, "--particle-delay": particle.delay, "--particle-spin": particle.spin }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>
      )}
      {pip && (
        <aside className={s.pipToast} role="status" aria-live="polite">
          <span className={s.pipFace}><StudyBuddy expression={pip.expression} /></span>
          <span><strong>Pip</strong><br />{pip.message}</span>
          <button type="button" aria-label="Dismiss Pip" onClick={() => setPip(null)}>×</button>
        </aside>
      )}
    </>
  );
}
