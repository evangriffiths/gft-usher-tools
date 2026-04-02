import type { ShiftWithFilms } from "../../shared/types.js";

export interface GlobalFilters {
  freeOnly: boolean;
  singleScreeningOnly: boolean;
  screens: number[];     // e.g. [1, 2, 3]
  films: string[];       // film names
}

export interface FilterGroup {
  id: string;
  days: number[];            // 0=Sun, 1=Mon, ..., 6=Sat
  startTimeMin: number;      // minutes from midnight, e.g. 600 = 10am
  startTimeMax: number;      // e.g. 1260 = 9pm
}

export const DEFAULT_FILTER_GROUP: Omit<FilterGroup, "id"> = {
  days: [],
  startTimeMin: 600,   // 10am
  startTimeMax: 1260,  // 9pm
};

function getShiftDayOfWeek(s: ShiftWithFilms): number {
  return new Date(s.startTime).getDay();
}

function getShiftStartMinutes(s: ShiftWithFilms): number {
  const d = new Date(s.startTime);
  return d.getHours() * 60 + d.getMinutes();
}

function matchesGlobal(shift: ShiftWithFilms, g: GlobalFilters): boolean {
  if (g.freeOnly && shift.otherUshers.length >= shift.slots) return false;
  if (g.singleScreeningOnly && shift.films.length > 1) return false;
  if (g.screens.length > 0 && !g.screens.includes(shift.screen)) return false;
  if (g.films.length > 0) {
    if (!shift.films.some((f) => g.films.includes(f.filmName))) return false;
  }
  return true;
}

function matchesGroup(shift: ShiftWithFilms, group: FilterGroup): boolean {
  if (group.days.length > 0 && !group.days.includes(getShiftDayOfWeek(shift))) return false;

  const startMin = getShiftStartMinutes(shift);
  if (startMin < group.startTimeMin || startMin > group.startTimeMax) return false;

  return true;
}

export function applyFilters(
  shifts: ShiftWithFilms[],
  global: GlobalFilters,
  groups: FilterGroup[]
): ShiftWithFilms[] {
  return shifts.filter((shift) => {
    if (!matchesGlobal(shift, global)) return false;
    const hasActiveGroups = groups.some(
      (g) =>
        g.days.length > 0 ||
        g.startTimeMin > 600 ||
        g.startTimeMax < 1260
    );
    if (!hasActiveGroups) return true;
    return groups.some((group) => matchesGroup(shift, group));
  });
}

export function getAvailableFilms(shifts: ShiftWithFilms[]): string[] {
  const films = new Set<string>();
  for (const s of shifts) {
    for (const f of s.films) films.add(f.filmName);
  }
  return [...films].sort();
}

export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
