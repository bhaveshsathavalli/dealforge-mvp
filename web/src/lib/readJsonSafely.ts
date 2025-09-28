/**
 * Safely parse JSON from a Response object
 * Returns parsed JSON or an object with the raw text if parsing fails
 */
export async function readJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}


