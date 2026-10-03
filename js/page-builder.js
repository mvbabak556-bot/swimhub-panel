/* Estakhrjo Visual Website Builder v1 — admin-only authoring surface.
   The public renderer accepts only the validated schema produced here. */
(function () {
  'use strict';
  const PAGE_LIST = [
    ['index', 'خانه', 'https://estakhrjo.ir/index.html'], ['pools', 'استخرها', 'https://estakhrjo.ir/pools.html'], ['pool', 'جزئیات استخر', 'https://estakhrjo.ir/pool.html'], ['coaches', 'مربیان', 'https://estakhrjo.ir/coaches.html'], ['coach', 'پروفایل مربی', 'https://estakhrjo.ir/coach.html'], ['courses', 'دوره‌ها', 'https://estakhrjo.ir/courses.html'], ['hydro', 'هیدروتراپی', 'https://estakhrjo.ir/hydro.html'], ['market', 'فروشگاه', 'https://estakhrjo.ir/market.html'], ['ads', 'آگهی اعضا', 'https://estakhrjo.ir/ads.html'], ['suppliers', 'تأمین‌کنندگان', 'https://estakhrjo.ir/suppliers.html'], ['jobs', 'استخدام', 'https://estakhrjo.ir/jobs.html'], ['resumes', 'رزومه‌ها', 'https://estakhrjo.ir/resumes.html'], ['events', 'رویدادها', 'https://estakhrjo.ir/events.html'], ['articles', 'مجله', 'https://estakhrjo.ir/articles.html'], ['nearby', 'نزدیک من', 'https://estakhrjo.ir/nearby.html'], ['cart', 'سبد خرید', 'https://estakhrjo.ir/cart.html'], ['ticket', 'بلیت', 'https://estakhrjo.ir/ticket.html'], ['chat', 'پیام‌رسان', 'https://estakhrjo.ir/chat.html'], ['login', 'ورود', 'login.html'], ['dashboard', 'داشبورد', 'dashboard.html'], ['admin', 'مدیریت', 'https://admine.estakhrjo.ir/admin.html'],
  ];
  const LIBRARY = [
    ['layout', 'LAYOUT', [['section', '▤', 'Section'], ['container', '□', 'Container'], ['row', '↔', 'Row'], ['column', '↕', 'Column'], ['grid', '▦', 'Grid / ستون‌ها'], ['flex', '⇄', 'Flex'], ['stats', '◈', 'Statistics']]],
    ['content', 'CONTENT', [['heading', 'H', 'Heading'], ['text', '¶', 'Text'], ['icon', '◉', 'Brand Icon'], ['image', '▧', 'Image'], ['button', '▣', 'Button']]],
    ['marketing', 'MARKETING', [['banner', '✦', 'Hero / Banner'], ['card', '◇', 'Feature Card'], ['gallery', '▤', 'Gallery']]],
  ];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const clone = data => JSON.parse(JSON.stringify(data));
  const id = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const pagePath = key => (PAGE_LIST.find(x => x[0] === key) || PAGE_LIST[0])[2];
  const nowFa = () => new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  const defaultBlock = type => ({
    id: id('block'), name: { section: 'Section جدید', container: 'Container', row: 'Row', column: 'Column', flex: 'Flex', icon: 'آیکن برند', banner: 'بنر جدید', heading: 'عنوان', text: 'متن', image: 'تصویر', button: 'دکمه', card: 'کارت', grid: 'گرید', stats: 'آمار', gallery: 'گالری' }[type] || 'Component', type,
    content: ['section', 'container', 'row', 'column', 'flex'].includes(type) ? { title: 'بخش جدید', body: 'این Container را انتخاب کنید و Componentهای دیگر را داخل آن قرار دهید.' } : type === 'banner' ? { kicker: 'ESTAKHRJO', title: 'یک بنر حرفه‌ای جدید', body: 'محتوای این بنر بدون تغییر سایت فعلی به صفحه اضافه می‌شود.', button: 'مشاهده بیشتر', link: '' }
      : type === 'heading' ? { text: 'عنوان جدید', level: 2 }
      : type === 'text' ? { text: 'متن جدید را اینجا بنویسید.' }
      : type === 'icon' ? { icon: 'pool', label: 'نماد استخر' }
      : type === 'image' ? { image: 'assets/panel-hero.webp', alt: 'تصویر جدید', caption: '' }
      : type === 'button' ? { text: 'شروع کنید', link: '' }
      : type === 'card' ? { icon: '✦', title: 'عنوان کارت', body: 'توضیح کوتاه برای کارت جدید.', button: 'بیشتر', link: '' }
      : type === 'grid' ? { items: [{ title: 'کارت اول', body: 'توضیح اول' }, { title: 'کارت دوم', body: 'توضیح دوم' }, { title: 'کارت سوم', body: 'توضیح سوم' }] }
      : type === 'stats' ? { items: [{ value: '۱۲۰+', label: 'استخر فعال' }, { value: '۴.۸', label: 'امتیاز کاربران' }, { value: '۲۴/۷', label: 'پشتیبانی' }] }
      : { images: [] },
    placement: { target: '#app', position: 'beforeend' }, style: {}, responsive: { desktop: {}, tablet: {}, mobile: {} }, animation: { enabled: false, entrance: 'fade-up', hover: '', duration: 650, delay: 0 }, accessibility: {}, visibility: { desktop: true, tablet: true, mobile: true }, hidden: false, locked: false,
  });
  const freshDocument = () => ({
    schema_version: 1,
    globals: { overrides: [] },
    pages: Object.fromEntries(PAGE_LIST.map(([key, title, path]) => [key, { title, path, visibility: 'published', seo: { title: '', description: '', robots: 'index,follow' }, blocks: [], overrides: [] }])),
    components: [], assets: [],
  });
  const normalise = value => {
    const base = freshDocument(); const raw = value && typeof value === 'object' ? clone(value) : {};
    base.schema_version = 1;
    if (raw.globals && typeof raw.globals === 'object') base.globals = { overrides: Array.isArray(raw.globals.overrides) ? raw.globals.overrides : [] };
    PAGE_LIST.forEach(([key, title, path]) => {
      const input = raw.pages && raw.pages[key] && typeof raw.pages[key] === 'object' ? raw.pages[key] : {};
      base.pages[key] = { ...base.pages[key], title: String(input.title || title).slice(0, 100), path, visibility: ['published', 'hidden', 'draft'].includes(input.visibility) ? input.visibility : 'published', seo: input.seo && typeof input.seo === 'object' ? input.seo : base.pages[key].seo, blocks: Array.isArray(input.blocks) ? input.blocks : [], overrides: Array.isArray(input.overrides) ? input.overrides : [] };
    });
    base.components = Array.isArray(raw.components) ? raw.components : [];
    base.assets = Array.isArray(raw.assets) ? raw.assets : [];
    return base;
  };

  const state = { root: null, document: freshDocument(), page: 'index', device: 'desktop', selected: null, history: [], future: [], clipboard: null, dirty: false, saving: false, saveTimer: 0, savedAt: '', versions: [], frameReady: false, inspector: null, codeTab: 'structure', codeTimer: 0, codeError: '', archives: [] };
  const currentPage = () => state.document.pages[state.page];
  const selectedBlock = () => state.selected?.kind === 'block' ? currentPage().blocks.find(x => x.id === state.selected.id) : null;
  const selectedOverride = () => state.selected?.kind === 'legacy' ? currentPage().overrides.find(x => x.id === state.selected.id) : (state.selected?.kind === 'global' ? (state.document.globals.overrides || []).find(x => x.id === state.selected.id) : null);
  const saveLocal = () => { try { localStorage.setItem('sh_page_builder_draft', JSON.stringify(state.document)); } catch (_) {} };
  const notice = message => window.toasglass ? window.toasglass(message) : console.info(message);
  const cloud = () => window.SH_CLOUD_AUTH;
  const pushHistory = () => { state.history.push(clone(state.document)); if (state.history.length > 50) state.history.shift(); state.future = []; };
  const mutate = fn => { pushHistory(); fn(); state.dirty = true; saveLocal(); postPreview(); refreshPanels(); queueSave(); setTimeout(showResizeForSelection, 30); };
  const queueSave = () => { clearTimeout(state.saveTimer); state.saveTimer = setTimeout(saveDraft, 1000); };
  const undo = () => { if (!state.history.length) return; state.future.push(clone(state.document)); state.document = state.history.pop(); state.dirty = true; saveLocal(); postPreview(); refreshPanels(); setTimeout(showResizeForSelection, 30); notice('↶ یک مرحله بازگردانی شد'); };
  const redo = () => { if (!state.future.length) return; state.history.push(clone(state.document)); state.document = state.future.pop(); state.dirty = true; saveLocal(); postPreview(); refreshPanels(); setTimeout(showResizeForSelection, 30); notice('↷ یک مرحله دوباره اعمال شد'); };
  const frame = () => state.root?.querySelector('#shbLiveFrame');
  const frameOrigin = () => { try { return new URL(frame()?.src || pagePath(state.page), location.href).origin; } catch (_) { return '*'; } };
  const postPreview = () => { const f = frame(); if (f?.contentWindow) f.contentWindow.postMessage({ type: 'estakhrjo:builder-preview', schema: state.document, page: state.page, device: state.device }, frameOrigin()); };
  const changeFrame = () => {
    const f = frame(); if (!f) return;
    state.frameReady = false; f.src = `${pagePath(state.page)}?builderPreview=1&builderPage=${encodeURIComponent(state.page)}&builderDevice=${encodeURIComponent(state.device)}`;
    const widths = { desktop: '1440px', tablet: '820px', mobile: '390px' }; f.parentElement.style.setProperty('--shb-canvas-width', widths[state.device]); setTimeout(fitCanvas, 0);
  };
  const docClass = device => device === 'desktop' ? 'دسکتاپ ۱۴۴۰' : device === 'tablet' ? 'تبلت ۸۲۰' : 'موبایل ۳۹۰';
  const visualPickerCss = `*{cursor:crosshair!important} [data-shb-picked="1"]{outline:3px solid #22d3ee!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(34,211,238,.18)!important}.shb-resize-handle{position:fixed;z-index:2147483647;width:17px;height:17px;border:2px solid #e8fdff;border-radius:5px;background:#22d3ee;box-shadow:0 2px 8px #0008;cursor:nwse-resize!important;padding:0}`;
  const stableSelector = el => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const pieces = [];
    let node = el;
    while (node && node.nodeType === 1 && node.tagName !== 'BODY') {
      if (node.id) { pieces.unshift(`#${CSS.escape(node.id)}`); break; }
      const tag = node.tagName.toLowerCase(); const parent = node.parentElement; if (!parent) break;
      const peers = Array.from(parent.children).filter(x => x.tagName === node.tagName); const at = peers.indexOf(node) + 1;
      pieces.unshift(`${tag}:nth-of-type(${at})`); node = parent;
      if (node.id === 'app') { pieces.unshift('#app'); break; }
    }
    return pieces.join(' > ').slice(0, 230);
  };
  function installPicker() {
    const f = frame();
    // Production pages live on estakhrjo.ir while the editor lives on the
    // dedicated admin origin. Never touch contentDocument cross-origin; the
    // Preview Bridge inside the iframe performs hit-testing instead.
    if (!f || frameOrigin() !== location.origin) { f?.contentWindow?.postMessage({ type: 'estakhrjo:builder-editor-mode', enabled: true }, frameOrigin()); return; }
    let doc = null; try { doc = f.contentDocument; } catch (_) { doc = null; }
    if (!doc || doc.getElementById('shb-picker-style')) return;
    const style = doc.createElement('style'); style.id = 'shb-picker-style'; style.textContent = visualPickerCss; doc.head.appendChild(style);
    doc.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const raw = event.target instanceof Element ? event.target : null; if (!raw) return;
      const builderBlock = raw.closest('[data-sh-builder-block]');
      if (builderBlock) { selectBlock(builderBlock.getAttribute('data-sh-builder-block')); return; }
      const el = raw.closest('header,footer,section,article,aside,nav,h1,h2,h3,h4,p,button,a,img,form,div') || raw;
      doc.querySelectorAll('[data-shb-picked="1"]').forEach(x => x.removeAttribute('data-shb-picked')); el.setAttribute('data-shb-picked', '1');
      const selector = stableSelector(el); const isGlobal = Boolean(el.closest('header, footer')); const bucket = isGlobal ? (state.document.globals.overrides ||= []) : currentPage().overrides; let item = bucket.find(x => x.selector === selector);
      if (!item) {
        item = { id: id(isGlobal ? 'global' : 'legacy'), name: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 70) || el.tagName, selector, text: /^(H[1-6]|P|SPAN|A|BUTTON|SMALL|B|STRONG|LABEL|LI)$/i.test(el.tagName) ? el.textContent.trim().slice(0, 3000) : '', image: el.tagName === 'IMG' ? el.getAttribute('src') || '' : '', alt: el.tagName === 'IMG' ? el.getAttribute('alt') || '' : '', style: {}, hidden: false, animation: {} };
        mutate(() => bucket.push(item));
      }
      state.selected = { kind: isGlobal ? 'global' : 'legacy', id: item.id }; refreshPanels(); setTimeout(showResizeForSelection, 20);
    }, true);
    doc.addEventListener('dragover', event => event.preventDefault());
    doc.addEventListener('drop', event => {
      event.preventDefault(); const type = event.dataTransfer?.getData('application/x-shb-type'); if (!type) return;
      const target = event.target instanceof Element ? event.target.closest('section,article,div,main') || event.target : null;
      addBlock(type, target ? stableSelector(target) : '#app');
    });
  }
  function showResizeForSelection() {
    const f = frame(); let doc = null; try { doc = f?.contentDocument; } catch (_) {} const item = selectedBlock() || selectedOverride(); if (!doc || !item || !state.selected) return;
    doc.querySelectorAll('.shb-resize-handle').forEach(node => node.remove());
    let target = null;
    if (state.selected.kind === 'block') target = doc.querySelector(`[data-sh-builder-block="${CSS.escape(state.selected.id)}"]`);
    else { try { target = doc.querySelector(item.selector); } catch (_) {} }
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const handle = doc.createElement('button'); handle.type = 'button'; handle.className = 'shb-resize-handle'; handle.title = 'Resize';
    handle.style.left = `${Math.max(2, rect.right - 10)}px`; handle.style.top = `${Math.max(2, rect.bottom - 10)}px`; doc.body.appendChild(handle);
    handle.addEventListener('pointerdown', start => {
      start.preventDefault(); start.stopPropagation(); const baseWidth = Math.max(24, rect.width), baseHeight = Math.max(24, rect.height); const startX = start.clientX, startY = start.clientY;
      handle.setPointerCapture?.(start.pointerId);
      const move = event => {
        const width = Math.max(24, Math.round(baseWidth + event.clientX - startX)); const height = Math.max(24, Math.round(baseHeight + event.clientY - startY));
        target.style.width = `${width}px`; target.style.height = `${height}px`; handle.style.left = `${Math.max(2, target.getBoundingClientRect().right - 10)}px`; handle.style.top = `${Math.max(2, target.getBoundingClientRect().bottom - 10)}px`;
      };
      const finish = event => {
        doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', finish); const finalRect = target.getBoundingClientRect();
        mutate(() => { const current = selectedBlock() || selectedOverride(); if (!current) return; if (state.selected?.kind === 'block') { current.responsive ||= { desktop: {}, tablet: {}, mobile: {} }; current.responsive[state.device] ||= {}; current.responsive[state.device].width = `${Math.round(finalRect.width)}px`; current.responsive[state.device].height = `${Math.round(finalRect.height)}px`; } else { current.style ||= {}; current.style.width = `${Math.round(finalRect.width)}px`; current.style.height = `${Math.round(finalRect.height)}px`; } });
      };
      doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', finish, { once: true });
    });
  }
  function selectBlock(blockId) { state.selected = { kind: 'block', id: blockId }; const f = frame(); try { f?.contentDocument?.querySelectorAll('[data-shb-picked="1"]').forEach(x => x.removeAttribute('data-shb-picked')); } catch (_) {} refreshPanels(); setTimeout(showResizeForSelection, 20); }
  function addBlock(type, target) { mutate(() => { const block = defaultBlock(type); block.placement.target = target || state.selected?.selector || '#app'; currentPage().blocks.push(block); state.selected = { kind: 'block', id: block.id }; }); }
  function removeSelected() { const block = selectedBlock(); const legacy = selectedOverride(); if (!block && !legacy) return; mutate(() => { if (block) currentPage().blocks = currentPage().blocks.filter(x => x.id !== block.id); else if (state.selected?.kind === 'global') state.document.globals.overrides = (state.document.globals.overrides || []).filter(x => x.id !== legacy.id); else currentPage().overrides = currentPage().overrides.filter(x => x.id !== legacy.id); state.selected = null; }); }
  function duplicateSelected() { const block = selectedBlock(); const legacy = selectedOverride(); if (!block && !legacy) return; mutate(() => { const source = clone(block || legacy); source.id = id(block ? 'block' : 'legacy'); source.name = `${source.name || 'مورد'} — کپی`; (block ? currentPage().blocks : (state.selected?.kind === 'global' ? (state.document.globals.overrides ||= []) : currentPage().overrides)).push(source); state.selected = { kind: block ? 'block' : (state.selected?.kind === 'global' ? 'global' : 'legacy'), id: source.id }; }); }
  function copySelected() { const item = selectedBlock() || selectedOverride(); if (!item) return; state.clipboard = clone(item); notice('✓ Component در حافظه Builder کپی شد'); }
  function pasteSelected() { if (!state.clipboard) return notice('ابتدا یک Component را کپی کنید'); mutate(() => { const item = clone(state.clipboard); item.id = id(state.selected?.kind === 'legacy' ? 'legacy' : 'block'); item.name = `${item.name || 'مورد'} — کپی`; const legacy = state.selected?.kind !== 'block'; (legacy ? (state.selected?.kind === 'global' ? (state.document.globals.overrides ||= []) : currentPage().overrides) : currentPage().blocks).push(item); state.selected = { kind: legacy ? (state.selected?.kind === 'global' ? 'global' : 'legacy') : 'block', id: item.id }; }); }
  function saveAsComponent() { const block = selectedBlock(); if (!block) return notice('فقط Componentهای Builder قابل ذخیره مجدد هستند'); const name = prompt('نام Component قابل استفادهٔ مجدد:', block.name || 'Component جدید'); if (!name) return; mutate(() => state.document.components.push({ id: id('component'), name: name.slice(0, 80), block: clone(block) })); }
  function restoreVersion(versionId) { const choice = state.versions.find(x => x.id === versionId); if (!choice || !confirm(`نسخه ${choice.version_number} به Draft برگردد؟ انتشار فعلی تغییر نمی‌کند.`)) return; const c = cloud(); if (!c?.restorePageBuilderVersion) return notice('ورود ابری مدیر برای بازگردانی لازم است'); c.restorePageBuilderVersion(versionId).then(out => { state.document = normalise(out.draft); state.dirty = true; state.selected = null; postPreview(); refreshPanels(); notice('✓ نسخه به Draft بازگردانی شد؛ برای سایت زنده Publish کنید'); }).catch(error => notice('⚠️ بازگردانی ناموفق بود: ' + error.message)); }
  async function saveDraft() {
    if (!state.dirty || state.saving) return;
    const c = cloud(); if (!c?.active || !c.savePageBuilder) { state.savedAt = `محلی — ${nowFa()}`; refreshStatus(); return; }
    state.saving = true; refreshStatus();
    try { const out = await c.savePageBuilder(state.document); state.document = normalise(out.draft || state.document); state.dirty = false; state.savedAt = nowFa(); saveLocal(); }
    catch (error) { state.savedAt = 'ذخیره ابری ناموفق'; notice('⚠️ Draft فقط محلی ماند: ' + error.message); }
    finally { state.saving = false; refreshStatus(); }
  }
  async function publish() {
    if (!confirm('نسخهٔ Draft پس از کنترل دسترس‌پذیری منتشر شود؟')) return;
    const issues = a11yIssues(); if (issues.length && !confirm(`هشدار دسترس‌پذیری:\n${issues.join('\n')}\n\nبا وجود این موارد منتشر شود؟`)) return;
    const c = cloud(); if (!c?.active || !c.publishPageBuilder) return notice('ورود ابری مدیر برای انتشار لازم است');
    try { await saveDraft(); const note = prompt('یادداشت نسخه (اختیاری):', '') || ''; const out = await c.publishPageBuilder(state.document, note); state.document = normalise(out.draft || state.document); state.dirty = false; state.savedAt = nowFa(); await loadVersions(); notice(`✓ نسخه ${out.published_version || ''} با موفقیت منتشر شد`); }
    catch (error) { notice('⚠️ انتشار ناموفق بود: ' + error.message); }
  }
  function a11yIssues() {
    const out = []; currentPage().blocks.forEach(block => { if (block.type === 'image' && !String(block.content?.alt || '').trim()) out.push(`• ${block.name || 'تصویر'} فاقد Alt Text است`); if (block.type === 'heading' && !block.content?.text) out.push('• عنوان خالی است'); }); return out;
  }
  async function loadVersions() { const c = cloud(); if (!c?.active || !c.listPageBuilderVersions) return; try { const out = await c.listPageBuilderVersions(); state.versions = Array.isArray(out.versions) ? out.versions : []; refreshPanels(); } catch (_) {} }

  /* Draft archive -------------------------------------------------------
     Published versions remain server-backed. Named working copies are also
     kept as independent checkpoints so an operator can explore alternatives
     and resume them later without replacing the active draft. */
  const ARCHIVE_KEY = 'sh_page_builder_archives_v2';
  function readArchives() { try { const rows = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); return Array.isArray(rows) ? rows : []; } catch (_) { return []; } }
  function writeArchives(rows) { try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(rows.slice(0, 24))); return true; } catch (_) { notice('⚠️ فضای مرورگر برای بایگانی کافی نیست؛ رسانه‌های بزرگ را حذف یا یک نسخه را پاک کنید'); return false; } }
  function checkpoint(name, silent) {
    const title = String(name || `نسخه ${new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`).trim().slice(0, 100);
    const row = { id: id('draft'), name: title, page: state.page, created_at: new Date().toISOString(), document: clone(state.document) };
    state.archives = [row, ...readArchives().filter(x => x.id !== row.id)];
    if (writeArchives(state.archives) && !silent) notice(`✓ «${title}» در بایگانی پیش‌نویس‌ها ذخیره شد`);
    return row;
  }
  function openDraftArchive() {
    state.archives = readArchives(); const dialog = state.root?.querySelector('#shbDrafts'); const rows = state.root?.querySelector('#shbDraftRows'); if (!dialog || !rows) return;
    rows.innerHTML = state.archives.length ? state.archives.map(row => `<article><div><b>${esc(row.name)}</b><small>${esc(new Date(row.created_at).toLocaleString('fa-IR'))} · ${esc(row.page || 'index')}</small></div><div><button data-action="load-draft" data-id="${esc(row.id)}">باز کردن</button><button data-action="delete-draft" data-id="${esc(row.id)}">حذف</button></div></article>`).join('') : '<p class="pb-empty">هنوز پیش‌نویس بایگانی‌شده‌ای وجود ندارد.</p>';
    dialog.showModal();
  }
  function loadArchivedDraft(draftId) { const row = readArchives().find(x => x.id === draftId); if (!row?.document) return; checkpoint('پشتیبان خودکار قبل از تغییر پیش‌نویس', true); state.document = normalise(row.document); state.page = state.document.pages[row.page] ? row.page : 'index'; state.selected = null; state.dirty = true; saveLocal(); refreshPanels(); changeFrame(); queueSave(); state.root?.querySelector('#shbDrafts')?.close(); notice(`✓ پیش‌نویس «${row.name}» باز شد`); }
  function deleteArchivedDraft(draftId) { if (!confirm('این پیش‌نویس از بایگانی حذف شود؟')) return; state.archives = readArchives().filter(x => x.id !== draftId); writeArchives(state.archives); openDraftArchive(); }

  /* Live production import --------------------------------------------- */
  async function pullLatestPublished() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return notice('تنظیمات دریافت نسخهٔ زنده در دسترس نیست');
    try {
      const url = `${String(window.SUPABASE_URL).replace(/\/$/,'')}/rest/v1/public_page_builder?select=schema,published_version,updated_at&limit=1`;
      const response = await fetch(url, { headers: { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`, 'Cache-Control': 'no-cache' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`); const rows = await response.json(); const live = rows?.[0];
      if (!live?.schema) return notice('هنوز نسخه‌ای از Builder روی سایت منتشر نشده است');
      if (!confirm(`آخرین نسخهٔ سایت${live.published_version ? ` (نسخه ${live.published_version})` : ''} دریافت شود؟\nپیش از جایگزینی، از Draft فعلی یک نسخهٔ بایگانی ساخته می‌شود.`)) return;
      checkpoint('پشتیبان خودکار قبل از دریافت نسخه زنده', true); pushHistory(); state.document = normalise(live.schema); state.selected = null; state.dirty = true; saveLocal(); refreshPanels(); changeFrame(); queueSave(); notice(`✓ آخرین نسخهٔ سایت دریافت شد${live.published_version ? ` — نسخه ${live.published_version}` : ''}`);
    } catch (error) { notice('⚠️ دریافت نسخهٔ زنده ناموفق بود: ' + (error.message || 'خطا')); }
  }

  /* Synchronized code dock --------------------------------------------- */
  const camel = key => key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  function structureCode() { return currentPage().blocks.map(block => `<ej-block id="${block.id}" type="${block.type}" name="${String(block.name || '').replace(/"/g,'&quot;')}">\n  <ej-content>${JSON.stringify(block.content || {}, null, 2)}</ej-content>\n  <ej-responsive>${JSON.stringify(block.responsive || {}, null, 2)}</ej-responsive>\n</ej-block>`).join('\n\n') || '<!-- این صفحه هنوز Component افزوده‌شده‌ای ندارد. -->'; }
  function cssCode() { const item = selectedBlock() || selectedOverride(); if (!item) return '/* برای ویرایش CSS یک عنصر را در Canvas یا Layers انتخاب کنید. */'; const style = selectedBlock() ? ((item.responsive || {})[state.device] || {}) : (item.style || {}); const selector = selectedBlock() ? `[data-sh-builder-block="${item.id}"]` : item.selector; const body = Object.entries(style).map(([k,v]) => `  ${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}: ${v};`).join('\n'); return `${selector} {\n${body}\n}`; }
  function codeValue() { return state.codeTab === 'json' ? JSON.stringify(currentPage(), null, 2) : state.codeTab === 'css' ? cssCode() : structureCode(); }
  function syncCodeDock(force) { const area = state.root?.querySelector('#shbCodeEditor'); if (!area || (!force && document.activeElement === area)) return; area.value = codeValue(); const status = state.root?.querySelector('#shbCodeStatus'); if (status) { status.textContent = state.codeError || 'همگام با Canvas'; status.classList.toggle('error', !!state.codeError); } state.root?.querySelectorAll('[data-code-tab]').forEach(x => x.classList.toggle('on', x.dataset.codeTab === state.codeTab)); }
  function applyStructure(source) { const parsed = new DOMParser().parseFromString(`<main>${source}</main>`, 'text/html'); const nodes = [...parsed.querySelectorAll('ej-block')]; if (!nodes.length && !/Component افزوده/.test(source)) throw new Error('حداقل یک ej-block معتبر لازم است'); const blocks = nodes.map((node, index) => { const type = node.getAttribute('type') || 'card'; const base = defaultBlock(type); let content = {}, responsive = {}; try { content = JSON.parse(node.querySelector('ej-content')?.textContent || '{}'); } catch (_) { throw new Error(`JSON محتوای بلوک ${index + 1} معتبر نیست`); } try { responsive = JSON.parse(node.querySelector('ej-responsive')?.textContent || '{}'); } catch (_) { throw new Error(`Responsive بلوک ${index + 1} معتبر نیست`); } return { ...base, id: node.getAttribute('id') || base.id, name: node.getAttribute('name') || base.name, type, content, responsive }; }); currentPage().blocks = blocks; }
  function applyCss(source) { const item = selectedBlock() || selectedOverride(); if (!item) throw new Error('ابتدا یک عنصر را انتخاب کنید'); const match = source.match(/\{([\s\S]*)\}/); if (!match) throw new Error('ساختار CSS باید شامل { } باشد'); const style = {}; match[1].split(';').forEach(part => { const at = part.indexOf(':'); if (at < 1) return; const key = camel(part.slice(0, at)); const value = part.slice(at + 1).trim(); if (key && value) style[key] = value.slice(0, 100); }); if (selectedBlock()) { item.responsive ||= {desktop:{},tablet:{},mobile:{}}; item.responsive[state.device] = style; } else item.style = style; }
  function applyCode(source) { try { pushHistory(); if (state.codeTab === 'json') { const page = JSON.parse(source); if (!page || !Array.isArray(page.blocks)) throw new Error('JSON صفحه باید blocks داشته باشد'); state.document.pages[state.page] = { ...currentPage(), ...page, path: currentPage().path }; } else if (state.codeTab === 'css') applyCss(source); else applyStructure(source); state.codeError = ''; state.dirty = true; saveLocal(); postPreview(); refreshPanels(); queueSave(); } catch (error) { state.history.pop(); state.codeError = error.message || 'کد معتبر نیست'; const status = state.root?.querySelector('#shbCodeStatus'); if (status) { status.textContent = state.codeError; status.classList.add('error'); } } }
  function queueCodeApply(value) { clearTimeout(state.codeTimer); state.codeTimer = setTimeout(() => applyCode(value), 500); }

  function fitCanvas() {
    const device = state.root?.querySelector('.pb-canvas-device'), stage = state.root?.querySelector('.pb-canvas-stage'), scroll = state.root?.querySelector('.pb-canvas-scroll'); if (!device || !stage || !scroll) return;
    const natural = { desktop: 1440, tablet: 820, mobile: 390 }[state.device] || 1440; const available = Math.max(280, scroll.clientWidth - 28); const scale = Math.min(1, available / natural);
    device.style.width = `${natural}px`; device.style.minWidth = `${natural}px`; device.style.maxWidth = 'none'; device.style.transform = `translateX(-50%) scale(${scale})`; device.style.transformOrigin = 'top center';
    // Give WebKit/Safari an explicit iframe viewport as well as a wrapper
    // width. Relying only on width:100% can leave the previous mobile layout
    // viewport cached after switching devices.
    const previewFrame = device.querySelector('iframe'); if (previewFrame) { previewFrame.width = natural; previewFrame.style.width = `${natural}px`; previewFrame.style.minWidth = `${natural}px`; }
    stage.style.width = `${Math.round(natural * scale)}px`; stage.style.height = `${Math.round(device.offsetHeight * scale)}px`; stage.style.setProperty('--shb-scale', String(scale));
  }
  function setDevice(value) { state.device = value; const f = frame(); if (f) f.parentElement.style.setProperty('--shb-canvas-width', { desktop: '1440px', tablet: '820px', mobile: '390px' }[value]); refreshPanels(); fitCanvas(); requestAnimationFrame(() => requestAnimationFrame(() => { postPreview(); fitCanvas(); })); setTimeout(showResizeForSelection, 30); }
  function selectedLayers() { const globals = (state.document.globals.overrides || []).map(item => `<li class="${state.selected?.kind === 'global' && state.selected.id === item.id ? 'on' : ''}"><button data-action="select-global" data-id="${esc(item.id)}"><i>◇</i><span>⌂</span><b>Global · ${esc(item.name || 'Header/Footer')}</b></button></li>`).join(''); return globals + currentPage().blocks.map((block, index) => `<li class="${state.selected?.kind === 'block' && state.selected.id === block.id ? 'on' : ''}" draggable="true" data-shb-layer="${esc(block.id)}" data-index="${index}"><button data-action="select-block" data-id="${esc(block.id)}"><i>⋮⋮</i><span>${esc(block.hidden ? '◌' : block.type === 'banner' ? '✦' : '◇')}</span><b>${esc(block.name || block.type)}</b>${block.locked ? '<em>🔒</em>' : ''}</button></li>`).join('') || '<li class="pb-empty">هنوز Component جدیدی اضافه نشده؛ سایت فعلی بدون تغییر نمایش داده می‌شود.</li>'; }
  function pageItems() { return PAGE_LIST.map(([key, label]) => `<button class="pb-page ${state.page === key ? 'on' : ''}" data-action="page" data-page="${key}"><span>${key === 'index' ? '⌂' : '□'}</span>${esc(label)}<i>${state.document.pages[key]?.blocks?.length || ''}</i></button>`).join(''); }
  function libraryHtml() { return LIBRARY.map(([key, label, items]) => `<section class="pb-library-group"><h4>${label}</h4>${items.map(([type, icon, title]) => `<button draggable="true" data-shb-create="${type}" data-action="add" data-type="${type}"><span>${icon}</span><b>${title}</b><small>Drag</small></button>`).join('')}</section>`).join('') + (state.document.components.length ? `<section class="pb-library-group"><h4>MY COMPONENTS</h4>${state.document.components.map(item => `<button data-action="saved-component" data-id="${esc(item.id)}"><span>◈</span><b>${esc(item.name)}</b><small>Reusable</small></button>`).join('')}</section>` : ''); }
  function assetHtml() { const assets = state.document.assets || []; return `<div class="pb-assets"><label class="pb-upload">＋ آپلود تصویر WebP<input id="shbAssetInput" type="file" accept="image/webp,image/jpeg,image/png,image/avif"></label><p>تصویر قبل از استفاده با قرارداد WebP پروژه تبدیل می‌شود.</p>${assets.length ? assets.slice().reverse().map(asset => `<button data-action="asset" data-id="${esc(asset.id)}"><img src="${esc(asset.url)}" alt=""><span>${esc(asset.name)}</span></button>`).join('') : '<div class="pb-empty">کتابخانه رسانه خالی است.</div>'}</div>`; }
  function panelTabs() { return `<div class="pb-side-tabs"><button class="on" data-pb-tab="library">Elements</button><button data-pb-tab="layers">Layers</button><button data-pb-tab="pages">Pages</button><button data-pb-tab="assets">Assets</button></div><div class="pb-side-content" id="shbSideContent">${libraryHtml()}</div>`; }
  function styleInputs(item, legacy) {
    const style = legacy ? (item.style || {}) : ({ ...(item.style || {}), ...((item.responsive || {})[state.device] || {}) });
    const input = (label, key, placeholder) => `<label>${label}<input data-pb-style="${key}" value="${esc(style[key] || '')}" placeholder="${placeholder || ''}"></label>`;
    return `<div class="pb-prop-group"><h4>اندازه و فاصله <small>${docClass(state.device)} · گوشهٔ عنصر برای Resize</small></h4><div class="pb-prop-grid">${input('Width','width','100% / 420px')}${input('Height','height','auto / 280px')}${input('Min width','minWidth','240px')}${input('Min height','minHeight','220px')}${input('Max width','maxWidth','1180px')}${input('Padding','padding','24px')}${input('Margin','margin','0 auto 24px')}${input('Radius','borderRadius','18px')}${input('Gap','gap','16px')}</div></div><div class="pb-prop-group"><h4>Typography و ظاهر</h4><div class="pb-prop-grid">${input('Text color','color','#ffffff')}${input('Background','background','#06213a')}${input('Border','border','1px solid #ffffff22')}${input('Shadow','boxShadow','0 8px 24px #0005')}${input('Font size','fontSize','16px')}${input('Weight','fontWeight','700')}${input('Line height','lineHeight','1.8')}${input('Letter spacing','letterSpacing','0')}${input('Text shadow','textShadow','0 1px 8px #0008')}${input('Object fit','objectFit','cover')}</div></div><div class="pb-prop-group"><h4>Layout</h4><div class="pb-prop-grid">${input('Display','display','grid / flex / block')}${input('Flex direction','flexDirection','row / column')}${input('Justify','justifyContent','center')}${input('Align','alignItems','center')}${input('Grid columns','gridTemplateColumns','repeat(3,1fr)')}${input('Position','position','relative')}${input('Z-index','zIndex','1')}${input('Opacity','opacity','1')}</div></div>`;
  }
  function animationInputs(item) { const a = item.animation || {}; return `<div class="pb-prop-group"><h4>Animation</h4><label class="pb-check"><input type="checkbox" data-pb-animation="enabled" ${a.enabled ? 'checked' : ''}> فعال</label><div class="pb-prop-grid"><label>Entrance<select data-pb-animation="entrance">${['fade','fade-up','fade-down','slide','zoom','bounce','rotate'].map(x => `<option ${a.entrance === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Hover<select data-pb-animation="hover">${['','scale','lift','glow','rotate'].map(x => `<option value="${x}" ${a.hover === x ? 'selected' : ''}>${x || 'none'}</option>`).join('')}</select></label><label>Duration (ms)<input type="number" min="100" max="5000" data-pb-animation="duration" value="${Number(a.duration) || 650}"></label><label>Delay (ms)<input type="number" min="0" max="5000" data-pb-animation="delay" value="${Number(a.delay) || 0}"></label></div></div>`; }
  function blockProperties(block) {
    const c = block.content || {}; const field = (label, key, value, type = 'text') => `<label>${label}<input type="${type}" data-pb-content="${key}" value="${esc(value == null ? '' : value)}"></label>`;
    let content = '';
    if (['banner', 'card'].includes(block.type)) content = `<div class="pb-prop-group"><h4>Content</h4>${field('نام Component','name',block.name)}${field('عنوان','title',c.title)}<label>توضیح<textarea data-pb-content="body">${esc(c.body || '')}</textarea></label>${field('متن دکمه','button',c.button)}${field('لینک','link',c.link)}</div>`;
    else if (block.type === 'heading') content = `<div class="pb-prop-group"><h4>Heading</h4>${field('نام Component','name',block.name)}${field('متن','text',c.text)}<label>سطح<select data-pb-content="level">${[2,3,4].map(n => `<option value="${n}" ${Number(c.level) === n ? 'selected' : ''}>H${n}</option>`).join('')}</select></label></div>`;
    else if (block.type === 'text') content = `<div class="pb-prop-group"><h4>Text</h4>${field('نام Component','name',block.name)}<label>محتوا<textarea data-pb-content="text">${esc(c.text || '')}</textarea></label></div>`;
    else if (block.type === 'image') content = `<div class="pb-prop-group"><h4>Image</h4>${field('نام Component','name',block.name)}${field('نشانی WebP','image',c.image)}${field('Alt Text','alt',c.alt)}${field('Caption','caption',c.caption)}</div>`;
    else if (block.type === 'icon') { const icons = ['pool','home','user','users','accessibility','coach','course','cart','market','search','location','bell','message','calendar','ticket','shield','admin','settings','camera','gallery','video','image','heart','star','wallet','building','briefcase','document','chart','map','sauna','lifebuoy','bolt','spark']; const preview = name => window.ESTAKHRJO_ICONS?.render ? window.ESTAKHRJO_ICONS.render(name, '', 'pb-icon-preview') : '◉'; content = `<div class="pb-prop-group"><h4>Estakhrjo Icon</h4>${field('نام Component','name',block.name)}<label>ARIA / Label<input data-pb-content="label" value="${esc(c.label || '')}" placeholder="نماد استخر"></label><div class="pb-icon-picker" role="listbox" aria-label="انتخاب آیکن اختصاصی">${icons.map(name => `<button type="button" data-pb-icon="${name}" aria-label="${name}" aria-pressed="${c.icon === name ? 'true' : 'false'}" class="${c.icon === name ? 'on' : ''}">${preview(name)}<small>${name}</small></button>`).join('')}</div><p class="pb-help">نمادها اختصاصی استخر جو هستند؛ SVG سبک و امن آن‌ها همراه schema منتشر می‌شود.</p></div>`; }
    else if (block.type === 'button') content = `<div class="pb-prop-group"><h4>Button</h4>${field('نام Component','name',block.name)}${field('متن','text',c.text)}${field('لینک','link',c.link)}</div>`;
    else content = `<div class="pb-prop-group"><h4>${esc(block.type)}</h4>${field('نام Component','name',block.name)}<p class="pb-help">ویرایش داده‌های تکرارشوندهٔ این Component در نسخهٔ پایه از طریق JSON Schema امن انجام می‌شود.</p></div>`;
    return `<div class="pb-selection-head"><span>${esc(block.type)}</span><b>${esc(block.name || block.type)}</b><div><button data-action="duplicate" title="Duplicate">⧉</button><button data-action="copy" title="Copy">⧉</button><button data-action="delete" title="Delete">🗑</button></div></div>${content}${styleInputs(block, false)}<div class="pb-prop-group"><h4>Responsive</h4><label class="pb-check"><input type="checkbox" data-pb-hidden="1" ${block.hidden ? 'checked' : ''}> مخفی‌سازی کامل Component</label><label class="pb-check"><input type="checkbox" data-pb-hide-device="1" ${block.visibility && block.visibility[state.device] === false ? 'checked' : ''}> مخفی در ${docClass(state.device)}</label><label class="pb-check"><input type="checkbox" data-pb-lock="1" ${block.locked ? 'checked' : ''}> قفل کردن در Layers</label></div>${animationInputs(block)}<div class="pb-prop-group"><h4>Accessibility</h4><label>ARIA label<input data-pb-a11y="label" value="${esc(block.accessibility?.label || '')}"></label></div><div class="pb-prop-group pb-advanced"><h4>Advanced</h4><label>Custom CSS class<input data-pb-advanced="class" value="${esc(block.className || '')}" placeholder="فقط نام class"></label><p>HTML/CSS/JS دلخواه عمداً در صفحهٔ عمومی اجرا نمی‌شود؛ برای جلوگیری از XSS و سرقت نشست، فقط sandboxed component در فاز انتشار امن فعال خواهد شد.</p></div>`;
  }
  function legacyProperties(item) { return `<div class="pb-selection-head"><span>Existing DOM</span><b>${esc(item.name || 'عنصر سایت')}</b><div><button data-action="delete" title="Remove override">🗑</button></div></div><div class="pb-prop-group"><h4>${state.selected?.kind === 'global' ? 'Global Header / Footer' : 'عنصر فعلی سایت'}</h4><small class="pb-selector">${esc(item.selector)}</small><label>متن<textarea data-pb-legacy="text">${esc(item.text || '')}</textarea></label>${item.image !== undefined ? `<label>نشانی تصویر WebP<input data-pb-legacy="image" value="${esc(item.image || '')}"></label><label>Alt Text<input data-pb-legacy="alt" value="${esc(item.alt || '')}"></label>` : ''}</div>${styleInputs(item, true)}<div class="pb-prop-group"><label class="pb-check"><input type="checkbox" data-pb-hidden="1" ${item.hidden ? 'checked' : ''}> مخفی‌سازی این عنصر در این صفحه</label></div>${animationInputs(item)}`; }
  function propertiesHtml() { const block = selectedBlock(), legacy = selectedOverride(); if (block) return blockProperties(block); if (legacy) return legacyProperties(legacy); return `<div class="pb-no-selection"><span>⌁</span><h3>یک عنصر انتخاب کنید</h3><p>روی سایت واقعی در Canvas کلیک کنید یا از Layers یک Component را انتخاب کنید.</p><button class="btn btn-ghost btn-sm" data-action="add" data-type="banner">＋ افزودن Banner</button></div>`; }
  function refreshStatus() { const el = state.root?.querySelector('#shbSaveState'); if (el) el.textContent = state.saving ? 'در حال ذخیره…' : state.dirty ? 'تغییرات ذخیره‌نشده' : (state.savedAt ? `ذخیره شد ${state.savedAt}` : 'Draft آماده'); }
  function refreshPanels() {
    if (!state.root) return; const left = state.root.querySelector('#shbSideContent'); const active = state.root.querySelector('.pb-side-tabs .on')?.dataset.pbTab || 'library';
    if (left) left.innerHTML = active === 'layers' ? `<ol class="pb-layers" id="shbLayers">${selectedLayers()}</ol>` : active === 'pages' ? `<div class="pb-pages">${pageItems()}</div>` : active === 'assets' ? assetHtml() : libraryHtml();
    const right = state.root.querySelector('#shbProperties'); if (right) right.innerHTML = propertiesHtml();
    const crumb = state.root.querySelector('#shbPageName'); if (crumb) crumb.textContent = currentPage().title;
    state.root.querySelectorAll('[data-device]').forEach(btn => btn.classList.toggle('on', btn.dataset.device === state.device)); refreshStatus(); syncCodeDock(false);
  }
  function shell() { return `<section class="page-builder" aria-label="Visual Website Builder"><header class="pb-topbar"><div class="pb-brand"><span>◇</span><div><b>استخر جو | ESTAKHRJO Builder</b><small>Visual + Code Editor · Live workspace</small></div></div><div class="pb-toolbar"><button data-action="undo" title="Undo">↶</button><button data-action="redo" title="Redo">↷</button><span class="pb-divider"></span>${['desktop','tablet','mobile'].map(x => `<button data-device="${x}" data-action="device" title="${docClass(x)}">${x === 'desktop' ? '▣' : x === 'tablet' ? '▯' : '▯'}</button>`).join('')}<span class="pb-divider"></span><button data-action="pull-live" class="pb-live-pull">↓ دریافت آخرین نسخه سایت</button><button data-action="drafts">▤ بایگانی Draft</button><button data-action="checkpoint">＋ Checkpoint</button><button data-action="preview">◉ پیش‌نمایش</button><button data-action="save">ذخیره Draft</button><button class="pb-publish" data-action="publish">Publish ↑</button></div><div class="pb-save-state" id="shbSaveState">Draft آماده</div></header><div class="pb-workspace"><aside class="pb-left">${panelTabs()}</aside><main class="pb-canvas"><header class="pb-canvas-head"><div><span>صفحهٔ فعلی</span><b id="shbPageName">خانه</b></div><small>${docClass(state.device)} · تغییرات کد و گرافیک هم‌زمان در Canvas اعمال می‌شوند</small><button data-action="versions">◷ نسخه‌های منتشرشده</button></header><div class="pb-canvas-scroll"><div class="pb-canvas-stage"><div class="pb-canvas-device"><iframe id="shbLiveFrame" title="پیش‌نمایش زندهٔ وب‌سایت"></iframe></div></div></div><footer class="pb-canvas-foot"><span>برای انتخاب مستقیم، روی هر عنصر سایت کلیک کنید.</span><span>Drag Component به داخل Canvas برای افزودن در محل انتخاب‌شده.</span></footer></main><aside class="pb-right"><header><span>Properties</span><button data-action="a11y">♿ ${a11yIssues().length || '✓'}</button></header><div class="pb-properties" id="shbProperties"></div></aside></div><section class="pb-code-dock"><header><div class="pb-code-tabs"><button class="on" data-action="code-tab" data-code-tab="structure">Structure</button><button data-action="code-tab" data-code-tab="css">CSS</button><button data-action="code-tab" data-code-tab="json">JSON</button></div><span id="shbCodeStatus">همگام با Canvas</span><button data-action="format-code">مرتب‌سازی کد</button></header><textarea id="shbCodeEditor" dir="ltr" spellcheck="false" aria-label="ویرایشگر کد همگام"></textarea></section><div class="pb-context" id="shbContext" hidden></div><dialog class="pb-versions" id="shbVersions"><header><b>Version History</b><button data-action="close-versions">×</button></header><div id="shbVersionRows"></div></dialog><dialog class="pb-versions pb-drafts-dialog" id="shbDrafts"><header><div><b>بایگانی پیش‌نویس‌ها</b><small>نسخه‌های متفاوت را نگه دارید و بعداً ادامه دهید یا منتشر کنید.</small></div><button data-action="close-drafts">×</button></header><div class="pb-draft-create"><button data-action="checkpoint">＋ ذخیره Draft فعلی در بایگانی</button></div><div id="shbDraftRows"></div></dialog></section>`; }
  function showVersions() { const dialog = state.root.querySelector('#shbVersions'); const rows = state.root.querySelector('#shbVersionRows'); if (!dialog || !rows) return; rows.innerHTML = state.versions.length ? state.versions.map(v => `<article><div><b>Version ${esc(v.version_number)}</b><small>${esc(v.created_at || '')}${v.change_note ? ' · ' + esc(v.change_note) : ''}</small></div><button data-action="restore-version" data-id="${esc(v.id)}">بازگردانی به Draft</button></article>`).join('') : '<p class="pb-empty">هنوز نسخهٔ منتشرشده‌ای وجود ندارد.</p>'; dialog.showModal(); }
  function showContext(event, kind, targetId) { event.preventDefault(); const menu = state.root.querySelector('#shbContext'); if (!menu) return; menu.hidden = false; menu.style.left = `${Math.min(event.clientX, window.innerWidth - 210)}px`; menu.style.top = `${Math.min(event.clientY, window.innerHeight - 240)}px`; menu.innerHTML = `<button data-action="duplicate">Duplicate</button><button data-action="copy">Copy</button><button data-action="paste">Paste</button><button data-action="rename">Rename</button><button data-action="save-component">Save as Component</button><button data-action="delete">Delete</button>`; if (kind === 'block') selectBlock(targetId); }
  function bind() {
    state.root.addEventListener('click', event => {
      const iconChoice = event.target.closest('[data-pb-icon]');
      if (iconChoice) { const block = selectedBlock(); if (block?.type === 'icon') mutate(() => { block.content ||= {}; block.content.icon = iconChoice.dataset.pbIcon; }); return; }
      const button = event.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action;
      if (action === 'undo') undo(); else if (action === 'redo') redo(); else if (action === 'device') setDevice(button.dataset.device); else if (action === 'add') addBlock(button.dataset.type); else if (action === 'select-block') selectBlock(button.dataset.id); else if (action === 'select-global') { state.selected = { kind: 'global', id: button.dataset.id }; refreshPanels(); setTimeout(showResizeForSelection, 20); } else if (action === 'page') { state.page = button.dataset.page; state.selected = null; refreshPanels(); changeFrame(); }
      else if (action === 'duplicate') duplicateSelected(); else if (action === 'copy') copySelected(); else if (action === 'paste') pasteSelected(); else if (action === 'delete') removeSelected(); else if (action === 'save-component') saveAsComponent(); else if (action === 'rename') { const item = selectedBlock() || selectedOverride(); const name = item && prompt('نام جدید:', item.name || ''); if (name) mutate(() => item.name = name.slice(0, 80)); }
      else if (action === 'save') saveDraft(); else if (action === 'publish') publish(); else if (action === 'preview') { postPreview(); notice('✓ Canvas اکنون Draft زنده را نمایش می‌دهد'); } else if (action === 'pull-live') pullLatestPublished(); else if (action === 'drafts') openDraftArchive(); else if (action === 'checkpoint') { const name = prompt('نام این پیش‌نویس:', `پیش‌نویس ${new Date().toLocaleString('fa-IR')}`); if (name) { checkpoint(name); openDraftArchive(); } } else if (action === 'load-draft') loadArchivedDraft(button.dataset.id); else if (action === 'delete-draft') deleteArchivedDraft(button.dataset.id); else if (action === 'close-drafts') state.root.querySelector('#shbDrafts')?.close(); else if (action === 'code-tab') { state.codeTab = button.dataset.codeTab || 'structure'; state.codeError = ''; syncCodeDock(true); } else if (action === 'format-code') syncCodeDock(true); else if (action === 'versions') showVersions(); else if (action === 'close-versions') state.root.querySelector('#shbVersions')?.close(); else if (action === 'restore-version') restoreVersion(button.dataset.id); else if (action === 'a11y') { const issues = a11yIssues(); notice(issues.length ? issues.join(' | ') : '✓ هشدار پایهٔ دسترس‌پذیری وجود ندارد'); }
      else if (action === 'saved-component') { const entry = state.document.components.find(x => x.id === button.dataset.id); if (entry?.block) mutate(() => { const next = clone(entry.block); next.id = id('block'); next.name = `${entry.name} — جدید`; currentPage().blocks.push(next); state.selected = { kind: 'block', id: next.id }; }); }
      else if (action === 'asset') { const block = selectedBlock(); const asset = state.document.assets.find(x => x.id === button.dataset.id); if (block?.type === 'image' && asset) mutate(() => block.content.image = asset.url); else notice('ابتدا یک Image Component را انتخاب کنید'); }
      state.root.querySelector('#shbContext')?.setAttribute('hidden', '');
    });
    state.root.addEventListener('input', event => { if (event.target.id === 'shbCodeEditor') queueCodeApply(event.target.value); else handleProperty(event); }); state.root.addEventListener('change', event => { if (event.target.id !== 'shbCodeEditor') handleProperty(event); if (event.target.id === 'shbAssetInput') uploadAsset(event.target); });
    state.root.addEventListener('dragstart', event => { const create = event.target.closest('[data-shb-create]'); const layer = event.target.closest('[data-shb-layer]'); if (create) event.dataTransfer?.setData('application/x-shb-type', create.dataset.shbCreate); if (layer) event.dataTransfer?.setData('application/x-shb-layer', layer.dataset.shbLayer); });
    state.root.addEventListener('dragover', event => { if (event.target.closest('#shbLayers')) event.preventDefault(); });
    state.root.addEventListener('drop', event => { const row = event.target.closest('[data-shb-layer]'); const moving = event.dataTransfer?.getData('application/x-shb-layer'); if (!row || !moving || moving === row.dataset.shbLayer) return; event.preventDefault(); mutate(() => { const list = currentPage().blocks; const from = list.findIndex(x => x.id === moving), to = list.findIndex(x => x.id === row.dataset.shbLayer); if (from >= 0 && to >= 0) list.splice(to, 0, list.splice(from, 1)[0]); }); });
    state.root.addEventListener('contextmenu', event => { const row = event.target.closest('[data-shb-layer]'); if (row) showContext(event, 'block', row.dataset.shbLayer); });
    state.root.querySelector('.pb-side-tabs').addEventListener('click', event => { const tab = event.target.closest('[data-pb-tab]'); if (!tab) return; state.root.querySelectorAll('[data-pb-tab]').forEach(x => x.classList.toggle('on', x === tab)); refreshPanels(); });
    const f = frame(); f.addEventListener('load', () => { state.frameReady = true; installPicker(); postPreview(); fitCanvas(); setTimeout(installPicker, 80); });
    if (window.ResizeObserver) { const canvasObserver = new ResizeObserver(() => fitCanvas()); const scroll = state.root.querySelector('.pb-canvas-scroll'); if (scroll) canvasObserver.observe(scroll); } else window.addEventListener('resize', fitCanvas);
    window.addEventListener('message', event => {
      if (!state.root?.isConnected || event.source !== frame()?.contentWindow || event.origin !== frameOrigin() || !event.data) return;
      if (event.data.type === 'estakhrjo:builder-ready') { postPreview(); frame()?.contentWindow?.postMessage({ type: 'estakhrjo:builder-editor-mode', enabled: true }, frameOrigin()); return; }
      if (event.data.type !== 'estakhrjo:builder-select') return;
      if (event.data.blockId) { selectBlock(String(event.data.blockId)); return; }
      const selector = String(event.data.selector || '').slice(0, 230); if (!selector) return; const isGlobal = event.data.isGlobal === true; const bucket = isGlobal ? (state.document.globals.overrides ||= []) : currentPage().overrides; let item = bucket.find(x => x.selector === selector);
      if (!item) { item = { id: id(isGlobal ? 'global' : 'legacy'), name: String(event.data.name || 'عنصر سایت').slice(0,70), selector, text: String(event.data.text || '').slice(0,3000), image: String(event.data.image || '').slice(0,320000), alt: String(event.data.alt || '').slice(0,180), style: {}, hidden: false, animation: {} }; mutate(() => bucket.push(item)); }
      state.selected = { kind: isGlobal ? 'global' : 'legacy', id: item.id }; refreshPanels();
    });
    document.addEventListener('click', event => { if (!state.root.contains(event.target)) state.root.querySelector('#shbContext')?.setAttribute('hidden', ''); });
    document.addEventListener('keydown', event => { if (!state.root?.isConnected || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelected(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteSelected(); } });
  }
  function handleProperty(event) {
    const el = event.target; const block = selectedBlock(), legacy = selectedOverride(); if (!block && !legacy) return;
    const value = el.type === 'checkbox' ? el.checked : el.value;
    const prop = el.dataset.pbContent || el.dataset.pbStyle || el.dataset.pbLegacy || el.dataset.pbAnimation || el.dataset.pbA11y || el.dataset.pbAdvanced;
    if (!prop && !el.dataset.pbHidden && !el.dataset.pbHideDevice && !el.dataset.pbLock) return;
    mutate(() => {
      const item = block || legacy;
      if (el.dataset.pbContent) { if (el.dataset.pbContent === 'name') item.name = String(value).slice(0, 80); else { item.content ||= {}; item.content[el.dataset.pbContent] = value; } }
      else if (el.dataset.pbStyle) { if (block) { item.responsive ||= { desktop: {}, tablet: {}, mobile: {} }; item.responsive[state.device] ||= {}; item.responsive[state.device][el.dataset.pbStyle] = String(value).slice(0, 100); } else { item.style ||= {}; item.style[el.dataset.pbStyle] = String(value).slice(0, 100); } }
      else if (el.dataset.pbLegacy) item[el.dataset.pbLegacy] = String(value).slice(0, el.dataset.pbLegacy === 'image' ? 320000 : 3000);
      else if (el.dataset.pbAnimation) { item.animation ||= {}; item.animation[el.dataset.pbAnimation] = ['duration', 'delay'].includes(el.dataset.pbAnimation) ? Math.max(0, Math.min(5000, Number(value) || 0)) : value; }
      else if (el.dataset.pbA11y) { item.accessibility ||= {}; item.accessibility[el.dataset.pbA11y] = String(value).slice(0, 180); }
      else if (el.dataset.pbAdvanced) item.className = String(value).replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
      else if (el.dataset.pbHidden) item.hidden = !!value; else if (el.dataset.pbHideDevice && block) { item.visibility ||= { desktop: true, tablet: true, mobile: true }; item.visibility[state.device] = !value; } else if (el.dataset.pbLock) item.locked = !!value;
    });
  }
  async function uploadAsset(input) { const file = input.files?.[0]; if (!file) return; if (!window.shImgOpt) return notice('بهینه‌ساز WebP هنوز آماده نیست'); const result = await window.shImgOpt(file, 'card'); if (!result) return; /* Builder assets are published into the static site, which is WebP-only, so a JPEG fallback cannot be accepted here. */ if (result.mime !== 'image/webp') return notice('این مرورگر WebP نمی‌سازد و رسانهٔ منتشرشده باید WebP باشد. از یک مرورگر دسکتاپ استفاده کنید یا فایل WebP آماده بارگذاری کنید.'); mutate(() => state.document.assets.push({ id: id('asset'), name: result.filename, url: result.url, width: result.w, height: result.h, mime: result.mime })); input.value = ''; notice('✓ رسانه به کتابخانه Draft افزوده شد'); }
  async function mount(root) {
    if (!root) return; state.root = root; root.innerHTML = shell(); bind(); refreshPanels();
    const c = cloud(); let remote = null;
    try { if (c?.active && c.getPageBuilder) remote = await c.getPageBuilder(); } catch (error) { notice('⚠️ Draft ابری خوانده نشد: ' + error.message); }
    const local = (() => { try { return JSON.parse(localStorage.getItem('sh_page_builder_draft') || 'null'); } catch (_) { return null; } })();
    state.document = normalise(remote?.draft || local || freshDocument()); state.versions = Array.isArray(remote?.versions) ? remote.versions : []; state.archives = readArchives(); state.savedAt = remote?.updated_at ? 'ابری' : local ? 'محلی' : '';
    refreshPanels(); syncCodeDock(true); changeFrame(); loadVersions();
  }
  window.SH_PAGE_BUILDER = { mount, defaults: freshDocument };
})();
