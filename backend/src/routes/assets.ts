import { Router, Request, Response } from 'express';
import { assetAgent } from '../agents/asset';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };
};

/**
 * POST /generate-asset
 * Generates an actionable asset (landing page, pricing, etc) for a specific concern.
 */
router.post('/generate-asset', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId, targetText } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required.' });
  }
  if (!targetText || typeof targetText !== 'string') {
    return res.status(400).json({ error: 'targetText is required.' });
  }

  console.log(`API: Generating asset for idea ${ideaId}... Target: ${targetText}`);
  
  const assetMarkdown = await assetAgent.generateAsset(ideaId, targetText);

  return res.json({
    message: 'Asset generated successfully.',
    assetMarkdown
  });
}));

/**
 * POST /generate-draft
 * Generates a platform-native social media launch post draft.
 */
router.post('/generate-draft', asyncHandler(async (req: Request, res: Response) => {
  const { ideaId, platform, community } = req.body;
  if (!ideaId || typeof ideaId !== 'string') {
    return res.status(400).json({ error: 'ideaId is required.' });
  }
  if (!platform || typeof platform !== 'string') {
    return res.status(400).json({ error: 'platform is required.' });
  }
  if (!community || typeof community !== 'string') {
    return res.status(400).json({ error: 'community is required.' });
  }

  console.log(`API: Generating draft for idea ${ideaId} on ${platform} for ${community}...`);
  
  const draftMarkdown = await assetAgent.generateDraft(ideaId, platform, community);

  return res.json({
    message: 'Draft generated successfully.',
    draftMarkdown
  });
}));

export default router;
