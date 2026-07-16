import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const url = new URL(req.url);
    const isForce = url.searchParams.get("force") === "true";

    if (!isForce) {
      // Block if already seeded (admin already exists)
      const { data: existingAdmins } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (existingAdmins && existingAdmins.length > 0) {
        return new Response(
          JSON.stringify({ error: "Configuração já concluída. Faça login." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Helper: create user + profile
    const createUser = async (email: string, password: string, displayName: string, bio?: string) => {
      const { data, error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { display_name: displayName },
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          // Find the existing user ID by listing
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) throw listError;
          const found = listData.users.find((u) => u.email === email);
          if (found) {
            // Update password & confirm email
            await supabase.auth.admin.updateUserById(found.id, { password, email_confirm: true });
            await supabase.from("profiles").upsert(
              { user_id: found.id, display_name: displayName, bio: bio || null },
              { onConflict: "user_id" }
            );
            return found.id;
          }
        }
        throw new Error(`${email}: ${error.message}`);
      }

      const uid = data.user!.id;
      await supabase.from("profiles").upsert(
        { user_id: uid, display_name: displayName, bio: bio || null },
        { onConflict: "user_id" }
      );
      return uid;
    };

    // 1) Admin
    const adminId = await createUser("admin@demo.com", "Admin123!", "Demo Admin", "Administrador da plataforma");
    await supabase.from("user_roles").insert({ user_id: adminId, role: "admin" });

    // 2) Moderator
    const modId = await createUser("moderator@demo.com", "Moderator123!", "Demo Moderator", "Moderador da comunidade 🛡️");
    await supabase.from("user_roles").insert({ user_id: modId, role: "moderator" });

    // 3) Regular user
    const userId = await createUser("user@demo.com", "User123!", "Demo User", "Apenas explorando a plataforma 👋");

    // 4) Sample posts
    const posts = [
      { user_id: adminId, content: "👋 Bem-vindo à plataforma! Este é um ambiente de demonstração — sinta-se à vontade para explorar.", privacy: "public" },
      { user_id: modId, content: "Olá a todos! Vou ajudar a manter as coisas amigáveis por aqui. Entre em contato se precisar de algo.", privacy: "public" },
      { user_id: userId, content: "Acabei de entrar! Animado para ver do que se trata esta comunidade 🎉", privacy: "public" },
      { user_id: userId, content: "Mais alguém maratonando documentários ultimamente? Deixe seus favoritos abaixo 👇", privacy: "public" },
      { user_id: adminId, content: "Dica: confira as seções de Grupos e Eventos para encontrar pessoas com interesses semelhantes.", privacy: "public" },
    ];
    await supabase.from("posts").insert(posts);

    // 5) Mark setup complete
    await supabase.from("site_settings").upsert(
      {
        setting_key: "setup_complete",
        setting_value: { completed: true, completedAt: new Date().toISOString(), seeded: true },
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      },
      { onConflict: "setting_key" }
    );

    // 6) Default site identity
    await supabase.from("site_settings").upsert(
      {
        setting_key: "admin_website_info",
        setting_value: { siteName: "afCode", siteDescription: "Uma experiência social conectada.", siteUrl: "" },
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      },
      { onConflict: "setting_key" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dados de demonstração semeados com sucesso.",
        credentials: { email: "admin@demo.com", password: "Admin123!" },
        accounts: [
          { role: "admin", email: "admin@demo.com", password: "Admin123!" },
          { role: "moderator", email: "moderator@demo.com", password: "Moderator123!" },
          { role: "user", email: "user@demo.com", password: "User123!" },
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
