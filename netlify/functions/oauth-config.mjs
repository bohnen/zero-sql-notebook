export default async () => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? null;
  return new Response(JSON.stringify({ clientId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/oauth/config' };
