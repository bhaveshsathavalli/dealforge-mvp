import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectPricing(domain: string) {
  const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/pricing`;
  const res = await directFetch(url, {});
  
  if (res.status !== 200 || !res.body) return null;
  
  const norm = normalizeHtmlOrJson(res.body);
  const $ = cheerio.load(norm);
  const text = $("body").text();
  
  const matches = Array.from(text.matchAll(/\$?\s?(\d{1,4}(?:\.\d{1,2})?)\s?(?:USD)?\s*(?:\/\s?(?:user|seat))?\s*\/\s?(?:mo|month|yr|year)/gi)).slice(0, 4);
  
  const facts = matches.map(m => {
    const value = m[0].replace(/\s+/g, " ").trim();
    return {
      metric: "pricing",
      key: "price_point",
      value,
      text_summary: `Lists ${value} on pricing page.`,
      citations: [{ url, title: "Pricing" }],
      firstParty: true,
      confidence: 0.9
    };
  });
  
  const sScore = sourceScore({
    firstParty: true,
    recencyDays: 0,
    pageType: "pricing",
    structured: /<table/i.test(norm),
    reputation: "official"
  });
  
  return {
    source: {
      url,
      title: "Pricing",
      body: norm,
      body_hash: hashBody(norm),
      first_party: true,
      metric: "pricing",
      source_score: sScore
    },
    facts
  };
}