import { Router } from 'express';
import { env } from '../config/env.js';
import healthRoutes from './health.routes.js';
import voiceRoutes from './voice.routes.js';
import jobRoutes from './job.routes.js';
import simRoutes from './sim.routes.js';
import fusionRoutes from './fusion.routes.js';
import chatRoutes from './chat.routes.js';
const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/voice', voiceRoutes);
apiRouter.use('/job', jobRoutes);
apiRouter.use('/sim', simRoutes);
apiRouter.use('/fusion', fusionRoutes);
apiRouter.use('/chat', chatRoutes);

export default apiRouter;
