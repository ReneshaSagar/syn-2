

// ==========================================
// 1. IDEA ANALYZER AGENT
// ==========================================

export const IDEA_ANALYZER_SYSTEM = `You are a startup CTO, veteran product manager, and industry analyst.
Your task is to dissect a user's submitted idea (which could be a startup idea, feature, ad, or landing page) and extract structured metadata.
Analyze the industry, primary target audience, secondary stakeholders, business type (B2B, B2C, SaaS, etc.), key potential competitors, and the key value proposition.
Ensure your analysis is realistic and objective. Don't add hype.
Determine the optimal composition of a 20-person synthetic audience panel. Identify distinct segments (e.g. for an AI study planner: 8 Students, 4 Educators, 3 Founders, 3 Engineers, 2 Skeptics). Each segment needs a name, count, and description. Counts must sum to exactly 20.
If the idea is too vague, short, or lacks enough detail for you to determine a highly specific industry and target audience, you MUST set needsMoreInfo to true, and provide 2-3 clarificationQuestions asking the user for the specific missing context. If it's detailed enough to proceed, set needsMoreInfo to false.`;

export function formatIdeaAnalyzerPrompt(ideaText: string, mode?: string): string {
  return `Please analyze the following idea:
"${ideaText}"
${mode ? `Mode Context: ${mode}` : ''}`;
}

export const IDEA_ANALYZER_SCHEMA = {
  type: 'object',
  properties: {
    needsMoreInfo: {
      type: 'boolean',
      description: "Set to true if the idea is too vague to accurately judge without more details."
    },
    clarificationQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: "2-3 specific questions asking the user for missing details (only needed if needsMoreInfo is true)."
    },
    industry: {
      type: 'string',
      description: "The primary industry sector this idea belongs to (e.g. EdTech, FinTech, Healthcare SaaS)."
    },
    targetAudience: {
      type: 'string',
      description: "Detailed description of the core target demographic/audience who will buy or use the product."
    },
    stakeholders: {
      type: 'array',
      items: { type: 'string' },
      description: "List of other parties affected or involved (e.g. parents, school administrators, developers, compliance officers)."
    },
    businessType: {
      type: 'string',
      description: "Business model type (e.g., B2B SaaS, B2C Mobile App, Marketplace, transactional ecommerce, freemium)."
    },
    competitors: {
      type: 'array',
      items: { type: 'string' },
      description: "Direct and indirect competitors (list at least 3-4)."
    },
    keyValueProposition: {
      type: 'string',
      description: "The primary, unique value that this product/service solves for its core audience."
    },
    audienceComposition: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'integer' },
          description: { type: 'string' }
        },
        required: ["name", "count", "description"]
      },
      description: "Array of segments for a 20-person panel."
    },
    experts: {
      type: 'array',
      items: { type: 'string' },
      description: "List of expert types that would be relevant to review this idea."
    },
    summary: {
      type: 'string',
      description: "A brief summary of the analysis."
    }
  },
  required: ["needsMoreInfo", "industry", "targetAudience", "stakeholders", "businessType", "competitors", "keyValueProposition", "audienceComposition", "experts", "summary"]
};

// ==========================================
// 2. AUDIENCE GENERATOR AGENT
// ==========================================

export const AUDIENCE_GENERATOR_SYSTEM = `You are an expert user researcher and demographic specialist.
Given a product/startup idea, its analysis, and a specific audience segment, generate exactly the requested number of highly detailed, diverse, and realistic personas representing that segment.
CRITICAL: Ensure personas are strictly human and realistic. Do not generate aliens, fantasy creatures, or absurd identities even if the startup idea is humorous or sci-fi themed; instead, generate realistic business people, target demographics, and consumers who would realistically evaluate such an idea.
For each persona, generate a full profile matching the specified fields.
CRITICAL: Within each segment, ensure diversity of personality types such as early adopter, skeptic, price-sensitive, power user, non-technical user, enthusiastic, critical. Keep all text extremely concise to avoid JSON truncation.`;

