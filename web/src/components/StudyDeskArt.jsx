export default function StudyDeskArt() {
  return (
    <svg
      viewBox="0 0 300 310"
      role="img"
      aria-label="Illustrated study desk with revision cards, a stethoscope, and a coffee cup"
    >
      <circle
        cx="164"
        cy="147"
        r="118"
        fill="#ffffff08"
        stroke="#ffffff18"
        strokeDasharray="3 9"
      />
      <g transform="rotate(9 150 165)">
        <rect
          x="70"
          y="68"
          width="174"
          height="213"
          rx="17"
          fill="#130f23"
          opacity=".35"
        />
        <rect
          x="64"
          y="58"
          width="174"
          height="213"
          rx="17"
          fill="#c9b2fc"
          stroke="#b49ada"
          strokeWidth="2"
        />
        <rect x="84" y="84" width="135" height="165" rx="7" fill="#fffaf0" />
        <rect
          x="115"
          y="46"
          width="74"
          height="30"
          rx="10"
          fill="#dcf78a"
          stroke="#332348"
          strokeWidth="3"
        />
        <text
          x="103"
          y="115"
          fill="#39264b"
          fontSize="12"
          fontFamily="sans-serif"
          fontWeight="800"
          letterSpacing="2"
        >
          THE GAME PLAN
        </text>
        {[141, 175, 209].map((y, i) => (
          <g key={y}>
            <rect
              x="101"
              y={y - 10}
              width="18"
              height="18"
              rx="5"
              fill={i < 2 ? "#dff494" : "#ece4f5"}
            />
            {i < 2 && (
              <path
                d={`M105 ${y - 2}l4 4 7-9`}
                fill="none"
                stroke="#476022"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            <text
              x="131"
              y={y + 3}
              fontSize="12"
              fontFamily="sans-serif"
              fontWeight="700"
              fill="#5d4b71"
            >
              {["RECALL", "CONNECT", "REPEAT"][i]}
            </text>
          </g>
        ))}
      </g>
      <g transform="rotate(-18 74 181)">
        <path
          d="M34 131v28a27 27 0 0054 0v-28"
          fill="none"
          stroke="#a78bdb"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M61 187v32c0 31 71 39 77 6"
          fill="none"
          stroke="#daee9c"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle
          cx="140"
          cy="216"
          r="17"
          fill="#edf9ce"
          stroke="#91ab59"
          strokeWidth="4"
        />
        <circle cx="140" cy="216" r="7" fill="#b3c88d" />
        <path
          d="M34 131v-18M88 131v-18"
          stroke="#ddd1ef"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="34" cy="112" r="5" fill="#e8dfef" />
        <circle cx="88" cy="112" r="5" fill="#e8dfef" />
      </g>
      <g transform="rotate(-11 241 49)">
        <path d="M215 25h42l-5 44h-32z" fill="#ffc5a9" />
        <path
          d="M257 32h9c15 0 12 24-11 24"
          fill="none"
          stroke="#ffc5a9"
          strokeWidth="7"
        />
        <ellipse cx="236" cy="26" rx="21" ry="5" fill="#9c674e" />
        <path
          d="M229 12q-7-7 0-14M243 10q-7-7 0-14"
          stroke="#b7a2ca"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M28 54h17l6-14 10 29 8-16h16"
        fill="none"
        stroke="#e1f6a2"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M267 130l4 10 12 3-12 4-4 11-4-11-11-4 11-3z" fill="#f5bb9b" />
      <circle cx="249" cy="269" r="6" fill="#caaffe" />
      <circle cx="30" cy="241" r="4" fill="#e1f6a2" />
    </svg>
  );
}
