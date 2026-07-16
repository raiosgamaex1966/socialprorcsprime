import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LifeBuoy, Phone, MessageCircle, Globe, Heart, Shield, ExternalLink } from "lucide-react";

interface FindSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const supportResources = [
  {
    title: "CVV - Centro de Valorização da Vida",
    description: "Apoio emocional gratuito, confidencial e disponível 24 horas por dia",
    icon: Phone,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    action: "Ligue 188",
  },
  {
    title: "Central de Atendimento à Mulher",
    description: "Apoio e denúncias para vítimas de violência doméstica e de gênero",
    icon: Shield,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    action: "Ligue 180",
  },
  {
    title: "Linha de Apoio a Crise (Texto)",
    description: "Envie HOME para 741741 para apoio gratuito e 24h a crises via SMS",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    action: "Envie HOME para 741741",
  },
  {
    title: "SAMHSA (Saúde Mental)",
    description: "Administração de Serviços de Saúde Mental e Abuso de Substâncias",
    icon: Heart,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    action: "Ligue 1-800-662-4357",
  },
  {
    title: "Diretrizes da Comunidade",
    description: "Saiba o que é permitido na nossa plataforma",
    icon: Globe,
    color: "text-primary",
    bg: "bg-primary/10",
    action: "Ver diretrizes",
  },
];

const FindSupportModal = ({ open, onOpenChange }: FindSupportModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" />
            Buscar Apoio
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se você ou alguém que você conhece está passando por dificuldades, estes recursos podem ajudar.
        </p>
        <div className="space-y-2 mt-2">
          {supportResources.map((resource) => (
            <div
              key={resource.title}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${resource.bg} shrink-0`}>
                <resource.icon className={`w-5 h-5 ${resource.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{resource.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{resource.description}</p>
                <p className="text-xs font-medium text-primary mt-1">{resource.action}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FindSupportModal;