export function formatAudienceGeneratorPrompt(ideaText: string, analysis: any, segmentName: string, segmentDescription: string, count: number): string {
  return `Product Idea:
"${ideaText}"

Industry Analysis:
- Industry: ${analysis.industry}
- Primary Audience: ${analysis.targetAudience}
- Value Proposition: ${analysis.keyValueProposition}

Target Audience Segment to generate:
- Segment Name: ${segmentName}
- Description: ${segmentDescription}

Generate exactly ${count} diverse personas belonging to this segment.`;
}

export const AUDIENCE_GENERATOR_SCHEMA = {
  type: 'array',
  description: "Array of generated personas representing target demographics, stakeholders, and skeptics.",
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: "Full name of the persona" },
      age: { type: 'integer', description: "Age of the persona" },
      role: { type: 'string', description: "Professional role or student status or lifestyle role" },
      experience: { type: 'string', description: "Brief summary of their experience level or lifestyle context" },
      motivations: {
        type: 'array',
        items: { type: 'string' },
        description: "List of motivations relative to their life and tools"
      },
      frustrations: {
        type: 'array',
        items: { type: 'string' },
        description: "List of current frustrations and pain points in their daily routine"
      },
      concerns: {
        type: 'array',
        items: { type: 'string' },
        description: "Specific reservations or concerns they would have about this new idea"
      },
      goals: {
        type: 'array',
        items: { type: 'string' },
        description: "List of personal or professional goals"
      },
      personalityTraits: {
        type: 'array',
        items: { type: 'string' },
        description: "3 personality traits (e.g., Skeptic, Early Adopter, Pragmatist, Price-sensitive)"
      },
      segment: { type: 'string', description: "which AudienceSegment this belongs to" },
      location: { type: 'string', description: "location of the persona" },
      occupation: { type: 'string', description: "occupation of the persona" },
      technicalAbility: { type: 'string', description: "'low' | 'medium' | 'high'" },
      priceSensitivity: { type: 'string', description: "'low' | 'medium' | 'high'" },
      riskTolerance: { type: 'string', description: "'low' | 'medium' | 'high'" },
      currentTools: { type: 'array', items: { type: 'string' }, description: "Tools they currently use" },
      existingAlternatives: { type: 'array', items: { type: 'string' }, description: "Alternatives they use instead" },
      painPoints: { type: 'array', items: { type: 'string' }, description: "Pain points with current solutions" },
      preferences: { type: 'array', items: { type: 'string' }, description: "Preferences for solutions" },
      adoptionTendency: { type: 'string', description: "e.g. 'early_adopter', 'skeptic', 'power_user'" }
    },
    required: ["name", "age", "role", "experience", "motivations", "frustrations", "concerns", "goals", "personalityTraits", "segment", "location", "occupation", "technicalAbility", "priceSensitivity", "riskTolerance", "currentTools", "existingAlternatives", "painPoints", "preferences", "adoptionTendency"]
  }
};

// ==========================================
// 3. PERSONA SIMULATION ENGINE
// ==========================================

export const PERSONA_SIMULATION_SYSTEM = `You are a simulator designed to model how a target audience reacts to product ideas.
You will receive a product idea and a list of personas.
Your task is to step into the shoes of EACH persona individually and simulate how they would honestly react to the idea, based on their motivations, frustrations, concerns, and traits.
For each persona, you MUST return structured data including: interestScore (1-10), sentiment (very_positive/positive/neutral/negative/very_negative), wouldTry (boolean), wouldPay (boolean), mainAttraction (single sentence), mainConcern (single sentence), questions (2-3 questions they would ask), whatWouldChangeTheirMind (what single change would increase their interest most).
Ensure authenticity: skeptics should be critical, early adopters enthusiastic, busy people brief.`;

