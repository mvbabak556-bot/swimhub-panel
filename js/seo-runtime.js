/* Estakhrjo SEO Runtime — one central, dependency-free metadata layer.
 * It never paints UI or fetches data. Public entity pages provide their own
 * server-rendered profile metadata; this layer supplies safe page-level SEO
 * defaults, canonical normalization, breadcrumbs and machine-readable WebPage
 * data for the static catalogue routes.
 */
(function () {
  'use strict';
  const ORIGIN = 'https://estakhrjo.ir';
  const esc = v => String(v == null ? '' : v);
  const PAGE = {
    index: ['خانه — بزرگ‌ترین اکوسیستم شنای ایران', 'استخر جو | ESTAKHRJO'],
    pools: ['استخرها | استخر جو', 'فهرست استخرها و مجموعه‌های آبی ایران در استخر جو.'],
    coaches: ['مربیان شنا | استخر جو', 'پروفایل مربیان شنا، آموزش و هیدروتراپی در استخر جو.'],
    courses: ['دوره‌های آموزشی شنا | استخر جو', 'دوره‌های آموزش شنا و مهارت‌های آبی در استخر جو.'],
    hydro: ['هیدروتراپی و آب‌درمانی | استخر جو', 'متخصصان و خدمات آب‌درمانی در استخر جو.'],
    events: ['رویدادهای شنا | استخر جو', 'مسابقات و رویدادهای جامعهٔ شنای ایران.'],
    market: ['فروشگاه تجهیزات شنا | استخر جو', 'تجهیزات و محصولات شنا در بازار استخر جو.'],
    suppliers: ['تأمین‌کنندگان B2B | استخر جو', 'شبکهٔ تأمین‌کنندگان تخصصی استخر و شنا.'],
    jobs: ['فرصت‌های شغلی شنا | استخر جو', 'فرصت‌های شغلی مربیگری و مجموعه‌های آبی.'],
    articles: ['مجلهٔ شنا | استخر جو', 'مقالات آموزشی و تخصصی شنا و آب‌درمانی.'],
    nearby: ['نزدیک من | استخر جو', 'پیدا کردن استخرها و خدمات شنا در نزدیکی شما.']
  };
  const labels = { index: 'خانه', pools: 'استخرها', coaches: 'مربیان', courses: 'دوره‌ها', hydro: 'هیدروتراپی', events: 'رویدادها', market: 'فروشگاه', suppliers: 'تأمین‌کنندگان', jobs: 'استخدام', articles: 'مجله', nearby: 'نزدیک من' };
  function pageKey() { return document.body?.dataset.page || (location.pathname === '/' ? 'index' : ''); }
  function canonical() {
    const path = location.pathname.replace(/\/index\.html?$/, '/').replace(/\/+/g, '/');
    return ORIGIN + (path === '/' ? '/' : path);
  }
  function meta(name, content, property) {
    const attr = property ? 'property' : 'name';
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    if (content) el.setAttribute('content', content);
  }
  function link(rel, href) {
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
    el.href = href;
  }
  function jsonld(value) {
    if (document.head.querySelector('script[data-seo-runtime-jsonld], script[data-pp-jsonld]')) return;
    const el = document.createElement('script'); el.type = 'application/ld+json'; el.dataset.seoRuntimeJsonld = '1'; el.textContent = JSON.stringify(value); document.head.appendChild(el);
  }
  function run() {
    const key = pageKey(); const spec = PAGE[key]; if (!spec) return;
    const url = canonical(); const title = document.title && !/^استخر جو \| ESTAKHRJO$/i.test(document.title) ? document.title : spec[0];
    const description = document.querySelector('meta[name="description"]')?.content || spec[1];
    link('canonical', url); meta('description', description); meta('og:title', title, true); meta('og:description', description, true); meta('og:url', url, true); meta('og:type', 'website', true); meta('twitter:card', 'summary_large_image');
    if (document.title !== title) document.title = title;
    const crumbs = [{ '@type': 'ListItem', position: 1, name: 'استخر جو', item: ORIGIN + '/' }];
    if (key !== 'index') crumbs.push({ '@type': 'ListItem', position: 2, name: labels[key] || title, item: url });
    jsonld({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': ORIGIN + '/#organization', name: 'استخر جو | ESTAKHRJO', url: ORIGIN + '/' },
      { '@type': 'WebSite', '@id': ORIGIN + '/#website', name: 'استخر جو | ESTAKHRJO', url: ORIGIN + '/', potentialAction: { '@type': 'SearchAction', target: ORIGIN + '/pools.html?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description, isPartOf: { '@id': ORIGIN + '/#website' } },
      { '@type': 'BreadcrumbList', itemListElement: crumbs }
    ] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
})();
