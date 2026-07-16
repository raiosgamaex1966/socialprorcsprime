import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSetupCheck } from "@/hooks/useSetupCheck";
import { supabase } from "@/integrations/supabase/client";
// import { lovable } from "@/integrations/lovable/index"; // LOGIN SOCIAL DESATIVADO
import { ArrowLeft, Camera, Sun, Moon, ImagePlus, Sparkles, Heart, Dumbbell, Music, Film, Gamepad2, BookOpen, Plane, Utensils, Code, Palette, Trophy, Briefcase, Search, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, Phone, MapPin, Calendar, ChevronRight, ChevronLeft, UserPlus, LogIn, FileText, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import socialproLogoDark from "@/assets/socialpro-logo-dark-2.png";
import socialproLogoLight from "@/assets/socialpro-logo-light-2.png";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import defaultAvatar from "@/assets/default-avatar.jpg";
import AvatarCropModal from "@/components/AvatarCropModal";

const IconInput = ({
  icon: Icon,
  rightElement,
  className: extraClass,
  ...props
}: React.ComponentProps<"input"> & {
  icon: React.ElementType;
  rightElement?: React.ReactNode;
}) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
    <Input className={cn("pl-10 h-11", rightElement && "pr-10", extraClass)} {...props} />
    {rightElement && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
    )}
  </div>
);

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

