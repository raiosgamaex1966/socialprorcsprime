import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, X, MapPin, Grid3X3, Image, Heart, Pencil, Trash2, Package, MoreVertical, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Clock, Star, CheckSquare, Square, Zap, BadgeCheck } from "lucide-react";
import TrendingListings from "@/components/TrendingListings";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import RecommendedListings from "@/components/RecommendedListings";
import SellerDashboard from "@/components/SellerDashboard";
import PromoteListingModal from "@/components/PromoteListingModal";
import ListingTemplates from "@/components/ListingTemplates";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recentlyViewed";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditListingModal from "@/components/EditListingModal";
import { Badge } from "@/components/ui/badge";
import AppPageShell from "@/components/AppPageShell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const categories = ["General", "Electronics", "Vehicles", "Furniture", "Clothing", "Sports", "Home & Garden", "Other"];
const conditions = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

const CATEGORY_MAP: Record<string, string> = {
  "General": "Geral",
  "Electronics": "Eletrônicos",
  "Vehicles": "Veículos",
  "Furniture": "Móveis",
  "Clothing": "Roupas",
  "Sports": "Esportes",
  "Home & Garden": "Casa e Jardim",
  "Other": "Outro"
};

const CONDITION_MAP: Record<string, string> = {
  "New": "Novo",
  "Used - Like New": "Usado - Como novo",
  "Used - Good": "Usado - Bom estado",
  "Used - Fair": "Usado - Aceitável"
};

