import express, { Request, Response } from 'express';
import addParamsToProps from '../../middlewares/addParamsToProps';
import addWebhookLog from '../../middlewares/addWebhookLog';
import { webhook } from '../../controllers/v1/payment';

const router = express.Router();

router.post('/:pg/:orderId', addParamsToProps, addWebhookLog, webhook);

export default router;
