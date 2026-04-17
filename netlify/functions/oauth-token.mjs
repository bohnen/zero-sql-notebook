const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return jsonError('GitHub OAuth is not configured on this deploy', 500);
  }

  const body = await req.json().catch(() => null);
  const code = body?.code;
  if (typeof code !== 'string' || code.length === 0) {
    return jsonError('Missing "code" in request body', 400);
  }

  try {
    const upstream = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok || data.error) {
      const message = data.error_description ?? data.error ?? `HTTP ${upstream.status}`;
      return jsonError(message, upstream.ok ? 400 : upstream.status);
    }
    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        scope: data.scope ?? '',
        token_type: data.token_type ?? 'bearer',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return jsonError(err.message ?? String(err), 502);
  }
};

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { path: '/api/oauth/token' };
