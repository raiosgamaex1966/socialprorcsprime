import { useState, useCallback } from "react";

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const useGeocode = () => {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: GeoResult[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, searching, search, clear };
};
