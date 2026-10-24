import { useState } from "react";
import { ArrowRight, X } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import s from "./GuidedTour.module.css";

const steps = [
  ["Start anywhere", "Use Capture in the bottom corner to save a thought, a link, a textbook photo, or a voice memo without leaving your screen.", "/captures"],
  ["Fit revision into the gap", "Study tools builds a playlist from questions, cards, notes, and videos for five minutes, fifteen minutes, or an hour.", "/study-tools"],
  ["Make the desk yours", "Choose focus subjects, language, difficulty, reading mode, and home widget order from Personalize.", "/preferences"],
];
export default function GuidedTour() {
  const [step, setStep] = useState(() => { try { return localStorage.getItem("mp:tour-seen") ? -1 : 0; } catch { return 0; } });
  if (step < 0) return null;
  const current = steps[step];
  function close() { localStorage.setItem("mp:tour-seen", "true"); setStep(-1); }
  return <div className={s.backdrop}><section className={s.card} role="dialog" aria-modal="true" aria-label="Med Purple guided tour"><button className={s.close} onClick={close} aria-label="Skip tour"><X size={18} /></button><span className={s.eyebrow}>A 30-SECOND TOUR · {step + 1}/{steps.length}</span><h2>{current[0]}</h2><p>{current[1]}</p><div className={s.actions}><button className={s.skip} onClick={close}>Skip for now</button>{step < steps.length - 1 ? <button className={s.next} onClick={() => setStep(step + 1)}>Next <ArrowRight size={15} /></button> : <Link className={s.next} to={current[2]} onClick={close}>Try it <ArrowRight size={15} /></Link>}</div></section></div>;
}
