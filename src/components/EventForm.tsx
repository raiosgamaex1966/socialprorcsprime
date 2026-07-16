import { useState, useRef } from "react";
import { CalendarDays, Loader2, Repeat, Image, X, Tag } from "lucide-react";
import { EVENT_CATEGORIES } from "@/constants/eventCategories";

export interface EventFormValues {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  recurrenceType: string;
  recurrenceEndDate: string;
  category: string;
  coverImage?: File | null;
}

interface EventFormProps {
  initialValues?: Partial<EventFormValues>;
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitLabel: string;
  savingLabel: string;
  showRecurrence?: boolean;
}

const EventForm = ({ initialValues, onSubmit, submitLabel, savingLabel, showRecurrence = true }: EventFormProps) => {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [eventDate, setEventDate] = useState(initialValues?.eventDate || "");
  const [eventTime, setEventTime] = useState(initialValues?.eventTime || "");
  const [location, setLocation] = useState(initialValues?.location || "");
  const [recurrenceType, setRecurrenceType] = useState(initialValues?.recurrenceType || "none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialValues?.recurrenceEndDate || "");
  const [category, setCategory] = useState(initialValues?.category || "general");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    try {
      await onSubmit({ title, description, eventDate, eventTime, location, recurrenceType, recurrenceEndDate, category, coverImage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Cover image */}
      {coverPreview ? (
        <div className="relative rounded-lg overflow-hidden">
          <img src={coverPreview} alt="" className="w-full h-32 object-cover" />
          <button
            onClick={removeCover}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Image className="w-4 h-4" />
          Adicionar imagem de capa (opcional)
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do evento *"
        className="w-full px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
        maxLength={200}
      />

      {/* Category */}
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
        >
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
          ))}
        </select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        className="w-full px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        rows={2}
        maxLength={1000}
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="time"
          value={eventTime}
          onChange={(e) => setEventTime(e.target.value)}
          className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Localização (opcional)"
        className="w-full px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
        maxLength={300}
      />

      {showRecurrence && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="none">Não se repete</option>
              <option value="weekly">Repete semanalmente</option>
              <option value="biweekly">Repete a cada 2 semanas</option>
              <option value="monthly">Repete mensalmente</option>
            </select>
          </div>
          {recurrenceType !== "none" && (
            <div className="flex items-center gap-2 pl-5.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Até:</span>
              <input
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                min={eventDate}
                className="flex-1 px-3 py-2 bg-background rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !eventDate || saving}
        className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  );
};

export default EventForm;
