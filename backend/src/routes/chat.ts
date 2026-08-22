import { Router, Request, Response } from 'express';
import { chatAgent } from '../agents/chat';
import { dbService } from '../services/database';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };
};

/**
 * POST /chat
 * Conversational endpoint to chat with the report or specific personas.
 */
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId, messages, context } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required.' });
  }
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  console.log(`API: Processing chat message for idea ${ideaId}... context: ${JSON.stringify(context)}`);
  
  let responseText = await chatAgent.handleChat(ideaId, messages, context);
  
  let newScore: number | undefined = undefined;

  // Extract [[SCORE: X]] tag if present
  const scoreRegex = /\[\[SCORE:\s*(\d+)\]\]/i;
  const match = responseText.match(scoreRegex);
  if (match && match[1]) {
    newScore = parseInt(match[1], 10);
    responseText = responseText.replace(scoreRegex, '').trim(); // Remove it from the text seen by the user

    if (context?.type === 'persona' && context.targetId) {
      // Update the simulation in the database
      const simulations = await dbService.getSimulations(ideaId);
      const sim = simulations.find(s => s.personaId === context.targetId);
      if (sim) {
        sim.result.excitementScore = newScore;
        await dbService.saveSimulations(ideaId, simulations);
      }
    }
  }
  
  // Save chat memory
  const report = await dbService.getReport(ideaId);
  if (report) {
    if (!report.chatMemory) report.chatMemory = {};
    const memoryKey = context?.targetId || 'general';
    report.chatMemory[memoryKey] = [...messages, { role: 'assistant', content: responseText }];
    await dbService.saveReport(ideaId, report.insights, report.fullReportMarkdown, {
      redTeamReport: report.redTeamReport,
      competitors: report.competitors,
      communityRecommendations: report.communityRecommendations,
      versionHistory: report.versionHistory,
      chatMemory: report.chatMemory
    });
  }

  return res.json({
    message: 'Chat response generated.',
    response: responseText,
    newScore // Send back to frontend to dynamically update the UI
  });
}));

/**
 * POST /summarize-chat
 * Summarizes the chat history to generate a pivot instruction.
 */
router.post('/summarize-chat', asyncHandler(async (req: Request, res: Response) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  console.log(`API: Summarizing chat...`);
  
  const pivotInstruction = await chatAgent.summarizeChatToPivot(messages);

  return res.json({
    message: 'Chat summarized successfully.',
    pivotInstruction
  });
}));

export default router;
