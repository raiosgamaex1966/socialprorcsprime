const STORAGE_KEY = "ad_impressions";
const DEFAULT_MAX_IMPRESSIONS = 5;
const WINDOW_HOURS = 24;

interface ImpressionRecord {
  count: number;
  firstSeen: number;
}

function getRecords(): Record<string, ImpressionRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function pruneExpired(records: Record<string, ImpressionRecord>): Record<string, ImpressionRecord> {
  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const pruned: Record<string, ImpressionRecord> = {};
  for (const [id, rec] of Object.entries(records)) {
    if (rec.firstSeen > cutoff) pruned[id] = rec;
  }
  return pruned;
}

export function recordImpression(adId: string): void {
  const records = pruneExpired(getRecords());
  const existing = records[adId];
  records[adId] = {
    count: (existing?.count || 0) + 1,
    firstSeen: existing?.firstSeen || Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function isAdCapped(adId: string, maxImpressions: number = DEFAULT_MAX_IMPRESSIONS): boolean {
  const records = pruneExpired(getRecords());
  return (records[adId]?.count || 0) >= maxImpressions;
}

export function filterCappedAds<T extends { id: string; frequency_cap?: number }>(ads: T[]): T[] {
  const records = pruneExpired(getRecords());
  return ads.filter((ad) => {
    const cap = ad.frequency_cap ?? DEFAULT_MAX_IMPRESSIONS;
    return (records[ad.id]?.count || 0) < cap;
  });
}

export function getImpressionCount(adId: string): number {
  const records = pruneExpired(getRecords());
  return records[adId]?.count || 0;
}

export { DEFAULT_MAX_IMPRESSIONS };
