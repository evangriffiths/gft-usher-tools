import type { FilterGroup as FilterGroupType } from "../lib/filters.js";
import { TimeRangeSlider } from "./TimeRangeSlider.js";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

interface Props {
  group: FilterGroupType;
  onUpdate: (patch: Partial<FilterGroupType>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function FilterGroup({ group, onUpdate, onRemove, canRemove }: Props) {
  const toggleDay = (day: number) => {
    const next = group.days.includes(day)
      ? group.days.filter((d) => d !== day)
      : [...group.days, day];
    onUpdate({ days: next });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        {DAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => toggleDay(d.value)}
            style={{
              padding: "3px 7px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: group.days.includes(d.value) ? "#4285f4" : "#fff",
              color: group.days.includes(d.value) ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div style={{ width: 280, flexShrink: 0 }}>
        <TimeRangeSlider
          min={600}
          max={1260}
          valueMin={group.startTimeMin}
          valueMax={group.startTimeMax}
          onChange={(min, max) => onUpdate({ startTimeMin: min, startTimeMax: max })}
        />
      </div>

      <div style={{ marginLeft: "auto", flexShrink: 0, width: 28, height: 28 }}>
        {canRemove && (
          <button onClick={onRemove} style={{
            width: 28, height: 28,
            border: "1px dashed #ccc",
            borderRadius: 6,
            background: "transparent",
            cursor: "pointer",
            fontSize: 18,
            color: "#999",
            lineHeight: "1",
            padding: 0,
          }} title="Remove filter">
            &minus;
          </button>
        )}
      </div>
    </div>
  );
}
