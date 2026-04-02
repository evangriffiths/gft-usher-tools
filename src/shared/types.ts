export enum ScreenNumber {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

export interface Shift {
  id?: number;
  screen: ScreenNumber;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  otherUshers: string[];
  slots: number;
}

export interface Screening {
  id?: number;
  filmName: string;
  startTime: string; // ISO 8601
  screen: ScreenNumber;
  checkoutUrl: string;
  durationMins: number;
}

export interface ShiftWithFilms extends Shift {
  films: Screening[];
}

export interface SyncStatus {
  shifts: string | null;     // ISO 8601 or null
  screenings: string | null; // ISO 8601 or null
}

export function isShiftFree(shift: Shift): boolean {
  return shift.otherUshers.length < shift.slots;
}
