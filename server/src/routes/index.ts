import { Router } from 'express';
import { authRouter } from './auth.js';
import { usersRouter } from './users.js';
import { appointmentsRouter } from './appointments.js';
import { ehrRouter } from './ehr.js';
import { prescriptionsRouter } from './prescriptions.js';
import { pharmacyRouter } from './pharmacy.js';
import { triageRouter } from './triage.js';
import { followupsRouter } from './followups.js';
import { syncRouter } from './sync.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/ehr', ehrRouter);
apiRouter.use('/prescriptions', prescriptionsRouter);
apiRouter.use('/pharmacy', pharmacyRouter);
apiRouter.use('/triage-logs', triageRouter);
apiRouter.use('/followups', followupsRouter);
apiRouter.use('/sync', syncRouter);
