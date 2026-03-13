/**
 * 결제에 대한 충전 재화
 */

import { User } from './user';
import { COIN_TYPE, WORK_COIN_STATUS } from '../../constants';
import { Datetime } from '../variables';
import { CoinType, WorkCoinStatus } from '../coin';

/**
 * 코인 충전 로그
 * UNIQUE_KEY: userId, coinType, relationType, relationId relationType 과 relationId 조합별로 coinType 은 중복 불가, 중복처리 방지
 */
export interface LogCoinReserve {
  reserveId: number; // auto increment, primary keyre
  userId: User['userId'];
  coin: number;
  coinType: CoinType;
  relationType: string; // 해당 row의 생성 원인을 추적할 수 있는 타입
  relationId: string | number; // 해당 row의 생성 원인을 추적할 수 있는 아이디
  expiredAt?: Datetime; // 코인 만료 시간
  createdAt: Datetime;
}

/**
 * 코인 차감 로그
 */
export interface LogCoinReduce {
  reduceId: number; // auto increment, primary key
  reserveId: LogCoinReserve['reserveId'];
  userId: User['userId'];
  coin: number;
  coinType: CoinType;
  relationType: string; // 해당 row의 생성 원인을 추적할 수 있는 타입
  relationId: string | number; // 해당 row의 생성 원인을 추적할 수 있는 아이디
  createdAt: Datetime;
}

/**
 * 활성화 되어 있는 코인 내역
 * 로그랑 달리 사용/만료 되어 필요없는 row 는 삭제하여 크기 조절
 * UNIQUE_KEY: userId, coinType, relationType, relationId relationType 과 relationId 조합별로 coinType 은 중복 불가, 중복처리 방지
 */
export interface WorkCoin {
  reserveId: LogCoinReserve['reserveId']; // primary key
  userId: User['userId'];
  coin: number; // 최초 생성 코인 양
  remains: number; // 남은 코인 양, 사용 시 해당 칼럼을 업데이트
  coinType: CoinType; // primary key
  relationType: LogCoinReserve['relationType'];
  relationId: LogCoinReserve['relationId'];
  status: WorkCoinStatus;
  expiredAt: Datetime;
  createdAt: Datetime;
  updatedAt: Datetime;
}
