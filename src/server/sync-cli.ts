import { getDb } from "./db.js";
import { syncShifts } from "./sync/shifts.js";
import { syncScreenings } from "./sync/screenings.js";

getDb();

const command = process.argv[2] ?? "all";

try {
  if (command === "shifts" || command === "all") {
    const result = await syncShifts();
    console.log(`Synced ${result.count} shifts`);
  }
  if (command === "screenings" || command === "all") {
    const result = await syncScreenings();
    console.log(`Synced ${result.count} screenings`);
  }
} catch (err: any) {
  console.error(`Sync failed: ${err.message}`);
  process.exit(1);
}
