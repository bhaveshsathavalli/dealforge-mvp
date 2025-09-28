import 'server-only';
import { ENV } from '../env';
import { readMarkdown } from './reader';

export interface FetchContentResult {
  md: string;
}

export async function fetchContent(url: string): Promise<FetchContentResult> {
  if (ENV.PROVIDER === 'FIRECRAWL') {
    throw new Error('FIRECRAWL provider not wired yet');
  }

  return { md: await readMarkdown(url) };
}


