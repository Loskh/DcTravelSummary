#!/usr/bin/env node
/*
 * 数据验证脚本（开发自查用，逻辑与 src/lib 保持独立，便于交叉验证）
 * 用法（在项目根目录运行）: node tools/verify.js [path-to-json]
 *   默认读取 example/ 下最新的 dc-travel-orders-*.json
 *
 * 目的：在动手做网页前，把字段含义、统计口径、边界情况全部摸清。
 * 字段语义来源：站点自带 chunk.js（venue/migrationType 的 productName 映射）。
 */
const fs = require('fs');
const path = require('path');

/* ---------- 定位数据文件 ---------- */
function pickFile() {
  if (process.argv[2]) return process.argv[2];
  const dir = 'example';
  if (fs.existsSync(dir)) {
    const cands = fs.readdirSync(dir)
      .filter(f => /^dc-travel-orders.*\.json$/.test(f))
      .map(f => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (cands.length) return cands[0];
  }
  throw new Error('找不到数据文件，请传入路径：node verify.js <file.json>');
}

/* ---------- 工具 ---------- */
function dec(s) {
  if (typeof s !== 'string') return s;
  if (/%[0-9a-fA-F]{2}/.test(s)) { try { return decodeURIComponent(s); } catch (_) {} }
  return s;
}
function pd(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null;
}
function by(arr, f) { const m = {}; arr.forEach(o => { const k = f(o); m[k] = (m[k] || 0) + 1; }); return m; }
function sortE(m) { return Object.entries(m).sort((a, b) => b[1] - a[1]); }
function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }
function line(t) { console.log('\n' + '─'.repeat(64) + '\n' + (t || '')); }
function roleOf(o) {
  return (o.migrationDetailList && o.migrationDetailList[0] && o.migrationDetailList[0].roleName) || o.roleName || null;
}

const TYPE = { 0: '其他/未知', 1: '跨服迁移(旧)', 3: '账号数据转移', 4: '超域旅行·出发', 5: '超域旅行·返回' };
const VENUE = { 3: '角色转移服务', 997: '特殊(subject)', 998: '雇员服务', 999: '角色改名服务' };

/* ---------- 载入 ---------- */
const FILE = pickFile();
const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const orders = json.orders || (json.data && JSON.parse(json.data.orderlist)) || (Array.isArray(json) ? json : []);
const NAME_FIELDS = ['targetGroupName', 'groupName', 'targetAreaName', 'areaName'];
const encCount = { targetGroupName: 0, groupName: 0, targetAreaName: 0, areaName: 0 };
orders.forEach(o => {
  o._d = pd(o.createTime);
  NAME_FIELDS.forEach(k => {
    if (typeof o[k] === 'string' && /%[0-9a-fA-F]{2}/.test(o[k])) encCount[k]++;
    o[k] = dec(o[k]);
  });
});

console.log('文件:', FILE);
console.log('orders:', orders.length, '| totalCount:', json.totalCount, '| fetchedAt:', json.fetchedAt);
console.log('一致性:', orders.length === json.totalCount ? '✓ 数量匹配' : '✗ 数量不匹配');

/* ---------- 字段完整性 ---------- */
line('字段完整性（null/缺失计数）');
const keys = {};
orders.forEach(o => Object.keys(o).forEach(k => { if (k[0] !== '_') keys[k] = 1; }));
Object.keys(keys).forEach(k => {
  let nulls = 0;
  orders.forEach(o => { if (o[k] === null || o[k] === undefined || o[k] === '') nulls++; });
  if (nulls) console.log('  ' + k.padEnd(20), 'null/空: ' + nulls);
});
console.log('  (其余字段均完整)');

/* ---------- 枚举字段 ---------- */
line('migrationType 分布（产品类型）');
sortE(by(orders, o => o.migrationType)).forEach(([k, v]) =>
  console.log('  ' + String(k).padEnd(3), (TYPE[k] || '?').padEnd(16), v, '次  ' + pct(v, orders.length) + '%'));

line('venue 分布（业务类型）');
sortE(by(orders, o => o.venue)).forEach(([k, v]) =>
  console.log('  ' + String(k).padEnd(4), (VENUE[k] || '?').padEnd(14), v, '次'));

line('migrationStatusDesc 分布（订单状态文案）');
sortE(by(orders, o => o.migrationStatusDesc)).forEach(([k, v]) => console.log('  ' + String(k).padEnd(22), v));

['migrationStatus', 'travelStatus', 'status', 'productNum', 'isMigrationTimes', 'isMigrationDays'].forEach(f => {
  console.log('\n  ' + f + ':', JSON.stringify(by(orders, o => o[f])));
});

