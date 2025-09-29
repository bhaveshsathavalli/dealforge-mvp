// Safe JSON parsing utility for fetch responses
export async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error('safeJson error:', { url: res.url, status: res.state, error });
    return null;
  }
}
