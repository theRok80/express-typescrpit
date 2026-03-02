export interface Join {
  table: string;
  tableAs: string;
  type: string;
  on: string;
  where?: Record<string, any>;
  index?: string;
}

export interface QueryBuilder1Args {
  table: string;
  action: string;
  params: Record<string, any>;
  secParams?: Record<string, any>;
  conditions?: string | string[];
  select?: string[];
  index?: string;
}

export interface BuildConditionArgs {
  table?: string;
  tableAs?: string;
  condition: Record<string, any>;
  join?: Join;
  isDuplicate?: boolean;
}

export interface QueryBuilder2Args {
  table: string;
  tableAs?: string;
  action: string;
  where?: Record<string, any>;
  set?: Record<string, any>;
  duplicate?: Record<string, any>;
  conditions?: string | string[];
  select?: string[];
  index?: string;
  join?: Join;
  isSubQuery?: boolean;
}

export interface ExecuteQueryArgs extends QueryBuilder2Args {
  printName?: string;
  print?: boolean;
  printTag?: string;
  slaveConn?: PromisePool;
  masterConn?: PromisePool;
  tryCount?: number;
  errorMessage?: string[];
  mute?: boolean;
  console?: boolean;
  query?: string;
}
