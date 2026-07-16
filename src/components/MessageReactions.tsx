import { useState, useRef, useEffect } from "react";
import { SmilePlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Mais usados",
    icon: "🕐",
    emojis: ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉", "💯", "🙏"],
  },
  {
    label: "Carinhas",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "😋", "😛", "😜", "🤪",
      "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐",
      "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
      "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😵",
      "🤯", "🥳", "🥸", "😎", "🤓", "🧐",
    ],
  },
  {
    label: "Gestos",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶",
      "👐", "🤲", "🙏", "💪", "🫂",
    ],
  },
  {
    label: "Corações",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
    ],
  },
  {
    label: "Animais",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧",
      "🐦", "🦅", "🦆", "🦉", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌",
    ],
  },
  {
    label: "Comida",
    icon: "🍕",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒",
      "🍑", "🥭", "🍍", "🥝", "🍔", "🍕", "🌮", "🌯", "🍣", "🍩",
      "🍪", "🎂", "🍰", "🧁", "☕", "🍵", "🧃", "🍺", "🍷", "🥂",
    ],
  },
  {
    label: "Objetos",
    icon: "💡",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🎮", "🎯", "🎲", "🎸", "🎹",
      "🎤", "🎬", "📸", "💡", "🔔", "📌", "✏️", "📝", "💰", "💎",
      "🔑", "🛠️", "⏰", "📱", "💻", "🖥️", "🚀", "✈️", "🚗", "🏠",
    ],
  },
  {
    label: "Símbolos",
    icon: "✨",
    emojis: [
      "✨", "🌟", "⭐", "💫", "🔥", "💥", "💯", "✅", "❌", "⚡",
      "🎉", "🎊", "🏆", "🥇", "🎁", "🪄", "💤", "💬", "👀", "🫡",
    ],
  },
];

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  isMine: boolean;
  onReactionChange: () => void;
}

const MessageReactions = ({ messageId, reactions, isMine, onReactionChange }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPicker && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showPicker]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.emoji === emoji && r.reacted);
    try {
      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
      onReactionChange();
    } catch {
      toast.error("Falha ao reagir");
    }
    setShowPicker(false);
    setSearchQuery("");
  };

  const filteredEmojis = searchQuery
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i)
    : EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${isMine ? "justify-end" : "justify-start"}`}>
      {reactions.filter((r) => r.count > 0).map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
            r.reacted
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors opacity-0 group-hover/msg:opacity-100"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowPicker(false); setSearchQuery(""); }} />
            <div
              ref={pickerRef}
              className={`absolute z-50 bottom-8 ${isMine ? "right-0" : "left-0"} w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden`}
            >
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar emoji..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-xs"
                  />
                </div>
              </div>

              {/* Category tabs */}
              {!searchQuery && (
                <div className="flex border-b border-border px-1">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={cat.label}
                      onClick={() => setActiveCategory(idx)}
                      className={`flex-1 py-1.5 text-center text-sm hover:bg-secondary/50 transition-colors rounded-t-md ${
                        activeCategory === idx ? "bg-secondary" : ""
                      }`}
                      title={cat.label}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji grid */}
              <div className="p-2 max-h-48 overflow-y-auto">
                {!searchQuery && (
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 px-0.5">
                    {EMOJI_CATEGORIES[activeCategory].label}
                  </p>
                )}
                <div className="grid grid-cols-8 gap-0.5">
                  {filteredEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;
