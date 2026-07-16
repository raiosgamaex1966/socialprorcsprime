import { useState, useRef } from "react";
import { X, Plus, Image, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EditListingModalProps {
  listing: any;
  onClose: () => void;
  onSaved: () => void;
}

const categories = ["General", "Electronics", "Vehicles", "Furniture", "Clothing", "Sports", "Home & Garden", "Other"];
const conditions = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

const EditListingModal = ({ listing, onClose, onSaved }: EditListingModalProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || "");
  const [price, setPrice] = useState(String(listing.price));
  const [category, setCategory] = useState(listing.category);
  const [condition, setCondition] = useState(listing.condition);
  const [location, setLocation] = useState(listing.location || "");
  const [existingUrls, setExistingUrls] = useState<string[]>(
    listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const totalImages = existingUrls.length + newFiles.length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - totalImages;
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) { toast.error("Each image must be < 5MB"); return; }
    setNewFiles(prev => [...prev, ...toAdd]);
    setNewPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExisting = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNew = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !price || !user) return;
    setSaving(true);
    const oldPrice = parseFloat(listing.price);
    const newPrice = parseFloat(price);
    try {
      // Upload new files
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("listing-images").upload(path, file);
        if (uploadErr) throw uploadErr;
        uploadedUrls.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
      }

      const allUrls = [...existingUrls, ...uploadedUrls];

      const { error } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: newPrice,
          category,
          condition,
          location: location.trim() || null,
          image_url: allUrls[0] || null,
          image_urls: allUrls,
        })
        .eq("id", listing.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Notify savers on price drop
      if (newPrice < oldPrice) {
        const { data: savers } = await supabase
          .from("saved_listings")
          .select("user_id")
          .eq("listing_id", listing.id);

        if (savers && savers.length > 0) {
          const notifications = savers
            .filter((s: any) => s.user_id !== user.id)
            .map((s: any) => ({
              user_id: s.user_id,
              actor_id: user.id,
              type: "price_drop",
              message: `dropped the price on "${title.trim()}" from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
              reference_id: listing.id,
            }));
          if (notifications.length > 0) {
            await supabase.from("notifications").insert(notifications);
          }
        }
      }

      toast.success("Listing updated!");
      onSaved();
    } catch (error: any) {
      toast.error(error.message || "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-lg w-full max-w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div />
          <h2 className="text-xl font-bold text-foreground">Edit Listing</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Images */}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            {totalImages > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {existingUrls.map((url, i) => (
                    <div key={`existing-${i}`} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeExisting(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 hover:bg-card flex items-center justify-center">
                        <X className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                  {newPreviews.map((preview, i) => (
                    <div key={`new-${i}`} className="relative rounded-lg overflow-hidden border border-primary/30 aspect-square">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeNew(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 hover:bg-card flex items-center justify-center">
                        <X className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                  {totalImages < 10 && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-secondary transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Add more</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{totalImages}/10 photos</p>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-secondary transition-colors">
                <Image className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add photos (up to 10)</span>
              </button>
            )}
          </div>

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" maxLength={200} />

          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" min="0" step="0.01" />

          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={condition} onChange={(e) => setCondition(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]">
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px]" maxLength={100} />

          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary text-[15px] resize-none min-h-[80px]" maxLength={2000} />

          <button onClick={handleSave} disabled={saving || !title.trim() || !price}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;
