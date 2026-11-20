import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Csak POST kérés engedélyezett.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json({ error: 'A meghívó küldéséhez jelentkezz be.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const fromEmail = Deno.env.get('BREVO_FROM_EMAIL')?.trim();
  const fromName = Deno.env.get('BREVO_FROM_NAME')?.trim() || 'FamilyHub';

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'A Supabase szerveroldali beállítása hiányzik.' }, 500);
  }
  if (!brevoApiKey || !fromEmail) {
    return json({ error: 'Az e-mail-küldő szerveroldali beállítása hiányzik.' }, 500);
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' ||
      !('inviteId' in body) || typeof body.inviteId !== 'string' ||
      !('familyName' in body) || typeof body.familyName !== 'string') {
    return json({ error: 'Hiányzó meghívási adatok.' }, 400);
  }

  const inviteId = body.inviteId.trim();
  const familyName = body.familyName.trim();
  if (!inviteId || familyName.length > 150) {
    return json({ error: 'Érvénytelen meghívási adatok.' }, 400);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'A munkamenet lejárt. Jelentkezz be újra.' }, 401);
    }

    const { data: invite, error: inviteError } = await supabase
      .from('family_invites')
      .select('id, invited_email, family_id, intended_role')
      .eq('id', inviteId)
      .maybeSingle();

    if (inviteError || !invite) {
      return json({ error: 'A meghívás nem található vagy nem küldhető.' }, 404);
    }

    const recipient = String(invite.invited_email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return json({ error: 'A meghívott e-mail-címe érvénytelen.' }, 400);
    }

    const safeFamilyName = escapeHtml(familyName);
    const subject = `Meghívás a(z) ${familyName} családi térbe`;
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: recipient }],
        subject,
        textContent: `Meghívtak a(z) ${familyName} családi térbe. Jelentkezz be a FamilyHub alkalmazásba azonos e-mail-címmel, majd fogadd el a meghívást az értesítések között.`,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#17233b"><h1 style="font-size:24px">Családi meghívás</h1><p>Meghívtak a(z) <strong>${safeFamilyName}</strong> családi térbe.</p><p>Nyisd meg a FamilyHub alkalmazást, jelentkezz be ugyanezzel az e-mail-címmel, majd fogadd el a meghívást az értesítések között.</p><p style="margin-top:24px;color:#637083">FamilyHub</p></div>`,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[send-family-invite] Brevo rejected request', response.status, detail);
      return json({ error: 'A meghívó e-mail küldése jelenleg sikertelen.' }, 502);
    }

    return json({ sent: true });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('[send-family-invite] delivery failed', error);
    return json(
      { error: timedOut ? 'Az e-mail küldése túl sokáig tartott.' : 'Az e-mail küldése sikertelen.' },
      timedOut ? 504 : 502,
    );
  }
});
