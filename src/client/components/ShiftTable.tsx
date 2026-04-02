import type { ShiftWithFilms } from "../../shared/types.js";

interface Props {
  shifts: ShiftWithFilms[];
  totalCount: number;
}

export function ShiftTable({ shifts: unsorted, totalCount }: Props) {
  const shifts = [...unsorted].sort((a, b) => {
    const dateA = a.startTime.slice(0, 10);
    const dateB = b.startTime.slice(0, 10);
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    if (a.screen !== b.screen) return a.screen - b.screen;
    return a.startTime < b.startTime ? -1 : 1;
  });

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
        Showing {shifts.length} of {totalCount} shifts
      </p>
      <div style={{ overflowX: "auto" }}>
      <table style={{ minWidth: 750, width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 110 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 70 }} />
          <col />
          <col style={{ width: 100 }} />
          <col style={{ width: 180 }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Screen</th>
            <th style={thStyle}>Film(s)</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Ushers</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s, i) => {
            const free = s.otherUshers.length < s.slots;
            return (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{fmtDate(s.startTime)}</td>
                <td style={tdStyle}>{fmt(s.startTime)}-{fmt(s.endTime)}</td>
                <td style={tdStyle}>
                  <span style={{ ...screenBadge, background: screenColor(s.screen) }}>
                    S{s.screen}
                  </span>
                </td>
                <td style={tdStyle}>
                  {s.films.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.films.map((f, j) => (
                        <a
                          key={j}
                          href={f.checkoutUrl}
                          target="_blank"
                          rel="noopener"
                          style={filmBadge}
                        >
                          {f.filmName}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#999" }}>-</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{ color: free ? "#0a7" : "#c00", fontWeight: 500 }}>
                    {free ? `Free (${s.slots - s.otherUshers.length}/${s.slots})` : "Full"}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 12 }}>
                  {s.otherUshers.length > 0 ? s.otherUshers.join(", ") : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function screenColor(screen: number): string {
  switch (screen) {
    case 1: return "#ffd966";
    case 2: return "#4285f4";
    case 3: return "#ff00ff";
    default: return "#ccc";
  }
}

const thStyle: React.CSSProperties = { padding: "8px 6px", fontSize: 12, textTransform: "uppercase", color: "#666" };
const tdStyle: React.CSSProperties = { padding: "8px 6px" };
const screenBadge: React.CSSProperties = { padding: "2px 8px", borderRadius: 4, color: "#fff", fontWeight: 600, fontSize: 12 };
const filmBadge: React.CSSProperties = {
  display: "inline-block", padding: "2px 8px", borderRadius: 4,
  background: "#e8f0fe", color: "#1a73e8", fontSize: 12,
  textDecoration: "none", whiteSpace: "nowrap",
};
