import 'server-only';
import { chatJSON } from '@/lib/llm';
import { BATTLE_CARD_PROMPTS, formatPrompt } from './prompts';

export interface BattlecardNarrative {
  overview?: string;
  whyTheyWin?: string[];
  whyWeWin?: string[];
  talkTracks?: string[];
  objections?: string[];
  questions?: string[];
  landmines?: string[];
}

export interface ComposeOptions {
  vendorName: string;
  facts: any[];
  persona: 'AE' | 'SE' | 'Exec';
}

export async function composeNarrative(options: ComposeOptions): Promise<BattlecardNarrative> {
  const { vendorName, facts, persona } = options;
  
  // Convert facts to a readable format for the LLM
  const factsText = facts.map(fact => {
    const summary = fact.text_summary || fact.value || JSON.stringify(fact.value_json || {});
    return `- ${summary}`;
  }).join('\n');

  const variables = {
    vendorName,
    facts: factsText
  };

  const narrative: BattlecardNarrative = {};

  try {
    // Generate overview
    const overviewPrompt = formatPrompt(BATTLE_CARD_PROMPTS.overview.user, variables);
    const overviewResult = await chatJSON(BATTLE_CARD_PROMPTS.overview.system, overviewPrompt);
    narrative.overview = overviewResult.overview;

    // Generate why they win
    const whyTheyWinPrompt = formatPrompt(BATTLE_CARD_PROMPTS.whyTheyWin.user, variables);
    const whyTheyWinResult = await chatJSON(BATTLE_CARD_PROMPTS.whyTheyWin.system, whyTheyWinPrompt);
    narrative.whyTheyWin = whyTheyWinResult.whyTheyWin;

    // Generate why we win
    const whyWeWinPrompt = formatPrompt(BATTLE_CARD_PROMPTS.whyWeWin.user, variables);
    const whyWeWinResult = await chatJSON(BATTLE_CARD_PROMPTS.whyWeWin.system, whyWeWinPrompt);
    narrative.whyWeWin = whyWeWinResult.whyWeWin;

    // Generate objections
    const objectionsPrompt = formatPrompt(BATTLE_CARD_PROMPTS.objections.user, variables);
    const objectionsResult = await chatJSON(BATTLE_CARD_PROMPTS.objections.system, objectionsPrompt);
    narrative.objections = objectionsResult.objections;

    // Generate landmines
    const landminesPrompt = formatPrompt(BATTLE_CARD_PROMPTS.landmines.user, variables);
    const landminesResult = await chatJSON(BATTLE_CARD_PROMPTS.landmines.system, landminesPrompt);
    narrative.landmines = landminesResult.landmines;

    // Generate persona-specific talk tracks and questions
    if (persona === 'AE') {
      narrative.talkTracks = [
        "Focus on ROI and business value",
        "Emphasize implementation speed and ease",
        "Highlight customer success stories"
      ];
      narrative.questions = [
        "What's your current process for [relevant area]?",
        "How much time does your team spend on [pain point]?",
        "What would success look like for this initiative?"
      ];
    } else if (persona === 'SE') {
      narrative.talkTracks = [
        "Deep dive into technical architecture",
        "Compare integration capabilities",
        "Discuss scalability and performance"
      ];
      narrative.questions = [
        "How do you currently handle [technical challenge]?",
        "What's your integration architecture?",
        "How do you ensure data security and compliance?"
      ];
    } else if (persona === 'Exec') {
      narrative.talkTracks = [
        "Strategic business impact",
        "Market positioning and competitive advantage",
        "Long-term partnership value"
      ];
      narrative.questions = [
        "What are your strategic priorities for the next 12 months?",
        "How does this align with your digital transformation goals?",
        "What would differentiate us in your evaluation process?"
      ];
    }

  } catch (error) {
    console.error('Error composing narrative:', error);
    // Return partial results if some sections fail
  }

  return narrative;
}
