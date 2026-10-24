# Med Purple

An editable React/Vite + Expo + FastAPI study application, with MySQL as the main database and one shared visual system.

The four priority experiences are implemented on both platforms: **Home, MCQs, MedBytes, and 3D Anatomy**. The web app also includes **Exam prep**, **Clinical lab**, and expanded **Community** workflows. Guest use starts immediately; registration upgrades the same guest account without losing its study records. Both apps talk to the same REST API. There is no browser-only fake-data mode.

The web routes `/exam-prep` and `/clinical` provide exam-track selection, weak-area review, previous-year questions, rapid revision, mistake notes, image interpretation, virtual patients, differential diagnosis, viva practice, and clinical posting logs. Community adds study-room preferences, groups, follows, messages, helper badges, answer upvotes, and solver XP. `/study-tools`, `/toolbox`, `/preferences`, and `/captures` add timed custom study sets, clinical references/calculators, a customizable home-study preference layer, and a persistent quick-capture inbox.

## Start here: run the website on Windows

The recommended setup is **local MySQL plus a local Python backend**, plus **npm for the frontend**. Website edits update automatically. All commands in this section use PowerShell.

| Part     | Folder / service    | Address on this computer     |
| -------- | ------------------- | ---------------------------- |
| Frontend | `web/`            | http://localhost:4173        |
| Backend  | `backend/`        | http://localhost:8001/docs   |
| MySQL    | Local MySQL service | `127.0.0.1:3306`           |
| Mobile   | `mobile/`         | Optional; instructions below |

This computer uses backend port **8001** because port 8000 is occupied. MySQL uses its standard local port **3306**.

### Everyday startup (already configured on this computer)

1. Make sure your local MySQL service is running.
2. Open PowerShell and start the backend:

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

3. In a second terminal, start the frontend:

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test"
npm run web
```

4. Open **http://localhost:4173**. Keep the frontend terminal open.

The backend reads its MySQL connection from `backend/.env`. Apply schema changes with Alembic after pulling backend migrations. The latest migration adds persistent study stories, including their audiences, interactions, and highlights.

### Check that everything is running

In another PowerShell terminal in the project root:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

The backend should return `status: ok`. Backend API documentation is available at **http://localhost:8001/docs**.

### Troubleshooting

**“Request origin is not allowed.”** In development, the backend accepts `localhost` and private IPv4 LAN addresses on any port. This supports Vite's automatic port fallback (4174, 4175, etc.) and changing network addresses. Restart the backend after changing `ENVIRONMENT` or `CORS_ORIGINS`. Other hostnames and public addresses must be added as exact origins, including scheme and port. Production always requires explicitly configured origins.

```dotenv
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
```

**“Something went wrong” or a proxy connection error.** Check the backend health and logs above. Confirm `backend/.env` uses the correct MySQL `DATABASE_URL` and `web/.env.local` contains `API_PROXY_TARGET=http://127.0.0.1:8001`. A PowerShell `$env:API_PROXY_TARGET` overrides that file. Press Ctrl+C in the frontend terminal, set the variable to the correct address, and run `npm run web` again.

**Port already in use.** Vite automatically tries the next available port (4174, 4175, etc.). Open the URL printed in the frontend terminal. Development API requests from private LAN IPv4 addresses work on any Vite port. For backend port 8001 conflicts, stop the old backend before restarting.

## Local MySQL setup

This is the supported setup: **local MySQL + local Python backend + npm frontend**. The backend and frontend each need their own open terminal; MySQL runs as a Windows service.

### 1. Install the required software (once)

Install **Node.js 22 LTS with npm**, **Python 3.12**, and **MySQL Server 8.4**. MySQL Workbench is optional but convenient for running SQL. Workbench alone is not the database server.

During MySQL setup, configure the server as a Windows service and remember its administrator password and port (normally **3306**). Press **Win+R**, enter `services.msc`, find your MySQL service, and start it if necessary. Its service name depends on your installation.

