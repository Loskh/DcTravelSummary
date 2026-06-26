import type { Order, Entry } from './types';

export const DAY = 86400000;

const DC_COLORS: Record<string, string> = {
  猫小胖: '#f3d27a',
  陆行鸟: '#7fd8ff',
  莫古力: '#ff8fb1',
  豆豆柴: '#b69cff'
};
const FALLBACK = ['#7fd8ff', '#ff8fb1', '#b69cff', '#f3d27a', '#8fe6b0', '#ffa96b'];

export function dcColor(name: string, i: number): string {
  return DC_COLORS[name] || FALLBACK[i % FALLBACK.length];
}

/** URL 解码（仅当看起来是 %XX 编码时） */
export function dec(s: unknown): unknown {
  if (typeof s !== 'string') return s;
  if (/%[0-9a-fA-F]{2}/.test(s)) {
    try {
      return decodeURIComponent(s);
    } catch {
      /* ignore */
    }
  }
  return s;
}

/** 宽松解析时间字符串为 Date */
export function pd(s: unknown): Date | null {
  if (!s) return null;
  const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const d = new Date(String(s));
  return isNaN(d.getTime()) ? null : d;
}

export function ymd(d: Date): string {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function asDate(d: Order | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  return d._d ?? null;
}

export function fmtFull(d: Order | Date | null | undefined): string {
  const x = asDate(d);
  return x ? `${x.getFullYear()} 年 ${x.getMonth() + 1} 月 ${x.getDate()} 日` : '—';
}

export function fmtYMD(d: Order | Date | null | undefined): string {
  const x = asDate(d);
  return x ? `${x.getFullYear()}.${x.getMonth() + 1}.${x.getDate()}` : '—';
}

export function fmtDur(ms: number): string {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return d + ' 天' + (h ? ' ' + h + ' 小时' : '');
  if (h > 0) return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  return m + ' 分';
}

export function describe(o: Order | null): string {
  if (!o) return '';
  const suffix = o.migrationStatus === -1 ? '（预检失败）' : '';
  if (o.migrationType === 4) return `出发前往「${o.targetGroupName}」（${o.targetAreaName}）${suffix}`;
  if (o.migrationType === 5) return `从「${o.groupName}」回到「${o.targetGroupName}」${suffix}`;
  return o.migrationStatusDesc || '一次旅行';
}

export function donutStops(entries: Entry[]): string {
  const total = entries.reduce((a, e) => a + e[1], 0) || 1;
  let acc = 0;
  const parts: string[] = [];
  entries.forEach((e, i) => {
    const start = (acc / total) * 100;
    acc += e[1];
    const end = (acc / total) * 100;
    parts.push(`${dcColor(e[0], i)} ${start}% ${end}%`);
  });
  return parts.join(', ');
}
