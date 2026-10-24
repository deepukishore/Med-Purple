import { Link } from "react-router-dom";
import s from "./ui.module.css";
export default function Button({
  children,
  to,
  variant = "primary",
  small = false,
  className = "",
  ...props
}) {
  const cls = `${s.button} ${s[variant] || ""} ${small ? s.small : ""} ${className}`;
  return to ? (
    <Link to={to} className={cls} {...props}>
      {children}
    </Link>
  ) : (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
