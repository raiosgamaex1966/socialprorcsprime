import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, MapPin, Tag, Heart, MessageCircle, Share2, ShieldCheck,
  ChevronLeft, ChevronRight, Calendar, Package, Copy, Link as LinkIcon, Flag,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarState } from "@/hooks/useSidebarState";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import SellerReviews from "@/components/SellerReviews";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import MakeOfferButton from "@/components/MakeOfferButton";
import ListingOffers from "@/components/ListingOffers";
import ReportListingModal from "@/components/ReportListingModal";
import VerifiedBadge from "@/components/VerifiedBadge";
import BlockUserButton from "@/components/BlockUserButton";
import FraudWarningBanner from "@/components/FraudWarningBanner";

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

const ListingDetail = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentImage, setCurrentImage] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const listingUrl = `${window.location.origin}/marketplace/${listingId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(listingUrl);
    toast.success("Link copiado para a área de transferência");
  };

  const shareToFeed = async () => {
    if (!user || !listing) return;
    const content = `Confira este anúncio: "${listing.title}" — R$ ${Number(listing.price).toLocaleString()}\n\n${listingUrl}`;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content,
    });
    if (error) {
      toast.error("Falha ao compartilhar");
    } else {
      toast.success("Compartilhado no seu feed!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  };

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing-detail", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at")
        .eq("user_id", data.user_id)
        .maybeSingle();

      // Get seller's other listings
      const { data: otherListings } = await supabase
        .from("listings")
        .select("id, title, price, image_url, image_urls")
        .eq("user_id", data.user_id)
        .eq("status", "active")
        .neq("id", data.id)
        .order("created_at", { ascending: false })
        .limit(4);

      // Get listing count for seller
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.user_id)
        .eq("status", "active");

      return {
        ...data,
        profile,
        otherListings: otherListings || [],
        sellerListingCount: count || 0,
      };
    },
    enabled: !!listingId,
  });

  // Track recently viewed + record view in DB
  useEffect(() => {
    if (listing) {
      addRecentlyViewed({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        image_url: listing.image_url,
      });
      // Track view in database (upsert - one view per user per listing)
      if (user && listing.user_id !== user.id) {
        supabase.from("listing_views").upsert(
          { listing_id: listing.id, viewer_id: user.id },
          { onConflict: "listing_id,viewer_id" }
        ).then(() => {});
      }
    }
  }, [listing, user]);

  // Check if seller is verified
  const { data: isVerified } = useQuery({
    queryKey: ["verified-seller", listing?.user_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("verified_sellers")
        .select("id")
        .eq("user_id", listing!.user_id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!listing,
  });

  const { data: isSaved } = useQuery({
    queryKey: ["listing-saved", listingId, user?.id],
    queryFn: async () => {
      if (!user || !listingId) return false;
      const { data } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!listingId,
  });

  const toggleSave = async () => {
    if (!user || !listingId) return;
    if (isSaved) {
      await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", listingId);
      toast.success("Removido dos salvos");
    } else {
      await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: listingId });
      toast.success("Anúncio salvo");
    }
    queryClient.invalidateQueries({ queryKey: ["listing-saved", listingId, user.id] });
    queryClient.invalidateQueries({ queryKey: ["saved-listings"] });
  };

  const handleMessageSeller = async () => {
    if (!user || !listing) return;
    if (listing.user_id === user.id) {
      toast.info("Este é o seu próprio anúncio");
      return;
    }

    // Check for existing DM conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("is_group", false)
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${listing.user_id}),and(participant_one.eq.${listing.user_id},participant_two.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        participant_one: user.id,
        participant_two: listing.user_id,
        is_group: false,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Falha ao iniciar conversa");
      return;
    }

    // Send initial message about the listing
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content: `Olá! Estou interessado no seu anúncio: "${listing.title}" (R$ ${Number(listing.price).toLocaleString()})`,
    });

    navigate(`/messages?conversation=${conv.id}`);
  };

  const allImages = listing
    ? [
        ...(listing.image_url ? [listing.image_url] : []),
        ...((listing.image_urls as string[]) || []).filter((u: string) => u !== listing.image_url),
      ]
    : [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-80 bg-secondary/50 rounded-xl" />
            <div className="h-8 w-2/3 bg-secondary/50 rounded" />
            <div className="h-6 w-1/3 bg-secondary/50 rounded" />
          </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Anúncio não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1">Este anúncio pode ter sido removido.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/marketplace")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Marketplace
          </Button>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-4">
          <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
            Marketplace
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium truncate max-w-[250px]">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Images + details */}
          <div className="lg:col-span-3 space-y-4">
            {/* Image gallery */}
            <div className="relative rounded-xl overflow-hidden bg-secondary aspect-[4/3]">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImage]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage((p) => (p - 1 + allImages.length) % allImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-md"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground" />
                      </button>
                      <button
                        onClick={() => setCurrentImage((p) => (p + 1) % allImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-md"
                      >
                        <ChevronRight className="w-5 h-5 text-foreground" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {allImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? "bg-primary-foreground w-4" : "bg-primary-foreground/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentImage ? "border-primary" : "border-transparent hover:border-border"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Fraud warning */}
            {user && listing.user_id !== user.id && (
              <FraudWarningBanner listingId={listing.id} />
            )}

            {/* Details card */}
            <div className="rounded-lg bg-card shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    R$ {Number(listing.price).toLocaleString()}
                  </p>
                  <h1 className="text-lg font-semibold text-foreground mt-1">{listing.title}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                        <Share2 className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={copyLink}>
                        <Copy className="w-4 h-4 mr-2" /> Copiar Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareToFeed}>
                        <LinkIcon className="w-4 h-4 mr-2" /> Compartilhar no Feed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={toggleSave}
                    className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" /> {CATEGORY_MAP[listing.category] || listing.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" /> {CONDITION_MAP[listing.condition] || listing.condition}
                </Badge>
                {listing.location && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" /> {listing.location}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Anunciado {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: ptBR })}
              </p>

              {listing.description && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Descrição</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Seller info + actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Action buttons */}
            {listing.user_id !== user?.id && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleMessageSeller}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Enviar Mensagem
                </Button>
                <MakeOfferButton
                  listingId={listing.id}
                  sellerId={listing.user_id}
                  listingTitle={listing.title}
                  currentPrice={Number(listing.price)}
                />
                <Button variant="outline" className="w-full" size="lg" onClick={toggleSave}>
                  <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                  {isSaved ? "Salvo" : "Salvar Anúncio"}
                </Button>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[200px]">
                <DropdownMenuItem onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareToFeed}>
                  <LinkIcon className="w-4 h-4 mr-2" /> Compartilhar no Feed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Seller card */}
            <div className="rounded-lg bg-card shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Vendedor</h3>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={listing.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(listing.profile?.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/profile/${listing.user_id}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {listing.profile?.display_name || "Desconhecido"}
                    </Link>
                    {isVerified && <VerifiedBadge size="md" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Entrou {listing.profile?.created_at ? format(new Date(listing.profile.created_at), "MMM 'de' yyyy", { locale: ptBR }) : "recentemente"}
                    </span>
                    <span>{listing.sellerListingCount} {listing.sellerListingCount === 1 ? "anúncio" : "anúncios"}</span>
                  </div>
                </div>
              </div>
              <Link
                to={`/profile/${listing.user_id}`}
                className="block mt-3 text-xs text-center text-primary hover:underline font-medium"
              >
                Ver Perfil
              </Link>
            </div>

            {/* Report listing */}
            {user && listing.user_id !== user.id && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Flag className="w-3 h-3" /> Denunciar este anúncio
                </button>
                <BlockUserButton targetUserId={listing.user_id} />
              </div>
            )}

            {/* Seller's Offers Management (only visible to listing owner) */}
            {listing.user_id === user?.id && (
              <ListingOffers listingId={listing.id} listingTitle={listing.title} />
            )}

            {/* Seller Reviews */}
            <SellerReviews sellerId={listing.user_id} listingId={listingId} />

            {/* Price History */}
            <PriceHistoryChart listingId={listing.id} currentPrice={Number(listing.price)} />

            {/* Seller's other listings */}
            {listing.otherListings.length > 0 && (
              <div className="rounded-lg bg-card shadow-sm p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Mais deste vendedor
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {listing.otherListings.map((item: any) => {
                    const thumb = item.image_url || (item.image_urls && item.image_urls[0]);
                    return (
                      <Link
                        key={item.id}
                        to={`/marketplace/${item.id}`}
                        className="group rounded-lg overflow-hidden shadow-sm"
                      >
                        <div className="aspect-square bg-secondary">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ReportListingModal
        open={showReport}
        onOpenChange={setShowReport}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </>
  );
};

export default ListingDetail;
