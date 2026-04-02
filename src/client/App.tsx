import { useState, useMemo } from "react";
import { useShifts } from "./hooks/useShifts.js";
import { GlobalFilters as GlobalFiltersPanel } from "./components/GlobalFilters.js";
import { FilterGroupList } from "./components/FilterGroupList.js";
import { ShiftTable } from "./components/ShiftTable.js";
import {
  applyFilters,
  getAvailableFilms,
  type GlobalFilters,
  type FilterGroup,
  DEFAULT_FILTER_GROUP,
} from "./lib/filters.js";


let nextGroupId = 1;

export function App() {
  const { shifts, syncStatus, loading, syncing, error, syncAll } = useShifts();

  const [global, setGlobal] = useState<GlobalFilters>({
    freeOnly: true,
    singleScreeningOnly: false,
    screens: [],
    films: [],
  });

  const [groups, setGroups] = useState<FilterGroup[]>([
    { id: String(nextGroupId++), ...DEFAULT_FILTER_GROUP },
  ]);

  const availableFilms = useMemo(() => getAvailableFilms(shifts), [shifts]);
  const filtered = useMemo(() => applyFilters(shifts, global, groups), [shifts, global, groups]);


  const addGroup = () => {
    setGroups((g) => [...g, { id: String(nextGroupId++), ...DEFAULT_FILTER_GROUP }]);
  };

  const updateGroup = (id: string, patch: Partial<FilterGroup>) => {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const removeGroup = (id: string) => {
    setGroups((gs) => {
      const next = gs.filter((g) => g.id !== id);
      return next.length === 0
        ? [{ id: String(nextGroupId++), ...DEFAULT_FILTER_GROUP }]
        : next;
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>GFT Usher Shifts</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SyncIndicator label="Shifts" entry={syncStatus.shifts} />
          <SyncIndicator label="Films" entry={syncStatus.screenings} />
          {(() => {
            const lastSync = syncStatus.shifts.lastSyncedAt;
            const cooldownMs = 5 * 60_000;
            const onCooldown = lastSync ? Date.now() - new Date(lastSync).getTime() < cooldownMs : false;
            const disabled = syncing || onCooldown;
            const remainMin = lastSync ? Math.ceil((cooldownMs - (Date.now() - new Date(lastSync).getTime())) / 60_000) : 0;
            const btn = (
              <button onClick={syncAll} disabled={disabled} style={{ ...btnStyle, opacity: disabled ? 0.5 : 1 }}>
                {syncing ? "Syncing..." : "Sync Shifts"}
              </button>
            );
            return onCooldown
              ? <Tooltip text={`Next sync can run in ${remainMin} minute${remainMin !== 1 ? "s" : ""}`}>{btn}</Tooltip>
              : btn;
          })()}
        </div>
      </header>

      {error && <div style={{ background: "#fee", color: "#c00", padding: 8, borderRadius: 4, marginBottom: 12 }}>{error}</div>}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16, overflow: "hidden" }}>
        <GlobalFiltersPanel
          value={global}
          onChange={setGlobal}
          availableFilms={availableFilms}
        />

        <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "10px 0" }} />

        <FilterGroupList
          groups={groups}
          onUpdate={updateGroup}
          onRemove={removeGroup}
          onAdd={addGroup}
        />
      </div>

      {loading ? (
        <p>Loading shifts...</p>
      ) : shifts.length === 0 ? (
        <p>No shifts loaded. Click <b>Sync</b> to fetch data.</p>
      ) : (
        <ShiftTable shifts={filtered} allShifts={shifts} totalCount={shifts.length} />
      )}
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span style={{ position: "relative" }} className="tip">
      {children}
      <span className="tip-text" style={{
        display: "none", position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
        transform: "translateX(-50%)", background: "#333", color: "#fff", fontSize: 12,
        padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap", zIndex: 20,
      }}>{text}</span>
      <style>{`.tip:hover .tip-text { display: block !important; }`}</style>
    </span>
  );
}

function SyncIndicator({ label, entry }: { label: string; entry: import("../shared/types.js").SyncEntry }) {
  if (!entry.lastSyncedAt) return null;
  const color = entry.ok ? "#22c55e" : "#ef4444";
  const time = new Date(entry.lastSyncedAt).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const tip = entry.ok ? `Synced ${time}` : `Failed ${time}: ${entry.error}`;
  return (
    <Tooltip text={tip}>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888", cursor: "default" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
        {label}
      </span>
    </Tooltip>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 16px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};
