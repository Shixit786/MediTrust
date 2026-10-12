import { Router } from 'express';
import { evaluateFusion } from '../controllers/fusion.controller.js';

const router = Router();

router.post('/evaluate', evaluateFusion);

export default router;
