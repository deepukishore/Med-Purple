import s from "./ParallaxLayer.module.css";

export default function ParallaxLayer({ as: Element = "span", depth = 1, className = "", children, style, ...props }) {
  const clampedDepth = Math.max(-3, Math.min(3, Number(depth) || 0));
  return <Element className={`${s.layer} ${className}`} style={{ ...style, "--parallax-depth": clampedDepth }} {...props}>{children}</Element>;
}
