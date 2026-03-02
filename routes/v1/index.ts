import express from 'express';
import userRouter from './user';

const router = express.Router();

router.use('/user', userRouter);

router.get('/', (req, res) => {
  res.send(res.__('Hello World'));
});

export default router;
