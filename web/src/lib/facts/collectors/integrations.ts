import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectIntegrations(domain: string) {
  const paths = ["/integrations", "/partners"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) return null;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $ = cheerio.load(norm);
    const integrations = $("h1,h2,h3,li").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 10);
    
    const facts = integrations.map((integration: string) => ({
      metric: "integrations",
      key: `integration:${integration.toLowerCase().slice(0, 40)}`,
      value: integration,
      text_summary: integration,
      citations: [{ url, title: "Integrations" }],
      firstParty: true,
      confidence: 0.8
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "integrations",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Integrations",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "integrations",
        source_score: sScore
      },
      facts
    };
  }
  
  return null;
}