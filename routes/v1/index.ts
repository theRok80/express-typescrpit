import express from 'express';
import signRouter from './sign';
import webhookRouter from './webhook';
import paymentRouter from './payment';
import batchRouter from './batch';

import userValidation from '../../middlewares/userValidation';
import userIdRequired from '../../middlewares/userIdRequired';

const router = express.Router();

router.use('/sign', signRouter);
router.use('/webhook', webhookRouter);
router.use('/payment', userValidation, userIdRequired, paymentRouter);
router.use('/batch', batchRouter);

export default router;
