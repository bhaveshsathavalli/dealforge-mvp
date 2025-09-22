import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectFeatures(domain: string) {
  const paths = ["/features", "/product", "/platform"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) continue;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $ = cheerio.load(norm);
    const bullets = $("h1,h2,h3,li").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 12);
    
    const facts = bullets.map((b: string) => ({
      metric: "features",
      key: `feature:${b.toLowerCase().slice(0, 40)}`,
      value: b,
      text_summary: b,
      citations: [{ url, title: "Features" }],
      firstParty: true,
      confidence: 0.7
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "features",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Features",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "features",
        source_score: sScore
      },
      facts
    };
  }
  
  return null;
}