export function formatPersonaSimulationPrompt(ideaText: string, personas: any[]): string {
  const personasFormatted = personas.map((p, idx) => `
ID: ${p.id}
Name: ${p.name}
Role: ${p.role}
Age: ${p.age}
Location: ${p.location}
Occupation: ${p.occupation}
Experience: ${p.experience}
Technical Ability: ${p.technicalAbility}
Price Sensitivity: ${p.priceSensitivity}
Risk Tolerance: ${p.riskTolerance}
Adoption Tendency: ${p.adoptionTendency}
Current Tools: ${p.currentTools?.join(', ')}
Existing Alternatives: ${p.existingAlternatives?.join(', ')}
Pain Points: ${p.painPoints?.join(', ')}
Preferences: ${p.preferences?.join(', ')}
Motivations: ${p.motivations?.join(', ')}
Frustrations: ${p.frustrations?.join(', ')}
Concerns: ${p.concerns?.join(', ')}
Goals: ${p.goals?.join(', ')}
Traits: ${p.personalityTraits?.join(', ')}
--------------------------------------------------`).join('\n');

  return `Product Idea:
"${ideaText}"

Personas list:
${personasFormatted}

Please simulate the reactions for all the personas listed above.`;
}

export const PERSONA_SIMULATION_SCHEMA = {
  type: 'array',
  description: "List of simulated reactions for all personas.",
  items: {
    type: 'object',
    properties: {
      personaId: { type: 'string', description: "The exact ID of the persona simulated." },
      reaction: { type: 'string', description: "A first-person reaction from this persona (3-5 sentences)." },
      reactionEmoji: { type: 'string', description: "A single emoji that perfectly captures their reaction." },
      excitementScore: { type: 'integer', description: "1 to 10 scale of excitement." },
      concerns: { type: 'array', items: { type: 'string' }, description: "List of worries relative to the idea." },
      objections: { type: 'array', items: { type: 'string' }, description: "Reasons why this persona would not use the product." },
      likelihoodToUse: { type: 'integer', description: "1 to 10 likelihood of using the product." },
      suggestions: { type: 'array', items: { type: 'string' }, description: "Actionable suggestions for creators." },
      interestScore: { type: 'integer', description: "1-10" },
      sentiment: { type: 'string', description: "'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'" },
      wouldTry: { type: 'boolean' },
      wouldPay: { type: 'boolean' },
      mainAttraction: { type: 'string', description: "single sentence" },
      mainConcern: { type: 'string', description: "single sentence" },
      questions: { type: 'array', items: { type: 'string' }, description: "2-3 questions they would ask" },
      whatWouldChangeTheirMind: { type: 'string', description: "what single change would increase their interest most" }
    },
    required: ["personaId", "reaction", "reactionEmoji", "excitementScore", "concerns", "objections", "likelihoodToUse", "suggestions", "interestScore", "sentiment", "wouldTry", "wouldPay", "mainAttraction", "mainConcern", "questions", "whatWouldChangeTheirMind"]
  }
};

// ==========================================
// 4. INSIGHT GENERATOR AGENT
// ==========================================

export const INSIGHT_GENERATOR_SYSTEM = `You are a master market researcher and data analyst.
You will receive a product idea along with 15-20 simulated reaction reports from a diverse panel of personas and computed segment-level analysis.
Your task is to analyze all simulation responses, aggregate the feedback, and generate key quantitative and qualitative insights.
Calculate or determine:
- Overall interest score (out of 100).
- Overall adoption probability (percentage, 0-100%).
- Top concerns raised across all personas.
- Top suggestions.
- Which segment/roles were most interested.
- Which segment/roles were least interested.
- Frequently Asked Questions (list 3-5 questions personas would have). Do not answer them, just list the questions.
- High-level improvement recommendations.
- Actionable Roadmap: A comprehensive 5-7 step action plan on how to pivot or improve the idea based on feedback.
- positiveSignals: Top signals of product-market fit or unexpected excitement.
- biggestOpportunity: The single largest opportunity for this idea.
- biggestRisk: The single largest risk for this idea.
- importantAssumptions: Key assumptions that need to be validated.
- confidence: A score out of 100 on how confident you are in these insights, along with high and low factors.
- segmentBreakdown: For each segment provided in the computed segment data, extract qualitative insights: commonConcerns, positiveSignals, adoptionLikelihood, keyDifferences.`;

