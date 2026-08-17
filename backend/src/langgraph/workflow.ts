import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowState } from '../types';
import { dbService } from '../services/database';
import { analyzerAgent } from '../agents/analyzer';
import { generatorAgent } from '../agents/generator';
import { simulatorAgent } from '../agents/simulator';
import { insightsAgent } from '../agents/insights';
import { reporterAgent } from '../agents/reporter';
import { redTeamAgent } from '../agents/redTeam';
import { researchAgent } from '../agents/research';

// Helper channel reducer - merges old state and new updates
const stateReducer = (left: any, right: any) => {
  return right !== undefined ? right : left;
};

// 1. Idea Analysis Node
async function analyzeIdeaNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: analyzeIdeaNode ---');
  if (!state.rawInput) {
    throw new Error('No raw input provided for analysis.');
  }

  const analysis = await analyzerAgent.analyzeIdea(state.rawInput);
  const savedIdea = await dbService.saveIdea(state.rawInput, analysis);

  return {
    ideaId: savedIdea.id,
    analyzedIdea: analysis,
    audienceComposition: analysis.audienceComposition
  };
}

// 2. Audience Generation Node
async function generateAudienceNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: generateAudienceNode ---');
  if (!state.ideaId || !state.analyzedIdea || !state.rawInput) {
    throw new Error('Missing idea information for audience generation.');
  }

  const personas = await generatorAgent.generateAudience(state.rawInput, state.analyzedIdea);
  const savedPersonas = await dbService.savePersonas(state.ideaId, personas);

  return {
    personas: savedPersonas
  };
}

// 3. Persona Simulation Node
async function simulateReactionsNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: simulateReactionsNode ---');
  if (!state.ideaId || !state.personas || !state.rawInput) {
    throw new Error('Missing personas or idea for simulation.');
  }

  const simulationResults = await simulatorAgent.simulateAudience(state.rawInput, state.personas);
  await dbService.saveSimulations(state.ideaId, simulationResults);
  const simulationsWithPersonas = await dbService.getSimulations(state.ideaId);

  return {
    simulations: simulationsWithPersonas
  };
}

// competitorResearch node
async function competitorResearchNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: competitorResearchNode ---');
  if (!state.rawInput || !state.analyzedIdea) {
    return { competitors: [], communityRecommendations: [] };
  }
  const result = await researchAgent.research(state.rawInput, state.analyzedIdea);
  return {
    competitors: result.competitors,
    communityRecommendations: result.communityRecommendations
  };
}

// 4. Insight Generation Node
async function generateInsightsNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: generateInsightsNode ---');
  if (!state.rawInput || !state.simulations || !state.personas) {
    throw new Error('Missing simulations or personas for insight generation.');
  }

  const insights = await insightsAgent.generateInsights(state.rawInput, state.simulations, state.personas);

  return {
    insights
  };
}

// redTeam node
async function redTeamNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: redTeamNode ---');
  if (!state.rawInput || !state.personas || !state.simulations) {
    return { redTeamReport: undefined };
  }
  const report = await redTeamAgent.analyze(state.rawInput, state.personas, state.simulations);
  return { redTeamReport: report };
}

// 5. Report Generation Node
async function generateReportNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('--- NODE: generateReportNode ---');
  if (!state.ideaId || !state.rawInput || !state.personas || !state.simulations || !state.insights) {
    throw new Error('Missing state data to generate report.');
  }

  const reportMarkdown = await reporterAgent.generateReport(
    state.rawInput,
    state.personas,
    state.simulations,
    state.insights,
    state.redTeamReport,
    state.competitors,
    state.communityRecommendations
  );

  const savedReport = await dbService.saveReport(state.ideaId, state.insights, reportMarkdown);

  return {
    report: savedReport
  };
}

// Initialize StateGraph
const workflow = new StateGraph<WorkflowState>({
  channels: {
    ideaId: { value: stateReducer, default: () => undefined },
    rawInput: { value: stateReducer, default: () => undefined },
    analyzedIdea: { value: stateReducer, default: () => undefined },
    personas: { value: stateReducer, default: () => undefined },
    simulations: { value: stateReducer, default: () => undefined },
    insights: { value: stateReducer, default: () => undefined },
    report: { value: stateReducer, default: () => undefined },
    audienceComposition: { value: stateReducer, default: () => undefined },
    segmentAnalysis: { value: stateReducer, default: () => undefined },
    redTeamReport: { value: stateReducer, default: () => undefined },
    competitors: { value: stateReducer, default: () => undefined },
    communityRecommendations: { value: stateReducer, default: () => undefined },
    mode: { value: stateReducer, default: () => undefined },
  }
})
  .addNode('analyzeIdea', analyzeIdeaNode)
  .addNode('generateAudience', generateAudienceNode)
  .addNode('simulateReactions', simulateReactionsNode)
  .addNode('competitorResearch', competitorResearchNode)
  .addNode('generateInsights', generateInsightsNode)
  .addNode('redTeam', redTeamNode)
  .addNode('generateReport', generateReportNode)
  
  .addEdge(START, 'analyzeIdea')
  .addEdge('analyzeIdea', 'generateAudience')
  .addEdge('generateAudience', 'simulateReactions')
  .addEdge('simulateReactions', 'competitorResearch')
  .addEdge('competitorResearch', 'generateInsights')
  .addEdge('generateInsights', 'redTeam')
  .addEdge('redTeam', 'generateReport')
  .addEdge('generateReport', END);

// Compile the LangGraph workflow
export const compiledWorkflow = workflow.compile();
