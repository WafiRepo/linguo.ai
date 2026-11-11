import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { fontFamilyFor } from "../theme";
import { MaterialPage } from "./materials";

const font = fontFamilyFor("zh-TW");
const PURPLE = "#5b2ea6";
const LINE = "#d9cdf2";
const SOFT = "#f4effc";

const SectionTab: React.FC<{ icon: string; label: string }> = ({
  icon,
  label,
}) => (
  <div
    style={{
      alignSelf: "flex-start",
      display: "flex",
      alignItems: "center",
      gap: 12,
      backgroundColor: PURPLE,
      color: "white",
      fontSize: 27,
      fontWeight: 700,
      padding: "10px 26px 10px 18px",
      borderRadius: "16px 16px 0 0",
    }}
  >
    <span style={{ fontSize: 30 }}>{icon}</span>
    {label}
  </div>
);

// One printed-style material page: vocabulary table (left) and example
// sentences with scenes (right), in the same layout as Bagian I–III.
export const MaterialPageStill: React.FC<{ page: MaterialPage }> = ({
  page,
}) => {
  // With few sentences there is room to stack a bigger scene above the text.
  const count = page.sentences.length;
  const stacked = count <= 3;
  const sceneWidth = count === 2 ? 420 : count === 3 ? 300 : 230;
  return (
    <AbsoluteFill
      style={{ backgroundColor: "white", fontFamily: font, padding: 34 }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${LINE}`,
          borderRadius: 26,
          padding: "26px 28px 28px",
        }}
      >
        <div
          style={{
            color: PURPLE,
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {page.number}. {page.zhTitle}
        </div>
        <div
          style={{
            color: PURPLE,
            fontSize: 38,
            fontWeight: 700,
            margin: "6px 0 26px 60px",
          }}
        >
          {page.idTitle}
        </div>

        <div style={{ flex: 1, display: "flex", gap: 24, minHeight: 0 }}>
          {/* Vocabulary */}
          <div style={{ width: 410, display: "flex", flexDirection: "column" }}>
            <SectionTab icon="📖" label="Kosakata Penting" />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                border: `2px solid ${LINE}`,
                borderRadius: "0 18px 18px 18px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  backgroundColor: SOFT,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#2b2340",
                  padding: "14px 0",
                }}
              >
                <div style={{ width: 122 }} />
                <div style={{ width: 192, textAlign: "center" }}>
                  Bahasa Indonesia
                </div>
                <div style={{ width: 92, textAlign: "center" }}>繁體中文</div>
              </div>
              {page.words.map((w, i) => (
                <div
                  key={w.word}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    borderTop: i === 0 ? undefined : `1.5px solid ${LINE}`,
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      width: 122,
                      flexShrink: 0,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRight: `1.5px solid ${LINE}`,
                      padding: 8,
                      boxSizing: "border-box",
                    }}
                  >
                    <Img
                      src={staticFile(`materials/icons/${w.icon}.png`)}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 192,
                      flexShrink: 0,
                      boxSizing: "border-box",
                      textAlign: "center",
                      fontSize: 23,
                      color: PURPLE,
                      fontWeight: 600,
                      padding: "0 6px",
                    }}
                  >
                    {w.word}
                  </div>
                  <div
                    style={{
                      width: 92,
                      flexShrink: 0,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderLeft: `1.5px solid ${LINE}`,
                      fontSize: 25,
                      color: "#2b2340",
                    }}
                  >
                    {w.zh}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example sentences */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <SectionTab icon="💬" label="Contoh Kalimat" />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                border: `2px solid ${LINE}`,
                borderRadius: "0 18px 18px 18px",
                padding: "6px 18px",
              }}
            >
              {page.sentences.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: stacked ? "column" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: stacked ? 10 : 16,
                    borderTop: i === 0 ? undefined : `2px dashed ${LINE}`,
                    minHeight: 0,
                    padding: "10px 0",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: sceneWidth,
                      height: sceneWidth * 0.75,
                      flexShrink: 0,
                    }}
                  >
                    <Img
                      src={staticFile(`materials/scenes/${s.scene}.png`)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 4,
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: PURPLE,
                        color: "white",
                        fontSize: 24,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>
                  <div
                    style={
                      stacked
                        ? { alignSelf: "stretch", padding: "0 10px" }
                        : { flex: 1, minWidth: 0 }
                    }
                  >
                    <div
                      style={{
                        fontSize: 26,
                        lineHeight: 1.35,
                        color: "#1d1830",
                      }}
                    >
                      {s.id}
                    </div>
                    <div
                      style={{
                        borderTop: `2px dashed ${LINE}`,
                        margin: "12px 0",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 26,
                        lineHeight: 1.35,
                        color: "#1d1830",
                      }}
                    >
                      {s.zh}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
