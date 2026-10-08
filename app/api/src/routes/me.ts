import { Router } from 'express';
import { currentUser, requireAuth } from '../middleware/auth';

export const meRouter = Router();

meRouter.get('/me', requireAuth, (req, res) => {
  res.json(currentUser(req));
});
