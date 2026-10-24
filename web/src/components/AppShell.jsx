import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, Link, Navigate, useLocation } from "react-router-dom";
import {
  House,
  Books,
  PlayCircle,
  UsersThree,
  CalendarDots,
  ChartBar,
  FirstAidKit,
  List,
  X,
  Moon,
  ChatsCircle,
  Info,
  Target,
  Stethoscope,
  Toolbox,
  ListChecks,
  Note,
} from "@phosphor-icons/react";
import Logo from "./Logo";
import StudySearch from "./StudySearch";
import RoomVibes from "./RoomVibes";
import HelpBot from "./HelpBot";
import QuickCapture from "./QuickCapture";
import GuidedTour from "./GuidedTour";
import { XPBadge } from "./XPLevel";
import { useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import { PageSkeleton, ErrorState } from "./States";
import s from "./AppShell.module.css";
import policies from "../../../shared/legal.json";
const publicPaths = [
  "/anatomy",
  "/about",
  "/legal",
  ...policies.pages.map((page) => page.path),
];
const links = [
  ["/", "Study desk", House],
  ["/learn", "Revision toolkit", Books],
  ["/medbytes", "MedBytes", PlayCircle],
  ["/exam-prep", "Exam prep", Target],
  ["/clinical", "Clinical lab", Stethoscope],
  ["/study-tools", "Study tools", ListChecks],
  ["/toolbox", "Reference toolbox", Toolbox],
  ["/captures", "Capture inbox", Note],
  ["/planner", "Study planner", CalendarDots],
  ["/progress", "Progress & rewards", ChartBar],
  ["/tutor", "Study coach", ChatsCircle],
  ["/community", "Community", UsersThree],
  ["/doubts", "Doubts", ChatsCircle],
  ["/resources", "Resources", FirstAidKit],
  ["/profile", "My profile", UsersThree],
];
const translations = {
  "हिन्दी": { "Study desk": "अध्ययन डेस्क", "Revision toolkit": "रिविज़न टूलकिट", MedBytes: "मेडबाइट्स", "Study planner": "अध्ययन प्लानर", "Progress & rewards": "प्रगति और पुरस्कार", Community: "समुदाय", Doubts: "सवाल", "Reference toolbox": "संदर्भ टूलबॉक्स", "My profile": "मेरी प्रोफ़ाइल", "Study tools": "अध्ययन टूल्स", "Capture inbox": "कैप्चर इनबॉक्स" },
  "বাংলা": { "Study desk": "স্টাডি ডেস্ক", "Revision toolkit": "রিভিশন টুলকিট", Community: "কমিউনিটি", Doubts: "প্রশ্ন", "My profile": "আমার প্রোফাইল" },
  "தமிழ்": { "Study desk": "படிப்பு மேசை", "Revision toolkit": "மறுபயிற்சி கருவிகள்", Community: "சமூகம்", Doubts: "சந்தேகங்கள்", "My profile": "என் சுயவிவரம்" },
};
export default function AppShell() {
  const { user, loading, error, initialize, guestAccess } = useApp();
  const { data: featureState } = useData("/features");
  const translate = (label) => translations[featureState?.preferences?.language]?.[label] || label;
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const closeButton = useRef(null);
  useEffect(() => {
    if (menu) closeButton.current?.focus();
  }, [menu]);
  useEffect(() => {
    const query = matchMedia("(min-width: 761px)");
    const close = () => {
      if (query.matches) setMenu(false);
    };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);
  const [calm, setCalm] = useState(() => {
    try {
      return localStorage.getItem("mp:calm") === "true";
    } catch {
      return false;
    }
  });
  const [large, setLarge] = useState(() => {
    try {
      return localStorage.getItem("mp:large") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
    document.documentElement.dataset.largeText = String(large);
    try {
      localStorage.setItem("mp:calm", String(calm));
      localStorage.setItem("mp:large", String(large));
    } catch {}
  }, [calm, large]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  if (
    pathname === "/" &&
    !loading &&
    !error &&
    user?.is_guest &&
    !guestAccess
  ) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className={s.shell}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside
        className={`${s.sidebar} ${menu ? s.open : ""}`}
        id="study-navigation"
      >
        <div className={s.brand}>
          <Logo inverse />
          <button
            className={s.close}
            ref={closeButton}
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={22} />
          </button>
        </div>
        <p className={s.navLabel}>THE MED-SCHOOL COMPANION</p>
        <nav aria-label="Main navigation">
          {links.map(([to, title, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${s.link} ${isActive ? s.active : ""}`
              }
            >
              <Icon size={22} weight="duotone" />
              {translate(title)}
            </NavLink>
          ))}
        </nav>
        <div className={s.sidebarFoot}>
          <nav aria-label="About Med Purple">
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `${s.link} ${isActive ? s.active : ""}`
              }
            >
              <Info size={22} weight="duotone" />
              About Med Purple
            </NavLink>
          </nav>
          <RoomVibes />
          {user?.is_guest && (
            <div className={s.accountLinks}>
              <Link to="/login">Log in</Link>
              <Link to="/create-account">Create account</Link>
            </div>
          )}
          <Link to="/profile" className={s.profile}>
            <span className={s.avatar}>{user?.name?.[0] || "M"}</span>
            <div>
              <strong>{user?.name || "Student"}</strong>
              <small>
                {user?.is_guest
                  ? "Guest explorer · Save account"
                  : "My study profile"}
              </small>
            </div>
          </Link>
        </div>
      </aside>
      {menu && (
        <button
          className={s.backdrop}
          aria-label="Close navigation overlay"
          onClick={() => setMenu(false)}
        />
      )}
      {!menu && <HelpBot />}
      <div className={s.mainWrap} inert={menu || undefined}>
        <QuickCapture />
        {!user?.is_guest && <GuidedTour />}
        <header className={s.topbar}>
          <button
            className={s.menuButton}
            aria-label="Open navigation"
            aria-expanded={menu}
            aria-controls="study-navigation"
            onClick={() => setMenu(!menu)}
          >
            <List size={24} />
          </button>
          <span className={s.breadcrumb}>
            MED PURPLE <span>/</span>{" "}
            <b>
              {translate(links.find((x) => x[0] === pathname)?.[1] ||
                pathname.slice(1).replaceAll("-", " ") ||
                "Study desk")}
            </b>
          </span>
          <div className={s.topRight}>
            {user && !loading && <XPBadge />}
            <StudySearch />
            <button
              onClick={() => setCalm(!calm)}
              aria-pressed={calm}
              aria-label={calm ? "Calm mode on" : "Calm mode"}
              className={s.preference}
            >
              <Moon size={17} />
              <span>{calm ? "Calm mode on" : "Calm mode"}</span>
            </button>
            <button
              className={s.preference}
              onClick={() => setLarge(!large)}
              aria-label="Larger text"
              aria-pressed={large}
            >
              Aa
            </button>
            <Link to="/profile" className={s.avatar} aria-label="Open profile">
              {user?.name?.[0] || "M"}
            </Link>
          </div>
        </header>
        <main id="content" className={s.main}>
          {publicPaths.includes(pathname.replace(/\/$/, "")) ? (
            <Outlet />
          ) : loading ? (
            <PageSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={initialize} />
          ) : (
            <div key={user?.id}>
              <Outlet />
            </div>
          )}
          <footer className={s.footer}>
            <span>
              Made for curious minds. © {new Date().getFullYear()} Med Purple
            </span>
            <Link to="/about">About</Link>
            <Link to="/legal">Legal centre</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </footer>
        </main>
      </div>
      <nav
        className={s.bottomNav}
        aria-label="Mobile shortcuts"
        inert={menu || undefined}
      >
        {links.slice(0, 4).map(([to, title, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => (isActive ? s.tabActive : "")}
          >
            <Icon size={23} />
            <span>
              {title === "Revision toolkit"
                ? "Learn"
                : title === "Study planner"
                  ? "Planner"
                : translate(title)}
            </span>
          </NavLink>
        ))}
        <button onClick={() => setMenu(!menu)} aria-expanded={menu}>
          <List size={23} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
