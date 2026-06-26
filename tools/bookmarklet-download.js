/*
 * DC Travel Summary —— 数据导出书签 (bookmarklet)
 * ------------------------------------------------------------------
 * 因为订单接口需要登录态 (cookie) 且不允许跨域携带凭证，所以数据只能在
 * 国服 FF14 官网自身的页面上抓取。本脚本会翻完所有分页，把全部跨大区旅行
 * 订单合并后导出成一个 JSON 文件，再到本项目的 index.html 里导入即可。
 *
 * 用法（任选其一）：
 *   1. 用报告首页「复制书签」按钮拿到压缩好的一行版（源同 src/lib/bookmarklets.ts），
 *      新建浏览器书签把它粘到"网址"，登录官网后点该书签。
 *   2. 登录官网后按 F12 打开控制台，粘贴下面这段源码回车。
 *
 * 本文件是可读源码；应用内实际使用的压缩版维护在 src/lib/bookmarklets.ts。
 */
(async () => {
  const APP_ID = '100001900'; // 与官网当前账号/游戏一致，一般无需修改
  const PAGE_SIZE = 24;
  const BASE = 'https://ff14bjz.sdo.com/api/orderserivce/queryMigrationOrders';

  const fetchPage = async (pageIndex) => {
    const url = `${BASE}?appId=${APP_ID}&pageIndex=${pageIndex}&pageNum=${PAGE_SIZE}`;
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json();
    if (!json || !json.data) throw new Error('返回数据为空，可能未登录或登录已过期');
    return json.data;
  };

  try {
    const first = await fetchPage(1);
    const totalPages = first.totalPageNum || 1;
    let orders = JSON.parse(first.orderlist || '[]');

    for (let p = 2; p <= totalPages; p++) {
      const data = await fetchPage(p);
      orders = orders.concat(JSON.parse(data.orderlist || '[]'));
    }

    const payload = {
      appId: APP_ID,
      fetchedAt: new Date().toISOString(),
      totalCount: orders.length,
      orders,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dc-travel-orders-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    alert(`已导出 ${orders.length} 条旅行记录，请到年度总结页面导入该 JSON 文件。`);
  } catch (e) {
    alert('获取失败：' + e.message + '\n请确认已登录国服 FF14 官网，且账号正确。');
  }
})();
