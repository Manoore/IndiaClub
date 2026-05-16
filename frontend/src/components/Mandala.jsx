import React from "react";

// Decorative mandala SVG used as backdrops & accents
export default function Mandala({ className = "", color = "#8B1A1A", opacity = 0.08 }) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={{ opacity }} fill="none" stroke={color} strokeWidth="0.6">
      <g transform="translate(100,100)">
        <circle r="96" />
        <circle r="82" />
        <circle r="66" />
        <circle r="50" />
        <circle r="34" />
        <circle r="18" />
        {Array.from({ length: 24 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 15})`}>
            <path d="M0,-96 C8,-70 8,-50 0,-34 C-8,-50 -8,-70 0,-96 Z" fill={color} fillOpacity="0.5" />
            <circle cx="0" cy="-58" r="1.6" fill={color} />
            <line x1="0" y1="-34" x2="0" y2="-18" />
          </g>
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`p-${i}`} transform={`rotate(${i * 30})`}>
            <path d="M0,-50 q14,12 0,32 q-14,-20 0,-32 Z" fill="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}
