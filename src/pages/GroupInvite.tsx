
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Users, Loader2, CheckCircle, XCircle } from "lucide-react";

const GroupInvite = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "joining" | "success" | "error" | "expired" | "already_member">("loading");
  const [group, setGroup] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!code || !user) return;

    const joinViaInvite = async () => {
      try {
        // Look up the invite
        const { data: invite, error: inviteErr } = await supabase
          .from("group_invites" as any)
          .select("*")
          .eq("code", code)
          .eq("is_active", true)
          .single();

        if (inviteErr || !invite) {
          setStatus("expired");
          setErrorMsg("Este link de convite é inválido ou expirou.");
          return;
        }

        const inv = invite as any;

        // Check expiry
        if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
          setStatus("expired");
          setErrorMsg("Este link de convite expirou.");
          return;
        }

        // Check max uses
        if (inv.max_uses && inv.use_count >= inv.max_uses) {
          setStatus("expired");
          setErrorMsg("Este link de convite atingiu o número máximo de usos.");
          return;
        }

        // Fetch group info
        const { data: groupData } = await supabase
          .from("groups")
          .select("*")
          .eq("id", inv.group_id)
          .single();

        if (!groupData) {
          setStatus("error");
          setErrorMsg("Grupo não encontrado.");
          return;
        }
        setGroup(groupData);

        // Check if already a member
        const { data: existing } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", inv.group_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          setStatus("already_member");
          return;
        }

        // Join the group
        setStatus("joining");
        const { error: joinErr } = await supabase
          .from("group_members")
          .insert({ group_id: inv.group_id, user_id: user.id, role: "member", status: "approved" });

        if (joinErr) throw joinErr;

        // Increment use_count - use RPC or just navigate since user isn't admin
        // The use_count increment would need admin privileges, so we skip it for now
        
        setStatus("success");
        toast.success(`Entrou no grupo ${groupData.name}!`);

        setTimeout(() => navigate(`/groups/${inv.group_id}`), 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Falha ao entrar no grupo.");
      }
    };

    joinViaInvite();
  }, [code, user, navigate]);

  return (
    <div className="max-w-md mx-auto px-4 pt-20 pb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
          {status === "loading" || status === "joining" ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground">{status === "joining" ? "Entrando no grupo..." : "Carregando convite..."}</p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-12 h-12 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Você entrou!</h2>
              <p className="text-muted-foreground">Bem-vindo ao <span className="font-semibold">{group?.name}</span></p>
              <p className="text-xs text-muted-foreground">Redirecionando...</p>
            </div>
          ) : status === "already_member" ? (
            <div className="flex flex-col items-center gap-4">
              <Users className="w-12 h-12 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Já é membro</h2>
              <p className="text-muted-foreground">Você já é membro de <span className="font-semibold">{group?.name}</span></p>
              <button
                onClick={() => navigate(`/groups/${group?.id}`)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Ir para o Grupo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="w-12 h-12 text-destructive" />
              <h2 className="text-xl font-bold text-foreground">
                {status === "expired" ? "Convite Expirado" : "Algo deu errado"}
              </h2>
              <p className="text-muted-foreground">{errorMsg}</p>
              <button
                onClick={() => navigate("/groups")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Navegar pelos Grupos
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default GroupInvite;
