import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { corsHeaders } from 'npm:@supabase/supabase-js@2.112.3/cors';

const headers = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

type GeoapifyResult = {
  place_id?: string;
  formatted?: string;
  name?: string;
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Csak POST kérés engedélyezett.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    return json({ error: 'A kereséshez jelentkezz be.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !geoapifyKey) {
    return json(
      { error: 'A helyszínkereső szerveroldali beállítása hiányzik.' },
      500,
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return json({ error: 'A munkamenet lejárt. Jelentkezz be újra.' }, 401);
    }

    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== 'object' ||
      !('text' in body) ||
      typeof body.text !== 'string'
    ) {
      return json({ error: 'Hiányzó keresési szöveg.' }, 400);
    }

    const text = body.text.trim();

    if (text.length < 3 || text.length > 200) {
      return json({ error: 'A kereséshez 3–200 karakter szükséges.' }, 400);
    }

    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.set('text', text);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lang', 'hu');
    url.searchParams.set('bias', 'countrycode:hu');
    url.searchParams.set('limit', '6');
    url.searchParams.set('apiKey', geoapifyKey);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return json(
        {
          error:
            response.status === 429
              ? 'A kereső átmenetileg túlterhelt. Próbáld újra később.'
              : 'A címkereső szolgáltatás jelenleg nem elérhető.',
        },
        response.status === 429 ? 429 : 502,
      );
    }

    const payload = (await response.json()) as {
      results?: GeoapifyResult[];
    } | null;

    if (!payload || !Array.isArray(payload.results)) {
      return json({ error: 'Érvénytelen válasz érkezett a címkeresőtől.' }, 502);
    }

    const suggestions = payload.results.flatMap((item) => {
      if (!item || typeof item.formatted !== 'string') return [];

      const address = item.formatted.trim();
      if (!address) return [];

      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const label =
        name && !address.toLowerCase().includes(name.toLowerCase())
          ? `${name}, ${address}`
          : address;

      return [{
        id: typeof item.place_id === 'string' ? item.place_id : label,
        label,
      }];
    });

    const unique = [
      ...new Map(suggestions.map((item) => [item.label, item])).values(),
    ];

    return json({ suggestions: unique.slice(0, 6) });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');

    return json(
      {
        error: timedOut
          ? 'A keresés túl sokáig tartott. Próbáld újra.'
          : 'A helyszínkeresés most nem sikerült.',
      },
      timedOut ? 504 : 502,
    );
  }
});