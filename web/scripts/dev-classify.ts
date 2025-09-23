// web/scripts/dev-crawl.ts
import { discoverMetricPages } from "../src/lib/facts/crawl";

const root = process.argv[2] ?? "https://www.tableau.com";
const metric = (process.argv[3] ?? "pricing") as any;

discoverMetricPages({ rootUrl: root, metric })
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e));
