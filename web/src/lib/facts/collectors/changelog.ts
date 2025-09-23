import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectChangelog(domain: string) {
  const paths = ["/changelog", "/release-notes", "/updates"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) return null;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $: cheerio.CheerioAPI = cheerio.load(norm);
    const entries = $("h1,h2,h3,li").map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 3);
    
    const facts = entries.map((entry: string) => ({
      metric: "changelog",
      key: `release:${entry.toLowerCase().slice(0, 40)}`,
      value: entry,
      text_summary: entry,
      citations: [{ url, title: "Changelog" }],
      firstParty: true,
      confidence: 0.8
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "changelog",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Changelog",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "changelog",
        source_score: sScore
      },
      facts
    };
  }
  
  return null;
}