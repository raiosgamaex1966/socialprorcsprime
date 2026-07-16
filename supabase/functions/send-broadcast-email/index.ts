// Admin "send broadcast email" edge function.
// Validates that the caller has the 'admin' role, fetches recipients from
// auth.users via the service role, and sends the email through Resend if
// RESEND_API_KEY is configured. If no key is set, the function returns the
// list of resolved recipients so the admin UI can preview the audience and
// know exactly what would be sent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  subject: string;
  message: string;
  audience: string;
  selectedUsers?: string[];
  testFirst?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Cabeçalho de autorização ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Função de administrador exigida" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Payload = await req.json();
    if (!body.subject?.trim() || !body.message?.trim()) {
      return new Response(JSON.stringify({ error: "Assunto e mensagem exigidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipients
    let recipients: { id: string; email: string }[] = [];
    if (body.testFirst) {
      if (userData.user.email) {
        recipients = [{ id: userData.user.id, email: userData.user.email }];
      }
    } else {
      const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const all = (usersList?.users ?? []).filter((u) => !!u.email);

      const now = Date.now();
      const daysAgo = (d: number) => now - d * 24 * 60 * 60 * 1000;

      const filtered = all.filter((u) => {
        const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        switch (body.audience) {
          case "all":
            return true;
          case "active":
            return lastSignIn >= daysAgo(30);
          case "inactive":
            return lastSignIn > 0 && lastSignIn < daysAgo(30);
          case "no-login-week":
            return lastSignIn > 0 && lastSignIn < daysAgo(7);
          case "no-login-month":
            return lastSignIn > 0 && lastSignIn < daysAgo(30);
          case "no-login-3month":
            return lastSignIn > 0 && lastSignIn < daysAgo(90);
          case "no-login-6month":
            return lastSignIn > 0 && lastSignIn < daysAgo(180);
          case "no-login-9month":
            return lastSignIn > 0 && lastSignIn < daysAgo(270);
          case "no-login-year":
            return lastSignIn > 0 && lastSignIn < daysAgo(365);
          default:
            return true;
        }
      });

      let pool = filtered.map((u) => ({ id: u.id, email: u.email! }));
      if (body.selectedUsers && body.selectedUsers.length) {
        const wanted = new Set(body.selectedUsers.map((s) => s.toLowerCase()));
        pool = pool.filter((u) => wanted.has(u.email.toLowerCase()));
      }
      recipients = pool;
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      // Dry-run mode — return resolved audience so admin can verify before
      // configuring an email provider.
      return new Response(
        JSON.stringify({
          dryRun: true,
          recipientCount: recipients.length,
          message: "Provedor de e-mail não configurado. Adicione RESEND_API_KEY para enviar.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fromAddress = Deno.env.get("EMAIL_FROM") ?? "noreply@example.com";
    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: r.email,
          subject: body.subject,
          html: body.message,
        }),
      });
      if (res.ok) sent++;
      else failed++;
    }

    return new Response(JSON.stringify({ sent, failed, recipientCount: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
