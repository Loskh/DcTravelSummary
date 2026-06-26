import type { Order, Parsed } from './types';
import { pd, dec } from './format';

function salvageJSON(s: string): unknown {
  const i = s.search(/[[{]/);
  if (i < 0) return null;
  const j = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
  if (j > i) {
    try {
      return JSON.parse(s.slice(i, j + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 解析输入（字符串或对象），统一为 { orders, fetchedAt } 并补充派生字段。 */
export function parse(input: string | object): Parsed {
  let data: unknown = input;

  if (typeof data === 'string') {
    const s = data.replace(/^\uFEFF/, '').trim();
    if (!s) throw new Error('内容为空');
    try {
      data = JSON.parse(s);
    } catch {
      data = salvageJSON(s);
      if (!data) {
        const head = s.slice(0, 30).replace(/\s+/g, ' ');
        throw new Error(`内容不是有效的 JSON（已读取 ${s.length} 字，开头「${head}…」）`);
      }
    }
  }

  const d = data as any;
  let orders: Order[] | null = null;
  let fetchedAt: string | null = null;

  if (Array.isArray(d)) orders = d;
  else if (d && Array.isArray(d.orders)) {
    orders = d.orders;
    fetchedAt = d.fetchedAt || null;
  } else if (d && d.data && typeof d.data.orderlist === 'string') orders = JSON.parse(d.data.orderlist);
  else if (d && typeof d.orderlist === 'string') orders = JSON.parse(d.orderlist);
  else if (d && d.data && Array.isArray(d.data.orders)) orders = d.data.orders;

  if (!orders || !orders.length) throw new Error('没有找到订单数据（orders / orderlist 为空）');

  orders.forEach((o) => {
    o._d = pd(o.createTime);
    (['targetGroupName', 'groupName', 'targetAreaName', 'areaName'] as const).forEach((k) => {
      o[k] = dec(o[k]) as string;
    });
    let nm =
      (o.migrationDetailList && o.migrationDetailList[0] && o.migrationDetailList[0].roleName) ||
      o.roleName ||
      '';
    if (!nm && typeof o.roleList === 'string') {
      try {
        const rl = JSON.parse(o.roleList);
        if (rl[0]) nm = rl[0].roleName;
      } catch {
        /* ignore */
      }
    }
    o._role = nm || '';
  });

  return { orders, fetchedAt };
}
