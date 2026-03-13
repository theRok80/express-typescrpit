import { COIN_TYPE, WORK_COIN_STATUS } from '../constants';
import { WorkCoin } from './tables/coin';

export interface WorkCoinForReduce extends WorkCoin {
  reduceCoin: number;
}

export type CoinType = (typeof COIN_TYPE)[keyof typeof COIN_TYPE];
export type WorkCoinStatus =
  (typeof WORK_COIN_STATUS)[keyof typeof WORK_COIN_STATUS];
