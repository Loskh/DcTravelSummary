import { cloneElement, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { Stats } from '../lib/types';
import { dcColor, donutStops, fmtDur, fmtFull, fmtYMD, describe } from '../lib/format';

type CSSVars = CSSProperties & Record<string, string | number>;
const reveal = (i: number): CSSVars => ({ '--i': i });

// 网易云式：每屏一整块鲜艳背景，逐屏切换
const SCENE_BG = [
  'linear-gradient(165deg, #3b2f63 0%, #211b3e 60%, #14112b 100%)', // 封面 · 深夜紫
  'linear-gradient(160deg, #ff6a88 0%, #e0244f 100%)', // 玫红
  'linear-gradient(160deg, #3a47d5 0%, #00b4d8 100%)', // 蓝青
  'linear-gradient(160deg, #8e2de2 0%, #d6336c 100%)', // 紫红
  'linear-gradient(160deg, #0f9b8e 0%, #34d17a 100%)', // 青绿
  'linear-gradient(160deg, #f7971e 0%, #ffce3a 100%)', // 橙金
  'linear-gradient(160deg, #ee5a6f 0%, #f29263 100%)', // 珊瑚
  'linear-gradient(160deg, #2b86c5 0%, #784ba0 60%, #ff3cac 100%)', // 蓝紫粉
  'linear-gradient(160deg, #11998e 0%, #38ef7d 100%)' // 翠
];

function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count) || 0;
  const dur = Number(el.dataset.dur) || 1100;
  const t0 = performance.now();
  function tick(now: number) {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * e));
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

/* ============================ 场景 ============================ */

function SceneCover(s: Stats): ReactElement {
  const range = s.firstDepart && s.lastEvent ? `${fmtYMD(s.firstDepart)} — ${fmtYMD(s.lastEvent)}` : '';
  return (
    <section className="scene cover" key="cover">
      <div className="wrap">
        <p className="eyebrow reveal" style={reveal(0)}>FINAL FANTASY XIV · 超域旅行</p>
        <h1 className="cover-title reveal" style={reveal(1)}>超域旅行<br />年度报告</h1>
        <p className="cover-sub reveal" style={reveal(2)}>{s.roleName}</p>
        <p className="cover-range reveal" style={reveal(3)}>{range}</p>
        <p className="scroll-hint reveal" style={reveal(4)}>向下滑动，开启回顾 ▾</p>
      </div>
    </section>
  );
}

function SceneTotal(s: Stats): ReactElement {
  return (
    <section className="scene" key="total">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>这段时间，你成功踏上了</p>
        <p className="bignum reveal" style={reveal(1)}>
          <b data-count={s.successDepart} data-dur={1500}>0</b>
          <span className="unit">次超域旅行</span>
        </p>
        <p className="muted reveal" style={reveal(2)}>
          {s.failDepart > 0 ? (
            <>另有 <b style={{ color: 'var(--hi)', fontWeight: 800 }}>{s.failDepart}</b> 次倒在预检门口 · 横跨 {s.activeDays} 天</>
          ) : (
            <>横跨 {s.activeDays} 个旅行的日子</>
          )}
        </p>
      </div>
    </section>
  );
}

function SceneOutBack(s: Stats): ReactElement {
  const sum = s.successDepart + s.backOK || 1;
  const pct = Math.round((s.successDepart / sum) * 100);
  return (
    <section className="scene" key="outback">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你 <b data-count={s.successDepart}>0</b> 次启程远行</p>
        <p className="lead reveal" style={reveal(1)}>又 <b data-count={s.backOK}>0</b> 次平安回到「{s.homeServer}」</p>
        <div className="ratiobar reveal" style={reveal(2)}><i data-grow={pct} /></div>
        <p className="muted reveal" style={reveal(3)}>{s.ongoing ? '此刻还有一段旅程仍在继续……' : '有去有回，是旅人的浪漫'}</p>
      </div>
    </section>
  );
}

