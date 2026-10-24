import usePageMeta from "../hooks/usePageMeta";
import { Link } from "react-router-dom";
import policies from "../../../shared/legal.json";
import s from "./Information.module.css";

export default function Legal({ policy = "terms" }) {
  const page = policies.pages.find((item) => item.key === policy);
  usePageMeta(page.title);
  return (
    <div className={s.page}>
      <Link className={s.backLink} to="/legal">
        ← Legal centre
      </Link>
      <header className={s.pageHeader}>
        <span className={s.eyebrow}>MED PURPLE / LEGAL</span>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
        <p className={s.meta}>
          Updated {policies.updated} · {policies.status}
        </p>
      </header>
      <div className={s.reviewNote}>
        <strong>Publication details pending</strong>
        <p>{policies.reviewNote}</p>
      </div>
      <div className={s.legalLayout}>
        <nav className={s.contents} aria-label="On this page">
          <strong>ON THIS PAGE</strong>
          {policies[policy].map((section, index) => (
            <a key={section.heading} href={`#section-${index + 1}`}>
              {section.heading}
            </a>
          ))}
        </nav>
        <article className={s.article} aria-label={page.title}>
          {policies[policy].map((section, index) => (
            <section id={`section-${index + 1}`} key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          {policy === "deletion" && (
            <p style={{ marginTop: 24 }}>
              <Link className={s.backLink} to="/profile">
                Open My profile →
              </Link>
            </p>
          )}
        </article>
      </div>
      <nav className={s.related} aria-label="Other policies">
        {policies.pages
          .filter((item) => item.key !== policy)
          .map((item) => (
            <Link key={item.key} to={item.path}>
              {item.title}
            </Link>
          ))}
      </nav>
    </div>
  );
}
