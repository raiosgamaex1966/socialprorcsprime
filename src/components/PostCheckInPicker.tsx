import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, X, Map, Satellite } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeocode } from "./profile/checkins/useGeocode";

interface PostCheckInPickerProps {
  location: string;
  onLocationChange: (location: string) => void;
  onClose: () => void;
}

const createPinIcon = () =>
  L.divIcon({
    className: "post-checkin-marker",
    html: `<div style="
      background: hsl(var(--primary));
      width: 30px; height: 30px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white;
      box-shadow: 0 3px 12px rgba(0,0,0,0.35);
      animation: checkin-pulse 2s ease-in-out infinite;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

const PostCheckInPicker = ({ location, onLocationChange, onClose }: PostCheckInPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const streetsRef = useRef<L.TileLayer | null>(null);
  const satRef = useRef<L.TileLayer | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const pendingMarker = useRef<{ lat: number; lng: number; name: string } | null>(null);
  const { results, searching, search, clear } = useGeocode();

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(val), 350);
  };

  const placeMarkerOnMap = useCallback((lat: number, lng: number, name: string, map: L.Map) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: createPinIcon() }).addTo(map);
    }
    markerRef.current.bindPopup(`<strong style="font-size:13px">${name}</strong>`).openPopup();
    map.flyTo([lat, lng], 14, { duration: 0.5 });
  }, []);

  const handleSelectResult = (r: { display_name: string; lat: string; lon: string }) => {
    const name = r.display_name.split(",").slice(0, 2).join(",").trim();
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    onLocationChange(name);
    setSearchQuery("");
    clear();

    if (leafletMap.current) {
      placeMarkerOnMap(lat, lng, name, leafletMap.current);
    } else {
      pendingMarker.current = { lat, lng, name };
    }
  };

  // Init map (always shown)
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const timeout = setTimeout(() => {
      if (!mapRef.current) return;
      const map = L.map(mapRef.current).setView([40, -100], 3);

      streetsRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      satRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: '&copy; Esri' }
      );

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: createPinIcon() }).addTo(map);
        }
      });

      leafletMap.current = map;

      // Place pending marker if any
      if (pendingMarker.current) {
        const { lat, lng, name } = pendingMarker.current;
        placeMarkerOnMap(lat, lng, name, map);
        pendingMarker.current = null;
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [onLocationChange, placeMarkerOnMap]);

  // Toggle map style
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !streetsRef.current || !satRef.current) return;
    if (mapStyle === "satellite") {
      map.removeLayer(streetsRef.current);
      map.addLayer(satRef.current);
    } else {
      map.removeLayer(satRef.current);
      map.addLayer(streetsRef.current);
    }
  }, [mapStyle]);

  return (
    <div className="mt-3 bg-secondary/40 rounded-xl border border-border/30 overflow-hidden">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Pesquisar por um local..."
            className="w-full bg-background/80 border border-border/50 rounded-lg pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
          {!searching && (searchQuery || location) && (
            <button
              onClick={() => { setSearchQuery(""); onLocationChange(""); clear(); if (markerRef.current && leafletMap.current) { leafletMap.current.removeLayer(markerRef.current); markerRef.current = null; } }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete results */}
        {results.length > 0 && (
          <div className="mt-1.5 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected location badge */}
      {location && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            <MapPin className="w-3 h-3" />
            {location}
          </div>
        </div>
      )}

      {/* Map (always visible) */}
      <div className="relative">
        <div ref={mapRef} className="h-[180px] w-full z-0" />
        <div className="absolute top-2 right-2 z-[1000] flex gap-1">
          <button
            onClick={() => setMapStyle((s) => s === "street" ? "satellite" : "street")}
            className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors flex items-center gap-1 shadow-sm"
          >
            {mapStyle === "street" ? <Satellite className="w-3 h-3" /> : <Map className="w-3 h-3" />}
            {mapStyle === "street" ? "Satélite" : "Mapa"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between border-t border-border/30">
        <p className="text-[11px] text-muted-foreground">Pesquise ou clique no mapa para fixar</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground font-medium">
          Concluído
        </button>
      </div>
    </div>
  );
};

export default PostCheckInPicker;