Open PowerShell in the project root and install frontend dependencies:

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test"
npm ci
```

### 2. Create the local database and application user (once)

Connect to your local server as an administrator using MySQL Workbench or the MySQL command-line client. If the client is on PATH, run `mysql -u root -p` and enter your administrator password when prompted. Run this SQL in that MySQL session, replacing `YOUR_LOCAL_PASSWORD` with a password you choose:

```sql
CREATE DATABASE IF NOT EXISTS medpurple CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER IF NOT EXISTS 'medpurple'@'localhost' IDENTIFIED BY 'YOUR_LOCAL_PASSWORD';
GRANT ALL PRIVILEGES ON medpurple.* TO 'medpurple'@'localhost';
```

If this user already exists, use its existing password; `CREATE USER IF NOT EXISTS` does not change it.

### 3. Configure and prepare the backend (once)

In PowerShell:

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test\backend"
if (!(Test-Path .venv)) { py -3.12 -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

If the `py` launcher is unavailable, use `python -m venv .venv` after confirming `python --version` reports Python 3.12. This project already has a `.venv` on the current computer.

Edit **`backend/.env`**, keeping its other settings, and set:

```dotenv
DATABASE_URL=mysql+pymysql://medpurple:YOUR_LOCAL_PASSWORD@127.0.0.1:3306/medpurple?charset=utf8mb4
ENVIRONMENT=development
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
SEED_CONTENT=true
```

Replace the password with the one from step 2. URL-encode special characters in the password when placing it in this URL. Use your actual MySQL port if it is not 3306. Keep the existing `JWT_SECRET` entry from the example file for local development.

The local Python backend reads **`backend/.env`**, not the root `.env`. During development, a private LAN IP at port `4173` is accepted automatically; other hosts or ports must be listed in `CORS_ORIGINS`.

Still in the `backend` folder, create/update the database tables:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Run migrations again after pulling changes that add database migrations. Starter content is seeded when the backend starts with `SEED_CONTENT=true`.

### 4. Everyday startup: start MySQL, then two terminals

Ensure your local MySQL Windows service is running.

**Terminal 1 — backend:**

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Leave this terminal open. Calling the virtual environment's Python directly avoids PowerShell activation-policy issues.

**Terminal 2 — frontend:**

```powershell
cd "C:\Users\deepu\Downloads\Med Purple test"
$env:API_PROXY_TARGET = "http://127.0.0.1:8001"
npm run web
```

Leave this terminal open too. Open **http://localhost:4173**. Backend documentation is at **http://localhost:8001/docs**.

### 5. Check, stop, and troubleshoot the local setup

In another PowerShell terminal, check the backend:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

To stop the app, press **Ctrl+C** in each of the two running terminals. MySQL may remain running as a Windows service; stopping the terminals does not erase its data.

- **Database connection refused:** start the MySQL Windows service and check the port in `backend/.env`.
- **Access denied for MySQL user:** check the username, password, URL encoding, and database permissions from step 2.
- **Unknown database or missing tables:** create the database, then run `alembic upgrade head` using the command in step 3.
- **Request origin is not allowed:** in development, use `localhost` or a private LAN IPv4 address. Other hostnames or public addresses must be listed in `backend/.env`; production always requires explicitly configured origins.
- **Port 8001 already in use:** stop the previous backend before starting another. If you choose a different port, also update the frontend's `API_PROXY_TARGET` and restart it.

## Optional: Expo mobile app

From the project root:

```powershell
if (!(Test-Path mobile/.env)) { Copy-Item mobile/.env.example mobile/.env }
```

For a **physical phone**, replace `192.168.1.10` in `mobile/.env` with your computer’s LAN IPv4 address and change the port to **8001**. Both devices must share a reachable network and port 8001 must be allowed by your development firewall. `localhost` on a phone refers to the phone itself.

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8001/api/v1
EXPO_PUBLIC_MEDIA_URL=http://YOUR_COMPUTER_LAN_IP:8001
```

