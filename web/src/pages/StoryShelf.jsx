import { useEffect, useRef, useState } from "react";
import { BookmarkSimple, Eye, Flag, Plus, ShareNetwork, X } from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import s from "./Social.module.css";

const storyTypes = [
  ["quiz", "One-question quiz"],
  ["mnemonic", "Mnemonic of the day"],
  ["flashcard", "Flashcard"],
  ["diagram", "Diagram / sketch"],
  ["video", "Explain in 30 seconds"],
  ["study_with_me", "Study with me"],
  ["milestone", "Study milestone"],
  ["senior_tip", "Senior tip"],
  ["text", "Quick explainer"],
];
const stickerTypes = [
  ["", "No sticker"],
  ["poll", "Poll"],
  ["this_or_that", "This or that"],
  ["question", "Question box"],
  ["doubt", "Doubt sticker"],
  ["countdown", "Exam countdown"],
  ["progress", "Today's MCQ progress"],
  ["streak", "Study streak"],
];
const reactions = [
  ["helpful", "💡 Helpful"],
  ["learned", "🧠 Learned"],
  ["fire", "🔥 Great explanation"],
  ["motivated", "👏 Motivated me"],
];

const initialDraft = () => ({
  title: "",
  subject: "Anatomy",
  kind: "quiz",
  text: "",
  question: "",
  answer: "",
  options: ["", "", ""],
  correctIndex: 0,
  explanation: "",
  front: "",
  back: "",
  poll: "",
  pollOptions: ["", ""],
  sticker: "",
  minutes: 50,
  audience: "everyone",
  groupId: "",
  anonymous: false,
  duration: 24,
  highlight: "",
  scheduledAt: "",
  countdownAt: "",
  replyToStoryId: "",
  excludedUserIds: [],
  draft: false,
  file: null,
  videoSeconds: 30,
});

function mediaHref(path) {
  const origin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");
  return `${origin}${path}`;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected media."));
    reader.readAsDataURL(file);
  });
}

function SketchPad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState("#563d7c");
  function point(event) {
    const bounds = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / bounds.width;
    const scaleY = canvasRef.current.height / bounds.height;
    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  }
  function start(event) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const current = point(event);
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.strokeStyle = color;
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
  }
  function move(event) {
    if (!drawing.current) return;
    const context = canvasRef.current.getContext("2d");
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
  }
  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }
  return (
    <div className={s.sketchTools}>
      <div className={s.sketchToolbar}>
        <span>Medical-friendly pen</span>
        {["#563d7c", "#d04f56", "#287d73", "#e19b35"].map((ink) => (
          <button
            key={ink}
            type="button"
            aria-label={`Set pen color ${ink}`}
            aria-pressed={color === ink}
            style={{ background: ink }}
            onClick={() => setColor(ink)}
          />
        ))}
        <button type="button" className={s.sketchClear} onClick={clear}>
          Clear sketch
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        aria-label="Draw a medical diagram"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
    </div>
  );
}

