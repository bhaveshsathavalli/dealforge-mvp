import { directFetch, normalizeHtmlOrJson, hashBody } from "../http";
import { sourceScore } from "../scores";
import * as cheerio from "cheerio";

export async function collectSecurity(domain: string) {
  const paths = ["/security", "/trust"];
  
  for (const path of paths) {
    const url = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}${path}`;
    const res = await directFetch(url, {});
    
    if (res.status !== 200 || !res.body) return null;
    
    const norm = normalizeHtmlOrJson(res.body);
    const $ = cheerio.load(norm);
    const text = $("body").text();
    
    const securityItems = [];
    if (/SOC2/i.test(text)) securityItems.push("SOC2 certified");
    if (/ISO\s*27001/i.test(text)) securityItems.push("ISO 27001 certified");
    if (/GDPR/i.test(text)) securityItems.push("GDPR compliant");
    if (/HIPAA/i.test(text)) securityItems.push("HIPAA compliant");
    
    const facts = securityItems.map((item: string) => ({
      metric: "security",
      key: `certification:${item.toLowerCase().replace(/\s+/g, "_")}`,
      value: item,
      text_summary: item,
      citations: [{ url, title: "Security" }],
      firstParty: true,
      confidence: 0.9
    }));
    
    const sScore = sourceScore({
      firstParty: true,
      recencyDays: 0,
      pageType: "security",
      structured: true,
      reputation: "official"
    });
    
    return {
      source: {
        url,
        title: "Security",
        body: norm,
        body_hash: hashBody(norm),
        first_party: true,
        metric: "security",
        source_score: sScore
      },
      facts
    };
  }
  
  return null;
}