import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Heart, Sparkle } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import content from "../../../shared/legal.json";
import s from "./Information.module.css";

const icons = [BookOpen, Sparkle, Heart];
export default function About() {
  usePageMeta("About Med Purple");
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <span className={s.eyebrow}>ABOUT MED PURPLE</span>
        <h1>{content.about.title}</h1>
        <p>{content.about.intro}</p>
        <Link className={s.primaryLink} to="/learn">
          Explore your revision toolkit <ArrowUpRight size={18} />
        </Link>
        <span className={s.heroMark} aria-hidden="true">
          m<span>+</span>
        </span>
      </header>
      <section className={s.mission} aria-labelledby="mission-title">
        <span className={s.eyebrow}>OUR PURPOSE</span>
        <div>
          <h2 id="mission-title">Supporting everyday medical study</h2>
          <p>{content.about.mission}</p>
        </div>
      </section>
      <section className={s.featureGrid} aria-label="Ways to learn">
        {content.about.features.map((feature, index) => {
          const Icon = icons[index];
          return (
            <Link to={feature.path} className={s.card} key={feature.heading}>
              <Icon className={s.featureIcon} size={27} weight="duotone" />
              <h2>{feature.heading}</h2>
              <p>{feature.body}</p>
              <span className={s.cardAction}>
                Take a look <ArrowUpRight size={17} />
              </span>
            </Link>
          );
        })}
      </section>
      <section className={s.founders} aria-labelledby="founders-title">
        <div>
          <span className={s.eyebrow}>THE PEOPLE BEHIND MED PURPLE</span>
          <h2 id="founders-title">{content.about.teamHeading}</h2>
          <p>{content.about.founderNote}</p>
        </div>
        <div className={s.founderGrid}>
          {content.about.people.map(({ name, role, bio }) => (
            <div className={s.founder} key={name}>
              <span className={s.monogram} aria-hidden="true">
                {name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")}
              </span>
              <div>
                <h3>{name}</h3>
                <p className={s.founderRole}>{role}</p>
                <p>{bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className={s.trust}>
        <div>
          <h2>A study companion, with clear boundaries.</h2>
          <p>
            Med Purple supports education and revision. Always verify clinical
            information with current authoritative sources and qualified
            guidance.
          </p>
        </div>
        <Link to="/legal">
          Visit our legal centre <ArrowUpRight size={18} />
        </Link>
      </aside>
    </div>
  );
}
