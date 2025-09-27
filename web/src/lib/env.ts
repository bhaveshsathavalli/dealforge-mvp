import 'server-only';

export const ENV = {
  JINA_API_KEY: process.env.JINA_API_KEY ?? '',
  READER_BASE: process.env.READER_BASE ?? 'https://r.jina.ai/',
  PROVIDER: process.env.PROVIDER ?? 'JINA',
  FACTS_PIPELINE_ENABLED: (process.env.FACTS_PIPELINE_ENABLED ?? 'true') === 'true',
};

if (!ENV.JINA_API_KEY) throw new Error('Missing env: JINA_API_KEY');
