import express from 'express';
import signRouter from './sign';
import webhookRouter from './webhook';
import paymentRouter from './payment';

const router = express.Router();

router.use('/sign', signRouter);
router.use('/webhook', webhookRouter);
router.use('/payment', paymentRouter);

router.get('/', (req, res) => {
  res.send(res.__('Hello World'));
});

export default router;
