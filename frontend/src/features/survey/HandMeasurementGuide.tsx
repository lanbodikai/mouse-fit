export function HandMeasurementGuide() {
  return (
    <svg
      viewBox="0 0 240 250"
      role="img"
      aria-label="Measure hand length from the wrist crease to the middle fingertip, and palm width across the knuckles, excluding the thumb."
    >
      <path
        d="M79 221 L78 179 Q53 163 46 135 Q39 117 49 113 Q57 111 72 136 L74 72 Q75 56 84 58 Q94 59 94 73 L95 109 L99 40 Q100 26 109 29 Q118 29 118 43 L118 104 L125 31 Q127 18 136 22 Q144 24 142 38 L139 108 L148 51 Q151 39 160 44 Q167 48 163 61 L151 149 Q148 173 143 184 L143 221 Z"
        fill="var(--shell-surface-soft)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M78 199 L145 199 M73 142 L151 142 M184 23 L184 199 M177 23 L191 23 M177 199 L191 199"
        pathLength="1"
        data-measurement-lines="true"
        fill="none"
        stroke="var(--shell-accent)"
        strokeWidth="2"
      />
      <text x="192" y="111" fontSize="12" fill="currentColor">
        Length
      </text>
      <text x="93" y="159" fontSize="12" fill="currentColor">
        Width
      </text>
    </svg>
  );
}
