/*
 * 方式一：一键直达（书签 → 打开报告页 → postMessage 传数据）
 * ------------------------------------------------------------------
 * 在国服 FF14 官网（已登录）点此书签：会打开报告页，并把抓到的全部
 * 超域旅行订单通过 postMessage 直接传过去，无需手动下载/上传。
 *
 * 部署后必须修改下面的 REPORT 为你的报告页地址（GitHub Pages 等）。
 * 跨窗口 postMessage 不受同源限制；报告页会校验 e.origin 只接受官网来源。
 */
(async () => {
  const A = '100001900';
  const S = 24;
  const B = 'https://ff14bjz.sdo.com/api/orderserivce/queryMigrationOrders';
  const REPORT = 'https://YOUR-NAME.github.io/DcTravelSummary/'; // ← 部署后替换
  const ORIGIN = new URL(REPORT).origin;

  const F = async (p) => {
    const r = await fetch(`${B}?appId=${A}&pageIndex=${p}&pageNum=${S}`, { credentials: 'include' });
    const j = await r.json();
    if (!j || !j.data) throw new Error('返回为空，可能未登录');
    return j.data;
  };

  // 先在用户手势内打开窗口，避免被弹窗拦截
  const w = window.open(REPORT, '_blank');
  if (!w) { alert('弹窗被拦截，请允许本站弹窗后重试'); return; }

  try {
    const f = await F(1), T = f.totalPageNum || 1;
    let all = JSON.parse(f.orderlist || '[]');
    for (let p = 2; p <= T; p++) all = all.concat(JSON.parse((await F(p)).orderlist || '[]'));

    const msg = {
      type: 'DC_TRAVEL_DATA',
      payload: { appId: A, fetchedAt: new Date().toISOString(), totalCount: all.length, orders: all }
    };

    // 握手：报告页就绪会发 DC_TRAVEL_READY；同时兜底重试发送
    let sent = false;
    window.addEventListener('message', (e) => {
      if (e.origin === ORIGIN && e.data && e.data.type === 'DC_TRAVEL_READY') { w.postMessage(msg, ORIGIN); sent = true; }
    });
    let n = 0;
    const timer = setInterval(() => {
      if (sent || n++ > 40) { clearInterval(timer); return; }
      try { w.postMessage(msg, ORIGIN); } catch (_) {}
    }, 300);
  } catch (e) {
    alert('获取失败：' + e.message);
  }
})();
