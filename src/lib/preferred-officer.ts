import { emitClientEvent } from "@/lib/client-events";
import { preloadOfficerVideos } from "@/lib/officers/preload-officer-videos";
import { OFFICERS, type OfficerId } from "@/lib/officers-data";

export const PREFERRED_OFFICER_STORAGE_KEY = "honeypush-preferred-officer-v1";
export const PREFERRED_OFFICER_CHANGED_EVENT = "honeypush:preferred-officer-changed";

const VALID_IDS = new Set(OFFICERS.map((o) => o.id));

export function readPreferredOfficer(): OfficerId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFERRED_OFFICER_STORAGE_KEY);
    if (!raw) return null;
    return VALID_IDS.has(raw as OfficerId) ? (raw as OfficerId) : null;
  } catch {
    return null;
  }
}

export function setPreferredOfficer(id: OfficerId | null) {
  if (typeof window === "undefined") return;
  if (id === null) {
    localStorage.removeItem(PREFERRED_OFFICER_STORAGE_KEY);
  } else {
    localStorage.setItem(PREFERRED_OFFICER_STORAGE_KEY, id);
    void preloadOfficerVideos(id);
  }
  emitClientEvent(PREFERRED_OFFICER_CHANGED_EVENT);
}
