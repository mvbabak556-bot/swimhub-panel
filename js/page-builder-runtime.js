/* Estakhrjo published Page Builder renderer.
   It renders only a server-validated published schema and never executes custom
   JavaScript/HTML from builder data. */
(function () {
  'use strict';
  const GENERATED = '[data-sh-builder-block]';
  const STYLE_KEYS = new Set(['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'padding', 'margin', 'color', 'background', 'backgroundImage', 'border', 'borderRadius', 'boxShadow', 'textAlign', 'justifyContent', 'alignItems', 'alignContent', 'gap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumnGap', 'gridRowGap', 'flexDirection', 'flexWrap', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textShadow', 'objectFit', 'opacity', 'display', 'position', 'zIndex']);
  const POSITION = new Set(['beforebegin', 'afterbegin', 'beforeend', 'afterend']);
  let schema = null;
  let ready = false;
  let editorMode = false;
  let editorParentOrigin = 'https://admine.estakhrjo.ir';
  const editorOriginAllowed = origin => origin === location.origin || origin === 'https://admine.estakhrjo.ir' || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);

  const text = (value, limit) => String(value == null ? '' : value).slice(0, limit || 4000);
  const pageName = () => String(document.body?.dataset?.page || 'index');
  const pageSchema = () => schema && schema.pages && typeof schema.pages === 'object' ? schema.pages[pageName()] : null;
  const device = () => window.innerWidth <= 640 ? 'mobile' : (window.innerWidth <= 1024 ? 'tablet' : 'desktop');
  const validSelector = value => typeof value === 'string' && value.length <= 240 && !/[{};]/.test(value);
  const safeHref = value => {
    const raw = text(value, 2000).trim();
    if (!raw) return '';
    if (/^(?:https?:|mailto:|tel:|\/|\.\/|\.\.\/|[a-z-]+\.html(?:[?#].*)?$)/i.test(raw)) return raw;
    return '';
  };
  const safeImage = value => {
    const raw = text(value, 320000).trim();
    return /^(?:data:image\/webp;base64,[a-z0-9+/=\s]+|https:\/\/[^\s]+\.webp(?:[?#][^\s]*)?|(?:\.{0,2}\/)?assets\/[^\s]+\.webp(?:[?#][^\s]*)?)$/i.test(raw) ? raw : '';
  };
  const element = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const styleFor = block => {
    const styles = block && block.responsive && typeof block.responsive === 'object' ? block.responsive : {};
    const out = { ...(block?.style && typeof block.style === 'object' ? block.style : {}) };
    Object.assign(out, styles.desktop || {});
    if (device() === 'tablet' || device() === 'mobile') Object.assign(out, styles.tablet || {});
    if (device() === 'mobile') Object.assign(out, styles.mobile || {});
    return out;
  };
  const applyStyle = (el, data) => {
    if (!data || typeof data !== 'object') return;
    Object.entries(data).forEach(([key, value]) => {
      if (!STYLE_KEYS.has(key) || typeof value !== 'string' || value.length > 100) return;
      try { el.style[key] = value; } catch (_) {}
    });
  };
  const applyAnimation = (el, block) => {
    const animation = block && block.animation;
    if (!animation || typeof animation !== 'object' || animation.enabled !== true) return;
    const name = ['fade', 'fade-up', 'fade-down', 'slide', 'zoom', 'bounce', 'rotate'].includes(animation.entrance) ? animation.entrance : 'fade-up';
    el.classList.add('shb-animate', `shb-animate-${name}`);
    el.style.setProperty('--shb-duration', `${Math.max(100, Math.min(5000, Number(animation.duration) || 650))}ms`);
    el.style.setProperty('--shb-delay', `${Math.max(0, Math.min(5000, Number(animation.delay) || 0))}ms`);
    if (animation.hover && ['scale', 'lift', 'glow', 'rotate'].includes(animation.hover)) el.classList.add(`shb-hover-${animation.hover}`);
  };
  const applyA11y = (el, block) => {
    const a11y = block && block.accessibility;
    if (!a11y || typeof a11y !== 'object') return;
    if (a11y.label) el.setAttribute('aria-label', text(a11y.label, 180));
    if (a11y.role && /^[a-z-]{2,32}$/.test(a11y.role)) el.setAttribute('role', a11y.role);
  };

  function renderBlock(block) {
    if (!block || typeof block !== 'object' || block.hidden === true || (block.visibility && block.visibility[device()] === false)) return null;
    const type = text(block.type, 40);
    const content = block.content && typeof block.content === 'object' ? block.content : {};
    const id = /^[a-z0-9_-]{6,80}$/i.test(String(block.id || '')) ? String(block.id) : '';
    let root;
    if (['section', 'container', 'row', 'column', 'flex'].includes(type)) {
      root = element('section', `shb-block shb-layout shb-layout-${type}`);
      root.append(element('h3', '', text(content.title || 'بخش جدید', 180)), element('p', '', text(content.body || '', 800)));
    } else if (type === 'banner') {
      root = element('section', 'shb-block shb-banner');
      const media = safeImage(content.image); if (media) root.style.backgroundImage = `linear-gradient(105deg,rgba(4,17,34,.86),rgba(4,17,34,.3)),url("${media.replace(/"/g, '%22')}")`;
      const kicker = element('span', 'shb-kicker', text(content.kicker || 'ESTAKHRJO', 80));
      const title = element('h2', '', text(content.title || 'عنوان بنر شما', 180));
      const body = element('p', '', text(content.body || 'متن معرفی بنر را از پنل مدیریت ویرایش کنید.', 500));
      root.append(kicker, title, body);
      if (content.button) { const a = element('a', 'shb-button', text(content.button, 80)); const href = safeHref(content.link); if (href) a.href = href; root.appendChild(a); }
    } else if (type === 'heading') {
      const level = [2, 3, 4].includes(Number(content.level)) ? Number(content.level) : 2;
      root = element(`h${level}`, 'shb-block shb-heading', text(content.text || 'عنوان جدید', 280));
    } else if (type === 'text') {
      root = element('p', 'shb-block shb-text', text(content.text || 'متن جدید', 3000));
    } else if (type === 'icon') {
      root = element('span', 'shb-block shb-icon');
      const iconName = text(content.icon || 'spark', 40).replace(/[^a-z0-9_-]/gi, ''); const iconLabel = text(content.label || '', 180);
      if (window.ESTAKHRJO_ICONS?.create) root.appendChild(window.ESTAKHRJO_ICONS.create(iconName, iconLabel)); else root.textContent = '✦';
    } else if (type === 'image') {
      root = element('figure', 'shb-block shb-image');
      const image = element('img'); const src = safeImage(content.image); image.src = src || 'assets/panel-hero.webp'; image.alt = text(content.alt || '', 180); image.loading = 'lazy'; root.appendChild(image);
      if (content.caption) root.appendChild(element('figcaption', '', text(content.caption, 240)));
    } else if (type === 'button') {
      root = element('a', 'shb-block shb-button shb-button-standalone', text(content.text || 'دکمه', 80));
      const href = safeHref(content.link); if (href) root.href = href; else root.href = '#';
    } else if (type === 'card') {
      root = element('article', 'shb-block shb-card');
      if (content.icon) root.appendChild(element('span', 'shb-card-icon', text(content.icon, 16)));
      root.append(element('h3', '', text(content.title || 'عنوان کارت', 180)), element('p', '', text(content.body || 'توضیح کوتاه کارت', 600)));
      if (content.link && content.button) { const a = element('a', 'shb-text-link', text(content.button, 80)); a.href = safeHref(content.link) || '#'; root.appendChild(a); }
    } else if (type === 'grid') {
      root = element('section', 'shb-block shb-grid');
      const items = Array.isArray(content.items) ? content.items.slice(0, 8) : [];
      (items.length ? items : [{ title: 'کارت اول', body: 'توضیح' }, { title: 'کارت دوم', body: 'توضیح' }, { title: 'کارت سوم', body: 'توضیح' }]).forEach(item => {
        const card = element('article', 'shb-grid-card'); card.append(element('h3', '', text(item.title || 'کارت', 160)), element('p', '', text(item.body || '', 500))); root.appendChild(card);
      });
    } else if (type === 'stats') {
      root = element('section', 'shb-block shb-stats');
      const items = Array.isArray(content.items) ? content.items.slice(0, 6) : [];
      (items.length ? items : [{ value: '۱۲۰+', label: 'استخر فعال' }, { value: '۴.۸', label: 'امتیاز کاربران' }, { value: '۲۴/۷', label: 'پشتیبانی' }]).forEach(item => { const stat = element('div', 'shb-stat'); stat.append(element('strong', '', text(item.value, 32)), element('span', '', text(item.label, 100))); root.appendChild(stat); });
    } else if (type === 'gallery') {
      root = element('section', 'shb-block shb-gallery');
      const images = Array.isArray(content.images) ? content.images.slice(0, 8) : [];
      images.forEach(entry => { const src = safeImage(entry); if (!src) return; const img = element('img'); img.src = src; img.alt = text(content.alt || '', 180); img.loading = 'lazy'; root.appendChild(img); });
      if (!root.children.length) root.appendChild(element('p', '', 'برای گالری، تصویر WebP انتخاب کنید.'));
    } else return null;
    root.dataset.shBuilderBlock = id || 'block';
    root.dataset.shBuilderType = type;
    if (block.name) root.dataset.shBuilderName = text(block.name, 80);
    applyStyle(root, styleFor(block)); applyAnimation(root, block); applyA11y(root, block);
    const link = safeHref(content.link); if (link && type === 'image') root.onclick = () => { location.href = link; };
    return root;
  }

  function resolveAnchor(placement) {
    const target = validSelector(placement?.target) ? placement.target : '#app';
    try { return document.querySelector(target) || document.getElementById('app'); } catch (_) { return document.getElementById('app'); }
  }
  function insertBlock(node, placement) {
    const anchor = resolveAnchor(placement);
    if (!anchor) return;
    const position = POSITION.has(placement?.position) ? placement.position : 'beforeend';
    try { anchor.insertAdjacentElement(position, node); } catch (_) { anchor.appendChild(node); }
  }
  function clearBlocks() { document.querySelectorAll(GENERATED).forEach(node => node.remove()); }
  function applyOverride(item) {
    if (!item || !validSelector(item.selector)) return;
    let nodes = []; try { nodes = Array.from(document.querySelectorAll(item.selector)).slice(0, 12); } catch (_) { return; }
    nodes.forEach(node => {
      if (item.hidden === true) { node.style.display = 'none'; return; }
      if (typeof item.text === 'string' && /^(H[1-6]|P|SPAN|A|BUTTON|SMALL|B|STRONG|LABEL|LI)$/i.test(node.tagName)) node.textContent = text(item.text, 3000);
      if (node.tagName === 'IMG' && item.image) { const src = safeImage(item.image); if (src) { node.src = src; if (item.alt) node.alt = text(item.alt, 180); } }
      applyStyle(node, item.style);
      if (item.animation) applyAnimation(node, { animation: item.animation });
    });
  }
  function apply(next) {
    schema = next && typeof next === 'object' ? next : null;
    clearBlocks();
    const current = pageSchema();
    const globals = schema && schema.globals && typeof schema.globals === 'object' ? schema.globals : {};
    const overrides = [...(Array.isArray(globals.overrides) ? globals.overrides : []), ...(Array.isArray(current?.overrides) ? current.overrides : [])];
    overrides.forEach(applyOverride);
    const blocks = Array.isArray(current?.blocks) ? current.blocks : [];
    blocks.forEach(block => { const node = renderBlock(block); if (node) insertBlock(node, block.placement || {}); });
    document.documentElement.dataset.shBuilderPublished = schema ? 'true' : 'false';
  }
  async function loadPublished() {
    if (!window.ESTAKHRJO_PUBLIC_VIEWS_READY || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
    try {
      const response = await fetch(`${String(window.SUPABASE_URL).replace(/\/$/, '')}/rest/v1/public_page_builder?select=schema,updated_at&limit=1`, { headers: { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`, 'Cache-Control': 'no-cache' } });
      if (!response.ok) return;
      const rows = await response.json(); if (rows && rows[0] && rows[0].schema) { schema = rows[0].schema; ready = true; apply(schema); }
    } catch (_) { /* Existing site remains untouched if builder data is unavailable. */ }
  }
  const applyPreviewDevice = value => {
    const next = ['desktop','tablet','mobile'].includes(String(value || '')) ? String(value) : '';
    if (next) document.documentElement.dataset.shbPreviewDevice = next;
  };
  const stableSelector = el => {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = []; let node = el;
    while (node && node.nodeType === 1 && node.tagName !== 'BODY') {
      if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
      const parent = node.parentElement; if (!parent) break; const tag = node.tagName.toLowerCase();
      const peers = [...parent.children].filter(x => x.tagName === node.tagName); parts.unshift(`${tag}:nth-of-type(${peers.indexOf(node) + 1})`); node = parent;
      if (node.id === 'app') { parts.unshift('#app'); break; }
    }
    return parts.join(' > ').slice(0, 230);
  };
  function installEditorBridge() {
    if (editorMode || !new URLSearchParams(location.search).has('builderPreview')) return; editorMode = true;
    const style = document.createElement('style'); style.id = 'shb-preview-bridge-style'; style.textContent = '*{cursor:crosshair!important}[data-shb-bridge-hover="1"]{outline:2px solid #22d3ee!important;outline-offset:2px!important}[data-shb-bridge-selected="1"]{outline:3px solid #f5c66b!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(245,198,107,.18)!important}'; document.head.appendChild(style);
    document.addEventListener('pointerover', event => { const el = event.target instanceof Element ? event.target : null; if (!el) return; document.querySelectorAll('[data-shb-bridge-hover="1"]').forEach(x=>x.removeAttribute('data-shb-bridge-hover')); el.setAttribute('data-shb-bridge-hover','1'); }, true);
    document.addEventListener('click', event => {
      const raw = event.target instanceof Element ? event.target : null; if (!raw) return; event.preventDefault(); event.stopImmediatePropagation();
      const block = raw.closest('[data-sh-builder-block]'); document.querySelectorAll('[data-shb-bridge-selected="1"]').forEach(x=>x.removeAttribute('data-shb-bridge-selected'));
      const el = block || raw.closest('header,footer,section,article,aside,nav,h1,h2,h3,h4,p,button,a,img,form,div') || raw; el.setAttribute('data-shb-bridge-selected','1');
      if (block) { parent.postMessage({ type:'estakhrjo:builder-select', blockId:block.getAttribute('data-sh-builder-block') }, editorParentOrigin); return; }
      const textTag = /^(H[1-6]|P|SPAN|A|BUTTON|SMALL|B|STRONG|LABEL|LI)$/i.test(el.tagName);
      parent.postMessage({ type:'estakhrjo:builder-select', selector:stableSelector(el), isGlobal:Boolean(el.closest('header,footer')), name:(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0,70), text:textTag ? el.textContent.trim().slice(0,3000) : '', image:el.tagName === 'IMG' ? el.getAttribute('src') || '' : '', alt:el.tagName === 'IMG' ? el.getAttribute('alt') || '' : '' }, editorParentOrigin);
    }, true);
  }
  window.addEventListener('message', event => {
    if (!editorOriginAllowed(event.origin) || !event.data) return;
    if (event.data.type === 'estakhrjo:builder-editor-mode') { editorParentOrigin = event.origin; installEditorBridge(); return; }
    if (event.data.type !== 'estakhrjo:builder-preview') return;
    editorParentOrigin = event.origin; applyPreviewDevice(event.data.device); ready = true; apply(event.data.schema); installEditorBridge();
  });
  document.addEventListener('estakhrjo-page-rendered', () => { if (ready && schema) apply(schema); });
  window.addEventListener('resize', () => { if (ready && schema) apply(schema); });
  window.SH_PAGE_BUILDER_RUNTIME = { apply, loadPublished, renderBlock, safeImage, safeHref };
  const start = () => { const query = new URLSearchParams(location.search); if (query.has('builderPreview')) applyPreviewDevice(query.get('builderDevice')); loadPublished(); if (query.has('builderPreview')) { try { parent.postMessage({ type:'estakhrjo:builder-ready' }, 'https://admine.estakhrjo.ir'); } catch (_) {} } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
