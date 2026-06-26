# 超域旅行 · 年度总结

把《最终幻想 XIV》国服角色的「超域旅行」订单做成网易云风格的年度总结。纯前端，数据只在本地浏览器处理，不上传任何服务器。

技术栈：React + TypeScript + Vite。

## 目录结构

```
.
├─ index.html              # Vite 入口（挂载 React）
├─ src/
│  ├─ main.tsx             # React 渲染入口
│  ├─ App.tsx              # 顶层状态：数据 / 错误 / postMessage 接收
│  ├─ index.css            # 全局样式（网易云风格主题）
│  ├─ components/
│  │  ├─ Landing.tsx       # 首页：选择 JSON / 拖拽 / 示例 / 书签说明
│  │  └─ Report.tsx        # 报告各场景与滚动动画
│  └─ lib/
│     ├─ types.ts          # 数据结构类型
│     ├─ config.ts         # 部署地址、可信来源等配置
│     ├─ bookmarklets.ts   # 应用内展示用的压缩版书签
│     ├─ parse.ts          # 原始数据解析与容错
│     ├─ stats.ts          # 统计与停留分析（analyzeStays / computeStats）
│     ├─ format.ts         # 日期 / 文案 / 图表格式化
│     └─ demo.ts           # 示例数据
├─ tools/                  # 配套脚本（不参与应用构建）
│  ├─ bookmarklet-download.js     # 可读源码：抓取并下载 JSON
│  ├─ bookmarklet-postmessage.js  # 可读源码：抓取并直传报告页
│  └─ verify.js            # 数据自查脚本（独立逻辑，便于交叉验证）
└─ example/                # 本地数据样本（已 gitignore，不入库）
```

## 开发

```bash
npm install
npm run dev        # 本地开发（不会自动打开浏览器）
npm run build      # 产出 dist/
npm run preview    # 预览构建结果
npm run typecheck  # 仅类型检查
```

## 获取数据并生成报告

订单接口需要登录态且不允许跨域携带凭证，所以数据只能在国服 FF14 官网自身页面抓取。两种方式任选其一：

1. 本地导入（推荐）
   - 登录国服 FF14 官网，运行 `tools/bookmarklet-download.js`（书签或控制台），会下载一个 `dc-travel-orders-*.json`。
   - 打开报告页，点「选择 JSON 文件」导入即可。

2. 一键直达（postMessage）
   - 先把报告页部署好（见下），把 `tools/bookmarklet-postmessage.js` 与 `src/lib/config.ts` 里的地址改成你的部署地址。
   - 登录官网后点该书签：自动打开报告页并把数据传过去，无需手动下载/上传。
   - 报告页只接受来自 `CONFIG.ALLOWED_SENDER_ORIGINS` 的消息。

## 部署

构建后把 `dist/` 部署到任意静态托管（如 GitHub Pages）。若用方式 2，记得同步修改：

- `src/lib/config.ts` 的 `REPORT_URL`
- `tools/bookmarklet-postmessage.js` 的 `REPORT`

## 数据验证

```bash
node tools/verify.js [path-to-json]   # 在项目根目录运行
```

不传参数时默认读取 `example/` 下最新的 `dc-travel-orders-*.json`，用于核对字段语义与统计口径。

## 隐私

`example/` 已加入 `.gitignore`，个人订单数据不会被提交。所有解析与统计均在浏览器本地完成。
