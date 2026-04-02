import { getDb, getShiftsWithFilms, getSyncStatus, updateSyncStatus } from "./db.js";
import { syncShifts } from "./sync/shifts.js";
import { syncScreenings } from "./sync/screenings.js";
import { SERVER_PORT } from "../config.js";
import { existsSync } from "fs";
import { join } from "path";

// Initialize DB on startup
getDb();

const STATIC_DIR = join(import.meta.dir, "../client/dist");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

let syncInProgress = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN_MS = 5 * 60_000;

Bun.serve({
  port: SERVER_PORT,
  idleTimeout: 255, // seconds; sync can take a while
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // API routes
    if (path === "/api/shifts" && req.method === "GET") {
      const fromDate = new Date().toISOString();
      const shifts = getShiftsWithFilms(fromDate);
      return json(shifts);
    }

    if (path.startsWith("/api/sync/") && req.method === "POST" && path !== "/api/sync/status") {
      if (syncInProgress) return json({ error: "Sync already in progress" }, 409);
      const elapsed = Date.now() - lastSyncTime;
      if (elapsed < SYNC_COOLDOWN_MS) {
        const remainSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
        return json({ error: `Rate limited. Try again in ${remainSec}s` }, 429);
      }
    }

    if (path === "/api/sync/shifts" && req.method === "POST") {
      syncInProgress = true;
      try {
        const result = await syncShifts();
        lastSyncTime = Date.now();
        return json(result);
      } catch (err: any) {
        updateSyncStatus("shifts", false, err.message);
        return json({ error: err.message }, 500);
      } finally {
        syncInProgress = false;
      }
    }

    if (path === "/api/sync/screenings" && req.method === "POST") {
      syncInProgress = true;
      try {
        const result = await syncScreenings();
        lastSyncTime = Date.now();
        return json(result);
      } catch (err: any) {
        updateSyncStatus("screenings", false, err.message);
        return json({ error: err.message }, 500);
      } finally {
        syncInProgress = false;
      }
    }

    if (path === "/api/sync/all" && req.method === "POST") {
      syncInProgress = true;
      try {
        const shiftsResult = await syncShifts();
        let screeningsResult;
        try {
          screeningsResult = await syncScreenings();
        } catch (err: any) {
          updateSyncStatus("screenings", false, err.message);
          lastSyncTime = Date.now();
          return json({ shifts: shiftsResult.count, screeningsError: err.message });
        }
        lastSyncTime = Date.now();
        return json({ shifts: shiftsResult.count, screenings: screeningsResult.count });
      } catch (err: any) {
        updateSyncStatus("shifts", false, err.message);
        return json({ error: err.message }, 500);
      } finally {
        syncInProgress = false;
      }
    }

    if (path === "/api/sync/status" && req.method === "GET") {
      return json(getSyncStatus());
    }

    // Serve static files (production build)
    if (existsSync(STATIC_DIR)) {
      let filePath = join(STATIC_DIR, path === "/" ? "index.html" : path);
      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
      // SPA fallback
      return new Response(Bun.file(join(STATIC_DIR, "index.html")));
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Server running on http://localhost:${SERVER_PORT}`);
