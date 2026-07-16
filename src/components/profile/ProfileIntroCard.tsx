import { useState } from "react";
import { Briefcase, MapPin, Calendar, Clock, GraduationCap, Globe, Heart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

interface ProfileIntroCardProps {
  profile: any;
  profileUserId: string;
  isOwn: boolean;
  editingBio: boolean;
  setEditingBio: (v: boolean) => void;
}

const ProfileIntroCard = ({ profile, profileUserId, isOwn, editingBio, setEditingBio }: ProfileIntroCardProps) => {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlinePresence();
  const [nameText, setNameText] = useState(profile?.display_name || "");
  const [bioText, setBioText] = useState(profile?.bio || "");
  const [locationText, setLocationText] = useState(profile?.location || "");
  const [workplaceText, setWorkplaceText] = useState(profile?.workplace || "");
  const [educationText, setEducationText] = useState(profile?.education || "");
  const [websiteText, setWebsiteText] = useState(profile?.website || "");
  const [relationshipText, setRelationshipText] = useState(profile?.relationship_status || "");

  const startEdit = () => {
    setNameText(profile?.display_name || "");
    setBioText(profile?.bio || "");
    setLocationText(profile?.location || "");
    setWorkplaceText(profile?.workplace || "");
    setEducationText(profile?.education || "");
    setWebsiteText(profile?.website || "");
    setRelationshipText(profile?.relationship_status || "");
    setEditingBio(true);
  };

  const saveProfile = async () => {
    const updates: Record<string, string> = {
      bio: bioText.trim(),
      location: locationText.trim(),
      workplace: workplaceText.trim(),
      education: educationText.trim(),
      website: websiteText.trim(),
      relationship_status: relationshipText.trim(),
    };
    if (nameText.trim()) updates.display_name = nameText.trim();

    const { error } = await supabase
      .from("profiles")
      .update(updates as never)
      .eq("user_id", profileUserId);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado!");
    setEditingBio(false);
    queryClient.invalidateQueries({ queryKey: ["profile", profileUserId] });
    queryClient.invalidateQueries({ queryKey: ["current-profile"] });
  };

  const online = isOnline(profileUserId);

  const infoItems = [
    { icon: Briefcase, value: profile?.workplace, prefix: "Trabalha em " },
    { icon: GraduationCap, value: profile?.education, prefix: "Estudou em " },
    { icon: MapPin, value: profile?.location, prefix: "Mora em " },
    { icon: Globe, value: profile?.website, isLink: true },
    { icon: Heart, value: profile?.relationship_status },
    { icon: Calendar, value: `Entrou ${profile?.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: ptBR }) : "recentemente"}`, alwaysShow: true },
  ];

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
      <h2 className="text-base font-bold text-foreground mb-3">Apresentação</h2>

      {editingBio ? (
        <div className="space-y-2.5">
          {[
            { label: "Nome de Exibição", value: nameText, set: setNameText, max: 50 },
            { label: "Biografia", value: bioText, set: setBioText, max: 500, multiline: true },
            { label: "Local de Trabalho", value: workplaceText, set: setWorkplaceText, max: 100 },
            { label: "Educação", value: educationText, set: setEducationText, max: 100 },
            { label: "Cidade Natal/Residência", value: locationText, set: setLocationText, max: 100 },
            { label: "Website", value: websiteText, set: setWebsiteText, max: 200 },
            { label: "Status de Relacionamento", value: relationshipText, set: setRelationshipText, max: 50 },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={`Adicionar ${field.label.toLowerCase()}...`}
                  className="w-full bg-secondary rounded-lg p-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60px] border border-border/50 focus:border-primary/50 transition-colors"
                  maxLength={field.max}
                />
              ) : (
                <input
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={`Adicionar ${field.label.toLowerCase()}...`}
                  className="w-full bg-secondary rounded-lg p-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/50 focus:border-primary/50 transition-colors"
                  maxLength={field.max}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setEditingBio(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveProfile}>
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm text-foreground text-center mb-3 leading-relaxed">{profile.bio}</p>
          )}
          {!profile?.bio && isOwn && (
            <button
              onClick={startEdit}
              className="w-full py-2 rounded-lg bg-secondary hover:bg-muted text-sm font-medium text-foreground transition-colors mb-2"
            >
              Adicionar biografia
            </button>
          )}

          {/* Info items */}
          <div className="space-y-2 text-sm mb-3">
            {infoItems.map((item, i) => {
              if (!item.value && !item.alwaysShow) return null;
              if (!item.value) return null;
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                  {item.isLink && item.value ? (
                    <a href={item.value.startsWith("http") ? item.value : `https://${item.value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[13px]">
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-foreground text-[13px]">
                      {item.prefix && <span className="text-muted-foreground">{item.prefix}</span>}
                      <span className="font-medium">{item.value}</span>
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
              {online ? (
                <span className="text-green-500 font-medium text-[13px]">Ativo(a) agora</span>
              ) : profile?.last_seen_at ? (
                <span className="text-[13px] text-muted-foreground">Visto(a) pela última vez {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: ptBR })}</span>
              ) : (
                <span className="text-[13px] text-muted-foreground">Visto(a) recentemente</span>
              )}
            </div>
          </div>

          {/* Facebook-style action buttons */}
          {isOwn && (
            <div className="space-y-1.5">
              <button
                onClick={startEdit}
                className="w-full py-2 rounded-lg bg-secondary hover:bg-muted text-sm font-semibold text-foreground transition-colors"
              >
                Editar detalhes
              </button>
              <button
                className="w-full py-2 rounded-lg bg-secondary hover:bg-muted text-sm font-semibold text-foreground transition-colors"
              >
                Adicionar destaques
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileIntroCard;
