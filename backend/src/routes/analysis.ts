import { Router, Request, Response } from 'express';
import { dbService } from '../services/database';
import { analyzerAgent } from '../agents/analyzer';
import { generatorAgent } from '../agents/generator';
import { simulatorAgent } from '../agents/simulator';
import { insightsAgent } from '../agents/insights';
import { reporterAgent } from '../agents/reporter';
import { researchAgent } from '../agents/research';
import { redTeamAgent } from '../agents/redTeam';
import { compiledWorkflow } from '../langgraph/workflow';

const router = Router();

/**
 * Helper to handle async route errors
 */
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };
};

/**
 * POST /analyze-idea
 * Dissects raw idea text and extracts structured industry analysis metadata.
 */
router.post('/analyze-idea', asyncHandler(async (req: Request, res: Response) => {
  const { idea, config } = req.body;
  if (!idea || typeof idea !== 'string' || idea.trim() === '') {
    return res.status(400).json({ error: 'idea string is required in request body.' });
  }

  console.log('API: Analyzing idea...');
  const analysis = await analyzerAgent.analyzeIdea(idea, config);
  analysis.config = config; // Include config in analysis payload
  const savedIdea = await dbService.saveIdea(idea, analysis, config);

  return res.json({
    message: 'Idea analyzed and saved successfully.',
    ideaId: savedIdea.id,
    analysis
  });
}));

/**
 * POST /generate-audience
 * Generates 15-20 diverse personas based on the idea analysis.
 */
router.post('/generate-audience', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required in request body.' });
  }

  console.log(`API: Fetching idea ${ideaId}...`);
  const idea = await dbService.getIdea(ideaId);
  if (!idea) {
    return res.status(404).json({ error: `Idea with ID ${ideaId} not found.` });
  }
  if (!idea.analysis) {
    return res.status(400).json({ error: 'Idea has not been analyzed yet. Run /analyze-idea first.' });
  }

  console.log(`API: Generating audience personas for idea ${ideaId}...`);
  const personas = await generatorAgent.generateAudience(idea.rawText, idea.analysis, idea.config);
  const savedPersonas = await dbService.savePersonas(ideaId, personas);

  return res.json({
    message: 'Audience personas generated and saved successfully.',
    ideaId,
    personas: savedPersonas
  });
}));

/**
 * POST /simulate
 * Simulates persona reactions to the startup/product idea in parallel.
 */
router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required in request body.' });
  }

  const idea = await dbService.getIdea(ideaId);
  if (!idea) {
    return res.status(404).json({ error: `Idea with ID ${ideaId} not found.` });
  }

  const personas = await dbService.getPersonas(ideaId);
  if (!personas || personas.length === 0) {
    return res.status(400).json({ error: 'No personas found for this idea. Run /generate-audience first.' });
  }

  console.log(`API: Simulating reactions for ${personas.length} personas...`);
  let batchSize = 6;
  if (idea.config?.depth === 'quick') batchSize = 8;
  if (idea.config?.depth === 'deep') batchSize = 5;
  const simulations = await simulatorAgent.simulateAudience(idea.rawText, personas, idea.config, batchSize);
  const savedSims = await dbService.saveSimulations(ideaId, simulations);

  return res.json({
    message: 'Persona reactions simulated and saved successfully.',
    ideaId,
    simulations: savedSims
  });
}));

/**
 * POST /generate-report
 * Analyzes simulated reactions, generates aggregate insights, and compiles the final report.
 */