const Marketplace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"browse" | "my">("browse");
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high">("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [myFilter, setMyFilter] = useState<"active" | "sold">("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Edit / delete / promote state
  const [editListing, setEditListing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [promoteListing, setPromoteListing] = useState<any>(null);
  

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [condition, setCondition] = useState("Used - Good");
  const [location, setLocation] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [searchQuery, filterCategory, filterCondition, sortBy, minPrice, maxPrice, locationFilter]);

  // Blocked users
  const { data: blockedUserIds = new Set<string>() } = useQuery({
    queryKey: ["blocked-user-ids", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
      return new Set((data || []).map((b: any) => b.blocked_id));
    },
    enabled: !!user,
  });

  // Browse listings
  const { data: listingsData } = useQuery({
    queryKey: ["listings", searchQuery, filterCategory, filterCondition, sortBy, minPrice, maxPrice, locationFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("status", "active");

      if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (sortBy === "price_low") query = query.order("price", { ascending: true });
      else if (sortBy === "price_high") query = query.order("price", { ascending: false });

      if (searchQuery.trim()) query = query.ilike("title", `%${searchQuery}%`);
      if (filterCategory) query = query.eq("category", filterCategory);
      if (filterCondition) query = query.eq("condition", filterCondition);
      if (minPrice) query = query.gte("price", parseFloat(minPrice));
      if (maxPrice) query = query.lte("price", parseFloat(maxPrice));
      if (locationFilter.trim()) query = query.ilike("location", `%${locationFilter.trim()}%`);

      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      // Filter out blocked users' listings client-side
      const items = (data || []).filter((l: any) => !blockedUserIds.has(l.user_id));

      // Fetch seller ratings for all unique seller IDs
      const sellerIds = [...new Set(items.map((l: any) => l.user_id))];
      let sellerRatings: Record<string, { avg: number; count: number }> = {};
      if (sellerIds.length > 0) {
        const { data: reviews } = await supabase
          .from("seller_reviews")
          .select("seller_id, rating")
          .in("seller_id", sellerIds);
        if (reviews) {
          const grouped: Record<string, number[]> = {};
          reviews.forEach((r: any) => {
            if (!grouped[r.seller_id]) grouped[r.seller_id] = [];
            grouped[r.seller_id].push(r.rating);
          });
          for (const [id, ratings] of Object.entries(grouped)) {
            sellerRatings[id] = {
              avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
              count: ratings.length,
            };
          }
        }
      }

      return { items, total: count || 0, sellerRatings };
    },
    enabled: !!user,
  });

  // My listings
  const { data: myListings } = useQuery({
    queryKey: ["my-listings", user?.id, myFilter],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", myFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && activeTab === "my",
  });

  // Active promoted listing IDs
  const { data: promotedIds = new Set<string>() } = useQuery({
    queryKey: ["promoted-listing-ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promoted_listings")
        .select("listing_id")
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString());
      return new Set((data || []).map((p: any) => p.listing_id));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Verified sellers lookup
  const { data: verifiedSet = new Set<string>() } = useQuery({
    queryKey: ["verified-sellers-set"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("verified_sellers").select("user_id");
      return new Set((data || []).map((v: any) => v.user_id));
    },
    enabled: !!user,
    staleTime: 120000,
  });

  // Saved listings lookup
  const { data: savedSet } = useQuery({
    queryKey: ["saved-listings-set", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase.from("saved_listings").select("listing_id").eq("user_id", user.id);
      return new Set((data || []).map((s: any) => s.listing_id));
    },
    enabled: !!user,
  });

  const toggleSave = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const saved = savedSet?.has(listingId);
    if (saved) {
      await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", listingId);
    } else {
      await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: listingId });
    }
    queryClient.invalidateQueries({ queryKey: ["saved-listings-set", user.id] });
    queryClient.invalidateQueries({ queryKey: ["saved-listings"] });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - imageFiles.length;
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) { toast.error("Cada imagem deve ser menor que 5MB"); return; }
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));
    setImageFiles(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setPrice(""); setCategory("General");
    setCondition("Used - Good"); setLocation("");
    imagePreviews.forEach(p => URL.revokeObjectURL(p));
    setImageFiles([]); setImagePreviews([]); setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !price || !user) return;
    setCreating(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("listing-images").upload(path, file);
        if (uploadErr) throw uploadErr;
        uploadedUrls.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
      }

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category,
        condition,
        location: location.trim() || null,
        image_url: uploadedUrls[0] || null,
        image_urls: uploadedUrls,
      });
      if (error) throw error;
      toast.success("Anúncio criado!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    } catch (error: any) {
      toast.error(error.message || "Falha ao criar anúncio");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    const { error } = await supabase.from("listings").delete().eq("id", deleteId).eq("user_id", user.id);
    if (error) {
      toast.error("Falha ao excluir anúncio");
    } else {
      toast.success("Anúncio excluído");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    }
    setDeleteId(null);
  };

  const handleMarkAsSold = async (listingId: string) => {
    if (!user) return;
    const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listingId).eq("user_id", user.id);
    if (error) {
      toast.error("Falha ao atualizar anúncio");
    } else {
      toast.success("Marcado como vendido");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    }
  };

  const handleReactivate = async (listingId: string) => {
    if (!user) return;
    const { error } = await supabase.from("listings").update({ status: "active" }).eq("id", listingId).eq("user_id", user.id);
    if (error) {
      toast.error("Falha ao reativar anúncio");
    } else {
      toast.success("Anúncio reativado!");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    }
  };

  const renderListingCard = (listing: any, isOwner: boolean, sellerRating?: { avg: number; count: number }) => {
    const thumb = listing.image_url || (listing.image_urls && listing.image_urls[0]);
    const imageCount = ((listing.image_urls as string[]) || []).length || (listing.image_url ? 1 : 0);
    const saved = savedSet?.has(listing.id);

    return (
      <div key={listing.id} className="bg-card rounded-lg shadow-sm overflow-hidden group relative">
        <Link to={`/marketplace/${listing.id}`}>
          <div className="h-48 bg-secondary relative">
            {thumb ? (
              <img src={thumb} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {imageCount > 1 && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                {imageCount} fotos
              </span>
            )}
            {promotedIds.has(listing.id) && listing.status !== "sold" && (
              <Badge className="absolute top-2 left-2 text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0 gap-0.5 z-10">
                <Zap className="w-2.5 h-2.5" /> Patrocinado
              </Badge>
            )}
            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge variant="secondary" className="text-sm font-bold bg-card/90">VENDIDO</Badge>
              </div>
            )}
            {!isOwner && (
              <button
                onClick={(e) => toggleSave(e, listing.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Heart className={`w-4 h-4 ${saved ? "fill-red-500 text-red-500" : "text-foreground"}`} />
              </button>
            )}
          </div>
        </Link>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/marketplace/${listing.id}`} className="flex-1 min-w-0">
              <p className="text-xl font-bold text-foreground">R$ {Number(listing.price).toLocaleString()}</p>
              <p className="text-[15px] text-foreground mt-1 truncate">{listing.title}</p>
            </Link>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setEditListing(listing)}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  {listing.status === "active" ? (
                    <DropdownMenuItem onClick={() => handleMarkAsSold(listing.id)}>
                      <Package className="w-4 h-4 mr-2" /> Marcar como Vendido
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleReactivate(listing.id)}>
                      <Package className="w-4 h-4 mr-2" /> Anunciar Novamente
                    </DropdownMenuItem>
                  )}
                  {listing.status === "active" && !promotedIds.has(listing.id) && (
                    <DropdownMenuItem onClick={() => setPromoteListing(listing)}>
                      <Zap className="w-4 h-4 mr-2" /> Impulsionar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setDeleteId(listing.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[13px] text-muted-foreground">
            {verifiedSet.has(listing.user_id) && (
              <>
                <BadgeCheck className="w-3.5 h-3.5 text-primary fill-primary/20" />
                <span>·</span>
              </>
            )}
            {sellerRating && sellerRating.count > 0 && (
              <>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-medium">{sellerRating.avg.toFixed(1)}</span>
                <span>({sellerRating.count})</span>
                <span>·</span>
              </>
            )}
            {listing.location && (
              <>
                <MapPin className="w-3 h-3" />
                <span>{listing.location}</span>
                <span>·</span>
              </>
            )}
            <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: ptBR })}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppPageShell>
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
          <div className="flex gap-3 w-full sm:w-auto">
            {activeTab === "browse" && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar no Marketplace"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Vender
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-secondary rounded-lg p-1 w-fit mb-5">
          {([["browse", "Navegar"], ["my", "Meus Anúncios"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "browse" && (
          <>
            {/* Sort, category, condition & filter bar */}
            <div ref={categoryRef} className="flex items-center gap-2 mb-4 flex-wrap">
              <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_MAP[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCondition || "any"} onValueChange={(v) => setFilterCondition(v === "any" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Qualquer Condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer Condição</SelectItem>
                  {conditions.map((c) => (
                    <SelectItem key={c} value={c}>{(CONDITION_MAP[c] || c).replace("Usado - ", "")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-colors">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortBy === "newest" ? "Mais Recentes" : sortBy === "price_low" ? "Preço: Menor → Maior" : "Preço: Maior → Menor"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setSortBy("newest")} className={sortBy === "newest" ? "font-semibold" : ""}>
                    Mais Recentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("price_low")} className={sortBy === "price_low" ? "font-semibold" : ""}>
                    Preço: Menor → Maior
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("price_high")} className={sortBy === "price_high" ? "font-semibold" : ""}>
                    Preço: Maior → Menor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Price/location filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters || minPrice || maxPrice || locationFilter
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary text-foreground hover:bg-muted"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {(minPrice || maxPrice || locationFilter) && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              {/* Clear filters */}
              {(filterCategory || filterCondition || minPrice || maxPrice || locationFilter || sortBy !== "newest") && (
                <button
                  onClick={() => { setFilterCategory(""); setFilterCondition(""); setMinPrice(""); setMaxPrice(""); setLocationFilter(""); setSortBy("newest"); setShowFilters(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {/* Filter inputs */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
                {/* Price range */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Mín"
                    min="0"
                    className="w-24 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">a</span>
                  <span className="text-sm text-muted-foreground">R$</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Máx"
                    min="0"
                    className="w-24 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-border" />

                {/* Location */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Filtrar por localização..."
                    className="w-40 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                    maxLength={100}
                  />
                </div>

                {(minPrice || maxPrice || locationFilter) && (
                  <button
                    onClick={() => { setMinPrice(""); setMaxPrice(""); setLocationFilter(""); }}
                    className="ml-auto w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Banner Ad */}
            <HorizontalBannerAd category="marketplace" variant="standard" className="mb-5" />

            {/* Trending Listings */}
            {!searchQuery && !filterCategory && !filterCondition && !minPrice && !maxPrice && !locationFilter && (
              <TrendingListings />
            )}

            {/* Recommended Listings */}
            {!searchQuery && !filterCategory && !filterCondition && !minPrice && !maxPrice && !locationFilter && (
              <RecommendedListings onBrowseCategories={() => categoryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
            )}

            {/* Recently Viewed */}
            {(() => {
              const recentItems = getRecentlyViewed();
              if (recentItems.length === 0 || searchQuery || filterCategory || filterCondition || minPrice || maxPrice || locationFilter) return null;
              return (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                    <Clock className="w-4 h-4 text-muted-foreground" /> Visualizados Recentemente
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
                    {recentItems.map((item: RecentlyViewedItem) => (
                      <Link
                        key={item.id}
                        to={`/marketplace/${item.id}`}
                        className="shrink-0 w-32 rounded-lg overflow-hidden bg-card shadow-sm"
                      >
                        <div className="aspect-square bg-secondary">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-bold text-foreground">R$ {Number(item.price).toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listingsData?.items.map((listing: any) => renderListingCard(listing, listing.user_id === user?.id, listingsData.sellerRatings?.[listing.user_id]))}
            </div>

            {listingsData?.items.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum anúncio encontrado</p>
                <p className="text-sm mt-1">Seja o primeiro a vender algo!</p>
              </div>
            )}

            {/* Pagination */}
            {(listingsData?.total || 0) > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {page + 1} de {Math.ceil((listingsData?.total || 0) / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil((listingsData?.total || 0) / PAGE_SIZE) - 1}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "my" && (
          <>
            {/* Seller Dashboard */}
            <SellerDashboard />

            {/* Active / Sold sub-filter + bulk toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => { setMyFilter("active"); setSelectedIds(new Set()); setBulkAction(false); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    myFilter === "active" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => { setMyFilter("sold"); setSelectedIds(new Set()); setBulkAction(false); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    myFilter === "sold" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"
                  }`}
                >
                  Vendidos
                </button>
              </div>
              {myListings && myListings.length > 0 && (
                <button
                  onClick={() => { setBulkAction(!bulkAction); setSelectedIds(new Set()); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    bulkAction ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"
                  }`}
                >
                  {bulkAction ? "Cancelar" : "Selecionar"}
                </button>
              )}
            </div>

            {/* Bulk action bar */}
            {bulkAction && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <span className="text-sm font-medium text-foreground">{selectedIds.size} selecionado(s)</span>
                <div className="flex-1" />
                {myFilter === "active" && (
                  <button
                    onClick={async () => {
                      for (const id of selectedIds) {
                        await supabase.from("listings").update({ status: "sold" }).eq("id", id);
                      }
                      toast.success(`${selectedIds.size} anúncio(s) marcado(s) como vendido(s)`);
                      setSelectedIds(new Set());
                      setBulkAction(false);
                      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
                      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-muted"
                  >
                    Marcar Vendido
                  </button>
                )}
                {myFilter === "sold" && (
                  <button
                    onClick={async () => {
                      for (const id of selectedIds) {
                        await supabase.from("listings").update({ status: "active" }).eq("id", id);
                      }
                      toast.success(`${selectedIds.size} anúncio(s) reativado(s)`);
                      setSelectedIds(new Set());
                      setBulkAction(false);
                      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
                      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-muted"
                  >
                    Reativar
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90"
                >
                  Excluir
                </button>
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {selectedIds.size} anúncio{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O(s) anúncio(s) selecionado(s) será(ão) excluído(s) permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          for (const id of selectedIds) {
                            await supabase.from("listings").delete().eq("id", id);
                          }
                          toast.success(`${selectedIds.size} anúncio(s) excluído(s)`);
                          setSelectedIds(new Set());
                          setBulkAction(false);
                          queryClient.invalidateQueries({ queryKey: ["my-listings"] });
                          queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Select all */}
            {bulkAction && myListings && myListings.length > 0 && (
              <button
                onClick={() => {
                  if (selectedIds.size === myListings.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(myListings.map((l: any) => l.id)));
                }}
                className="text-xs text-primary font-medium mb-3 hover:underline"
              >
                {selectedIds.size === myListings.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings?.map((listing: any) => (
                <div key={listing.id} className="relative">
                  {bulkAction && (
                    <button
                      onClick={() => {
                        const next = new Set(selectedIds);
                        if (next.has(listing.id)) next.delete(listing.id);
                        else next.add(listing.id);
                        setSelectedIds(next);
                      }}
                      className="absolute top-2 left-2 z-10"
                    >
                      {selectedIds.has(listing.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {renderListingCard(listing, true)}
                </div>
              ))}
            </div>

            {myListings?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {myFilter === "active" ? "Nenhum anúncio ativo" : "Nenhum anúncio vendido"}
                </p>
                <p className="text-sm mt-1">
                  {myFilter === "active" ? "Crie um anúncio para começar a vender!" : "Itens que você marcar como vendidos aparecerão aqui."}
                </p>
                {myFilter === "active" && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> Criar Anúncio
                  </button>
                )}
              </div>
            )}

          </>
        )}

        {/* Create listing modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-card rounded-lg w-full max-w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <ListingTemplates
                  currentValues={{ title, description, category, condition, location }}
                  onApply={(t) => {
                    if (t.title) setTitle(t.title);
                    if (t.description) setDescription(t.description);
                    setCategory(t.category);
                    setCondition(t.condition);
                    if (t.location) setLocation(t.location);
                  }}
                />
                <h2 className="text-xl font-bold text-foreground">Criar Anúncio</h2>
                <button onClick={resetForm} className="w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  {imagePreviews.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, i) => (
                          <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 hover:bg-card flex items-center justify-center">
                              <X className="w-3 h-3 text-foreground" />
                            </button>
                          </div>
                        ))}
                        {imagePreviews.length < 10 && (
                          <button onClick={() => fileInputRef.current?.click()}
                            className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-secondary transition-colors">
                            <Plus className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Adicionar mais</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{imagePreviews.length}/10 fotos</p>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-secondary transition-colors">
                      <Image className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Adicionar fotos (até 10)</span>
                    </button>
                  )}
                </div>

                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" maxLength={200} required />
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" min="0" step="0.01" required />
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]">
                  {categories.map((c) => <option key={c} value={c}>{CATEGORY_MAP[c] || c}</option>)}
                </select>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]">
                  {conditions.map((c) => <option key={c} value={c}>{CONDITION_MAP[c] || c}</option>)}
                </select>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Localização (opcional)"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" maxLength={100} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px] resize-none min-h-[80px]" maxLength={2000} />
                <button onClick={handleCreate} disabled={creating || !title.trim() || !price}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                  {creating ? "Publicando..." : "Publicar Anúncio"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit listing modal */}
        {editListing && (
          <EditListingModal
            listing={editListing}
            onClose={() => setEditListing(null)}
            onSaved={() => {
              setEditListing(null);
              queryClient.invalidateQueries({ queryKey: ["listings"] });
              queryClient.invalidateQueries({ queryKey: ["my-listings"] });
              queryClient.invalidateQueries({ queryKey: ["listing-detail"] });
            }}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Anúncio</AlertDialogTitle>
              <AlertDialogDescription>
                Isso excluirá permanentemente este anúncio. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Promote listing modal */}
        {promoteListing && (
          <PromoteListingModal listing={promoteListing} onClose={() => setPromoteListing(null)} />
        )}

    </AppPageShell>
  );
};

export default Marketplace;