/* ---------- 交叉表：搞清 status 与 type 的关系 ---------- */
function crosstab(title, rowF, colF) {
  line(title);
  const tab = {}, colsSet = {};
  orders.forEach(o => {
    const r = rowF(o), c = colF(o);
    (tab[r] = tab[r] || {})[c] = (tab[r][c] || 0) + 1;
    colsSet[c] = 1;
  });
  const cols = Object.keys(colsSet);
  console.log('  ' + 'type\\'.padEnd(18) + cols.map(c => String(c).padStart(8)).join(''));
  Object.keys(tab).forEach(r => {
    const label = (r + ' ' + (TYPE[r] || '')).padEnd(18);
    console.log('  ' + label + cols.map(c => String(tab[r][c] || 0).padStart(8)).join(''));
  });
}
crosstab('交叉表  migrationType × migrationStatusDesc', o => o.migrationType, o => o.migrationStatusDesc);
crosstab('交叉表  migrationType × travelStatus', o => o.migrationType, o => o.travelStatus);
crosstab('交叉表  migrationType × migrationStatus', o => o.migrationType, o => o.migrationStatus);

/* ---------- 名称编码问题 ---------- */
line('名称字段 URL 编码检测（解码前统计）');
NAME_FIELDS.forEach(k => {
  console.log('  ' + k.padEnd(18), '原始含%编码:', encCount[k], encCount[k] ? '→ decodeURIComponent 可还原（如 %e7%ba%a2%e7%8e%89%e6%b5%b7 = 红玉海）' : '');
});

line('大区 targetAreaName / areaName');
console.log('  目标大区:', JSON.stringify(by(orders, o => o.targetAreaName)));
console.log('  来源大区:', JSON.stringify(by(orders, o => o.areaName)));

/* ---------- 角色 ---------- */
line('角色分布');
sortE(by(orders, o => roleOf(o) || '(空)')).forEach(([k, v]) => console.log('  ' + String(k).padEnd(18), v, '次'));

/* ---------- 时间覆盖 ---------- */
line('时间覆盖');
const dated = orders.filter(o => o._d).sort((a, b) => a._d - b._d);
console.log('  范围:', dated[0] && dated[0].createTime, '→', dated[dated.length - 1] && dated[dated.length - 1].createTime);
const yearType = {};
orders.forEach(o => {
  const y = o._d ? o._d.getFullYear() : '无日期';
  (yearType[y] = yearType[y] || {})[o.migrationType] = (yearType[y][o.migrationType] || 0) + 1;
});
console.log('  年份 × 类型:');
Object.keys(yearType).sort().forEach(y => {
  const row = yearType[y];
  const tot = Object.values(row).reduce((a, b) => a + b, 0);
  const parts = Object.keys(row).sort().map(t => (TYPE[t] || t).replace('超域旅行·', '') + ':' + row[t]);
  console.log('    ' + String(y).padEnd(8), '共 ' + String(tot).padStart(4), '  ' + parts.join('  '));
});

/* ---------- 逐年「超域旅行」报告口径预演 ---------- */
function yearReport(year) {
  const list = orders.filter(o => o._d && o._d.getFullYear() === year);
  const out = list.filter(o => o.migrationType === 4);
  const back = list.filter(o => o.migrationType === 5);
  const migrate = list.filter(o => o.migrationType === 1);
  const dest = out.length ? out : list;
  const byServer = sortE(by(dest, o => o.targetGroupName || '(未知)'));
  const byDC = sortE(by(dest, o => o.targetAreaName || '(未知)'));
  const home = sortE(by(out.map(o => o.groupName).concat(back.map(o => o.targetGroupName)).filter(Boolean), x => x))[0];
  const byHour = new Array(24).fill(0); list.forEach(o => o._d && byHour[o._d.getHours()]++);
  const byMonth = new Array(12).fill(0); list.forEach(o => o._d && byMonth[o._d.getMonth()]++);
  const favHour = byHour.indexOf(Math.max(...byHour));
  const busyMonth = byMonth.indexOf(Math.max(...byMonth)) + 1;
  const days = Object.keys(by(list, o => o._d.toDateString())).length;
  const roles = sortE(by(list, o => roleOf(o) || '(空)'));
  return { year, total: list.length, out: out.length, back: back.length, migrate: migrate.length,
    home: home && home[0], topServer: byServer[0], servers: byServer.length, dcs: byDC.length,
    byDC, favHour, busyMonth, days, lateNight: byHour.slice(0, 6).reduce((a, b) => a + b, 0), roles };
}
line('逐年报告口径预演（仅含有日期的记录）');
[...new Set(orders.map(o => o._d && o._d.getFullYear()).filter(Boolean))].sort((a, b) => b - a).forEach(y => {
  const r = yearReport(y);
  console.log('\n  ◆ ' + y + ' 年');
  console.log('    总记录 ' + r.total + ' | 出发 ' + r.out + ' / 返回 ' + r.back + ' / 迁移 ' + r.migrate);
  console.log('    家服务器: ' + r.home + ' | 目的地 TOP: ' + (r.topServer ? r.topServer[0] + '×' + r.topServer[1] : '—'));
  console.log('    覆盖服务器 ' + r.servers + ' 个 / 大区 ' + r.dcs + ' 个 | 大区分布: ' + JSON.stringify(r.byDC));
  console.log('    活跃天数 ' + r.days + ' | 最忙月份 ' + r.busyMonth + '月 | 偏爱时刻 ' + r.favHour + '点 | 深夜(0-6) ' + r.lateNight);
  console.log('    角色: ' + r.roles.map(e => e[0] + '×' + e[1]).join(', '));
});