function SceneTopServer(s: Stats): ReactElement | null {
  if (!s.byServer.length) return null;
  const top = s.byServer[0];
  const maxC = top[1] || 1;
  const pctTop = s.successDepart ? Math.round((top[1] / s.successDepart) * 100) : 0;
  return (
    <section className="scene" key="topserver">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你最常造访的服务器是</p>
        <h2 className="hl reveal" style={reveal(1)}>{top[0]}</h2>
        <p className="muted reveal" style={reveal(2)}>成功抵达 {top[1]} 次，约占全部行程的 {pctTop}%</p>
        <ul className="rank reveal" style={reveal(3)}>
          {s.byServer.slice(0, 8).map((e, i) => {
            const w = Math.round((e[1] / maxC) * 100);
            return (
              <li key={e[0]}>
                <span className="rk">{i + 1}</span>
                <span className="nm">
                  {e[0]}
                  <span className="bar"><i style={reveal(i)} data-grow={w} /></span>
                </span>
                <span className="ct"><b>{e[1]}</b> 次</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SceneDonut(s: Stats): ReactElement | null {
  if (!s.byDC.length) return null;
  const entries = s.byDC.slice(0, 6);
  const total = entries.reduce((a, e) => a + e[1], 0) || 1;
  return (
    <section className="scene" key="donut">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你的旅行版图</p>
        <div className="donutwrap reveal" style={reveal(1)}>
          <div className="donut" style={{ '--stops': donutStops(entries) } as CSSVars} />
          <div className="legend">
            {entries.map((e, i) => (
              <div className="row" key={e[0]}>
                <span className="sw" style={{ background: dcColor(e[0], i) }} />
                {e[0]}
                <span className="lc">{e[1]} 次 · {Math.round((e[1] / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <p className="muted reveal" style={reveal(2)}>足迹覆盖 {s.uniqueDCs} 个大区</p>
      </div>
    </section>
  );
}

function SceneFootprint(s: Stats): ReactElement {
  return (
    <section className="scene" key="footprint">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你的足迹，成功抵达过</p>
        <p className="bignum reveal" style={reveal(1)}>
          <b data-count={s.uniqueServers}>0</b>
          <span className="unit">个服务器</span>
        </p>
        <div className="chips reveal" style={reveal(2)}>
          {s.byServer.slice(0, 12).map((e) => (
            <span className="tagchip" key={e[0]}>{e[0]}<b>{e[1]}</b></span>
          ))}
        </div>
        {s.failDepart > 0 && <p className="muted reveal" style={reveal(3)}>另有 {s.failDepart} 次预检失败，未能成行</p>}
      </div>
    </section>
  );
}

function SceneHours(s: Stats): ReactElement {
  const maxH = Math.max(...s.byHour) || 1;
  return (
    <section className="scene" key="hours">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你最爱在</p>
        <p className="bignum reveal" style={reveal(1)}>
          <b data-count={s.favHour}>0</b>
          <span className="unit">点 出发</span>
        </p>
        <div className="bars reveal" style={reveal(2)}>
          {s.byHour.map((v, h) => {
            const w = Math.round((v / maxH) * 100);
            const peak = h === s.favHour && v > 0 ? ' peak' : '';
            const show = h % 6 === 0 || h === 23 ? ' show' : '';
            return (
              <div className={'col' + peak} style={reveal(h)} key={h}>
                <i data-grow={w} data-axis="h" />
                <span className={'lab' + show}>{h}</span>
              </div>
            );
          })}
        </div>
        <p className="muted reveal" style={reveal(3)}>
          {s.lateNight > 0 ? (
            <>其中 <b style={{ color: 'var(--hi)', fontWeight: 800 }}>{s.lateNight}</b> 次在深夜与凌晨（0–6 点）启程</>
          ) : (
            <>你几乎总在白天出门</>
          )}
        </p>
      </div>
    </section>
  );
}

function SceneMonths(s: Stats): ReactElement {
  const maxM = Math.max(...s.byMonth) || 1;
  return (
    <section className="scene" key="months">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>
          <b style={{ color: 'var(--hi)', fontWeight: 800 }}>{s.busyMonth} 月</b>，是你最爱出门的月份
        </p>
        <div className="bars reveal" style={reveal(1)}>
          {s.byMonth.map((v, m) => {
            const w = Math.round((v / maxM) * 100);
            const peak = m + 1 === s.busyMonth && v > 0 ? ' peak' : '';
            return (
              <div className={'col' + peak} style={reveal(m)} key={m}>
                <i data-grow={w} data-axis="h" />
                <span className="lab show">{m + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="muted reveal" style={reveal(2)}>那个月你出发了 {s.busyMonthCount} 次</p>
      </div>
    </section>
  );
}

function SceneLongest(s: Stats): ReactElement | null {
  const t = s.longest;
  if (!t) return null;
  const place = `在 ${t.dc} 区「${t.dest}」`;
  return (
    <section className="scene" key="longest">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>你在远方住得最久的一次，是</p>
        <h2 className="hl reveal" style={reveal(1)}>{fmtDur(t.ms)}</h2>
        <p className="muted reveal" style={reveal(2)}>{t.kind === 'ongoing' ? place + '，至今仍未归' : place + '，一次长长的旅居'}</p>
      </div>
    </section>
  );
}

function SceneRepat(s: Stats): ReactElement | null {
  if (!s.repatCount) return null;
  return (
    <section className="scene" key="repat">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>没有本地户口的你</p>
        <p className="bignum reveal" style={reveal(1)}>
          <b data-count={s.repatCount}>0</b>
          <span className="unit">次被遣返</span>
        </p>
        <p className="muted reveal" style={reveal(2)}>离线超过一天，就被悄悄送回了「{s.homeServer}」</p>
      </div>
    </section>
  );
}

function SceneOngoing(s: Stats): ReactElement | null {
  const t = s.ongoing;
  if (!t) return null;
  return (
    <section className="scene ongoing" key="ongoing">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>而此刻……</p>
        <p className="lead big reveal" style={reveal(1)}>
          你的角色「<b style={{ color: 'var(--hi)', fontWeight: 800 }}>{t.role || s.roleName}</b>」
        </p>
        <p className="lead big reveal" style={reveal(2)}>
          于 {t.depart.getMonth() + 1} 月 {t.depart.getDate()} 日 传送至{' '}
          <b style={{ color: 'var(--hi)', fontWeight: 800 }}>{t.dc}</b> 区（{t.dest}）
        </p>
        <p className="awol reveal" style={reveal(3)}>至今未归</p>
        <p className="muted reveal" style={reveal(4)}>已离家 {fmtDur(t.ms)}</p>
        {s.ongoingList.length > 1 && (
          <p className="muted reveal" style={reveal(5)}>还有 {s.ongoingList.length - 1} 位角色，也在远方漂泊</p>
        )}
      </div>
    </section>
  );
}

function SceneFirstLast(s: Stats): ReactElement {
  return (
    <section className="scene" key="firstlast">
      <div className="wrap">
        <p className="lead reveal" style={reveal(0)}>每段旅程，都有起点与此刻</p>
        <div className="cards2 reveal" style={reveal(1)}>
          <div className="ev">
            <p className="tag">第一次出发</p>
            <p className="ev-date">{fmtFull(s.firstDepart)}</p>
            <p className="ev-desc">{describe(s.firstDepart)}</p>
          </div>
          <div className="ev">
            <p className="tag">最近一次</p>
            <p className="ev-date">{fmtFull(s.lastEvent)}</p>
            <p className="ev-desc">{describe(s.lastEvent)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SceneFinale(s: Stats, onRestart: () => void): ReactElement {
  const top = s.byServer[0] || (['—', 0] as [string, number]);
  const rows: [string, string][] = [
    ['成功旅行', s.successDepart + ' 次'],
    ['平安归家', s.backOK + ' 次'],
    ['被遣返', s.repatCount + ' 次'],
    ['最常造访', String(top[0])],
    ['覆盖服务器', s.uniqueServers + ' 个'],
    ['最久停留', s.longest ? fmtDur(s.longest.ms) : '—']
  ];
  if (s.ongoing) rows.push(['至今未归', s.ongoing.dest]);
  return (
    <section className="scene finale" key="finale">
      <div className="wrap">
        <div className="card reveal" style={reveal(0)}>
          <p className="card-title">超域旅行 · 年度报告</p>
          <p className="card-name">{s.roleName}</p>
          <ul className="card-stats">
            {rows.map((r) => (
              <li key={r[0]}>
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </li>
            ))}
          </ul>
          <p className="card-foot">DC TRAVEL WRAPPED</p>
        </div>
        <button className="btn ghost reveal" style={reveal(1)} onClick={onRestart}>再看一次 ↻</button>
      </div>
    </section>
  );
}

function buildScenes(s: Stats, onRestart: () => void): ReactElement[] {
  return [
    SceneCover(s),
    SceneTotal(s),
    SceneOutBack(s),
    SceneTopServer(s),
    SceneDonut(s),
    SceneFootprint(s),
    SceneHours(s),
    SceneMonths(s),
    SceneLongest(s),
    SceneRepat(s),
    SceneOngoing(s),
    SceneFirstLast(s),
    SceneFinale(s, onRestart)
  ].filter((x): x is ReactElement => x !== null);
}

/* ============================ 容器 ============================ */

interface Props {
  stats: Stats;
  onRestart: () => void;
}

export function Report({ stats, onRestart }: Props) {
  const deckRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  const scenes = useMemo(
    () =>
      buildScenes(stats, onRestart).map((el, i) =>
        cloneElement(el, {
          style: { ...(el.props.style || {}), background: SCENE_BG[i % SCENE_BG.length] }
        })
      ),
    [stats, onRestart]
  );

  useEffect(() => {
    const deck = deckRef.current;
    const dots = dotsRef.current;
    if (!deck || !dots) return;

    const sceneEls = Array.from(deck.querySelectorAll<HTMLElement>('.scene'));
    sceneEls.forEach((sc, i) => (sc.dataset.idx = String(i)));
    const dotEls = Array.from(dots.querySelectorAll<HTMLButtonElement>('button'));

    const setDot = (i: number) => dotEls.forEach((b, k) => b.classList.toggle('on', k === i));
    const activate = (sc: HTMLElement) => {
      sc.classList.add('active');
      if ((sc as any)._done) return;
      (sc as any)._done = true;
      sc.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
      sc.querySelectorAll<HTMLElement>('[data-grow]').forEach((el) => {
        const v = (el.dataset.grow || '0') + '%';
        if (el.dataset.axis === 'h') el.style.height = v;
        else el.style.width = v;
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && en.intersectionRatio >= 0.5) {
            activate(en.target as HTMLElement);
            setDot(Number((en.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root: deck, threshold: [0.5, 0.75] }
    );
    sceneEls.forEach((sc) => io.observe(sc));

    deck.scrollTop = 0;
    if (sceneEls[0]) activate(sceneEls[0]);
    setDot(0);

    const onKey = (e: KeyboardEvent) => {
      let cur = dotEls.findIndex((b) => b.classList.contains('on'));
      if (cur < 0) cur = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        if (cur < sceneEls.length - 1) {
          e.preventDefault();
          sceneEls[cur + 1].scrollIntoView({ behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        if (cur > 0) {
          e.preventDefault();
          sceneEls[cur - 1].scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      io.disconnect();
      document.removeEventListener('keydown', onKey);
    };
  }, [scenes]);

  const go = (i: number) => {
    const el = deckRef.current?.querySelectorAll<HTMLElement>('.scene')[i];
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className="topbar">
        <button className="chip" onClick={onRestart} title="返回首页">⌂ 返回</button>
        <div className="spacer" />
        <span className="brand">DC&nbsp;Travel&nbsp;Wrapped</span>
      </header>
      <main className="deck" ref={deckRef}>
        {scenes}
      </main>
      <nav className="dots" ref={dotsRef} aria-label="章节导航">
        {scenes.map((_, i) => (
          <button key={i} onClick={() => go(i)} aria-label={`第 ${i + 1} 屏`} />
        ))}
      </nav>
    </>
  );
}
