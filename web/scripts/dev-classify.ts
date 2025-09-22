// web/scripts/dev-classify.ts
// ⬇️ change this
// import { classifyPage } from "@/src/lib/facts/classifyPage";
// ⬇️ to this (relative from /web/scripts → /web/src)
import { classifyPage } from "../src/lib/facts/classifyPage";

const url = process.argv[2] ?? "https://vendor.com/pricing";
const text =
  process.argv.slice(3).join(" ") ||
  "Plans from $12 per user/month billed annually.";

const res = classifyPage({ url, text });
console.log({ url, score: Number(res.score.toFixed(2)), metric: res.metric, why: res.why });
