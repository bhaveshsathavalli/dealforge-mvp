// web/src/lib/facts/classifyPage.ts
import { METRICS, type MetricKey } from "./metrics";

type Why = { urlHits: string[]; textHits: string[] };

export function classifyPage(
  { url, text }: { url: string; text: string }
): { metric: MetricKey | "unknown"; score: number; why: Why } {
  const lower = (text || "").toLowerCase();
  let best: { m: MetricKey | "unknown"; s: number; why: Why } = {
    m: "unknown", s: 0, why: { urlHits: [], textHits: [] }
  };

  (Object.keys(METRICS) as MetricKey[]).forEach((m) => {
    const def = METRICS[m];

    const urlHits = def.urlPatterns
      .filter((re) => re.test(url))
      .map((re) => re.toString());

    let textHits: string[] = [];
    for (const token of def.contentSignals) {
      if (lower.includes(token.toLowerCase())) textHits.push(token);
    }

    const su = urlHits.length ? 1 : 0;               // URL match is binary here
    const st = Math.min(1, textHits.length / 5);     // dampen noisy pages
    const score = 0.65 * su + 0.35 * st;

    if (score > best.s) best = { m, s: score, why: { urlHits, textHits } };
  });

  if (best.s < 0.7) return { metric: "unknown", score: best.s, why: best.why };
  return { metric: best.m, score: best.s, why: best.why };
}
