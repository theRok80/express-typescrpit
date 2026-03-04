import express from 'express';
import userRouter from './user';
import webhookRouter from './webhook';

const router = express.Router();

router.use('/user', userRouter);
router.use('/webhook', webhookRouter);

router.get('/', (req, res) => {
  res.send(res.__('Hello World'));
});

export default router;
