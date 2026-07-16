import { useState, useEffect } from "react";
import { X, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EditPageModalProps {
  open: boolean;
  onClose: () => void;
  page: {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string | null;
    about: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    location: string | null;
  };
}

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "details", label: "Details" },
  { key: "contact", label: "Contact" },
] as const;

type StepKey = typeof STEPS[number]["key"];

const validateEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validateUrl = (v: string) => !v || /^https?:\/\/.+/.test(v);
const validatePhone = (v: string) => !v || /^[+\d\s().-]{5,30}$/.test(v);

const EditPageModal = ({ open, onClose, page }: EditPageModalProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<StepKey>("basics");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [about, setAbout] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && page) {
      setName(page.name || "");
      setCategory(page.category || "business");
      setDescription(page.description || "");
      setAbout(page.about || "");
      setEmail(page.email || "");
      setPhone(page.phone || "");
      setWebsite(page.website || "");
      setLocation(page.location || "");
      setStep("basics");
    }
  }, [open, page]);

  if (!open) return null;

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  const handleSubmit = async () => {
    const errs = validateStep("contact");
    if (!name.trim()) errs.name = "Page name is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error } = await supabase
        .from("pages")
        .update({
          name: name.trim(),
          category,
          description: description.trim() || null,
          about: about.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          location: location.trim() || null,
        })
        .eq("id", page.id);

      if (error) throw error;

      toast.success("Page updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["page", page.slug] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["my-pages"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update page");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (s: StepKey): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === "basics") {
      if (!name.trim()) errs.name = "Page name is required";
    }
    if (s === "contact") {
      if (email && !validateEmail(email)) errs.email = "Invalid email address";
      if (phone && !validatePhone(phone)) errs.phone = "Invalid phone number";
      if (website && !validateUrl(website)) errs.website = "Must start with http:// or https://";
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const next = STEPS[currentIdx + 1];
    if (next) setStep(next.key);
  };

  const goBack = () => {
    setErrors({});
    const prev = STEPS[currentIdx - 1];
    if (prev) setStep(prev.key);
  };

  const fieldClass =
    "mt-1 w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Edit Page</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isCompleted = i < currentIdx;
              const isCurrent = s.key === step;
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted || isCurrent) setStep(s.key);
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] rounded-full transition-colors ${
                        i < currentIdx ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-4 space-y-4">
          {step === "basics" && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">Page name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  className={`${fieldClass} ${errors.name ? "border-destructive ring-1 ring-destructive" : ""}`}
                  required
                  maxLength={100}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
                  {PAGE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === "details" && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${fieldClass} resize-none`}
                  maxLength={500}
                  placeholder="Short description of your page"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">About</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  className={`${fieldClass} resize-none`}
                  maxLength={2000}
                  placeholder="Tell people more about your page..."
                />
              </div>
            </>
          )}

          {step === "contact" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }} className={`${fieldClass} ${errors.email ? "border-destructive ring-1 ring-destructive" : ""}`} placeholder="contact@example.com" maxLength={255} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }} className={`${fieldClass} ${errors.phone ? "border-destructive ring-1 ring-destructive" : ""}`} placeholder="+1 (555) 000-0000" maxLength={30} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Website</label>
                <input type="url" value={website} onChange={(e) => { setWebsite(e.target.value); setErrors((p) => ({ ...p, website: "" })); }} className={`${fieldClass} ${errors.website ? "border-destructive ring-1 ring-destructive" : ""}`} placeholder="https://example.com" maxLength={500} />
                {errors.website && <p className="text-xs text-destructive mt-1">{errors.website}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} placeholder="City, Country" maxLength={200} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          {currentIdx > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>
          )}
          {currentIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPageModal;
