import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import {
  Plus,
  Heart,
  ChatCircle,
  CheckCircle,
  ArrowLeft,
  UsersThree,
  Timer,
  Trophy,
  UserPlus,
  ChatCircleDots,
  ThumbsUp,
  Sparkle,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api } from "../context/AppContext";
import Button from "../components/Button";
import XPLevel from "../components/XPLevel";
import { PageSkeleton, ErrorState } from "../components/States";
import StoryShelf from "./StoryShelf";
import s from "./Social.module.css";

export function SocialTabs() {
  return (
    <nav className={s.tabs} aria-label="Student community">
      <NavLink to="/community">Community</NavLink>
      <NavLink to="/doubts">Doubts</NavLink>
      <NavLink to="/students">Students</NavLink>
    </nav>
  );
}
export function Author({ item }) {
  return (
    <Link className={s.author} to={`/students/${item.author_id}`}>
      <span className={s.avatar}>{item.author?.[0] || "S"}</span>
      <span>
        <strong>{item.author}</strong>
        <small>
          Level {item.author_level} · {item.author_xp} XP
        </small>
      </span>
    </Link>
  );
}

function CommunityPulse() {
  const [joined, setJoined] = useState("Anatomy focus room");
  const [following, setFollowing] = useState(new Set(["Aarav"]));
  const [seconds, setSeconds] = useState(42 * 60 + 18);
  const [liveCount, setLiveCount] = useState(18);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [pollChoice, setPollChoice] = useState("");
  const [roomMessages, setRoomMessages] = useState([]);
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const { data: featureState } = useData("/features");
  useEffect(() => {
    const community = featureState?.community;
    if (!community) return;
    if (community.joined_room) setJoined(community.joined_room);
    if (Array.isArray(community.followed_people))
      setFollowing(new Set(community.followed_people));
  }, [featureState]);
  useEffect(() => {
    const configured = import.meta.env.VITE_API_URL || "";
    const origin = configured.startsWith("http")
      ? configured.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "")
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8001`;
    let socket;
    try {
      socket = new WebSocket(
        `${origin}/api/v1/ws/study-rooms/${encodeURIComponent(joined)}`,
      );
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "presence") setLiveCount(message.participants);
      };
      const ping = setInterval(
        () =>
          socket?.readyState === WebSocket.OPEN &&
          socket.send(JSON.stringify({ type: "ping" })),
        20000,
      );
      return () => {
        clearInterval(ping);
        socket?.close();
        socketRef.current = null;
      };
    } catch {
      return undefined;
    }
  }, [joined]);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get(`/study-rooms/${encodeURIComponent(joined)}/messages`)
        .then((items) => active && setRoomMessages(items))
        .catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [joined]);
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds((value) => (value ? value - 1 : 50 * 60)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const persistCommunity = (next) =>
    api.patch("/features", { community: next }).catch(() => {});
  const toggleFollow = (name) =>
    setFollowing((items) => {
      const next = new Set(items);
      next.has(name) ? next.delete(name) : next.add(name);
      persistCommunity({ joined_room: joined, followed_people: [...next] });
      return next;
    });
  return (
    <section className={s.pulse} aria-label="Community study tools">
      <div className={s.pulseIntro}>
        <span className={s.eyebrow}>FIND YOUR PEOPLE</span>
        <h2>Study better, together.</h2>
        <p>
          Drop into a room, find your year group, or follow the people whose
          explanations make things click.
        </p>
        <div className={s.roomTimer}>
          <Timer size={18} />
          <strong>
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </strong>
          <span>shared focus timer</span>
          <button
            className={s.timerButton}
            onClick={() =>
              socketRef.current?.readyState === WebSocket.OPEN &&
              socketRef.current.send(
                JSON.stringify({ type: "start_timer", seconds: 300 }),
              )
            }
          >
            Start 5m
          </button>
        </div>
      </div>
      <div className={s.pulseColumn}>
        <div className={s.pulseHead}>
          <h3>Live study rooms</h3>
          <span className={s.live}>
            <i /> {liveCount} studying now
          </span>
        </div>
        {["Anatomy focus room", "Pharm sprint · 2nd year"].map(
          (room, index) => (
            <button
              key={room}
              className={`${s.room} ${joined === room ? s.roomJoined : ""}`}
              onClick={() => {
                setJoined(room);
                persistCommunity({
                  joined_room: room,
                  followed_people: [...following],
                });
              }}
            >
              <span className={s.roomAvatars}>
                <b>{index ? "P" : "A"}</b>
                <b>{index ? "N" : "R"}</b>
                <b>+{index ? 5 : 8}</b>
              </span>
              <span>
                <strong>{room}</strong>
                <small>
                  {index ? "45 min · Pomodoro" : "50 min · quiet room"}
                </small>
              </span>
              <span className={s.roomAction}>
                {joined === room ? "Joined" : "Join"}
              </span>
            </button>
          ),
        )}
      </div>
      <div className={s.pulseColumn}>
        <div className={s.pulseHead}>
          <h3>Your circles</h3>
          <span className={s.muted}>Groups</span>
        </div>
        <div className={s.groupChips}>
          <button>
            2nd year Anatomy <small>248</small>
          </button>
          <button>
            City Medical College <small>1.2k</small>
          </button>
          <button>
            NEET PG 2027 <small>804</small>
          </button>
        </div>
        <div className={s.pulseHead} style={{ marginTop: 16 }}>
          <h3>Top helpers this week</h3>
          <Trophy size={17} color="var(--purple-600)" />
        </div>
        {["Aarav", "Maya", "Rohan"].map((name, index) => (
          <div className={s.helper} key={name}>
            <span className={s.helperRank}>{index + 1}</span>
            <span className={s.helperAvatar}>{name[0]}</span>
            <span>
              <strong>{name}</strong>
              <small>
                {index === 0
                  ? "Verified helper"
                  : `${78 - index * 12} XP earned`}
              </small>
            </span>
            <button
              aria-pressed={following.has(name)}
              onClick={() => toggleFollow(name)}
            >
              <UserPlus size={15} />
              {following.has(name) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
        <button
          className={s.messages}
          onClick={() => setMessagesOpen((value) => !value)}
        >
          <ChatCircleDots size={17} />{" "}
          {messagesOpen ? "Close messages" : "Open messages"} <span>2 new</span>
        </button>
        {messagesOpen && (
          <div className={s.messagePanel}>
            {roomMessages.map((item) => (
              <div key={item.id}>
                <strong>{item.author}</strong>
                <span>{item.content}</span>
              </div>
            ))}
            {!roomMessages.length && (
              <span>No messages yet. Say hello to the room.</span>
            )}
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!message.trim()) return;
                await api.post(
                  `/study-rooms/${encodeURIComponent(joined)}/messages`,
                  { content: message.trim() },
                );
                setMessage("");
                const items = await api.get(
                  `/study-rooms/${encodeURIComponent(joined)}/messages`,
                );
                setRoomMessages(items);
              }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Message the room..."
              />
              <button type="submit">
                Send <ArrowLeft size={13} />
              </button>
            </form>
          </div>
        )}
        <div className={s.pulseTools}>
          <button onClick={() => setTopicOpen((value) => !value)}>
            Request a topic
          </button>
          <button onClick={() => setPollOpen((value) => !value)}>
            Quick poll
          </button>
        </div>
        {topicOpen && (
          <form
            className={s.messagePanel}
            onSubmit={(event) => {
              event.preventDefault();
              if (!topic.trim()) return;
              persistCommunity({
                joined_room: joined,
                followed_people: [...following],
                topic_request: topic.trim(),
              });
              setTopic("");
              setTopicOpen(false);
            }}
          >
            <strong>What should someone explain next?</strong>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. ECG axis in 5 minutes"
            />
            <button type="submit">
              Post request <ArrowLeft size={13} />
            </button>
          </form>
        )}
        {pollOpen && (
          <div className={s.messagePanel}>
            <strong>Which resource helps pathology most?</strong>
            {["Rapid review", "Lectures", "Question bank"].map((option) => (
              <button
                key={option}
                aria-pressed={pollChoice === option}
                onClick={() => {
                  setPollChoice(option);
                  persistCommunity({
                    joined_room: joined,
                    followed_people: [...following],
                    poll_vote: option,
                  });
                }}
              >
                {option} {pollChoice === option ? "✓" : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
export default function SocialFeed({ doubts = false }) {
  const title = doubts ? "Doubts" : "Community",
    endpoint = doubts ? "/doubts" : "/community";
  usePageMeta(title);
  const [params, setParams] = useSearchParams();
  const selected = params.get("post");
  const [offset, setOffset] = useState(0),
    [search, setSearch] = useState(""),
    [subject, setSubject] = useState(""),
    [status, setStatus] = useState("all"),
    [form, setForm] = useState(null),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [deleting, setDeleting] = useState(null),
    [upvoted, setUpvoted] = useState(new Set());
  const { data, loading, error, reload } = useData(
    selected
      ? `${endpoint}/${selected}`
      : `${endpoint}?${new URLSearchParams({ offset, search, subject, status })}`,
  );
  useEffect(() => {
    const key = `mp:${doubts ? "doubt" : "community"}:draft`;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved?.form || saved?.reply) {
        if (saved.form) setForm(saved.form);
        if (saved.reply) setReply(saved.reply);
      }
    } catch {}
  }, [doubts]);
  useEffect(() => {
    try {
      localStorage.setItem(
        `mp:${doubts ? "doubt" : "community"}:draft`,
        JSON.stringify({ form, reply }),
      );
    } catch {}
  }, [doubts, form, reply]);
  function open(id) {
    setParams(id ? { post: id } : {});
    setReply("");
    setFailure("");
    setDeleting(null);
  }
  async function action(fn, after) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const value = await fn();
      after?.(value);
      reload();
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  function like(item) {
    action(() =>
      api.put(`${endpoint}/${item.id}/like`, { liked: !item.liked }),
    );
  }
  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <span className={s.eyebrow}>LEARN TOGETHER. GROW TOGETHER.</span>
          <h1>
            {doubts
              ? "Every doubt deserves an answer."
              : "Your medical community."}
          </h1>
          <p>
            {doubts
              ? "Ask what is unclear. Share your reasoning. Help a fellow student move forward."
              : "Medical ideas, study wins, useful resources, and conversations that help us grow."}
          </p>
        </div>
        <Button
          disabled={busy}
          onClick={() =>
            setForm({ title: "", subject: "General medicine", content: "" })
          }
        >
          <Plus size={18} />
          {doubts ? "Ask a doubt" : "Create a post"}
        </Button>
      </header>
      <SocialTabs />
      {!doubts && <CommunityPulse />}
      <div className={s.layout}>
        <div className={s.feed}>
          {failure && (
            <p className={s.error} role="alert">
              {failure}
            </p>
          )}
          {form && (
            <form
              className={s.card}
              onSubmit={(e) => {
                e.preventDefault();
                action(
                  () => api.post(endpoint, form),
                  (result) => {
                    setForm(null);
                    open(result.id);
                  },
                );
              }}
            >
              <h2>
                {doubts
                  ? "What would you like to understand?"
                  : "Share something medical"}
              </h2>
              <fieldset disabled={busy} className={s.form}>
                <label>
                  Title
                  <input
                    required
                    maxLength={150}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Medical subject
                  <input
                    required
                    maxLength={50}
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                  />
                </label>
                <label>
                  {doubts ? "Your doubt and what you have tried" : "Post"}
                  <textarea
                    required
                    maxLength={5000}
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                  />
                </label>
                <div className={s.actions}>
                  <Button type="submit">
                    {busy ? "Posting…" : doubts ? "Post doubt" : "Publish post"}
                  </Button>
                  <Button variant="secondary" onClick={() => setForm(null)}>
                    Cancel
                  </Button>
                </div>
              </fieldset>
            </form>
          )}
          {deleting && (
            <div className={s.card} role="alert">
              <h2>Delete this {deleting.reply ? "reply" : "post"}?</h2>
              <div className={s.actions}>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    action(
                      () => api.delete(deleting.path),
                      () => {
                        if (!deleting.reply) open(null);
                        setDeleting(null);
                      },
                    )
                  }
                >
                  Delete
                </Button>
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {!selected && !doubts && <StoryShelf />}
          {selected ? (
            <Button variant="ghost" disabled={busy} onClick={() => open(null)}>
              <ArrowLeft size={18} />
              All {doubts ? "doubts" : "posts"}
            </Button>
          ) : (
            <div className={s.filters}>
              <label>
                Search
                <input
                  type="search"
                  placeholder={doubts ? "Find a doubt" : "Find a conversation"}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                  }}
                />
              </label>
              <label>
                Subject
                <input
                  placeholder="All subjects"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setOffset(0);
                  }}
                />
              </label>
              {doubts && (
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="all">All doubts</option>
                    <option value="open">Unsolved</option>
                    <option value="solved">Solved</option>
                  </select>
                </label>
              )}
            </div>
          )}
          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : selected ? (
            <>
              <article className={s.card}>
                <div className={s.postTop}>
                  <Author item={data} />
                  <span className={s.tag}>{data.subject}</span>
                </div>
                {doubts && (
                  <span className={data.solved ? s.solved : s.open}>
                    {data.solved ? "✓ Solved" : "Open doubt"}
                  </span>
                )}
                <h2>{data.title}</h2>
                <p className={s.content}>{data.content}</p>
                <div className={s.actions}>
                  <button
                    className={s.like}
                    disabled={busy}
                    aria-pressed={data.liked}
                    onClick={() => like(data)}
                  >
                    <Heart weight={data.liked ? "fill" : "regular"} size={19} />
                    {data.likes} appreciation{data.likes === 1 ? "" : "s"}
                  </button>
                  <span className={s.meta}>
                    {new Date(data.created_at).toLocaleDateString()}
                  </span>
                  {data.mine && (
                    <Button
                      small
                      variant="ghost"
                      onClick={() =>
                        setDeleting({ path: `${endpoint}/${data.id}` })
                      }
                    >
                      Delete {doubts ? "doubt" : "post"}
                    </Button>
                  )}
                </div>
              </article>
              <h2>
                {data.messages.length}{" "}
                {doubts
                  ? data.messages.length === 1
                    ? "answer"
                    : "answers"
                  : data.messages.length === 1
                    ? "reply"
                    : "replies"}
              </h2>
              {data.messages.map((message) => (
                <article
                  className={`${s.card} ${message.accepted ? s.accepted : ""}`}
                  key={message.id}
                >
                  <div className={s.postTop}>
                    <Author item={message} />
                    {message.accepted && (
                      <span className={s.solved}>
                        <CheckCircle size={17} />
                        Accepted solution
                      </span>
                    )}
                    {doubts && message.accepted && (
                      <span className={s.helperBadge}>Verified helper</span>
                    )}
                  </div>
                  <p className={s.content}>{message.content}</p>
                  <div className={s.actions}>
                    {doubts && data.mine && !message.mine && (
                      <Button
                        small
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          action(() =>
                            api.put(`${endpoint}/${data.id}/solution`, {
                              reply_id: message.accepted ? null : message.id,
                            }),
                          )
                        }
                      >
                        {message.accepted ? "Reopen doubt" : "Mark as solved"}
                      </Button>
                    )}
                    {message.mine && (
                      <Button
                        small
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          setDeleting({
                            reply: true,
                            path: `${endpoint}/replies/${message.id}`,
                          })
                        }
                      >
                        Delete reply
                      </Button>
                    )}
                    {doubts && (
                      <button
                        className={s.like}
                        aria-pressed={upvoted.has(message.id)}
                        onClick={() => {
                          const liked = !upvoted.has(message.id);
                          action(
                            () =>
                              api.put(
                                `${endpoint}/replies/${message.id}/upvote`,
                                { liked },
                              ),
                            () =>
                              setUpvoted((items) => {
                                const next = new Set(items);
                                liked
                                  ? next.add(message.id)
                                  : next.delete(message.id);
                                return next;
                              }),
                          );
                        }}
                      >
                        <ThumbsUp
                          size={16}
                          weight={upvoted.has(message.id) ? "fill" : "regular"}
                        />
                        {(message.upvotes || 0) +
                          (upvoted.has(message.id) ? 1 : 0)}{" "}
                        upvotes
                      </button>
                    )}
                    {doubts && message.accepted && (
                      <span className={s.xpReward}>
                        <Sparkle size={15} /> +25 XP solver bonus
                      </span>
                    )}
                  </div>
                </article>
              ))}
              <form
                className={`${s.card} ${s.form}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  action(
                    () =>
                      api.post(`${endpoint}/${selected}/replies`, {
                        content: reply,
                      }),
                    () => setReply(""),
                  );
                }}
              >
                <label>
                  {doubts
                    ? "Share an answer with your reasoning"
                    : "Join the conversation"}
                  <textarea
                    required
                    maxLength={5000}
                    value={reply}
                    disabled={busy}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  {busy ? "Posting…" : doubts ? "Post answer" : "Post reply"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {data.items.map((item) => (
                <article key={item.id} className={s.card}>
                  <div className={s.postTop}>
                    <Author item={item} />
                    <span className={s.tag}>{item.subject}</span>
                  </div>
                  <Link
                    className={s.postLink}
                    to={`${endpoint}?post=${item.id}`}
                  >
                    {doubts && (
                      <span className={item.solved ? s.solved : s.open}>
                        {item.solved ? "✓ Solved" : "Open doubt"}
                      </span>
                    )}
                    <h2>{item.title}</h2>
                    <p>
                      {item.content.slice(0, 230)}
                      {item.content.length > 230 ? "…" : ""}
                    </p>
                  </Link>
                  <div className={s.actions}>
                    <button
                      className={s.like}
                      disabled={busy}
                      aria-pressed={item.liked}
                      onClick={() => like(item)}
                    >
                      <Heart
                        size={18}
                        weight={item.liked ? "fill" : "regular"}
                      />
                      {item.likes}
                    </button>
                    <Link
                      className={s.replyLink}
                      to={`${endpoint}?post=${item.id}`}
                    >
                      <ChatCircle size={18} />
                      {item.replies}{" "}
                      {doubts
                        ? item.replies === 1
                          ? "answer"
                          : "answers"
                        : item.replies === 1
                          ? "reply"
                          : "replies"}
                    </Link>
                    <span className={s.meta}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))}
              {!data.items.length && (
                <div className={`${s.card} ${s.empty}`}>
                  <UsersThree size={40} />
                  <h2>
                    {search || subject || status !== "all"
                      ? "No matching posts yet."
                      : doubts
                        ? "A good question starts here."
                        : "Make the first connection."}
                  </h2>
                  <p>
                    {doubts
                      ? "Post your medical doubt or come back to help another student."
                      : "Share a medical insight, a resource, or a study experience."}
                  </p>
                </div>
              )}
              <div className={s.actions}>
                <Button
                  variant="secondary"
                  disabled={!offset || busy}
                  onClick={() => setOffset(Math.max(0, offset - 20))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data.has_more || busy}
                  onClick={() => setOffset(offset + 20)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
        <aside className={s.aside}>
          <XPLevel compact />
          <section className={s.card}>
            <span className={s.eyebrow}>A PLACE FOR EVERY STUDENT</span>
            <h2>
              {doubts
                ? "Think it through, together."
                : "Medical minds, shared ideas."}
            </h2>
            <p>
              {doubts
                ? "Include the concept, your reasoning, and where you got stuck. The person who asked can accept an answer and mark the doubt as solved."
                : "Share anything medical-related: learning resources, research discussions, college experiences, or a concept that finally clicked."}
            </p>
            <p>
              Open to guests and registered students. Cite sources for medical
              claims and leave patient identifiers out of posts.
            </p>
            <Link to="/students">Meet the students →</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
