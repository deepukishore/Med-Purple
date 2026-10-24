import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeSlash,
  GraduationCap,
  Stack,
  Cube,
  ShieldCheck,
} from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import usePageMeta from "../hooks/usePageMeta";
import Logo from "../components/Logo";
import Button from "../components/Button";
import DepthCard from "../components/DepthCard";
import StudentProfileFields from "../components/StudentProfileFields";
import { PageSkeleton, ErrorState } from "../components/States";
import { profileValues } from "../utils/studentProfile";
import s from "./Account.module.css";
import f from "./Library.module.css";

function AccountForm({ register }) {
  const { user, setUser, changed, notify, setGuestAccess } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  const [credentials, setCredentials] = useState({
    name: user.name === "Student" ? "" : user.name,
    email: "",
    password: "",
    confirm: "",
  });
  const [profile, setProfile] = useState(() => ({
    ...profileValues(user),
    location: user.location === "Your study space" ? "" : user.location,
  }));
  const field = (key, value) =>
    setCredentials((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (
      register &&
      (!credentials.name.trim() || credentials.password !== credentials.confirm)
    ) {
      setError(
        !credentials.name.trim()
          ? "Enter your name."
          : "Your passwords do not match.",
      );
      return;
    }
    if (register && step === 1) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const updated = register
        ? await api.register({
            name: credentials.name.trim(),
            email: credentials.email.trim(),
            password: credentials.password,
            profile: { ...profile, name: credentials.name.trim() },
          })
        : await api.login(credentials.email.trim(), credentials.password);
      setUser(updated);
      changed();
      notify(
        register
          ? "Account created. Your guest progress came with you."
          : "Welcome back. Your study space is ready.",
      );
      navigate(register ? "/profile?welcome=1" : "/", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.formPanel}>
      <div className={s.switcher}>
        <Link to="/login" aria-current={!register ? "page" : undefined}>
          Log in
        </Link>
        <Link to="/create-account" aria-current={register ? "page" : undefined}>
          Create account
        </Link>
      </div>
      <p className={s.eyebrow}>
        {register
          ? `STEP ${step} OF 2 / ${step === 1 ? "YOUR ACCOUNT" : "YOUR STUDENT PROFILE"}`
          : "YOUR NEXT CHAPTER STARTS HERE"}
      </p>
      <h1>
        {register
          ? step === 1
            ? "Make yourself at home."
            : "Tell us about your journey."
          : "Good to see you again."}
      </h1>
      <p className={s.intro}>
        {register
          ? step === 1
            ? "One account for your notes, recall cards, and little wins."
            : "Start with your course. You can add or change the rest anytime in Profile."
          : "Pick up where you left off. Your study desk is waiting."}
      </p>
      <form className={f.form} onSubmit={submit}>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className={s.fields}>
          {step === 1 ? (
            <>
              {register && (
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    value={credentials.name}
                    onChange={(e) => field("name", e.target.value)}
                    required
                    maxLength={80}
                    placeholder="What should we call you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={credentials.email}
                  onChange={(e) => field("email", e.target.value)}
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <div className={s.password}>
                  <input
                    type={show ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    value={credentials.password}
                    onChange={(e) => field("password", e.target.value)}
                    required
                    minLength={register ? 10 : 1}
                    maxLength={128}
                    aria-describedby={register ? "password-help" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                  >
                    {show ? <EyeSlash size={21} /> : <Eye size={21} />}
                  </button>
                </div>
              </label>
              {register && (
                <>
                  <small id="password-help">Use at least 10 characters.</small>
                  <label>
                    Confirm password
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={credentials.confirm}
                      onChange={(e) => field("confirm", e.target.value)}
                      required
                      maxLength={128}
                    />
                  </label>
                </>
              )}
            </>
          ) : (
            <StudentProfileFields
              form={profile}
              onChange={(key, value) =>
                setProfile((old) => ({ ...old, [key]: value }))
              }
              goals={false}
            />
          )}
        </fieldset>
        {register && step === 2 && (
          <small>
            By creating your account, you agree to the{" "}
            <Link to="/terms" target="_blank">
              Terms
            </Link>{" "}
            and acknowledge the{" "}
            <Link to="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </small>
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : register
              ? step === 1
                ? "Continue to student profile"
                : "Create my account"
              : "Log in"}
          <ArrowRight size={19} />
        </Button>
        {step === 2 && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setStep(1);
              setError("");
            }}
          >
            <ArrowLeft size={17} /> Back to account details
          </Button>
        )}
      </form>
      <p className={s.guestNote}>
        {register
          ? "Creating an account keeps the progress from your current guest space."
          : "Logging in opens your existing account. Current guest progress stays separate."}
      </p>
      <Link className={s.guestLink} to="/" onClick={() => setGuestAccess(true)}>
        Continue as a guest <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export default function Account({ register = false }) {
  usePageMeta(register ? "Create account" : "Log in");
  const { user, loading, error, initialize, setGuestAccess } = useApp();
  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link
          to="/"
          onClick={() => setGuestAccess(true)}
          aria-label="Med Purple home"
        >
          <Logo />
        </Link>
        <Link to="/" onClick={() => setGuestAccess(true)}>
          Back to study desk <ArrowRight size={17} />
        </Link>
      </header>
      <div className={s.layout}>
        <aside className={s.story}>
          <p className={s.eyebrow}>FOR THE DOCTOR YOU'RE BECOMING</p>
          <h2>
            Big dreams.
            <br />
            Small steps.
            <br />
            <em>Your space.</em>
          </h2>
          <p>
            From your first anatomy lecture to your next clinical posting. Keep
            your learning life together.
          </p>
          <DepthCard className={s.studentCard}>
            <div className={s.cardTop}>
              <GraduationCap size={32} weight="duotone" />
              <span>MED PURPLE / STUDENT PASS</span>
            </div>
            <strong>Your next chapter</strong>
            <p>A little more curious. A little more confident.</p>
            <div className={s.cardBottom}>
              <span>LEARN · RECALL · GROW</span>
              <span>✦</span>
            </div>
          </DepthCard>
          <div className={s.features}>
            <span>
              <Stack size={21} /> Notes & recall cards
            </span>
            <span>
              <Cube size={21} /> Interactive anatomy
            </span>
            <span>
              <ShieldCheck size={21} /> Progress across devices
            </span>
          </div>
        </aside>
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={initialize} />
        ) : !user.is_guest ? (
          <Navigate to={register ? "/profile?welcome=1" : "/"} replace />
        ) : (
          <AccountForm
            key={register ? "register" : "login"}
            register={register}
          />
        )}
      </div>
      <footer className={s.footer}>
        <span>A little progress, every day.</span>
        <Link to="/about">About</Link>
        <Link to="/legal">Legal centre</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </footer>
    </main>
  );
}
