// web/scripts/dev-classify-url.ts
import { fetchPage } from "../src/lib/facts/http";
import { isolateMain } from "../src/lib/facts/readability";
import { classifyPage } from "../src/lib/facts/classifyPage";

const url = process.argv[2];
const optionalText = process.argv.slice(3).join(' ');

if (!url) {
  console.error('Usage: pnpm dlx tsx web/scripts/dev-classify-url.ts "https://vendor.com/pricing" [optionalText...]');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetchPage(url, undefined, { forceFresh: true });
    
    if (!res.html) {
      console.log("No HTML (maybe 304). Add a query string like ?t=1 to force fresh.");
      process.exit(0);
    }
    
    const iso = isolateMain(res.html);
    const cls = classifyPage({ url, text: iso.text || "" });
    
    console.log(JSON.stringify({
      url,
      metric: cls.metric,
      score: Number(cls.score.toFixed(2)),
      why: cls.why,
      textPreview: iso.text?.slice(0, 280) || ""
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();

