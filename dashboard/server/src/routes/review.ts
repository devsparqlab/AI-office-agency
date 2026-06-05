import { Router } from 'express';
import { globalReviewModel } from '../services/reviewModel';
import type { ReviewModelResponse } from '@shared/types';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const reviews = await globalReviewModel.getReviewSummaries();
    // Needs-review items float to the top so the queue reads naturally.
    reviews.sort((a, b) => {
      if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1;
      return b.taskId.localeCompare(a.taskId);
    });

    const response: ReviewModelResponse = {
      generatedAt: new Date().toISOString(),
      total: reviews.length,
      needsReviewCount: reviews.filter((r) => r.needsReview).length,
      reviews,
    };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to build review model' });
  }
});

export default router;
