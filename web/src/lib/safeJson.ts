// Safe JSON parsing utility for fetch responses
export async function safeJson<T = any>(res: Response): Promise<T | {}> {
  try {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.error('safeJson error:', { url: res.url, status: res.status, error });
    return {};
  }
}
