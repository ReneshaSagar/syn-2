// TypeScript Types for Synthetic Audience

export interface SimulationConfig {
  lens: Array<'market_fit' | 'revenue' | 'growth' | 'risk' | 'ux'>;
  depth: 'quick' | 'standard' | 'deep';
  region: 'global' | 'north_america' | 'europe' | 'south_asia' | 'east_asia' | 'latam' | 'mena' | 'africa';
  customPersona?: string;
  segmentPriority?: string[];
}

export const DEFAULT_CONFIG: SimulationConfig = {
  lens: ['market_fit'],
  depth: 'standard',
  region: 'global',
  customPersona: '',
  segmentPriority: []
};

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
  config?: SimulationConfig;
}

export interface Idea {
  id: string;
  rawText: string;
  analysis?: IdeaAnalysis;
  config?: SimulationConfig;
  createdAt: Date;
}

export interface Persona {
  id: string; // generated client-side or database-side (UUID)
  name: string;
  age: number;
  role: string;
  experience: string;
  motivations: string[];
  frustrations: string[];
  concerns: string[];
  goals: string[];
  personalityTraits: string[];
  segment: string;
  location: string;
  occupation: string;
  technicalAbility: string;
  priceSensitivity: string;
  riskTolerance: string;
  currentTools: string[];
  existingAlternatives: string[];
  painPoints: string[];
  preferences: string[];
  adoptionTendency: string;
}

export interface SimulationResult {
  reaction: string;
  excitementScore: number; // 1-10
  concerns: string[];
  objections: string[];
  likelihoodToUse: number; // 1-10
  suggestions: string[];
  reactionEmoji: string;
  interestScore: number;
  sentiment: string;
  wouldTry: boolean;
  wouldPay: boolean;
  mainAttraction: string;
  mainConcern: string;
  questions: string[];
  whatWouldChangeTheirMind: string;
}

export interface Simulation {
  id: string;
  ideaId: string;
  personaId: string;
  persona?: Persona;
  result: SimulationResult;
  createdAt: Date;
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
  url?: string;
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

export interface SimulationConfidence {
  score: number;
  highFactors: string[];
  lowFactors: string[];
}

export interface AggregateInsights {
  overallInterestScore: number; // 1-100
  adoptionProbability: number; // 0-100 (percentage)
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

export interface Report {
  id: string;
  ideaId: string;
  insights: AggregateInsights;
  fullReportMarkdown: string;
  redTeamReport?: RedTeamReport;
  competitors?: Competitor[];
  communityRecommendations?: CommunityRecommendation[];
  versionHistory?: VersionSnapshot[];
  chatMemory?: Record<string, { role: 'user'|'assistant', content: string }[]>;
  debateMemory?: { persona1Id: string, persona2Id: string, topic: string, messages: { senderId: string, content: string }[] };
  createdAt: Date;
}

export interface WorkflowState {
  ideaId?: string;
  rawInput?: string;
  analyzedIdea?: IdeaAnalysis;
  personas?: Persona[];
  simulations?: Simulation[];
  insights?: AggregateInsights;
  report?: Report;
  audienceComposition?: AudienceSegment[];
  segmentAnalysis?: SegmentAnalysis[];
  redTeamReport?: RedTeamReport;
  competitors?: Competitor[];
  communityRecommendations?: CommunityRecommendation[];
  mode?: string;
}
