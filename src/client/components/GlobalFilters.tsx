import { useRef, useEffect } from "react";
import type { GlobalFilters as GlobalFiltersType } from "../lib/filters.js";

interface Props {
  value: GlobalFiltersType;
  onChange: (v: GlobalFiltersType) => void;
  availableFilms: string[];
}

export function GlobalFilters({ value, onChange, availableFilms }: Props) {
  const toggle = (key: keyof GlobalFiltersType, val: string | number | boolean) => {
    if (key === "freeOnly" || key === "singleScreeningOnly") {
      onChange({ ...value, [key]: val as boolean });
      return;
    }
    const arr = value[key] as (string | number)[];
    const next = arr.includes(val as any)
      ? arr.filter((v) => v !== val)
      : [...arr, val as any];
    onChange({ ...value, [key]: next });
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={value.freeOnly}
          onChange={(e) => toggle("freeOnly", e.target.checked)}
        />
        Free only
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={value.singleScreeningOnly}
          onChange={(e) => toggle("singleScreeningOnly", e.target.checked)}
        />
        Single screening only
      </label>

      <MultiSelect
        label="Screen"
        options={[1, 2, 3].map((n) => ({ value: n, label: `S${n}` }))}
        selected={value.screens}
        onToggle={(v) => toggle("screens", v)}
      />

      <MultiSelect
        label="Film"
        options={availableFilms.map((f) => ({ value: f, label: f }))}
        selected={value.films}
        onToggle={(v) => toggle("films", v)}
      />
    </div>
  );
}

function MultiSelect<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) {
        ref.current.open = false;
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <details ref={ref} style={{ position: "relative" }}>
        <summary style={{ cursor: "pointer", userSelect: "none", fontSize: 14 }}>
          {label}
          {selected.length > 0 && (
            <span style={{ marginLeft: 4, background: "#4285f4", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 12 }}>
              {selected.length}
            </span>
          )}
        </summary>
        <div style={{
          position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #ddd",
          borderRadius: 4, padding: 6, maxHeight: 250, overflowY: "auto", minWidth: 180,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          {options.map((o) => (
            <label key={String(o.value)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0", cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
