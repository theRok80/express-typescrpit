import Redis from 'ioredis';
import { ENVIRONMENT } from '../constants';
import { jsonParse, jsonStringify } from './common';

const client = new Redis();
const slaveClient = new Redis();

function keyName(key: string): string {
  if (key.includes(`${ENVIRONMENT}:`)) {
    return key;
  }

  const replaceKey = key.replace(/\//g, ':').replace(/-/g, ':');
  return ENVIRONMENT + ':' + replaceKey;
}

function keyNameWithoutSalt(key: string): string {
  const replaceKey = key.replace(/\//g, ':').replace(/-/g, ':').split(':');
  replaceKey.pop();
  return replaceKey.join(':');
}

async function get(key: string): Promise<object | string | number | undefined> {
  if (!key) {
    throw new Error('key is required');
  }
  const cacheKey = keyName(key);
  try {
    const data = await slaveClient.get(cacheKey);
    if (data) {
      return jsonParse(data);
    }
    throw new Error('not found');
  } catch (e) {
    return undefined;
  }
}

async function set(key: string, value: string | object, ttl = 60): Promise<void> {
  if (!key || value == null) {
    throw new Error('invalid params');
  }

  const cacheKey = keyName(key);
  try {
    const serialized = typeof value === 'string' ? value : jsonStringify(value);
    await client.set(cacheKey, serialized, 'EX', ttl);
  } catch (e) {
    console.log('redisCache set error', e);
    throw e;
  }
}

async function remove(key: string): Promise<void> {
  if (!key) {
    throw new Error('key is required');
  }

  try {
    const targetKeys = await keys(key);
    await Promise.all(targetKeys.map((k) => client.del(k)));
  } catch (e) {
    console.log('redisCache remove error', e);
    throw e;
  }
}

async function keys(key: string, noSalt = false): Promise<string[]> {
  try {
    if (key) {
      const [, keys] = await client.scan(
        0,
        'MATCH',
        `*${noSalt ? keyNameWithoutSalt(key) : key}*`,
        'COUNT',
        100
      );
      return keys;
    } else {
      const [, keys] = await client.scan(0, 'MATCH', `${ENVIRONMENT}:*`, 'COUNT', 9999);
      return keys;
    }
  } catch (e) {
    console.log('redisCache remove error', e);
    throw e;
  }
}

async function mget(keys: string[]): Promise<object> {
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('keys array is required');
  }

  const cacheKeys = keys.map((key) => keyName(key));
  try {
    const data = await slaveClient.mget(cacheKeys);
    return data.map((item) => (item ? jsonParse(item) : undefined));
  } catch (e) {
    return keys.map(() => undefined);
  }
}

async function zget({
  key,
  offset = 0,
  limit = -1,
  order = 'asc',
}: {
  key: string;
  offset: number;
  limit: number;
  order: 'asc' | 'desc';
}): Promise<string[]> {
  if (!key) {
    throw new Error('key is required');
  }

  const cacheKey = key === 'order' ? key : keyName(key);
  const start = offset;
  const stop = limit === -1 ? -1 : offset + limit - 1;

  if (order === 'desc') {
    return await slaveClient.zrevrange(cacheKey, start, stop);
  }
  return await slaveClient.zrange(cacheKey, start, stop);
}

async function zcard({ key }: { key: string }): Promise<number> {
  if (!key) {
    throw new Error('key is required');
  }

  const cacheKey = key === 'order' ? key : keyName(key);
  return await slaveClient.zcard(cacheKey);
}

async function zrem({ key, members }: { key: string; members: string[] }): Promise<number> {
  if (!key) {
    throw new Error('key is required');
  }
  if (!members || !Array.isArray(members) || members.length === 0) {
    throw new Error('members array is required');
  }

  const cacheKey = key === 'order' ? key : keyName(key);
  return await client.zrem(cacheKey, ...members);
}

async function zadd({
  key,
  data,
  ttl,
}: {
  key: string;
  data: { score: number; member: string }[];
  ttl: number;
}): Promise<number> {
  if (!key) {
    throw new Error('key is required');
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('data array is required');
  }

  const cacheKey = key === 'order' ? key : keyName(key);

  // data가 { score, member } 형태의 객체 배열인 경우 flat하게 변환
  const args = data.flatMap((item) => [item.score, item.member]);

  if (ttl) {
    // TTL이 있는 경우 pipeline 사용
    const pipeline = client.pipeline();
    pipeline.zadd(cacheKey, ...args);
    pipeline.expire(cacheKey, ttl);
    const result = await pipeline.exec();
    return result?.length ?? 0;
  }

  return await client.zadd(cacheKey, ...args);
}

async function incr(key: string): Promise<number> {
  if (!key) {
    throw new Error('key is required');
  }

  return await client.incr(key);
}

async function expire(key: string, ttl: number): Promise<number> {
  if (!key) {
    throw new Error('key is required');
  }

  return await client.expire(key, ttl);
}

export {
  get,
  set,
  keys,
  remove,
  keyName,
  keyNameWithoutSalt,
  mget,
  zget,
  zcard,
  zrem,
  zadd,
  incr,
  expire,
};
