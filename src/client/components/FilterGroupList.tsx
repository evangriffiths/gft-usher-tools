import type { FilterGroup as FilterGroupType } from "../lib/filters.js";
import { FilterGroup } from "./FilterGroup.js";

interface Props {
  groups: FilterGroupType[];
  onUpdate: (id: string, patch: Partial<FilterGroupType>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export function FilterGroupList({ groups, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.id}>
          {i > 0 && (
            <div style={{ textAlign: "center", color: "#999", fontStyle: "italic", fontSize: 12, padding: "0" }}>
              OR
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <FilterGroup
                group={g}
                onUpdate={(patch) => onUpdate(g.id, patch)}
                onRemove={() => onRemove(g.id)}
                canRemove={groups.length > 1}
              />
            </div>
            {i === groups.length - 1 && (
              <button
                onClick={onAdd}
                style={{
                  width: 28, height: 28,
                  border: "1px dashed #ccc",
                  borderRadius: 6,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#999",
                  flexShrink: 0,
                  lineHeight: "1",
                }}
                title="Add another schedule filter (OR)"
              >
                +
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
