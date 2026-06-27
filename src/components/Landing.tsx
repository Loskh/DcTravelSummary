import { useRef, useState } from 'react';
import { BM_DOWNLOAD, bmPostMessage } from '../lib/bookmarklets';

interface Props {
  onImport: (text: string) => void;
  error: string;
}

export function Landing({ onImport, error }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState('');

  // 直达书签按「当前所在域名」动态生成，兼容任意镜像站
  const reportUrl = window.location.origin + window.location.pathname;
  const reportHost = window.location.host + window.location.pathname;
  const bmPost = bmPostMessage(reportUrl);

  function readFile(f: File | undefined | null) {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => onImport(String(rd.result ?? ''));
    rd.onerror = () => onImport('');
    rd.readAsText(f);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    readFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    readFile(e.dataTransfer.files?.[0]);
  }

  function copy(text: string, label: string) {
    const done = () => {
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => setCopied('复制失败，请手动选择'));
    } else {
      done();
    }
  }

  return (
    <section className="landing" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="landing-inner">
        <p className="eyebrow">FINAL FANTASY XIV · 国服超域旅行</p>
        <h1 className="landing-title">
          超域旅行
          <br />
          年度总结
        </h1>

        <div className="landing-actions">
          <button className="btn primary" onClick={() => fileRef.current?.click()}>
            选择 JSON 文件
          </button>
        </div>
        <input
          ref={fileRef}
          className="vh"
          type="file"
          accept="application/json,.json"
          onChange={onFile}
        />

        {error && <p className="landing-err">{error}</p>}
        <p className="landing-hint">
          也可以把 <code>.json</code> 文件拖到页面任意位置。数据只在你本地浏览器处理，不会上传。
        </p>

        <details className="howto">
          <summary>怎么拿到我的数据？</summary>

          <p className="method-h">方式一 · 纯本地（推荐）</p>
          <ol className="steps">
            <li>
              用浏览器登录<b>国服 FF14 官网</b>（超域旅行 / 订单查询页）。
            </li>
            <li>
              把下面代码新建成<b>书签</b>后点击；或按 <kbd>F12</kbd> 打开控制台粘贴回车。
            </li>
            <li>
              它会翻完所有分页并下载 <code>dc-travel-orders-*.json</code>。
            </li>
            <li>回到本页点「选择 JSON 文件」选它即可。</li>
          </ol>
          <div className="code-row">
            <textarea className="bm-box" readOnly spellCheck={false} rows={3} value={BM_DOWNLOAD} />
            <button className="btn small" onClick={() => copy(BM_DOWNLOAD, '下载书签')}>
              复制下载书签
            </button>
          </div>

          <p className="method-h">方式二 · 一键直达</p>
          <ol className="steps">
            <li>把下面的<b>直达书签</b>加到浏览器书签栏。</li>
            <li>
              在已登录的<b>国服 FF14 官网</b>点该书签，并<b>允许弹窗</b>。
            </li>
            <li>
              它会自动打开报告页 <code>{reportHost}</code>，并通过{' '}
              <code>postMessage</code> 把数据传过来，无需下载、上传。
            </li>
          </ol>
          <div className="code-row">
            <textarea className="bm-box" readOnly spellCheck={false} rows={3} value={bmPost} />
            <button className="btn small" onClick={() => copy(bmPost, '直达书签')}>
              复制直达书签
            </button>
          </div>

          {copied && <p className="tip">已复制{copied}代码</p>}
        </details>
      </div>
    </section>
  );
}
