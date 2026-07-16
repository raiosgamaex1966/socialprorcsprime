import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, Users, Search, TestTube, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const audienceOptions = [
  { value: "all", label: "Todos os usuários" },
  { value: "active", label: "Todos os usuários ativos" },
  { value: "inactive", label: "Todos os usuários inativos" },
  { value: "no-login-week", label: "Usuários que não logam há uma semana", approx: 3170 },
  { value: "no-login-month", label: "Usuários que não logam há um mês", approx: 13624 },
  { value: "no-login-3month", label: "Usuários que não logam há 3 meses", approx: 59013 },
  { value: "no-login-6month", label: "Usuários que não logam há 6 meses", approx: 24744 },
  { value: "no-login-9month", label: "Usuários que não logam há 9 meses", approx: 25805 },
  { value: "no-login-year", label: "Usuários que não logam há um ano", approx: 67058 },
];

const AdminSendEmail = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [searchUsers, setSearchUsers] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [testFirst, setTestFirst] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedAudience = audienceOptions.find((a) => a.value === audience);

  const handleAddUser = () => {
    if (searchUsers.trim() && !selectedUsers.includes(searchUsers.trim())) {
      setSelectedUsers((prev) => [...prev, searchUsers.trim()]);
      setSearchUsers("");
    }
  };

  const handleRemoveUser = (user: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u !== user));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Por favor, insira o assunto do e-mail");
      return;
    }
    if (!message.trim()) {
      toast.error("Por favor, insira uma mensagem");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          subject: subject.trim(),
          message,
          audience,
          selectedUsers,
          testFirst,
        },
      });
      if (error) throw error;
      if (data?.dryRun) {
        toast.success(
          `Público resolvido: ${data.recipientCount} destinatário(s). ${data.message}`
        );
      } else if (typeof data?.sent === "number") {
        toast.success(
          `E-mail enviado para ${data.sent} de ${data.recipientCount} destinatário(s)${
            data.failed ? ` — ${data.failed} falharam` : ""
          }`
        );
      } else {
        toast.success("Envio em massa enfileirado");
      }
    } catch (err: any) {
      toast.error(`Falha ao enviar: ${err?.message ?? "Erro desconhecido"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Enviar E-mail para Usuários
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escreva e envie e-mails para os seus usuários. Você pode direcionar a grupos específicos ou usuários individuais.
        </p>
      </div>

      {/* Compose */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Escrever Mensagem</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Escolha o título da sua mensagem."
              className="h-9"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Mensagem</Label>
              <Badge variant="secondary" className="text-[10px] font-normal">HTML Permitido</Badge>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva sua mensagem aqui."
              className="min-h-[200px] resize-y font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Destinatários</CardTitle>
          </div>
          <CardDescription className="text-xs">Escolha o tipo de usuários para quem você deseja enviar a mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audience Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Enviar E-mail Para</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    {opt.approx && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        — aprox. ({opt.approx.toLocaleString()} Usuários)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Users */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pesquisar Usuários (Opcional)</Label>
            <p className="text-[10px] text-muted-foreground">
              Enviar apenas para estes usuários, deixe em branco para enviar para todos os usuários do público selecionado.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                  placeholder="Pesquisar por usuário ou e-mail..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddUser} className="h-9">
                Adicionar
              </Button>
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedUsers.map((user) => (
                  <Badge key={user} variant="secondary" className="gap-1 text-xs pr-1">
                    {user}
                    <button
                      onClick={() => handleRemoveUser(user)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Test checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="test-email"
              checked={testFirst}
              onCheckedChange={(v) => setTestFirst(v === true)}
            />
            <label htmlFor="test-email" className="flex items-center gap-1.5 text-sm cursor-pointer">
              <TestTube className="w-3.5 h-3.5 text-muted-foreground" />
              Mensagem de Teste (Enviar para o meu e-mail primeiro)
            </label>
          </div>

          {/* Summary */}
          {!testFirst && (
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Este e-mail será enviado para{" "}
                {selectedUsers.length > 0 ? (
                  <span className="font-medium text-foreground">{selectedUsers.length} usuário(s) específico(s)</span>
                ) : (
                  <span className="font-medium text-foreground">{selectedAudience?.label}</span>
                )}
                {selectedAudience?.approx && selectedUsers.length === 0 && (
                  <span> — aproximadamente {selectedAudience.approx.toLocaleString()} usuários</span>
                )}
              </p>
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending} className="gap-1.5">
              <Send className="w-4 h-4" />
              {sending ? "Enviando..." : testFirst ? "Enviar E-mail de Teste" : "Enviar E-mail"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSendEmail;
