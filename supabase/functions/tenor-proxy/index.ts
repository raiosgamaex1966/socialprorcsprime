import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TENOR_API_KEY = Deno.env.get('TENOR_API_KEY');
    if (!TENOR_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Chave da API do Tenor não configurada. Um administrador precisa adicionar o segredo TENOR_API_KEY.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    const limit = url.searchParams.get('limit') || '20';
    const pos = url.searchParams.get('pos') || '';

    const baseParams = `key=${TENOR_API_KEY}&client_key=lovable_social&limit=${limit}&media_filter=gif,tinygif`;
    
    let tenorUrl: string;
    if (query) {
      tenorUrl = `https://tenor.googleapis.com/v2/search?${baseParams}&q=${encodeURIComponent(query)}&pos=${pos}`;
    } else {
      tenorUrl = `https://tenor.googleapis.com/v2/featured?${baseParams}&pos=${pos}`;
    }

    const response = await fetch(tenorUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
