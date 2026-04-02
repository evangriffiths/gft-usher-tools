import { parseShifts } from "../../data/sheet/parse.js";
import { upsertShifts, updateSyncStatus } from "../db.js";
import { format } from "date-fns";

export async function syncShifts(): Promise<{ count: number }> {
  const now = new Date();
  const prevMonth = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "MMMM");
  const currentMonth = format(now, "MMMM");
  const nextMonth = format(new Date(now.getFullYear(), now.getMonth() + 1, 1), "MMMM");

  const months = [prevMonth, currentMonth, nextMonth];
  console.log(`Syncing shifts for ${months.join(", ")}...`);
  const shifts = await parseShifts(months);
  console.log(`Parsed ${shifts.length} shifts`);

  upsertShifts(shifts);
  updateSyncStatus("shifts", true);

  return { count: shifts.length };
}
