import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectReliability(domain: string) {
  const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/status`;
  const res = await directFetch(url, {});
  
  if (res.status !== 200 || !res.body) return null;
  
  const norm = normalizeHtmlOrJson(res.body);
  const $: cheerio.CheerioAPI = cheerio.load(norm);
  const text = $("body").text();
  
  // Look for uptime percentages or incident counts
  const uptimeMatch = text.match(/(\d{2,3}(?:\.\d+)?)%\s*uptime/i);
  const incidentMatch = text.match(/(\d+)\s*incidents?\s*(?:in|over|last)/i);
  
  const facts = [];
  if (uptimeMatch) {
    facts.push({
      metric: "reliability",
      key: "uptime_percentage",
      value: `${uptimeMatch[1]}% uptime`,
      text_summary: `${uptimeMatch[1]}% uptime`,
      citations: [{ url, title: "Status" }],
      firstParty: true,
      confidence: 0.9
    });
  }
  
  if (incidentMatch) {
    facts.push({
      metric: "reliability",
      key: "incident_count",
      value: `${incidentMatch[1]} incidents`,
      text_summary: `${incidentMatch[1]} incidents`,
      citations: [{ url, title: "Status" }],
      firstParty: true,
      confidence: 0.8
    });
  }
  
  const sScore = sourceScore({
    firstParty: true,
    recencyDays: 0,
    pageType: "reliability",
    structured: true,
    reputation: "official"
  });
  
  return {
    source: {
      url,
      title: "Status",
      body: norm,
      body_hash: hashBody(norm),
      first_party: true,
      metric: "reliability",
      source_score: sScore
    },
    facts
  };
}