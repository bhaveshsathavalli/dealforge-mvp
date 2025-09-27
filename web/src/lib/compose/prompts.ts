export const BATTLE_CARD_PROMPTS = {
  overview: {
    system: "You are a competitive intelligence expert. Generate a concise overview of the vendor's competitive position based on the provided facts.",
    user: "Based on these facts about {vendorName}, create a 2-3 sentence overview of their competitive position:\n\n{facts}\n\nReturn JSON: {\"overview\": \"string\"}"
  },

  whyTheyWin: {
    system: "You are a competitive intelligence expert. Identify the vendor's key competitive advantages.",
    user: "Based on these facts about {vendorName}, identify their top 3-5 competitive advantages:\n\n{facts}\n\nReturn JSON: {\"whyTheyWin\": [\"advantage1\", \"advantage2\", \"advantage3\"]}"
  },

  whyWeWin: {
    system: "You are a competitive intelligence expert. Identify areas where our solution has advantages over this vendor.",
    user: "Based on these facts about {vendorName}, identify 3-5 areas where our solution has advantages:\n\n{facts}\n\nReturn JSON: {\"whyWeWin\": [\"advantage1\", \"advantage2\", \"advantage3\"]}"
  },

  objections: {
    system: "You are a competitive intelligence expert. Identify potential objections customers might have about this vendor.",
    user: "Based on these facts about {vendorName}, identify 3-5 potential customer objections:\n\n{facts}\n\nReturn JSON: {\"objections\": [\"objection1\", \"objection2\", \"objection3\"]}"
  },

  landmines: {
    system: "You are a competitive intelligence expert. Identify potential risks or 'landmines' when competing against this vendor.",
    user: "Based on these facts about {vendorName}, identify 3-5 potential risks or landmines:\n\n{facts}\n\nReturn JSON: {\"landmines\": [\"risk1\", \"risk2\", \"risk3\"]}"
  }
};

export function formatPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
}
