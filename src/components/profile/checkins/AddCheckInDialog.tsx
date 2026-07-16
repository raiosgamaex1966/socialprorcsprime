import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createAddMarkerIcon } from "./CheckInMarker";
import { useGeocode } from "./useGeocode";

interface AddCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, lat: number, lng: number, note?: string) => void;
  trigger: React.ReactNode;
}

const AddCheckInDialog = ({ open, onOpenChange, onAdd, trigger }: AddCheckInDialogProps) => {
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const addMapRef = useRef<HTMLDivElement>(null);
  const addLeafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { results, searching, search, clear } = useGeocode();

  const placeMarker = useCallback((lat: number, lng: number, map: L.Map) => {
    setSelectedPos({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: createAddMarkerIcon() }).addTo(map);
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 12), { duration: 0.5 });
  }, []);

  useEffect(() => {
    if (!open || !addMapRef.current || addLeafletMap.current) return;

    const timeout = setTimeout(() => {
      if (!addMapRef.current) return;
      const map = L.map(addMapRef.current).setView([40, -100], 4);

      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; Esri',
      });

      streets.addTo(map);
      L.control.layers({ "Street": streets, "Satellite": satellite }, {}, { position: "topright" }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng, map);
      });

      addLeafletMap.current = map;
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (addLeafletMap.current) {
        addLeafletMap.current.remove();
        addLeafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [open, placeMarker]);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(val), 350);
  };

  const handleSelectResult = (r: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (addLeafletMap.current) {
      placeMarker(lat, lng, addLeafletMap.current);
    }
    setNewName(r.display_name.split(",")[0]);
    setSearchQuery("");
    clear();
  };

  const handleAdd = () => {
    if (!selectedPos || !newName.trim()) return;
    onAdd(newName.trim(), selectedPos.lat, selectedPos.lng, newNote.trim() || undefined);
    onOpenChange(false);
    setNewName("");
    setNewNote("");
    setSearchQuery("");
    setSelectedPos(null);
    clear();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Novo Check-in
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Geocoding search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por um local..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
            {results.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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

          <Input
            placeholder="Nome da localização (ex: Parque Ibirapuera)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Nota (opcional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Pesquise acima ou clique no mapa para fixar sua localização</p>
          <div ref={addMapRef} className="h-[250px] rounded-lg border border-border overflow-hidden z-0" />
          {selectedPos && (
            <p className="text-xs text-muted-foreground">
              📍 {selectedPos.lat.toFixed(4)}, {selectedPos.lng.toFixed(4)}
            </p>
          )}
          <Button onClick={handleAdd} disabled={!selectedPos || !newName.trim()} className="w-full">
            Salvar Check-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCheckInDialog;
