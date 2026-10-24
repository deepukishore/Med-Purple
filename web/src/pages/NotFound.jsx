import usePageMeta from "../hooks/usePageMeta";
import Button from "../components/Button";
import s from "./Library.module.css";
export default function NotFound() {
  usePageMeta("Page not found");
  return (
    <div className={s.notFound}>
      <strong>404</strong>
      <h1>A little off the study path.</h1>
      <p>This page isn’t here. Your dashboard is just one tap away.</p>
      <Button to="/">Back to my dashboard</Button>
    </div>
  );
}
