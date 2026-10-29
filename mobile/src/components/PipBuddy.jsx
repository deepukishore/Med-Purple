import React from "react";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export default function PipBuddy({ expression = "happy", size = 58 }) {
  const mouth =
    expression === "oops" ? "M45 51 Q50 44 55 51" : "M44 47 Q50 55 57 47";
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={
        expression === "oops" ? "Pip looks thoughtful" : "Pip is celebrating"
      }
    >
      <Ellipse cx="51" cy="91" rx="30" ry="5" fill="#d8c9f2" />
      <Path
        d="M19 51C13 27 29 15 40 22C49 7 69 16 71 28C91 32 92 54 80 64L77 81C69 93 31 93 23 81Z"
        fill="#a481e5"
        stroke="#6540a9"
        strokeWidth="2.5"
      />
      {expression === "oops" ? (
        <Path
          d="M37 42h7m13 0h7"
          stroke="#302044"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <>
          <Ellipse cx="41" cy="42" rx="3" ry="4.5" fill="#302044" />
          <Ellipse cx="61" cy="42" rx="3" ry="4.5" fill="#302044" />
        </>
      )}
      <Circle cx="31" cy="51" r="4" fill="#e9a6c8" />
      <Circle cx="70" cy="51" r="4" fill="#e9a6c8" />
      <Path
        d={mouth}
        fill="none"
        stroke="#302044"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M30 63l20 4 21-6-2 20-19 7-19-6z"
        fill="#fff9e9"
        stroke="#6540a9"
        strokeWidth="2"
      />
      <Path
        d="M50 68v18m-12-13 8 2m8 0 8-3"
        stroke="#c3aadf"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
