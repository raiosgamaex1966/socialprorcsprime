import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  title: string;
  media_formats: {
    gif: { url: string; dims: number[] };
    tinygif: { url: string; dims: number[] };
  };
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const { data, error: fnError } = await supabase.functions.invoke("tenor-proxy", {
        body: null,
        method: "GET",
        headers: {},
      });

      // Use fetch directly since supabase.functions.invoke doesn't support query params well for GET
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/tenor-proxy?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        setGifs([]);
      } else {
        setGifs(json.results || []);
      }
    } catch (err: any) {
      setError("Falha ao carregar GIFs");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute bottom-12 right-0 w-[340px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Escolha um GIF</span>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar no Tenor"
            className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="h-[280px] overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-muted-foreground text-center">{error}</p>
          </div>
        )}
        {!loading && !error && gifs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Nenhum GIF encontrado</p>
          </div>
        )}
        {!loading && !error && gifs.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.media_formats.gif.url)}
                className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={gif.media_formats.tinygif.url}
                  alt={gif.title}
                  className="w-full h-[100px] object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-border flex justify-center">
        <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
      </div>
    </div>
  );
};

export default GifPicker;
