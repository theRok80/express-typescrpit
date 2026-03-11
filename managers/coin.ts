/**
 * 코인 관리 매니저
 * 코인 충전, 사용, 만료등에 대한 처리를 담당
 */
import { ProductCoin } from '../types/tables/payment';
import { User } from '../types/tables/user';
import { LogCoinReserve } from '../types/tables/coin';
import DEBUG from 'debug';
import { dayjs, DATETIME_FORMAT } from '../constants';
import tables from '../tools/tables';
import { executeQuery } from '../tools/database';

const debug = DEBUG('dev:managers:coin');

/**
 * 코인 충전 처리
 * relationType 과 relationId 조합별로 coinType 은 중복 불가, 중복처리 방지
 *
 * @param userId 사용자 아이디
 * @param coins 충전 코인 정보
 * @param relationType 관련 타입
 * @param relationId 관련 아이디
 * @param currentDatetime 현재 시간
 */
async function reserve({
  userId,
  coins,
  relationType,
  relationId,
  currentDatetime,
}: {
  userId: User['userId'];
  coins: (Record<string, any> &
    Pick<ProductCoin, 'coin' | 'coinType'> & {
      periodValue?: ProductCoin['periodValue'];
      periodUnit?: ProductCoin['periodUnit'];
    })[];
  relationType?: LogCoinReserve['relationType'];
  relationId?: LogCoinReserve['relationId'];
  currentDatetime?: Date | string;
}): Promise<void> {
  if (!userId || !coins?.length) {
    throw new Error('userId and coins are required');
  }

  try {
    await Promise.all(
      coins.map(async coinObj => {
        const { coin, coinType, periodValue, periodUnit } = coinObj;
        const expiredAt =
          periodUnit && periodValue
            ? dayjs(currentDatetime || undefined)
                .add(periodValue, periodUnit)
                .format(DATETIME_FORMAT)
            : null;

        let reserveId = null;
        // 이미 지급된 로그가 있는지 확인
        let reserveLog: LogCoinReserve | undefined = undefined;
        if (relationType && relationId) {
          const [rows] = await executeQuery({
            printName: 'coin.reserve.log.check',
            print: true,
            table: tables.coin.log.reserve,
            action: 'select',
            where: {
              userId,
              coinType,
              relationType,
              relationId,
            },
          });
          reserveLog = rows?.[0] as LogCoinReserve;
        }

        if (!reserveLog) {
          const [{ insertId }] = await executeQuery({
            printName: 'coin.reserve.log',
            // print: true,
            table: tables.coin.log.reserve,
            action: 'insert',
            set: {
              userId,
              coin,
              coinType,
              relationType,
              relationId,
              expiredAt,
              createdAt: currentDatetime || undefined,
            },
          });
          reserveId = insertId;
        } else {
          reserveId = reserveLog.reserveId;
        }

        // work 테이블은 사용 시 삭제 처리가 되므로
        // 이용 내역에서도 조회하여 이용내역이 존재하면 이미 지급한것으로 판단
        const [[workRow], [reduceRow]] = await Promise.all([
          // work
          executeQuery({
            printName: 'coin.reserve.work',
            // print: true,
            table: tables.coin.work,
            action: 'select',
            where: {
              reserveId,
            },
          }),
          // reduce
          executeQuery({
            printName: 'coin.reserve.reduce',
            // print: true,
            table: tables.coin.log.reduce,
            action: 'select',
            where: {
              reserveId,
            },
          }),
        ]);

        if (!workRow?.length && !reduceRow?.length) {
          await executeQuery({
            printName: 'coin.reserve.work',
            // print: true,
            table: tables.coin.work,
            action: 'ignore',
            set: {
              reserveId,
              userId,
              coin,
              remains: coin,
              coinType,
              relationType,
              relationId,
              expiredAt,
              createdAt: currentDatetime || undefined,
              updatedAt: currentDatetime || undefined,
            },
          });
        }
      }),
    );
  } catch (e) {
    debug.extend('reserve:error')(e);
    throw e;
  }
}

async function reduce({
  userId,
  coins,
  relationType,
  relationId,
}: {
  userId: User['userId'];
  coins: (Record<string, any> &
    Pick<ProductCoin, 'coin' | 'coinType'> & {
      periodValue?: ProductCoin['periodValue'];
      periodUnit?: ProductCoin['periodUnit'];
    })[];
} & Pick<LogCoinReserve, 'relationType' | 'relationId'>) {
  if (!userId || !coins?.length) {
    throw new Error('userId and coins are required');
  }

  try {
    await Promise.all(
      coins.map(async coinObj => {
        const { coin, coinType } = coinObj;
      }),
    );
  } catch (e) {
    debug.extend('reduce:error')(e);
    throw e;
  }
}

async function expire() {}

export { reserve, reduce, expire };
