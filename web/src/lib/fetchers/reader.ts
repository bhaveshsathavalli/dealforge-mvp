import 'server-only';
import { ENV } from '../env';

export interface ReadMarkdownOptions {
  timeout?: number;
}

export async function readMarkdown(url: string, opts?: ReadMarkdownOptions): Promise<string> {
  const readerUrl = new URL(url, ENV.READER_BASE);
  readerUrl.searchParams.set('sd', 'true');
  readerUrl.searchParams.set('if', 'true');
  readerUrl.searchParams.set('gfm', 'true');
  readerUrl.searchParams.set('timeout', String(opts?.timeout ?? 10));

  const response = await fetch(readerUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${ENV.JINA_API_KEY}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    const errorBody = body.slice(0, 200);
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  return response.text();
}


