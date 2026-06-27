import type { Order, Entry, Trip, StayResult, Stats, FreeTransfer, FreeKase } from './types';
import { DAY, ymd } from './format';

function countBy<T>(a: T[], f: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {};
  a.forEach((x) => {
    const k = f(x);
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}
function sortEntries(m: Record<string, number>): Entry[] {
  return Object.keys(m)
    .map((k) => [k, m[k]] as Entry)
    .sort((a, b) => b[1] - a[1]);
}
function topEntry(m: Record<string, number>): Entry | null {
  const e = sortEntries(m);
  return e.length ? e[0] : null;
}
function mode(a: string[]): string | null {
  if (!a.length) return null;
  const t = topEntry(countBy(a, (x) => x));
  return t ? t[0] : null;
}
function argmax(a: number[]): number {
  let bi = 0;
  let bv = -Infinity;
  for (let i = 0; i < a.length; i++) if (a[i] > bv) {
    bv = a[i];
    bi = i;
  }
  return bi;
}

/* ---------- 停留 / 遣返 / 至今未归 分析 ----------
   - 用「成功」的出发(4)/返回(5)按时间配对，得到完整往返（精确时长）。
   - 成功出发后没有成功返回 = 被自动遣返（离线>1天送回原服务器，常缺返回订单）。
   - 仅当最后一次成功出发之后「再无任何订单」才算「至今未归」；
     若其后还有订单（哪怕是预检失败的返回），说明人已不在那里 = 已被遣返。
   - 缺返回的停留时长未知，按「至少 1 天」处理，不参与「最久」评比。
   - 按角色分别配对：不同角色可能交错（A出发,B出发,B返回,A返回）。
*/
export function analyzeStays(travel: Order[], nowTs: number): StayResult {
  const dated = travel.filter((o) => o._d).sort((a, b) => +a._d! - +b._d!);

  const byRole: Record<string, Order[]> = {};
  dated.forEach((o) => {
    const r = o._role || '?';
    (byRole[r] = byRole[r] || []).push(o);
  });

  const trips: Trip[] = [];
  const ongoingList: Trip[] = [];

  Object.keys(byRole).forEach((r) => {
    const list = byRole[r]; // 已按时间排序
    let away: { depart: Date; dest: string; dc: string } | null = null;

    list
      .filter((o) => o.migrationStatus === 5)
      .forEach((o) => {
        if (o.migrationType === 4) {
          if (away)
            trips.push({ dest: away.dest, dc: away.dc, depart: away.depart, ret: null, role: r, kind: 'repat', ms: 0 });
          away = { depart: o._d as Date, dest: o.targetGroupName || '', dc: o.targetAreaName || '' };
        } else if (o.migrationType === 5 && away) {
          trips.push({ dest: away.dest, dc: away.dc, depart: away.depart, ret: o._d as Date, role: r, kind: 'paired', ms: 0 });
          away = null;
        }
      });

    if (away) {
      const a = away as { depart: Date; dest: string; dc: string };
      const hasLater = list.some((o) => +o._d! > +a.depart);
      const t: Trip = { dest: a.dest, dc: a.dc, depart: a.depart, ret: null, role: r, kind: hasLater ? 'repat' : 'ongoing', ms: 0 };
      if (!hasLater) ongoingList.push(t);
      trips.push(t);
    }
  });

  trips.forEach((t) => {
    t.ms = t.kind === 'paired' ? +t.ret! - +t.depart : t.kind === 'ongoing' ? nowTs - +t.depart : DAY;
  });

  const measurable = trips.filter((t) => t.kind !== 'repat');
  const pool = measurable.length ? measurable : trips;
  const longest = pool.slice().sort((a, b) => b.ms - a.ms)[0] || null;
  ongoingList.sort((a, b) => b.ms - a.ms);

  return {
    trips,
    ongoing: ongoingList[0] || null,
    ongoingList,
    longest,
    pairedCount: trips.filter((t) => t.kind === 'paired').length,
    repatCount: trips.filter((t) => t.kind === 'repat').length
  };
}

/* ---------- 2019 拆区补偿的免费转服彩蛋 ----------
   - 2019.12.24「超域旅行」上线前，唯一会进订单系统的就是那次拆区补偿的免费转服（migrationType 1，0 元）。
   - 当时新开了猫小胖区（还没有豆豆柴），名额靠抢，预检失败（-1）= 没抢到，迁移成功（5）= 落户成功。
   - 把所有早于该时刻的订单视为同一次「抢区」会话（最早一条角色名常缺失，按角色拆分会少算次数）。
   - 四类剧情：veteran 拆区前（2019 年之前）就在、没参与那次转服的老玩家 /
     won 抢了 N 次才成功 / failed 抢了 N 次都没成 / gaveup 只点了一下就不转了。
*/
const FREE_ERA_END = Date.parse('2019-12-24T00:00:00');
const PRE_SPLIT = Date.parse('2019-01-01T00:00:00'); // 早于此即拆区之前的老玩家

function computeFreeTransfer(all: Order[]): FreeTransfer | null {
  const free = all
    .filter((o) => o._d && +(o._d as Date) < FREE_ERA_END)
    .sort((a, b) => +(a._d as Date) - +(b._d as Date));
  if (!free.length) return null;

  const attempts = free.length;
  const successOrder = free.find((o) => o.migrationStatus === 5) || null;
  const success = !!successOrder;
  const fails = free.filter((o) => o.migrationStatus === -1).length;
  const ref = successOrder || free[free.length - 1];
  const roles = Array.from(new Set(free.map((o) => o._role).filter(Boolean))) as string[];
  const veteran = +(free[0]._d as Date) < PRE_SPLIT;
  const kase: FreeKase = veteran ? 'veteran' : success ? 'won' : attempts >= 2 ? 'failed' : 'gaveup';

  return {
    role: roles[0] || ref._role || '你的角色',
    attempts,
    fails,
    success,
    from: ref.groupName || free[0].groupName || '原来的家',
    to: ref.targetGroupName || free[0].targetGroupName || '新家',
    date: free[0]._d as Date,
    kase,
    roleCount: roles.length
  };
}

/* ---------- 统计（全量；仅超域旅行 migrationType 4/5） ---------- */
export function computeStats(all: Order[], fetchedAt: string | null): Stats {
  const travel = all.filter((o) => o.migrationType === 4 || o.migrationType === 5);
  const out = travel.filter((o) => o.migrationType === 4);
  const back = travel.filter((o) => o.migrationType === 5);
  const ok = (o: Order) => o.migrationStatus === 5;
  const fail = (o: Order) => o.migrationStatus === -1;
  const outOK = out.filter(ok);
  const outFail = out.filter(fail);
  const backOK = back.filter(ok);
  const backFail = back.filter(fail);

  const dest = outOK.length ? outOK : out;
  const byServer = sortEntries(countBy(dest, (o) => o.targetGroupName || '(未知)'));
  const byDC = sortEntries(countBy(dest.filter((o) => o.targetAreaName), (o) => o.targetAreaName as string));
  const home =
    mode(
      outOK
        .map((o) => o.groupName)
        .concat(backOK.map((o) => o.targetGroupName))
        .filter(Boolean) as string[]
    ) || '家';

  const byHour = new Array(24).fill(0);
  const byMonth = new Array(12).fill(0);
  out.forEach((o) => {
    if (o._d) {
      byHour[o._d.getHours()]++;
      byMonth[o._d.getMonth()]++;
    }
  });

  const datedTravel = travel.filter((o) => o._d).sort((a, b) => +a._d! - +b._d!);
  const dayMap = countBy(datedTravel, (o) => ymd(o._d as Date));
  const datedOut = out.filter((o) => o._d).sort((a, b) => +a._d! - +b._d!);

  // 「第一次出发 / 最近一次」只看真正发生的传送，排除预检失败（migrationStatus === -1，人并没动）
  const real = (o: Order) => o.migrationStatus !== -1;
  const datedOutReal = datedOut.filter(real);
  const datedTravelReal = datedTravel.filter(real);

  const nowTs =
    (fetchedAt ? Date.parse(fetchedAt) : 0) ||
    (datedTravel.length ? +(datedTravel[datedTravel.length - 1]._d as Date) : Date.now());
  const stay = analyzeStays(travel, nowTs);
  const roleCounts = sortEntries(countBy(travel.filter((o) => o._role), (o) => o._role as string));

  const favHour = argmax(byHour);
  const busyM = argmax(byMonth);

  // 「最晚一次出发」：0–5 点（六点之前）视为凌晨，比晚上更「晚」
  const lateScore = (o: Order): number => {
    const h = o._d ? o._d.getHours() : -1;
    return h < 0 ? -1 : h < 6 ? h + 24 : h;
  };
  const latestDepart =
    outOK.filter((o) => o._d).slice().sort((a, b) => lateScore(b) - lateScore(a))[0] || null;

  return {
    total: out.length,
    successDepart: outOK.length,
    failDepart: outFail.length,
    back: back.length,
    backOK: backOK.length,
    backFail: backFail.length,
    byServer,
    byDC,
    uniqueServers: byServer.length,
    uniqueDCs: byDC.length,
    homeServer: home,
    byHour,
    favHour,
    lateNight: byHour.slice(0, 6).reduce((a, b) => a + b, 0),
    byMonth,
    busyMonth: busyM + 1,
    busyMonthCount: byMonth[busyM],
    firstDepart: datedOutReal[0] || datedOut[0] || null,
    lastEvent: datedTravelReal[datedTravelReal.length - 1] || datedTravel[datedTravel.length - 1] || null,
    latestDepart,
    activeDays: Object.keys(dayMap).length,
    longest: stay.longest,
    ongoing: stay.ongoing,
    ongoingList: stay.ongoingList,
    pairedCount: stay.pairedCount,
    repatCount: stay.repatCount,
    roleCounts,
    roleName: roleCounts[0] ? roleCounts[0][0] : '旅行者',
    freeTransfer: computeFreeTransfer(all),
    asOf: fetchedAt ? new Date(fetchedAt) : new Date()
  };
}