/* ---------- 超域旅行：停留时长 & 至今未归 ---------- */
line('超域旅行停留分析（仅成功的出发/返回，按时间顺序配对）');
const DAY = 86400000;
function fmtDur(ms) {
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return d + ' 天' + (h ? ' ' + h + ' 小时' : '');
  if (h > 0) return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  return m + ' 分';
}
const nowTs = (json.fetchedAt ? new Date(json.fetchedAt).getTime() : 0) || Math.max.apply(null, orders.filter(o => o._d).map(o => +o._d));
const datedTravel = orders.filter(o => (o.migrationType === 4 || o.migrationType === 5) && o._d).sort((a, b) => a._d - b._d);
// 按角色分组，各自配对（角色间可能交错）
const byRole = {};
datedTravel.forEach(o => { const r = roleOf(o) || '?'; (byRole[r] = byRole[r] || []).push(o); });
const trips = []; const ongoingList = [];
Object.keys(byRole).forEach(r => {
  const list = byRole[r];
  let away = null;
  list.filter(o => o.migrationStatus === 5).forEach(o => {
    if (o.migrationType === 4) {
      if (away) trips.push({ dest: away.dest, dc: away.dc, depart: away.depart, ret: null, role: r, kind: 'repat' });
      away = { depart: o._d, dest: o.targetGroupName, dc: o.targetAreaName };
    } else if (o.migrationType === 5 && away) {
      trips.push({ dest: away.dest, dc: away.dc, depart: away.depart, ret: o._d, role: r, kind: 'paired' });
      away = null;
    }
  });
  if (away) {
    const hasLater = list.some(o => +o._d > +away.depart); // 该角色出发后还有订单 → 已被遣返
    const t = { dest: away.dest, dc: away.dc, depart: away.depart, ret: null, role: r, kind: hasLater ? 'repat' : 'ongoing' };
    if (!hasLater) ongoingList.push(t);
    trips.push(t);
  }
});
const sev = datedTravel.filter(o => o.migrationStatus === 5);
let ongoing = ongoingList.sort((a, b) => (nowTs - a.depart) - (nowTs - b.depart))[ongoingList.length - 1] || null;
trips.forEach(t => { t.ms = t.kind === 'paired' ? (t.ret - t.depart) : t.kind === 'ongoing' ? (nowTs - t.depart) : DAY; });
const measurable = trips.filter(t => t.kind !== 'repat');
const longest = (measurable.length ? measurable : trips).slice().sort((a, b) => b.ms - a.ms)[0];
console.log('  成功事件 ' + sev.length + ' | 完整往返 ' + trips.filter(t => t.kind === 'paired').length +
  ' | 疑似自动遣返(缺返回) ' + trips.filter(t => t.kind === 'repat').length + ' | 进行中 ' + (ongoing ? 1 : 0));
console.log('  统计时刻(fetchedAt): ' + json.fetchedAt);
if (longest) console.log('  ★ 最久停留: ' + fmtDur(longest.ms) + '  @ ' + longest.dc + '/' + longest.dest +
  '  (' + longest.kind + ', 角色 ' + longest.role + ', 出发 ' + longest.depart.toLocaleString() + ')');
console.log('  TOP5 停留:');
trips.slice().sort((a, b) => b.ms - a.ms).slice(0, 5).forEach(t =>
  console.log('    ' + fmtDur(t.ms).padEnd(14) + (t.dc + '/' + t.dest).padEnd(18) + t.kind.padEnd(9) + '出发 ' + t.depart.toLocaleString()));
if (ongoing) console.log('  ⚑ 至今未归: 角色「' + ongoing.role + '」于 ' + (ongoing.depart.getMonth() + 1) + ' 月 ' +
  ongoing.depart.getDate() + ' 日 传送至 ' + ongoing.dc + ' 区（' + ongoing.dest + '），至今未归，已 ' + fmtDur(ongoing.ms));

/* ---------- 数据质量小结 ---------- */
line('数据质量提示');
const flags = [];
const nullDC = orders.filter(o => !o.targetAreaName).length;
if (nullDC) flags.push('有 ' + nullDC + ' 条 targetAreaName 为空（多为非超域旅行记录，如改名/特殊）');
const noDate = orders.filter(o => !o._d).length;
if (noDate) flags.push('有 ' + noDate + ' 条无法解析 createTime');
const ids = by(orders, o => o.orderId);
const dup = Object.entries(ids).filter(([k, v]) => v > 1);
if (dup.length) flags.push('有重复 orderId: ' + dup.length + ' 个');
const outN = orders.filter(o => o.migrationType === 4).length;
const backN = orders.filter(o => o.migrationType === 5).length;
flags.push('出发(4)=' + outN + ' / 返回(5)=' + backN + ' → ' + (outN >= backN ? '出发≥返回，符合「有去未必有回」' : '返回>出发，可能跨年或数据起点截断'));
flags.forEach(f => console.log('  • ' + f));

console.log('\n完成。');
