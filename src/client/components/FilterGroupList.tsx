import type { FilterGroup as FilterGroupType } from "../lib/filters.js";
import { FilterGroup } from "./FilterGroup.js";

interface Props {
  groups: FilterGroupType[];
  onUpdate: (id: string, patch: Partial<FilterGroupType>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28,
  border: "1px dashed #ccc",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  color: "#999",
  lineHeight: "1",
  padding: 0,
  flexShrink: 0,
};

export function FilterGroupList({ groups, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.id}>
          {i > 0 && (
            <div style={{ textAlign: "center", color: "#999", fontStyle: "italic", fontSize: 12 }}>
              OR
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FilterGroup
                group={g}
                onUpdate={(patch) => onUpdate(g.id, patch)}
              />
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {groups.length > 1 && (
                <button onClick={() => onRemove(g.id)} style={iconBtn} title="Remove filter">
                  &minus;
                </button>
              )}
              {i === groups.length - 1 && (
                <button onClick={onAdd} style={iconBtn} title="Add another schedule filter (OR)">
                  +
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
