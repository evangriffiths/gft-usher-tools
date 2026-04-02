import { getScreeningsForDates } from "../../data/scraper/api.js";
import { getDb, upsertScreenings, updateSyncStatus } from "../db.js";
import { format, addDays, startOfTomorrow } from "date-fns";

export async function syncScreenings(): Promise<{ count: number }> {
  // Get unique dates from shifts in the DB
  const db = getDb();
  const tomorrow = startOfTomorrow().toISOString();
  const rows = db
    .query(
      `SELECT DISTINCT substr(start_time, 1, 10) as date_str
       FROM shifts
       WHERE start_time >= ?
       ORDER BY date_str`
    )
    .all(tomorrow) as { date_str: string }[];

  const dates = rows.map((r) => r.date_str);
  console.log(`Syncing screenings for ${dates.length} dates...`);

  const screenings = await getScreeningsForDates(dates);
  console.log(`Fetched ${screenings.length} screenings`);

  upsertScreenings(screenings);
  updateSyncStatus("screenings");

  return { count: screenings.length };
}
