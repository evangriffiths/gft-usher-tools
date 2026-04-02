import { Shift, Screening, ShiftWithFilms } from "../../shared/types.js";

// A film belongs to a shift if:
// - Same screen
// - Film starts after the shift starts (with at least 5 min buffer for ushering)
// - Film ends before the shift ends
const MIN_OFFSET_MINS = 5;

export function matchShiftsToFilms(
  shifts: Shift[],
  screenings: Screening[]
): ShiftWithFilms[] {
  return shifts.map((shift) => {
    const shiftStartMs = new Date(shift.startTime).getTime();
    const shiftEndMs = new Date(shift.endTime).getTime();

    const films = screenings.filter((s) => {
      if (s.screen !== shift.screen) return false;
      const filmStartMs = new Date(s.startTime).getTime();
      const filmEndMs = filmStartMs + s.durationMins * 60_000;
      return (
        filmStartMs >= shiftStartMs + MIN_OFFSET_MINS * 60_000 &&
        filmEndMs <= shiftEndMs
      );
    });

    // Sort by start time
    films.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return { ...shift, films };
  });
}
