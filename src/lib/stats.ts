import type { Order, Entry, Trip, StayResult, Stats } from './types';
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
    activeDays: Object.keys(dayMap).length,
    longest: stay.longest,
    ongoing: stay.ongoing,
    ongoingList: stay.ongoingList,
    pairedCount: stay.pairedCount,
    repatCount: stay.repatCount,
    roleCounts,
    roleName: roleCounts[0] ? roleCounts[0][0] : '旅行者'
  };
}
