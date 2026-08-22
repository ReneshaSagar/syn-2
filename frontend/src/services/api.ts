import axios from 'axios';

const API_URL = 'http://localhost:5000';

// ==========================================
// INTERFACES
// ==========================================

export interface AudienceSegment {
  name: string;
  count: number;
  description: string;
}

export interface IdeaAnalysis {
  needsMoreInfo?: boolean;
  clarificationQuestions?: string[];
  industry: string;
  targetAudience: string;
  stakeholders: string[];
  businessType: string;
  competitors: string[];
  keyValueProposition: string;
  audienceComposition: AudienceSegment[];
  experts: string[];
  summary: string;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  segment: string;
  experience: string;
  location: string;
  occupation: string;
  technicalAbility: string;
  priceSensitivity: string;
  riskTolerance: string;
  currentTools: string[];
  existingAlternatives: string[];
  motivations: string[];
  frustrations: string[];
  concerns: string[];
  goals: string[];
  painPoints: string[];
  preferences: string[];
  personalityTraits: string[];
  adoptionTendency: string;
}

export interface SimulationResult {
  reaction: string;
  reactionEmoji: string;
  excitementScore: number;
  interestScore: number;
  sentiment: string;
  wouldTry: boolean;
  wouldPay: boolean;
  mainAttraction: string;
  mainConcern: string;
  concerns: string[];
  objections: string[];
  likelihoodToUse: number;
  suggestions: string[];
  questions: string[];
  whatWouldChangeTheirMind: string;
}

export interface Simulation {
  id: string;
  ideaId: string;
  personaId: string;
  persona?: Persona;
  result: SimulationResult;
}

export interface SegmentAnalysis {
  segmentName: string;
  personaCount: number;
  avgInterest: number;
  avgExcitement: number;
  wouldTryPercent: number;
  wouldPayPercent: number;
  commonConcerns: string[];
  positiveSignals: string[];
  adoptionLikelihood: string;
  keyDifferences: string[];
}

export interface SimulationConfidence {
  score: number;
  highFactors: string[];
  lowFactors: string[];
}

export interface AggregateInsights {
  overallInterestScore: number;
  adoptionProbability: number;
  topConcerns: string[];
  topSuggestions: string[];
  mostInterestedSegment: string;
  leastInterestedSegment: string;
  frequentlyAskedQuestions: string[];
  improvementRecommendations: string[];
  actionableRoadmap: string[];
  positiveSignals: string[];
  biggestOpportunity: string;
  biggestRisk: string;
  importantAssumptions: string[];
  segmentBreakdown: SegmentAnalysis[];
  confidence: SimulationConfidence;
}

export interface RedTeamReport {
  overallRiskLevel: string;
  hiddenAssumptions: { assumption: string; severity: string; evidence: string; recommendation: string }[];
  competitiveThreats: string[];
  adoptionBarriers: string[];
  pricingProblems: string[];
  trustAndPrivacyConcerns: string[];
  contradictionsBetweenPersonas: string[];
  summary: string;
}

export interface Competitor {
  name: string;
  description: string;
  targetAudience: string;
  keyFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  differenceFromOurIdea: string;
  threatLevel: string;
  category: string;
  source: string;
}

export interface CommunityRecommendation {
  platform: string;
  community: string;
  relevanceScore: number;
  reason: string;
  audienceType: string;
  feedbackType: string;
  communityRules?: string;
  url?: string;
}

export interface VersionSnapshot {
  versionNumber: number;
  ideaText: string;
  timestamp: string;
  overallInterest: number;
  adoptionProbability: number;
  segmentBreakdown: { segment: string; interest: number }[];
  topConcerns: string[];
  confidenceScore?: number;
}

export interface Report {
  id: string;
  ideaId: string;
  insights: AggregateInsights;
  fullReportMarkdown: string;
}

// Full pipeline result (from /full-analysis or /pivot)
export interface FullPipelineResult {
  ideaId: string;
  analyzedIdea: IdeaAnalysis;
  personas: Persona[];
  simulations: Simulation[];
  insights: AggregateInsights;
  report: Report;
  redTeamReport?: RedTeamReport;
  competitors?: Competitor[];
  communityRecommendations?: CommunityRecommendation[];
  segmentAnalysis?: SegmentAnalysis[];
  versionHistory?: VersionSnapshot[];
}

// ==========================================
// API FUNCTIONS (keep all existing ones)
// ==========================================

export const analyzeIdea = async (idea: string) => {
  const response = await axios.post(`${API_URL}/analyze-idea`, { idea });
  return response.data;
};

export const generateAudience = async (ideaId: string) => {
  const response = await axios.post(`${API_URL}/generate-audience`, { ideaId });
  return response.data;
};

export const simulate = async (ideaId: string) => {
  const response = await axios.post(`${API_URL}/simulate`, { ideaId });
  return response.data;
};

export const generateReport = async (ideaId: string) => {
  const response = await axios.post(`${API_URL}/generate-report`, { ideaId });
  return response.data;
};

export const generateRedTeamAnalysis = async (ideaId: string) => {
  const response = await axios.post(`${API_URL}/generate-red-team`, { ideaId });
  return response.data;
};

export const fullAnalysis = async (idea: string) => {
  const response = await axios.post(`${API_URL}/full-analysis`, { idea });
  return response.data;
};

export const sendChatMessage = async (
  ideaId: string, 
  messages: { role: 'user'|'assistant', content: string }[], 
  context?: { type: 'persona' | 'general', targetId?: string }
) => {
  const response = await axios.post(`${API_URL}/chat`, { ideaId, messages, context });
  return response.data;
};

export const generateAsset = async (ideaId: string, targetText: string) => {
  const response = await axios.post(`${API_URL}/generate-asset`, { ideaId, targetText });
  return response.data;
};

export const pivotIdea = async (ideaId: string, pivotInstruction: string) => {
  const response = await axios.post(`${API_URL}/pivot`, { ideaId, pivotInstruction });
  return response.data;
};

export const fetchHistory = async () => {
  const response = await axios.get(`${API_URL}/history`);
  return response.data;
};

export const loadIdeaState = async (ideaId: string) => {
  const response = await axios.get(`${API_URL}/history/${ideaId}`);
  return response.data;
};

export const summarizeChat = async (messages: { role: 'user'|'assistant', content: string }[]) => {
  const response = await axios.post(`${API_URL}/summarize-chat`, { messages });
  return response.data;
};

export const generateDraft = async (ideaId: string, platform: string, community: string) => {
  const response = await axios.post(`${API_URL}/generate-draft`, { ideaId, platform, community });
  return response.data;
};
