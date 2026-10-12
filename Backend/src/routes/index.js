import { Router } from 'express';
import { env } from '../config/env.js';
import healthRoutes from './health.routes.js';
import voiceRoutes from './voice.routes.js';
import jobRoutes from './job.routes.js';
import simRoutes from './sim.routes.js';
import fusionRoutes from './fusion.routes.js';
import testRoutes from './test.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/voice', voiceRoutes);
apiRouter.use('/job', jobRoutes);
apiRouter.use('/sim', simRoutes);
apiRouter.use('/fusion', fusionRoutes);

// TODO: remove after Stage 5
if (env.NODE_ENV !== 'production') {
  apiRouter.use('/test', testRoutes);
}

export default apiRouter;
