import { Router, Request, Response } from 'express';
import { dbService } from '../services/database';
import { pivotAgent } from '../agents/pivot';
import { compiledWorkflow } from '../langgraph/workflow';
import { VersionSnapshot } from '../types';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };
};

/**
 * POST /pivot
 * Pivots an existing idea and runs a full simulation pipeline on the new idea.
 */
router.post('/pivot', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId, pivotInstruction } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required.' });
  }
  if (!pivotInstruction || typeof pivotInstruction !== 'string') {
    return res.status(400).json({ error: 'pivotInstruction is required.' });
  }

  const idea = await dbService.getIdea(ideaId);
  if (!idea) {
    return res.status(404).json({ error: `Idea with ID ${ideaId} not found.` });
  }

  console.log(`API: Pivoting idea ${ideaId}... Instruction: ${pivotInstruction}`);
  
  // Snapshot the old state
  const report = await dbService.getReport(ideaId);
  const history = await dbService.getVersionHistory(ideaId);
  const versionNumber = history.length + 1;

  if (report) {
    const oldSnapshot: VersionSnapshot = {
      versionNumber,
      ideaText: idea.rawText,
      timestamp: new Date().toISOString(),
      overallInterest: report.insights.overallInterestScore,
      adoptionProbability: report.insights.adoptionProbability,
      segmentBreakdown: report.insights.segmentBreakdown?.map((s: any) => ({ segment: s.segmentName, interest: s.avgInterest })) || [],
      topConcerns: report.insights.topConcerns,
      confidenceScore: report.insights.confidence?.score
    };
    await dbService.saveVersion(ideaId, oldSnapshot);
  }

  // 1. Generate the new idea text
  const newIdeaText = await pivotAgent.generatePivotedIdea(idea.rawText, pivotInstruction);
  
  console.log(`API: New pivoted idea generated. Running full analysis pipeline...`);

  // 2. Run the full LangGraph workflow on the new idea
  const finalState = await compiledWorkflow.invoke({
    rawInput: newIdeaText
  });

  // Copy old history to new ideaId so it's inherited
  const oldHistoryWithSnapshot = await dbService.getVersionHistory(ideaId);
  for (const snap of oldHistoryWithSnapshot) {
    await dbService.saveVersion(finalState.ideaId || ideaId, snap);
  }

  // Snapshot the new state
  const newHistory = await dbService.getVersionHistory(finalState.ideaId || ideaId);
  const newVersionNumber = newHistory.length + 1;

  const newSnapshot: VersionSnapshot = {
    versionNumber: newVersionNumber,
    ideaText: newIdeaText,
    timestamp: new Date().toISOString(),
    overallInterest: finalState.insights?.overallInterestScore || 0,
    adoptionProbability: finalState.insights?.adoptionProbability || 0,
    segmentBreakdown: finalState.insights?.segmentBreakdown?.map((s: any) => ({ segment: s.segmentName, interest: s.avgInterest })) || [],
    topConcerns: finalState.insights?.topConcerns || [],
    confidenceScore: finalState.insights?.confidence?.score
  };
  await dbService.saveVersion(finalState.ideaId || ideaId, newSnapshot);

  return res.json({
    message: 'Idea successfully pivoted and simulated.',
    ideaId: finalState.ideaId,
    analyzedIdea: finalState.analyzedIdea,
    personasCount: finalState.personas?.length || 0,
    personas: finalState.personas,
    simulations: finalState.simulations,
    insights: finalState.insights,
    report: finalState.report,
    versionHistory: await dbService.getVersionHistory(finalState.ideaId || ideaId)
  });
}));

export default router;
