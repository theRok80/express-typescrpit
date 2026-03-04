import express from 'express';
import signRouter from './sign';
import webhookRouter from './webhook';

const router = express.Router();

router.use('/sign', signRouter);
router.use('/webhook', webhookRouter);

router.get('/', (req, res) => {
  res.send(res.__('Hello World'));
});

export default router;