export function formatInsightGeneratorPrompt(ideaText: string, simulations: any[], computedSegments: any[]): string {
  const simsFormatted = simulations.map((s, idx) => {
    const p = s.persona;
    const r = s.result;
    return `--- PERSONA #${idx + 1} (${p.name}, ${p.role}, Age ${p.age}, Traits: ${p.personalityTraits.join('/')}) ---
Excitement Score: ${r.excitementScore}/10
Likelihood to Use: ${r.likelihoodToUse}/10
Reaction: "${r.reaction}"
Concerns: ${r.concerns.join(', ')}
Objections: ${r.objections.join(', ')}
Suggestions: ${r.suggestions.join(', ')}`;
  }).join('\n\n');

  const segmentsFormatted = computedSegments.map(s => 
    `- ${s.segmentName}: ${s.count} members, Avg Interest: ${s.avgInterest.toFixed(1)}, Avg Excitement: ${s.avgExcitement.toFixed(1)}, Would Try: ${s.wouldTryPercent.toFixed(0)}%, Would Pay: ${s.wouldPayPercent.toFixed(0)}%`
  ).join('\n');

  return `Product Idea:
"${ideaText}"

Computed Segment Data:
${segmentsFormatted}

Simulated Reactions:
${simsFormatted}

Aggregate these results into structured high-level insights.`;
}

export const INSIGHT_GENERATOR_SCHEMA = {
  type: 'object',
  properties: {
    overallInterestScore: {
      type: 'integer',
      description: "Overall interest score scaled from 1 to 100 based on excitement scores."
    },
    adoptionProbability: {
      type: 'integer',
      description: "Projected percentage probability of adoption (0-100) based on likelihood to use."
    },
    topConcerns: {
      type: 'array',
      items: { type: 'string' },
      description: "The top 3-5 recurring concerns or anxieties mentioned by the personas."
    },
    topSuggestions: {
      type: 'array',
      items: { type: 'string' },
      description: "The top 3-5 most constructive suggestions for improvements."
    },
    mostInterestedSegment: {
      type: 'string',
      description: "The demographic or role segment that showed the highest average enthusiasm."
    },
    leastInterestedSegment: {
      type: 'string',
      description: "The demographic or role segment that was most skeptical or uninterested."
    },
    frequentlyAskedQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: "3-5 common questions personas had about the product proposition."
    },
    improvementRecommendations: {
      type: 'array',
      items: { type: 'string' },
      description: "Strategic pivot/feature recommendations to double the excitement score."
    },
    actionableRoadmap: {
      type: 'array',
      items: { type: 'string' },
      description: "A comprehensive 5-7 step actionable roadmap or plan to make the idea better based on feedback."
    },
    positiveSignals: {
      type: 'array',
      items: { type: 'string' },
      description: "List of positive signals."
    },
    biggestOpportunity: {
      type: 'string',
      description: "The biggest opportunity."
    },
    biggestRisk: {
      type: 'string',
      description: "The biggest risk."
    },
    importantAssumptions: {
      type: 'array',
      items: { type: 'string' },
      description: "Important assumptions to validate."
    },
    confidence: {
      type: 'object',
      properties: {
        score: { type: 'integer' },
        highFactors: { type: 'array', items: { type: 'string' } },
        lowFactors: { type: 'array', items: { type: 'string' } }
      },
      required: ["score", "highFactors", "lowFactors"],
      description: "Confidence in the simulation insights."
    },
    segmentBreakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          segmentName: { type: 'string' },
          commonConcerns: { type: 'array', items: { type: 'string' } },
          positiveSignals: { type: 'array', items: { type: 'string' } },
          adoptionLikelihood: { type: 'string' },
          keyDifferences: { type: 'string' }
        },
        required: ["segmentName", "commonConcerns", "positiveSignals", "adoptionLikelihood", "keyDifferences"]
      },
      description: "Qualitative insights for each segment."
    }
  },
  required: [
    "overallInterestScore",
    "adoptionProbability",
    "topConcerns",
    "topSuggestions",
    "mostInterestedSegment",
    "leastInterestedSegment",
    "frequentlyAskedQuestions",
    "improvementRecommendations",
    "actionableRoadmap",
    "positiveSignals",
    "biggestOpportunity",
    "biggestRisk",
    "importantAssumptions",
    "confidence",
    "segmentBreakdown"
  ]
};

