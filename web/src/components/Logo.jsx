import { Link } from "react-router-dom";
export default function Logo({ inverse = false }) {
  return (
    <Link
      to="/"
      aria-label="Med Purple home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 11,
        fontWeight: 800,
        fontSize: 19,
        letterSpacing: "-.7px",
      }}
    >
      <img src="/favicon.svg" alt="" width="37" height="37" />
      med
      <span
        style={{
          color: inverse ? "#d9c0ff" : "var(--purple-600)",
          marginLeft: -7,
        }}
      >
        purple
      </span>
    </Link>
  );
}
