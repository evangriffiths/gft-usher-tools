import { useRef } from "react";
import { minutesToTimeStr } from "../lib/filters.js";

interface Props {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  onChange: (min: number, max: number) => void;
}

export function TimeRangeSlider({ min, max, valueMin, valueMax, step = 30, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const handlePointer = (thumb: "min" | "max") => (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      const clamped = Math.max(min, Math.min(max, snapped));

      if (thumb === "min") {
        onChange(Math.min(clamped, valueMax), valueMax);
      } else {
        onChange(valueMin, Math.max(clamped, valueMin));
      }
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
      <span style={{ minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {minutesToTimeStr(valueMin)}
      </span>
      <div
        ref={trackRef}
        style={{
          flex: 1, position: "relative", height: 24,
          display: "flex", alignItems: "center", cursor: "pointer",
        }}
      >
        {/* Track background */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "#ddd", borderRadius: 2 }} />
        {/* Active range */}
        <div
          style={{
            position: "absolute", height: 4, borderRadius: 2, background: "#4285f4",
            left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%`,
          }}
        />
        {/* Min thumb */}
        <div
          onPointerDown={handlePointer("min")}
          style={{ ...thumbStyle, left: `${pct(valueMin)}%` }}
        />
        {/* Max thumb */}
        <div
          onPointerDown={handlePointer("max")}
          style={{ ...thumbStyle, left: `${pct(valueMax)}%` }}
        />
      </div>
      <span style={{ minWidth: 36, fontVariantNumeric: "tabular-nums" }}>
        {minutesToTimeStr(valueMax)}
      </span>
      <span style={{ position: "relative", flexShrink: 0 }} className="info-tip">
        <span
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "1px solid #bbb", color: "#999",
            fontSize: 11, fontStyle: "italic", fontFamily: "serif",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "default",
          }}
        >
          i
        </span>
        <span
          className="info-tip-text"
          style={{
            display: "none", position: "absolute", bottom: "calc(100% + 6px)", right: 0,
            background: "#333", color: "#fff", fontSize: 12, padding: "4px 8px",
            borderRadius: 4, whiteSpace: "nowrap", zIndex: 20,
          }}
        >
          Shift starts between these times
        </span>
        <style>{`.info-tip:hover .info-tip-text { display: block !important; }`}</style>
      </span>
    </div>
  );
}

const thumbStyle: React.CSSProperties = {
  position: "absolute",
  width: 16, height: 16,
  borderRadius: "50%",
  background: "#fff",
  border: "2px solid #4285f4",
  transform: "translateX(-50%)",
  cursor: "grab",
  touchAction: "none",
  zIndex: 1,
};
