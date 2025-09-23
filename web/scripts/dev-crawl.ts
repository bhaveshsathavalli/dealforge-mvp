// web/scripts/dev-crawl.ts
import { discoverMetricPages } from "../src/lib/facts/crawl";
import { type MetricKey } from "../src/lib/facts/metrics";

const rootUrl = process.argv[2];
const metric = process.argv[3] as MetricKey;

if (!rootUrl || !metric) {
  console.error('Usage: pnpm dlx tsx web/scripts/dev-crawl.ts https://www.tableau.com pricing');
  process.exit(1);
}

(async () => {
  try {
    const result = await discoverMetricPages({ rootUrl, metric });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('crawl error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
})();
