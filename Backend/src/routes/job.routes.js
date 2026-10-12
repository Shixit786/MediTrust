import { Router } from 'express';
import { analyzeJob } from '../controllers/job.controller.js';

const router = Router();

router.post('/analyze', analyzeJob);

export default router;