router.post('/generate-report', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required in request body.' });
  }

  const idea = await dbService.getIdea(ideaId);
  if (!idea) {
    return res.status(404).json({ error: `Idea with ID ${ideaId} not found.` });
  }

  const personas = await dbService.getPersonas(ideaId);
  const simulations = await dbService.getSimulations(ideaId);

  if (!personas || personas.length === 0 || !simulations || simulations.length === 0) {
    return res.status(400).json({ error: 'Audience simulation must be completed before report generation. Run /simulate first.' });
  }

  console.log(`API: Analyzing simulations and generating insights for idea ${ideaId}...`);
  const insights = await insightsAgent.generateInsights(idea.rawText, simulations, personas, idea.config);

  console.log(`API: Running competitor research and red team analysis...`);
  let competitors: any[] | undefined = undefined;
  let communityRecommendations: any[] | undefined = undefined;

  try {
    if (idea.analysis) {
      const researchResult = await researchAgent.research(idea.rawText, idea.analysis, idea.config);
      competitors = researchResult.competitors;
      communityRecommendations = researchResult.communityRecommendations;
    }
  } catch (error) {
    console.error('API: Research agent failed', error);
  }

  console.log(`API: Compiling final report markdown...`);
  const reportMarkdown = await reporterAgent.generateReport(idea.rawText, personas, simulations, insights, undefined, competitors, communityRecommendations, idea.config);
  const savedReport = await dbService.saveReport(ideaId, insights, reportMarkdown, {
    competitors,
    communityRecommendations
  });

  return res.json({
    message: 'Insights and report generated successfully.',
    ideaId,
    insights,
    report: savedReport,
    redTeamReport: null,
    competitors,
    communityRecommendations,
    segmentAnalysis: insights.segmentBreakdown
  });
}));

/**
 * POST /generate-red-team
 * Explicitly triggers a Red Team analysis on demand.
 */
router.post('/generate-red-team', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId } = req.body;
  if (!ideaId) return res.status(400).json({ error: 'ideaId required' });

  const idea = await dbService.getIdea(ideaId);
  const personas = await dbService.getPersonas(ideaId);
  const simulations = await dbService.getSimulations(ideaId);
  const report = await dbService.getReport(ideaId);

  if (!idea || !personas || !simulations || !report) {
    return res.status(400).json({ error: 'Incomplete state to run red team.' });
  }

  console.log(`API: Generating On-Demand Red Team Analysis for ${ideaId}`);
  const redTeamReport = await redTeamAgent.analyze(idea.rawText, personas, simulations, report.insights.segmentBreakdown, idea.config);
  
  // Save it into the existing report object
  report.redTeamReport = redTeamReport;
  await dbService.saveReport(ideaId, report.insights, report.fullReportMarkdown, {
    redTeamReport,
    competitors: report.competitors,
    communityRecommendations: report.communityRecommendations,
    versionHistory: report.versionHistory
  });
  
  return res.json({ redTeamReport });
}));

/**
 * POST /full-analysis
 * Orchestrates the entire LangGraph workflow end-to-end.
 */
router.post('/full-analysis', asyncHandler(async (req: Request, res: Response) => {
  const { idea } = req.body;
  if (!idea || typeof idea !== 'string' || idea.trim() === '') {
    return res.status(400).json({ error: 'idea string is required in request body.' });
  }

  console.log(`API [LANGGRAPH]: Triggering end-to-end analysis workflow for: "${idea.substring(0, 60)}..."`);
  
  // Run the full compiled StateGraph workflow
  const finalState = await compiledWorkflow.invoke({
    rawInput: idea
  });

  return res.json({
    message: 'End-to-end simulation completed successfully.',
    ideaId: finalState.ideaId,
    analyzedIdea: finalState.analyzedIdea,
    personasCount: finalState.personas?.length || 0,
    personas: finalState.personas,
    simulations: finalState.simulations,
    insights: finalState.insights,
    report: finalState.report,
    redTeamReport: finalState.redTeamReport,
    competitors: finalState.competitors,
    communityRecommendations: finalState.communityRecommendations,
    segmentAnalysis: finalState.segmentAnalysis
  });
}));

/**
 * GET /history
 * Returns all saved ideas from the database
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const ideas = await dbService.getAllIdeasLocally();
  // Return just the lightweight data
  const history = ideas.map(idea => ({
    id: idea.id,
    rawText: idea.rawText,
    createdAt: idea.createdAt
  }));
  return res.json({ history });
}));

/**
 * GET /history/:ideaId
 * Returns the full state of a past idea for loading into the dashboard
 */
router.get('/history/:ideaId', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const idea = await dbService.getIdea(ideaId);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const personas = await dbService.getPersonas(ideaId);
  const simulations = await dbService.getSimulations(ideaId);
  const report = await dbService.getReport(ideaId);
  const versionHistory = await dbService.getVersionHistory(ideaId);

  return res.json({
    ideaId: idea.id,
    analyzedIdea: idea.analysis,
    personas,
    simulations,
    insights: report?.insights,
    report,
    versionHistory
  });
}));

export default router;
