import { useState } from "react";
import { X } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const emojiCategories = [
  {
    name: "Expressões",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    name: "Gestos",
    emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    name: "Corações",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💋","💌","💐","🌹","🥀","🌺","🌸","🌼","🌻"],
  },
  {
    name: "Animais",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏"],
  },
  {
    name: "Comida",
    emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🫘","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪"],
  },
  {
    name: "Objetos",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥅","⛳","🪃","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","🎯","🪁","🔮","🧿","🪬","🎮","🕹️","🎰","🎲","♟️","🧩","🎭","🎨","🧵","🪡","🧶","🪢","🎼","🎵","🎶","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎤","🎧","📻"],
  },
  {
    name: "Bandeiras",
    emojis: ["🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇮🇹","🇪🇸","🇯🇵","🇰🇷","🇨🇳","🇧🇷","🇮🇳","🇷🇺","🇦🇺","🇨🇦","🇲🇽"],
  },
];

const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="absolute bottom-12 right-0 w-[320px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Emoji</span>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-2 pt-2 overflow-x-auto scrollbar-hidden">
        {emojiCategories.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeCategory === i
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="h-[240px] overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {emojiCategories[activeCategory].emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-secondary rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
