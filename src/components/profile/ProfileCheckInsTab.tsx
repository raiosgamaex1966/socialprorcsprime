import { useState, useEffect, useRef } from "react";
import { MapPin, Plus, Map, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { createCheckInIcon } from "./checkins/CheckInMarker";
import CheckInList from "./checkins/CheckInList";
import AddCheckInDialog from "./checkins/AddCheckInDialog";

interface CheckIn {
  id: string;
  name: string;
  lat: number;
  lng: number;
  date: string;
  note?: string;
}

const ProfileCheckInsTab = ({ isOwn }: { isOwn: boolean }) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const clusterGroup = useRef<L.MarkerClusterGroup | null>(null);
  const streetsLayer = useRef<L.TileLayer | null>(null);
  const satelliteLayer = useRef<L.TileLayer | null>(null);

  // Main map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current).setView([20, 0], 2);

    streetsLayer.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    satelliteLayer.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: '&copy; Esri' }
    );

    clusterGroup.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          html: `<div style="
            background: hsl(var(--primary));
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: ${size < 40 ? 13 : 15}px;
            border: 3px solid white;
            box-shadow: 0 3px 12px rgba(0,0,0,0.35);
          ">${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(size, size),
        });
      },
    });
    map.addLayer(clusterGroup.current);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      clusterGroup.current = null;
    };
  }, []);

  // Toggle map style
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !streetsLayer.current || !satelliteLayer.current) return;

    if (mapStyle === "satellite") {
      map.removeLayer(streetsLayer.current);
      map.addLayer(satelliteLayer.current);
    } else {
      map.removeLayer(satelliteLayer.current);
      map.addLayer(streetsLayer.current);
    }
  }, [mapStyle]);

  // Update markers when check-ins change
  useEffect(() => {
    const cluster = clusterGroup.current;
    if (!cluster) return;

    cluster.clearLayers();

    checkIns.forEach((ci) => {
      const marker = L.marker([ci.lat, ci.lng], { icon: createCheckInIcon() });
      marker.bindPopup(
        `<div style="min-width:140px">
          <strong style="font-size:14px">${ci.name}</strong>
          ${ci.note ? `<br/><span style="font-size:12px;color:#888">${ci.note}</span>` : ""}
          <br/><span style="font-size:11px;color:#aaa">${new Date(ci.date).toLocaleDateString()}</span>
        </div>`
      );
      cluster.addLayer(marker);
    });

    if (checkIns.length > 0 && leafletMap.current) {
      const bounds = L.latLngBounds(checkIns.map((ci) => [ci.lat, ci.lng] as [number, number]));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [checkIns]);

  const handleAdd = (name: string, lat: number, lng: number, note?: string) => {
    const newCheckIn: CheckIn = {
      id: crypto.randomUUID(),
      name,
      lat,
      lng,
      date: new Date().toISOString(),
      note,
    };
    setCheckIns((prev) => [newCheckIn, ...prev]);
  };

  const removeCheckIn = (id: string) => {
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Check-Ins
            {checkIns.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {checkIns.length}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {/* Map style toggle */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setMapStyle((s) => (s === "street" ? "satellite" : "street"))}
            >
              {mapStyle === "street" ? (
                <>
                  <Satellite className="w-3.5 h-3.5" /> Satellite
                </>
              ) : (
                <>
                  <Map className="w-3.5 h-3.5" /> Street
                </>
              )}
            </Button>

            {isOwn && (
              <AddCheckInDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onAdd={handleAdd}
                trigger={
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Check-In
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} className="h-[300px] w-full z-0" />
      </div>

      {/* Check-in list */}
      <CheckInList checkIns={checkIns} isOwn={isOwn} onRemove={removeCheckIn} />
    </div>
  );
};

export default ProfileCheckInsTab;
