export interface Order {
  migrationType?: number;
  migrationStatus?: number;
  migrationStatusDesc?: string;
  targetGroupName?: string;
  groupName?: string;
  targetAreaName?: string;
  areaName?: string;
  createTime?: string;
  roleName?: string;
  roleList?: string;
  migrationDetailList?: Array<{ roleName?: string }>;
  payAmount?: number;
  /** 派生：解析后的日期 */
  _d?: Date | null;
  /** 派生：归属角色名 */
  _role?: string;
  [k: string]: unknown;
}

export type TripKind = 'paired' | 'repat' | 'ongoing';

export interface Trip {
  dest: string;
  dc: string;
  depart: Date;
  ret: Date | null;
  role: string;
  kind: TripKind;
  ms: number;
}

export interface StayResult {
  trips: Trip[];
  ongoing: Trip | null;
  ongoingList: Trip[];
  longest: Trip | null;
  pairedCount: number;
  repatCount: number;
}

/** 2019 拆区补偿免费转服（migrationType 1，早于超域旅行上线）的彩蛋数据 */
export type FreeKase = 'won' | 'failed' | 'gaveup' | 'veteran';
export interface FreeTransfer {
  role: string;
  attempts: number;
  fails: number;
  success: boolean;
  from: string;
  to: string;
  date: Date;
  kase: FreeKase;
  roleCount: number;
}

export type Entry = [string, number];

export interface Stats {
  total: number;
  successDepart: number;
  failDepart: number;
  back: number;
  backOK: number;
  backFail: number;
  byServer: Entry[];
  byDC: Entry[];
  uniqueServers: number;
  uniqueDCs: number;
  homeServer: string;
  byHour: number[];
  favHour: number;
  lateNight: number;
  byMonth: number[];
  busyMonth: number;
  busyMonthCount: number;
  firstDepart: Order | null;
  lastEvent: Order | null;
  latestDepart: Order | null;
  activeDays: number;
  longest: Trip | null;
  ongoing: Trip | null;
  ongoingList: Trip[];
  pairedCount: number;
  repatCount: number;
  roleCounts: Entry[];
  roleName: string;
  freeTransfer: FreeTransfer | null;
  asOf: Date;
}

export interface Parsed {
  orders: Order[];
  fetchedAt: string | null;
}
