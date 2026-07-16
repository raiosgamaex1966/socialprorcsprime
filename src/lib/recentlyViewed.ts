const STORAGE_KEY = "recently_viewed_listings";
const MAX_ITEMS = 8;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  viewedAt: number;
}

export const addRecentlyViewed = (item: Omit<RecentlyViewedItem, "viewedAt">) => {
  try {
    const existing: RecentlyViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const filtered = existing.filter((i) => i.id !== item.id);
    filtered.unshift({ ...item, viewedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
};

export const getRecentlyViewed = (): RecentlyViewedItem[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
