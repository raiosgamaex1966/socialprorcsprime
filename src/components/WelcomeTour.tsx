import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Home,
  MessageCircle,
  MonitorPlay,
  Rocket,
  ShoppingBag,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgGradient: string;
}

const tourSteps: TourStep[] = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Social Pro!",
    description: "Seu novo espaço social para se conectar, compartilhar e descobrir. Deixe-nos guiar você — leva apenas um minuto!",
    color: "text-primary",
    bgGradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Home,
    title: "Seu Feed de Notícias",
    description: "Esta é a sua casa! Veja publicações de amigos, grupos e páginas que você segue. Crie publicações, compartilhe stories e fique atualizado com tudo o que está acontecendo.",
    color: "text-blue-500",
    bgGradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Users,
    title: "Amigos e Grupos",
    description: "Encontre e conecte-se com pessoas que você conhece. Participe de grupos com base nos seus interesses para descobrir comunidades que combinam com suas paixões.",
    color: "text-emerald-500",
    bgGradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: MessageCircle,
    title: "Mensagens",
    description: "Converse com amigos em tempo real! Envie texto, fotos, GIFs, mensagens de voz e reaja às mensagens com emojis.",
    color: "text-violet-500",
    bgGradient: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Compre e venda itens localmente. Navegue por anúncios, faça ofertas e conecte-se com vendedores — tudo dentro da comunidade.",
    color: "text-amber-500",
    bgGradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Calendar,
    title: "Eventos",
    description: "Descubra eventos locais, confirme presença em encontros e crie seus próprios eventos para reunir as pessoas.",
    color: "text-rose-500",
    bgGradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: MonitorPlay,
    title: "Watch & Reels",
    description: "Aproveite os vídeos de criadores que você segue. Assista a conteúdos mais longos ou navegue pelos Reels de formato curto para um entretenimento rápido.",
    color: "text-cyan-500",
    bgGradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Rocket,
    title: "Tudo Pronto!",
    description: "Comece a explorar, conectar-se e compartilhar. Seu perfil está pronto — torne-o exclusivamente seu e comece sua jornada!",
    color: "text-primary",
    bgGradient: "from-primary/20 to-primary/5",
  },
];

interface WelcomeTourProps {
  onComplete: () => void;
}

const WelcomeTour = ({ onComplete }: WelcomeTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === tourSteps.length - 1;
  const isFirst = currentStep === 0;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const goTo = (next: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(next);
      setIsAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    if (isLast) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      goTo(currentStep + 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Gradient header */}
        <div className={cn("bg-gradient-to-b py-10 flex flex-col items-center", step.bgGradient)}>
          <div
            className={cn(
              "w-20 h-20 rounded-2xl bg-card shadow-lg flex items-center justify-center transition-all duration-200",
              isAnimating ? "scale-75 opacity-0" : "scale-100 opacity-100"
            )}
          >
            <Icon className={cn("w-10 h-10", step.color)} />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-6">
          <div
            className={cn(
              "text-center transition-all duration-200",
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">{step.title}</h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed">{step.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-6">
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                      ? "w-2 bg-primary/40"
                      : "w-2 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={() => goTo(currentStep - 1)}
                className="h-11 px-5 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 h-11 rounded-xl text-[15px] font-semibold"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Começar
                </>
              ) : isFirst ? (
                <>
                  Vamos lá
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              ) : (
                <>
                  Avançar
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {currentStep + 1} de {tourSteps.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTour;
