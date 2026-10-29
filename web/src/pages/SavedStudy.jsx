import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Notebook,
  Stack,
  ArrowClockwise,
  PencilSimple,
  Trash,
  DownloadSimple,
  Printer,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import Button from "../components/Button";
import { PageSkeleton, ErrorState } from "../components/States";
import s from "./Studio.module.css";
export default function SavedStudy({ kind }) {
  const flash = kind === "flashcards";
  const [params] = useSearchParams();
  usePageMeta(flash ? "Viva & recall cards" : "Clinical notebook");
  const { user, notify } = useApp();
  const { data, loading, error, reload } = useData("/" + kind);
  const reviews = useData("/flashcards/reviews");
  const [form, setForm] = useState(null),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [deleting, setDeleting] = useState(null),
    [reviewing, setReviewing] = useState(flash && params.get("review") === "1"),
    [flipped, setFlipped] = useState(false),
    [reviewed, setReviewed] = useState(new Set());
  const swipeStart = useRef(null);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const due = (data || []).filter(
    (x) =>
      !reviewed.has(x.id) &&
      (!(reviews.data || []).find((r) => r.item_id === x.id) ||
        (reviews.data || []).find((r) => r.item_id === x.id).due <= today),
  );
  const current = due[0];
  async function mutate(action, message) {
    if (busy) return false;
    setBusy(true);
    setFailure("");
    try {
      await action();
      notify(message);
      reload();
      reviews.reload();
      return true;
    } catch (e) {
      setFailure(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const body = {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
      subject: form.subject.trim(),
      kind: flash ? "flashcard" : "note",
    };
    if (
      await mutate(
        () =>
          form.id
            ? api.put("/saved/" + form.id, body)
            : api.post("/saved", body),
        "Saved to your study space.",
      )
    )
      setForm(null);
  }
  function edit(item = {}) {
    setFailure("");
    setForm({ title: "", content: "", subject: "General", ...item });
    setReviewing(false);
  }
  async function rate(rating) {
    if (
      await mutate(
        () => api.post("/flashcards/" + current.id + "/review", { rating }),
        rating === "again"
          ? "Saved for another review today."
          : "Next review scheduled.",
      )
    ) {
      setReviewed((old) => new Set([...old, current.id]));
      setFlipped(false);
    }
  }
  function exportNote(item) {
    const url = URL.createObjectURL(
      new Blob(["# " + item.title + "\n\n" + item.content], {
        type: "text/markdown",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-note.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>
            {flash
              ? "YOUR MEMORY HAS ENTERED THE CHAT"
              : "SAVE THE LIGHT-BULB MOMENTS"}
          </span>
          <h1>
            {flash
              ? "Your viva voice starts here."
              : "Messy thoughts. Clearer medicine."}
          </h1>
          <p>
            {flash
              ? "Say it out loud. Flip to check. Review again when it's due."
              : "Connect the dots from your books and postings. Keep patient details out of your study notes."}
          </p>
        </div>
        <div className={s.row}>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={17} /> Print / PDF
          </Button>
          {flash && (
            <Button
              variant="secondary"
              disabled={loading || reviews.loading || !!reviews.error}
              onClick={() => {
                setReviewing(true);
                setReviewed(new Set());
                setFlipped(false);
                setForm(null);
              }}
            >
              Review due cards
            </Button>
          )}
          <Button onClick={() => edit()}>
            <Plus size={18} />
            New {flash ? "flashcard" : "note"}
          </Button>
        </div>
      </div>
      {failure && (
        <p className={s.error} role="alert">
          {failure}
        </p>
      )}
      {form && (
        <form className={`${s.panel} ${s.form}`} onSubmit={save}>
          <h2>
            {form.id ? "Edit" : "Create"} {flash ? "flashcard" : "note"}
          </h2>
          <fieldset disabled={busy}>
            {!flash && !form.id && !form.content && (
              <div className={s.templateBox}>
                <p>Skip the blank-page stare. Start with a structure:</p>
                <div className={s.row}>
                  {[
                    [
                      "Clinical topic",
                      "Definition\n\nKey features\n\nDifferentials\n\nInvestigations\n\nManagement principles\n\nRed flags\n\nSource & date\n",
                    ],
                    [
                      "Viva prep",
                      "The question\n\nMy 30-second answer\n\nWhy it matters\n\nLikely follow-up questions\n\nWhat I need to revisit\n\nSource & date\n",
                    ],
                    [
                      "Mistake review",
                      "What I picked\n\nWhat I missed\n\nThe clue in the question\n\nThe concept in my own words\n\nHow I'll remember it\n\nSource & date\n",
                    ],
                  ].map(([label, content]) => (
                    <Button
                      key={label}
                      small
                      variant="secondary"
                      onClick={() => setForm({ ...form, content })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <label>
              {flash ? "Question / prompt" : "Title"}
              <input
                autoFocus
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Subject or tag
              <input
                required
                maxLength={50}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label>
              {flash ? "Answer" : "Your notes"}
              <textarea
                required
                maxLength={12000}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </label>
          </fieldset>
          <div className={s.row}>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setForm(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {deleting && (
        <div className={s.panel} role="alert">
          <h2>Delete this {flash ? "flashcard" : "note"}?</h2>
          <p style={{ margin: "12px 0" }}>
            “{deleting.title}” will be removed permanently.
          </p>
          <div className={s.row}>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (
                  await mutate(
                    () => api.delete("/saved/" + deleting.id),
                    "Item deleted.",
                  )
                )
                  setDeleting(null);
              }}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep it
            </Button>
          </div>
        </div>
      )}
      {loading && !data ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : reviewing ? (
        <section className={s.review}>
          {reviews.loading ? (
            <PageSkeleton />
          ) : reviews.error ? (
            <ErrorState message={reviews.error} onRetry={reviews.reload} />
          ) : current ? (
            <>
              <span className={s.chip}>
                {due.length} left in this round · {current.subject}
              </span>
              <div
                className={s.reviewDeck}
                onPointerDown={(event) => {
                  if (flipped && !event.target.closest("button"))
                    swipeStart.current = {
                      x: event.clientX,
                      y: event.clientY,
                    };
                }}
                onPointerUp={(event) => {
                  const start = swipeStart.current;
                  swipeStart.current = null;
                  if (!flipped || !start || busy) return;
                  const dx = event.clientX - start.x;
                  const dy = event.clientY - start.y;
                  if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy)) return;
                  rate(dx < 0 ? "again" : "good");
                }}
                onPointerCancel={() => {
                  swipeStart.current = null;
                }}
              >
                <div
                  className={`${s.reviewFlip} ${flipped ? s.isFlipped : ""}`}
                >
                  <div className={s.reviewFace}>
                    <Stack size={35} color="#8655c4" />
                    <h2>{current.title}</h2>
                    <Button onClick={() => setFlipped(true)}>
                      <ArrowClockwise size={18} />
                      Reveal answer
                    </Button>
                  </div>
                  <div className={`${s.reviewFace} ${s.reviewBack}`}>
                    <div className={s.answer}>{current.content}</div>
                    <p className={s.muted}>
                      Swipe left to try again · right when you know it
                    </p>
                    <div className={s.row}>
                      <Button
                        disabled={busy}
                        variant="secondary"
                        onClick={() => rate("again")}
                      >
                        Again today
                      </Button>
                      <Button disabled={busy} onClick={() => rate("good")}>
                        Got it
                      </Button>
                      <Button
                        disabled={busy}
                        variant="secondary"
                        onClick={() => rate("easy")}
                      >
                        Easy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2>Round complete. Brain: upgraded.</h2>
              <p className={s.muted}>
                You reviewed {reviewed.size} cards. Cards marked “again” stay
                due today; the others return on their next review date.
              </p>
              <Button
                onClick={() => {
                  setReviewed(new Set());
                  setFlipped(false);
                }}
              >
                Review again
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => setReviewing(false)}>
            Back to my cards
          </Button>
        </section>
      ) : (
        <>
          <label className={s.toolbar}>
            Find an idea
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, content, or subject"
            />
          </label>
          <div className={s.grid}>
            {(data || [])
              .filter((x) =>
                (x.title + " " + x.content + " " + x.subject)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((item) => (
                <article className={s.card} key={item.id}>
                  <span className={s.chip}>{item.subject}</span>
                  <h2>{item.title}</h2>
                  {flash ? (
                    <details>
                      <summary>Reveal answer</summary>
                      <p className={s.text}>{item.content}</p>
                    </details>
                  ) : (
                    <p className={s.text}>{item.content}</p>
                  )}
                  <div className={s.row}>
                    <Button
                      small
                      variant="secondary"
                      onClick={() => edit(item)}
                    >
                      <PencilSimple size={16} />
                      Edit
                    </Button>
                    {!flash && (
                      <button
                        className={s.chip}
                        onClick={() => exportNote(item)}
                        aria-label={"Export " + item.title}
                      >
                        <DownloadSimple size={17} />
                      </button>
                    )}
                    <button
                      className={s.chip}
                      disabled={busy}
                      onClick={() => setDeleting(item)}
                      aria-label={"Delete " + item.title}
                    >
                      <Trash size={17} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
          {!(data || []).some((x) =>
            (x.title + " " + x.content + " " + x.subject)
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && (
            <div className={s.empty}>
              <Notebook size={38} />
              <h2>
                {search ? "No matching ideas." : "A fresh page. All yours."}
              </h2>
              <p>
                {search
                  ? "Try another search."
                  : "Create your first item, or save a takeaway from MedBytes."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