Start the database and backend first, then run `npm run mobile` from the project root. Find your computer's active Wi-Fi or Ethernet IPv4 address using `ipconfig`. For an Android emulator, explicitly use `http://10.0.2.2:8001/api/v1` and `http://10.0.2.2:8001` in the mobile environment file.

Without overrides, Android uses the emulator host bridge `10.0.2.2`; iOS Simulator uses `localhost`. Restart Metro after changing environment variables. The project pins **Expo SDK 54** and its compatible React Native versions. Use an SDK 54-compatible Expo Go build or create a development build with `npm run android -w mobile` / `npm run ios -w mobile`. iOS native builds require macOS and Xcode; Android requires Android Studio and a configured SDK. Use HTTPS endpoints for distributed builds.

Sign in to the same registered account on both platforms to share progress. Unregistered guest sessions are deliberately separate per device.

## Project map

```text
med-purple/
  mobile/
    App.jsx
    src/screens/             Separate screen files
    src/components/          Native cards, inputs, viewer, buttons
    src/navigation/          Tab and stack navigation
    src/theme/               Imports shared tokens
    assets/                  Native app icon and splash
  web/
    src/pages/               Separate route files
    src/components/          Web UI and viewer
    src/routes/              React Router route map
    src/theme/               Token adapter and base CSS
    public/                  Favicon, app icons, manifest
  backend/
    app/api/                 REST routers by capability
    app/models/              SQLAlchemy tables
    app/schemas/             Validated input/output contracts
    app/services/            Catalog seeding and study progress
    app/core/                Settings, database, security
    app/media/               Original videos, posters, captions
    alembic/versions/         Explicit initial schema migration
    tests/                   Authentication and study integration tests
  shared/
    design-tokens/            Colors, typography, spacing, motion JSON
    api-client/              Shared web/native REST transport
    anatomy/                 Shared Three.js heart geometry
    legal.json               Shared policy text
  scripts/generate_media.py   Editable video/brand-asset generator
  docs/                      Architecture, scope, QA, and launch notes
```

Use `npm run format` to format frontend source. Python source is formatted with Black. Edit a route or native screen independently; the screens are not embedded in one generated application file.

## What works

- **Home:** a medical study desk with question sprint, viva warm-up, and low-energy session choices; actual XP, streaks, daily progress, subject revision suggestions, focus timer on web, saved timetable, exam countdown, and shortcuts to mistakes and recall cards.
- **MCQs:** 12 original foundation questions, subject/topic/difficulty filters, shuffled five-question sets, persistent bookmarks, server-side scoring, explanations and source links, session summaries, and mistake review based on the most recent answer.
- **MedBytes:** three bundled 18-second silent teaching videos with on-screen captions and transcripts; subject/exam filters; continuous web and native feeds; one active clip; actual playback controls; per-day completion; pagination and collection replay; idempotent saves to notes or flashcards.
- **Anatomy:** original interactive schematic heart with six selectable structures, rotation, pinch/wheel zoom, keyboard and button controls on web, separated-chamber and vessel toggles, optional native motion controls, structure study persistence, and a recall exercise.
- **Accounts:** guest-first use, registration, login, profile editing, rotating refresh tokens, sign-out, and account deletion. Native refresh tokens use SecureStore; web refresh tokens use HTTP-only cookies. Access tokens remain in memory.
- **Saved material:** notes and flashcards can be authored, edited, searched, and deleted; flashcards support scheduled review.

The dashboard timetable now shows saved planner sessions for the student's local day. Progress starts at zero and reflects actual activity. The starter bank is intentionally small; daily targets can be adjusted in Profile.

## Study tools and game design

All navigable study sections have usable web and mobile screens. The design uses a warm paper canvas, dark purple navigation, lime session actions, and original medical desk artwork. Web includes keyboard tool search (Ctrl/Cmd K), a filterable revision toolkit, optional calm mode and larger text, and a focus timer that survives reloads. The native home shares the palette and session choices.