const Auth = () => {
  const { isSetupComplete, loading: setupCheckLoading } = useSetupCheck();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Redirect to setup if no admin exists
  useEffect(() => {
    if (isSetupComplete === false) {
      navigate("/setup", { replace: true });
    }
  }, [isSetupComplete, navigate]);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rawAvatarSrc, setRawAvatarSrc] = useState<string | null>(null);
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // navigate already declared above
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { branding } = useSiteBranding();

  const TOTAL_STEPS = 7;

  const INTEREST_OPTIONS = [
    { value: "sports", label: "Esportes", icon: Dumbbell },
    { value: "music", label: "Música", icon: Music },
    { value: "movies", label: "Filmes e TV", icon: Film },
    { value: "gaming", label: "Jogos", icon: Gamepad2 },
    { value: "reading", label: "Leitura", icon: BookOpen },
    { value: "travel", label: "Viagem", icon: Plane },
    { value: "food", label: "Culinária", icon: Utensils },
    { value: "tech", label: "Tecnologia", icon: Code },
    { value: "art", label: "Arte e Design", icon: Palette },
    { value: "fitness", label: "Fitness", icon: Trophy },
    { value: "business", label: "Negócios", icon: Briefcase },
    { value: "nature", label: "Natureza", icon: Heart },
  ];

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setDateOfBirth(undefined);
    setGender("");
    setPhone("");
    setLocation("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setBio("");
    setInterests([]);
    setStep(1);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem de capa deve ter menos de 10MB");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const toggleInterest = (value: string) => {
    setInterests(prev =>
      prev.includes(value)
        ? prev.filter(i => i !== value)
        : prev.length < 8
          ? [...prev, value]
          : (toast.error("Você pode selecionar até 8 interesses"), prev)
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setRawAvatarSrc(url);
    setShowAvatarCrop(true);
    // Reset input so re-selecting the same file triggers change
    e.target.value = "";
  };

  const handleAvatarCropComplete = (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(blob));
    setShowAvatarCrop(false);
    setRawAvatarSrc(null);
  };

  const handleAvatarCropCancel = () => {
    setShowAvatarCrop(false);
    if (rawAvatarSrc) URL.revokeObjectURL(rawAvatarSrc);
    setRawAvatarSrc(null);
  };

  const validateStep1 = () => {
    if (!displayName.trim()) {
      toast.error("Por favor, insira seu nome");
      return false;
    }
    if (!email.trim()) {
      toast.error("Por favor, insira seu e-mail");
      return false;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return false;
    }
    return true;
  };

  // --- LOGIN SOCIAL DESATIVADO ---
  // const handleGoogleSignIn = async () => {
  //   setLoading(true);
  //   try {
  //     const result = await lovable.auth.signInWithOAuth("google", {
  //       redirect_uri: window.location.origin,
  //     });
  //     if (result.error) {
  //       toast.error(result.error instanceof Error ? result.error.message : "Falha ao entrar com o Google");
  //     }
  //     if (result.redirected) return;
  //   } catch (error: any) {
  //     toast.error(error.message || "Falha ao entrar com o Google");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleAppleSignIn = async () => {
  //   setLoading(true);
  //   try {
  //     const result = await lovable.auth.signInWithOAuth("apple", {
  //       redirect_uri: window.location.origin,
  //     });
  //     if (result.error) {
  //       toast.error(result.error instanceof Error ? result.error.message : "Falha ao entrar com a Apple");
  //     }
  //     if (result.redirected) return;
  //   } catch (error: any) {
  //     toast.error(error.message || "Falha ao entrar com a Apple");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // --- FIM LOGIN SOCIAL DESATIVADO ---

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Por favor, insira seu e-mail");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !signupEmail) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: signupEmail });
      if (error) throw error;
      toast.success("E-mail de verificação enviado novamente!");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Falha ao reenviar o e-mail");
    } finally {
      setResendLoading(false);
    }
  };

  const handleNextStep = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");

        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        const isAdmin = roles?.some((r: any) => r.role === "admin");
        const isModerator = roles?.some((r: any) => r.role === "moderator");

        if (isAdmin) navigate("/admin");
        else if (isModerator) navigate("/moderator");
        else navigate("/");
      } else {
        if (!dateOfBirth) {
          toast.error("Por favor, selecione sua data de nascimento");
          setLoading(false);
          return;
        }
        const today = new Date();
        const ageAtSubmit = today.getFullYear() - dateOfBirth.getFullYear() - (today < new Date(today.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate()) ? 1 : 0);
        if (ageAtSubmit < 13) {
          toast.error("Você deve ter pelo menos 13 anos para se cadastrar");
          setLoading(false);
          return;
        }
        if (!gender) {
          toast.error("Por favor, selecione seu gênero");
          setLoading(false);
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (signUpData.user) {
          let avatarUrl: string | null = null;
          let coverUrl: string | null = null;

          // Upload avatar if provided
          if (avatarFile) {
            const fileExt = avatarFile.name.split(".").pop();
            const filePath = `${signUpData.user.id}/avatar.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from("profile-images")
              .upload(filePath, avatarFile, { upsert: true });
            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("profile-images")
                .getPublicUrl(filePath);
              avatarUrl = urlData.publicUrl;
            }
          }

          // Upload cover photo if provided
          if (coverFile) {
            const coverExt = coverFile.name.split(".").pop();
            const coverPath = `${signUpData.user.id}/cover.${coverExt}`;
            const { error: coverUploadError } = await supabase.storage
              .from("profile-images")
              .upload(coverPath, coverFile, { upsert: true });
            if (!coverUploadError) {
              const { data: coverUrlData } = supabase.storage
                .from("profile-images")
                .getPublicUrl(coverPath);
              coverUrl = coverUrlData.publicUrl;
            }
          }

          await (supabase as any)
            .from("profiles")
            .update({
              date_of_birth: format(dateOfBirth, "yyyy-MM-dd"),
              gender,
              phone: phone || null,
              location: location || null,
              bio: bio.trim() || null,
              interests: interests.length > 0 ? interests : [],
              ...(avatarUrl && { avatar_url: avatarUrl }),
              ...(coverUrl && { cover_photo_url: coverUrl }),
            })
            .eq("user_id", signUpData.user.id);
        }

        setSignupEmail(email);
        setShowEmailVerification(true);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showAvatarCrop && rawAvatarSrc && (
        <AvatarCropModal
          imageSrc={rawAvatarSrc}
          onCropComplete={handleAvatarCropComplete}
          onCancel={handleAvatarCropCancel}
        />
      )}
      <div className="min-h-screen bg-background flex relative">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-secondary text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {/* ─── LEFT PANEL (multi-radial gradient) ─── */}
        <div
          className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden"
          style={{
            background: isDark
              ? "radial-gradient(circle at 20% 20%, hsl(220 70% 25%) 0%, transparent 50%), radial-gradient(circle at 80% 30%, hsl(260 60% 30%) 0%, transparent 45%), radial-gradient(circle at 50% 80%, hsl(200 80% 20%) 0%, transparent 50%), radial-gradient(circle at 10% 70%, hsl(280 50% 20%) 0%, transparent 40%), hsl(220 40% 8%)"
              : "radial-gradient(circle at 20% 20%, hsl(210 100% 80%) 0%, transparent 50%), radial-gradient(circle at 80% 30%, hsl(260 80% 85%) 0%, transparent 45%), radial-gradient(circle at 50% 80%, hsl(180 70% 82%) 0%, transparent 50%), radial-gradient(circle at 10% 70%, hsl(320 60% 88%) 0%, transparent 40%), hsl(220 60% 97%)",
          }}
        >
          {/* Subtle animated glow orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: isDark ? "hsl(210 100% 50%)" : "hsl(210 100% 70%)" }} />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl animate-pulse" style={{ background: isDark ? "hsl(280 80% 50%)" : "hsl(280 80% 75%)", animationDelay: "1s" }} />

          <div className="relative z-10 max-w-md w-full space-y-8">
            {/* Logo & Heading */}
            <div className="text-center space-y-4">
              <img src={isDark ? (branding.darkLogoUrl || socialproLogoLight) : (branding.logoUrl || socialproLogoDark)} alt="Social Pro" className="h-14 mx-auto" />
              <h2 className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                Sua nova rede social
              </h2>
              <p className={cn("text-base leading-relaxed max-w-sm mx-auto", isDark ? "text-white/70" : "text-slate-600")}>
                Um espaço moderno e acolhedor para compartilhar momentos, fazer novos amigos e construir comunidades de forma segura.
              </p>
            </div>

            {/* Stats row / Value highlights */}
            <div className="flex justify-center gap-8">
              {[
                { value: "100%", label: "Seguro & Privado" },
                { value: "Livre", label: "De anúncios chatos" },
                { value: "Foco", label: "Em conexões reais" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-800")}>{stat.value}</div>
                  <div className={cn("text-xs uppercase tracking-wider mt-0.5", isDark ? "text-white/50" : "text-slate-500")}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, title: "Comunidades", desc: "Participe de grupos sobre o que você mais ama" },
                { icon: Lock, title: "Privacidade", desc: "Seus dados e postagens sob seu total controle" },
                { icon: Sparkles, title: "Interface Fluida", desc: "Design moderno, rápido e sem poluição visual" },
                { icon: Heart, title: "Conexões Reais", desc: "Feito para aproximar você de amigos e familiares" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className={cn(
                    "rounded-xl p-4 backdrop-blur-sm border transition-colors",
                    isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/10"
                      : "bg-white/60 border-white/80 hover:bg-white/80 shadow-sm"
                  )}
                >
                  <feature.icon className={cn("w-5 h-5 mb-2", isDark ? "text-blue-400" : "text-blue-600")} />
                  <div className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-800")}>{feature.title}</div>
                  <div className={cn("text-xs mt-0.5 leading-snug", isDark ? "text-white/50" : "text-slate-500")}>{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL (form) ─── */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-[420px]">
            {/* Logo (mobile only) */}
            <div className="text-center mb-8 lg:hidden">
              <img src={isDark ? (branding.darkLogoUrl || socialproLogoLight) : (branding.logoUrl || socialproLogoDark)} alt="Social Pro" className="h-14 mx-auto mb-3" />
              <p className="text-muted-foreground text-base">
                Conecte-se com amigos e o mundo ao seu redor.
              </p>
            </div>

            {/* Auth Form (no card styling) */}
            <div className="space-y-5">
              {/* ─── EMAIL VERIFICATION SCREEN ─── */}
              {showEmailVerification ? (
                <div className="text-center space-y-5 py-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MailCheck className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Verifique seu e-mail</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Enviamos um link de verificação para
                    </p>
                    <p className="text-sm font-semibold text-foreground">{signupEmail}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Clique no link no seu e-mail para verificar sua conta e começar a usar o Social Pro.
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-left">
                    <p className="text-xs font-medium text-foreground">Não recebeu o e-mail?</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Verifique sua pasta de spam ou lixo eletrônico</li>
                      <li>Certifique-se de ter inserido o e-mail correto</li>
                      <li>Aguarde alguns minutos e tente enviar novamente</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                    variant="outline"
                    className="w-full h-11 text-[15px] font-semibold"
                    size="lg"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-1.5", resendLoading && "animate-spin")} />
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar E-mail de Verificação"}
                  </Button>

                  <Button
                    onClick={() => {
                      setShowEmailVerification(false);
                      setSignupEmail("");
                      setIsLogin(true);
                    }}
                    className="w-full h-11 text-[15px] font-semibold"
                    size="lg"
                  >
                    <LogIn className="w-4 h-4 mr-1.5" /> Ir para o Login
                  </Button>
                </div>
              ) :
                showForgotPassword ? (
                  forgotSent ? (
                    <div className="text-center space-y-4 py-4">
                      <Mail className="w-14 h-14 text-primary mx-auto" />
                      <h1 className="text-xl font-bold text-foreground">Verifique seu e-mail</h1>
                      <p className="text-sm text-muted-foreground">
                        Enviamos um link de redefinição de senha para <strong className="text-foreground">{forgotEmail}</strong>. Verifique sua caixa de entrada e siga o link para redefinir sua senha.
                      </p>
                      <Button
                        onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(""); }}
                        variant="secondary"
                        className="w-full h-11"
                        size="lg"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para o Login
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <h1 className="text-xl font-bold text-foreground">Esqueci a Senha</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                          Digite seu e-mail e enviaremos um link para redefinir sua senha.
                        </p>
                      </div>
                      <form onSubmit={handleForgotPassword} className="space-y-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="forgot-email">E-mail</Label>
                          <IconInput
                            id="forgot-email"
                            icon={Mail}
                            type="email"
                            placeholder="voce@exemplo.com"
                            value={forgotEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotEmail(e.target.value)}
                            required
                            maxLength={255}
                            autoComplete="email"
                          />
                        </div>
                        <Button type="submit" disabled={forgotLoading} className="w-full h-11 text-[15px] font-semibold" size="lg">
                          {forgotLoading ? "Enviando..." : "Enviar Link de Redefinição"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => { setShowForgotPassword(false); setForgotEmail(""); }}
                          className="w-full h-11 text-[15px]"
                          size="lg"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para o Login
                        </Button>
                      </form>
                    </>
                  )
                ) : (
                  <>
                    {/* Title */}
                    <div className="text-center">
                      <h1 className="text-xl font-bold text-foreground">
                        {isLogin ? "Bem-vindo de volta" : step === 1 ? "Criar Conta" : step === 2 ? "Completar Perfil" : step === 3 ? "Foto de Perfil" : step === 4 ? "Foto de Capa" : step === 5 ? "Sobre Você" : step === 6 ? "Seus Interesses" : "Encontrar Amigos"}
                      </h1>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isLogin
                          ? "Faça login para continuar no Social Pro"
                          : step === 1 ? `Passo 1 de ${TOTAL_STEPS} — Detalhes da conta`
                            : step === 2 ? `Passo 2 de ${TOTAL_STEPS} — Conte-nos sobre você`
                              : step === 3 ? `Passo 3 de ${TOTAL_STEPS} — Adicione uma foto de perfil`
                                : step === 4 ? `Passo 4 de ${TOTAL_STEPS} — Adicione uma foto de capa`
                                  : step === 5 ? `Passo 5 de ${TOTAL_STEPS} — Escreva uma breve biografia`
                                    : step === 6 ? `Passo 6 de ${TOTAL_STEPS} — Escolha seus interesses`
                                      : `Passo 7 de ${TOTAL_STEPS} — Conecte-se com pessoas`}
                      </p>
                    </div>

                    {/* Step progress for signup */}
                    {!isLogin && (
                      <div className="flex items-center gap-1 px-4">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 h-1.5 rounded-full transition-all duration-300",
                              step >= i + 1 ? "bg-primary" : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      {/* ─── LOGIN ─── */}
                      {isLogin && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="login-email">E-mail</Label>
                            <IconInput
                              id="login-email"
                              icon={Mail}
                              type="email"
                              placeholder="voce@exemplo.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              maxLength={255}
                              autoComplete="email"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="login-password">Senha</Label>
                            <IconInput
                              id="login-password"
                              icon={Lock}
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={6}
                              autoComplete="current-password"
                              rightElement={
                                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                              }
                            />
                          </div>

                          <Button type="submit" disabled={loading} className="w-full h-11 text-[15px] font-semibold" size="lg">
                            <LogIn className="w-4 h-4 mr-1" />
                            {loading ? "Entrando..." : "Entrar"}
                          </Button>

                          <p className="text-center">
                            <button type="button" onClick={() => setShowForgotPassword(true)} className="text-primary text-sm hover:underline">
                              Esqueceu a senha?
                            </button>
                          </p>

                          {/* --- LOGIN SOCIAL DESATIVADO ---
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>

                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 h-11"
                              onClick={handleGoogleSignIn}
                              disabled={loading}
                            >
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                              </svg>
                              Google
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 h-11"
                              onClick={handleAppleSignIn}
                              disabled={loading}
                            >
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                              </svg>
                              Apple
                            </Button>
                          </div>
                          --- FIM LOGIN SOCIAL DESATIVADO --- */}

                          {/* Demo Quick Login — only visible when VITE_DEMO_MODE=true */}
                          {import.meta.env.VITE_DEMO_MODE === 'true' && (
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">Login Rápido de Demonstração</p>
                              </div>
                              <p className="text-[11px] text-muted-foreground">Selecione uma função para entrar instantaneamente com uma conta de demonstração.</p>
                              <div className="grid grid-cols-1 gap-2">
                                {[
                                  { label: "Usuário", email: "user@demo.com", password: "User123!", icon: "👤", desc: "Usuário padrão" },
                                  { label: "Moderador", email: "moderator@demo.com", password: "Moderator123!", icon: "🛡️", desc: "Moderação de conteúdo" },
                                  { label: "Administrador", email: "admin@demo.com", password: "Admin123!", icon: "⚙️", desc: "Acesso total" },
                                ].map((account) => (
                                  <button
                                    key={account.email}
                                    type="button"
                                    disabled={loading}
                                    className="flex items-center gap-3 w-full rounded-lg border border-border bg-card p-2.5 text-left hover:bg-secondary/60 transition-colors disabled:opacity-50"
                                    onClick={async () => {
                                      setLoading(true);
                                      try {
                                        const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });

                                        if (error) {
                                          const { data: seedData, error: seedError } = await supabase.functions.invoke("seed-demo?force=true", { body: {} });
                                          if (seedError || seedData?.error) {
                                            throw error; // throw original login error if seeding fails
                                          }
                                          // Retry sign in after seeding
                                          const retry = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
                                          if (retry.error) throw retry.error;
                                        }

                                        toast.success(`Bem-vindo! Logado como ${account.label}`);
                                        navigate("/");
                                      } catch (err: any) {
                                        toast.error(err.message || "Falha no login de demonstração");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                  >
                                    <span className="text-lg">{account.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-foreground">{account.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{account.desc} · {account.email}</p>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* ─── SIGNUP STEP 1 ─── */}
                      {!isLogin && step === 1 && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="signup-name">Nome completo</Label>
                            <IconInput
                              id="signup-name"
                              icon={User}
                              type="text"
                              placeholder="João Silva"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              maxLength={100}
                              autoComplete="name"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="signup-email">E-mail</Label>
                            <IconInput
                              id="signup-email"
                              icon={Mail}
                              type="email"
                              placeholder="voce@exemplo.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              maxLength={255}
                              autoComplete="email"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="signup-password">Senha</Label>
                            <IconInput
                              id="signup-password"
                              icon={Lock}
                              type={showPassword ? "text" : "password"}
                              placeholder="Mín. 6 caracteres"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              minLength={6}
                              autoComplete="new-password"
                              rightElement={
                                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="signup-confirm">Confirmar senha</Label>
                            <IconInput
                              id="signup-confirm"
                              icon={Lock}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Digite sua senha novamente"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              minLength={6}
                              autoComplete="new-password"
                              rightElement={
                                <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                              }
                            />
                          </div>

                          <Button type="button" onClick={handleNextStep} className="w-full h-11 text-[15px] font-semibold" size="lg">
                            Continuar <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>

                          {/* --- LOGIN SOCIAL DESATIVADO ---
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou cadastre-se com</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>

                          <div className="flex gap-3">
                            <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleGoogleSignIn} disabled={loading}>
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                              </svg>
                              Google
                            </Button>
                            <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleAppleSignIn} disabled={loading}>
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                              </svg>
                              Apple
                            </Button>
                          </div>
                          --- FIM LOGIN SOCIAL DESATIVADO --- */}
                        </>
                      )}

                      {/* ─── SIGNUP STEP 2 ─── */}
                      {!isLogin && step === 2 && (
                        <>
                          <div className="space-y-1.5">
                            <Label>Data de nascimento</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full h-11 pl-10 justify-start text-left font-normal relative",
                                    !dateOfBirth && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                  {dateOfBirth ? format(dateOfBirth, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione seu aniversário"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={dateOfBirth}
                                  onSelect={setDateOfBirth}
                                  disabled={(date) => {
                                    const today = new Date();
                                    const minAge13 = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
                                    return date > minAge13 || date < new Date("1900-01-01");
                                  }}
                                  initialFocus
                                  captionLayout="dropdown-buttons"
                                  fromYear={1920}
                                  toYear={new Date().getFullYear() - 13}
                                  className={cn("p-3 pointer-events-auto")}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Gênero</Label>
                            <Select value={gender} onValueChange={setGender}>
                              <SelectTrigger className="w-full h-11 pl-10 relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                                <SelectValue placeholder="Selecione o gênero" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Masculino</SelectItem>
                                <SelectItem value="female">Feminino</SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefiro não dizer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="signup-phone">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <IconInput
                              id="signup-phone"
                              icon={Phone}
                              type="tel"
                              placeholder="+55 (11) 99999-9999"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              maxLength={20}
                              autoComplete="tel"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="signup-location">Localização <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <IconInput
                              id="signup-location"
                              icon={MapPin}
                              type="text"
                              placeholder="Cidade ou Estado"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              maxLength={100}
                              autoComplete="address-level2"
                            />
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(1)}
                              className="flex-1 h-11 text-[15px] font-semibold"
                              size="lg"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                if (!dateOfBirth) { toast.error("Por favor, selecione sua data de nascimento"); return; }
                                const today = new Date();
                                const age = today.getFullYear() - dateOfBirth.getFullYear() - (today < new Date(today.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate()) ? 1 : 0);
                                if (age < 13) { toast.error("Você deve ter pelo menos 13 anos para se cadastrar"); return; }
                                if (!gender) { toast.error("Por favor, selecione seu gênero"); return; }
                                setStep(3);
                              }}
                              className="flex-1 h-11 text-[15px] font-semibold"
                              size="lg"
                            >
                              Continuar <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* ─── SIGNUP STEP 3: AVATAR ─── */}
                      {!isLogin && step === 3 && (
                        <>
                          <div className="flex flex-col items-center gap-4 py-2">
                            <div className="relative group">
                              <img
                                src={avatarPreview || defaultAvatar}
                                alt="Foto de perfil"
                                className="w-28 h-28 rounded-full object-cover border-4 border-border shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Camera className="w-7 h-7 text-white" />
                              </button>
                              <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => avatarInputRef.current?.click()}
                              className="text-sm"
                            >
                              <Camera className="w-4 h-4 mr-1.5" />
                              {avatarPreview ? "Alterar Foto" : "Enviar Foto"}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Você sempre pode adicionar ou alterar sua foto mais tarde
                            </p>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(2)}
                              className="flex-1 h-11 text-[15px] font-semibold"
                              size="lg"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setStep(4)}
                              className="flex-1 h-11 text-[15px] font-semibold"
                              size="lg"
                            >
                              Continuar <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* ─── SIGNUP STEP 4: COVER PHOTO ─── */}
                      {!isLogin && step === 4 && (
                        <>
                          <div className="flex flex-col items-center gap-4 py-2">
                            <div
                              className="relative w-full h-36 rounded-xl bg-muted border-2 border-dashed border-border overflow-hidden cursor-pointer group"
                              onClick={() => coverInputRef.current?.click()}
                            >
                              {coverPreview ? (
                                <img src={coverPreview} alt="Foto de capa" className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                  <ImagePlus className="w-8 h-8" />
                                  <span className="text-sm font-medium">Clique para enviar a foto de capa</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                              </div>
                              <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleCoverChange}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Recomendado: proporção 16:5. Você pode alterar isso mais tarde.
                            </p>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button type="button" onClick={() => setStep(5)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              {coverPreview ? "Continuar" : "Pular"} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* ─── SIGNUP STEP 5: BIO ─── */}
                      {!isLogin && step === 5 && (
                        <>
                          <div className="space-y-3 py-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                              <FileText className="w-7 h-7 text-primary" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="signup-bio">Escreva uma breve biografia</Label>
                              <Textarea
                                id="signup-bio"
                                placeholder="Conte um pouco sobre você..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={300}
                                rows={4}
                                className="resize-none"
                              />
                              <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={() => setStep(4)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button type="button" onClick={() => setStep(6)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              {bio.trim() ? "Continuar" : "Pular"} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* ─── SIGNUP STEP 6: INTERESTS ─── */}
                      {!isLogin && step === 6 && (
                        <>
                          <div className="space-y-3 py-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                              <Sparkles className="w-7 h-7 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">Selecione até 8 tópicos nos quais você se interessa</p>
                            <div className="grid grid-cols-2 gap-2">
                              {INTEREST_OPTIONS.map(({ value, label, icon: Icon }) => {
                                const selected = interests.includes(value);
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => toggleInterest(value)}
                                    className={cn(
                                      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                      selected
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                  >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            {interests.length > 0 && (
                              <p className="text-xs text-primary font-medium text-center">{interests.length} selecionados</p>
                            )}
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={() => setStep(5)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button type="button" onClick={() => setStep(7)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              {interests.length > 0 ? "Continuar" : "Pular"} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* ─── SIGNUP STEP 7: FIND FRIENDS ─── */}
                      {!isLogin && step === 7 && (
                        <>
                          <div className="space-y-4 py-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                              <Users className="w-7 h-7 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground text-center leading-relaxed">
                              Você pode encontrar e se conectar com amigos após o cadastro. Sugeriremos pessoas com base nos seus interesses e localização.
                            </p>
                            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Search className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">Buscar por nome ou e-mail</p>
                                  <p className="text-xs text-muted-foreground">Encontre pessoas que você conhece</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">Sugestões inteligentes</p>
                                  <p className="text-xs text-muted-foreground">Com base nos seus interesses e localização</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserPlus className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">Enviar solicitações de amizade</p>
                                  <p className="text-xs text-muted-foreground">Conecte-se e comece a compartilhar</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={() => setStep(6)} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                            </Button>
                            <Button type="submit" disabled={loading} className="flex-1 h-11 text-[15px] font-semibold" size="lg">
                              <UserPlus className="w-4 h-4 mr-1" />
                              {loading ? "Criando..." : "Cadastrar-se"}
                            </Button>
                          </div>
                        </>
                      )}
                    </form>

                    <div className="border-t border-border" />

                    <div className="text-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          resetForm();
                        }}
                        className="h-11 px-8 text-[15px] font-semibold"
                        size="lg"
                      >
                        {isLogin ? (
                          <>
                            <UserPlus className="w-4 h-4 mr-1.5" /> Criar nova conta
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 mr-1.5" /> Já tem uma conta? Entrar
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Ao se cadastrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
            </p>
            <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
              Desenvolvido por <a href="https://afcode.com.br/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">afCode</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
