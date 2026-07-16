import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if any admin already exists — block if so
    const { data: existingAdmins, error: checkErr } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkErr) {
      return new Response(JSON.stringify({ error: checkErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Configuração já concluída. Já existe um superadministrador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { email, password, displayName } = body;

    if (!email || !password || !displayName) {
      return new Response(
        JSON.stringify({ error: "E-mail, senha e nome de exibição são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 8 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with auto-confirm using admin API
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign admin role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: "admin" });

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile for the admin
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        user_id: userData.user.id,
        display_name: displayName,
      }, { onConflict: "user_id" });

    if (profileErr) {
      console.error("Profile creation warning:", profileErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.user.id,
        message: "Superadministrador criado com sucesso.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