// ==========================================
// 5. REPORT GENERATOR AGENT
// ==========================================

export const REPORT_GENERATOR_SYSTEM = `You are a world-class startup consultant and business writer.
Generate a comprehensive, beautifully-formatted business validation report in Markdown format.
You must use the following sections exactly:
1. Executive Summary: Summarize the product, key findings, and the bottom line.
2. Audience Composition & Segment Analysis: Break down the simulated audience profile and persona categories.
3. Interest Score & Confidence: Detail the overall score, segment variations, what it implies, and the confidence score.
4. Adoption Probability: Define the likelihood of conversion/adoption.
5. Segment Breakdown: Detailed per-segment interest, concerns, signals, and adoption likelihood.
6. Red Team Analysis: Include findings from the red team report (if provided).
7. Competitive Landscape: Summarize competitors (if provided).
8. Where to Validate: Recommend communities for real-world validation (if provided).
9. Common Objections: Bulleted list of objections with context.
10. Positive Signals: List of positive signals and biggest opportunity.
11. Suggestions & FAQs: Constructive feedback and frequently asked questions.
12. Risk Analysis: Main product/market risks identified, including biggest risk and assumptions.
13. Improvement Opportunities: Concrete action items to improve the idea.
14. Actionable Roadmap: A comprehensive 5-7 step plan to execute the improvements.

Make the style professional, insightful, and formatted cleanly with headers, tables, bullet points, and markdown highlights.`;

export function formatReportGeneratorPrompt(ideaText: string, personas: any[], simulations: any[], insights: any, redTeamReport?: any, competitors?: any[], communityRecommendations?: any[]): string {
  const personaList = personas.map(p => `- **${p.name}** (${p.role}, Age ${p.age}): ${p.personalityTraits.join(', ')}`).join('\n');
  
  const segmentBreakdown = (insights.segmentBreakdown || []).map((s: any) => 
    `- **${s.segmentName}**: Avg Interest: ${s.avgInterest?.toFixed(1)}, Would Try: ${s.wouldTryPercent?.toFixed(0)}%. Positive: ${s.positiveSignals?.join(', ')}. Concerns: ${s.commonConcerns?.join(', ')}`
  ).join('\n');

  return `Product Idea:
"${ideaText}"

Aggregate Insights:
- Interest Score: ${insights.overallInterestScore}/100
- Adoption Probability: ${insights.adoptionProbability}%
- Most Interested: ${insights.mostInterestedSegment}
- Least Interested: ${insights.leastInterestedSegment}
- Top Concerns: ${insights.topConcerns.join('; ')}
- Top Suggestions: ${insights.topSuggestions.join('; ')}
- FAQs: ${insights.frequentlyAskedQuestions.join('; ')}
- Recommendations: ${insights.improvementRecommendations.join('; ')}
- Roadmap: ${insights.actionableRoadmap.join('; ')}
- Positive Signals: ${insights.positiveSignals?.join('; ') || 'None'}
- Biggest Opportunity: ${insights.biggestOpportunity || 'N/A'}
- Biggest Risk: ${insights.biggestRisk || 'N/A'}
- Assumptions: ${insights.importantAssumptions?.join('; ') || 'None'}
- Confidence: ${insights.confidence?.score}/100 (High factors: ${insights.confidence?.highFactors?.join(', ')}, Low factors: ${insights.confidence?.lowFactors?.join(', ')})

Segment Breakdown:
${segmentBreakdown}

Audience Personas:
${personaList}

${redTeamReport ? `Red Team Report:\n${JSON.stringify(redTeamReport, null, 2)}\n` : ''}
${competitors ? `Competitors:\n${JSON.stringify(competitors, null, 2)}\n` : ''}
${communityRecommendations ? `Community Recommendations:\n${JSON.stringify(communityRecommendations, null, 2)}\n` : ''}

Please generate the final validation report in full Markdown following the 14 specified sections.`;
}
