import '../ncm-art.css';
import { NCM_HTML } from '../lib/ncmArtHtml';

/**
 * 网易云年度报告各分镜插画动画的通用承载组件。
 * DOM 复刻自原报告（见 src/lib/ncmArtHtml.ts），样式与精灵图见 ../ncm-art.css，
 * 均已按页重新作用域到 .ncm-s<page> 并本地化资源。
 */
export function NcmArt({ page }: { page: number | string }) {
  const html = NCM_HTML[String(page)];
  if (!html) return null;
  return (
    <div className={`ncm-art ncm-s${page}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