The interactive study lounge adds a configurable 3/5/10-question sprint by subject on web and native. Web Home includes a real one-question warm-up with server scoring, retry-safe submissions, and progress updates; an original tappable brain buddy; Lilac, Matcha, and Peach room palettes saved on the device; and a full-screen focus room with a saved intention, countdown ring, and 5/15/25-minute controls. Viva warm-up opens the web due-card review directly. Room palettes and focus intentions are device preferences, not cloud-synced account settings.

- **Planner:** create, edit, reschedule, complete, and delete saved sessions; see the real daily schedule on Home.
- **Notes:** create and edit personal notes, search by content or subject, and export a note on web. Web note starters provide headings for clinical topics, viva preparation, and mistake reviews without inserting medical advice or patient records.
- **Flashcards:** author cards, reveal answers, and save review dates using Again / Good / Easy ratings. Web includes a due-card review round.
- **Progress:** actual subject accuracy, a 14-day activity history, levels, and badges. First encounters earn XP; repeating the same video does not inflate it.
- **Study circle:** persistent discussions and replies with ownership checks and owner deletion. Empty communities are shown honestly without fabricated members or posts.
- **Study coach:** source-linked retrieval from the curated question and video library, plus study suggestions. It is not a generative AI service and requires no API key.
- **Video lessons and resources:** organized access to existing captioned animations and textbook references, plus a downloadable revision worksheet on web.
- **MedBytes:** paginated continuous scrolling with playback controls. The current three source clips repeat after the collection is exhausted; adding real Clip records and media expands the feed.

The bundled content remains a small medical foundation collection: 12 original questions, three short videos, and a schematic heart. Personal notes, flashcards and planner subjects can be used for other courses. There is no external lecture subscription, generative tutor, college calendar integration, or claim that this is a comprehensive curriculum.

Apply the new tables before starting the updated app: run `python -m alembic upgrade head` inside `backend/`.

## Validation

```bash
npm run build
npm run check:mobile
cd backend
python -m pytest -q
```

For populated web rendering checks using an isolated temporary database:

```powershell
cd backend
.venv/Scripts/python.exe -m tests.export_render_fixtures
cd ..
node scripts/check_web_render.mjs
```

These checks cover server rendering and navigation links, not browser interaction or visual device testing.

For browser layout and interaction checks, launch a separate headless Chrome profile with remote debugging on port 9224, generate the same isolated fixtures, then run `node scripts/check_design_browser.mjs` while the web dev server is running on port 4173. The script intercepts all API calls with the test fixtures. It checks 14 routes at four widths, session choices, search, mistake navigation, toolkit filters, note starters, focus controls, and narrow-screen larger text. Screenshots are written to `artifacts/design-review/`. Run this before the server-render script, which removes the fixture file after use. These checks do not replace physical native-device testing.

By default, API tests use a dedicated temporary SQLite database. For MySQL integration testing, first create an **empty disposable test database**, then run:

```bash
TEST_DATABASE_URL=mysql+pymysql://medpurple:medpurple@localhost:3306/medpurple_test python -m pytest -q
```

**The test fixture drops and recreates its configured test tables. Never point `TEST_DATABASE_URL` at a database containing data you need.** See `docs/VERIFICATION.md` for exactly what was and was not verified in this build environment.

## Build and deployment

`npm run build` produces `web/dist/`. Serve it behind the included Nginx configuration or an equivalent SPA fallback that proxies `/api` and `/media` to FastAPI. Do not serve `web/dist/` alone and expect study data to work. `npm run check:mobile` creates iOS and Android JavaScript/Hermes bundles, not signed store binaries.

Production settings enforce MySQL, a non-default signing secret, and secure cookies. Before a public launch, provide HTTPS, managed secrets, a real operator/privacy contact, reviewed educational content, password recovery/email verification, infrastructure rate limits, backups, monitoring, and device/browser QA. These operational prerequisites are documented in `docs/LAUNCH.md`; this delivery is not a claim of a completed public production launch.

