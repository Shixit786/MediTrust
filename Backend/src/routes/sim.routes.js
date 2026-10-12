import { Router } from 'express';
import {
  registerSim,
  getSimByPhone,
  simulateSimEvent,
  resetSim,
} from '../controllers/sim.controller.js';

const router = Router();

router.post('/register', registerSim);
router.get('/:phone', getSimByPhone);
router.post('/simulate/:type', simulateSimEvent);
router.post('/reset', resetSim);

export default router;
