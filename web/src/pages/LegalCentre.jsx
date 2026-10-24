import { Link } from "react-router-dom";
import { ArrowUpRight } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import policies from "../../../shared/legal.json";
import s from "./Information.module.css";

export default function LegalCentre() {
  usePageMeta("Legal centre");
  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <span className={s.eyebrow}>MED PURPLE / LEGAL</span>
        <h1>Clarity, in one place.</h1>
        <p>
          Understand how Med Purple works, how your information is used, and the
          choices you have.
        </p>
      </header>
      <div className={s.reviewNote}>
        <strong>{policies.status}</strong>
        <p>{policies.reviewNote}</p>
      </div>
      <nav className={s.policyGrid} aria-label="Legal policies">
        {policies.pages.map((page) => (
          <Link className={s.card} to={page.path} key={page.key}>
            <h2>{page.title}</h2>
            <p>{page.summary}</p>
            <span className={s.cardAction}>
              Read policy <ArrowUpRight size={17} />
            </span>
          </Link>
        ))}
      </nav>
      <p className={s.meta}>
        Updated {policies.updated} · <Link to="/about">About Med Purple</Link>
      </p>
    </div>
  );
}