### MCQ levels, retries, and XP quests

Web and native MCQs have three difficulty tiers: **Foundation, Applied, and Challenge**. Each tier is available immediately; difficulty tiers are separate from the student's overall XP level. Web offers 3/5/10-question sets or all matching questions. Small filtered banks use the actual available count.

Finish a set to see its score and the full answer key, including the student's choice, the correct answer, a brief explanation, and a source link. Any missed answers offer **Try again** for just those questions. **Retry full set** restores the original set, including after a missed-question round. A perfect round offers the next difficulty tier. Answers remain saved if completion fails; retrying completion is safe.

Progress is stored per account. New questions earn 10 XP and the first correct answer to each earns another 10 XP. One-time quests award 25 XP for finishing a set, 25 XP for a perfect set, 15 XP for correcting a previous mistake, and 30/50/75 XP for mastering 3 Foundation / 3 Applied / 2 Challenge questions. Every 100 total XP advances the existing learning level. Replaying completed quests does not award their bonus again, and later mistakes do not remove earned MCQ XP. Other study activities continue to contribute to the same overall XP total.

Timed **Exam mode** is available alongside instant-feedback **Practice mode** on web and mobile. It fixes the question set, defaults to 60 seconds per question and a 70% pass mark, saves answers without revealing correctness, and returns the score, pass/fail status, explanations, and sources only at submission or time-out. Exam sessions and answers persist server-side; account deletion removes them. Passing earns a larger exam XP bonus than failing, with daily XP limits and idempotent completion.

The Kenhub-inspired roadmap is incremental. Not implemented yet: adaptive spaced-repetition sessions, clinical-vignette/identification/fact quiz formats, image spotters and practical stations, integrated topic hubs, exam tags and performance-gated levels, hidden-label atlas self-testing, offline daily quiz, free-first starter packs, trusted reviewer labels, shareable score cards/result-of-the-week, friend challenges, group exams, and doubts pinned to diagram structures. The current bank is a small set of plain MCQs and the anatomy atlas is a schematic heart, so several of these also need reviewed content and image assets.

Migration `b820df61a104` adds verified practice-set completion records. Migration `d14e6b9a3c21` adds persisted timed exam sessions. Neither migration has been applied to other environments automatically; run `python -m alembic upgrade head` in `backend/` before using Exam mode.

Verification: backend tests include scoring, completion retries, account isolation/deletion, tier quests, and replay reward limits. `scripts/run_mcq_test_api.py` starts a temporary SQLite API on port 8002. With that API, Vite on 4173, and a dedicated headless Chrome debug session on 9224, run `node scripts/check_mcq_browser.mjs`. It redirects every browser API call to the temporary database and checks the full retry/level-up flow plus layouts at 320, 390, 768, and 1440 pixels. Screenshots are saved in `artifacts/design-review/`. Native verification exports Android and iOS bundles; physical device interaction testing remains separate.

### App-wide XP, community, doubts, and student profiles

All learning sections now use one persisted XP ledger and the same level (`1 + total XP / 100`, rounded down). The web header shows the current level and updates after activities. Web and native profiles show total XP and the next-level bar. **Progress & rewards** lists reward rules, daily limits, recent XP events, and XP earned across the app in the activity chart. Existing MCQ/video/anatomy/flashcard rewards are retained without double counting. Deleting notes, cards, or posts does not remove earned XP; deleting the account removes its XP history.

XP is awarded for MCQs and quests, MedBytes/video lessons, anatomy study and recall, note/card creation and revision, first and later-day flashcard reviews, planner creation/completion, textbook resource opens, study-coach searches with results, question bookmarks, daily goal completion, profile setup, and completed web focus timers. The server validates library items and ownership, deduplicates reward keys, caps repeatable contributions per local day, and verifies elapsed time for focus sessions. Timer rewards require a server-created session of at least five minutes. Page navigation and settings changes do not award XP.

