import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UserCircle, ShieldCheck, PencilSimple, X } from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import usePageMeta from "../hooks/usePageMeta";
import Button from "../components/Button";
import AvatarPortrait from "../components/AvatarPortrait";
import AvatarPicker from "../components/AvatarPicker";
import StudentProfileFields from "../components/StudentProfileFields";
import XPLevel from "../components/XPLevel";
import { profileValues } from "../utils/studentProfile";
import { defaultAvatarId } from "../../../shared/avatar-presets.js";
import { cropProfilePhoto, profilePhotoSrc } from "../utils/profilePhoto";
import useData from "../hooks/useData";
import a from "./Account.module.css";
import s from "./Library.module.css";
import u from "../components/ui.module.css";
export default function Profile() {
  usePageMeta("Profile");
  const [params] = useSearchParams();
  const { user, setUser, notify, changed, initialize } = useApp();
  const { data: featureState, reload: reloadFeatures } = useData("/features");
  const photoInput = useRef(null);
  const avatarDialog = useRef(null);
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [avatarBusy, setAvatarBusy] = useState(false),
    [avatarId, setAvatarId] = useState(defaultAvatarId(user.id)),
    [photoUrl, setPhotoUrl] = useState(null),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setForm(profileValues(user));
  }, [user]);
  useEffect(() => {
    if (!featureState) return;
    setAvatarId(featureState.preferences?.avatar_id || defaultAvatarId(user.id));
    setPhotoUrl(featureState.preferences?.avatar_photo_url || null);
  }, [featureState, user.id]);
  if (!form) return null;
  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await api.patch("/auth/me", form);
      setUser(updated);
      changed();
      notify("Your study space feels more like you.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAvatar() {
    setAvatarBusy(true);
    setError("");
    try {
      const current = await api.get("/features");
      await api.patch("/features", {
        preferences: { ...(current.preferences || {}), avatar_id: avatarId },
      });
      if (photoUrl) {
        await api.delete("/profiles/me/avatar");
        setPhotoUrl(null);
      }
      reloadFeatures();
      notify("Your profile avatar is ready.");
      avatarDialog.current?.close();
    } catch (e) {
      setError(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setError("");
    try {
      const data_url = await cropProfilePhoto(file);
      const result = await api.put("/profiles/me/avatar", { data_url });
      setPhotoUrl(result.avatar_photo_url);
      reloadFeatures();
      notify("Profile photo updated.");
      avatarDialog.current?.close();
    } catch (e) {
      setError(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }
  async function removePhoto() {
    setAvatarBusy(true);
    setError("");
    try {
      await api.delete("/profiles/me/avatar");
      setPhotoUrl(null);
      reloadFeatures();
      notify("Profile photo removed.");
      avatarDialog.current?.close();
    } catch (e) {
      setError(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      await initialize();
      notify("Signed out. You are in a fresh guest space.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api.delete("/auth/me");
      await api.clear();
      setConfirm(false);
      await initialize();
      notify("Your account and study records were deleted.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={u.pageHead}>
        <div>
          <h1>A space that’s yours.</h1>
          <p>Your goals, your pace, your next chapter.</p>
        </div>
        <span className={u.pill}>
          <UserCircle size={17} />
          {user.is_guest ? "Guest learner" : "Your account"}
        </span>
      </div>
      {error && (
        <p role="alert" className={s.error} style={{ marginBottom: 18 }}>
          {error}
        </p>
      )}
      {params.get("welcome") === "1" && !user.is_guest && (
        <p role="status" className={a.welcome}>
          You're all set. Your account is ready. Set your next exam and daily
          goal below.
        </p>
      )}
      <section className={a.profileHero} aria-label="Student profile summary">
        {photoUrl ? (
          <img className={a.profilePhoto} src={profilePhotoSrc(photoUrl)} alt={`${user.name}'s profile photo`} />
        ) : (
          <AvatarPortrait avatarId={avatarId} name={user.name} size={76} />
        )}
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.year}
            {user.college ? ` / ${user.college}` : ""}
          </p>
          <small>
            {user.is_guest ? "Guest student profile" : user.email}
            {user.graduation_year ? ` / Class of ${user.graduation_year}` : ""}
          </small>
        </div>
        <button
          type="button"
          className={a.editAvatarButton}
          aria-haspopup="dialog"
          aria-label="Edit your profile avatar"
          onClick={() => avatarDialog.current?.showModal()}
        >
          <PencilSimple size={16} aria-hidden="true" />
          Edit avatar
        </button>
      </section>
      <dialog
        ref={avatarDialog}
        className={a.avatarDialog}
        aria-labelledby="edit-avatar-title"
        onClick={(event) => {
          if (event.target === avatarDialog.current) avatarDialog.current.close();
        }}
      >
        <header className={a.avatarDialogHeader}>
          <h2 id="edit-avatar-title">Edit your avatar</h2>
          <button type="button" aria-label="Close avatar editor" onClick={() => avatarDialog.current?.close()}>
            <X size={21} />
          </button>
        </header>
        <div className={a.avatarDialogBody}>
          <section className={a.photoEditor} aria-label="Profile photo">
            {photoUrl ? (
              <img className={a.photoPreview} src={profilePhotoSrc(photoUrl)} alt="Current profile photo" />
            ) : (
              <AvatarPortrait avatarId={avatarId} name={user.name} size={52} interactive={false} />
            )}
            <div className={a.photoEditorCopy}>
              <strong>{photoUrl ? "Profile photo" : "Add a profile photo"}</strong>
              <span>{photoUrl ? "Your photo appears on your profile." : "Choose a photo or pick an illustrated avatar below."}</span>
            </div>
            <input
              ref={photoInput}
              className={a.photoInput}
              tabIndex={-1}
              aria-hidden="true"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadPhoto}
            />
            <Button small variant="secondary" disabled={avatarBusy} onClick={() => photoInput.current?.click()}>
              {photoUrl ? "Change photo" : "Add photo"}
            </Button>
            {photoUrl && (
              <Button small variant="ghost" disabled={avatarBusy} onClick={removePhoto}>
                Remove
              </Button>
            )}
          </section>
          {error && <p role="alert" className={s.error}>{error}</p>}
          <AvatarPicker
            value={avatarId}
            onChange={setAvatarId}
            saved={photoUrl ? null : featureState?.preferences?.avatar_id || defaultAvatarId(user.id)}
            onSave={saveAvatar}
            saving={avatarBusy}
            compact
          />
        </div>
      </dialog>
      <div style={{ marginBottom: 24 }}>
        <XPLevel />
        <p style={{ marginTop: 12 }}>
          <Link to={`/students/${user.id}`}>View your public profile</Link> ·{" "}
          <Link to="/students">Meet other students</Link>
        </p>
      </div>
      <div className={s.profileGrid}>
        <form className={`${u.card} ${s.form}`} onSubmit={save}>
          <h2>Your study profile</h2>
          <label>
            Name
            <input
              value={form.name}
              maxLength={80}
              required
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <StudentProfileFields form={form} onChange={field} />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save my profile"}
          </Button>
        </form>
        <div className={u.stack}>
          {user.is_guest ? (
            <section className={`${u.card} ${s.form}`}>
              <h2>Make this space yours.</h2>
              <p>
                Create an account to keep your guest progress and use the same
                study space on web and mobile.
              </p>
              <Button to="/create-account">Create account</Button>
              <Button to="/login" variant="secondary">
                Log in to an existing account
              </Button>
            </section>
          ) : (
            <section className={u.card}>
              <ShieldCheck size={30} color="var(--purple-600)" />
              <h2 style={{ marginTop: 15 }}>Your progress is connected.</h2>
              <p
                style={{
                  margin: "12px 0 24px",
                  fontSize: 14,
                  color: "var(--muted)",
                  overflowWrap: "anywhere",
                }}
              >
                {user.email}
              </p>
              <Button variant="secondary" disabled={busy} onClick={logout}>
                Sign out
              </Button>
            </section>
          )}
          <section className={u.card}>
            <h2>Data & privacy</h2>
            <p
              style={{ fontSize: 14, color: "var(--muted)", margin: "12px 0" }}
            >
              You control your profile and study history. Deleting your account
              permanently removes its saved records.
            </p>
            {confirm ? (
              <div className={s.danger}>
                <p>
                  Delete your {user.is_guest ? "guest space" : "account"} and
                  all study records? This cannot be undone.
                </p>
                <div className={u.row}>
                  <Button variant="danger" disabled={busy} onClick={remove}>
                    Delete permanently
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirm(true)}>
                Delete my {user.is_guest ? "guest data" : "account"}
              </Button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
