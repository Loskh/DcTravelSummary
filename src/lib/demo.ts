import type { Order } from './types';

const A = '丝瓜卡夫卡'; // 主角色：海猫茶屋（猫小胖）
const B = '西瓜卡夫卡'; // 小号：一段仍在继续的旅程

const o = (
  migrationType: number,
  migrationStatus: number,
  targetGroupName: string,
  targetAreaName: string,
  groupName: string,
  areaName: string,
  createTime: string,
  roleName: string,
  migrationStatusDesc: string
): Order => ({
  migrationType,
  migrationStatus,
  targetGroupName,
  targetAreaName,
  groupName,
  areaName,
  createTime,
  roleName,
  migrationStatusDesc,
  payAmount: 0
});

const HOME = '海猫茶屋';
const HOME_DC = '猫小胖';

export const DEMO: { orders: Order[]; fetchedAt: string } = {
  fetchedAt: '2026-06-27T10:00:00',
  orders: [
    // —— 仍在继续：小号传送到拉诺西亚后再无订单（至今未归） ——
    o(4, 5, '拉诺西亚', '陆行鸟', HOME, HOME_DC, '2026-06-15 23:30:00', B, '旅行中【已达到目的地】'),

    // —— 主角色：神意之地一去未回，之后只剩预检失败 = 被遣返 ——
    o(5, -1, HOME, HOME_DC, '神意之地', '陆行鸟', '2026-06-20 00:51:00', A, '预检失败'),
    o(4, 5, '神意之地', '陆行鸟', HOME, HOME_DC, '2026-05-16 16:02:00', A, '旅行中【已达到目的地】'),

    // —— 白银乡（第二次往返，约 2 天） ——
    o(5, 5, HOME, HOME_DC, '白银乡', '莫古力', '2026-04-04 18:00:00', A, '返回成功'),
    o(4, 5, '白银乡', '莫古力', HOME, HOME_DC, '2026-04-02 20:30:00', A, '旅行结束'),

    // —— 红玉海（最久的一次旅居，约 13 天） ——
    o(5, 5, HOME, HOME_DC, '红玉海', '陆行鸟', '2026-03-23 21:00:00', A, '返回成功'),
    o(4, 5, '红玉海', '陆行鸟', HOME, HOME_DC, '2026-03-10 20:05:00', A, '旅行结束'),

    // —— 一次预检失败的出发（没能成行） ——
    o(4, -1, '幻影群岛', '陆行鸟', HOME, HOME_DC, '2026-03-06 20:01:00', A, '预检失败'),

    // —— 水晶塔（凌晨出发） ——
    o(5, 5, HOME, HOME_DC, '水晶塔', '豆豆柴', '2026-02-22 23:00:00', A, '返回成功'),
    o(4, 5, '水晶塔', '豆豆柴', HOME, HOME_DC, '2026-02-20 01:15:00', A, '旅行结束'),

    // —— 晨曦王座（约 1.5 天） ——
    o(5, 5, HOME, HOME_DC, '晨曦王座', '陆行鸟', '2026-02-05 12:00:00', A, '返回成功'),
    o(4, 5, '晨曦王座', '陆行鸟', HOME, HOME_DC, '2026-02-03 22:40:00', A, '旅行结束'),

    // —— 白银乡（第一次往返，约 7 天） ——
    o(5, 5, HOME, HOME_DC, '白银乡', '莫古力', '2026-01-12 19:30:00', A, '返回成功'),
    o(4, 5, '白银乡', '莫古力', HOME, HOME_DC, '2026-01-05 21:10:00', A, '旅行结束'),

    // —— 彩蛋：2019 拆区补偿的免费转服（migrationType 1，抢了 3 次才落户海猫茶屋） ——
    o(1, -1, HOME, HOME_DC, '延夏', '陆行鸟', '2019-12-20 17:42:00', A, '预检失败'),
    o(1, -1, HOME, HOME_DC, '延夏', '陆行鸟', '2019-12-20 17:55:00', A, '预检失败'),
    o(1, 5, HOME, HOME_DC, '延夏', '陆行鸟', '2019-12-20 18:18:00', A, '迁移成功')
  ]
};
