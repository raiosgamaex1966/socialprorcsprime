import defaultAvatar from "@/assets/default-avatar.jpg";
import UserProfileCard from "@/components/UserProfileCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, MessageSquare, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Tab = "all" | "people" | "posts" | "conversations";

interface SearchResult {
  people: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; bio: string | null }>;
  posts: Array<{ id: string; content: string; user_id: string; created_at: string; author_name: string | null; author_avatar: string | null }>;
  conversations: Array<{ id: string; name: string; is_group: boolean; avatar_url: string | null }>;
}

const GlobalSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [results, setResults] = useState<SearchResult>({ people: [], posts: [], conversations: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Search debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ people: [], posts: [], conversations: [] });
      return;
    }
    const timeout = setTimeout(() => runSearch(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const runSearch = async (q: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const searchTerm = `%${q}%`;

      // Search people
      const { data: people } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .ilike("display_name", searchTerm)
        .limit(8);

      // Search posts
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      const friendIds = friendships?.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || [];
      const allowedUserIds = [user.id, ...friendIds];

      const { data: rawPosts } = await supabase
        .from("posts")
        .select("id, content, user_id, created_at")
        .in("user_id", allowedUserIds)
        .ilike("content", searchTerm)
        .order("created_at", { ascending: false })
        .limit(8);

      // Fetch post authors
      const postUserIds = [...new Set((rawPosts || []).map((p) => p.user_id))];
      let postProfiles: any[] = [];
      if (postUserIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", postUserIds);
        postProfiles = data || [];
      }
      const profileMap = new Map(postProfiles.map((p) => [p.user_id, p]));
      const posts = (rawPosts || []).map((p) => ({
        ...p,
        author_name: profileMap.get(p.user_id)?.display_name || null,
        author_avatar: profileMap.get(p.user_id)?.avatar_url || null,
      }));

      // Search conversations (DM partner names or group names)
      const { data: myConvs } = await supabase
        .from("conversations")
        .select("id, is_group, group_name, group_avatar_url, participant_one, participant_two")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id},and(is_group.eq.true)`);

      // For group chats, filter by group_name
      const groupMatches = (myConvs || [])
        .filter((c) => c.is_group && c.group_name?.toLowerCase().includes(q.toLowerCase()))
        .map((c) => ({ id: c.id, name: c.group_name || "Group", is_group: true, avatar_url: c.group_avatar_url }));

      // For DMs, get partner profiles
      const dmConvs = (myConvs || []).filter((c) => !c.is_group);
      const partnerIds = dmConvs.map((c) => (c.participant_one === user.id ? c.participant_two : c.participant_one)).filter(Boolean) as string[];
      let partnerProfiles: any[] = [];
      if (partnerIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", partnerIds);
        partnerProfiles = data || [];
      }
      const partnerMap = new Map(partnerProfiles.map((p) => [p.user_id, p]));
      const dmMatches = dmConvs
        .map((c) => {
          const partnerId = c.participant_one === user.id ? c.participant_two : c.participant_one;
          const profile = partnerMap.get(partnerId!);
          return profile ? { id: c.id, name: profile.display_name || "User", is_group: false, avatar_url: profile.avatar_url } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null && c.name.toLowerCase().includes(q.toLowerCase()));

      setResults({
        people: people || [],
        posts,
        conversations: [...groupMatches, ...dmMatches].slice(0, 8),
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const totalCount = results.people.length + results.posts.length + results.conversations.length;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "all", label: "Tudo", icon: Search, count: totalCount },
    { key: "people", label: "Pessoas", icon: User, count: results.people.length },
    { key: "posts", label: "Publicações", icon: FileText, count: results.posts.length },
    { key: "conversations", label: "Conversas", icon: MessageSquare, count: results.conversations.length },
  ];

  const showPeople = tab === "all" || tab === "people";
  const showPosts = tab === "all" || tab === "posts";
  const showConversations = tab === "all" || tab === "conversations";

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative flex-1 min-w-0 max-w-[240px] sm:max-w-[260px]" ref={panelRef}>
      {/* Trigger */}
      <div className="relative cursor-pointer" onClick={handleOpen}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar no Social Pro"
          className="bg-secondary rounded-full pl-10 pr-4 py-2 text-sm w-full outline-none placeholder:text-muted-foreground cursor-pointer"
          readOnly
          value={open ? "" : ""}
        />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-14 sm:top-0 sm:left-0 sm:w-[360px] bg-card rounded-lg shadow-xl border border-border z-[60] overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pessoas, publicações, conversas..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tabs */}
          {query.trim().length >= 2 && (
            <div className="flex border-b border-border">
              {tabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === key
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {label} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">Pesquisando...</div>
            )}

            {!loading && query.trim().length >= 2 && totalCount === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado</div>
            )}

            {!loading && query.trim().length < 2 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Digite pelo menos 2 caracteres para pesquisar</div>
            )}

            {/* People */}
            {!loading && showPeople && results.people.length > 0 && (
              <div>
                {tab === "all" && <div className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pessoas</div>}
                {results.people.map((person) => (
                  <UserProfileCard key={person.user_id} userId={person.user_id}>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                      onClick={() => {
                        navigate(`/profile/${person.user_id}`);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <img src={person.avatar_url || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{person.display_name || "User"}</p>
                        {person.bio && <p className="text-xs text-muted-foreground truncate">{person.bio}</p>}
                      </div>
                    </button>
                  </UserProfileCard>
                ))}
              </div>
            )}

            {/* Posts */}
            {!loading && showPosts && results.posts.length > 0 && (
              <div>
                {tab === "all" && <div className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Publicações</div>}
                {results.posts.map((post) => (
                  <button
                    key={post.id}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                    onClick={() => {
                      navigate(`/`);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <img src={post.author_avatar || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{post.author_name || "Unknown"}</p>
                      <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Conversations */}
            {!loading && showConversations && results.conversations.length > 0 && (
              <div>
                {tab === "all" && <div className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversas</div>}
                {results.conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                    onClick={() => {
                      navigate(`/messages?conversationId=${conv.id}`);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <img src={conv.avatar_url || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{conv.name}</p>
                      <p className="text-xs text-muted-foreground">{conv.is_group ? "Chat de grupo" : "Mensagem direta"}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
