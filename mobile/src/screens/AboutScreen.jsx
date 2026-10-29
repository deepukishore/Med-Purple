import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Screen from "../components/Screen";
import Button from "../components/Button";
import DepthCard from "../components/DepthCard";
import HeartViewer from "../components/HeartViewer";
import { colors, fonts, styles as s } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";
import content from "../../../shared/legal.json";

const chapters = [
  { title: "Start with a question.", label: "PRACTISE", chamber: "ra", path: "MCQs" },
  { title: "See how the pieces connect.", label: "EXPLORE", chamber: "rv", path: "Anatomy" },
  { title: "Find a study rhythm that fits.", label: "MAKE IT YOURS", chamber: "lv", path: "Planner" },
];
const chambers = [
  ["ra", "Right atrium"],
  ["rv", "Right ventricle"],
  ["la", "Left atrium"],
  ["lv", "Left ventricle"],
];
const introStories = [
  {
    id: "purpose",
    label: "Med Purple",
    eyebrow: "OUR PURPOSE",
    title: content.about.title,
    body: content.about.mission,
  },
  ...content.about.people.map(({ name, role, bio }) => ({
    id: name,
    label: name,
    eyebrow: role,
    title: name,
    body: bio,
  })),
];

export default function AboutScreen({ navigation }) {
  const model = useRef(null);
  const stageY = useRef(0);
  const stageHeight = useRef(1);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState("ra");
  const [activeIntro, setActiveIntro] = useState(0);
  const introSpin = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const onScroll = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.y;
    const viewport = Dimensions.get("window").height;
    const travel = stageHeight.current + viewport;
    const progress = Math.max(0, Math.min(1, (offset - stageY.current + viewport) / travel));
    model.current?.pose?.(progress);
    const next = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    setActive((value) => value === next ? value : next);
    setSelected((value) => value === chapters[next].chamber ? value : chapters[next].chamber);
  }, []);
  const selectIntro = (index) => {
    setActiveIntro(index);
    Haptics.selectionAsync().catch(() => {});
    if (reducedMotion) return;
    introSpin.stopAnimation();
    introSpin.setValue(0);
    Animated.timing(introSpin, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) introSpin.setValue(0);
    });
  };
  const introRotation = introSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  useEffect(() => {
    if (!reducedMotion) return;
    introSpin.stopAnimation();
    introSpin.setValue(0);
  }, [introSpin, reducedMotion]);

  return (
    <Screen onScroll={onScroll}>
      <DepthCard style={a.hero}>
        <View style={a.heroOrbLarge} />
        <View style={a.heroOrbSmall} />
        <Text style={a.kicker}>ABOUT MED PURPLE</Text>
        <Text style={a.heroTitle}>{content.about.title}</Text>
        <Text style={a.heroCopy}>{content.about.intro}</Text>
        <Button title="Explore the study tools" variant="accent" onPress={() => navigation.navigate("Learn")} />
        <Text style={a.heroFoot}>BUILT FOR REAL MED-SCHOOL DAYS</Text>
        <View style={a.introModule}>
          <View style={a.introStage}>
            <View style={[a.introOrbit, a.introOrbitWide]} />
            <View style={[a.introOrbit, a.introOrbitTall]} />
            <Animated.View
              style={[
                a.introCore,
                { transform: [{ perspective: 900 }, { rotateY: introRotation }] },
              ]}
            >
              <Text style={a.introCoreLabel}>{introStories[activeIntro].label}</Text>
              <Text style={a.introCoreHint}>{introStories[activeIntro].eyebrow}</Text>
            </Animated.View>
          </View>
          <View style={a.introChoices} accessibilityRole="tablist" accessibilityLabel="Explore Med Purple and the co-founders">
            {introStories.map((story, index) => (
              <Pressable
                key={story.id}
                accessibilityRole="tab"
                accessibilityLabel={`${story.label}, ${story.eyebrow}`}
                accessibilityState={{ selected: activeIntro === index }}
                onPress={() => selectIntro(index)}
                style={[a.introChoice, activeIntro === index && a.introChoiceActive]}
              >
                <Text style={[a.introChoiceText, activeIntro === index && a.introChoiceTextActive]}>
                  {story.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={a.introReveal} accessibilityLiveRegion="polite">
            <Text style={a.introRevealEyebrow}>{introStories[activeIntro].eyebrow}</Text>
            <Text style={a.introRevealTitle}>{introStories[activeIntro].title}</Text>
            <Text style={a.introRevealBody}>{introStories[activeIntro].body}</Text>
          </View>
        </View>
      </DepthCard>

      <View style={a.mission}>
        <Text style={a.sectionLabel}>OUR PURPOSE</Text>
        <Text style={s.heading}>A little less scattered. A lot more understood.</Text>
        <Text style={s.body}>{content.about.mission}</Text>
      </View>

      <View style={a.challenge}>
        <Text style={a.sectionLabel}>THE LEARNING REALITY</Text>
        <Text style={s.heading}>One subject can ask you to think in several ways.</Text>
        <Text style={s.small}>
          Move between structures, mechanisms, questions, and the details you want to remember later. Med Purple brings practical study tools into one place so your next step is easier to find.
        </Text>
        <View style={a.challengeSteps}>
          {[
            ["01", "See it", "Explore anatomy", "Anatomy", "cube-outline"],
            ["02", "Test it", "Try a question", "MCQs", "checkmark-done-outline"],
            ["03", "Keep it", "Save a prompt", "Flashcards", "albums-outline"],
          ].map(([number, title, detail, route, icon]) => (
            <Pressable
              key={number}
              accessibilityRole="button"
              onPress={() => navigation.navigate(route)}
              style={a.challengeStep}
            >
              <View style={a.challengeStepTop}>
                <Text style={a.challengeNumber}>{number}</Text>
                <Ionicons name={icon} size={17} color="#d7f19d" />
              </View>
              <Text style={a.challengeTitle}>{title}</Text>
              <Text style={a.challengeDetail}>{detail}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        style={a.scene}
        onLayout={(event) => {
          stageY.current = event.nativeEvent.layout.y;
          stageHeight.current = event.nativeEvent.layout.height;
        }}
      >
        <View style={a.sceneTop}>
          <View style={{ flex: 1 }}>
            <Text style={a.sceneLabel}>SCROLL THROUGH THE STUDY FLOW</Text>
            <Text style={a.sceneTitle}>{chapters[active].title}</Text>
          </View>
          <Text style={a.sceneStep}>{active + 1} / 3</Text>
        </View>
        <View style={a.modelStage}>
          <View style={a.modelGlow} />
          <View style={a.modelRing} />
          <HeartViewer
            compact
            interactiveCompact
            scrollDriven
            controlsRef={model}
            selected={selected}
            height={240}
          />
        </View>
        <Text style={a.sceneHint}>Scroll to move through the story · swipe sideways to rotate</Text>
        <View style={a.chambers}>
          {chambers.map(([id, name]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Highlight ${name}`}
              accessibilityState={{ selected: selected === id }}
              onPress={() => setSelected(id)}
              style={[a.chamber, selected === id && a.chamberSelected]}
            >
              <Text style={[a.chamberCode, selected === id && a.chamberCodeSelected]}>{id.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Text style={a.chamberName}>{chambers.find(([id]) => id === selected)?.[1]}</Text>
        </View>
        <View style={a.track}>
          {chapters.map((chapter, index) => (
            <View key={chapter.label} style={[a.trackSegment, index <= active && a.trackActive]} />
          ))}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        {chapters.map((chapter, index) => (
          <DepthCard key={chapter.label} style={a.chapterDepth}>
          <Pressable
            onPress={() => navigation.navigate(chapter.path)}
            style={[a.chapter, index === active && a.chapterActive]}
          >
            <Text style={[a.chapterLabel, index === active && a.chapterLabelActive]}>{chapter.label}</Text>
            <Text style={a.chapterTitle}>{chapter.title}</Text>
            <Text style={a.chapterCopy}>
              {index === 0
                ? "Use active recall to find what you know and what needs another look."
                : index === 1
                  ? "Rotate the model and connect anatomy with your notes and lessons."
                  : "Bring notes, flashcards, progress, and planning into one rhythm."}
            </Text>
            <Text style={a.chapterAction}>EXPLORE THIS PART  <Ionicons name="arrow-forward" size={13} /></Text>
          </Pressable>
          </DepthCard>
        ))}
      </View>

      <View style={a.teamIntro}>
        <Text style={a.sectionLabel}>THE PEOPLE BEHIND THE PRODUCT</Text>
        <Text style={s.heading}>{content.about.teamHeading}</Text>
        <Text style={s.small}>{content.about.founderNote}</Text>
      </View>
      {content.about.people.map(({ name, role, bio }, index) => (
        <DepthCard key={name} style={[a.teamCard, index === 1 && a.teamCardAlt]}>
          <View style={[a.teamArt, index === 0 ? a.designArt : a.buildArt]}>
            {index === 0 ? (
              <View style={a.notebook}>
                <View style={a.notebookTop}><Text style={a.notebookBrand}>MED PURPLE</Text><Text style={a.notebookStamp}>IDEA BOOK</Text></View>
                <Text style={a.notebookPrompt}>STUDY, YOUR WAY</Text>
                <View style={a.notebookSketch}>
                  <Ionicons name="heart" size={31} color="#b65785" />
                  <View style={{ flex: 1, gap: 6 }}><View style={a.paperLine} /><View style={[a.paperLine, { width: "78%" }]} /><View style={[a.paperLine, { width: "58%" }]} /></View>
                </View>
                <View style={a.paperRule} /><View style={a.paperRule} />
              </View>
            ) : (
              <View style={a.laptop}>
                <View style={a.codeWindow}>
                  <View style={a.windowBar}><View style={a.dotRed} /><View style={a.dotYellow} /><View style={a.dotGreen} /><Text style={a.fileName}>study-desk.jsx</Text></View>
                  <Text style={a.codeLine}><Text style={a.codeKeyword}>const</Text> study = <Text style={a.codeFunction}>learn</Text>();</Text>
                  <Text style={a.codeLine}>study.<Text style={a.codeFunction}>practice</Text>("MCQs");</Text>
                  <Text style={a.codeLine}>study.<Text style={a.codeFunction}>explore</Text>("anatomy");</Text>
                  <Text style={a.codeLine}><Text style={a.codeKeyword}>return</Text> progress;</Text>
                </View>
                <View style={a.laptopBase} />
              </View>
            )}
          </View>
          <View style={a.teamDetails}>
            <Text style={a.teamFocus}>{index === 0 ? "VISION & DESIGN" : "PRODUCT & DEVELOPMENT"}</Text>
            <Text style={a.teamName}>{name}</Text>
            <Text style={a.teamRole}>{role}</Text>
            <Text style={a.teamBio}>{bio}</Text>
          </View>
        </DepthCard>
      ))}

      <View style={a.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.purple[700]} />
        <Text style={a.disclaimerText}>Med Purple supports education and revision. Always verify clinical information with current authoritative sources and qualified guidance.</Text>
      </View>
      <View style={a.closing}>
        <Text style={a.sectionLabel}>READY WHEN YOU ARE</Text>
        <Text style={a.closingTitle}>Start with one useful next step.</Text>
        <Text style={a.closingCopy}>Open a study tool or explore the interactive anatomy models.</Text>
        <Button title="Explore the revision toolkit" variant="accent" onPress={() => navigation.navigate("Learn")} />
        <Button title="Open anatomy" variant="secondary" onPress={() => navigation.navigate("Anatomy")} />
      </View>
      <Button title="Visit our legal centre" variant="secondary" onPress={() => navigation.navigate("LegalCentre")} />
    </Screen>
  );
}

const a = StyleSheet.create({
  hero: { position: "relative", overflow: "hidden", gap: 13, borderRadius: 27, padding: 24, backgroundColor: "#36204d", borderColor: "#6c4b89", minHeight: 295 },
  heroOrbLarge: { position: "absolute", width: 245, height: 245, borderRadius: 123, right: -83, top: -70, backgroundColor: "#895dc1", opacity: 0.32 },
  heroOrbSmall: { position: "absolute", width: 110, height: 110, borderRadius: 55, right: 15, top: 36, backgroundColor: "#e39ab7", opacity: 0.24 },
  kicker: { color: "#d9c3ef", fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5 },
  heroTitle: { maxWidth: 300, color: "#fff", fontFamily: fonts.bold, fontSize: 38, lineHeight: 43, letterSpacing: -1 },
  heroCopy: { color: "#e6dcec", fontFamily: fonts.body, fontSize: 14, lineHeight: 22, maxWidth: 440 },
  heroFoot: { color: "#d4bfdf", fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.4, marginTop: 5 },
  introModule: { gap: 8, marginTop: 5 },
  introStage: { height: 126, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  introOrbit: { position: "absolute", borderWidth: 1, borderColor: colors.purple[300], opacity: 0.55 },
  introOrbitWide: { width: 210, height: 76, borderRadius: 105, transform: [{ perspective: 500 }, { rotateX: "64deg" }, { rotateZ: "-16deg" }] },
  introOrbitTall: { width: 154, height: 108, borderRadius: 77, borderColor: colors.purple[400], transform: [{ perspective: 500 }, { rotateY: "58deg" }, { rotateZ: "24deg" }] },
  introCore: { width: 108, height: 108, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: 54, borderWidth: 1, borderColor: colors.purple[400], backgroundColor: colors.purple[700], shadowColor: colors.purple[900], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 18, elevation: 6 },
  introCoreLabel: { color: colors.surface, fontFamily: fonts.display, fontSize: 15, textAlign: "center" },
  introCoreHint: { color: colors.purple[100], fontFamily: fonts.bold, fontSize: 7, letterSpacing: 0.7, textAlign: "center", marginTop: 4 },
  introChoices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  introChoice: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.purple[400], borderRadius: 12, backgroundColor: colors.purple[800] },
  introChoiceActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  introChoiceText: { color: colors.purple[100], fontFamily: fonts.bold, fontSize: 10 },
  introChoiceTextActive: { color: colors.accentInk },
  introReveal: { minHeight: 91, padding: 12, gap: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.purple[400], backgroundColor: colors.purple[800] },
  introRevealEyebrow: { color: colors.accent, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8 },
  introRevealTitle: { color: colors.surface, fontFamily: fonts.display, fontSize: 15, lineHeight: 19 },
  introRevealBody: { color: colors.purple[100], fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
  mission: { padding: 19, gap: 10, borderRadius: 20, backgroundColor: "#f4eafe", borderWidth: 1, borderColor: "#e4d1f0" },
  challenge: { padding: 20, gap: 10, borderRadius: 23, borderWidth: 1, borderColor: "#59436f", backgroundColor: "#2a1c3d" },
  challengeSteps: { gap: 8, marginTop: 5 },
  challengeStep: { minHeight: 82, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: "#ffffff25", backgroundColor: "#ffffff09" },
  challengeStepTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  challengeNumber: { color: "#c9b6df", fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2 },
  challengeTitle: { color: "#fff", fontFamily: fonts.display, fontSize: 19, marginTop: 6 },
  challengeDetail: { color: "#d6c8e2", fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
  sectionLabel: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  scene: { overflow: "hidden", padding: 17, borderRadius: 25, borderWidth: 1, borderColor: "#694b88", backgroundColor: "#291a3c", gap: 11, shadowColor: "#241432", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 8 },
  sceneTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sceneLabel: { color: "#d9c3ef", fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 },
  sceneTitle: { color: "#fff", fontFamily: fonts.display, fontSize: 19, lineHeight: 25, marginTop: 5 },
  sceneStep: { color: "#b8fff0", fontFamily: fonts.bold, fontSize: 11, marginTop: 2 },
  modelStage: { height: 242, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "#352248" },
  modelGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#8e5db2", opacity: 0.33 },
  modelRing: { position: "absolute", width: 214, height: 214, borderRadius: 107, borderWidth: 1, borderColor: "#e9cfff55" },
  sceneHint: { color: "#d6c6e3", fontFamily: fonts.medium, fontSize: 10, textAlign: "center" },
  chambers: { flexDirection: "row", alignItems: "center", gap: 6 },
  chamber: { minWidth: 34, minHeight: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#ffffff36", backgroundColor: "#ffffff0a" },
  chamberSelected: { borderColor: "#c4ffdc", backgroundColor: "#c4ffdc" },
  chamberCode: { color: "#e0d4e9", fontFamily: fonts.bold, fontSize: 9 },
  chamberCodeSelected: { color: "#352248" },
  chamberName: { flex: 1, color: "#fff", textAlign: "right", fontFamily: fonts.bold, fontSize: 10 },
  track: { flexDirection: "row", gap: 5 },
  trackSegment: { height: 3, flex: 1, borderRadius: 4, backgroundColor: "#ffffff2e" },
  trackActive: { backgroundColor: "#b8fff0" },
  chapter: { gap: 8, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: "#fbf8ff" },
  chapterDepth: { borderRadius: 18 },
  chapterActive: { backgroundColor: "#f2e9ff", borderColor: "#c2a3df", shadowColor: "#6c4692", shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
  chapterLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 },
  chapterLabelActive: { color: colors.purple[700] },
  chapterTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 22 },
  chapterCopy: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  chapterAction: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, marginTop: 4 },
  teamIntro: { gap: 8, marginTop: 8 },
  teamCard: { gap: 15, padding: 14, borderRadius: 21, backgroundColor: "#fff5f2", borderColor: "#ead5e3" },
  teamCardAlt: { backgroundColor: "#eff8ff", borderColor: "#d1e5ec" },
  teamArt: { height: 180, alignItems: "center", justifyContent: "center", borderRadius: 15, overflow: "hidden" },
  designArt: { backgroundColor: "#e9b8d0" },
  buildArt: { backgroundColor: "#9dced9" },
  notebook: { width: "78%", height: 133, paddingHorizontal: 12, paddingTop: 10, borderLeftWidth: 6, borderLeftColor: "#70449b", borderRadius: 8, backgroundColor: "#fffdf7", shadowColor: "#311e45", shadowOffset: { width: 7, height: 12 }, shadowOpacity: 0.25, shadowRadius: 13, elevation: 7 },
  notebookTop: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e9dfed" },
  notebookBrand: { color: "#68418a", fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
  notebookStamp: { color: "#a590b0", fontFamily: fonts.bold, fontSize: 6, letterSpacing: 0.7 },
  notebookPrompt: { color: "#a37490", fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1, marginTop: 10 },
  notebookSketch: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 7 },
  paperLine: { height: 3, width: "100%", borderRadius: 3, backgroundColor: "#e4d6e9" },
  paperRule: { height: 3, width: "85%", borderRadius: 3, backgroundColor: "#efe6ef", marginTop: 6 },
  laptop: { width: "88%", alignItems: "center", transform: [{ perspective: 700 }, { rotateY: "-7deg" }, { rotateX: "3deg" }] },
  codeWindow: { width: "100%", paddingBottom: 12, borderWidth: 4, borderColor: "#3c3150", borderRadius: 9, backgroundColor: "#211d2e", shadowColor: "#26384b", shadowOpacity: 0.35, shadowRadius: 13, elevation: 8 },
  windowBar: { height: 22, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, backgroundColor: "#393148" },
  dotRed: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ff9d9c" },
  dotYellow: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffd27e" },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#82d7b5" },
  fileName: { color: "#c6b9d3", fontFamily: fonts.medium, fontSize: 7, marginLeft: 4 },
  codeLine: { color: "#d9cfe5", fontFamily: "monospace", fontSize: 8, marginTop: 9, marginHorizontal: 10 },
  codeKeyword: { color: "#d999f5" },
  codeFunction: { color: "#83dfcb" },
  laptopBase: { width: "106%", height: 11, marginTop: -1, borderRadius: 2, backgroundColor: "#c8d3df", transform: [{ perspective: 130 }, { rotateX: "20deg" }] },
  teamDetails: { gap: 6, padding: 4 },
  teamFocus: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 },
  teamName: { color: colors.ink, fontFamily: fonts.display, fontSize: 24, marginTop: 3 },
  teamRole: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 13 },
  teamBio: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 4 },
  disclaimer: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 17, backgroundColor: "#eff6f2", borderWidth: 1, borderColor: "#d4e8dc" },
  disclaimerText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  closing: { padding: 20, gap: 10, borderRadius: 22, borderWidth: 1, borderColor: "#614879", backgroundColor: "#2c1d40" },
  closingTitle: { color: "#fff", fontFamily: fonts.display, fontSize: 25, lineHeight: 31 },
  closingCopy: { color: "#ded3e8", fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginBottom: 3 },
});
