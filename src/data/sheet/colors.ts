import { ScreenNumber } from "../../shared/types.js";

// Known ARGB values from the spreadsheet
const SCREEN_ARGB: Record<string, ScreenNumber> = {
  FFFFD966: ScreenNumber.ONE,   // Yellow
  FF4285F4: ScreenNumber.TWO,   // Blue
  FFFF00FF: ScreenNumber.THREE, // Pink
};

const BLACK_ARGB = "FF000000";
const GRAY_ARGB = "FFCCCCCC";

export function argbToScreen(argb: string | undefined): ScreenNumber | null {
  if (!argb) return null;
  const upper = argb.toUpperCase();
  return SCREEN_ARGB[upper] ?? nearestScreen(upper);
}

export function isBlack(argb: string | undefined): boolean {
  if (!argb) return false;
  return argb.toUpperCase() === BLACK_ARGB || brightness(argb) < 30;
}

export function isGray(argb: string | undefined): boolean {
  if (!argb) return false;
  return argb.toUpperCase() === GRAY_ARGB;
}

function brightness(argb: string): number {
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r + g + b) / 3;
}

// Reference RGB values for fuzzy matching
const SCREEN_RGB: [ScreenNumber, number, number, number][] = [
  [ScreenNumber.ONE, 0xFF, 0xD9, 0x66],   // Yellow
  [ScreenNumber.TWO, 0x42, 0x85, 0xF4],   // Blue
  [ScreenNumber.THREE, 0xFF, 0x00, 0xFF], // Pink
];

function nearestScreen(argb: string): ScreenNumber | null {
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  let best: ScreenNumber | null = null;
  let bestDist = 150; // max distance threshold
  for (const [screen, sr, sg, sb] of SCREEN_RGB) {
    const dist = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = screen;
    }
  }
  return best;
}
