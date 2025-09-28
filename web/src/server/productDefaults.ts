export const DEFAULT_PRODUCT = {
  name: "Slack",
  website: "https://www.slack.com",
};

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Force https and lowercase host when possible
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    u.protocol = 'https:'; // normalize
    return u.toString().replace(/\/$/, ''); // strip trailing slash
  } catch {
    return null;
  }
}
