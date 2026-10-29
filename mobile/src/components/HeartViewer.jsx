import React, { useRef, useEffect, useState } from "react";
import { View, Text, PanResponder } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { createHeartScene, createReferenceScene } from "@med-purple/anatomy";
import { useIsFocused } from "@react-navigation/native";
import { styles as s } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";
export default function HeartViewer({
  selected,
  onSelect,
  controlsRef,
  exploded = false,
  vessels = true,
  compact = false,
  interactiveCompact = false,
  autoRotate = true,
  scrollDriven = false,
  height = 350,
  modelId = "heart",
}) {
  const engine = useRef(null),
    rendererRef = useRef(null),
    raf = useRef(),
    wakeRef = useRef(null),
    size = useRef({ width: 1, height }),
    last = useRef(null),
    focus = useRef(true),
    mounted = useRef(true),
    pick = useRef(onSelect);
  pick.current = onSelect;
  const [error, setError] = useState(false);
  const focused = useIsFocused(),
    reduce = useReducedMotion();
  const reduced = useRef(reduce);
  reduced.current = reduce;
  useEffect(() => {
    focus.current = focused;
    if (focused) wakeRef.current?.();
    else {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, [focused]);
  useEffect(
    () => () => {
      mounted.current = false;
      cancelAnimationFrame(raf.current);
      engine.current?.dispose();
      rendererRef.current?.dispose();
      if (controlsRef?.current === engine.current) controlsRef.current = null;
      wakeRef.current = null;
    },
    [controlsRef],
  );
  useEffect(() => {
    engine.current?.select(selected);
    wakeRef.current?.();
  }, [selected]);
  useEffect(() => {
    engine.current?.explode(exploded);
    wakeRef.current?.();
  }, [exploded]);
  useEffect(() => {
    engine.current?.vessels(vessels);
    wakeRef.current?.();
  }, [vessels]);
  useEffect(() => {
    if (scrollDriven) {
      engine.current?.pose?.(0);
      wakeRef.current?.();
    }
  }, [scrollDriven]);
  useEffect(() => wakeRef.current?.(), [reduce, autoRotate]);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !compact,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !compact ||
        (interactiveCompact &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy)),
      onPanResponderGrant: (e) => {
        const t = e.nativeEvent.touches;
        last.current =
          t.length > 1
            ? {
                distance: Math.hypot(
                  t[0].pageX - t[1].pageX,
                  t[0].pageY - t[1].pageY,
                ),
              }
            : { x: t[0].pageX, y: t[0].pageY };
      },
      onPanResponderMove: (e) => {
        const t = e.nativeEvent.touches,
          l = last.current;
        if (!l || !engine.current) return;
        if (t.length > 1) {
          const distance = Math.hypot(
            t[0].pageX - t[1].pageX,
            t[0].pageY - t[1].pageY,
          );
          if (l.distance) engine.current.zoom((l.distance - distance) * 0.025);
          last.current = { distance };
        } else {
          if (l.x !== undefined)
            engine.current.rotate(
              (t[0].pageX - l.x) * 0.01,
              (t[0].pageY - l.y) * 0.008,
            );
          last.current = { x: t[0].pageX, y: t[0].pageY };
        }
        wakeRef.current?.();
      },
      onPanResponderRelease: (e, g) => {
        if (Math.abs(g.dx) + Math.abs(g.dy) < 8) {
          const { locationX: x, locationY: y } = e.nativeEvent;
          const id = engine.current?.pick(
            (x / size.current.width) * 2 - 1,
            (-y / size.current.height) * 2 + 1,
          );
          if (id) pick.current?.(id);
        }
        wakeRef.current?.();
        last.current = null;
      },
      onPanResponderTerminate: () => {
        last.current = null;
      },
    }),
  ).current;
  async function create(gl) {
    try {
      const canvas = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        setAttribute() {},
        getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        antialias: true,
        alpha: true,
      });
      rendererRef.current = renderer;
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      const model =
        modelId === "heart"
          ? createHeartScene()
          : createReferenceScene(modelId);
      engine.current = model;
      if (controlsRef) controlsRef.current = model;
      model.resize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      model.select(selected);
      model.explode(exploded);
      model.vessels(vessels);
      let framesRemaining = 0;
      const render = (time) => {
        raf.current = null;
        if (!mounted.current) return;
        if (!focus.current) return;
        try {
          const continuous = compact && autoRotate && !scrollDriven && !reduced.current;
          model.autoRotate(continuous);
          model.frame(time, reduced.current || (!continuous && !scrollDriven));
          renderer.render(model.scene, model.camera);
          gl.endFrameEXP();
          if (continuous) raf.current = requestAnimationFrame(render);
          else if (framesRemaining > 0) {
            framesRemaining -= 1;
            raf.current = requestAnimationFrame(render);
          }
        } catch {
          if (mounted.current) setError(true);
        }
      };
      const wake = (frames = 30) => {
        framesRemaining = Math.max(framesRemaining, frames);
        if (mounted.current && focus.current && !raf.current)
          raf.current = requestAnimationFrame(render);
      };
      wakeRef.current = wake;
      model.wake = wake;
      wake();
    } catch {
      if (mounted.current) setError(true);
    }
  }
  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => {
        size.current = e.nativeEvent.layout;
        engine.current?.resize(size.current.width, size.current.height);
        wakeRef.current?.();
      }}
      accessible
      accessibilityLabel={
        compact
          ? interactiveCompact
            ? "Interactive 3D heart preview. Drag horizontally to rotate; use the chamber buttons to highlight a structure."
            : "Schematic heart preview"
          : `Interactive ${modelId} model. Drag to rotate and pinch to zoom. Structure buttons are available below.`
      }
      style={{ height, width: "100%", overflow: "hidden" }}
    >
      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 5 }}>
          {modelId === "heart" ? <Svg width="100%" height={Math.min(height - 70, 255)} viewBox="0 0 320 280" accessibilityLabel="Static schematic heart illustration, not to scale">
            <Circle cx="160" cy="137" r="106" fill="#573b70" opacity="0.35" />
            <Circle cx="160" cy="137" r="92" fill="none" stroke="#b8fff0" strokeOpacity="0.42" strokeWidth="1" />
            <Path d="M159 239 C145 221 78 176 73 130 C68 82 121 67 156 103 C183 66 242 80 244 127 C246 170 185 218 159 239Z" fill="#93638f" stroke="#f0b4c6" strokeWidth="3" />
            <Path d="M153 113 C126 87 94 100 95 129 C96 153 126 173 153 192Z" fill="#b28dca" opacity="0.92" />
            <Path d="M164 113 C193 88 224 103 223 130 C222 154 192 174 164 193Z" fill="#d69097" opacity="0.92" />
            <Path d="M153 122 C135 151 133 190 156 224 C162 233 164 234 168 224 L168 122Z" fill="#7968ad" opacity="0.94" />
            <Path d="M169 122 C186 151 189 191 164 224 C159 231 158 231 158 221 L158 122Z" fill="#c97485" opacity="0.95" />
            <Path d="M146 107 C141 82 149 63 165 60 C183 57 192 77 183 102" fill="none" stroke="#e4abb7" strokeWidth="12" strokeLinecap="round" />
            <Path d="M152 105 C148 87 128 78 115 85" fill="none" stroke="#8fd5d2" strokeWidth="9" strokeLinecap="round" />
            <Path d="M161 117 L161 219" stroke="#f6e7f1" strokeOpacity="0.75" strokeWidth="2" />
          </Svg> : null}
          {modelId === "heart" ? <Text style={[s.pillText, { color: "#cbb4dd" }]}>SCHEMATIC · NOT TO SCALE</Text> : null}
          <Text style={[s.heading, { color: "white", textAlign: "center" }]}>3D is unavailable on this device</Text>
          <Text style={[s.small, { color: "#d1c1dc", textAlign: "center" }]}>Use Anatomy to explore the available structure notes.</Text>
        </View>
      ) : (
        <GLView style={{ flex: 1 }} onContextCreate={create} />
      )}
    </View>
  );
}
