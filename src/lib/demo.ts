import type { Order } from './types';

const CHARA0 = '丝瓜卡夫卡';
const CHARA1 = '西瓜卡夫卡';

export const DEMO: { orders: Order[] } = {
  orders: [
    { migrationType: 5, targetGroupName: '海猫茶屋', targetAreaName: '猫小胖', groupName: '晨曦王座', areaName: '陆行鸟', createTime: '2026-06-27 00:51:35', migrationStatus: -1, migrationStatusDesc: '预检失败', payAmount: 0, roleName: CHARA0 },
    { migrationType: 4, targetGroupName: '晨曦王座', targetAreaName: '陆行鸟', groupName: '海猫茶屋', areaName: '猫小胖', createTime: '2026-05-16 16:02:14', migrationStatus: 5, migrationStatusDesc: '旅行中【已达到目的地】', payAmount: 0, roleName: CHARA0 },
    { migrationType: 5, targetGroupName: '海猫茶屋', targetAreaName: '猫小胖', groupName: '白银乡', areaName: '莫古力', createTime: '2026-04-06 21:19:14', migrationStatus: 5, migrationStatusDesc: '返回成功', payAmount: 0, roleName: CHARA0 },
    { migrationType: 4, targetGroupName: '白银乡', targetAreaName: '莫古力', groupName: '海猫茶屋', areaName: '猫小胖', createTime: '2026-03-25 20:15:36', migrationStatus: 5, migrationStatusDesc: '旅行结束', payAmount: 0, roleName: CHARA0 },
    { migrationType: 5, targetGroupName: '海猫茶屋', targetAreaName: '猫小胖', groupName: '白银乡', areaName: '莫古力', createTime: '2026-03-22 22:10:17', migrationStatus: 5, migrationStatusDesc: '返回成功', payAmount: 0, roleName: CHARA0 },
    { migrationType: 4, targetGroupName: '白银乡', targetAreaName: '莫古力', groupName: '海猫茶屋', areaName: '猫小胖', createTime: '2026-03-10 20:02:24', migrationStatus: 5, migrationStatusDesc: '旅行结束', payAmount: 0, roleName: CHARA0 },
    { migrationType: 5, targetGroupName: '海猫茶屋', targetAreaName: '猫小胖', groupName: '白银乡', areaName: '莫古力', createTime: '2026-03-06 20:53:15', migrationStatus: 5, migrationStatusDesc: '返回成功', payAmount: 0, roleName: CHARA0 },
    { migrationType: 4, targetGroupName: '红玉海', targetAreaName: '陆行鸟', groupName: '海猫茶屋', areaName: '猫小胖', createTime: '2026-03-06 20:01:31', migrationStatus: -1, migrationStatusDesc: '预检失败', payAmount: 0, roleName: CHARA0 },
    { migrationType: 4, targetGroupName: '白银乡', targetAreaName: '莫古力', groupName: '海猫茶屋', areaName: '猫小胖', createTime: '2026-03-01 20:50:41', migrationStatus: 5, migrationStatusDesc: '旅行结束', payAmount: 0, roleName: CHARA0 },
    { migrationType: 5, targetGroupName: '海猫茶屋', targetAreaName: '猫小胖', groupName: '白银乡', areaName: '莫古力', createTime: '2026-02-24 20:36:33', migrationStatus: 5, migrationStatusDesc: '返回成功', payAmount: 0, roleName: CHARA1 }
  ]
};
