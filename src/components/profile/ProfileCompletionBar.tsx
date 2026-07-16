import { CheckCircle, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileCompletionBarProps {
  profile: any;
  onEditClick: () => void;
}

const STEPS = [
  { key: "avatar_url", label: "Foto de perfil" },
  { key: "cover_photo_url", label: "Foto de capa" },
  { key: "bio", label: "Biografia" },
  { key: "workplace", label: "Trabalho" },
  { key: "location", label: "Localização" },
  { key: "education", label: "Educação" },
];

const ProfileCompletionBar = ({ profile, onEditClick }: ProfileCompletionBarProps) => {
  const completed = STEPS.filter((s) => !!profile?.[s.key]).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground">Complete seu perfil</h3>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2 mb-3" />
      <div className="flex flex-wrap gap-2">
        {STEPS.map((step) => {
          const done = !!profile?.[step.key];
          return (
            <button
              key={step.key}
              onClick={!done ? onEditClick : undefined}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                done
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              {done ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileCompletionBar;
