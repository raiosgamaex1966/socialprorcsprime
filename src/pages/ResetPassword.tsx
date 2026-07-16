import socialproLogoDark from "@/assets/socialpro-logo-dark-2.png";
import socialproLogoLight from "@/assets/socialpro-logo-light-2.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ResetPassword = () => {
  const { isDark } = useDarkMode();
  const { branding } = useSiteBranding();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery (in case event already fired)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <img src={isDark ? (branding.darkLogoUrl || socialproLogoLight) : (branding.logoUrl || socialproLogoDark)} alt="Social Pro" className="h-14 mx-auto mb-3" />
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-6 space-y-5">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 text-primary mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Senha Atualizada</h1>
              <p className="text-sm text-muted-foreground">
                Sua senha foi redefinida com sucesso. Agora você pode fazer login com a sua nova senha.
              </p>
              <Button onClick={() => navigate("/auth")} className="w-full h-11" size="lg">
                Ir para o Login
              </Button>
            </div>
          ) : !isRecovery ? (
            <div className="text-center space-y-4 py-4">
              <h1 className="text-xl font-bold text-foreground">Link de Redefinição Inválido</h1>
              <p className="text-sm text-muted-foreground">
                Este link de redefinição de senha é inválido ou expirou. Solicite um novo.
              </p>
              <Button onClick={() => navigate("/auth")} className="w-full h-11" size="lg">
                Voltar para o Login
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">Definir Nova Senha</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Insira sua nova senha abaixo.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mín. 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn("pl-10 h-11 pr-10")}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Digite novamente sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn("pl-10 h-11 pr-10")}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 text-[15px] font-semibold" size="lg">
                  {loading ? "Atualizando..." : "Redefinir Senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
