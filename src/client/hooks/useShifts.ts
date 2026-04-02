import { useState, useEffect, useCallback } from "react";
import type { ShiftWithFilms, SyncStatus } from "../../shared/types.js";

const API_BASE = "/api";

export function useShifts() {
  const [shifts, setShifts] = useState<ShiftWithFilms[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ shifts: null, screenings: null });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/shifts`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      setShifts(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/status`);
      if (res.ok) setSyncStatus(await res.json());
    } catch {}
  }, []);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sync/all`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Sync failed");
      }
      await fetchShifts();
      await fetchSyncStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }, [fetchShifts, fetchSyncStatus]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSyncStatus();
      await fetchShifts();
      setLoading(false);
    })();
  }, [fetchShifts, fetchSyncStatus]);

  return { shifts, syncStatus, loading, syncing, error, syncAll };
}
