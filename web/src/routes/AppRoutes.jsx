import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { PageSkeleton } from "../components/States";
import policies from "../../../shared/legal.json";
const Home = lazy(() => import("../pages/Home")),
  Learn = lazy(() => import("../pages/Learn")),
  MCQs = lazy(() => import("../pages/MCQs")),
  MedBytes = lazy(() => import("../pages/MedBytes")),
  ExamPrep = lazy(() => import("../pages/ExamPrep")),
  Clinical = lazy(() => import("../pages/Clinical")),
  StudyHub = lazy(() => import("../pages/StudyHub")),
  Toolbox = lazy(() => import("../pages/Toolbox")),
  Preferences = lazy(() => import("../pages/Preferences")),
  Captures = lazy(() => import("../pages/Captures")),
  Anatomy = lazy(() => import("../pages/Anatomy")),
  Account = lazy(() => import("../pages/Account")),
  Profile = lazy(() => import("../pages/Profile")),
  Notes = lazy(() => import("../pages/Notes")),
  Flashcards = lazy(() => import("../pages/Flashcards")),
  Community = lazy(() => import("../pages/Community")),
  Doubts = lazy(() => import("../pages/Doubts")),
  Students = lazy(() => import("../pages/Students")),
  Planner = lazy(() => import("../pages/Planner")),
  Progress = lazy(() => import("../pages/Progress")),
  Tutor = lazy(() => import("../pages/Tutor")),
  Lectures = lazy(() => import("../pages/Lectures")),
  Resources = lazy(() => import("../pages/Resources")),
  Legal = lazy(() => import("../pages/Legal")),
  About = lazy(() => import("../pages/About")),
  LegalCentre = lazy(() => import("../pages/LegalCentre")),
  NotFound = lazy(() => import("../pages/NotFound"));
function RouteEffects() {
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "open_study_section",
          description:
            "Navigate to an existing Med Purple study section. This does not submit answers or change learning records.",
          inputSchema: {
            type: "object",
            properties: {
              section: {
                type: "string",
                enum: ["home", "learn", "mcqs", "medbytes", "anatomy"],
              },
            },
            required: ["section"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input) => {
            const map = {
              home: "/",
              learn: "/learn",
              mcqs: "/mcqs",
              medbytes: "/medbytes",
              anatomy: "/anatomy",
            };
            if (
              !input ||
              !Object.hasOwn(map, input.section) ||
              Object.keys(input).length !== 1
            )
              throw Error("Unknown study section");
            navigate(map[input.section]);
            await new Promise((resolve) => requestAnimationFrame(resolve));
            return { route: map[input.section], action: "navigated" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [navigate]);
  return null;
}
export default function AppRoutes() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="login" element={<Account />} />
          <Route path="create-account" element={<Account register />} />
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Learn />} />
            <Route path="mcqs" element={<MCQs />} />
            <Route path="medbytes" element={<MedBytes />} />
            <Route path="exam-prep" element={<ExamPrep />} />
            <Route path="clinical" element={<Clinical />} />
            <Route path="study-tools" element={<StudyHub />} />
            <Route path="toolbox" element={<Toolbox />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="captures" element={<Captures />} />
            <Route path="anatomy" element={<Anatomy />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notes" element={<Notes />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="community" element={<Community />} />
            <Route path="doubts" element={<Doubts />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<Students />} />
            <Route path="planner" element={<Planner />} />
            <Route path="progress" element={<Progress />} />
            <Route path="tutor" element={<Tutor />} />
            <Route path="lectures" element={<Lectures />} />
            <Route path="resources" element={<Resources />} />
            <Route path="about" element={<About />} />
            <Route path="legal" element={<LegalCentre />} />
            {policies.pages.map((page) => (
              <Route
                key={page.key}
                path={page.path.slice(1)}
                element={<Legal policy={page.key} />}
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
