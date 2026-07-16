import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const postId = url.searchParams.get("id");
  const theme = url.searchParams.get("theme") || "light";
  const showMedia = url.searchParams.get("media") !== "false";

  if (!postId) {
    return new Response("ID da publicação ausente", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: post, error } = await supabase.from("posts").select("id, content, image_url, image_urls, user_id, created_at, privacy").eq("id", postId).maybeSingle();

  if (error || !post) {
    return new Response(renderErrorHtml("Publicação não encontrada", theme), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (post.privacy !== "public") {
    return new Response(renderErrorHtml("Esta publicação é privada", theme), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", post.user_id).maybeSingle();

  const html = renderPostHtml(post, profile, theme, showMedia);

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "agora há pouco";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return new Date(date).toLocaleDateString("pt-BR");
}

function renderErrorHtml(message: string, theme: string): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const text = isDark ? "#e0e0e0" : "#333333";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bg};color:${text};display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}p{font-size:14px;opacity:0.7}</style>
</head><body><p>${escapeHtml(message)}</p></body></html>`;
}

function renderPostHtml(post: { id: string; content: string; image_url: string | null; image_urls: string[] | null; created_at: string }, profile: { display_name: string | null; avatar_url: string | null } | null, theme: string, showMedia: boolean): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const cardBg = isDark ? "#232340" : "#ffffff";
  const text = isDark ? "#e8e8f0" : "#1a1a1a";
  const mutedText = isDark ? "#9898b0" : "#6b7280";
  const borderColor = isDark ? "#2d2d4a" : "#e5e7eb";
  const brandColor = "#3b82f6";

  const displayName = escapeHtml(profile?.display_name || "Usuário do Social Pro");
  const avatarUrl = profile?.avatar_url || "";
  const contentText = escapeHtml(post.content);
  const imageUrl = post.image_url || (post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null);
  const time = timeAgo(post.created_at);

  const avatarHtml = avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="${displayName}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">` : `<div style="width:40px;height:40px;border-radius:50%;background:${brandColor};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0">${displayName.charAt(0).toUpperCase()}</div>`;

  const imageHtml = showMedia && imageUrl ? `<div style="margin-top:12px"><img src="${escapeHtml(imageUrl)}" alt="Imagem da publicação" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px"></div>` : "";

  const multiImageBadge = showMedia && post.image_urls && post.image_urls.length > 1 ? `<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600">+${post.image_urls.length - 1}</span>` : "";

  const imageSection = showMedia && imageUrl ? `<div style="margin-top:12px;position:relative"><img src="${escapeHtml(imageUrl)}" alt="Imagem da publicação" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px">${multiImageBadge}</div>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:${bg};padding:0;min-height:100vh;display:flex;flex-direction:column}
.card{background:${cardBg};border:1px solid ${borderColor};border-radius:12px;overflow:hidden;margin:12px;flex:1;display:flex;flex-direction:column}
.header{display:flex;align-items:center;gap:10px;padding:16px 16px 0}
.author-info{display:flex;flex-direction:column}
.author-name{font-size:14px;font-weight:600;color:${text}}
.post-time{font-size:12px;color:${mutedText}}
.content{padding:12px 16px;font-size:15px;line-height:1.5;color:${text};white-space:pre-wrap;word-break:break-word;flex:1}
.footer{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid ${borderColor}}
.brand{display:flex;align-items:center;gap:6px;text-decoration:none;color:${brandColor};font-size:12px;font-weight:600}
.brand svg{width:16px;height:16px}
.view-link{font-size:12px;color:${brandColor};text-decoration:none;font-weight:500}
.view-link:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    ${avatarHtml}
    <div class="author-info">
      <span class="author-name">${displayName}</span>
      <span class="post-time">${time}</span>
    </div>
  </div>
  <div class="content">${contentText}</div>
  ${imageSection}
  <div class="footer">
    <span class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      Social Pro
    </span>
    <a class="view-link" href="/?post=${post.id}" target="_blank" rel="noopener">Ver no Social Pro →</a>
  </div>
</div>
</body>
</html>`;
}
