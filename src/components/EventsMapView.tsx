import { EVENT_CATEGORIES, EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORY_COLORS = EVENT_CATEGORY_COLORS;

function createCategoryIcon(category: string): L.DivIcon {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
  const cat = EVENT_CATEGORIES.find((c) => c.value === category);
  const emoji = cat?.icon || "📅";

  return L.divIcon({
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
    html: `<div style="
      width:32px;height:40px;position:relative;display:flex;align-items:flex-start;justify-content:center;
    ">
      <div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;
      ">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${emoji}</span>
      </div>
    </div>`,
  });
}

const iconCache = new Map<string, L.DivIcon>();
function getCategoryIcon(category: string): L.DivIcon {
  if (!iconCache.has(category)) {
    iconCache.set(category, createCategoryIcon(category));
  }
  return iconCache.get(category)!;
}

interface GeocodedEvent {
  event: any;
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  const key = location.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    const res = await fetch(
      `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "socialpro-Events/1.0" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(key, result);
      return result;
    }
  } catch {
    // Geocoding failed silently
  }
  geocodeCache.set(key, null);
  return null;
}

function buildPopupHtml(ge: GeocodedEvent): string {
  const e = ge.event;
  const dateStr = format(new Date(e.event_date), "MMM d, yyyy 'at' h:mm a");

  let html = `<div style="min-width:200px;max-width:260px;font-family:system-ui,sans-serif;">`;
  if (e.cover_image_url) {
    html += `<img src="${e.cover_image_url}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`;
  }
  html += `<div style="font-size:13px;font-weight:700;line-height:1.3;">${e.title}</div>`;
  html += `<div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;font-weight:500;color:hsl(var(--primary));">📅 ${dateStr}</div>`;
  if (e.location) {
    html += `<div style="display:flex;align-items:center;gap:4px;margin-top:2px;font-size:11px;color:#888;">📍 ${e.location}</div>`;
  }
  if (e.source_name) {
    const icon = e.source_type === "group" ? "👥" : "📄";
    const href = e.source_type === "group" && e.group_id
      ? `/groups/${e.group_id}`
      : e.source_slug ? `/pages/${e.source_slug}` : null;
    if (href) {
      html += `<a data-nav-href="${href}" style="display:block;margin-top:4px;font-size:10px;font-weight:500;color:hsl(var(--primary));cursor:pointer;text-decoration:underline;text-underline-offset:2px;">${icon} ${e.source_name}</a>`;
    } else {
      html += `<div style="margin-top:4px;font-size:10px;font-weight:500;color:hsl(var(--primary));">${icon} ${e.source_name}</div>`;
    }
  }
  if (e.attendees && e.attendees.total > 0) {
    html += `<div style="margin-top:6px;font-size:10px;color:#888;">👥 ${e.attendees.going.length} going · ${e.attendees.interested.length} interested</div>`;
  }
  // View Event button — navigates to the dedicated event detail page
  html += `<a data-nav-href="/events/${e.id}" style="display:inline-block;margin-top:8px;padding:4px 12px;font-size:11px;font-weight:600;color:white;background:hsl(var(--primary));border-radius:6px;cursor:pointer;text-decoration:none;text-align:center;">View Event</a>`;
  html += `</div>`;
  return html;
}

interface EventsMapViewProps {
  events: any[];
}

const EventsMapView = ({ events }: EventsMapViewProps) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedCount, setFailedCount] = useState(0);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const eventsWithLocation = useMemo(
    () => events.filter((e: any) => e.location && e.location.trim().length > 0),
    [events]
  );

  // Geocode all events
  useEffect(() => {
    let cancelled = false;

    async function geocodeAll() {
      setLoading(true);
      const results: GeocodedEvent[] = [];
      let failed = 0;

      for (const event of eventsWithLocation) {
        if (cancelled) return;
        const coords = await geocodeLocation(event.location);
        if (coords) {
          results.push({ event, lat: coords.lat, lng: coords.lng });
        } else {
          failed++;
        }
        if (!geocodeCache.has(event.location.trim().toLowerCase())) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (!cancelled) {
        setGeocodedEvents(results);
        setFailedCount(failed);
        setLoading(false);
      }
    }

    if (eventsWithLocation.length > 0) {
      geocodeAll();
    } else {
      setGeocodedEvents([]);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [eventsWithLocation]);

  const filteredGeocodedEvents = useMemo(
    () => hiddenCategories.size === 0
      ? geocodedEvents
      : geocodedEvents.filter((ge) => !hiddenCategories.has(ge.event.category || "general")),
    [geocodedEvents, hiddenCategories]
  );

  const toggleCategory = useCallback((value: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const activeCategories = useMemo(() => {
    const cats = new Set(geocodedEvents.map((ge) => ge.event.category || "general"));
    return EVENT_CATEGORIES.filter((c) => cats.has(c.value));
  }, [geocodedEvents]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40, -30],
      zoom: 3,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Handle clicks on nav links inside popups
    const handlePopupClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-nav-href]");
      if (target) {
        e.preventDefault();
        navigate(target.dataset.navHref!);
      }
    };
    map.getContainer().addEventListener("click", handlePopupClick);

    return () => {
      map.getContainer().removeEventListener("click", handlePopupClick);
      map.remove();
      mapRef.current = null;
    };
  }, [loading, navigate]);

  // Update markers when filtered events change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (filteredGeocodedEvents.length === 0) return;

    // Add new markers
    const newMarkers = filteredGeocodedEvents.map((ge) => {
      const marker = L.marker([ge.lat, ge.lng], {
        icon: getCategoryIcon(ge.event.category || "general"),
      }).addTo(map);

      marker.bindPopup(buildPopupHtml(ge), { maxWidth: 280 });
      return marker;
    });

    markersRef.current = newMarkers;

    // Fit bounds
    const positions = filteredGeocodedEvents.map((ge) => [ge.lat, ge.lng] as [number, number]);
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [filteredGeocodedEvents]);

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-secondary/30 h-[500px] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Geocoding event locations...</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {eventsWithLocation.length} location{eventsWithLocation.length !== 1 ? "s" : ""} to resolve
          </p>
        </div>
      </div>
    );
  }

  if (geocodedEvents.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-secondary/30 h-[400px] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-foreground">No mappable events</p>
          <p className="text-sm text-muted-foreground mt-1">
            {eventsWithLocation.length === 0
              ? "None of the events have a location set"
              : "Could not resolve any event locations to coordinates"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {failedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          ⚠️ {failedCount} event{failedCount !== 1 ? "s" : ""} could not be placed on the map (vague location names)
        </p>
      )}
      <div
        ref={mapContainerRef}
        className="rounded-xl overflow-hidden border border-border h-[500px] z-0"
      />
      {activeCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 px-1">
          {activeCategories.map((cat) => {
            const isHidden = hiddenCategories.has(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${isHidden
                  ? "border-border text-muted-foreground/50 opacity-50"
                  : "border-border bg-secondary text-foreground"
                  }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border border-white/50 transition-opacity ${isHidden ? "opacity-30" : ""}`}
                  style={{ backgroundColor: CATEGORY_COLORS[cat.value] || CATEGORY_COLORS.general }}
                />
                {cat.icon} {cat.label}
                {!isHidden && (
                  <span className="text-muted-foreground ml-0.5">
                    ({geocodedEvents.filter((ge) => (ge.event.category || "general") === cat.value).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsMapView;
