import React, { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { getAvatar } from "../../../shared/avatar-presets.js";

function Hair({ avatar, gradientId }) {
  const fill = `url(#${gradientId})`;
  const shapes = {
    short: "M37 54c-4-15 3-28 16-32 12-4 25 1 30 12-8-3-15-3-22 0-7 4-13 10-18 20z",
    afro: "M35 56C26 38 33 23 45 24c6-13 19-15 27-7 14-1 22 13 16 26 6 4 7 10 3 17l-9-4-3-14c-12 7-27 8-41 3l-1 12z",
    curl: "M36 55c-8-17 0-29 11-29 3-10 17-12 22-4 11-4 20 7 15 17 9 7 5 19-1 22l-5-15c-12 6-25 7-39 3l-2 10z",
    long: "M35 57c-5-21 3-35 18-37 17-4 32 7 32 26v39l-10 6-2-46c-7 6-17 7-28 3l-2 43-10-5z",
    braid: "M35 57c-5-21 3-35 18-37 17-4 32 7 32 26v39l-10 6-2-46c-7 6-17 7-28 3l-2 43-10-5z",
    bun: "M36 57c-5-21 5-35 19-37 17-3 31 8 31 26v34l-9 7-3-45c-7 6-17 7-28 3l-3 42-9-7z",
    bob: "M35 58c-6-21 3-36 19-38 18-2 31 10 31 29v25c-7 6-13 7-19 3l2-30c-9 4-19 5-31 1l1 28c-6 4-12 2-17-2z",
    swept: "M36 57c-4-20 4-32 19-36 11-3 24 2 30 12-8-3-17-3-25 0-7 3-13 9-18 17l-1 8z",
    part: "M36 58c-4-20 4-34 18-37 15-4 29 6 31 20-8-8-17-11-26-9-9 2-16 8-20 18l-1 8z",
    fade: "M38 53c-3-14 4-27 15-31 12-4 25 1 30 12-8-3-14-3-20 0-6 4-12 9-18 19z",
    crop: "M38 53c-3-14 4-27 15-31 12-4 25 1 30 12-8-3-14-3-20 0-6 4-12 9-18 19z",
    wave: "M36 56c-3-18 5-32 19-35 15-3 27 5 29 18-8-7-16-9-24-7-9 2-16 9-21 20z",
  };
  return <Path d={shapes[avatar.hairstyle] || shapes.short} fill={fill} />;
}

function HairCap({ avatar, gradientId }) {
  const path = ["long", "braid", "bun", "bob"].includes(avatar.hairstyle)
    ? "M39 57c0-19 7-31 20-34 14-3 23 8 23 25-7-7-14-10-21-9-8 1-15 6-22 18z"
    : avatar.hairstyle === "afro"
      ? "M36 56c-6-17 0-28 10-31 5-12 17-13 23-6 12-3 20 7 17 18-10-8-23-9-34-2-5 4-9 11-12 21z"
      : avatar.hairstyle === "curl"
        ? "M37 56c-5-15 1-25 11-28 4-8 15-9 20-3 10-2 16 5 16 14-12-7-29-4-40 7-3 3-5 7-7 10z"
        : null;
  return path ? <Path d={path} fill={`url(#${gradientId})`} /> : null;
}

export default function AvatarPortrait({ avatarId, name = "student", size = 54, interactive = true }) {
  const avatar = getAvatar(avatarId);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = Object.fromEntries(["bg", "skin", "hair", "shirt"].map((key) => [key, `${key}-${avatar.id}-${reactId}`]));
  const [greeting, setGreeting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const tilt = scale.interpolate({ inputRange: [1, 1.12], outputRange: ["0deg", "-8deg"] });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduceMotion(value));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const firstName = name.trim().split(/\s+/)[0] || "friend";
  const hello = name === "friend" ? avatar.greeting : `${avatar.greeting.replace(/[.!?]$/, "")}, ${firstName}!`;
  const onTouchStart = () => {
    if (!interactive) return;
    setGreeting(true);
    clearTimeout(timer.current);
    if (!reduceMotion) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, speed: 24, bounciness: 8 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }),
      ]).start();
    }
    timer.current = setTimeout(() => setGreeting(false), 1800);
  };
  const femaleLong = avatar.gender === "female" && ["long", "braid", "bun", "bob"].includes(avatar.hairstyle);
  const curledMale = avatar.gender === "male" && ["afro", "curl"].includes(avatar.hairstyle);
  return (
    <View style={{ width: size, height: size, position: "relative", overflow: "visible", zIndex: 3 }} onTouchStart={onTouchStart}>
      <Animated.View style={{ width: size, height: size, transform: [{ perspective: 500 }, { rotateY: tilt }, { scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel={`${name}'s 3D avatar`}>
          <Defs>
            <LinearGradient id={ids.bg} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#F1E8FC" /><Stop offset=".54" stopColor="#E7D8F7" /><Stop offset="1" stopColor="#D1B9EC" /></LinearGradient>
            <RadialGradient id={ids.skin} cx=".3" cy=".2" r=".85"><Stop stopColor={avatar.skinLight} /><Stop offset=".52" stopColor={avatar.skin} /><Stop offset="1" stopColor={avatar.skinShadow} /></RadialGradient>
            <LinearGradient id={ids.hair} x1=".15" y1="0" x2=".9" y2="1"><Stop stopColor={avatar.hairLight} stopOpacity=".55" /><Stop offset=".2" stopColor={avatar.hair} /><Stop offset="1" stopColor="#29183E" /></LinearGradient>
            <LinearGradient id={ids.shirt} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={avatar.shirt} /><Stop offset="1" stopColor="#432166" /></LinearGradient>
          </Defs>
          <Rect x="3" y="3" width="114" height="114" rx="37" fill={`url(#${ids.bg})`} />
          <Circle cx="60" cy="58" r="47" fill="none" stroke="#fff" strokeOpacity=".52" strokeWidth="1.2" />
          <Path d="M13 87c18-18 74-23 95 0" fill="none" stroke="#A878D7" strokeOpacity=".22" />
          <Ellipse cx="60" cy="110" rx="35" ry="7" fill="#432166" opacity=".12" />
          <Path d="M22 120c2-22 14-34 38-35 24 1 36 13 38 35z" fill={`url(#${ids.shirt})`} />
          <Path d="m47 85 13 15 13-15 9 35H38z" fill="#FFFDFF" opacity=".92" />
          <Path d="m56 101 4 4 4-4-1 19h-6z" fill="#DDF48E" />
          <Path d="M41 77v15m38-15v15" stroke={avatar.skinShadow} strokeWidth="12" strokeLinecap="round" />
          {femaleLong && <Hair avatar={avatar} gradientId={ids.hair} />}
          {curledMale && <Hair avatar={avatar} gradientId={ids.hair} />}
          <Path d="M40 58c0-18 9-28 21-28s21 10 21 28v12c0 17-9 28-21 28S40 87 40 70z" fill={`url(#${ids.skin})`} />
          <Ellipse cx="39" cy="66" rx="4" ry="7" fill={avatar.skin} />
          <Ellipse cx="83" cy="66" rx="4" ry="7" fill={avatar.skinShadow} />
          {!femaleLong && !curledMale && <Hair avatar={avatar} gradientId={ids.hair} />}
          <Path d="M47 61q5-4 10 0m7 0q5-4 10 0" fill="none" stroke={avatar.hair} strokeWidth="1.8" strokeLinecap="round" />
          <Ellipse cx="52" cy="67" rx="1.8" ry="2.5" fill="#29183E" />
          <Ellipse cx="69" cy="67" rx="1.8" ry="2.5" fill="#29183E" />
          <Path d="M60 68l-2 8q2 2 5 0" fill="none" stroke={avatar.skinShadow} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M54 81q6 5 12 0" fill="none" stroke="#7139AB" strokeWidth="2" strokeLinecap="round" />
          {(avatar.gender === "female" || ["afro", "curl"].includes(avatar.hairstyle)) && <HairCap avatar={avatar} gradientId={ids.hair} />}
          {!!avatar.beard && <Path d="M45 76q2 17 15 19 13-2 15-19l-6 4-3 7-6 2-6-2-3-7z" fill={avatar.hair} opacity=".82" />}
          {Number(avatar.id.slice(-2)) % 3 === 0 && <G fill="none" stroke={avatar.hair} strokeWidth="1.8"><Rect x="44" y="63" width="15" height="11" rx="4" /><Rect x="62" y="63" width="15" height="11" rx="4" /><Path d="M59 67h3" /></G>}
          <G rotation={greeting && !reduceMotion ? -16 : 0} origin="82 91">
            <Path d="M82 91c10-4 13-15 13-26" fill="none" stroke={avatar.skin} strokeWidth="9" strokeLinecap="round" />
            <Path d="M82 91c10-4 13-15 13-26" fill="none" stroke="#fff" strokeOpacity=".27" strokeWidth="2.5" strokeLinecap="round" />
            <Ellipse cx="95" cy="61" rx="6" ry="7" fill={`url(#${ids.skin})`} />
            <Path d="M96 57v-5m-4 7-3-4m9 4 3-4" stroke={avatar.skin} strokeWidth="2.4" strokeLinecap="round" />
          </G>
          <Circle cx="97" cy="98" r="3" fill="#DDF48E" />
          <Circle cx="22" cy="37" r="2" fill="#fff" opacity=".9" />
        </Svg>
      </Animated.View>
      {interactive && greeting && (
        <View accessibilityLiveRegion="polite" style={{ position: "absolute", zIndex: 9, left: size * 0.48, top: -16, maxWidth: 160, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: "#FFFDFF", borderWidth: 1, borderColor: "#E6DDEE", elevation: 5 }}>
          <Text numberOfLines={1} style={{ color: "#2A2035", fontSize: 11, fontWeight: "800" }}>{hello}</Text>
        </View>
      )}
    </View>
  );
}
