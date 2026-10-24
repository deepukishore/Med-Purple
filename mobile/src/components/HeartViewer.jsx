import React, { useRef, useEffect, useState } from "react";
import { View, Text, PanResponder } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { createHeartScene } from "@med-purple/anatomy";
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
  height = 350,
}) {
  const engine = useRef(null),
    rendererRef = useRef(null),
    raf = useRef(),
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
  focus.current = focused;
  useEffect(
    () => () => {
      mounted.current = false;
      cancelAnimationFrame(raf.current);
      engine.current?.dispose();
      rendererRef.current?.dispose();
    },
    [],
  );
  useEffect(() => engine.current?.select(selected), [selected]);
  useEffect(() => engine.current?.explode(exploded), [exploded]);
  useEffect(() => engine.current?.vessels(vessels), [vessels]);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !compact,
      onMoveShouldSetPanResponder: () => !compact,
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
      const model = createHeartScene();
      engine.current = model;
      if (controlsRef) controlsRef.current = model;
      model.resize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      model.select(selected);
      model.explode(exploded);
      model.vessels(vessels);
      const render = (time) => {
        if (!mounted.current) return;
        raf.current = requestAnimationFrame(render);
        if (!focus.current) return;
        try {
          model.frame(time, reduced.current);
          renderer.render(model.scene, model.camera);
          gl.endFrameEXP();
        } catch {
          cancelAnimationFrame(raf.current);
          if (mounted.current) setError(true);
        }
      };
      render(0);
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
      }}
      accessible
      accessibilityLabel={
        compact
          ? "Schematic heart preview"
          : "Interactive heart. Drag to rotate and pinch to zoom. Structure buttons are available below."
      }
      style={{ height, width: "100%", overflow: "hidden" }}
    >
      {error ? (
        <View style={{ padding: 25, flex: 1, justifyContent: "center" }}>
          <Text style={s.heading}>3D is unavailable on this device</Text>
          <Text style={s.small}>
            Continue studying using the structure list below.
          </Text>
        </View>
      ) : (
        <GLView style={{ flex: 1 }} onContextCreate={create} />
      )}
    </View>
  );
}