**Community** (`/community`) supports medical-related text posts, subject/search filters, replies, appreciations, pagination, and owner deletion. **Doubts** (`/doubts`) is a separate feed with open/solved filters. Students can post answers with reasoning; only the asker can accept another student's answer or reopen a doubt. Accepted answers show a solution badge and award the helper XP once per doubt. Deleting an accepted answer reopens the doubt. Guest sessions can participate, and both feeds are readable without authentication through the API. The apps bootstrap a guest session automatically.

**Study stories** (`/community`) appear in the home story bar, can be filtered by subject, and support unseen-first ordering, audience controls, drafts/scheduling, highlights, and configurable expiry. Stories contain slides with quiz, poll, question, doubt, countdown, progress, or streak stickers; viewers can respond, save text as notes/flashcards, and navigate slides. Owners can see per-slide views and response breakdowns, report handling can escalate incorrect medical content, and expired stories are hidden while their records are retained. Story posting, responses, reactions, creator streaks, and featured stories feed the shared XP ledger. Media uploads are private, capped at 10 MB for images and 30 MB for video, and limited to 20 per user per hour.

The current composer creates one slide and one sticker per story, though the API accepts multiple slides and stickers. Saving a story does not yet attach its media to notes. Trusted senior/doctor verification, birthday milestones, multi-author group editing, and a mobile drawing canvas are not implemented; group stories currently share an audience rather than editing one story together.

**Students** (`/students`) provides name search and public profile pages linked from post/reply authors. Public profiles expose only name, course year, XP/level, and contribution counts; email, location, exam details, notes, and other private records are omitted. Registered students and guest contributors appear in the directory; each user can also see their own profile. Native Community has links to Doubts and Students, and the revision toolkit links to Doubts.

The web Community dashboard also persists the student's selected study room, followed study buddies, and community preferences. Doubt answers support persisted upvotes in addition to accepted-answer marking, helper badges, and the existing solver XP reward.

Migration `c951ab20e315` adds XP events, focus sessions, post appreciations, and doubt/solution fields. It has been applied to this computer's local MySQL database. Other environments must run `python -m alembic upgrade head` from `backend/` before starting the updated backend.

Migration `b47de291a6c0` aligns stories with the slide-view, per-sticker response, upload ownership/rate-limit, moderation, and retained-expiry design. Run `python -m alembic upgrade head` from `backend/` before using the latest Stories API.

Verification: `python -m pytest -q`, `npm run build`, and `npm run check:mobile`. With the isolated API from `scripts/run_mcq_test_api.py`, Vite on 4173, and headless Chrome debugging on 9224, `node scripts/check_social_browser.mjs` checks a two-student post/reply/appreciation/doubt/accepted-answer flow, public and private profiles, shared XP, student search, and layouts at 320/390/768/1440 pixels. `node scripts/check_mcq_browser.mjs` verifies the earlier MCQ retry and quest flow against the same isolated API. Neither browser test posts to the local MySQL database. Native bundles are verified; physical-device interaction testing remains separate.

### Persisted exam, clinical, creator, and productivity features

`/api/v1/features` stores the signed-in user's exam track, mistake-notebook notes, clinical logs and practice state, community preferences, and followed MedBytes creators. MedBytes save-for-later items use the existing `saved_items` table with `kind=later`; the clip feed exposes `saved_later` and supports removing the saved item. Doubt answer upvotes use the `discussion_reply_likes` table.

Migration `e2f4a7c9b118` creates the feature-state and discussion-reply-upvote tables. It has been applied to this computer's configured local MySQL database. Other environments must run the following from `backend/` before starting the updated API:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Exam notes, clinical logs, saved-for-later clips, creator follows, community preferences, and answer upvotes now survive reloads and sign-in on the same account. Live room presence now uses a WebSocket connection; cross-user chat delivery and synchronized shared timers still need their full message/timer protocol.