export default function StoryShelf() {
  const { user } = useApp();
  const [subject, setSubject] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [selected, setSelected] = useState(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [failure, setFailure] = useState("");
  const [working, setWorking] = useState(false);
  const [pollChoice, setPollChoice] = useState(null);
  const [answer, setAnswer] = useState("");
  const [sketchData, setSketchData] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [clock, setClock] = useState(Date.now());
  const feed = useData(`/stories?subject=${encodeURIComponent(subject)}`);
  const mine = useData("/stories/mine");
  const featured = useData("/stories/featured");
  const leaderboard = useData("/stories/leaderboard");
  const groupData = useData("/stories/groups");
  const milestones = useData("/stories/milestones");
  const creatorStreak = useData("/stories/creator-streak");
  const closeFriends = useData("/stories/close-friends");
  const students = useData(`/profiles?search=${encodeURIComponent(peopleSearch)}`);
  const items = feed.data?.items || [];
  const ownStories = mine.data?.items || [];
  const requestedStoryId = new URLSearchParams(window.location.search).get("story");
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!requestedStoryId) return;
    let active = true;
    api.get(`/stories/${requestedStoryId}`).then((story) => {
      if (active) {
        setSelected(story);
        setSelectedSlideIndex(0);
      }
    }).catch((error) => {
      if (active) setFailure(error.message);
    });
    return () => {
      active = false;
    };
  }, [requestedStoryId]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("createStory") === "1") {
      setComposerOpen(true);
    }
  }, []);

  async function refreshSelected(id = selected?.id) {
    if (!id) return;
    setSelected(await api.get(`/stories/${id}?slide_index=${selectedSlideIndex}`));
  }
  async function run(fn) {
    setFailure("");
    setWorking(true);
    try {
      const result = await fn();
      feed.reload();
      mine.reload();
      return result;
    } catch (error) {
      setFailure(error.message);
      return null;
    } finally {
      setWorking(false);
    }
  }
  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function updateOption(key, index, value) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  }
  async function upload(dataUrl) {
    const result = await api.post("/stories/media", { data_url: dataUrl });
    return result.media_url;
  }
  function storyPayload({ draft: saveDraft = false } = {}) {
    let slide;
    if (draft.kind === "quiz") {
      slide = {
        text: draft.question.trim(),
        options: draft.options.map((item) => item.trim()),
        correct_index: Number(draft.correctIndex),
        explanation: draft.explanation.trim(),
      };
    } else if (draft.kind === "mnemonic") {
      slide = { mnemonic: draft.text.trim(), text: draft.text.trim() };
    } else if (draft.kind === "flashcard") {
      slide = { front: draft.front.trim(), back: draft.back.trim() };
    } else if (draft.kind === "study_with_me") {
      slide = { text: draft.text.trim(), minutes: Number(draft.minutes) };
    } else if (draft.kind === "senior_tip") {
      slide = { text: draft.text.trim(), credentials: draft.answer.trim() };
    } else {
      slide = { text: draft.text.trim() };
    }
    if (draft.kind === "diagram" && sketchData) slide.sketch_data = sketchData;
    if (draft.kind === "video" && draft.videoSeconds) {
      slide.duration_seconds = Number(draft.videoSeconds);
    }
    if (draft.kind === "milestone") {
      const milestone = milestones.data || {};
      slide.milestone = { level: milestone.level, xp: milestone.xp, streak_days: milestone.streak_days };
      slide.text = draft.text.trim() || `${milestone.level || 1} level reached · ${milestone.streak_days || 0}-day study streak`;
    }
    if (draft.sticker === "poll" || draft.sticker === "this_or_that") {
      slide.sticker = {
        type: draft.sticker,
        prompt: draft.poll.trim(),
        options: draft.pollOptions.map((item) => item.trim()).filter(Boolean),
      };
    } else if (draft.sticker === "question" || draft.sticker === "doubt") {
      slide.sticker = { type: draft.sticker, prompt: draft.poll.trim() };
    } else if (draft.sticker === "countdown") {
      slide.sticker = { type: "countdown", prompt: draft.poll.trim(), target_at: draft.countdownAt ? new Date(draft.countdownAt).toISOString() : null };
    } else if (draft.sticker === "progress" || draft.sticker === "streak") {
      slide.sticker = { type: draft.sticker };
    }
    return {
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      kind: draft.kind,
      slides: [slide],
      audience: draft.audience,
      group_id: draft.audience === "group" ? draft.groupId || null : null,
      excluded_user_ids: draft.excludedUserIds,
      anonymous: draft.anonymous,
      duration_hours: Number(draft.duration),
      highlight: draft.highlight.trim(),
      scheduled_at: saveDraft || !draft.scheduledAt ? null : new Date(draft.scheduledAt).toISOString(),
      draft: saveDraft,
      reply_to_story_id: draft.replyToStoryId || null,
    };
  }
  async function submitStory(saveDraft = false) {
    if (draft.file) {
      if (!window.confirm("Before posting, confirm this media contains no identifiable patient information.")) {
        return;
      }
    }
    setWorking(true);
    setFailure("");
    try {
      const payload = storyPayload({ draft: saveDraft });
      if (draft.file) {
        const media_url = await upload(await readFile(draft.file));
        payload.slides[0][draft.kind === "video" ? "video_url" : "media_url"] = media_url;
      }
      if (draft.kind === "diagram" && sketchData) {
        const media_url = await upload(sketchData);
        payload.slides[0].media_url = media_url;
        delete payload.slides[0].sketch_data;
      }
      const created = await api.post("/stories", payload);
      setComposerOpen(false);
      setDraft(initialDraft());
      setSketchData("");
      feed.reload();
      mine.reload();
      if (created.published_at) setSelected(await api.get(`/stories/${created.id}`));
    } catch (error) {
      setFailure(error.message);
    } finally {
      setWorking(false);
    }
  }
  async function respond(response_type, values = {}) {
    const result = await run(() => api.post(`/stories/${selected.id}/responses`, {
      response_type,
      slide_index: selectedSlideIndex,
      sticker_key: sticker.key || "",
      ...values,
    }));
    if (result) {
      setAnswer("");
      await refreshSelected();
    }
    return result;
  }
  async function react(reaction) {
    const result = await run(() => api.put(`/stories/${selected.id}/reactions`, {
      reaction,
      active: !selected.my_reactions?.includes(reaction),
    }));
    if (result) await refreshSelected();
  }
  async function save(kind) {
    await run(() => api.post(`/stories/${selected.id}/save`, {
      kind,
      slide_index: selectedSlideIndex,
      sticker_key: sticker.key || "",
    }));
  }
  async function openStory(item) {
    setFailure("");
    try {
      setSelected(await api.get(`/stories/${item.id}?slide_index=0`));
      setSelectedSlideIndex(0);
      setPollChoice(null);
      setAnswer("");
    } catch (error) {
      setFailure(error.message);
    }
  }
  async function showSlide(index) {
    if (
      !selected ||
      index < 0 ||
      index >= selected.slides.length ||
      index === selectedSlideIndex
    )
      return;
    try {
      setSlideDirection(index > selectedSlideIndex ? 1 : -1);
      setSelected(await api.get(`/stories/${selected.id}?slide_index=${index}`));
      setSelectedSlideIndex(index);
      setPollChoice(null);
      setAnswer("");
    } catch (error) {
      setFailure(error.message);
    }
  }
  function closeComposer() {
    setComposerOpen(false);
    setDraft(initialDraft());
    setSketchData("");
  }
  const slide = selected?.slides?.[selectedSlideIndex] || {};
  const sticker = slide.sticker || {};
  const responseKey = (type) => sticker.key
    ? `${type}:${selectedSlideIndex}:${sticker.key}`
    : selectedSlideIndex ? `${type}:${selectedSlideIndex}` : type;
  const alreadyAnswered = selected?.my_responses || {};
  const timerMinutes = Number(slide.minutes || 50);
  const quizOptions = slide.options || sticker.options || [];
  const quizCorrectIndex = slide.correct_index ?? sticker.correct_index ?? sticker.correct;
  const quizAnsweredCorrect = slide.correct ?? sticker.is_correct;
  const timeLeft = selected?.published_at
    ? Math.max(0, timerMinutes * 60 - Math.floor((clock - new Date(selected.published_at).getTime()) / 1000))
    : timerMinutes * 60;
  useEffect(() => {
    if (!selected) return undefined;
    function handleKey(event) {
      if (event.key === "ArrowRight") showSlide(selectedSlideIndex + 1);
      if (event.key === "ArrowLeft") showSlide(selectedSlideIndex - 1);
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, selectedSlideIndex]);

  return (
    <section className={s.storyHub} aria-label="Study stories">
      <div className={s.storyHubHead}>
        <div>
          <span className={s.eyebrow}>STUDY, SHARE, REMEMBER</span>
          <h2>Stories for your next study break</h2>
          <p>Quick quizzes, mnemonics and explainers from your study community.</p>
        </div>
        <button className={s.storyPrimary} onClick={() => setComposerOpen(true)}>
          <Plus size={17} /> Create story
        </button>
      </div>
      {failure && <p className={s.error} role="alert">{failure}</p>}
      <div className={s.storyFilters}>
        <label>
          Filter by subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="All subjects · e.g. Anatomy" />
        </label>
        <button type="button" onClick={() => setSubject("")}>All</button>
        {["Anatomy", "Physiology", "Medicine", "NEET PG"].map((tag) => (
          <button type="button" key={tag} aria-pressed={subject === tag} onClick={() => setSubject(subject === tag ? "" : tag)}>{tag}</button>
        ))}
      </div>
      <div className={s.storyRow}>
        <button className={s.storyAdd} onClick={() => setComposerOpen(true)}>
          <span>+</span><small>Your story</small>
        </button>
        {feed.loading && <span className={s.storyEmpty}>Loading stories…</span>}
        {feed.error && <button onClick={feed.reload}>Could not load stories · Retry</button>}
        {!feed.loading && !items.length && <span className={s.storyEmpty}>No live stories for this subject yet. Share the first useful tip.</span>}
        {items.map((item) => (
          <button className={s.storyCard} key={item.id} onClick={() => openStory(item)}>
            <span className={s.storyAvatar}>{item.creator?.[0] || "S"}</span>
            <span className={s.storyType}>{item.kind.replaceAll("_", " ")}</span>
            <strong>{item.creator}</strong>
            <small>{item.title}</small>
            <time>{item.subject}</time>
          </button>
        ))}
      </div>
      <div className={s.storyExtras}>
        <section className={s.storyExtraCard}>
          <strong>Story of the day</strong>
          {featured.data?.item ? (
            <button onClick={() => openStory(featured.data.item)}>{featured.data.item.title} · {featured.data.item.subject}</button>
          ) : <small>Helpful stories will appear here.</small>}
        </section>
        <section className={s.storyExtraCard}>
          <strong>Top story creators this week</strong>
          {(leaderboard.data?.items || []).slice(0, 3).map((entry, index) => (
            <small key={entry.user_id}>{index + 1}. {entry.name} · {entry.score} helpful interactions</small>
          ))}
          {!leaderboard.data?.items?.length && <small>Share a story to start this week’s board.</small>}
          <small>Your story creator streak: {creatorStreak.data?.story_streak || 0} days</small>
        </section>
      </div>
      <details className={s.storyMine}>
        <summary>Manage close friends and study groups</summary>
        <label className={s.storyManageSearch}>
          Find a student
          <input value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Search by name" />
        </label>
        {(students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => {
          const isClose = closeFriends.data?.items?.some((entry) => entry.id === person.id);
          return (
            <div key={person.id}>
              <span>{person.name}</span>
              <button onClick={() => run(() => api.put(`/stories/close-friends/${person.id}?active=${!isClose}`)).then(() => closeFriends.reload())}>
                {isClose ? "Remove close friend" : "Add close friend"}
              </button>
            </div>
          );
        })}
        {groupData.data?.items?.map((group) => (
          <div key={group.id}><span>{group.name}</span><button onClick={() => setInviteId(group.id)}>Select group to invite students</button></div>
        ))}
        {inviteId && (students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => (
          <div key={`${inviteId}-${person.id}`}><span>{person.name}</span><button onClick={() => run(() => api.post(`/stories/groups/${inviteId}/members`, { user_ids: [person.id] }))}>Invite to group</button></div>
        ))}
        <label className={s.storyManageSearch}>
          Create a study group
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Cardiology revision" />
        </label>
        <button disabled={!groupName.trim()} onClick={() => run(() => api.post("/stories/groups", { name: groupName })).then((group) => {
          if (group) {
            setGroupName("");
            groupData.reload();
          }
        })}>Create group</button>
      </details>
      {!!ownStories.length && (
        <details className={s.storyMine}>
          <summary>Your stories, drafts and schedule ({ownStories.length})</summary>
          {ownStories.map((item) => (
            <div key={item.id}>
              <button onClick={() => item.published_at && openStory(item)}>{item.title}</button>
              <small>{item.published_at ? item.highlight ? `Highlight · ${item.highlight}` : `${item.views} views` : item.scheduled_at ? `Scheduled for ${new Date(item.scheduled_at).toLocaleString()}` : "Draft"}</small>
              {item.responses?.length > 0 && <small>{item.responses.length} responses</small>}
              {!item.published_at && !item.scheduled_at && <button onClick={() => run(() => api.post(`/stories/${item.id}/publish`))}>Publish draft</button>}
              <button aria-label={`Delete ${item.title}`} onClick={() => run(() => api.delete(`/stories/${item.id}`))}>Delete</button>
            </div>
          ))}
        </details>
      )}
      {composerOpen && (
        <div className={s.storyModalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeComposer()}>
          <section className={s.storyComposerModal} role="dialog" aria-modal="true" aria-labelledby="story-composer-title">
            <header><div><span className={s.eyebrow}>MAKE IT USEFUL</span><h2 id="story-composer-title">Create a study story</h2></div><button aria-label="Close composer" onClick={closeComposer}><X size={20} /></button></header>
            <div className={s.storyComposeGrid}>
              <label>Story format
                <select value={draft.kind} onChange={(event) => update("kind", event.target.value)}>
                  {storyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>Subject tag<input required maxLength={50} value={draft.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Anatomy, NEET PG…" /></label>
              <label className={s.storyWide}>Title<input required maxLength={150} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Give this study story a title" /></label>
              {draft.kind === "quiz" && <>
                <label className={s.storyWide}>One-question MCQ<input required value={draft.question} onChange={(event) => update("question", event.target.value)} placeholder="Ask a single high-yield question" /></label>
                {draft.options.map((option, index) => <label key={index}>Option {index + 1}
                  <input required value={option} onChange={(event) => updateOption("options", index, event.target.value)} />
                </label>)}
                <label>Correct answer<select value={draft.correctIndex} onChange={(event) => update("correctIndex", event.target.value)}>{draft.options.map((_, index) => <option key={index} value={index}>Option {index + 1}</option>)}</select></label>
                <label className={s.storyWide}>Explanation<input value={draft.explanation} onChange={(event) => update("explanation", event.target.value)} placeholder="Why is it correct?" /></label>
              </>}
              {draft.kind === "flashcard" && <>
                <label className={s.storyWide}>Question / front<input required value={draft.front} onChange={(event) => update("front", event.target.value)} /></label>
                <label className={s.storyWide}>Answer / back<textarea required value={draft.back} onChange={(event) => update("back", event.target.value)} /></label>
              </>}
              {["mnemonic", "study_with_me", "milestone", "senior_tip", "text", "diagram"].includes(draft.kind) && (
                <label className={s.storyWide}>{draft.kind === "mnemonic" ? "Mnemonic" : draft.kind === "senior_tip" ? "Senior tip" : "Story text"}
                  <textarea value={draft.text} onChange={(event) => update("text", event.target.value)} placeholder={draft.kind === "mnemonic" ? "Write a memorable study mnemonic" : "Explain one useful idea"} />
                </label>
              )}
              {draft.kind === "senior_tip" && <label className={s.storyWide}>Credentials<input value={draft.answer} onChange={(event) => update("answer", event.target.value)} placeholder="Verification is shown only after confirmation by the app" /></label>}
              {draft.kind === "study_with_me" && <label>Shared focus timer (minutes)<input type="number" min="5" max="180" value={draft.minutes} onChange={(event) => update("minutes", event.target.value)} /></label>}
              {draft.kind === "diagram" && <div className={s.storyWide}><SketchPad onChange={setSketchData} /></div>}
              {draft.kind === "video" && <>
                <label className={s.storyWide}>Concept summary<textarea value={draft.text} onChange={(event) => update("text", event.target.value)} placeholder="What will viewers learn?" /></label>
                <label className={s.storyWide}>Video (max 30 seconds)
                  <input type="file" accept="video/mp4,video/webm" onChange={(event) => update("file", event.target.files?.[0] || null)} />
                </label>
                <label>Clip duration in seconds<input type="number" min="1" max="30" value={draft.videoSeconds} onChange={(event) => update("videoSeconds", event.target.value)} /></label>
              </>}
              {draft.kind !== "video" && draft.kind !== "diagram" && <label className={s.storyWide}>Optional image
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => update("file", event.target.files?.[0] || null)} />
              </label>}
              <label>Interactive sticker<select value={draft.sticker} onChange={(event) => update("sticker", event.target.value)}>{stickerTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {["poll", "this_or_that"].includes(draft.sticker) && <>
                <label className={s.storyWide}>Poll question<input value={draft.poll} onChange={(event) => update("poll", event.target.value)} placeholder="Which is more high-yield?" /></label>
                {draft.pollOptions.map((option, index) => <label key={index}>Choice {index + 1}<input value={option} onChange={(event) => updateOption("pollOptions", index, event.target.value)} /></label>)}
              </>}
              {["question", "doubt", "countdown"].includes(draft.sticker) && <label className={s.storyWide}>{draft.sticker === "countdown" ? "Exam / event" : "Prompt"}
                <input value={draft.poll} onChange={(event) => update("poll", event.target.value)} placeholder="Ask a question or name the exam" />
              </label>}
              {draft.sticker === "countdown" && <label className={s.storyWide}>Countdown date<input type="datetime-local" value={draft.countdownAt} onChange={(event) => update("countdownAt", event.target.value)} /></label>}
              <label>Audience<select value={draft.audience} onChange={(event) => update("audience", event.target.value)}>
                <option value="everyone">Everyone</option><option value="friends">Friends (mutual follows)</option><option value="close_friends">Close friends</option><option value="group">Study group</option>
              </select></label>
              {draft.audience === "group" && <label>Study group<select value={draft.groupId} onChange={(event) => update("groupId", event.target.value)}>
                <option value="">Choose a group</option>{(groupData.data?.items || []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select></label>}
              {draft.audience === "group" && !groupData.data?.items?.length && <p className={`${s.storyWarning} ${s.storyWide}`}>Create a study group in “Manage close friends and study groups” before posting a group story.</p>}
              <label>Story duration<select value={draft.duration} onChange={(event) => update("duration", event.target.value)}>
                <option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>3 days</option><option value={168}>7 days</option>
              </select></label>
              <label>Pin in Highlights<input maxLength={80} value={draft.highlight} onChange={(event) => update("highlight", event.target.value)} placeholder="e.g. Mnemonics (optional)" /></label>
              <label>Schedule for later<input type="datetime-local" value={draft.scheduledAt} onChange={(event) => update("scheduledAt", event.target.value)} /></label>
              <label className={s.storyCheck}><input type="checkbox" checked={draft.anonymous} onChange={(event) => update("anonymous", event.target.checked)} /> Post anonymously</label>
              <div className={s.storyWide}>
                <strong>Hide this story from specific people</strong>
                {(students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => {
                  const excluded = draft.excludedUserIds.includes(person.id);
                  return <label className={s.storyCheck} key={person.id}><input type="checkbox" checked={excluded} onChange={() => update("excludedUserIds", excluded ? draft.excludedUserIds.filter((id) => id !== person.id) : [...draft.excludedUserIds, person.id])} /> Hide from {person.name}</label>;
                })}
              </div>
              <p className={`${s.storyWarning} ${s.storyWide}`}>Do not share identifiable patient information, clinical photos, or private health details. Stories are for learning, not clinical advice.</p>
            </div>
            {failure && <p className={s.error} role="alert">{failure}</p>}
            <footer>
              <button disabled={working} onClick={() => submitStory(true)}>Save draft</button>
              <button disabled={working} onClick={() => submitStory(false)}>{working ? "Saving…" : draft.scheduledAt ? "Schedule story" : "Post story"}</button>
            </footer>
          </section>
        </div>
      )}
      {selected && (
        <div className={s.storyModalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <article className={s.storyViewer} role="dialog" aria-modal="true" aria-labelledby="story-view-title">
            <header>
              <div><span className={s.storyAvatar}>{selected.creator?.[0] || "S"}</span><span><strong>{selected.creator}</strong><small>{selected.subject} · {selected.kind.replaceAll("_", " ")}</small></span></div>
              <button aria-label="Close story" onClick={() => setSelected(null)}><X size={20} /></button>
            </header>
            {selected.slides.length > 1 && (
              <div className={s.storySlideProgress} aria-label={`Slide ${selectedSlideIndex + 1} of ${selected.slides.length}`}>
                {selected.slides.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    aria-label={`Show slide ${index + 1}`}
                    aria-current={selectedSlideIndex === index ? "step" : undefined}
                    onClick={() => showSlide(index)}
                  >
                    <span style={{ opacity: selectedSlideIndex === index ? 1 : 0.35 }} />
                  </button>
                ))}
              </div>
            )}
            <div
              key={`story-slide-${selectedSlideIndex}`}
              className={s.storySlideScene}
              style={{ "--story-direction": slideDirection }}
            >
            <h2 id="story-view-title">{selected.title}</h2>
            {selected.mine && selected.needs_review && (
              <p className={s.storyWarning} role="alert">
                Viewers flagged this story as potentially incorrect. Please verify it, update it, or delete it.
              </p>
            )}
            {slide.media_url && <img className={s.storyMedia} src={mediaHref(slide.media_url)} alt="Study story visual" />}
            {slide.video_url && <video className={s.storyMedia} src={mediaHref(slide.video_url)} controls playsInline />}
            {slide.text && <p>{slide.text}</p>}
            {slide.mnemonic && <blockquote>{slide.mnemonic}</blockquote>}
            {(selected.kind === "quiz" || sticker.type === "quiz") && <>
              <h3>{slide.text}</h3>
              <div className={s.storyChoices}>{quizOptions.map((option, index) => (
                <button key={option} disabled={!!alreadyAnswered[responseKey("quiz")]} aria-pressed={pollChoice === index} onClick={() => setPollChoice(index)}>{option}{slide.your_answer === index && (quizAnsweredCorrect ? " ✓ Correct" : " · Your answer")}{selected.mine && index === quizCorrectIndex ? " ✓ Answer" : ""}</button>
              ))}</div>
              {!selected.mine && !alreadyAnswered[responseKey("quiz")] && <button className={s.storyPrimary} disabled={pollChoice === null || working} onClick={() => respond("quiz", { option_index: pollChoice })}>Check answer</button>}
              {quizAnsweredCorrect !== undefined && <p className={quizAnsweredCorrect ? s.storySuccess : s.storyWarning}>{quizAnsweredCorrect ? "Correct — nice work!" : "Not quite. Review the answer below."} {slide.explanation || sticker.explanation}</p>}
              {!selected.mine && <button onClick={() => save("flashcard")}><BookmarkSimple /> Save quiz to flashcards</button>}
            </>}
            {selected.kind === "flashcard" && <>
              <details className={s.storyFlip}><summary>Tap to flip · {slide.front}</summary><p>{slide.back}</p></details>
              {!selected.mine && <button onClick={() => save("flashcard")}><BookmarkSimple /> Save to flashcards</button>}
            </>}
            {selected.kind === "senior_tip" && slide.credentials && <small className={s.storyStat}>Shared credentials: {slide.credentials}</small>}
            {selected.kind !== "flashcard" && !selected.mine && (slide.mnemonic || slide.text) && <button onClick={() => save("note")}><BookmarkSimple /> Save to my notes</button>}
            {sticker.type === "poll" || sticker.type === "this_or_that" ? <>
              <h3>{sticker.prompt || "Choose one"}</h3>
              {(sticker.options || []).map((option, index) => <button className={s.storyPollChoice} key={option} disabled={!!alreadyAnswered[responseKey("poll")]} aria-pressed={pollChoice === index} onClick={() => setPollChoice(index)}>{option}</button>)}
              {!selected.mine && !alreadyAnswered[responseKey("poll")] && <button onClick={() => respond("poll", { option_index: pollChoice })} disabled={pollChoice === null || working}>Vote</button>}
              {selected.mine && selected.responses?.filter((item) => item.type === "poll").map((item) => <small key={item.id}>{item.author}: {item.answer}</small>)}
            </> : null}
            {sticker.type === "question" || sticker.type === "question_box" || sticker.type === "doubt" ? <>
              <h3>{sticker.prompt || (sticker.type === "doubt" ? "Add an answer or doubt" : "Ask a question")}</h3>
              <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={sticker.type === "doubt" ? "Share your answer or question" : "Send a question"} />
              <button disabled={!answer.trim() || working} onClick={() => respond(sticker.type === "question_box" ? "question_box" : sticker.type, { answer })}>{sticker.type === "doubt" ? "Reply to doubt" : "Send question"}</button>
              {selected.mine && selected.responses?.map((item) => <blockquote key={item.id}>{item.author}: {item.answer}</blockquote>)}
            </> : null}
            {sticker.type === "countdown" && <p className={s.storyCountdown}>⏳ {sticker.prompt} {sticker.target_at ? `· ${new Date(sticker.target_at).toLocaleDateString()}` : ""}</p>}
            {sticker.data?.mcqs_today !== undefined && <p className={s.storyStat}>📈 Finished {sticker.data.mcqs_today} MCQs today</p>}
            {sticker.data?.streak_days !== undefined && <p className={s.storyStat}>🔥 {sticker.data.streak_days}-day study streak</p>}
            {selected.kind === "study_with_me" && <div className={s.storyTimer}><strong>{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</strong><span>shared focus timer</span>{!selected.mine && <button disabled={!!alreadyAnswered.join} onClick={() => respond("join")}>{alreadyAnswered.join ? "Joined" : "Join session"}</button>}</div>}
            {selected.kind === "diagram" && slide.media_url && !selected.mine && <button onClick={() => save("note")}><BookmarkSimple /> Save sketch to notes</button>}
            {!selected.mine && <div className={s.storyReactions}>{reactions.map(([key, label]) => <button key={key} aria-pressed={selected.my_reactions?.includes(key)} onClick={() => react(key)}>{label} · {selected.reactions?.[key] || 0}</button>)}</div>}
            {selected.mine && <section className={s.storyInsights}><strong><Eye size={17} /> {selected.views} viewers</strong>{selected.viewers?.map((viewer) => <small key={viewer.user_id}>{viewer.name}</small>)}<strong>Answer breakdown</strong>{selected.responses?.map((item) => <small key={item.id}>{item.author}: {item.answer || (item.correct ? "Correct" : "Incorrect")}</small>)}{selected.flags?.map((flag) => <small key={flag.flag + flag.details}><Flag size={15} /> {flag.flag}: {flag.details} ({flag.count})</small>)}</section>}
            {!selected.mine && <div className={s.storySafetyActions}>
              <button onClick={() => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "wrong_info", details: "Potentially incorrect study information" }))}><Flag size={15} /> Report incorrect info</button>
              <button onClick={() => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "patient_info", details: "Potentially identifiable patient information" }))}>Report patient information</button>
              <button onClick={() => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "needs_verification", details: "Please verify this study information." }))}>Needs verification</button>
              {selected.creator_id && <><button onClick={() => run(() => api.post(`/stories/${selected.id}/hide`))}>Hide stories</button><button onClick={() => run(() => api.post(`/stories/users/${selected.creator_id}/block`))}>Block student</button><button onClick={() => run(() => api.put(`/stories/users/${selected.creator_id}/follow?active=true`))}>Follow</button></>}
              <button onClick={() => { setDraft({ ...initialDraft(), title: `Reply: ${selected.title}`, subject: selected.subject, replyToStoryId: selected.id }); setSelected(null); setComposerOpen(true); }}><ShareNetwork size={15} /> Reply with a story</button>
            </div>}
            {failure && <p className={s.error} role="alert">{failure}</p>}
            {selected.slides.length > 1 && (
              <footer className={s.storySlideControls}>
                <button type="button" onClick={() => showSlide(selectedSlideIndex - 1)} disabled={selectedSlideIndex === 0}>Previous slide</button>
                <span>{selectedSlideIndex + 1} / {selected.slides.length}</span>
                <button type="button" onClick={() => showSlide(selectedSlideIndex + 1)} disabled={selectedSlideIndex === selected.slides.length - 1}>Next slide</button>
              </footer>
            )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
