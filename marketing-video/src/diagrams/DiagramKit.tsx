import React from "react";

import { colors, fontFamilyFor } from "../theme";

// Small building blocks for the README diagrams (rendered as PNG stills).
export const font = fontFamilyFor("en");

export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  lines?: string[];
  tone?: "purple" | "white" | "orange" | "dark";
}> = ({ x, y, w, h, title, subtitle, lines = [], tone = "white" }) => {
  const filled = tone === "purple" || tone === "dark";
  const background =
    tone === "purple" ? colors.purple : tone === "dark" ? "#1c1f2b" : tone === "orange" ? "#FFF3E3" : "white";
  const border = tone === "orange" ? "#FFC98A" : tone === "white" ? "#DCD6FF" : "transparent";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        minHeight: h,
        boxSizing: "border-box",
        borderRadius: 28,
        border: `3px solid ${border}`,
        backgroundColor: background,
        boxShadow: "0 14px 34px rgba(40, 20, 120, 0.10)",
        padding: "22px 26px",
        fontFamily: font,
        color: filled ? "white" : colors.ink,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
      {subtitle ? (
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            marginTop: 6,
            color: filled ? "rgba(255,255,255,0.8)" : colors.purple,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {lines.map((line) => (
        <div
          key={line}
          style={{
            fontSize: 18,
            marginTop: 8,
            lineHeight: 1.35,
            color: filled ? "rgba(255,255,255,0.92)" : colors.muted,
          }}
        >
          • {line}
        </div>
      ))}
    </div>
  );
};

export const Arrow: React.FC<{
  from: [number, number];
  to: [number, number];
  label?: string;
  step?: number;
  both?: boolean;
  labelOffset?: [number, number];
}> = ({ from, to, label, step, both = false, labelOffset = [0, -18] }) => {
  const mid: [number, number] = [(from[0] + to[0]) / 2 + labelOffset[0], (from[1] + to[1]) / 2 + labelOffset[1]];
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <defs>
          <marker
            id="head"
            markerUnits="userSpaceOnUse"
            markerWidth="18"
            markerHeight="18"
            refX="16"
            refY="9"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L18,9 L0,18 z" fill={colors.purple} />
          </marker>
        </defs>
        <line
          x1={from[0]}
          y1={from[1]}
          x2={to[0]}
          y2={to[1]}
          stroke={colors.purple}
          strokeWidth={4}
          markerEnd="url(#head)"
          markerStart={both ? "url(#head)" : undefined}
        />
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: mid[0],
            top: mid[1],
            translate: "-50% -50%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "white",
            border: "2px solid #E4DEFF",
            borderRadius: 999,
            padding: "6px 16px 6px 8px",
            fontFamily: font,
            fontSize: 18,
            fontWeight: 600,
            color: colors.ink,
            whiteSpace: "nowrap",
          }}
        >
          {step !== undefined ? (
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.orange,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              {step}
            </span>
          ) : null}
          {label}
        </div>
      ) : null}
    </>
  );
};

export const DiagramTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ position: "absolute", left: 60, top: 40, fontFamily: font }}>
    <div style={{ fontSize: 44, fontWeight: 700, color: colors.ink }}>{title}</div>
    <div style={{ fontSize: 22, color: colors.muted, marginTop: 4 }}>{subtitle}</div>
  </div>
);