Quick Capture supports note, textbook photo, voice transcript, and link captures from any screen. Captures autosave as drafts on the current device, are stored in the account inbox, can be filtered and converted into notes, and are soft-deleted to trash. Custom study sets and recent timed sessions are stored through `/api/v1/study-sets` and `/api/v1/study-history`. Notes, flashcards, and planner pages include browser Print / Save as PDF actions.

Study tools can also generate an editable seven-day planner from focus subjects. Community composers autosave unfinished drafts, the first signed-in visit offers a skip-friendly tour, and the community surface includes personal topic requests and quick-poll choices.

Migration `f1a6c8d0e442` creates quick captures, custom study sets, recent-study history, and persisted personalization preferences. It has been applied to this computer's configured local MySQL database. Other environments must run `python -m alembic upgrade head` from `backend/` before starting the updated API.

## Content and assets

The question wording, explanatory animations, icons, and schematic model were authored for this project. The anatomy model is explicitly simplified and not to scale; it omits valves and coronary detail. OpenStax source links support further study. See `docs/CONTENT.md` and `THIRD_PARTY_NOTICES.md`.

To regenerate the bundled media, install Pillow and ffmpeg, then run `python scripts/generate_media.py`. Rebuilding video is optional; the MP4, WebP, and VTT files are already included.

### MedBytes reel viewer

Web MedBytes now displays one mounted video at a time. Swipe vertically, use the previous/next buttons, scroll the mouse wheel over the player, or focus the feed and use the up/down arrow keys. Subject and exam filters, transcripts, daily completion, save-for-later, creator follows, and two-question recall checks are retained. Native paging uses the measured list height. The study launchpad and revision toolkit have pointer-responsive depth; Calm mode and reduced-motion preferences suppress tilt.

For isolated browser verification, export the existing render fixtures and run `node scripts/check_reels_browser.mjs` with Vite on port 4173 and a dedicated headless Chrome debug session on port 9224. Screenshots go to `artifacts/design-review/`.

### Login, signup, and student profiles

Open `/login` or `/create-account` for the dedicated account pages. Both are linked from the guest sidebar and Profile; guest learning remains available. Signup has two steps: name/email/password, then an editable student profile. Medical college, university, expected graduation year, specialty interests, and city/country are optional. Profile also includes course/year, timezone, exam milestone/date, and daily question target. Registering upgrades the current guest account and retains its records; logging in opens the existing account without merging guest records. Native Login and Create account screens are available from Profile.

Migration `91cf0268b301` adds the optional student fields and has been applied to this computer's local database. Other environments must run `python -m alembic upgrade head` inside `backend/` before running the updated API.

Validation: `python -m pytest tests -q` from `backend/`; `npm run build`; `npm run check:mobile`. For isolated browser auth-flow and responsive checks, export render fixtures, use a dedicated Chrome debug session on port 9224, and run `node scripts/check_accounts_browser.mjs`. Browser checks mock API responses; backend integration tests separately verify persistence, guest identity/notes preservation, profile validation, login, refresh, and duplicate emails.

Startup opens Login for guest/signed-out users on web and native. Signed-in users go to the study desk. On web, Continue as a guest enables the desk for the current page session; reloading the app presents Login again.

## Human body atlas

The web Anatomy page now opens a layered atlas with 2,491 named mesh parts: bones, muscles, joints/ligaments, blood vessels, lymphatic structures, brain/nerves, organs, skin and fascia. Layers load on demand. Search, select, hide, isolate, zoom to selection and rotate the body; related Wikipedia reference details require internet access. Organ studies retains the schematic organ viewer. Tissues & histology includes original teaching diagrams and notes, not microscope slides.

This is adult male reference anatomy, with simplified source geometry; coverage does not represent every anatomical variation. Model attribution and licences are shipped in web/public/atlas. All atlas assets are local to the web build. The mobile app retains its existing anatomy screen. Run node scripts/verify_atlas.cjs to check public meshes and node scripts/build_bodyparts.cjs to rebuild the supplemental BodyParts3D layers from the retained source archive and tables.
