/* =====================================================
   استخر جو | ESTAKHRJO Static Engine — SPA سمت کلاینت (فارسی RTL)
   داده: Supabase (اگر تنظیم شود) + فالبک داخلی
   ===================================================== */
(function () {
  'use strict';
  const innerHTML = 'innerHTML';
  let PAGE = document.body.dataset.page;
  const $ = document.getElementById('app');

  /* ---------- ابزارها ---------- */
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const toFa = v => (v === null || v === undefined ? '' : String(v).replace(/[0-9]/g, d => FA[+d]));
  const faNum = n => { n = Number(n) || 0; return toFa(n.toLocaleString('en-US')); };
  const money = n => (n === null || n === undefined ? '—' : faNum(n) + ' تومان');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = k => new URLSearchParams(location.search).get(k);
  const toasglass = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(t._tm); t._tm = setTimeout(() => t.style.opacity = 0, 2600); };
  window.toasglass = toasglass;
  const arrToLines = a => Array.isArray(a) ? a : (a || '').split(/[،,]/).map(x => x.trim()).filter(Boolean);
  const trunc = (s, n) => (s && s.length > n) ? s.slice(0, n) + '…' : (s || '');

  window.toggleTheme = function () {
    const h = document.documentElement;
    const t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', t);
    localStorage.setItem('estakhrjo-theme', t);
    syncThemeIc();
  };
  function syncThemeIc() {
    const ic = document.querySelector('.theme-ic');
    if (ic) ic.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  }
  syncThemeIc();

  /* ---------- لایه داده ---------- */
  let Pools = [], Coaches = [], Hydro = [], Products = [], Jobs = [], Events = [], Articles = [], Sessions = [], Reviews = [];
  let Suppliers = [], Availability = [], Resumes = [], CoachRequests = [], Courses = [], MemberAds = [];
  function seedData() {
    const d = window.ESTAKHRJO_DATA || {};
    Pools = (d.pools || []).map(p => ({ ...p, features: arrToLines(p.features) }));
    // مربیان دمو حذف شدند: فهرست مربیان فقط از اعضای واقعیِ منتشرشده
    // (اکشن public-profile-directory در member-auth) پر می‌شود — loadSupabase.
    Coaches = [];
    Hydro = (d.hydro || []).map(h => ({ ...h, full_name: h.full_name || h.name, services: arrToLines(h.services) }));
    Products = d.products || [];
    Jobs = d.jobs || [];
    Events = d.events || [];
    Articles = d.articles || [];
    Sessions = (d.sessions || []).map(s => ({ ...s, time: String(s.time).slice(0, 5) }));
    Reviews = d.reviews || [];
    Suppliers = (d.suppliers || []).map(s => ({ ...s, products: arrToLines(s.products), services: arrToLines(s.services) }));
    Availability = d.coach_availability || [];
    Resumes = (d.resumes || []).map(r => ({ ...r, skills: arrToLines(r.skills), certs: arrToLines(r.certs) }));
    CoachRequests = d.coach_requests || [];
    Courses = d.courses || [];
    MemberAds = (d.member_ads || []).map(a => ({ ...a, category: a.category || 'equipment' }));
  }
  seedData();

  // فهرست مربیان واقعی از دایرکتوری عمومی اعضا (همان اکشنی که صفحه‌های عمومی
  // اعضا را می‌سازد). بدون احراز هویت کار می‌کند و فقط اعضای «منتشرشده» با نقش
  // مربی را برمی‌گرداند. خروجی به ساختار coachCard نگاشت می‌شود و کارتِ آن به
  // صفحهٔ عمومی خود عضو لینک می‌دهد، نه coach.html دمو.
  function coachProfileUrl(username) {
    return 'https://estakhrjo.ir/public-profile.html?username=' + encodeURIComponent(String(username || '').replace(/^@/, ''));
  }
  function mapDirectoryCoach(m) {
    const uname = String(m.username || '').trim();
    return {
      id: 'm-' + uname, username: uname, member: true,
      full_name: m.name || '', name: m.name || '', city: m.city || '',
      tagline: m.tagline || '', verified: !!m.verified,
      image: m.avatar || '', gender: m.gender || '',
      stars: Number(m.stars || 0),
      exp_years: 0, hourly_rate: 0, hourly: 0, rating: 0, rate_count: 0, students: 0,
      specialties: [], levels: [], age_groups: [], certs: [], medals: [],
      featured: false, online: false, home_pool: false,
      published_at: m.published_at || '',
    };
  }
  async function fetchDirectoryCoaches() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return [];
    const res = await fetch(String(window.SUPABASE_URL).replace(/\/$/, '') + '/functions/v1/member-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: window.SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'public-profile-directory', roles: ['coach'] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error('directory:' + res.status);
    // چیدمان اصلی مربیان بر اساس رأی ستارهٔ کاربران؛ نمایش صفحه اصلی و
    // مربیان برتر همین ترتیب را می‌گیرند.
    const arr = (data.items || []).filter(it => it && it.username).map(mapDirectoryCoach);
    arr.sort((a, b) => (b.stars - a.stars) || String(b.published_at).localeCompare(String(a.published_at)));
    return arr;
  }
  // دریافت بستهٔ عمومی یک عضو (همان دیتای صفحهٔ public-profile) برای صفحهٔ
  // پروفایل مربی داخل ساختار سایت: توضیحات، محل‌های فعالیت و سانس‌های کاری.
  async function fetchMemberProfileBundle(username) {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) throw new Error('config');
    const res = await fetch(String(window.SUPABASE_URL).replace(/\/$/, '') + '/functions/v1/member-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: window.SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'public-profile-get', username: String(username || '').replace(/^@/, ''), source: 'coach-profile' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'دریافت اطلاعات مربی ناموفق بود');
    return data.profile || data;
  }

  async function loadSupabase() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;
    try {
      const h = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
      const get = async (table, q) => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q || ''}`, { headers: h });
        if (!r.ok) throw new Error(table + ':' + r.status);
        return r.json();
      };
      const [pools, coaches, hydro, products, jobs, events, articles, sessions, reviews] = await Promise.all([
        // Public narrow views only — base content tables are revoked for anon
        // (security migration 1404/07/08). The views pre-filter published rows.
        get('public_pools', 'select=*&order=rating.desc'),
        get('public_coaches', 'select=*&order=rating.desc'),
        get('public_hydro_specialists', 'select=*&order=rating.desc'),
        get('public_products', 'select=*&order=rating.desc'),
        get('public_jobs', 'select=*&order=id.desc'),
        get('public_events', 'select=*'),
        get('public_articles', 'select=*&order=id.desc'),
        get('public_sessions', 'select=*&order=date,time'),
        get('public_reviews', 'select=*&order=id.desc&limit=50'),
      ]);
      // Public v2 views are opt-in only after the RLS migration is verified.
      // Keeping this false prevents a half-deployed schema from generating 404s
      // or tempting a fallback to private content tables.
      if (window.ESTAKHRJO_PUBLIC_VIEWS_READY === true) try {
        const v2 = await Promise.all([
          // Never query content tables directly here. These privacy-safe views
          // are the browser's public data contract and deliberately omit PII.
          get('public_suppliers', 'select=*&order=featured.desc,rating.desc'),
          get('public_coach_availability', 'select=*&order=coach_id,weekday,start_time'),
          get('public_resumes', 'select=*&order=id.desc'),
          get('public_coach_requests', 'select=*&order=id.desc'),
          get('public_courses', 'select=*&order=start_date'),
        ]);
        if (v2[0] && v2[0].length) Suppliers = v2[0].map(s => ({ ...s, products: arrToLines(s.products), services: arrToLines(s.services) }));
        if (v2[1] && v2[1].length) Availability = v2[1];
        if (v2[2] && v2[2].length) Resumes = v2[2].map(r => ({ ...r, skills: arrToLines(r.skills), certs: arrToLines(r.certs) }));
        if (v2[3] && v2[3].length) CoachRequests = v2[3];
        if (v2[4] && v2[4].length) Courses = v2[4];
        try {
          const ma = await get('public_member_ads', 'select=*&order=featured.desc,id.desc');
          if (ma && ma.length) MemberAds = ma;
        } catch (e) { /* جدول آگهی‌ها اختیاری */ }
        // Design settings are intentionally exposed through a single shaped view.
        // They contain visual tokens only; private admin/site tables remain closed.
        try {
          const design = await get('public_design_system', 'select=setting_value,updated_at&limit=1');
          if (design && design[0] && design[0].setting_value && typeof designSystem !== 'undefined') {
            designSystem.apply(design[0].setting_value, true);
          }
        } catch (e) { /* طراحی پیش‌فرض محلی در نبود تنظیمات منتشرشده استفاده می‌شود */ }
      } catch (e) { console.warn('v2 tables not ready — seed data used', e); }
      Pools = pools.map(p => ({ ...p, features: arrToLines(p.features) }));
      // Merge the Iran-wide registry directory (1,100+ baseline pools) into the
      // listing. Claimed/enriched operational rows win; the rest show baseline
      // data only — no sessions and no prices until the owner joins and claims.
      try {
        // PostgREST caps responses at 1000 rows by default; paginate by code so
        // the whole directory (~1,137 active pools) arrives, and request only
        // the columns the listing uses to keep the payload small.
        // جنسیت/امکانات/ابعاد/بلد هم از ویو خوانده می‌شود؛ اگر محیطی هنوز
        // ویوی قدیمی داشته باشد، همان ستون‌های پایه بارگذاری می‌شود.
        const dirColsFull = 'code,name,name_latin,category,type,province_name,city_name,city_local,district,address,phone,lat,lon,gmaps_url,balad_url,image_path,thumb_path,claim_status,verified,gender,amenities,pool_length,pool_width,pool_depth';
        const dirColsBase = 'code,name,name_latin,category,type,province_name,city_name,city_local,district,address,phone,lat,lon,gmaps_url,image_path,thumb_path,claim_status,verified';
        const fetchDir = async cols => {
          const out = [];
          for (let offset = 0; ; offset += 1000) {
            const page = await get('public_directory_pools', 'select=' + cols + '&order=code&limit=1000&offset=' + offset);
            out.push(...page);
            if (page.length < 1000) break;
          }
          return out;
        };
        const dir = await fetchDir(dirColsFull).catch(() => fetchDir(dirColsBase));
        const byCode = new Map(Pools.filter(p => p.registry_code).map(p => [p.registry_code, p]));
        const mapped = (dir || []).map(d => {
          const op = byCode.get(d.code);
          if (op) return { ...op, code: d.code, claim_status: d.claim_status, province_name: d.province_name, gmaps_url: d.gmaps_url, lat: d.lat, lon: d.lon, gender: op.gender || registryGender(d.gender), amenities: op.amenities || String(d.amenities || ''), pool_length: op.pool_length || d.pool_length || '', pool_width: op.pool_width || d.pool_width || '', pool_depth: op.pool_depth || d.pool_depth || '', balad_url: op.balad_url || d.balad_url || '' };
          return {
            id: d.code, code: d.code, registry: true, claim_status: d.claim_status || 'unclaimed',
            name: d.name, city: d.city_name || d.city_local || '—', district: d.district || '', address: d.address || '',
            phone: d.phone || '', kind: d.category || 'استخر شنا', type: d.type || '', gender: registryGender(d.gender),
            amenities: String(d.amenities || ''), pool_length: d.pool_length || '', pool_width: d.pool_width || '', pool_depth: d.pool_depth || '', balad_url: d.balad_url || '',
            olympic: false, hydro: false, sauna: false, jacuzzi: false, kids: false,
            price_from: null, rating: null, rate_count: 0, open_now: null, occupancy: null, views: 0,
            image: d.thumb_path ? registryImageUrl(d.thumb_path) : REGISTRY_DEFAULT_THUMB,
            image_full: d.image_path ? registryImageUrl(d.image_path) : REGISTRY_DEFAULT_FULL,
            gmaps_url: d.gmaps_url || '', lat: d.lat, lon: d.lon,
            verified: !!d.verified, featured: false, features: [], description: '',
            province_name: d.province_name || '',
          };
        });
        const legacy = Pools.filter(p => !p.registry_code);
        Pools = [...mapped, ...legacy];
      } catch (e) { console.warn('registry directory unavailable — operational pools only', e); }
      Coaches = coaches.map(c => ({ ...c, full_name: c.full_name || c.name, hourly_rate: c.hourly_rate || c.hourly, specialties: arrToLines(c.specialties), levels: arrToLines(c.levels), age_groups: arrToLines(c.age_groups), certs: arrToLines(c.certs), medals: arrToLines(c.medals) }));
      // فهرست رسمی مربیان = اعضای واقعیِ سایت با نقش «مربی» که صفحهٔ عمومی‌شان
      // منتشر شده است. این مرحله جایگزین هر دادهٔ قدیمی/نمایشی است: اگر دایرکتوری
      // در دسترس باشد، همان مرجع قطعی است و خوانش قدیمیِ ویو بازنویسی می‌شود.
      try {
        const memberCoaches = await fetchDirectoryCoaches();
        Coaches = memberCoaches;
      } catch (e) {
        console.warn('دایرکتوری مربیان در دسترس نیست — خروجی ویو حفظ می‌شود', e);
      }
      Hydro = hydro.map(h2 => ({ ...h2, services: arrToLines(h2.services) }));
      Products = products; Jobs = jobs; Events = events; Articles = articles; Reviews = reviews;
      Sessions = sessions.map(s => ({ ...s, time: String(s.time).slice(0, 5), pool_name: '', pool_image: '', city: '' }));
      const pMap = Object.fromEntries(Pools.map(p => [p.id, p]));
      Sessions.forEach(s => { const p = pMap[s.pool_id]; if (p) { s.pool_name = p.name; s.pool_image = p.image; s.city = p.city; } });
      const cMap = Object.fromEntries(Coaches.map(c => [c.id, c]));
      Sessions.forEach(s => { const c = cMap[s.coach_id]; if (c) s.coach_name = c.full_name; });
      return true;
    } catch (e) { console.warn('Supabase fallback → داده داخلی', e); return false; }
  }

  /* ---------- کاربر لوکال (دمو) ---------- */
  /* Cross-host entry points. They stay relative here so a single-origin
     deploy still works; scripts/build-sites.mjs rewrites each one to an
     absolute URL on the host that actually serves it. */
  const ADMIN_CONSOLE_URL = 'https://admine.estakhrjo.ir/console.html';
  const MEMBER_PANEL_URL = 'dashboard.html';
  const SITE_URL = 'https://estakhrjo.ir/index.html';

  const me = {
    get: () => { try { return JSON.parse(localStorage.getItem('sh_user')); } catch (e) { return null; } },
    set: u => localStorage.setItem('sh_user', JSON.stringify(u)),
    clear: () => { localStorage.removeItem('sh_user'); renderNav(); },
  };
  window.shLogout = () => { const cloud = window.SH_CLOUD_AUTH; if (cloud && cloud.active) cloud.logout(); me.clear(); location.href = 'https://estakhrjo.ir/index.html'; };

  /* An avatar is either a short glyph or an image. Four panel chrome
     locations used to print it as text unconditionally. Once a member uploaded
     a real image, the value became `data:image/...;base64,<thousands of chars>`
     and that entire payload appeared as a long white "token" beside/above the
     member name. Keep the type decision in one place so this cannot recur. */
  function avatarMarkup(value, alt = '') {
    const raw = String(value || '').trim();
    const image = /^(?:data:image\/(?:webp|jpeg|png);base64,[a-z0-9+/=\s]+|https:\/\/[^\s]+)$/i.test(raw);
    if (image) return `<img class="user-avatar-img" src="${esc(raw)}" alt="${esc(alt)}">`;
    // Emoji and short initials are fine. Never let an arbitrary long string
    // become visible chrome again.
    return esc(raw && raw.length <= 12 ? raw : '🙂');
  }

  function renderNav() {
    const u = me.get(); const el = document.getElementById('navAuth');
    if (!el) return;
    if (u) {
      el.innerHTML = `<a href="dashboard.html" class="nav-bell" title="${esc(u.name)}"><span class="avatar">${avatarMarkup(u.avatar, u.name)}</span></a>
                      <a href="#" onclick="shLogout();return false" class="btn btn-ghost btn-sm">خروج</a>`;
    } else {
      el.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">ورود / ثبت‌نام</a>`;
    }
  }
  renderNav();

  /* ---------- علاقه‌مندی (لوکال) ---------- */
  const fav = {
    list: () => { try { return JSON.parse(localStorage.getItem('sh_favs')) || []; } catch (e) { return []; } },
    has: (t, id) => fav.list().some(f => f.t === t && String(f.id) === String(id)),
    toggle: (t, id) => {
      let l = fav.list();
      const i = l.findIndex(f => f.t === t && String(f.id) === String(id));
      if (i >= 0) { l.splice(i, 1); toasglass('از علاقه‌مندی حذف شد'); }
      else { l.push({ t, id }); toasglass('❤️ به علاقه‌مندی افزوده شد'); }
      localStorage.setItem('sh_favs', JSON.stringify(l));
      if (typeof rerender === 'function') rerender();
    },
  };
  window.shFav = fav.toggle;

  /* ---------- بلیت لوکال ---------- */
  function makeBooking(s, qty) {
    const u = me.get();
    if (!u) { toasglass('ابتدا وارد شوید'); setTimeout(() => location.href = 'login.html', 900); return; }
    if ((s.capacity - s.booked) < qty) { toasglass('⚠️ ظرفیت کافی نیست'); return; }
    const p = Pools.find(x => x.id === s.pool_id) || {};
    const b = {
      code: 'SH' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      pool_name: p.name || s.pool_name || 'استخر', pool_image: p.image || s.pool_image || '🏊',
      city: p.city || '', date: s.date, time: s.time, kind: s.kind, qty, total: s.price * qty,
      coach: s.coach_name || null, created: new Date().toLocaleString('fa-IR'), status: 'paid',
    };
    const all = JSON.parse(localStorage.getItem('sh_bookings') || '[]'); all.unshift(b);
    localStorage.setItem('sh_bookings', JSON.stringify(all));
    s.booked = Math.min(s.capacity, s.booked + qty);
    location.href = 'https://estakhrjo.ir/ticket.html?code=' + b.code + '&new=1';
  }
  window.shBook = (sid, qty) => makeBooking(Sessions.find(s => s.id === sid), qty || 1);

  /* ============================================================
     سیستم کنترل نمایش و فروش — مدیر سیستم تعیین می‌کند هر بخش:
     نمایش قیمت؟ اطلاعات تماس؟ رزرو/خرید مستقیم؟ (سراسری + per-user)
     ============================================================ */
  const CFG_SECTIONS = [
    ['pools', '🏊 استخرها'], ['coaches', '🏆 مربیان'], ['courses', '📚 دوره‌ها'],
    ['market', '🛍️ فروشگاه'], ['ads', '📢 آگهی‌ها'], ['suppliers', '🏭 تأمین‌کنندگان'],
  ];
  const CFG_KEYS = [['price', '💰 قیمت'], ['contact', '📞 تماس'], ['sell', '🛒 رزرو/خرید']];
  const siteCfg = {
    DEF: { pools: { price: 1, contact: 1, sell: 0 }, coaches: { price: 1, contact: 1, sell: 0 }, courses: { price: 1, contact: 1, sell: 0 }, market: { price: 1, contact: 1, sell: 0 }, ads: { price: 1, contact: 1, sell: 0 }, suppliers: { price: 1, contact: 1, sell: 0 } },
    get() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('sh_site_cfg') || '{}'); } catch (e) {}
      const out = { sections: {}, users: saved.users || {} };
      Object.keys(this.DEF).forEach(k => { out.sections[k] = Object.assign({}, this.DEF[k], (saved.sections || {})[k]); });
      return out;
    },
    save(c) { try { localStorage.setItem('sh_site_cfg', JSON.stringify(c)); } catch (e) {} },
    toggle(sec, key) { const c = this.get(); c.sections[sec][key] = c.sections[sec][key] ? 0 : 1; this.save(c); },
    cycle(user, sec, key) {
      const c = this.get();
      c.users[user] = c.users[user] || {}; c.users[user][sec] = c.users[user][sec] || {};
      const cur = c.users[user][sec][key];
      if (cur === undefined) c.users[user][sec][key] = 1;
      else if (cur === 1) c.users[user][sec][key] = 0;
      else delete c.users[user][sec][key];
      this.save(c);
    },
    val(sec, key, owner) {
      const c = this.get();
      const ov = owner && c.users[owner] && c.users[owner][sec];
      if (ov && ov[key] !== undefined) return ov[key];
      return (c.sections[sec] || {})[key] !== undefined ? c.sections[sec][key] : 1;
    },
    mode(sec, owner) {
      if (this.val(sec, 'sell', owner)) return 'sell';
      if (this.val(sec, 'price', owner)) return 'price';
      return 'contact';
    },
  };
  const cfgPrice = (sec, owner) => !!siteCfg.val(sec, 'price', owner);
  const cfgContact = (sec, owner) => !!siteCfg.val(sec, 'contact', owner);
  const cfgSell = (sec, owner) => !!siteCfg.val(sec, 'sell', owner);
  const OWNER_POOL = ['سینا محمدی', 'مجموعه آکوا پارس', 'باشگاه موج نوین', 'شرکت نگین آب', 'موسسه دلفین‌سان', 'هتل المپیک پارس', 'آفتاب‌گردان آبادان', 'توسعه تفریحی کیش'];
  const poolOwnerName = p => {
    let n = p && (p.owner_id != null ? p.owner_id : p.id);
    if (typeof n !== 'number' || !isFinite(n)) n = String(n == null ? '0' : n).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return OWNER_POOL[Math.abs(Math.round(n)) % OWNER_POOL.length];
  };
  function sellBtn(sec, owner, buyHtml, contactHtml, altHtml) {
    if (cfgSell(sec, owner)) return buyHtml;
    if (cfgContact(sec, owner) && contactHtml) return contactHtml;
    return altHtml || '<span class="mini-tag" style="opacity:.75;cursor:default">🔒 به‌زودی فعال می‌شود</span>';
  }
  /* حساب‌های اولیهٔ موجود در سایت؛ در نخستین اجرا برای هرکدام نام کاربری و رمز ساخته می‌شود. */
  const AUTH_ROLES = {
    demo: { label: 'عضو', icon: '🙂', sections: ['site'] },
    pool: { label: 'مالک / مدیر استخر', icon: '🏢', sections: ['pools'] },
    coach: { label: 'مربی شنا', icon: '🏆', sections: ['coaches', 'courses'] },
    supplier: { label: 'تأمین‌کننده B2B', icon: '🏭', sections: ['suppliers', 'market'] },
    hydro: { label: 'متخصص هیدروتراپی', icon: '🩺', sections: ['hydro'] },
    admin: { label: 'مدیر سیستم', icon: '👑', sections: ['management', 'control'] },
  };
  const FA_LATIN = { 'آ':'a','ا':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'v','ه':'h','ی':'y','ئ':'y','ة':'h','ؤ':'v','ۀ':'h','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
  const latinize = value => String(value || '').toLowerCase().split('').map(ch => FA_LATIN[ch] || (/[a-z0-9]/.test(ch) ? ch : ' ')).join('');
  const slugLogin = value => latinize(value).trim().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  const accountIdFrom = value => 'acc-' + String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 42);
  const nextSmartUsername = (name, role, existing) => {
    const prefix = ({ pool:'pool', coach:'coach', supplier:'supply', hydro:'hydro', admin:'admin', demo:'member' })[role] || 'member';
    const base = slugLogin(name).replace(/\./g, '-') || prefix;
    const stem = base.startsWith(prefix) ? base : prefix + '-' + base;
    const taken = new Set((existing || []).map(x => String(x.username || '').toLowerCase()));
    let out = stem.slice(0, 24), n = 1;
    while (taken.has(out.toLowerCase())) out = stem.slice(0, 20) + '-' + String(++n).padStart(2, '0');
    return out;
  };
  const isStrongPassword = value => {
    const p = String(value || '');
    return p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
  };
  const smartPassword = () => {
    const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_'];
    const all = groups.join(''); const random = n => {
      if (window.crypto && window.crypto.getRandomValues) { const bytes = new Uint32Array(1); window.crypto.getRandomValues(bytes); return bytes[0] % n; }
      return Math.floor(Math.random() * n);
    };
    const raw = groups.map(chars => chars[random(chars.length)]);
    while (raw.length < 16) raw.push(all[random(all.length)]);
    for (let i = raw.length - 1; i > 0; i--) { const j = random(i + 1); [raw[i], raw[j]] = [raw[j], raw[i]]; }
    return raw.join('');
  };
  // Local credentials are development-only. Production authentication must use Supabase Auth.
  const ALLOW_LOCAL_AUTH_FALLBACK = /^(localhost|127\.0\.0\.1|::1)$/.test(String(location.hostname || ''));
  function legacyAccountSeeds() {
    const seeds = [{ id: 'acc-system-admin', legacyId: 'system-admin', username: 'admin', password: smartPassword(), name: 'ادمین سوئیم‌هاب', u: 'admin', role: 'مدیر سیستم', avatar: '👑', city: 'تهران', status: 'active', subscription: 'سازمانی', createdAt: '2026-01-01T00:00:00.000Z' }];
    const add = (name, u, key) => {
      if (!name || seeds.some(x => x.legacyId === key)) return;
      const def = AUTH_ROLES[u] || AUTH_ROLES.demo;
      seeds.push({ id: accountIdFrom(key), legacyId: key, username: nextSmartUsername(name, u, seeds), password: smartPassword(), name, u, role: def.label, avatar: def.icon, city: 'تهران', status: 'active', subscription: u === 'admin' ? 'سازمانی' : 'پایه', createdAt: new Date().toISOString() });
    };
    const seen = new Set();
    Pools.filter(p => !p.registry).forEach((p, i) => { const name = poolOwnerName(p); if (!seen.has(name)) { seen.add(name); add(name, 'pool', 'legacy-pool-' + i + '-' + slugLogin(name)); } });
    Coaches.filter(c => c.full_name).slice(0, 4).forEach((c, i) => add(c.full_name, 'coach', 'legacy-coach-' + i + '-' + slugLogin(c.full_name)));
    Suppliers.filter(s => s.name).slice(0, 3).forEach((s, i) => add(s.name, 'supplier', 'legacy-supplier-' + i + '-' + slugLogin(s.name)));
    return seeds;
  }
  function cfgAccounts() {
    return authAccounts.get().map(a => ({ id: a.id, name: a.name, username: a.username, password: a.password, role: a.role, u: a.u, ic: a.avatar || (AUTH_ROLES[a.u] || AUTH_ROLES.demo).icon, secs: (AUTH_ROLES[a.u] || AUTH_ROLES.demo).sections, status: a.status, plan: a.subscription, gender: a.gender || '' }));
  }

  /* ---------- جنسیت، امکانات، ابعاد و مسیریابی (دادهٔ رجیستری) ---------- */
  // مقادیر فارسی دیتابیس دست‌نخورده می‌ماند؛ نگاشت به کد فقط در مرورگر است.
  function registryGender(g) {
    const v = String(g || '').trim();
    if (!v || v === 'نامشخص' || v === '—') return '';
    if (v.includes('آقایان') && v.includes('بانوان')) return 'mixed';
    if (v.includes('آقایان')) return 'men';
    if (v.includes('بانوان')) return 'women';
    return '';
  }
  const GENDER_FA = { men: 'آقایان', women: 'بانوان', mixed: 'آقایان و بانوان' };
  const genderTag = g => (g && GENDER_FA[g]) ? `<span class="tag" style="background:${g === 'women' ? '#fce7f3;color:#db2777' : g === 'men' ? '#dbeafe;color:#1d4ed8' : 'rgba(6,182,212,.14);color:#22d3ee'}">${GENDER_FA[g]}</span>` : '';
  const AMEN_ICONS = [['سونا خشک', '🧖'], ['سونا بخار', '💨'], ['جکوزی', '🛁'], ['حوضچه آب سرد', '🥶'], ['ماساژ', '💆'], ['حمام سنتی', '🏘️'], ['بوفه', '🍽️'], ['رستوران', '🍽️'], ['کافه', '☕'], ['استخر کودکان', '👶'], ['فروشگاه', '🛍️'], ['پارکینگ', '🅿️'], ['سرسره پیچشی', '🎠'], ['سرسره', '🎢'], ['آب درمانی', '🩺'], ['استخر موج', '🌊'], ['ساحل', '🏖️'], ['اسلاید', '🎢']];
  function amenList(p) {
    return String((p && p.amenities) || '').split(/[،,]/).map(v => v.replace(/\u200c/g, ' ').trim()).filter(Boolean);
  }
  function amenTag(a) {
    for (const pair of AMEN_ICONS) if (a.includes(pair[0])) return pair[1] + ' ' + a;
    return '✨ ' + a;
  }
  function poolDims(p) {
    const dims = [];
    if (p.pool_length) dims.push(['طول', toFa(p.pool_length) + ' متر']);
    if (p.pool_width) dims.push(['عرض', toFa(p.pool_width) + ' متر']);
    if (p.pool_depth) dims.push(['عمق', toFa(p.pool_depth) + ' متر']);
    return dims;
  }
  function registryCardTags(p) {
    const amens = amenList(p);
    let html = amens.slice(0, 2).map(a => `<span class="mini-tag">${esc(amenTag(a))}</span>`).join('');
    if (amens.length > 2) html += `<span class="mini-tag">+${toFa(amens.length - 2)} مورد دیگر</span>`;
    if (p.pool_length) html += `<span class="mini-tag">📐 ${toFa(p.pool_length)} متر</span>`;
    return html;
  }
  const NAV_APPS = [
    { key: 'neshan', name: 'نشان', desc: 'نمایش روی نقشهٔ نشان', logo: 'assets/nav/neshan.webp', title: 'باز کردن در اپ نشان' },
    { key: 'balad', name: 'بلد', desc: 'نقشهٔ بلد', logo: 'assets/nav/balad.webp', title: 'باز کردن در بلد' },
    { key: 'gmaps', name: 'گوگل مپ', desc: 'مسیریابی از موقعیت شما', logo: 'assets/nav/gmaps.webp', title: 'مسیریابی گوگل‌مپ' },
    { key: 'waze', name: 'ویز', desc: 'شروع مسیریابی', logo: 'assets/nav/waze.webp', title: 'شروع مسیریابی در ویز' }
  ];
  function poolNavLinks(p) {
    if (!p || p.lat == null || p.lon == null) return [];
    const urls = {
      neshan: 'https://nshn.ir/?lat=' + p.lat + '&lng=' + p.lon,
      balad: p.balad_url || ('https://balad.ir/search/' + p.lat + ',' + p.lon),
      gmaps: 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lon,
      waze: 'https://waze.com/ul?ll=' + p.lat + ',' + p.lon + '&navigate=yes'
    };
    return NAV_APPS.map(a => ({ ...a, url: urls[a.key] }));
  }

  /* ---------- کارت‌ها ---------- */
  const occClass = o => o > 70 ? 'high' : (o > 45 ? 'mid' : '');
  function poolCard(p) {
    return `<div class="card anim-up">
      <div class="card-img">
        <span class="bg" style="background:linear-gradient(135deg,var(--brand-l),var(--card2))">${esc(p.image && /^(https?:|data:)/.test(p.image) ? '🏊' : (p.image || '🏊'))}${p.image && /^(https?:|data:)/.test(p.image) ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()">` : ''}</span>
        ${p.registry ? '<span class="card-live off" style="background:rgba(245,158,11,.16);color:#f59e0b">در انتظار تکمیل مجموعه</span>' : p.open_now ? '<span class="card-live"><span class="dot"></span>الان باز است</span>' : '<span class="card-live off"><span class="dot"></span>بسته است</span>'}
        ${p.verified ? '<span class="card-ver">✓ تأییدشده</span>' : ''}
        <button class="card-fav ${fav.has('pool', p.id) ? 'faved' : ''}" onclick="shFav('pool','${p.id}')">${fav.has('pool', p.id) ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <div class="card-name">
          <a href="pool.html?${p.registry ? 'code=' + encodeURIComponent(p.code) : 'id=' + p.id}" class="link">${esc(p.name)}</a>
          ${genderTag(p.gender)}
        </div>
        <div class="card-loc">📍 ${esc(p.city)} — ${esc(p.district || '')}</div>
        ${p.rating == null ? '<div class="card-rate"><span class="rate-cnt">جدید — هنوز نقدی ثبت نشده</span></div>' : `<div class="card-rate"><span class="stars">★★★★★</span><span class="rate-num">${toFa(p.rating || 0)}</span><span class="rate-cnt">(${toFa(p.rate_count || 0)})</span></div>`}
        <div class="card-tags">
          ${p.olympic ? '<span class="mini-tag">🏟️ المپیک</span>' : ''}${p.sauna ? '<span class="mini-tag">🧖 سونا</span>' : ''}${p.jacuzzi ? '<span class="mini-tag">🛁 جکوزی</span>' : ''}${p.hydro ? '<span class="mini-tag">🩺 هیدروتراپی</span>' : ''}${p.kids ? '<span class="mini-tag">👶 کودک</span>' : ''}${p.registry ? registryCardTags(p) : ''}
        </div>
        ${p.occupancy == null ? `<div style="font-size:11px;color:var(--muted)">🏷️ ${esc(p.kind || '')}${p.type ? ' • ' + esc(p.type) : ''}</div>` : `<div style="font-size:11px;color:var(--muted)">👥 اشغال ${toFa(p.occupancy || 0)}٪
          <div class="occ-bar"><span class="occ-fill ${occClass(p.occupancy || 0)}" style="width:${p.occupancy || 0}%"></span></div>
        </div>`}
        <div class="card-foot">
          ${p.registry ? `<span class="price-lock">🗓️ بدون سانس فعال</span>
          <a href="https://estakhrjo.ir/pool.html?code=${encodeURIComponent(p.code)}" class="btn btn-ghost btn-sm">مشاهده</a>${p.phone ? `<a href="tel:${esc(p.phone)}" class="btn btn-ghost btn-sm">📞 تماس</a>` : ''}` : `${cfgPrice('pools', poolOwnerName(p)) ? `<span class="price">${money(p.price_from)} <small>شروع از / نفر</small></span>` : `<span class="price-lock">💰 قیمت با تماس</span>`}
          ${sellBtn('pools', poolOwnerName(p), `<a href="https://estakhrjo.ir/pool.html?id=${p.id}" class="btn btn-primary btn-sm">رزرو</a>`, p.phone ? `<a href="tel:${esc(p.phone)}" class="btn btn-ghost btn-sm">📞 تماس</a>` : '', `<a href="https://estakhrjo.ir/pool.html?id=${p.id}" class="btn btn-ghost btn-sm">مشاهده</a>`)}`}
        </div>
      </div>
    </div>`;
  }
  /* ---------- دایرکتوری رجیستری: تصویر و صفحهٔ جزئیات پایه ---------- */
  function registryImageUrl(path) {
    return (window.SUPABASE_URL || '') + '/storage/v1/object/public/registry-pools/' + String(path || '').replace(/^\/+/, '');
  }
  /* تصویر پیش‌فرض برند — تا زمانی که مالک مجموعه عکس خود را آپلود کند */
  const REGISTRY_DEFAULT_THUMB = registryImageUrl('images/defaults/pool-default-thumb.webp');
  const REGISTRY_DEFAULT_FULL = registryImageUrl('images/defaults/pool-default.webp');
  function registryPoolPage(p) {
    const mapUrl = p.gmaps_url || (p.lat && p.lon ? 'https://www.google.com/maps?q=' + p.lat + ',' + p.lon : '');
    const hero = p.image_full || p.image;
    const media = hero
      ? `<img src="${esc(hero)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🏊'}))">`
      : '🏊';
    return `
    <div class="detail-hero"><div class="detail-hero-bg">${media}</div></div>
    <div class="container" style="padding-top:0">
      <div class="panel" style="margin-bottom:26px">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:16px">
          <div style="flex:1;min-width:250px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
              <h1 style="font-size:clamp(20px,3vw,27px)">${esc(p.name)}</h1>
              <span class="tag" style="background:rgba(245,158,11,.16);color:#f59e0b">در انتظار تکمیل توسط مجموعه</span>
              ${genderTag(p.gender)}
            </div>
            <p style="color:var(--muted);font-size:13.5px">📍 ${esc(p.province_name || '')} — ${esc(p.city || '')}${p.district ? ' — ' + esc(p.district) : ''}${p.address ? ' — ' + esc(p.address) : ''}</p>
            ${p.phone ? `<p style="color:var(--muted);font-size:13.5px">📞 <a class="link" href="tel:${esc(p.phone)}" dir="ltr">${esc(p.phone)}</a></p>` : ''}
            <div class="card-tags" style="margin-top:12px">
              <span class="mini-tag">🏷️ ${esc(p.kind || 'استخر شنا')}</span>
              ${p.type ? `<span class="mini-tag">${esc(p.type)}</span>` : ''}
              <span class="mini-tag">🗺️ ${esc(p.province_name || '')} / ${esc(p.city || '')}</span>
              ${p.gender ? `<span class="mini-tag">👥 ${esc(GENDER_FA[p.gender])}</span>` : ''}
              ${p.pool_length ? `<span class="mini-tag">📐 ${toFa(p.pool_length)} متر</span>` : ''}
            </div>
            ${poolNavLinks(p).length ? `<div class="sh-route-row"><span style="font-size:12px;color:var(--muted)">🧭 مسیریابی:</span>${poolNavLinks(p).map(a => `<a class="sh-route-btn" href="${esc(a.url)}" target="_blank" rel="noopener" title="${esc(a.title)}"><img src="${a.logo}" alt="${esc(a.name)}" width="22" height="22" loading="lazy">${esc(a.name)}</a>`).join('')}</div>` : ''}
            <p style="font-size:13px;color:var(--muted);margin-top:14px">این مجموعه در دایرکتوری استخرهای ایران (استخر جو) ثبت شده است. سانس، قیمت و جزئیات تکمیلی پس از عضویت و تأیید مالک مجموعه فعال می‌شود.</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:190px">
            ${p.lat != null && p.lon != null ? `<button type="button" class="btn btn-ghost" onclick="shPoolModal('${encodeURIComponent(p.code)}')">🗺️ مشاهده روی نقشه</button>` : (mapUrl ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(mapUrl)}">🗺️ مشاهده روی نقشه</a>` : '')}
            <a class="btn btn-primary" href="login.html">👑 مالک این استخر هستید؟</a>
          </div>
        </div>
      </div>
      ${amenList(p).length ? `<div class="panel"><h3>✨ امکانات مجموعه</h3><div class="card-tags">${amenList(p).map(a => `<span class="mini-tag">${esc(amenTag(a))}</span>`).join('')}</div><p style="font-size:11.5px;color:var(--muted);margin-top:10px">ℹ️ اطلاعات امکانات از منابع تجمیعی گردآوری شده و ممکن است تغییر کرده باشد؛ لطفاً پیش از مراجعه با مجموعه تماس بگیرید.</p></div>` : ''}
      ${poolDims(p).length ? `<div class="panel"><h3>📐 مشخصات استخر</h3><div class="sh-dims">${poolDims(p).map(d => `<div class="sh-dim">${d[0]}<b>${esc(d[1])}</b></div>`).join('')}</div></div>` : ''}
      <div class="panel"><h3>📅 سانس و قیمت</h3>
        <div class="empty" style="padding:26px"><span class="e-ic">🗓️</span>برای این مجموعه هنوز سانس یا قیمتی ثبت نشده است.<br><small style="color:var(--muted)">پس از عضویت و تأیید مالک، برنامهٔ سانس و قیمت‌ها همین‌جا نمایش داده می‌شود.</small></div>
      </div>
      <p style="font-size:10.5px;color:var(--muted2);text-align:center;margin:18px 0">دادهٔ پایهٔ این صفحه از دایرکتوری OpenStreetMap تهیه شده است • © OpenStreetMap contributors</p>
    </div>`;
  }
  /* ---------- پاپ‌آپ نقشه و مسیریابی (آیتم «مشاهده روی نقشه» صفحهٔ استخر) ---------- */
  function shPmOverlay() {
    let ov = document.getElementById('shPmOv');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'shPmOv'; ov.className = 'sh-pm-ov';
      ov.innerHTML = '<div class="sh-pm" role="dialog" aria-modal="true" aria-label="جزئیات استخر"></div>';
      ov.addEventListener('click', e => { if (e.target === ov) window.shPmClose(); });
      document.body.appendChild(ov);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') window.shPmClose(); });
    }
    return ov;
  }
  window.shPmClose = function () {
    const ov = document.getElementById('shPmOv');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
    if (window.__shPmMap) { try { window.__shPmMap.remove(); } catch (e) {} window.__shPmMap = null; }
  };
  window.shPoolModal = function (code) {
    const p = Pools.find(x => x.registry && String(x.code) === String(code));
    if (!p) { location.href = 'https://estakhrjo.ir/pool.html?code=' + encodeURIComponent(code); return; }
    const amens = amenList(p);
    const dims = poolDims(p);
    const navs = poolNavLinks(p);
    const phone = String(p.phone || '').split(/[،,]/)[0].trim();
    const box = shPmOverlay();
    box.querySelector('.sh-pm').innerHTML = `
      <div class="sh-pm-head">
        <div class="sh-pm-title">🏊 ${esc(p.name)} ${genderTag(p.gender)}</div>
        <button type="button" class="sh-pm-close" onclick="shPmClose()" aria-label="بستن">✕</button>
      </div>
      <div class="sh-pm-sub">📍 ${esc(p.province_name || '')} — ${esc(p.city || '')}${p.district ? ' — ' + esc(p.district) : ''}${p.address ? ' — ' + esc(p.address) : ''}${phone ? ` · 📞 <a class="link" dir="ltr" href="tel:${esc(phone)}">${esc(phone)}</a>` : ''}</div>
      ${p.lat != null && p.lon != null ? '<div class="sh-pm-map" id="shPmMap"></div>' : ''}
      ${navs.length ? `<div class="sh-pm-nav"><div class="sh-pm-nav-title">🧭 مسیریابی به این استخر با:</div><div class="sh-pm-nav-grid">${navs.map(a => `<a class="sh-pm-nav-btn" href="${esc(a.url)}" target="_blank" rel="noopener" title="${esc(a.title)}"><span class="sh-pm-nav-logo"><img src="${a.logo}" alt="${esc(a.name)}" width="52" height="52" loading="lazy"></span><span class="sh-pm-nav-name">${esc(a.name)}</span><span class="sh-pm-nav-desc">${esc(a.desc)}</span></a>`).join('')}</div></div>` : ''}
      <div class="sh-pm-body">
        ${p.gender || dims.length ? `<div class="sh-pm-meta">${p.gender ? '<div>👥 جنسیت: ' + genderTag(p.gender) + '</div>' : ''}${dims.length ? '<div>📐 ' + esc(dims.map(d => d[0] + ' ' + d[1]).join(' · ')) + '</div>' : ''}</div>` : ''}
        ${amens.length ? `<div class="sh-pm-sec">✨ امکانات مجموعه</div><div class="card-tags">${amens.map(a => `<span class="mini-tag">${esc(amenTag(a))}</span>`).join('')}</div>` : ''}
        <div class="sh-pm-note">ℹ️ اطلاعات از منابع تجمیعی است و ممکن است تغییر کرده باشد؛ لطفاً پیش از مراجعه با مجموعه تماس بگیرید.</div>
        <div class="sh-pm-actions">
          ${phone ? `<a class="btn btn-primary btn-sm" href="tel:${esc(phone)}">📞 تماس با استخر</a>` : ''}
          ${(document.body.dataset.page || '') !== 'pool' ? `<a class="btn btn-ghost btn-sm" href="https://estakhrjo.ir/pool.html?code=${encodeURIComponent(p.code)}">صفحهٔ کامل مجموعه ←</a>` : ''}
          <a class="btn btn-ghost btn-sm" href="login.html">👑 مالک این استخر هستید؟</a>
        </div>
      </div>`;
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (p.lat != null && p.lon != null) shPmMapInit(p);
  };
  function shPmMapInit(p) {
    const el = document.getElementById('shPmMap');
    if (!el) return;
    // همان نقشهٔ گوگل، ولی داخل سایت خودمان — embed رسمی بدون کلید API.
    el.innerHTML = '<iframe title="موقعیت مجموعه روی نقشهٔ گوگل" src="https://maps.google.com/maps?q=' + encodeURIComponent(p.lat + ',' + p.lon) + '&z=15&hl=fa&output=embed" style="width:100%;height:100%;border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  }
  // رأی ستارهٔ محلی: هر بازدیدکننده فقط یک‌بار (لوکال + PK سمت سرور).
  function coachStarList() { try { return JSON.parse(localStorage.getItem('sh_coach_stars')) || []; } catch (e) { return []; } }
  function coachStarRemember(u) { const l = coachStarList(); if (!l.includes(u)) { l.push(u); localStorage.setItem('sh_coach_stars', JSON.stringify(l)); } }
  window.shStarCoach = async function (username) {
    const u = String(username || '').trim();
    if (!u) return;
    if (coachStarList().includes(u)) { toasglass('⭐ رأی تو قبلاً برای این مربی ثبت شده'); return; }
    const btns = [...document.querySelectorAll(`[data-star-user="${u}"]`)];
    btns.forEach(b => { b.disabled = true; });
    try {
      const res = await fetch(String(window.SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/member-auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: window.SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ action: 'public-profile-star', username: u }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'ثبت رأی ناموفق بود');
      const c = Coaches.find(x => x.username === u);
      if (c) c.stars = Number(data.stars || 0);
      coachStarRemember(u);
      btns.forEach(b => { b.classList.remove('btn-ghost'); b.classList.add('btn-gold'); b.classList.add('voted'); const s = b.querySelector('.star-cnt'); if (s) s.textContent = toFa(data.stars); });
      toasglass(data.already ? '⭐ رأی تو قبلاً ثبت شده بود' : '⭐ رأیت به این مربی ثبت شد — ممنون!');
    } catch (e) {
      btns.forEach(b => { b.disabled = false; });
      toasglass('⚠️ ' + String(e && e.message || 'ثبت رأی ناموفق بود'));
    }
  };
  // دکمهٔ ستارهٔ مشترک کارت و صفحهٔ پروفایل مربی
  function coachStarButton(c, extraCls) {
    const voted = coachStarList().includes(c.username);
    return `<button class="btn ${voted ? 'btn-gold voted' : 'btn-ghost'} btn-sm ${extraCls || ''}" data-star-user="${esc(c.username)}" onclick="shStarCoach('${esc(c.username)}')" title="به این مربی ستاره بده">⭐ <span class="star-cnt">${toFa(c.stars || 0)}</span></button>`;
  }
  // کارت مخصوص مربیانِ عضو واقعی: ساختار قبلی سایت حفظ می‌شود — «مشاهده پروفایل»
  // همان صفحهٔ coach.html داخلی است و ستارهٔ رأی کنار آن قرار می‌گیرد.
  function coachMemberCard(c) {
    const href = 'https://estakhrjo.ir/coach.html?id=' + encodeURIComponent(c.id);
    const avatarInner = /^(https:|data:image\/(webp|png|jpeg|jpg))/i.test(String(c.image || ''))
      ? `<img src="${esc(c.image)}" alt="${esc(c.full_name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`
      : esc('🏊');
    return `<div class="card coach-card anim-up">
      <div class="card-img" style="height:auto;display:flex;justify-content:center;padding:26px 20px 0;position:relative">
        <span class="coach-avatar" style="background:linear-gradient(135deg,var(--brand-l),var(--brand));color:#fff;overflow:hidden">${avatarInner}</span>
        ${c.verified ? '<span class="coach-badge">✓ تأییدشده</span>' : ''}
      </div>
      <div class="card-body" style="text-align:center;padding-top:14px">
        <div class="card-name" style="justify-content:center;flex-direction:column"><a href="${href}" class="link" style="font-size:16px">${esc(c.full_name)}</a><span class="card-loc">${esc(c.city || '—')}</span></div>
        ${c.tagline ? `<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.8">${esc(c.tagline)}</p>` : ''}
        <div class="card-foot" style="justify-content:center;margin-top:12px">${coachStarButton(c)}<a href="${href}" class="btn btn-primary btn-sm">مشاهده پروفایل</a></div>
      </div>
    </div>`;
  }
  function coachCard(c) {
    if (c && c.username) return coachMemberCard(c);
    return `<div class="card coach-card anim-up">
      <div class="card-img" style="height:auto;display:flex;justify-content:center;padding:26px 20px 0;position:relative">
        <span class="coach-avatar" style="background:linear-gradient(135deg,var(--brand-l),var(--brand));color:#fff">${esc(c.image || '🏊')}</span>
        ${c.verified ? '<span class="coach-badge">✓ تأییدشده</span>' : ''}
        <button class="card-fav ${fav.has('coach', c.id) ? 'faved' : ''}" style="position:absolute;top:12px;right:12px" onclick="shFav('coach',${c.id})">${fav.has('coach', c.id) ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body" style="text-align:center;padding-top:14px">
        <div class="card-name" style="justify-content:center;flex-direction:column"><a href="https://estakhrjo.ir/coach.html?id=${c.id}" class="link" style="font-size:16px">${esc(c.full_name)}</a><span class="card-loc">${esc(c.city)} • ${toFa(c.exp_years || 0)} سال سابقه</span></div>
        <div class="card-rate" style="justify-content:center"><span class="stars">★★★★★</span><span class="rate-num">${toFa(c.rating || 0)}</span><span class="rate-cnt">(${toFa(c.rate_count || 0)})</span></div>
        <div class="card-tags" style="justify-content:center">${(c.specialties || []).slice(0, 3).map(s => `<span class="mini-tag">${esc(s)}</span>`).join('')}</div>
        <div style="font-size:12.5px;color:var(--muted);display:flex;justify-content:center;gap:14px"><span>👥 ${toFa(c.students || 0)} شاگرد</span>${c.online ? '<span>💻 آنلاین</span>' : ''}${c.home_pool ? '<span>🏠 استخر منزل</span>' : ''}</div>
        <div class="card-foot">${cfgPrice('coaches', c.full_name) ? `<div><span class="price" style="font-size:14px;display:block">${money(c.hourly_rate)}</span><small style="color:var(--muted)">ساعتی</small></div>` : `<span class="price-lock">💰 قیمت با گفتگو</span>`}<a href="https://estakhrjo.ir/coach.html?id=${c.id}" class="btn btn-primary btn-sm">پروفایل</a></div>
      </div>
    </div>`;
  }
  function productCard(pr) {
    return `<div class="card anim-up">
      <div class="card-img" style="height:150px"><span class="bg" style="background:var(--card2);font-size:58px">${esc(pr.emoji || '🛒')}</span>
        ${pr.old_price && pr.old_price > pr.price ? `<span class="card-ver" style="background:var(--danger);color:#fff">٪${toFa(Math.round((1 - pr.price / pr.old_price) * 100))} تخفیف</span>` : ''}
      </div>
      <div class="card-body">
        <span class="tag tag-gray" style="align-self:start;font-size:10px">${esc(pr.category || '')} • ${esc(pr.brand || '')}</span>
        <div class="card-name" style="font-size:15px">${esc(pr.name)}</div>
        <div class="card-rate"><span class="stars">★★★★★</span><span class="rate-num">${toFa(pr.rating || 0)}</span></div>
        <div class="card-foot">
          ${cfgPrice('market') ? `<div>${pr.old_price && pr.old_price > pr.price ? `<span style="font-size:11px;color:var(--muted2);text-decoration:line-through">${money(pr.old_price)}</span>` : ''}<span class="price" style="display:block">${money(pr.price)}</span></div>` : `<span class="price-lock">💰 قیمت با تماس</span>`}
          ${sellBtn('market', null, `<button class="btn btn-primary btn-sm" onclick="shBuy(${pr.id})">🛒 خرید</button>`, null)}
        </div>
      </div>
    </div>`;
  }
  /* ---------- سبد خرید کامل ---------- */
  const cartStore = {
    key: 'sh_cart',
    get() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch (e) { return []; } },
    save(l) { localStorage.setItem(this.key, JSON.stringify(l)); syncBadges(); },
    add(id) {
      const l = this.get();
      const it = l.find(x => String(x.id) === String(id));
      if (it) it.qty += 1; else l.push({ id, qty: 1 });
      this.save(l);
    },
    setQty(id, q) { const l = this.get(); const it = l.find(x => String(x.id) === String(id)); if (it) { it.qty = q; if (it.qty <= 0) l.splice(l.indexOf(it), 1); } this.save(l); },
    del(id) { this.save(this.get().filter(x => String(x.id) !== String(id))); },
    clear() { this.save([]); },
    count() { return this.get().reduce((a, b) => a + b.qty, 0); },
    total() {
      return this.get().reduce((t, it) => {
        const p = Products.find(x => String(x.id) === String(it.id));
        return t + (p ? p.price * it.qty : 0);
      }, 0);
    },
  };
  function syncBadges() {
    const c = cartStore.count();
    const b = document.getElementById('cartBadge');
    if (b) { b.textContent = toFa(c); b.style.display = c > 0 ? 'flex' : 'none'; }
    const bell = document.getElementById('bellBadge');
    if (bell) { const unread = supportMemberUnread(); bell.textContent = toFa(unread); bell.style.display = me.get() && unread ? 'flex' : 'none'; }
    try { syncChatUnreadUi(); } catch (e) {}
    try { syncSupportLiveUi(); } catch (e) {}
  }
  window.shBuy = (id, go) => { cartStore.add(id); toasglass('✓ به سبد خرید افزوده شد'); if (go) setTimeout(() => location.href = 'https://estakhrjo.ir/cart.html', 500); };
  window.shCartQty = (id, d) => {
    const it = cartStore.get().find(x => String(x.id) === String(id));
    cartStore.setQty(id, (it ? it.qty : 0) + d);
    pages.cart();
  };
  window.shCartDel = id => { cartStore.del(id); toasglass('🗑️ حذف شد'); pages.cart(); };
  let PROMO = null;
  window.shPromo = () => {
    const inp = document.getElementById('promoCode');
    const v = ((inp && inp.value) || '').trim().toUpperCase();
    if (v === 'MEHR20' || v === 'SH20') {
      PROMO = { code: v, off: 0.2 };
      toasglass('🎉 کد ۲۰٪ تخفیف اعمال شد!');
      pages.cart();
    } else { toasglass('⚠️ کد نامعتبر است'); }
  };
  window.shCheckout = () => {
    const u = me.get();
    if (!u) { toasglass('ابتدا وارد حساب شوید'); setTimeout(() => location.href = 'login.html', 900); return; }
    let total = cartStore.total();
    if (PROMO) total = Math.round(total * (1 - PROMO.off));
    if (total <= 0) return;
    if ((u.wallet || 0) < total) { toasglass('⚠️ موجودی کیف پول کافی نیست'); setTimeout(() => { if (document.body.dataset.page === 'dashboard') shDashTab('wallet'); else location.href = 'dashboard.html?build=ppf8&tab=wallet'; }, 1000); return; }
    u.wallet -= total;
    me.set(u);
    const orders = JSON.parse(localStorage.getItem('sh_orders') || '[]');
    orders.unshift({ id: 'ORD-' + Date.now().toString(36).toUpperCase(), items: cartStore.get().length, total, at: new Date().toISOString(), promo: PROMO ? PROMO.code : null });
    localStorage.setItem('sh_orders', JSON.stringify(orders));
    cartStore.clear();
    PROMO = null;
    pages.cart(true);
  };


  function sessionSlot(s, pool) {
    const owner = pool ? poolOwnerName(pool) : null;
    const remain = (s.capacity || 0) - (s.booked || 0);
    const full = remain <= 0;
    return `<div class="slot ${full ? 'full' : ''}">
      <div class="slot-top"><span class="slot-time">${esc(s.time)}</span><span class="slot-kind ${s.kind === 'آزاد' ? 'kind-free' : ((s.kind || '').includes('کودک') ? 'kind-kid' : ((s.kind || '').includes('بانوان') ? 'kind-women' : 'kind-class'))}">${esc(s.kind || 'آزاد')}</span></div>
      <div class="slot-meta">${s.coach_name ? `<span>👤 ${esc(s.coach_name)}</span>` : ''}${s.lane ? `<span>🛏️ ${esc(s.lane)}</span>` : ''}<span>⏱️ ${toFa(s.duration || 60)} دقیقه</span></div>
      <div class="slot-meta"><span class="cap ${remain <= 5 && remain > 0 ? 'low' : ''}">${remain > 0 ? `💺 ${toFa(remain)} نفر مانده` : '❌ ظرفیت تکمیل'}</span></div>
      <div class="slot-foot">${cfgPrice('pools', owner) ? `<span class="price">${money(s.price)} <small>/ نفر</small></span>` : `<span class="price-lock">قیمت با تماس</span>`}
        ${full ? '' : sellBtn('pools', owner, `<button class="btn btn-primary btn-sm" onclick="shBook(${s.id},1)">رزرو</button>`, pool && pool.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(pool.phone)}">📞 رزرو تلفنی</a>` : '')}
      </div>
    </div>`;
  }

  const reviewsSection = (target, tid) => {
    const list = Reviews.filter(r => r.target === target && String(r.target_id) === String(tid));
    return `<div class="panel" style="margin-top:26px">
      <h3>💬 نقد و بررسی (${toFa(list.length)})</h3>
      ${list.length === 0 ? '<div class="empty" style="padding:18px">هنوز نظری ثبت نشده. اولین نفری باشید!</div>' :
        list.map(r => `<div class="review">
          <div class="review-head"><span class="review-user">👤 ${esc(r.user_name || 'کاربر')}</span><span class="stars" style="font-size:12px">${'★'.repeat(r.rating || 5)}</span></div>
          <p style="font-size:13.5px">${esc(r.comment || '')}</p>
          <div class="criteria">${r.clean ? `<span class="crit">🧼 نظافت ${toFa(r.clean)}/۵</span>` : ''}${r.safety ? `<span class="crit">🛟 ایمنی ${toFa(r.safety)}/۵</span>` : ''}${r.teach ? `<span class="crit">🎓 تدریس ${toFa(r.teach)}/۵</span>` : ''}${r.value ? `<span class="crit">💰 ارزش ${toFa(r.value)}/۵</span>` : ''}</div>
        </div>`).join('')}
    </div>`;
  };

  /* ---------- صفحات ---------- */
  /* ---------- رزومه‌ساز هوشمند شنا (CV Studio) ---------- */
  const CV_DEF = { personal: { name: '', en_name: '', city: '', en_city: '', phone: '', email: '', age: '', gender: 'men', bio: '', en_bio: '', photo: '', marital: '', military: '', current_location: '', en_current_location: '', nationality: '', en_nationality: '', expected_salary: '' }, education: [], skills: [], certs: [], exp: [], custom_sections: {}, custom_sections_en: {}, tpl: 't-wave', lang: 'fa', reference_code: '' };
  const cvStore = {
    KEY: 'sh_cv',
    /* رزومهٔ تازه: جنسیت پیش‌فرض از حساب عضو می‌آید تا پنل و رزومه هماهنگ باشند. */
    get() {
      const merge = saved => {
        const out = { ...CV_DEF, ...saved, personal: { ...CV_DEF.personal, ...(saved.personal || {}) }, custom_sections: { ...(saved.custom_sections || {}) }, custom_sections_en: { ...(saved.custom_sections_en || {}) } };
        if (!saved || !saved.personal || !saved.personal.gender) { const g = (me.get() || {}).gender; if (g === 'women' || g === 'men') out.personal.gender = g; }
        return out;
      };
      try { const saved = JSON.parse(localStorage.getItem(this.KEY) || '{}'); return merge(saved && typeof saved === 'object' ? saved : {}); } catch (e) { return merge({}); }
    },
    set(d) { if (!d.reference_code && d.personal && (String(d.personal.name || '').trim() || String(d.personal.phone || '').trim())) d.reference_code = newCvReferenceCode(); localStorage.setItem(this.KEY, JSON.stringify(d)); },
  };
  const cvOfferStore = {
    KEY: 'sh_cv_offers',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    set(a) { localStorage.setItem(this.KEY, JSON.stringify(a)); },
  };
  const subStore = {
    KEY: 'sh_sub_ads',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    set(a) { localStorage.setItem(this.KEY, JSON.stringify(a)); },
  };
  const SWIM_SKILLS = [
    ['آموزش شنای کودکان', 'Kids Swimming Instruction'], ['آموزش شنای بزرگسالان', 'Adult Swimming Instruction'], ['آموزش نویسانان/مبتدیان', 'Beginner Training'],
    ['تکنیک کرال سینه', 'Breaststroke Technique'], ['تکنیک کرال پشت', 'Backstroke Technique'], ['تکنیک پروانه', 'Butterfly Technique'], ['تکنیک قورباغه', 'Freestyle Technique'],
    ['آمادگی مسابقات', 'Competition Preparation'], ['نجات غریق و امنیابی', 'Lifeguarding & Rescue'], ['CPR و کمک‌های اولیه', 'CPR & First Aid'],
    ['آکوا آیروبیک', 'Aqua Aerobics'], ['توان‌بخشی در آب (هیدروتراپی)', 'Aquatic Rehabilitation'], ['واترپلو (مبتدی)', 'Water Polo Basics'], ['شنا سنین طلایی', 'Senior Swimming'],
  ];
  const SWIM_CERTS = [
    ['مربیگری درجه ۱ فدراسیون شنا', 'National Federation Level 1 Coaching'], ['مربیگری درجه ۲ فدراسیون شنا', 'National Federation Level 2 Coaching'], ['مربیگری درجه ۳ فدراسیون شنا', 'National Federation Level 3 Coaching'],
    ['نجات غریق درجه ۱', 'Lifeguard Certificate Level 1'], ['نجات غریق درجه ۲', 'Lifeguard Certificate Level 2'], ['گواهینامه بین‌المللی نجات غریق', 'ILS International Lifeguard'],
    ['دوره ASCA بین‌المللی', 'ASCA International Course'], ['دوره CPR هلال احمر', 'Red Crescent CPR Course'], ['کارگاه حرفه‌ای تکنیک', 'Advanced Technique Workshop'], ['کارگاه تغذیه ورزشی', 'Sports Nutrition Workshop'],
  ];

  /* ---------- سامانهٔ قابل‌طراحی رزومه؛ فقط مدیر سیستم آن را پیکربندی می‌کند ---------- */
  const CV_FONT_CHOICES = {
    fa: [
      { id: 'vazirmatn', label: 'وزیرمتن — رسمی و مدرن', family: 'Vazirmatn' },
      { id: 'noto-sans-ar', label: 'Noto Sans Arabic — خوانا و مینیمال', family: 'Noto Sans Arabic' },
      { id: 'noto-naskh-ar', label: 'Noto Naskh Arabic — فاخر و کتابی', family: 'Noto Naskh Arabic' },
    ],
    en: [
      { id: 'inter', label: 'Inter — حرفه‌ای و مدرن', family: 'Inter' },
      { id: 'dm-sans', label: 'DM Sans — نرم و معاصر', family: 'DM Sans' },
      { id: 'playfair', label: 'Playfair Display — رسمی و لوکس', family: 'Playfair Display' },
    ],
  };
  const CV_SECTION_DEFAULTS = [
    { id: 'profile-details', builtin: true, locked: true, place: 'side', labelFa: 'مشخصات تکمیلی', labelEn: 'Profile details', enabled: true },
    { id: 'bio', builtin: true, place: 'main', labelFa: 'معرفی', labelEn: 'Profile', enabled: true },
    { id: 'education', builtin: true, place: 'main', labelFa: 'تحصیلات', labelEn: 'Education', enabled: true },
    { id: 'experience', builtin: true, place: 'main', labelFa: 'سوابق کاری', labelEn: 'Work Experience', enabled: true },
    { id: 'skills', builtin: true, place: 'side', labelFa: 'مهارت‌های تخصصی شنا', labelEn: 'Swimming Skills', enabled: true },
    { id: 'certificates', builtin: true, place: 'side', labelFa: 'مدارک و دوره‌ها', labelEn: 'Certificates & Courses', enabled: true },
  ];
  const cvClone = value => JSON.parse(JSON.stringify(value));
  const cvStudioDefault = () => ({
    version: 1,
    typography: { fa: 'vazirmatn', en: 'inter' },
    colors: { text: '#1e293b', heading: '#0a2540', accent: '#0ea5e9', side: '#0a2540', muted: '#64748b' },
    footer: { enabled: true, fa: 'این رزومه با رزومه‌ساز استخر جو | ESTAKHRJO ساخته شده است', en: 'Built with استخر جو | ESTAKHRJO Resume Studio' },
    sections: CV_SECTION_DEFAULTS.map((x, order) => ({ ...x, order })),
    skills: SWIM_SKILLS.map(([fa, en], legacyIndex) => ({ id: 'skill-' + legacyIndex, legacyIndex, fa, en, enabled: true })),
    certs: SWIM_CERTS.map(([fa, en], legacyIndex) => ({ id: 'cert-' + legacyIndex, legacyIndex, fa, en, enabled: true })),
  });
  const cvCleanText = (value, max = 90) => String(value == null ? '' : value).trim().slice(0, max);
  function cvStudioNormalize(raw) {
    const base = cvStudioDefault(); const inCfg = raw && typeof raw === 'object' ? raw : {};
    const allowed = (kind, fallback) => (CV_FONT_CHOICES[kind] || []).some(x => x.id === inCfg.typography?.[kind]) ? inCfg.typography[kind] : fallback;
    base.typography = { fa: allowed('fa', base.typography.fa), en: allowed('en', base.typography.en) };
    ['text', 'heading', 'accent', 'side', 'muted'].forEach(key => { const value = String(inCfg.colors?.[key] || ''); if (/^#[0-9a-f]{6}$/i.test(value)) base.colors[key] = value; });
    base.footer.enabled = inCfg.footer?.enabled !== false;
    base.footer.fa = cvCleanText(inCfg.footer?.fa || base.footer.fa, 140); base.footer.en = cvCleanText(inCfg.footer?.en || base.footer.en, 140);
    const incomingSections = Array.isArray(inCfg.sections) ? inCfg.sections : [];
    base.sections = base.sections.map(section => {
      const incoming = incomingSections.find(x => x && x.id === section.id) || {};
      return { ...section, enabled: section.locked ? true : incoming.enabled !== false, place: section.locked ? 'side' : (incoming.place === 'side' ? 'side' : 'main'), labelFa: cvCleanText(incoming.labelFa || section.labelFa), labelEn: cvCleanText(incoming.labelEn || section.labelEn), order: Number.isFinite(+incoming.order) ? +incoming.order : section.order };
    });
    incomingSections.filter(x => x && typeof x.id === 'string' && x.id.startsWith('custom-')).slice(0, 10).forEach((section, index) => {
      base.sections.push({ id: section.id.replace(/[^a-z0-9-]/gi, '').slice(0, 46), builtin: false, place: section.place === 'side' ? 'side' : 'main', enabled: section.enabled !== false, labelFa: cvCleanText(section.labelFa || 'بخش جدید'), labelEn: cvCleanText(section.labelEn || 'Custom section'), placeholderFa: cvCleanText(section.placeholderFa || 'متن این بخش را وارد کنید…', 160), placeholderEn: cvCleanText(section.placeholderEn || 'Write this section…', 160), order: Number.isFinite(+section.order) ? +section.order : 10 + index });
    });
    const normalizeCatalog = (key, defaults) => {
      const rows = Array.isArray(inCfg[key]) ? inCfg[key] : [];
      const builtins = defaults.map(item => { const previous = rows.find(x => x && x.id === item.id) || {}; return { ...item, fa: cvCleanText(previous.fa || item.fa), en: cvCleanText(previous.en || item.en), enabled: previous.enabled !== false }; });
      rows.filter(x => x && typeof x.id === 'string' && x.id.startsWith(key === 'skills' ? 'skill-custom-' : 'cert-custom-')).slice(0, 30).forEach((item, index) => builtins.push({ id: item.id.replace(/[^a-z0-9-]/gi, '').slice(0, 50), legacyIndex: null, fa: cvCleanText(item.fa || 'مورد جدید'), en: cvCleanText(item.en || 'New item'), enabled: item.enabled !== false, order: 100 + index }));
      return builtins;
    };
    base.skills = normalizeCatalog('skills', base.skills); base.certs = normalizeCatalog('certs', base.certs);
    return base;
  }
  const cvStudioStore = {
    KEY: 'sh_cv_studio',
    get() { try { return cvStudioNormalize(JSON.parse(localStorage.getItem(this.KEY) || 'null')); } catch (e) { return cvStudioDefault(); } },
    setLocal(cfg) { localStorage.setItem(this.KEY, JSON.stringify(cvStudioNormalize(cfg))); },
    set(cfg) {
      const next = cvStudioNormalize(cfg); this.setLocal(next);
      const cloud = window.SH_CLOUD_AUTH, user = me.get();
      if (cloud && cloud.active && user && user.u === 'admin' && cloud.saveCvStudio) {
        clearTimeout(window.__cvStudioCloudTimer);
        window.__cvStudioCloudTimer = setTimeout(() => cloud.saveCvStudio(next).catch(e => console.warn('CV Studio cloud save pending:', e.message)), 700);
      }
      return next;
    },
  };
  const cvSectionList = () => cvStudioStore.get().sections.slice().sort((a, b) => a.order - b.order);
  const cvSectionFor = id => cvSectionList().find(x => x.id === id);
  const cvSectionEnabled = id => { const section = cvSectionFor(id); return !!(section && section.enabled); };
  const cvSectionLabel = (id, lang) => { const section = cvSectionFor(id); if (!section) return ''; return lang === 'en' ? section.labelEn : section.labelFa; };
  const cvCatalog = kind => cvStudioStore.get()[kind] || [];
  const cvCatalogItem = (kind, id) => cvCatalog(kind).find(item => String(item.id) === String(id) || (typeof id === 'number' && item.legacyIndex === id) || (String(id).match(/^\d+$/) && item.legacyIndex === +id));
  const cvSkillItem = id => cvCatalogItem('skills', id);
  const cvCertItem = id => cvCatalogItem('certs', id);
  const cvSelectedSkills = d => (d.skills || []).map(([id, level]) => { const item = cvSkillItem(id); return item ? { ...item, level } : null; }).filter(Boolean);
  const cvSelectedCerts = d => (d.certs || []).map(id => cvCertItem(id)).filter(Boolean);
  const cvFontFamily = (lang, id) => ((CV_FONT_CHOICES[lang] || []).find(font => font.id === id) || CV_FONT_CHOICES[lang][0]).family;
  const cvLatinDigits = value => String(value == null ? '' : value).replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)).replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
  function cvJalaliYearNow() { try { return +cvLatinDigits(new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())).replace(/\D/g, ''); } catch (e) { return new Date().getFullYear() - 621; } }
  function cvYear(value) { const years = cvLatinDigits(value).match(/(?:1[34]\d{2}|20\d{2})/g); if (!years || !years.length) return null; const year = +years[years.length - 1]; return year > 1700 ? year - 621 : year; }
  function cvIsCurrent(value) { return !String(value || '').trim() || /اکنون|حال|present|current/i.test(String(value || '')); }
  function newCvReferenceCode() { const now = new Date(); const stamp = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`; const random = Math.floor(1000 + Math.random() * 9000); return `SH-${stamp}-${random}`; }
  function cvReferenceCode(d) { if (d && d.reference_code) return d.reference_code; const seed = `${d?.personal?.name || ''}|${d?.personal?.phone || ''}`; let hash = 0; for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0; return `SH-${String(Math.abs(hash || 9037)).slice(0, 4)}-${String(Math.abs(hash || 2773)).slice(-4).padStart(4, '0')}`; }
  function cvSalaryNumber(value) { const plain = cvLatinDigits(value).replace(/(?:تومان|tomans?|ریال|rials?)/gi, '').trim(); if (!plain || !/^[\d\s,٬،.]+$/.test(plain)) return ''; const amount = plain.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, ''); return amount || ''; }
  function cvSalaryInput(value) { const amount = cvSalaryNumber(value); return amount ? new Intl.NumberFormat('fa-IR').format(+amount) : String(value || '').trim(); }
  function cvSalaryText(value, en) { const amount = cvSalaryNumber(value); if (!amount) return String(value || '').trim(); return `${new Intl.NumberFormat(en ? 'en-US' : 'fa-IR').format(+amount)} ${en ? 'tomans' : 'تومان'}`; }
  function cvAutomaticWork(exp) {
    const rows = (exp || []).map((item, index) => ({ ...item, index, start: cvYear(item.from), end: cvIsCurrent(item.to) ? cvJalaliYearNow() : cvYear(item.to), current: cvIsCurrent(item.to) })).filter(item => item.title || item.org || item.start);
    const intervals = rows.filter(item => item.start).map(item => [item.start, Math.max(item.start, item.end || item.start)]).sort((a, b) => a[0] - b[0]);
    const merged = []; intervals.forEach(interval => { const last = merged[merged.length - 1]; if (last && interval[0] <= last[1] + 1) last[1] = Math.max(last[1], interval[1]); else merged.push(interval.slice()); });
    const years = merged.length ? Math.max(1, merged.reduce((total, interval) => total + Math.max(0, interval[1] - interval[0]), 0)) : null;
    const ranked = rows.slice().sort((a, b) => (b.current - a.current) || ((b.current ? (b.start || 0) : (b.end || b.start || 0)) - (a.current ? (a.start || 0) : (a.end || a.start || 0))) || (b.index - a.index));
    const latest = ranked[0] || {};
    return { years, title: latest.title || '', organization: latest.org || '', item: latest };
  }
  /* سوابق کاری همیشه بر اساس سال کارکرد مرتب می‌شوند — شغل جاری اول، بعد از جدید به قدیم.
     ترتیب ورود داده ملاک نمایش نیست؛ ورودی بدون سالِ قابل‌استخراج هم حذف نمی‌شود. */
  function cvSortedExp(exp) {
    return (exp || []).map((item, index) => ({ ...item, index, start: cvYear(item.from), end: cvIsCurrent(item.to) ? cvJalaliYearNow() : cvYear(item.to), current: cvIsCurrent(item.to) }))
      .filter(item => item.title || item.org || item.desc || item.start)
      .sort((a, b) => (b.current - a.current) || ((b.start || 0) - (a.start || 0)) || ((b.end || 0) - (a.end || 0)) || (a.index - b.index));
  }
  function cvSortedEdu(edu) {
    return (edu || []).map((item, index) => ({ ...item, index, start: cvYear(item.from) }))
      .filter(item => item.degree || item.field || item.institute)
      .sort((a, b) => ((b.start || 0) - (a.start || 0)) || (a.index - b.index));
  }
  const T_CV = (fa, en) => ({ fa, en });
  const CV_DICT = {
    role: T_CV('مربی و مدرس شنا', 'Swim Coach & Instructor'),
    contact: T_CV('اطلاعات تماس', 'Contact'), city: T_CV('شهر', 'City'), phone: T_CV('تلفن', 'Phone'), email: T_CV('ایمیل', 'Email'), age: T_CV('سن', 'Age'), gender: T_CV('جنسیت', 'Gender'),
    reference: T_CV('رفرنس', 'Reference'), experienceYears: T_CV('سابقه کاری', 'Experience'), years: T_CV('سال', 'years'), marital: T_CV('وضعیت تأهل', 'Marital status'), single: T_CV('مجرد', 'Single'), married: T_CV('متأهل', 'Married'), military: T_CV('خدمت سربازی', 'Military service'), militaryDone: T_CV('تمام‌شده', 'Completed'), militaryExempt: T_CV('معاف', 'Exempt'), militaryActive: T_CV('در حال انجام', 'In service'), location: T_CV('موقعیت مکانی فعلی', 'Current location'), nationality: T_CV('ملیت', 'Nationality'), expectedSalary: T_CV('حقوق مورد انتظار', 'Expected salary'), unspecified: T_CV('مشخص نشده', 'Not specified'),
    men: T_CV('آقا', 'Male'), women: T_CV('خانم', 'Female'),
    skillsH: T_CV('مهارت‌های تخصصی شنا', 'Swimming Skills'), certsH: T_CV('مدارک و دوره‌ها', 'Certificates & Courses'),
    eduH: T_CV('تحصیلات', 'Education'), expH: T_CV('سوابق کاری', 'Work Experience'), bioH: T_CV('معرفی', 'Profile'),
    by: T_CV('این رزومه با رزومه‌ساز استخر جو | ESTAKHRJO ساخته شده است', 'Built with استخر جو | ESTAKHRJO Resume Studio'),
    site: T_CV('ESTAKHRJO — دنیای شنا، یک‌جا', 'ESTAKHRJO — the swim platform'),
    at: T_CV('در', 'at'), fromTo: T_CV('از', 'from'), present: T_CV('اکنون', 'Present'),
  };
  /* ترجمهٔ درون‌مرورگری رزومه: مدل Firefox Translations (Bergamot) در Web Worker محلی اجرا می‌شود. */
  let cvTranslationWorker, cvTranslationBoot, cvTranslationRequestId = 0, cvTranslationActive;
  const cvHasPersian = value => /[\u0600-\u06FF]/.test(String(value || ''));
  function cvTranslationJobs(d, missingOnly) {
    const jobs = [];
    const add = (target, faKey, enKey) => { const value = String(target && target[faKey] || '').trim(); if (value && cvHasPersian(value) && (!missingOnly || !String(target && target[enKey] || '').trim())) jobs.push({ target, enKey, value }); };
    const P = d.personal || {};
    add(P, 'city', 'en_city'); add(P, 'bio', 'en_bio'); add(P, 'current_location', 'en_current_location'); add(P, 'nationality', 'en_nationality');
    (d.education || []).forEach(item => { add(item, 'degree', 'en_degree'); add(item, 'field', 'en_field'); add(item, 'institute', 'en_institute'); add(item, 'city', 'en_city'); });
    (d.exp || []).forEach(item => { add(item, 'title', 'en_title'); add(item, 'org', 'en_org'); add(item, 'desc', 'en_desc'); });
    const faValues = d.custom_sections || {}; const enValues = d.custom_sections_en || (d.custom_sections_en = {});
    Object.keys(faValues).forEach(id => { const value = String(faValues[id] || '').trim(); if (value && cvHasPersian(value) && (!missingOnly || !String(enValues[id] || '').trim())) jobs.push({ target: enValues, enKey: id, value }); });
    return jobs;
  }
  function cvOfflineTranslator() {
    if (cvTranslationBoot) return cvTranslationBoot;
    if (!window.Worker) return Promise.reject(new Error('مرورگر شما اجرای مترجم آفلاین را پشتیبانی نمی‌کند'));
    cvTranslationBoot = new Promise((resolve, reject) => {
      const pending = new Map(); let started = false;
      try { cvTranslationWorker = new Worker('js/cv-offline-translator.worker.js?v=2408'); } catch (error) { reject(error); return; }
      cvTranslationWorker.onmessage = event => {
        const data = event.data || {};
        if (data.type === 'ready') { started = true; resolve({ translate(texts) { return new Promise((done, fail) => { const id = ++cvTranslationRequestId; pending.set(id, { done, fail }); cvTranslationWorker.postMessage({ type: 'translate', id, texts }); }); } }); return; }
        if (data.type === 'translated') { const request = pending.get(data.id); if (request) { pending.delete(data.id); request.done(data.texts || []); } return; }
        if (data.type === 'error') { const request = pending.get(data.id); if (request) { pending.delete(data.id); request.fail(new Error(data.message)); } else if (!started) reject(new Error(data.message)); }
      };
      cvTranslationWorker.onerror = event => { const error = new Error(event.message || 'مترجم آفلاین اجرا نشد'); if (!started) reject(error); };
      cvTranslationWorker.postMessage({ type: 'init' });
    });
    return cvTranslationBoot;
  }
  window.shCvTranslateEnglish = function (silent) {
    if (cvTranslationActive) return cvTranslationActive;
    const d = cvStore.get(); const jobs = cvTranslationJobs(d);
    if (!jobs.length) return Promise.resolve(false);
    if (!silent) toasglass('🌐 در حال ترجمهٔ متن رزومه روی دستگاه شما…');
    cvTranslationActive = cvOfflineTranslator().then(engine => engine.translate(jobs.map(job => job.value))).then(translations => {
      translations.forEach((text, index) => { if (jobs[index] && String(text || '').trim()) jobs[index].target[jobs[index].enKey] = String(text).trim(); });
      cvStore.set(d); shCvPreview();
      if (!silent) toasglass('✅ متن رزومه به نسخهٔ انگلیسی تبدیل شد');
      return true;
    }).catch(error => { toasglass('⚠️ ترجمهٔ آفلاین آماده نشد: ' + (error.message || 'خطای نامشخص')); return false; }).finally(() => { cvTranslationActive = null; });
    return cvTranslationActive;
  };
  window.shCv = function (fn) { const d = cvStore.get(); fn(d); cvStore.set(d); shCvPreview(); };
  const cvEnglishField = { city: 'en_city', bio: 'en_bio', current_location: 'en_current_location', nationality: 'en_nationality' };
  window.shCvField = (k, v) => shCv(d => { d.personal[k] = v; if (cvEnglishField[k]) d.personal[cvEnglishField[k]] = ''; });
  window.shCvSalary = value => shCv(d => { d.personal.expected_salary = cvSalaryNumber(value) || String(value || '').trim(); });
  window.shCvSalaryFormat = el => { el.value = cvSalaryInput(el.value); window.shCvSalary(el.value); };
  window.shCvGender = value => { const d = cvStore.get(); d.personal.gender = value; cvStore.set(d); window.__cvStep = 1; shDashTab('cv'); };
  function syncCvChoiceUi(d) {
    document.querySelectorAll('[data-cv-skill]').forEach(row => { const id = String(row.dataset.cvSkill); const cur = ((d.skills || []).find(x => String(x[0]) === id) || [])[1] || 0; row.classList.toggle('on', !!cur); row.querySelectorAll('[data-cv-level]').forEach(dot => dot.classList.toggle('on', cur >= +dot.dataset.cvLevel)); });
    document.querySelectorAll('[data-cv-cert]').forEach(chip => chip.classList.toggle('on', (d.certs || []).some(id => String(id) === String(chip.dataset.cvCert))));
  }
  window.shCvSkill = (id, level) => { const d = cvStore.get(); d.skills = d.skills || []; const it = d.skills.findIndex(x => String(x[0]) === String(id)); const cur = it < 0 ? 0 : d.skills[it][1]; if (cur === level) d.skills.splice(it, 1); else if (it < 0) d.skills.push([String(id), level]); else d.skills[it][1] = level; cvStore.set(d); syncCvChoiceUi(d); shCvPreview(); };
  window.shCvCert = id => { const d = cvStore.get(); d.certs = d.certs || []; const it = d.certs.findIndex(x => String(x) === String(id)); if (it < 0) d.certs.push(String(id)); else d.certs.splice(it, 1); cvStore.set(d); syncCvChoiceUi(d); shCvPreview(); };
  window.shCvCustom = (val, key) => shCv(d => { d.custom_sections = d.custom_sections || {}; d.custom_sections_en = d.custom_sections_en || {}; d.custom_sections[String(key)] = val; delete d.custom_sections_en[String(key)]; });
  window.shCvEduAdd = () => shCv(d => { d.education = d.education || []; d.education.push({ degree: '', field: '', institute: '', city: '', from: '', to: '', grade: '' }); shDashTab('cv'); });
  window.shCvEduDel = i => shCv(d => { d.education = (d.education || []).filter((_, x) => x !== i); shDashTab('cv'); });
  const cvEduEnglishField = { degree: 'en_degree', field: 'en_field', institute: 'en_institute', city: 'en_city' };
  window.shCvEduField = (i, k, v) => shCv(d => { d.education = d.education || []; if (d.education[i]) { d.education[i][k] = v; if (cvEduEnglishField[k]) d.education[i][cvEduEnglishField[k]] = ''; } });
  window.shCvExpAdd = () => shCv(d => { d.exp.push({ title: '', org: '', from: '', to: '', desc: '', org_prov: '', org_city: '', org_pool: '' }); shDashTab('cv'); });
  window.shCvExpDel = i => shCv(d => { d.exp.splice(i, 1); shDashTab('cv'); });
  const cvExpEnglishField = { title: 'en_title', org: 'en_org', desc: 'en_desc' };
  window.shCvExpField = (i, k, v) => shCv(d => { d.exp[i][k] = v; if (cvExpEnglishField[k]) d.exp[i][cvExpEnglishField[k]] = ''; });
  /* ---------- انتخابگر استخر از مخزن مرجع استخرهای ایران (registry) ----------
     استان → شهر → استخر؛ فقط viewهای عمومی narrow خوانده می‌شوند. */
  const registryCache = { provinces: null, cities: null, poolsByCity: {} };
  async function registryFetch(view, q) {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) throw new Error('registry: no supabase config');
    const h = { apikey: window.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY };
    const r = await fetch(window.SUPABASE_URL + '/rest/v1/' + view + '?' + (q || ''), { headers: h });
    if (!r.ok) throw new Error(view + ':' + r.status);
    return r.json();
  }
  async function registryProvinces() {
    if (registryCache.provinces) return registryCache.provinces;
    const rows = await registryFetch('public_registry_provinces', 'select=code,name,pools_count&order=name');
    registryCache.provinces = rows || []; return registryCache.provinces;
  }
  async function registryCities(prov) {
    if (!registryCache.cities) registryCache.cities = await registryFetch('public_registry_cities', 'select=code,name,province_code,pools_count&order=name');
    return (registryCache.cities || []).filter(c => c.province_code === prov);
  }
  async function registryPools(prov, city) {
    const key = prov + '-' + city;
    if (!registryCache.poolsByCity[key]) registryCache.poolsByCity[key] = await registryFetch('public_registry_pools', 'select=code,name,category,type&province_code=eq.' + prov + '&city_code=eq.' + city + '&status=eq.' + encodeURIComponent('فعال') + '&order=name');
    return registryCache.poolsByCity[key] || [];
  }
  window.shCvExpProv = async (i, prov) => {
    const citySel = document.getElementById('cv_exp_city_' + i), poolSel = document.getElementById('cv_exp_pool_' + i);
    shCv(d => { d.exp[i].org_prov = prov || ''; d.exp[i].org_city = ''; d.exp[i].org_pool = ''; });
    if (poolSel) { poolSel.innerHTML = '<option value="">استخر…</option>'; poolSel.disabled = true; }
    if (!citySel) return;
    if (!prov) { citySel.innerHTML = '<option value="">ابتدا استان را انتخاب کنید…</option>'; citySel.disabled = true; return; }
    citySel.disabled = true; citySel.innerHTML = '<option value="">در حال بارگذاری شهرها…</option>';
    try {
      const cities = await registryCities(prov);
      citySel.innerHTML = '<option value="">شهر…</option>' + cities.map(c => `<option value="${esc(c.code)}">${esc(c.name)} (${toFa(c.pools_count || 0)})</option>`).join('');
      citySel.disabled = false;
    } catch (e) { citySel.innerHTML = '<option value="">خطا در دریافت شهرها</option>'; toasglass('⚠️ مخزن استخرهای ایران در دسترس نیست'); }
  };
  window.shCvExpCity = async (i, city) => {
    const poolSel = document.getElementById('cv_exp_pool_' + i);
    shCv(d => { d.exp[i].org_city = city || ''; d.exp[i].org_pool = ''; });
    if (!poolSel) return;
    if (!city) { poolSel.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید…</option>'; poolSel.disabled = true; return; }
    poolSel.disabled = true; poolSel.innerHTML = '<option value="">در حال بارگذاری استخرها…</option>';
    const prov = ((cvStore.get().exp[i] || {}).org_prov) || '';
    try {
      const pools = await registryPools(prov, city);
      poolSel.innerHTML = '<option value="">' + (pools.length ? 'استخر را انتخاب کنید…' : 'استخری در این شهر ثبت نشده — نام را دستی وارد کنید') + '</option>' + pools.map(p => `<option value="${esc(p.code)}" title="${esc(p.category || '')}">${esc(p.name)}</option>`).join('');
      poolSel.disabled = !pools.length;
    } catch (e) { poolSel.innerHTML = '<option value="">خطا در دریافت استخرها</option>'; }
  };
  window.shCvExpPool = (i, code) => {
    if (!code) { shCv(d => { d.exp[i].org_pool = ''; }); return; }
    const item = cvStore.get().exp[i] || {};
    const pool = ((registryCache.poolsByCity[item.org_prov + '-' + item.org_city]) || []).find(p => p.code === code);
    const name = pool ? pool.name : code;
    shCv(d => { d.exp[i].org_pool = code; d.exp[i].org = name; d.exp[i].en_org = ''; });
    const orgInput = document.getElementById('cv_exp_org_' + i); if (orgInput) orgInput.value = name;
    toasglass('✅ «' + name + '» از مخزن مرجع انتخاب شد');
  };
  window.shCvExpOrg = (i, v) => shCv(d => { d.exp[i].org = v; d.exp[i].en_org = ''; d.exp[i].org_pool = ''; });
  function cvExpPickerBackfill() {
    const d = cvStore.get();
    (d.exp || []).forEach((x, i) => {
      const provSel = document.getElementById('cv_exp_prov_' + i);
      if (!provSel || provSel.dataset.ready === '1') return;
      provSel.dataset.ready = '1';
      registryProvinces().then(list => {
        if (!provSel.isConnected) return;
        provSel.innerHTML = '<option value="">استان (از مخزن ۱۱۵۶ استخر ایران)…</option>' + list.map(p => `<option value="${esc(p.code)}"${x.org_prov === p.code ? ' selected' : ''}>${esc(p.name)} (${toFa(p.pools_count || 0)})</option>`).join('');
        if (!x.org_prov) return;
        return registryCities(x.org_prov).then(cities => {
          const citySel = document.getElementById('cv_exp_city_' + i); if (!citySel || !citySel.isConnected) return;
          citySel.innerHTML = '<option value="">شهر…</option>' + cities.map(c => `<option value="${esc(c.code)}"${x.org_city === c.code ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
          citySel.disabled = false;
          if (!x.org_city) return;
          return registryPools(x.org_prov, x.org_city).then(pools => {
            const poolSel = document.getElementById('cv_exp_pool_' + i); if (!poolSel || !poolSel.isConnected) return;
            poolSel.innerHTML = '<option value="">استخر را انتخاب کنید…</option>' + pools.map(p => `<option value="${esc(p.code)}"${x.org_pool === p.code ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
            poolSel.disabled = !pools.length;
          });
        });
      }).catch(() => { if (provSel.isConnected) provSel.innerHTML = '<option value="">مخزن در دسترس نیست</option>'; });
    });
  }
  window.shCvTpl = t => shCv(d => { d.tpl = t; const grid = document.querySelector('.cv-tpls'); if (grid) grid.querySelectorAll('.cv-tpl').forEach((el, i) => el.classList.toggle('on', ['t-wave', 't-min', 't-cls'][i] === t)); });
  window.shCvLang = l => { shCv(d => { d.lang = l; document.querySelectorAll('.cv-lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === l)); }); if (l === 'en') window.shCvTranslateEnglish(true); };
  const cvStudioAdmin = () => { if ((me.get() || {}).u === 'admin') return true; toasglass('دسترسی تنظیمات رزومه‌ساز فقط برای مدیر سیستم است'); return false; };
  const cvStudioRenderAdmin = () => { if (window.shCvPreview) window.shCvPreview(); if ((me.get() || {}).u === 'admin' && window.shDashTab) { window.__adminView = 'cvstudio'; window.shDashTab('management'); } };
  function updateCvStudio(mutator, render = true) { if (!cvStudioAdmin()) return; const cfg = cvStudioStore.get(); mutator(cfg); cvStudioStore.set(cfg); if (render) cvStudioRenderAdmin(); }
  window.shCvStudioTypography = (key, value) => updateCvStudio(cfg => { cfg.typography[key] = value; });
  window.shCvStudioColor = (key, value) => updateCvStudio(cfg => { cfg.colors[key] = value; });
  window.shCvStudioFooter = (key, value) => updateCvStudio(cfg => { cfg.footer[key] = key === 'enabled' ? !!value : value; });
  window.shCvStudioSection = (id, key, value) => updateCvStudio(cfg => { const section = cfg.sections.find(x => x.id === id); if (section && !(section.locked && (key === 'enabled' || key === 'place'))) section[key] = key === 'enabled' ? !!value : value; });
  window.shCvStudioMoveSection = (id, direction) => updateCvStudio(cfg => { const ordered = cfg.sections.slice().sort((a, b) => a.order - b.order); const index = ordered.findIndex(x => x.id === id); const swap = index + direction; if (index < 0 || swap < 0 || swap >= ordered.length) return; const temp = ordered[index].order; ordered[index].order = ordered[swap].order; ordered[swap].order = temp; });
  window.shCvStudioAddSection = () => updateCvStudio(cfg => { const now = Date.now().toString(36); cfg.sections.push({ id: 'custom-' + now, builtin: false, place: 'main', enabled: true, labelFa: 'بخش سفارشی', labelEn: 'Custom section', placeholderFa: 'متن این بخش را وارد کنید…', placeholderEn: 'Write this section…', order: Math.max(...cfg.sections.map(x => +x.order || 0), 0) + 1 }); });
  window.shCvStudioDeleteSection = id => updateCvStudio(cfg => { const section = cfg.sections.find(x => x.id === id); if (!section || section.locked) return; if (section.builtin) section.enabled = false; else cfg.sections = cfg.sections.filter(x => x.id !== id); });
  window.shCvStudioCatalog = (kind, id, key, value) => updateCvStudio(cfg => { const item = (cfg[kind] || []).find(x => x.id === id); if (item) item[key] = key === 'enabled' ? !!value : value; });
  window.shCvStudioAddCatalog = kind => updateCvStudio(cfg => { const prefix = kind === 'skills' ? 'skill-custom-' : 'cert-custom-'; cfg[kind].push({ id: prefix + Date.now().toString(36), legacyIndex: null, fa: kind === 'skills' ? 'مهارت جدید' : 'مدرک جدید', en: kind === 'skills' ? 'New skill' : 'New certificate', enabled: true }); });
  window.shCvStudioDeleteCatalog = (kind, id) => updateCvStudio(cfg => { const item = (cfg[kind] || []).find(x => x.id === id); if (!item) return; if (item.legacyIndex === null) cfg[kind] = cfg[kind].filter(x => x.id !== id); else item.enabled = false; });
  window.shCvStudioReset = () => { if (!cvStudioAdmin()) return; if (!confirm('تنظیمات طراحی رزومه‌ساز به حالت استاندارد برگردد؟')) return; cvStudioStore.set(cvStudioDefault()); cvStudioRenderAdmin(); toasglass('تنظیمات استاندارد رزومه‌ساز بازگردانی شد'); };
  window.shCvPhoto = async function (inp) {
    const file = inp.files && inp.files[0]; if (!file) return;
    const r = await shImgOpt(file, 'avatar'); if (!r) return;
    mediaLib.add({ cat: 'cv', ref: (me.get() || {}).name || '-', filename: r.filename, fmt: r.fmt, kb: r.kb, w: r.w, h: r.h, url: r.url.slice(0, 220) + '…' });
    shCv(d => { d.personal.photo = r.url; });
    const pv = document.getElementById('cvPhotoPv'); if (pv) pv.innerHTML = `<img src="${r.url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };
  window.shCvStep = s => { window.__cvStep = s; if (s === 5) shCvPreview(); shDashTab('cv'); };
  window.shCvPreview = function () {
    const d = cvStore.get();
    const pv = document.getElementById('cvPaper'); if (!pv) return;
    pv.className = 'cv-paper' + (d.lang === 'en' ? ' en' : '');
    pv.innerHTML = window.__cvDoc(d, d.tpl, d.lang);
    if (d.lang === 'en' && !cvTranslationActive && cvTranslationJobs(d, true).length) window.shCvTranslateEnglish(true);
  };
  // PDF engines are loaded only when a member explicitly exports a CV. Loading
  // canvas/PDF libraries on every public route was a major first-load cost.
  function loadScriptOnce(src, key) {
    const id = 'sh-script-' + key;
    const existing = document.getElementById(id);
    if (existing && existing.dataset.ready === 'true') return Promise.resolve();
    if (existing) return new Promise((resolve, reject) => { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.id = id; script.src = src; script.async = true;
      script.addEventListener('load', () => { script.dataset.ready = 'true'; resolve(); }, { once: true });
      script.addEventListener('error', () => reject(new Error('بارگذاری موتور PDF ناموفق بود')), { once: true });
      document.head.appendChild(script);
    });
  }
  async function ensurePdfEngines() {
    if (!window.html2canvas) await loadScriptOnce('js/html2canvas.min.js', 'html2canvas');
    if (!window.jspdf || !window.jspdf.jsPDF) await loadScriptOnce('js/jspdf.umd.min.js', 'jspdf');
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) throw new Error('موتور PDF آماده نشد');
  }

  // خروجی PDF واقعی و دانلود مستقیم — بدون باز کردن پنجره Print مرورگر
  window.shCvPrint = async function (lang) {
    let d = cvStore.get(); const outLang = lang || d.lang || 'fa';
    if (outLang === 'en') { await window.shCvTranslateEnglish(true); d = cvStore.get(); }
    try { await ensurePdfEngines(); }
    catch (e) { toasglass('⚠️ موتور PDF بارگذاری نشد؛ اتصال اینترنت یا فایل‌های سایت را بررسی کنید'); return; }
    let node = document.getElementById('cvPdfRender');
    if (!node) { node = document.createElement('div'); node.id = 'cvPdfRender'; document.body.appendChild(node); }
    node.innerHTML = window.__cvDoc(d, d.tpl, outLang);
    const cvDoc = node.querySelector('.cvdoc');
    if (cvDoc) cvDoc.classList.add('cvdoc-a4');
    /*
      PDF از رندر تصویری کنترل‌شده ساخته می‌شود تا نمایش فارسی به فونت PDF Viewer
      وابسته نباشد. Safari در رندر عنصر کاملاً خارج از viewport گاهی فونت وب را
      جایگزین می‌کند؛ به همین دلیل عنصر در لایهٔ نامرئی خودش نگه داشته می‌شود.
    */
    node.setAttribute('dir', outLang === 'en' ? 'ltr' : 'rtl');
    node.style.cssText = 'position:fixed;z-index:-1;left:0;top:0;width:794px;min-height:1123px;height:auto;overflow:visible;background:#fff;opacity:1;pointer-events:none;contain:layout style paint;';
    try {
      const studio = cvStudioStore.get(); const exportFamily = cvFontFamily(outLang === 'en' ? 'en' : 'fa', outLang === 'en' ? studio.typography.en : studio.typography.fa);
      const fontSample = outLang === 'en' ? 'Swim coach resume | contact | skills | certificates | 123456789' : 'مربی و مدرس شنا | اطلاعات تماس | مهارت‌های تخصصی | مدارک و دوره‌ها | نجات غریق | ۱۲۳۴۵۶۷۸۹';
      const requiredFonts = ['400 16px', '600 16px', '700 16px'].map(weight => `${weight} '${exportFamily}'`);
      if (document.fonts && document.fonts.load) await Promise.all(requiredFonts.map(f => document.fonts.load(f, fontSample)));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      if (document.fonts && document.fonts.check && !requiredFonts.every(f => document.fonts.check(f, fontSample))) throw new Error(exportFamily + ' font did not load');
      // یک فریم رندر اضافه، مانع capture شدن فونت fallback در مرورگرهای WebKit می‌شود.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      toasglass('⏳ فایل PDF فارسی با کیفیت چاپی آماده می‌شود…');
      // Scale 2 keeps Persian glyphs sharp for A4 while avoiding the former
      // 30MB single-page PNG output. JPEG is safe here because the canvas has
      // an explicit white background and contains no transparency.
      const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false, letterRendering: false, windowWidth: 794 });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
      const imageFormat = 'JPEG', imageQuality = 0.88;
      const pageW = 210, pageH = 297;
      const sliceH = Math.floor(canvas.width * pageH / pageW);
      // گردشدن CSS pixel در canvas ممکن است برای یک برگه A4، یک نوار ۱ تا چند پیکسلی
      // بسازد و در نتیجه یک صفحهٔ سفید دوم ایجاد کند. در محدودهٔ تلرانس، همان canvas
      // را دقیقاً روی یک A4 می‌نشانیم؛ رزومه‌های بلند همچنان به‌صورت برش‌های چندصفحه‌ای می‌آیند.
      if (canvas.height <= sliceH + 14) {
        pdf.addImage(canvas.toDataURL('image/jpeg', imageQuality), imageFormat, 0, 0, pageW, pageH, undefined, 'FAST');
      } else {
        let top = 0, page = 0;
        while (top < canvas.height) {
          const h = Math.min(sliceH, canvas.height - top);
          const cut = document.createElement('canvas'); cut.width = canvas.width; cut.height = h;
          const ctx = cut.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cut.width, cut.height);
          ctx.drawImage(canvas, 0, top, canvas.width, h, 0, 0, canvas.width, h);
          if (page++) pdf.addPage();
          pdf.addImage(cut.toDataURL('image/jpeg', imageQuality), imageFormat, 0, 0, pageW, h * pageW / canvas.width, undefined, 'FAST');
          top += h;
        }
      }
      const safeName = (d.personal.name || 'estakhrjo-cv').replace(/[^a-zA-Z0-9\-؀-ۿ ]/g, '').trim().replace(/\s+/g, '-');
      pdf.save(`${safeName || 'estakhrjo-cv'}-${outLang === 'en' ? 'EN' : 'FA'}.pdf`);
      toasglass('✅ PDF مستقیماً دانلود شد');
    } catch (e) {
      console.error('PDF export failed', e);
      toasglass('⚠️ ساخت PDF ناموفق بود؛ لطفاً دوباره تلاش کنید');
    } finally { if (node) node.innerHTML = ''; }
  };

  /* ---------- پنجره‌های داخلی پنل: رزومه، تأمین‌کننده و درخواست استخدام ---------- */
  const lineList = value => Array.isArray(value) ? value.filter(Boolean) : String(value || '').split(/\n|،|,/).map(x => x.trim()).filter(Boolean);
  const resumeIndex = () => {
    const own = (() => { try { return JSON.parse(localStorage.getItem('sh_resume') || 'null'); } catch (e) { return null; } })();
    return [...(own ? [{ ...own, id: 'mine', _mine: true }] : []), ...Resumes];
  };
  window.shDetailClose = () => {
    const el = document.getElementById('shDetailOv'); if (!el) return;
    if (el.__shKey) document.removeEventListener('keydown', el.__shKey);
    const returnFocus = el.__shReturnFocus; el.remove();
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  };
  function openDetail(title, body, klass) {
    window.shDetailClose();
    const ov = document.createElement('div'); ov.id = 'shDetailOv'; ov.className = 'sh-detail-ov';
    ov.__shReturnFocus = document.activeElement;
    ov.innerHTML = `<section class="sh-detail ${klass || ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sh-detail-head"><b>${title}</b><button onclick="shDetailClose()" aria-label="بستن">×</button></div>
      <div class="sh-detail-body">${body}</div>
      <div class="sh-detail-foot"><button class="btn btn-ghost" onclick="shDetailClose()">بستن</button></div>
    </section>`;
    ov.addEventListener('click', e => { if (e.target === ov) window.shDetailClose(); });
    ov.__shKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); window.shDetailClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = [...ov.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.hidden);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', ov.__shKey);
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.querySelector('button[aria-label="بستن"]')?.focus());
  }
  window.shResumeView = key => {
    let r = resumeIndex().find(x => String(x.id) === String(key));
    if (!r) { const o = cvOfferStore.get().find(x => String(x.id) === String(key)); if (o && o.cv) { const d = o.cv; r = { id: o.id, user_name: o.name, title: 'مربی شنا', city: o.city, phone: o.phone, contact: o.phone, bio: o.bio, photo: o.photo, gender: o.gender, skills: cvSelectedSkills(d).map(item => item.fa).filter(Boolean), certs: cvSelectedCerts(d).map(item => item.fa).filter(Boolean), exp_years: cvAutomaticWork(d.exp).years || 0, availability: 'آماده همکاری', expected_salary: cvSalaryText(d.personal?.expected_salary, false) || 'توافقی' }; } }
    if (!r) { toasglass('رزومه پیدا نشد'); return; }
    const skills = lineList(r.skills), certs = lineList(r.certs);
    openDetail('📄 رزومه ' + esc(r.user_name || 'متخصص'), `
      <div class="resume-view-top"><span class="resume-view-av">${esc(r.image || r.avatar || '👤')}</span><div><h2>${esc(r.user_name || 'متخصص')}</h2><p>${esc(r.title || 'متخصص شنا')} · ${toFa(r.exp_years || 0)} سال سابقه</p><span>📍 ${esc(r.city || '—')} · ${esc(r.availability || 'آماده همکاری')}</span></div></div>
      ${r.bio ? `<div class="resume-view-about"><b>درباره حرفه‌ای</b><p>${esc(r.bio)}</p></div>` : ''}
      <div class="resume-view-grid"><div><b>مهارت‌های تخصصی</b><div class="resume-view-chips">${skills.map(x => `<span>${esc(x)}</span>`).join('') || '<small>ثبت نشده</small>'}</div></div><div><b>مدارک و گواهی‌ها</b><div class="resume-view-chips cert">${certs.map(x => `<span>${esc(x)}</span>`).join('') || '<small>ثبت نشده</small>'}</div></div></div>
      <div class="resume-view-facts"><span>💼 وضعیت: ${esc(r.status === 'seeking' ? 'در جستجوی کار' : r.status || 'فعال')}</span><span>💰 حقوق مورد انتظار: ${esc(r.expected_salary || 'توافقی')}</span></div>
      ${r._mine ? '<div class="detail-note">این رزومه متعلق به شماست و از همین برد قابل مدیریت است.</div>' : `<div class="detail-contact"><a class="btn btn-primary" href="tel:${esc(r.contact || '')}">📞 تماس مستقیم</a></div>`}`);
  };
  window.shSupplierChat = id => { const x = Suppliers.find(s => String(s.id) === String(id)); if (!x) return; const peer = { id: 'supplier:' + x.id, name: x.name, direct_message: x.direct_message !== false }; if (!directMessageAllowed(peer)) { toasglass('این کسب‌وکار دریافت پیام مستقیم را غیرفعال کرده است'); return; } window.shDetailClose(); if (document.body.dataset.page === 'dashboard') shDashTab('inbox', '&to=' + encodeURIComponent(peer.id)); else location.href = 'https://estakhrjo.ir/chat.html?to=' + encodeURIComponent(peer.id) + '&name=' + encodeURIComponent(x.name); };
  window.shSupplierProfile = id => {
    const x = Suppliers.find(s => String(s.id) === String(id));
    if (!x) { toasglass('پروفایل تأمین‌کننده پیدا نشد'); return; }
    openDetail('🏭 پروفایل تأمین‌کننده', `
      <div class="supplier-view-top"><span>${esc(x.logo || '🏭')}</span><div><h2>${esc(x.name)}</h2><p>${esc(x.category || 'تأمین‌کننده تجهیزات استخری')} ${x.verified ? '<em>✓ تأییدشده</em>' : ''}</p><small>📍 ${esc(x.city || '—')} · ⭐ ${toFa(x.rating || 0)} از ${toFa(x.rate_count || 0)} نظر</small></div></div>
      <p class="supplier-view-desc">${esc(x.description || 'تأمین کالا و خدمات تخصصی حوزه استخر.')}</p>
      <div class="resume-view-grid"><div><b>محصولات اصلی</b><ul class="detail-list">${lineList(x.products).map(v => `<li>${esc(v)}</li>`).join('') || '<li>در حال تکمیل</li>'}</ul></div><div><b>خدمات</b><ul class="detail-list">${lineList(x.services).map(v => `<li>${esc(v)}</li>`).join('') || '<li>در حال تکمیل</li>'}</ul></div></div>
      ${x.min_order ? `<div class="detail-note">حداقل سفارش: ${money(x.min_order)}</div>` : ''}
      <div class="detail-contact">${cfgContact('suppliers', x.name) ? `<a class="btn btn-primary" href="tel:${esc(x.phone || '')}">📞 ${esc(x.phone || 'تماس')}</a>` : '<span class="mini-tag">🔒 اطلاعات تماس با تأیید کسب‌وکار نمایش داده می‌شود</span>'}${directMessageAllowed({ id: 'supplier:' + x.id, name: x.name, direct_message: x.direct_message !== false }) ? `<button class="btn btn-ghost" onclick="shSupplierChat('${esc(String(x.id))}')">💬 پیام مستقیم</button>` : '<span class="mini-tag">🔒 پیام مستقیم غیرفعال است</span>'}</div>`, 'supplier-detail');
  };
  const isCoachJob = j => /مربی\s*(شنا|کودک|بانوان|کمکی|نیمه|تابستان)|coach/i.test(String((j || {}).title || ''));
  const jobPhone = j => { const wanted = String(j.pool_name || '').replace(/\s+/g, ' ').trim(); const byName = Pools.find(x => wanted && (String(x.name || '').includes(wanted) || wanted.includes(String(x.name || '')))); const p = byName || Pools.find(x => String(x.id) === String(j.pool_id || j.employer_id)) || {}; return j.phone || j.contact || p.phone || ''; };
  const jobActionHtml = (kind, j, label) => isCoachJob(j)
    ? `<button class="btn btn-gold btn-sm" onclick="shJobApply('${kind}','${esc(String(j.id))}')">📨 ${label || 'ارسال رزومه'}</button>`
    : (jobPhone(j) ? `<a class="btn btn-primary btn-sm" href="tel:${esc(jobPhone(j))}">📞 تماس</a>` : '<span class="mini-tag">شماره تماس ثبت نشده</span>');
  const jobStore = { key: 'sh_job_apps', get() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } }, set(a) { localStorage.setItem(this.key, JSON.stringify(a)); }, add(x) { const a = this.get(); a.unshift(x); this.set(a); } };
  /*
   * حساب‌ها در نسخهٔ استاتیک در localStorage نگهداری می‌شوند تا مدیر بتواند
   * ساخت، ویرایش و مشاهدهٔ کامل اطلاعات ورود را بدون خروج از پنل انجام دهد.
   * در استقرار سروری باید همین قرارداد داده به API امن/رمزنگاری‌شده منتقل شود.
   */
  const memberAdminStore = { key: 'sh_member_admin', get() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } } };
  const authAccounts = {
    key: 'sh_auth_accounts_v1',
    raw() { try { const cloud = window.SH_CLOUD_AUTH; if (cloud && cloud.active) { const remote = cloud.accounts(); if (Array.isArray(remote)) return remote; } const x = JSON.parse(localStorage.getItem(this.key) || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } },
    save(list) { const cloud = window.SH_CLOUD_AUTH; if (cloud && cloud.active) return list; localStorage.setItem(this.key, JSON.stringify(list)); },
    normalize(x) {
      const def = AUTH_ROLES[x.u] || AUTH_ROLES.demo;
      return { id: x.id || ('acc-' + Date.now()), legacyId: x.legacyId || '', legacyMerged: !!x.legacyMerged, username: String(x.username || '').trim().toLowerCase(), password: String(x.password || ''), name: String(x.name || 'عضو استخر جو | ESTAKHRJO').trim(), u: AUTH_ROLES[x.u] ? x.u : 'demo', role: x.role || def.label, avatar: x.avatar || def.icon, city: x.city || 'تهران', gender: x.gender === 'women' || x.gender === 'men' ? x.gender : '', status: x.status === 'inactive' || x.status === 'suspended' ? 'inactive' : 'active', subscription: x.subscription || x.plan || 'پایه', createdAt: x.createdAt || new Date().toISOString() };
    },
    get() {
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && cloud.active) return this.raw().map(x => this.normalize(x));
      let list = this.raw().map(x => this.normalize(x)); let changed = !list.length;
      if (!list.length) list = legacyAccountSeeds().map(x => this.normalize(x));
      const oldStates = memberAdminStore.get();
      list.forEach(a => {
        const legacy = oldStates[a.name]; if (!legacy || a.legacyMerged) return;
        if (legacy.status) a.status = legacy.status === 'active' ? 'active' : 'inactive';
        if (legacy.plan) a.subscription = legacy.plan;
        if (legacy.adminRole && legacy.adminRole !== 'عضو') { a.role = legacy.adminRole; if (legacy.adminRole === 'مدیر سیستم') { a.u = 'admin'; a.avatar = '👑'; } }
        a.legacyMerged = true; changed = true;
      });
      const existingLegacy = new Set(list.map(x => x.legacyId).filter(Boolean));
      legacyAccountSeeds().forEach(seed => { if (!existingLegacy.has(seed.legacyId)) { list.push(this.normalize(seed)); changed = true; } });
      const used = new Set();
      list.forEach(a => { if (!a.username || used.has(a.username)) { a.username = nextSmartUsername(a.name, a.u, list.filter(x => x.id !== a.id)); changed = true; } used.add(a.username); });
      if (changed) this.save(list);
      return list;
    },
    byId(id) { return this.get().find(a => a.id === id); },
    byUsername(username) { const key = String(username || '').trim().toLowerCase(); return this.get().find(a => a.username === key); },
    update(id, patch) {
      const list = this.get(); const i = list.findIndex(a => a.id === id); if (i < 0) return { ok: false, error: 'حساب پیدا نشد' };
      const next = this.normalize({ ...list[i], ...patch });
      if (!next.username) return { ok: false, error: 'نام کاربری الزامی است' };
      if (list.some(a => a.id !== id && a.username === next.username)) return { ok: false, error: 'این نام کاربری قبلاً استفاده شده است' };
      if (!isStrongPassword(next.password)) return { ok: false, error: 'رمز عبور باید حداقل ۱۲ کاراکتر و شامل حروف بزرگ و کوچک، عدد و نماد باشد' };
      list[i] = next; this.save(list); return { ok: true, account: next };
    },
    create(data) {
      const list = this.get(); const id = 'acc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      const out = this.updateNew(list, { ...data, id, createdAt: new Date().toISOString() }); if (!out.ok) return out;
      list.unshift(out.account); this.save(list); return out;
    },
    updateNew(list, data) {
      if (!String(data.name || '').trim()) return { ok: false, error: 'نام عضو الزامی است' };
      const next = this.normalize(data);
      if (!next.username) return { ok: false, error: 'نام کاربری الزامی است' };
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/i.test(next.username)) return { ok: false, error: 'نام کاربری باید ۳ تا ۳۲ کاراکتر لاتین، عدد، نقطه، خط تیره یا زیرخط باشد' };
      if (list.some(a => a.username === next.username)) return { ok: false, error: 'این نام کاربری قبلاً استفاده شده است' };
      if (!isStrongPassword(next.password)) return { ok: false, error: 'رمز عبور باید حداقل ۱۲ کاراکتر و شامل حروف بزرگ و کوچک، عدد و نماد باشد' };
      return { ok: true, account: next };
    },
  };
  const adminAuditStore = { key: 'sh_admin_audit', get() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } }, add(action, subject) { const a = this.get(); a.unshift({ id: 'audit-' + Date.now(), action, subject, at: new Date().toISOString() }); localStorage.setItem(this.key, JSON.stringify(a.slice(0, 40))); } };
  const adminLog = (action, subject) => adminAuditStore.add(action, subject);
  const sessionFor = (a, prior) => ({ ...(prior || {}), accountId: a.id, username: a.username, u: a.u, name: a.name, avatar: a.avatar, role: a.role, city: a.city, phone: a.phone ?? ((prior || {}).phone || ''), email: a.email ?? ((prior || {}).email || ''), bio: a.bio ?? ((prior || {}).bio || ''), instagram: a.instagram ?? ((prior || {}).instagram || ''), direct_messages: a.direct_messages ?? ((prior || {}).direct_messages ?? true), photos: a.photos ?? ((prior || {}).photos || []), wallet: a.wallet ?? ((prior || {}).wallet || 0), points: a.points ?? ((prior || {}).points || 0), gender: (a.gender === 'women' || a.gender === 'men') ? a.gender : (((prior || {}).gender === 'women' || (prior || {}).gender === 'men') ? (prior || {}).gender : '') });
  const activeSessionAccount = () => { const u = me.get(); return u && u.accountId ? authAccounts.byId(u.accountId) : null; };
  /* وقتی کاربر با حساب ابری لاگین کرده، فهرست حساب‌ها فقط در حافظهٔ سرویس
     ابری است (رمزها عمداً روی دیسک نوشته نمی‌شوند). در لود تازهٔ هر صفحه،
     تا پایان restore سرویس، هنوز حسابی در دسترسِ محلی نیست — این پنجرهٔ
     کوتاه «در انتظار بازیابی» است و رندر خوش‌بینانهٔ پنل مجاز است. */
  const cloudSessionPending = () => {
    try {
      if (!window.SH_CLOUD_AUTH || window.SH_CLOUD_AUTH.active) return false;
      return !!localStorage.getItem('sh_cloud_auth_session');
    } catch (e) { return false; }
  };
  function credentialLogin(username, password, adminOnly) {
    const a = authAccounts.byUsername(username);
    if (!a || a.password !== String(password || '')) return { ok: false, message: 'نام کاربری یا رمز عبور اشتباه است' };
    if (a.status !== 'active') return { ok: false, message: 'این حساب توسط مدیر غیرفعال شده است' };
    if (adminOnly && a.u !== 'admin') return { ok: false, message: 'این حساب دسترسی مدیریت سیستم ندارد' };
    me.set(sessionFor(a)); renderNav(); return { ok: true, account: a };
  }
  window.shCredentialLogin = async (usernameId, passwordId, adminOnly) => {
    const username = (document.getElementById(usernameId) || {}).value || ''; const password = (document.getElementById(passwordId) || {}).value || ''; const card = document.getElementById(adminOnly ? 'adminCard' : 'loginCard');
    try {
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && await cloud.available()) {
        const remote = await cloud.login(username, password); const account = remote.account;
        if (adminOnly && account.u !== 'admin') { await cloud.logout(); throw new Error('این حساب دسترسی مدیریت سیستم ندارد'); }
        authAccounts.save(cloud.accounts()); me.set(sessionFor(account)); renderNav(); toasglass('✓ خوش آمدید ' + account.name + (account.gender === 'women' ? ' — 👩 پنل شما در حالت بانوان تنظیم شد' : account.gender === 'men' ? ' — 👨 پنل شما در حالت آقایان تنظیم شد' : '')); setTimeout(() => location.href = (adminOnly ? ADMIN_CONSOLE_URL : 'dashboard.html?build=ppf8'), 450); return;
      }
      if (!ALLOW_LOCAL_AUTH_FALLBACK) throw new Error('ورود فقط از طریق سرویس امن ابری امکان‌پذیر است. لطفاً چند لحظه بعد دوباره تلاش کنید.');
      const res = credentialLogin(username, password, !!adminOnly);
      if (res.ok) { toasglass('✓ خوش آمدید ' + res.account.name + (res.account.gender === 'women' ? ' — 👩 پنل شما در حالت بانوان تنظیم شد' : res.account.gender === 'men' ? ' — 👨 پنل شما در حالت آقایان تنظیم شد' : '')); setTimeout(() => location.href = (adminOnly ? ADMIN_CONSOLE_URL : 'dashboard.html?build=ppf8'), 450); return; }
      throw new Error(res.message);
    } catch (e) {
      toasglass('❌ ' + (e.message || 'نام کاربری یا رمز عبور اشتباه است'));
      if (card) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'shakeX .45s ease'; }
    }
  };
  /* ---- group permission matrix (admin) ---------------------------------
     Renders the live server matrix. Every toggle is a round-trip: the server
     re-checks that the caller is an admin, refuses the three core features,
     writes an audit row and returns the whole matrix back, which is what we
     re-render from. Nothing is trusted locally. */
  const PERM_GROUP_LABELS = {
    coach: '🏅 مربیان', pool: '🏊 مالکان استخرها', store: '🛍️ تأمین‌کنندگان',
    hydro: '✚ هیدروتراپیست‌ها', customer: '🙂 کاربران عادی',
    company: '🏢 شرکت‌ها', academy: '🎓 آکادمی‌ها', lifeguard: '🛟 ناجیان',
  };
  const PERM_FEATURE_LABELS = {
    overview: '◈ داشبورد', profile: '◌ پروفایل من', public_profile: '◇ صفحه عمومی من',
    venues: '▰ استخرهای من', catalog: '▣ کالا و خدمات من', work: '≋ محل کار و سانس‌ها',
    b2b: '⬡ شبکه تأمین B2B', jobs: '⌁ آگهی‌های استخدام', resumes: '▤ برد رزومه',
    shop: '▣ فروشگاه تأمین‌کنندگان', inbox: '🎧 پشتیبانی', bookings: '◉ بلیت‌های من',
    ads: '◇ آگهی‌های من', cv: '▤ رزومه‌ساز هوشمند', sub: '↻ آگهی جایگزینی',
    fav: '♡ علاقه‌مندی‌ها', hydro: '✚ هیدروتراپی', events: '✺ رویدادها',
    articles: '≡ مجله شنا', wallet: '◌ کیف پول', site_links: '🌐 میان‌برهای خدمات سایت',
  };
  let permMatrix = null;
  let permNavRole = '';

  window.shPermReload = async () => {
    const host = document.getElementById('permMatrixHost');
    if (!host) return;
    const cloud = window.SH_CLOUD_AUTH;
    if (!cloud || !cloud.active) { host.innerHTML = '<div class="ppf-offline">برای مدیریت دسترسی‌ها باید با حساب ابری مدیر وارد شوید.</div>'; return; }
    try {
      permMatrix = await cloud.getPanelPermissions();
      shPermRender();
    } catch (e) {
      host.innerHTML = `<div class="ppf-offline">دریافت جدول دسترسی ناموفق بود: ${esc(e.message || '')}</div>`;
    }
  };

  function shPermRender() {
    const host = document.getElementById('permMatrixHost');
    if (!host || !permMatrix) return;
    const { matrix, roles, features, core } = permMatrix;
    const head = `<tr><th class="perm-corner">قابلیت پنل</th>${roles.map(r => {
      const on = features.filter(f => matrix[r][f]).length;
      return `<th><b>${esc(PERM_GROUP_LABELS[r] || r)}</b><small>${toFa(on)} از ${toFa(features.length)}</small>
        <div class="perm-bulk"><button onclick="shPermBulk('${r}',true)" title="همه روشن">همه</button><button onclick="shPermBulk('${r}',false)" title="همه خاموش">هیچ</button></div></th>`;
    }).join('')}</tr>`;
    const coreRows = core.map(f => `<tr class="perm-core"><th>${esc(PERM_FEATURE_LABELS[f] || f)}</th>${roles.map(() => '<td><span class="perm-lock" title="همیشه فعال — قابل خاموش‌کردن نیست">همیشه</span></td>').join('')}</tr>`).join('');
    const rows = features.map(f => `<tr><th>${esc(PERM_FEATURE_LABELS[f] || f)}</th>${roles.map(r => {
      const on = !!matrix[r][f];
      return `<td><button class="perm-cell ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc((PERM_FEATURE_LABELS[f] || f) + ' برای ' + (PERM_GROUP_LABELS[r] || r))}" onclick="shPermToggle('${r}','${f}')">${on ? '✓' : ''}</button></td>`;
    }).join('')}</tr>`).join('');
    const navByRole = permMatrix.bottomNavByRole || {};
    if (!roles.includes(permNavRole)) permNavRole = roles[0];
    const nav = navByRole[permNavRole] || { items: core.slice(), max: 5 };
    // Only capabilities actually granted to this group are offered. Core
    // entries remain available because the server always grants them.
    const pickable = [...core, ...features.filter(f => !!matrix[permNavRole][f])];
    const effectiveItems = nav.items.filter(f => pickable.includes(f));
    const roleTabs = roles.map(role => {
      const cfg = navByRole[role] || { items: core.slice(), max: 5 };
      const available = new Set([...core, ...features.filter(f => !!matrix[role][f])]);
      const count = cfg.items.filter(f => available.has(f)).length;
      return `<button class="bnav-role-tab ${role === permNavRole ? 'on' : ''}" onclick="shBnavRole('${role}')"><b>${esc(PERM_GROUP_LABELS[role] || role)}</b><small>${toFa(count)} گزینه</small></button>`;
    }).join('');
    const chips = pickable.map(f => {
      const on = effectiveItems.indexOf(f) !== -1;
      const order = on ? effectiveItems.indexOf(f) + 1 : 0;
      return `<button class="bnav-chip ${on ? 'on' : ''}" onclick="shBnavToggle('${f}')">${on ? `<i>${toFa(order)}</i>` : ''}${esc(PERM_FEATURE_LABELS[f] || f)}</button>`;
    }).join('');
    const counts = [2, 3, 4, 5].map(n => `<button class="bnav-count ${nav.max === n ? 'on' : ''}" onclick="shBnavMax(${n})">${toFa(n)}</button>`).join('');
    host.innerHTML = `<section class="bnav-box">
        <div class="bnav-head"><b>📱 نوار پایین موبایل برای هر گروه</b><small>هر گروه تنظیم مستقل دارد. ابتدا نوع کاربر را از تب‌ها انتخاب کنید؛ سپس گزینه‌ها را به ترتیب دلخواه بزنید.</small></div>
        <div class="bnav-role-tabs" role="tablist" aria-label="انتخاب گروه کاربری">${roleTabs}</div>
        <div class="bnav-selected-role"><span>در حال تنظیم:</span><b>${esc(PERM_GROUP_LABELS[permNavRole] || permNavRole)}</b><small>فقط قابلیت‌های مجاز این گروه در پایین دیده می‌شوند.</small></div>
        <div class="bnav-chips">${chips}</div>
        <div class="bnav-max"><span>تعداد قابل نمایش:</span>${counts}<em>${toFa(effectiveItems.length)} مورد انتخاب شده</em></div>
      </section>
      <div class="perm-legend"><span><i class="perm-cell on">✓</i> مجاز</span><span><i class="perm-cell"></i> مسدود</span><span><i class="perm-lock">همیشه</i> همیشه فعال</span></div>
      <div class="perm-scroll"><table class="perm-table">${head}${coreRows}${rows}</table></div>`;
  }

  window.shBnavRole = role => {
    if (!permMatrix || !permMatrix.roles.includes(role)) return;
    permNavRole = role;
    shPermRender();
  };
  window.shBnavToggle = async feature => {
    if (!permMatrix || !permNavRole) return;
    const nav = (permMatrix.bottomNavByRole || {})[permNavRole] || { items: [], max: 5 };
    const allowed = new Set([...permMatrix.core, ...permMatrix.features.filter(f => !!permMatrix.matrix[permNavRole][f])]);
    const items = nav.items.filter(f => allowed.has(f));
    const at = items.indexOf(feature);
    if (at === -1) { if (items.length >= 5) return toasglass('نوار پایین هر گروه حداکثر ۵ مورد می‌پذیرد'); items.push(feature); }
    else items.splice(at, 1);
    if (!items.length) return toasglass('دست‌کم یک مورد برای این گروه لازم است');
    try {
      permMatrix = await window.SH_CLOUD_AUTH.setBottomNav(permNavRole, items, nav.max);
      shPermRender();
      adminLog(`نوار پایین موبایل ${PERM_GROUP_LABELS[permNavRole] || permNavRole} به‌روزرسانی شد`);
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره نشد')); }
  };
  window.shBnavMax = async max => {
    if (!permMatrix || !permNavRole) return;
    const nav = (permMatrix.bottomNavByRole || {})[permNavRole] || { items: permMatrix.core.slice(), max: 5 };
    const allowed = new Set([...permMatrix.core, ...permMatrix.features.filter(f => !!permMatrix.matrix[permNavRole][f])]);
    const items = nav.items.filter(f => allowed.has(f));
    try {
      permMatrix = await window.SH_CLOUD_AUTH.setBottomNav(permNavRole, items, max);
      shPermRender();
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره نشد')); }
  };

  window.shPermToggle = async (role, feature) => {
    if (!permMatrix) return;
    const next = !permMatrix.matrix[role][feature];
    try {
      permMatrix = await window.SH_CLOUD_AUTH.setPanelPermission(role, feature, next);
      shPermRender();
      adminLog(`دسترسی «${PERM_FEATURE_LABELS[feature] || feature}» برای ${PERM_GROUP_LABELS[role] || role} ${next ? 'باز' : 'بسته'} شد`);
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره نشد')); }
  };
  window.shPermBulk = async (role, allowed) => {
    try {
      permMatrix = await window.SH_CLOUD_AUTH.setPanelPermissionsBulk(role, allowed);
      shPermRender();
      adminLog(`همهٔ دسترسی‌های ${PERM_GROUP_LABELS[role] || role} ${allowed ? 'باز' : 'بسته'} شد`);
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره نشد')); }
  };

  /* The console is organised by what an operator is actually managing:
     the system itself, the public site, and the member panel. Every section
     lives under exactly one of those, in the side menu — not as a grid of
     cards in the workspace, which duplicated the navigation and hid half of
     it below the fold. */
  /* Some approval queues live on the server, not in localStorage, so the
     console has to go and ask. Public page submissions were the obvious gap:
     they had their own section but never appeared in the approvals queue, so
     the number the operator trusted was wrong. */
  const adminRemotePending = { publicProfiles: 0, loaded: false };
  const adminPendingTotal = pending =>
    Object.values(pending || {}).reduce((a, b) => a + b, 0) + (adminRemotePending.publicProfiles || 0);

  async function refreshAdminRemotePending(rerender) {
    const cloud = window.SH_CLOUD_AUTH;
    if (!cloud || !cloud.active) { adminRemotePending.loaded = true; return; }
    try {
      const out = await cloud.getPublicProfileReviewList();
      adminRemotePending.publicProfiles = (out.items || []).length;
    } catch (_) { /* leave the count at zero rather than block the console */ }
    adminRemotePending.loaded = true;
    if (rerender) rerender();
  }

  /* ---------- لاگ فعالیت‌ها (کنسول مدیریت · پنل اعضا) ---------- */
  const activityLogState = { logs: [], members: [], filter: '', more: false, loading: false, loaded: false, error: '' };
  const ACTIVITY_LABELS = {
    'login': 'ورود به پنل', 'me': 'باز کردن / همگام‌سازی پنل', 'bootstrap': 'راه‌اندازی نشست تازه',
    'create-account': 'ساخت حساب عضو', 'update-account': 'ویرایش حساب', 'accounts': 'دریافت فهرست حساب‌ها',
    'chat-send': 'ارسال پیام', 'chat-list': 'باز کردن گپ', 'chat-thread': 'خواندن گفتگو',
    'support-create': 'ثبت تیکت پشتیبانی', 'support-reply': 'پاسخ تیکت پشتیبانی', 'support-update': 'تغییر وضعیت تیکت',
    'support-satisfaction': 'امتیازدهی به پشتیبانی', 'support-assist': 'دستیار هوشمند پشتیبانی', 'support-attachment-upload': 'بارگذاری پیوست تیکت',
    'support-admin-bundle': 'میز پشتیبانی مدیر', 'support-knowledge-save': 'ویرایش دانش پشتیبانی', 'support-macro-save': 'ویرایش پاسخ آماده', 'support-outcome': 'ثبت نتیجهٔ پشتیبانی', 'support-reports': 'گزارش‌های پشتیبانی',
    'messaging-settings-get': 'تنظیمات پیام‌رسان', 'messaging-settings-set': 'ذخیرهٔ تنظیمات پیام‌رسان',
    'cv-studio-get': 'باز کردن رزومه‌ساز', 'cv-studio-save': 'ذخیرهٔ رزومه',
    'coach-profile-get': 'باز کردن پروفایل حرفه‌ای', 'coach-profile-save': 'ذخیرهٔ پروفایل حرفه‌ای', 'coach-work-save': 'ذخیرهٔ محل کار و سانس‌ها',
    'public-profile-own': 'ویرایشگر صفحهٔ عمومی', 'public-profile-save': 'ذخیرهٔ صفحهٔ عمومی', 'public-profile-analytics': 'آمار صفحهٔ عمومی',
    'public-profile-self-unpublish': 'لغو انتشار صفحهٔ عمومی', 'public-profile-review-list': 'صف بررسی صفحه‌های عمومی', 'public-profile-review': 'بررسی صفحهٔ عمومی', 'set-public-profile-admin-state': 'تغییر وضعیت انتشار عمومی',
    'submit-resume': 'ارسال رزومه', 'submit-member-ad': 'ثبت آگهی',
    'state-save': 'ذخیرهٔ وضعیت پنل', 'panel-permissions': 'مشاهدهٔ دسترسی گروه‌ها', 'panel-permissions-set': 'تغییر دسترسی گروه', 'panel-permissions-bulk': 'اعمال دسترسی گروهی', 'panel-bottom-nav-set': 'تنظیم نوار پایین پنل',
    'site-design-get': 'مشاهدهٔ طراحی سایت', 'site-design-save': 'ذخیرهٔ طراحی سایت',
    'page-builder-get': 'باز کردن ویرایشگر سایت', 'page-builder-save': 'ذخیرهٔ پیش‌نویس سایت', 'page-builder-publish': 'انتشار وب‌سایت', 'page-builder-restore': 'بازگردانی نسخهٔ سایت', 'page-builder-versions': 'فهرست نسخه‌های سایت',
  };
  const activityActionLabel = a => ACTIVITY_LABELS[a] || a;
  const activityIcon = a => {
    if (a === 'login') return '🔓';
    if (a.startsWith('support')) return '🎧';
    if (a.startsWith('chat')) return '💬';
    if (a.startsWith('public-profile') || a.startsWith('coach') || a.startsWith('set-public')) return '🌐';
    if (a.startsWith('cv')) return '📄';
    if (a.startsWith('page-builder') || a.startsWith('site-design')) return '🎨';
    if (a.startsWith('panel')) return '🔐';
    if (a === 'state-save') return '💾';
    if (a === 'submit-resume') return '📑';
    if (a === 'submit-member-ad') return '📣';
    if (a === 'update-account' || a === 'create-account') return '👤';
    return '•';
  };
  function activityLogViewHtml(st) {
    const options = ['<option value="">همهٔ اعضا — همهٔ لاگ‌ها پشت‌سرهم</option>'].concat((st.members || []).map(m =>
      `<option value="${esc(m.id)}"${st.filter === m.id ? ' selected' : ''}>${esc(m.full_name)}${m.username ? ' (@' + esc(m.username) + ')' : ''}${m.role === 'admin' ? ' · مدیر' : ''}</option>`)).join('');
    let body = '';
    if (st.loading && !st.logs.length) body = '<div class="ppf-loading">در حال دریافت لاگ‌ها…</div>';
    else if (st.error && !st.logs.length) body = `<div class="empty" style="padding:28px"><span class="e-ic">⚠️</span><b>دریافت لاگ‌ها ناموفق بود</b><small>${esc(st.error)}</small><button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="shActivityRefresh()">تلاش دوباره</button></div>`;
    else if (!st.logs.length) body = '<div class="empty" style="padding:28px"><span class="e-ic">🧾</span><b>هنوز لاگی ثبت نشده است</b><small>هر ورود، هر رمز اشتباه و هر فعالیت اعضا به‌محض وقوع همین‌جا ظاهر می‌شود.</small></div>';
    else {
      body = '<div class="al-list">' + st.logs.map(l => {
        const p = l.profiles || {};
        const who = p.full_name
          ? `${esc(p.full_name)}${p.username ? ` <small dir="ltr">@${esc(p.username)}</small>` : ''}`
          : (l.username_tried ? `<em class="al-anon" dir="ltr">${esc(l.username_tried)}</em>` : '<em class="al-anon">ناشناس</em>');
        const t = new Date(l.created_at);
        return `<div class="al-row${l.ok ? '' : ' fail'}"><span class="al-time">${t.toLocaleDateString('fa-IR')} · ${t.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span class="al-ic">${activityIcon(l.action)}</span><span class="al-who">${who}</span><span class="al-act">${esc(activityActionLabel(l.action))}</span><span class="${l.ok ? 'al-ok' : 'al-err'}">${l.ok ? '✓' : '✗ ' + esc(l.error || 'ناموفق')}</span><span class="al-ip" dir="ltr">${esc(l.remote_ip || '')}</span></div>`;
      }).join('') + '</div>';
      if (st.more) body += '<div class="al-more"><button class="btn btn-ghost btn-sm" onclick="shActivityMore()">موارد قدیمی‌تر ↓</button></div>';
      else body += '<div class="al-end">— پایان لاگ‌های موجود —</div>';
    }
    return `<section class="admin-view-head"><div><span>پنل اعضا · ردگیری</span><h3>لاگ فعالیت‌ها</h3><p>هر ورود، هر رمز یا نام کاربری اشتباه و هر اقدام اعضا در پنل، خط‌به‌خط با زمان ثبت می‌شود. حالت پیش‌فرض همهٔ لاگ‌ها پشت‌سرهم است؛ با انتخاب یک عضو، فقط فعالیت‌های همان عضو را می‌بینید.</p></div><div class="admin-view-actions"><span class="admin-live"><i></i>${toFa(st.logs.length)} ردیف</span><button class="btn btn-ghost btn-sm" onclick="shActivityRefresh()">↻ تازه‌سازی</button></div></section><section class="panel al-panel"><div class="al-filter"><label>👤 <select onchange="shActivityFilter(this.value)">${options}</select></label>${st.loading && st.logs.length ? '<small class="al-loading">در حال دریافت…</small>' : ''}</div>${body}</section>`;
  }
  function renderActivityLog() {
    const mount = document.getElementById('shActivityLogMount');
    if (mount) mount.innerHTML = activityLogViewHtml(activityLogState);
  }
  async function loadActivityLog(append) {
    const cloud = window.SH_CLOUD_AUTH;
    const mount = document.getElementById('shActivityLogMount');
    if (!mount) return;
    if (!cloud || !cloud.getActivityLog || !cloud.active) {
      mount.innerHTML = '<div class="empty" style="padding:28px"><span class="e-ic">☁️</span><b>اتصال ابری در دسترس نیست</b><small>لاگ فعالیت‌ها با نشست فعال مدیر قابل دریافت است. یک‌بار دیگر وارد حساب مدیر شوید.</small></div>';
      return;
    }
    const st = activityLogState;
    st.loading = true; st.error = '';
    if (!append) st.logs = [];
    renderActivityLog();
    try {
      const before = append && st.logs.length ? st.logs[st.logs.length - 1].id : 0;
      const out = await cloud.getActivityLog({ profile_id: st.filter, limit: 60, before });
      st.logs = append ? st.logs.concat(out.logs || []) : (out.logs || []);
      st.members = (out.members && out.members.length ? out.members : st.members);
      st.more = !!out.more;
      st.loaded = true;
    } catch (err) {
      st.error = String((err && err.message) || err);
    } finally {
      st.loading = false;
      renderActivityLog();
    }
  }
  window.shActivityLogMount = () => {
    const st = activityLogState;
    if (st.loaded && !st.loading) renderActivityLog();
    else loadActivityLog(false);
  };
  window.shActivityFilter = v => { activityLogState.filter = v; loadActivityLog(false); };
  window.shActivityMore = () => loadActivityLog(true);
  window.shActivityRefresh = () => { activityLogState.loaded = true; loadActivityLog(false); };

  const ADMIN_GROUPS = [
    ['manage', '👑', 'پنل مدیریت', 'حساب‌ها، صف تأیید و حاکمیت', [
      ['overview', '◈', 'نمای کلی'],
      ['support', '🎧', 'پشتیبانی'],
      ['members', '👥', 'اعضا'],
      ['approvals', '🛡️', 'تأییدها'],
      ['plans', '✦', 'اشتراک‌ها'],
      ['governance', '⚙️', 'حاکمیت'],
    ]],
    ['site', '🌐', 'سایت', 'ظاهر و قواعد وب‌سایت عمومی', [
      ['experience', '🧭', 'قواعد سایت'],
      ['builder', '◇', 'Website Builder'],
      ['design', '🎨', 'طراحی'],
    ]],
    ['member', '🧩', 'پنل اعضا', 'دسترسی گروه‌ها و ابزارهای عضو', [
      ['permissions', '🔐', 'دسترسی گروه‌ها'],
      ['publicprofiles', '◇', 'صفحات عمومی'],
      ['cvstudio', '📄', 'رزومه‌ساز'],
          ['activity', '🧾', 'لاگ فعالیت‌ها'],
    ]],
  ];
  const adminGroupOf = view => (ADMIN_GROUPS.find(g => g[4].some(i => i[0] === view)) || ADMIN_GROUPS[0])[0];

  function adminGroupsHtml(view, pending) {
    const open = window.__adminGroup || adminGroupOf(view);
    const badge = id => {
      const n = id === 'support' ? supportAdminActionCount()
        : id === 'approvals' ? adminPendingTotal(pending)
        : id === 'publicprofiles' ? (adminRemotePending.publicProfiles || 0) : 0;
      return n ? `<i class="an-badge" ${id === 'support' ? 'data-support-action' : ''}>${toFa(n)}</i>` : (id === 'support' ? '<i class="an-badge" data-support-action style="display:none"></i>' : '');
    };
    return ADMIN_GROUPS.map(([gid, gic, glabel, gsub, items]) => {
      const isOpen = open === gid;
      const groupPending = items.reduce((sum, [id]) =>
        sum + (id === 'support' ? supportAdminActionCount()
             : id === 'approvals' ? adminPendingTotal(pending)
             : id === 'publicprofiles' ? (adminRemotePending.publicProfiles || 0) : 0), 0);
      return `<div class="an-group ${isOpen ? 'open' : ''}">
        <button class="an-head" aria-expanded="${isOpen}" onclick="shAdminGroup('${gid}')">
          <span class="an-ic">${gic}</span>
          <span class="an-txt"><b>${glabel}</b><small>${gsub}</small></span>
          ${gid === 'manage' ? `<i class="an-badge" data-support-action-group data-base-count="${Math.max(0,groupPending-supportAdminActionCount())}" data-group-open="${isOpen?'1':'0'}" ${groupPending && !isOpen ? '' : 'style="display:none"'}>${toFa(groupPending)}</i>` : (groupPending && !isOpen ? `<i class="an-badge">${toFa(groupPending)}</i>` : '')}
          <span class="an-caret" aria-hidden="true">${isOpen ? '▾' : '▸'}</span>
        </button>
        <div class="an-items">${items.map(([id, ic, lbl]) =>
          `<button class="an-item ${view === id ? 'on' : ''}" onclick="shAdminView('${id}')"><span>${ic}</span>${lbl}${badge(id)}</button>`).join('')}</div>
      </div>`;
    }).join('');
  }

  window.shAdminGroup = gid => {
    window.__adminGroup = window.__adminGroup === gid ? null : gid;
    if (document.body.dataset.page === 'console') { pages.console(); return; }
    shDashTab('management');
  };

  window.shAdminView = view => {
    window.__adminView = view || 'overview';
    window.__adminGroup = adminGroupOf(window.__adminView);
    if (document.body.dataset.page === 'console') { pages.console(); return; }
    shDashTab('management');
  };
  window.shAdminGenerateCredentials = () => {
    const name = (document.getElementById('newMemberName') || {}).value || ''; const role = (document.getElementById('newMemberRole') || {}).value || 'demo'; const all = authAccounts.get();
    const u = document.getElementById('newMemberUsername'), p = document.getElementById('newMemberPassword'); if (u) u.value = nextSmartUsername(name || 'new member', role, all); if (p) p.value = smartPassword();
    toasglass('✨ نام کاربری و رمز هوشمند ساخته شد؛ پیش از ثبت قابل ویرایش هستند');
  };
  window.shAdminGenerateMemberPassword = id => { const input = document.getElementById('am-' + id + '-password'); if (input) { input.value = smartPassword(); toasglass('✨ رمز جدید ساخته شد؛ برای ثبت، دکمه ذخیره را بزنید'); } };
  window.shAdminAddMember = async () => {
    const val = id => ((document.getElementById(id) || {}).value || '').trim(); const role = val('newMemberRole') || 'demo'; const def = AUTH_ROLES[role] || AUTH_ROLES.demo;
    const gender = val('newMemberGender');
    if (['demo', 'coach', 'hydro'].includes(role) && !gender) { toasglass('⚠️ جنسیت عضو را انتخاب کنید — پنل، تصاویر و محتوای عضو بر اساس جنسیت تنظیم می‌شود'); return; }
    try {
      const data = { name: val('newMemberName'), username: val('newMemberUsername').toLowerCase(), password: val('newMemberPassword'), u: role, role: def.label, avatar: def.icon, city: val('newMemberCity') || 'تهران', gender, subscription: val('newMemberPlan') || 'پایه', status: (document.getElementById('newMemberStatus') || {}).value || 'active' };
      const cloud = window.SH_CLOUD_AUTH; const out = cloud && cloud.active ? await cloud.createAccount(data) : authAccounts.create(data);
      if (!out.ok) throw new Error(out.error || 'ساخت عضو ناموفق بود');
      authAccounts.save(cloud && cloud.active ? cloud.accounts() : authAccounts.get()); adminLog('عضو جدید با اطلاعات ورود ساخته شد', out.account.name); toasglass('✓ عضو جدید ساخته و اطلاعات ورود ثبت شد'); shAdminView('members');
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ساخت عضو ناموفق بود')); }
  };
  window.shAdminSaveMember = async id => {
    const val = key => ((document.getElementById('am-' + id + '-' + key) || {}).value || '').trim(); const role = val('role') || 'demo'; const def = AUTH_ROLES[role] || AUTH_ROLES.demo;
    try {
      const passwordInput = document.getElementById('am-' + id + '-password');
      const current = authAccounts.byId(id) || {};
      const password = val('password');
      const data = { id, name: val('name'), username: val('username').toLowerCase(), u: role, role: def.label, avatar: def.icon, city: val('city') || 'تهران', gender: val('gender') === 'women' || val('gender') === 'men' ? val('gender') : '', subscription: val('plan') || 'پایه', status: val('status') || 'active' };
      // Existing passwords are displayed in the admin-only credential cache. Do not
      // resend an unchanged legacy password: the server validates password changes
      // against the current policy, which would block unrelated profile edits.
      if (password && password !== String(passwordInput?.dataset.original || current.password || '')) data.password = password;
      const cloud = window.SH_CLOUD_AUTH; const out = cloud && cloud.active ? await cloud.updateAccount(data) : authAccounts.update(id, data);
      if (!out.ok) throw new Error(out.error || 'ذخیره عضو ناموفق بود');
      const cur = me.get(); if (cur && cur.accountId === id) { if (out.account.status !== 'active') { toasglass('این حساب غیرفعال شد'); setTimeout(shLogout, 550); return; } me.set(sessionFor(out.account, cur)); renderNav(); }
      adminLog('مشخصات، دسترسی و اطلاعات ورود عضو به‌روزرسانی شد', out.account.name); toasglass('✓ عضو و اطلاعات ورود ذخیره شد'); shAdminView('members');
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره عضو ناموفق بود')); }
  };
  window.shAdminMemberCycle = async id => { const a = authAccounts.byId(id); if (!a) return; const next = a.status === 'active' ? 'inactive' : 'active'; try { const cloud = window.SH_CLOUD_AUTH; const out = cloud && cloud.active ? await cloud.updateAccount({ id, status: next }) : authAccounts.update(id, { status: next }); if (!out.ok) throw new Error(out.error); adminLog('وضعیت عضو به «' + (next === 'active' ? 'فعال' : 'غیرفعال') + '» تغییر کرد', a.name); if ((me.get() || {}).accountId === id && next !== 'active') { toasglass('حساب فعلی غیرفعال شد'); setTimeout(shLogout, 500); return; } toasglass('وضعیت عضو به‌روزرسانی شد'); shAdminView('members'); } catch (e) { toasglass('⚠️ ' + (e.message || 'به‌روزرسانی وضعیت ناموفق بود')); } };
  window.shAdminPlanCycle = async id => { const a = authAccounts.byId(id); if (!a) return; const plans = ['پایه', 'حرفه‌ای', 'سازمانی']; const next = plans[(plans.indexOf(a.subscription) + 1) % plans.length]; try { const cloud = window.SH_CLOUD_AUTH; const out = cloud && cloud.active ? await cloud.updateAccount({ id, subscription: next }) : authAccounts.update(id, { subscription: next }); if (!out.ok) throw new Error(out.error); adminLog('اشتراک عضو به «' + next + '» تغییر کرد', a.name); toasglass('اشتراک عضو به‌روزرسانی شد'); shAdminView('members'); } catch (e) { toasglass('⚠️ ' + (e.message || 'به‌روزرسانی اشتراک ناموفق بود')); } };
  window.shAdminRoleCycle = async id => { const a = authAccounts.byId(id); if (!a) return; const roles = Object.keys(AUTH_ROLES); const next = roles[(roles.indexOf(a.u) + 1) % roles.length]; const def = AUTH_ROLES[next]; try { const cloud = window.SH_CLOUD_AUTH; const out = cloud && cloud.active ? await cloud.updateAccount({ id, u: next, role: def.label, avatar: def.icon }) : authAccounts.update(id, { u: next, role: def.label, avatar: def.icon }); if (!out.ok) throw new Error(out.error); adminLog('نقش عضو به «' + def.label + '» تغییر کرد', a.name); toasglass('نقش عضو به‌روزرسانی شد'); shAdminView('members'); } catch (e) { toasglass('⚠️ ' + (e.message || 'به‌روزرسانی نقش ناموفق بود')); } };
  window.shAdminControlOpen = id => { shDashTab('control'); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220); };
  window.shJobModerate = (id, act) => { const a = jobStore.get(); const i = a.findIndex(x => String(x.id) === String(id)); if (i < 0) return; if (act === 'approve') a[i].status = 'approved'; else a.splice(i, 1); jobStore.set(a); toasglass(act === 'approve' ? '✅ رزومه برای آگهی‌دهنده تأیید و ارسال شد' : '🗑️ درخواست رزومه رد شد'); shDashTab('control'); };
  window.shJobApply = (kind, id) => {
    const source = kind === 'coach' ? CoachRequests : Jobs;
    const j = source.find(x => String(x.id) === String(id)); if (!j) return;
    if (!isCoachJob(j)) { const phone = jobPhone(j); if (phone) location.href = 'tel:' + phone; else toasglass('شماره تماس این آگهی ثبت نشده است'); return; }
    const cv = cvStore.get();
    if (!cv.personal.name || !cv.personal.name.trim()) {
      toasglass('📄 ابتدا رزومه حرفه‌ای خود را بسازید تا برای آگهی مربی ارسال شود');
      setTimeout(() => { if (document.body.dataset.page === 'dashboard') shDashTab('cv'); else location.href = 'dashboard.html?build=ppf8&tab=cv'; }, 600); return;
    }
    jobStore.add({ id: 'ja-' + Date.now(), job_id: j.id, kind, pool_id: j.pool_id || j.employer_id || '', pool_name: j.pool_name || '', title: j.title, cv: JSON.parse(JSON.stringify(cv)), status: 'pending', created_at: new Date().toISOString() });
    toasglass('📨 رزومه شما برای «' + (j.pool_name || 'آگهی‌دهنده') + '» در صف بررسی مدیر ارسال شد');
  };
  window.shProfileSave = async () => {
    const u = me.get(); if (!u) return;
    const val = id => (document.getElementById(id) || {}).value || '';
    u.name = val('pfName').trim() || u.name; u.city = val('pfCity').trim() || u.city; u.gender = (val('pfGender') === 'women' || val('pfGender') === 'men') ? val('pfGender') : ''; u.gender = (val('pfGender') === 'women' || val('pfGender') === 'men') ? val('pfGender') : '';
    u.phone = val('pfPhone').trim(); u.bio = val('pfBio').trim(); u.instagram = val('pfInstagram').trim(); u.email = val('pfEmail').trim();
    u.direct_messages = !!((document.getElementById('pfDirectMessage') || {}).checked); directMessagePrefs.set('name:' + u.name, u.direct_messages);
    try {
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && cloud.active) { const remote = await cloud.updateAccount({ id: u.accountId, name: u.name, city: u.city, gender: u.gender, phone: u.phone, email: u.email, bio: u.bio, instagram: u.instagram, direct_messages: u.direct_messages }); me.set(sessionFor(remote.account, u)); }
      else if (u.accountId) { const saved = authAccounts.update(u.accountId, { name: u.name, city: u.city, gender: u.gender }); if (!saved.ok) throw new Error(saved.error); me.set(u); }
      else me.set(u);
      renderNav(); toasglass('✓ اطلاعات پروفایل و تنظیمات پیام مستقیم ذخیره شد'); shDashTab('profile');
    } catch (e) { toasglass('⚠️ ذخیرهٔ ابری ناموفق بود: ' + (e.message || 'خطا')); }
  };
  /* ---------- پروفایل حرفه‌ای مربی (دادهٔ سیستم صفحهٔ عمومی) ----------
   * همین کارت است که رکورد `coaches` عضو را می‌سازد؛ همهٔ فیلدهایی که در
   * «صفحه عمومی من ← چه چیزی دیده شود ← اطلاعات سیستمی» فقط‌خواندنی
   * دیده می‌شوند (تجربه، مدارک، تخصص‌ها، تعرفه‌ها…) این‌جا پر می‌شوند و
   * پس از ذخیره همان‌جا روی صفحهٔ عمومی ظاهر می‌شوند. */
  const coachProRow = (r) => `<div class="cpf-career-row" data-row><input data-cpf="year" value="${esc(r && r.year || '')}" placeholder="سال (مثلاً ۱۳۸۴)" maxlength="24"><input data-cpf="title" value="${esc(r && r.title || '')}" placeholder="عنوان (مثلاً مدرس نجات غریق فدراسیون)" maxlength="120"><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('[data-row]').remove()">×</button></div>`;
  window.shCoachCareerAdd = (r) => { const box = document.getElementById('cpfCareerRows'); if (box) box.insertAdjacentHTML('beforeend', coachProRow(r || {})); };
  window.shCoachProLoad = async function () {
    const box = document.getElementById('cpfProCard'); if (!box) return;
    const cloud = window.SH_CLOUD_AUTH;
    if (!cloud || !cloud.active || !cloud.getCoachProfile) return;
    try {
      const out = await cloud.getCoachProfile();
      const c = out.coach || {};
      const setv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : String(v); };
      setv('cpfExp', c.exp_years || ''); setv('cpfStudents', c.students || '');
      setv('cpfHourly', c.hourly_rate || ''); setv('cpfPrivate', c.private_price || ''); setv('cpfGroup', c.group_price || '');
      setv('cpfSpecialties', (c.specialties || []).join('، ')); setv('cpfLevels', (c.levels || []).join('، '));
      setv('cpfAgeGroups', (c.age_groups || []).join('، ')); setv('cpfCerts', (c.certs || []).join('، ')); setv('cpfMedals', (c.medals || []).join('، '));
      setv('cpfInstagram', c.instagram || ''); setv('cpfTelegram', c.telegram || ''); setv('cpfWebsite', c.website || '');
      const hp = document.getElementById('cpfHomePool'), on = document.getElementById('cpfOnline');
      if (hp) hp.checked = c.home_pool === true; if (on) on.checked = c.online === true;
      const rows = document.getElementById('cpfCareerRows');
      if (rows) rows.innerHTML = (Array.isArray(c.career) ? c.career : []).map(coachProRow).join('') || '';
      const hint = document.getElementById('cpfProHint');
      if (hint) hint.textContent = (out.coach ? 'مقادیر فعلی از پروفایل حرفه‌ای شما خوانده شد؛ پس از ذخیره، بلافاصله در «صفحه عمومی من» قابل نمایش است.' : 'هنوز پروفایل حرفه‌ای نساخته‌اید؛ یک بار پر کنید و ذخیره کنید — همین رکورد جای مدارک، سوابق و تعرفه‌های شما را در صفحهٔ عمومی پر می‌کند.');
    } catch (e) { /* شبکه در دسترس نیست؛ فرم خالی می‌ماند */ }
  };
  window.shCoachProSave = async function () {
    const u = me.get(); if (!u) return;
    const val = id => ((document.getElementById(id) || {}).value || '').trim();
    const coach = {
      exp_years: val('cpfExp'), students: val('cpfStudents'),
      hourly_rate: val('cpfHourly'), private_price: val('cpfPrivate'), group_price: val('cpfGroup'),
      specialties: val('cpfSpecialties'), levels: val('cpfLevels'), age_groups: val('cpfAgeGroups'),
      certs: val('cpfCerts'), medals: val('cpfMedals'),
      instagram: val('cpfInstagram'), telegram: val('cpfTelegram'), website: val('cpfWebsite'),
      home_pool: !!((document.getElementById('cpfHomePool') || {}).checked),
      online: !!((document.getElementById('cpfOnline') || {}).checked),
      gender: u.gender === 'women' ? 'female' : u.gender === 'men' ? 'male' : '',
      city: u.city,
      career: [...document.querySelectorAll('#cpfCareerRows [data-row]')].map(row => ({
        year: (row.querySelector('[data-cpf="year"]') || {}).value || '',
        title: (row.querySelector('[data-cpf="title"]') || {}).value || ''
      })).filter(r => r.year || r.title)
    };
    const btn = document.getElementById('cpfProSave'); if (btn) { btn.disabled = true; btn.textContent = 'در حال ذخیره…'; }
    try {
      const cloud = window.SH_CLOUD_AUTH;
      if (!cloud || !cloud.active || !cloud.saveCoachProfile) throw new Error('اتصال حساب ابری لازم است');
      await cloud.saveCoachProfile(coach);
      toasglass('✓ پروفایل حرفه‌ای ذخیره شد — مقدارها هم‌اکنون در صفحهٔ عمومی قابل نمایش‌اند');
      shCoachProLoad();
    } catch (e) { toasglass('⚠️ ذخیرهٔ پروفایل حرفه‌ای ناموفق بود: ' + (e.message || 'خطا')); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '✓ ذخیرهٔ پروفایل حرفه‌ای'; } }
  };

  window.shProfileCredentialsSave = async () => {
    const u = me.get(); if (!u || !u.accountId) { toasglass('لطفاً دوباره وارد حساب شوید'); return; }
    const username = ((document.getElementById('pfUsername') || {}).value || '').trim().toLowerCase(); const password = ((document.getElementById('pfPassword') || {}).value || '').trim();
    try {
      const cloud = window.SH_CLOUD_AUTH;
      const saved = cloud && cloud.active ? await cloud.updateAccount({ id: u.accountId, username, password }) : authAccounts.update(u.accountId, { username, password });
      const account = saved.account;
      if (!account) throw new Error(saved.error || 'ذخیره اطلاعات ورود ناموفق بود');
      me.set(sessionFor(account, u)); renderNav(); toasglass('✓ نام کاربری و رمز ورود شما به‌روزرسانی شد'); shDashTab('profile');
    } catch (e) { toasglass('⚠️ ' + (e.message || 'ذخیره اطلاعات ورود ناموفق بود')); }
  };
  window.shProfilePhoto = async inp => {
    const f = inp.files && inp.files[0]; if (!f) return; const r = await shImgOpt(f, 'avatar'); if (!r) return;
    const u = me.get(); if (!u) return;
    try {
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && cloud.active) { const remote = await cloud.updateAccount({ id: u.accountId, avatar: r.url }); me.set(sessionFor(remote.account, u)); }
      else { u.avatar = r.url; me.set(u); }
      const pv = document.getElementById('pfAvatar'); if (pv) pv.innerHTML = `<img src="${r.url}" alt="">`; renderNav(); toasglass('✓ عکس پروفایل به‌روزرسانی شد');
    } catch (e) { toasglass('⚠️ ذخیرهٔ عکس ناموفق بود: ' + (e.message || 'خطا')); }
  };
  window.shProfileGallery = async inp => {
    const f = inp.files && inp.files[0]; if (!f) return; const r = await shImgOpt(f, 'card'); if (!r) return;
    const u = me.get(); if (!u) return; const photos = (u.photos || []).slice(0, 5); photos.push(r.url);
    try { const cloud = window.SH_CLOUD_AUTH; if (cloud && cloud.active) { const remote = await cloud.updateAccount({ id: u.accountId, photos }); me.set(sessionFor(remote.account, u)); } else { u.photos = photos; me.set(u); } shDashTab('profile'); }
    catch (e) { toasglass('⚠️ ذخیرهٔ تصویر ناموفق بود: ' + (e.message || 'خطا')); }
  };
  window.shProfilePhotoDel = async i => { const u = me.get(); if (!u) return; const photos = (u.photos || []).filter((_, x) => x !== i); try { const cloud = window.SH_CLOUD_AUTH; if (cloud && cloud.active) { const remote = await cloud.updateAccount({ id: u.accountId, photos }); me.set(sessionFor(remote.account, u)); } else { u.photos = photos; me.set(u); } shDashTab('profile'); } catch (e) { toasglass('⚠️ حذف تصویر ناموفق بود: ' + (e.message || 'خطا')); } };

  function cvTargetsForGender(gender) {
    const g = gender || shViewerGender();
    return Pools.filter(p => !g || g === 'any' || !p.gender || p.gender === 'mixed' || p.gender === g);
  }
  window.shCvSend = function () {
    const d = cvStore.get();
    if (!d.personal.name.trim()) { toasglass('⚠️ ابتدا نام را وارد کنید'); return; }
    const targets = cvTargetsForGender(d.personal.gender);
    const old = document.getElementById('cvSendOv'); if (old) old.remove();
    const ov = document.createElement('div'); ov.className = 'cvsend-ov'; ov.id = 'cvSendOv';
    ov.innerHTML = `<section class="cvsend-modal" role="dialog" aria-modal="true" aria-label="ارسال رزومه">
      <div class="cvsend-head"><div><b>📨 ارسال رزومه به مالکان استخر</b><small>فقط استخرهای سازگار با جنسیت انتخابی شما نمایش داده شده‌اند</small></div><button class="cvsend-x" onclick="shCvSendClose()">×</button></div>
      <div class="cvsend-note">🛡️ انتخاب‌های شما ابتدا در صف تأیید مدیر قرار می‌گیرند؛ سپس رزومه فقط برای مالکان منتخب ارسال می‌شود.</div>
      <div class="cvsend-list">${targets.map((pool, i) => `<label class="cvsend-row"><input class="cv-recipient" type="checkbox" value="${esc(String(pool.id))}" ${i === 0 ? 'checked' : ''}><span class="cvsend-pool-ic">${esc(pool.image || '🏊')}</span><span><b>${esc(poolOwnerName(pool))}</b><small>مالک ${esc(pool.name)} · ${pool.gender === 'women' ? 'ویژه بانوان' : pool.gender === 'men' ? 'ویژه آقایان' : 'سانس‌های بانوان و آقایان'}</small></span><span class="cvsend-check">✓</span></label>`).join('') || '<div class="empty" style="padding:20px"><span class="e-ic">🏊</span>در حال حاضر استخری سازگار با جنسیت انتخابی پیدا نشد.</div>'}</div>
      <div class="cvsend-actions"><button class="btn btn-ghost" onclick="shCvSendClose()">انصراف</button><button class="btn btn-gold" ${targets.length ? '' : 'disabled'} onclick="shCvSendConfirm()">ارسال برای تأیید مدیر ←</button></div>
    </section>`;
    ov.addEventListener('click', e => { if (e.target === ov) window.shCvSendClose(); }); document.body.appendChild(ov);
  };
  window.shCvSendClose = () => { const el = document.getElementById('cvSendOv'); if (el) el.remove(); };
  window.shCvSendConfirm = function () {
    const selected = [...document.querySelectorAll('.cv-recipient:checked')].map(x => String(x.value));
    if (!selected.length) { toasglass('⚠️ حداقل یک مالک استخر را انتخاب کنید'); return; }
    const d = cvStore.get(); const targets = Pools.filter(p => selected.includes(String(p.id))).map(p => ({ id: p.id, pool: p.name, owner: poolOwnerName(p) }));
    const a = cvOfferStore.get();
    a.unshift({ id: 'cv-' + Date.now(), ok: false, at: new Date().toISOString(), name: d.personal.name, city: d.personal.city, phone: d.personal.phone, skills: cvSelectedSkills(d).map(item => item.fa), tpl: d.tpl, lang: d.lang, bio: d.personal.bio, photo: d.personal.photo, gender: d.personal.gender, targets, cv: d });
    cvOfferStore.set(a); window.shCvSendClose();
    toasglass(`📨 رزومه برای ${toFa(targets.length)} مالک انتخاب شد و در صف تأیید مدیر قرار گرفت`);
  };

  /* --- آگهی جایگزینی مربیان --- */
  window.shSubCompose = show => { window.__subCompose = !!show; shDashTab('sub'); };
  window.shSubAdd = function () {
    const f = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    if (!f('sub_pool')) { toasglass('⚠️ استخر را انتخاب کنید'); return; }
    if (!f('sub_price')) { toasglass('⚠️ مبلغ هر شیفت را وارد کنید'); return; }
    const tags = [];
    document.querySelectorAll('.sub-tag-chk.on').forEach(el => tags.push(el.dataset.tag + (el.dataset.amt ? ' — ' + el.dataset.amt : '')));
    subStore.set([{
      id: 'sub-' + Date.now(), coach: (me.get() || {}).name || 'مربی', pool: f('sub_pool'), sess: f('sub_sess') || '—',
      shifts: f('sub_shifts') || '۱', price: parseInt(f('sub_price')) || 0, trans: parseInt(f('sub_trans')) || 0, g: f('sub_gender') || '',
      tags, phone: f('sub_phone'), desc: f('sub_desc'), ok: false, at: new Date().toISOString(),
    }, ...subStore.get()]);
    toasglass('📨 آگهی جایگزینی ثبت شد — پس از تأیید مدیر نمایش داده می‌شود');
    window.__subCompose = false; shDashTab('sub');
  };
  window.shSubTag = (el, amtId) => {
    el.classList.toggle('on');
    if (amtId) {
      const box = document.getElementById(amtId);
      if (box) { box.style.display = el.classList.contains('on') ? '' : 'none'; el.dataset.amt = ''; box.oninput = () => { el.dataset.amt = toFa(box.value) + ' هزار تومان'; }; }
    }
  };
  window.shMod2 = function (kind, id, act) {
    if (kind === 'cv') {
      const a = cvOfferStore.get(); const i = a.findIndex(x => x.id === id); if (i < 0) return;
      if (act === 'approve') { a[i].ok = true; toasglass('✅ رزومه منتشر شد'); } else { a.splice(i, 1); toasglass('🗑️ رزومه رد شد'); }
      cvOfferStore.set(a);
    } else if (kind === 'sub') {
      const a = subStore.get(); const i = a.findIndex(x => x.id === id); if (i < 0) return;
      if (act === 'approve') { a[i].ok = true; toasglass('✅ آگهی جایگزینی منتشر شد'); } else { a.splice(i, 1); toasglass('🗑️ آگهی رد شد'); }
      subStore.set(a);
    }
    pages.dashboard();
  };

  /* ---------- رندر قالب‌های رزومه (موج/مینیمال/کلاسیک) ---------- */
  window.__cvDoc = function (d, tpl, lang) {
    const en = lang === 'en'; const cfg = cvStudioStore.get(); const L = key => en ? CV_DICT[key].en : CV_DICT[key].fa;
    const P = d.personal || {}; const translated = (fa, english) => en && String(english || '').trim() ? english : fa;
    const name = (en && P.en_name) ? P.en_name : P.name || '—'; const city = (en && P.en_city) ? P.en_city : P.city || '—';
    const num = value => en ? cvLatinDigits(value) : toFa(value);
    const sectionTitle = id => cvSectionLabel(id, en ? 'en' : 'fa') || (en ? 'Section' : 'بخش');
    const skills = cvSelectedSkills(d).filter(item => item.enabled !== false).map(item => ({ n: en ? item.en : item.fa, lv: item.level }));
    const certs = cvSelectedCerts(d).filter(item => item.enabled !== false).map(item => en ? item.en : item.fa);
    const photoHtml = P.photo ? `<img class="cvd-photo" src="${P.photo}" alt="">` : `<div class="cvd-photo" style="display:grid;place-items:center;font-size:44px">🏊</div>`;
    const missing = L('unspecified'); const automaticWork = cvAutomaticWork(d.exp); const experienceText = automaticWork.years ? `${num(automaticWork.years)} ${L('years')}` : missing;
    const maritalText = P.marital === 'married' ? L('married') : P.marital === 'single' ? L('single') : missing;
    const militaryText = P.military === 'done' ? L('militaryDone') : P.military === 'exempt' ? L('militaryExempt') : P.military === 'active' ? L('militaryActive') : missing;
    const automaticTitle = translated(automaticWork.title, automaticWork.item && automaticWork.item.en_title);
    const automaticOrganization = translated(automaticWork.organization, automaticWork.item && automaticWork.item.en_org);
    const profileRow = (label, value, cls = '') => `<div class="cvd-profile-row ${cls}"><span>${esc(label)}</span><b>${esc(value || missing)}</b></div>`;
    const profileDetailsHtml = `<section class="cvd-profile-details"><h3>${esc(sectionTitle('profile-details') || (en ? 'Profile details' : 'مشخصات تکمیلی'))}</h3>${profileRow(L('reference'), cvReferenceCode(d))}${profileRow(L('experienceYears'), experienceText)}${automaticTitle || automaticOrganization ? `<div class="cvd-profile-job"><b>${esc(automaticTitle || '—')}</b><small>${esc(automaticOrganization || '')}</small></div>` : ''}${profileRow(L('age'), P.age ? `${num(P.age)} ${L('years')}` : missing)}${profileRow(L('marital'), maritalText)}${P.gender === 'women' ? '' : profileRow(L('military'), militaryText)}${profileRow(L('location'), translated(P.current_location, P.en_current_location) || city)}${profileRow(L('nationality'), translated(P.nationality, P.en_nationality))}<div class="cvd-profile-divider"></div>${profileRow(L('expectedSalary'), cvSalaryText(P.expected_salary, en))}<div class="cvd-profile-divider"></div>${profileRow(L('phone'), P.phone)}${profileRow(L('email'), P.email)}</section>`;
    const skillsHtml = skills.length ? `<div class="cvd-sec"><h3>${esc(sectionTitle('skills'))}</h3>${skills.map(skill => `<div class="cvd-skill"><div class="cvd-sname">${esc(skill.n)}</div><div class="cvd-meter"><i style="width:${skill.lv * 33 + 1}%"></i></div></div>`).join('')}</div>` : '';
    const certsHtml = certs.length ? `<div class="cvd-sec"><h3>${esc(sectionTitle('certificates'))}</h3>${certs.map(cert => `<div class="cvd-cert-row">• ${esc(cert)}</div>`).join('')}</div>` : '';
    const educationHtml = cvSortedEdu(d.education).length ? `<div class="cvd-msec"><h2>${esc(sectionTitle('education'))}</h2>${cvSortedEdu(d.education).map(item => `<div class="cvd-item"><div class="cvd-it-h"><span class="cvd-it-t">${esc([translated(item.degree, item.en_degree), translated(item.field, item.en_field)].filter(Boolean).join(' — ') || '—')}</span><span class="cvd-it-o">${esc(item.from || '')} ← ${esc(item.to || L('present'))}</span></div><div class="cvd-it-o cvd-item-sub">${esc([translated(item.institute, item.en_institute), translated(item.city, item.en_city)].filter(Boolean).join(' · '))}${item.grade ? ' · ' + esc(en ? 'GPA ' + num(item.grade) : 'معدل ' + num(item.grade)) : ''}</div></div>`).join('')}</div>` : '';
    const expHtml = cvSortedExp(d.exp).length ? `<div class="cvd-msec"><h2>${esc(sectionTitle('experience'))}</h2>${cvSortedExp(d.exp).map(item => { const title = translated(item.title, item.en_title); const organization = translated(item.org, item.en_org); const description = translated(item.desc, item.en_desc); return `<div class="cvd-item"><div class="cvd-it-h"><span class="cvd-it-t">${esc(title || '—')}</span><span class="cvd-it-o">${esc(item.from || '')} ← ${esc(item.to || L('present'))}</span></div><div class="cvd-it-o cvd-item-sub">${esc(organization || '')}</div>${description ? `<div class="cvd-it-d">${esc(description)}</div>` : ''}</div>`; }).join('')}</div>` : '';
    const bioHtml = P.bio ? `<div class="cvd-msec"><h2>${esc(sectionTitle('bio'))}</h2><div class="cvd-bio">${esc(translated(P.bio, P.en_bio))}</div></div>` : '';
    const blocks = { bio: bioHtml, education: educationHtml, experience: expHtml, skills: skillsHtml, certificates: certsHtml };
    const customValues = d.custom_sections || {}; const customEnglishValues = d.custom_sections_en || {};
    cvSectionList().filter(section => !section.builtin).forEach(section => {
      const value = String(customValues[section.id] || '').trim(); const englishValue = String(customEnglishValues[section.id] || '').trim();
      blocks[section.id] = value ? `<div class="cvd-msec cvd-custom-sec"><h2>${esc(sectionTitle(section.id))}</h2><div class="cvd-bio">${esc(translated(value, englishValue))}</div></div>` : '';
    });
    const enabledSections = cvSectionList().filter(section => section.enabled && blocks[section.id]);
    const sideBlocks = enabledSections.filter(section => section.place === 'side').map(section => blocks[section.id]).join('');
    const mainBlocks = enabledSections.filter(section => section.place !== 'side').map(section => blocks[section.id]).join('');
    const allBlocks = enabledSections.map(section => blocks[section.id]).join('');
    const footerText = en ? cfg.footer.en : cfg.footer.fa;
    const brand = cfg.footer.enabled ? `<footer class="cv-brand-strip" aria-label="Built with استخر جو | ESTAKHRJO"><div class="cv-brand-lockup"><span class="cv-brand-mark"><img src="assets/estakhrjo-mark.webp" width="34" height="34" alt=""><b>استخر جو | ESTAKHRJO</b></span><small>${esc(footerText)}</small></div></footer>` : '';
    const fontFa = cvFontFamily('fa', cfg.typography.fa), fontEn = cvFontFamily('en', cfg.typography.en);
    const theme = `style="--cv-font-fa:'${fontFa}';--cv-font-en:'${fontEn}';--cv-text:${cfg.colors.text};--cv-heading:${cfg.colors.heading};--cv-accent:${cfg.colors.accent};--cv-side:${cfg.colors.side};--cv-muted:${cfg.colors.muted}"`;
    const head = `<div class="tmin-h">${P.photo ? `<img src="${esc(P.photo)}" style="width:86px;height:86px;border-radius:50%;object-fit:cover;border:3px solid var(--cv-accent)">` : ''}<h1>${esc(name)}</h1><div class="cvd-role">${L('role')}</div><div class="tmin-kv">📍 ${esc(city)} • 📞 ${esc(P.phone || '—')} • 👤 ${L(P.gender === 'women' ? 'women' : 'men')}${P.age ? ' • ' + L('age') + ': ' + num(P.age) : ''}</div></div>`;
    if (tpl === 't-min') return `<div class="cvdoc t-min" ${theme} dir="${en ? 'ltr' : 'rtl'}"><div class="cvd-main" style="grid-column:1/-1">${head}${profileDetailsHtml}${allBlocks}</div>${brand}</div>`;
    const sideInner = `${photoHtml}<h1>${esc(name)}</h1><div class="cvd-role">${L('role')}</div>${profileDetailsHtml}${sideBlocks}`;
    if (tpl === 't-cls') {
      const classicHead = `<header class="tcls-main-head"><div><span>${en ? 'PROFESSIONAL RESUME' : 'رزومه حرفه‌ای'}</span><h2>${en ? 'Career profile' : 'پروفایل حرفه‌ای'}</h2></div><i aria-hidden="true"></i></header>`;
      return `<div class="cvdoc t-cls" ${theme} dir="${en ? 'ltr' : 'rtl'}"><div class="cvd-main">${classicHead}${mainBlocks}</div><aside class="cvd-side">${sideInner}</aside>${brand}</div>`;
    }
    return `<div class="cvdoc" ${theme} dir="${en ? 'ltr' : 'rtl'}"><div class="cvd-side">${sideInner}</div><div class="cvd-main">${mainBlocks}</div>${brand}</div>`;
  };

  /* ---------- داده استان‌ها و شهرهای ایران ---------- */
  const IR_PROV = {
    'تهران': ['تهران', 'کرج', 'شمیرانات', 'اسلامشهر', 'ری', 'پاکدشت'],
    'اصفهان': ['اصفهان', 'کاشان', 'نجف‌آباد', 'خمینی‌شهر', 'شاهین‌شهر'],
    'خراسان رضوی': ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان'],
    'فارس': ['شیراز', 'مرودشت', 'کازرون', 'فسا', 'جهرم'],
    'آذربایجان شرقی': ['تبریز', 'مراغه', 'مرند', 'میانه'],
    'خوزستان': ['اهواز', 'آبادان', 'دزفول', 'خرمشهر', 'ماهشهر'],
    'البرز': ['کرج', 'هشتگرد', 'نظرآباد'],
    'قم': ['قم'], 'مرکزی': ['اراک', 'ساوه', 'خمین'], 'یزد': ['یزد', 'میبد', 'اردکان'],
    'کرمان': ['کرمان', 'رفسنجان', 'سیرجان', 'جیرفت'], 'گیلان': ['رشت', 'بندر انزلی', 'لاهیجان'],
    'مازندران': ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'نوشهر'], 'هرمزگان': ['بندرعباس', 'کیش', 'قشم'],
    'سیستان و بلوچستان': ['زاهدان', 'چابهار', 'ایرانشهر'], 'کردستان': ['سنندج', 'سقز', 'مریوان'],
    'کرمانشاه': ['کرمانشاه', 'اسلام‌آباد غرب'], 'لرستان': ['خرم‌آباد', 'بروجرد', 'دورود'],
    'همدان': ['همدان', 'ملایر', 'نهاوند'], 'اردبیل': ['اردبیل', 'پارس‌آباد'], 'زنجان': ['زنجان', 'ابهر'],
    'قزوین': ['قزوین', 'آبیک', 'بوئین‌زهرا'], 'سمنان': ['سمنان', 'شاهرود', 'دامغان'],
    'خراسان شمالی': ['بجنورد'], 'خراسان جنوبی': ['بیرجند', 'قاین'], 'گلستان': ['گرگان', 'گنبد کاووس'],
    'ایلام': ['ایلام'], 'بوشهر': ['بوشهر', 'برازجان'], 'چهارمحال و بختیاری': ['شهرکرد'],
    'کهگیلویه و بویراحمد': ['یاسوج', 'دوگنبدان'], 'اردبیل ': null,
  };
  delete IR_PROV['اردبیل '];
  const locStore = {
    get() { try { return JSON.parse(localStorage.getItem('sh_city') || '""'); } catch (e) { return ''; } },
    set(c) { localStorage.setItem('sh_city', JSON.stringify(c || '')); },
  };
  // شهر هدر، فیلتر پیش‌فرض تمام فهرست‌های مکان‌محور است. city=all فقط برای بازدید دستی از کل ایران است.
  const cityScope = raw => raw === 'all' ? '' : (raw || locStore.get() || '');
  const inCity = (list, city, field = 'city') => city ? list.filter(x => String(x[field] || '') === String(city)) : list;
  function applyCitySelection(c) {
    locStore.set(c); try { shSyncNavLoc(); } catch (e) {}
    // انتخاب هدر، فیلتر دستیِ قدیمی همان صفحه را کنار می‌زند تا شهر جدید فوراً اعمال شود.
    try { const u = new URL(location.href); u.searchParams.delete('city'); history.replaceState(null, '', u.pathname.split('/').pop() + (u.search || '')); } catch (e) {}
    try { rerender(); } catch (e) {}
    setTimeout(() => { const sct = document.querySelector('#homeAfterSearch'); if (sct) sct.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo(0, 0); }, 120);
  }
  window.shSetCity = c => applyCitySelection(c);
  window.shCityProv = sel => {
    const box = document.getElementById('locCities'); if (!box) return;
    const cities = IR_PROV[sel.value] || [];
    box.innerHTML = cities.map(c => `<button class="loc-city ${locStore.get() === c ? 'on' : ''}" onclick="shSetCity('${c}')">${c}</button>`).join('')
      + (locStore.get() ? `<button class="loc-city" onclick="shSetCity('')">✕ همه ایران</button>` : '');
    box.style.display = cities.length ? 'flex' : 'none';
  };

  /* ---------- v13: انتخاب شهر در هدر (پاپ‌آپ استان ← شهر) ---------- */
  window.shSyncNavLoc = function () {
    const b = document.getElementById('navLocTxt'); const btn = document.getElementById('navLocBtn');
    const c = locStore.get();
    if (b) b.textContent = c || 'انتخاب شهر';
    if (btn) btn.classList.toggle('on', !!c);
  };
  window.shLocProv = '';
  window.shLocModal = function (open) {
    let ov = document.getElementById('shLocOv');
    if (!open) { if (ov) ov.remove(); return; }
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'shLocOv'; ov.className = 'loc-ov';
      ov.addEventListener('click', e => { if (e.target === ov) shLocModal(0); });
      document.body.appendChild(ov);
    }
    window.shLocProv = '';
    shLocRender();
  };
  window.shLocRender = function () {
    const ov = document.getElementById('shLocOv'); if (!ov) return;
    const provs = Object.keys(IR_PROV).filter(p => IR_PROV[p]);
    const cities = IR_PROV[window.shLocProv] || [];
    const myCity = locStore.get();
    const pin = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align:-1px"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
    ov.innerHTML = `<div class="loc-modal">
      <div class="locm-head">
        ${window.shLocProv ? `<button class="locm-back" onclick="shPickProv('')">‹</button>` : ''}
        <b>${window.shLocProv ? 'انتخاب شهر در استان ' + esc(window.shLocProv) : 'استان خود را انتخاب کنید'}</b>
        <button class="locm-x" onclick="shLocModal(0)">✕</button>
      </div>
      ${(myCity && !window.shLocProv) ? `<div class="locm-now"><span class="loc-now-chip">${pin} ${esc(myCity)}</span><button class="btn btn-ghost btn-sm" onclick="shPickCity('')">✕ همه ایران</button></div>` : ''}
      <div class="locm-grid ${window.shLocProv ? 'cities' : ''}">
        ${!window.shLocProv
          ? provs.map(p => `<button class="locm-cell" onclick="shPickProv('${p.replace(/'/g, '')}')">${esc(p)}</button>`).join('')
          : cities.map(c => `<button class="locm-cell ${myCity === c ? 'on' : ''}" onclick="shPickCity('${c.replace(/'/g, '')}')">${pin} ${esc(c)}</button>`).join('')}
      </div>
    </div>`;
  };
  window.shPickProv = p => { window.shLocProv = p; shLocRender(); };
  window.shPickCity = c => {
    shLocModal(0); applyCitySelection(c);
    toasglass(c ? '📍 فهرست‌های سایت بر اساس «' + c + '» فیلتر شدند' : '🌐 نمایش همه شهرهای ایران فعال شد');
  };

  /* ---------- v13: سیستم جنسیتی — محتوای متناسب با هر حساب ---------- */
  window.shViewerGender = function () {
    const u = me.get(); if (!u) return 'any';
    if (['admin', 'pool', 'supplier'].includes(u.u)) return 'any';
    return u.gender || 'any';
  };
  window.shGenderFilter = function (list, get) {
    const g = shViewerGender(); if (g === 'any') return list;
    return list.filter(x => { const v = get ? get(x) : (x.g || x.gender || ''); return !v || v === 'both' || v === g; });
  };
  window.shSetGender = g => {
    const u = me.get(); if (!u) return;
    u.gender = g; me.set(u);
    toasglass(g === 'women'
      ? '👩 حالت نمایش «بانوان» فعال شد — تصاویر و محتوای ویژه خانم‌ها نمایش داده می‌شود'
      : '👨 حالت نمایش «آقایان» فعال شد — تصاویر و محتوای ویژه آقایان نمایش داده می‌شود');
    try { rerender(); } catch (e) { location.reload(); }
  };
  window.shGndSwitchHtml = function (u, tight) {
    if (['pool', 'supplier', 'admin'].includes(u.u)) return `<div class="gnd-note${tight ? ' tight' : ''}" title="که مالک استخر مختلط یا تأمین‌کننده هستید، محتوای هر دو جنسیت را می‌بینید">🔓 نمایش کسب‌وکار: بانوان + آقایان</div>`;
    if (!['demo', 'coach', 'user'].includes(u.u)) return '';
    return `<div class="gnd-sw${tight ? ' tight' : ''}"><span class="gnd-t">حالت نمایش من:</span>
      <button class="gnd ${u.gender === 'men' ? 'on' : ''}" title="تصاویر و آگهی‌های ویژه آقایان" onclick="shSetGender('men')">👨 آقا</button>
      <button class="gnd ${u.gender === 'women' ? 'on' : ''}" title="تصاویر و آگهی‌های ویژه خانم‌ها" onclick="shSetGender('women')">👩 خانم</button></div>`;
  };
  setTimeout(shSyncNavLoc, 30);

  const pages = {

    index() {
      const stats0 = { pools: Pools.length, coaches: Coaches.length, sessions: Sessions.filter(s => s.capacity > s.booked).length, cities: new Set(Pools.map(p => p.city)).size };
      const stats = stats0;
      const today = new Date().toISOString().slice(0, 10);
      const cityOf = id2 => (Pools.find(p => String(p.id) === String(id2)) || {}).city || '';
      const selectedHomeCity = locStore.get();
      let todayS = Sessions.filter(s => s.date === today && s.booked < s.capacity && (!selectedHomeCity || cityOf(s.pool_id) === selectedHomeCity)).slice(0, 6);
      window.shGoHome = function () {
        const v = id => { const el = document.getElementById(id); return el ? encodeURIComponent(el.value) : ''; };
        location.href = `pools.html?q=${v('h_q')}&city=${v('h_city')}&gender=${v('h_gender')}`;
      };
      const myCity = locStore.get();
      const provGuess = Object.keys(IR_PROV).find(k => IR_PROV[k] && IR_PROV[k].includes(myCity)) || '';
      $[innerHTML] = `
      <section class="hero">
        <canvas id="gl" aria-hidden="true"></canvas>
        <div class="hero-bg" style="background-image:url('${IMG('hero-index')}')"></div>
        <div class="hero-video-fallback"></div>
        <div class="hero-wrap container">
          <div class="anim-up"><span class="hero-badge hero-eyebrow" data-lbl="hero-badge">${LBL('hero-badge')}</span></div>
          <h1 class="anim-up-2" style="display:inline">${LBL('hero-h1a')} <span class="wave-word">${LBL('hero-h1word')}</span>،<br>${LBL('hero-h1b')} <em>${LBL('hero-h1em')}</em></h1>
          <p class="hero-sub hero-sub-inline anim-up-3">${LBL('hero-sub')}</p>
          <div class="anim-up-4">
            <div class="glass-widget hero-search hero-search-xl">
              <form onsubmit="event.preventDefault();shGoHome()">
                <input type="text" id="h_q" placeholder="🔍 نام استخر، منطقه، خیابان…">
                <select id="h_gender"><option value="">👥 همه</option><option value="women">🌸 بانوان</option><option value="men">👨 آقایان</option><option value="mixed">👪 آقایان و بانوان</option></select>
                <button class="btn btn-primary btn-lg" type="submit">جستجو</button>
              </form>
              <div class="hero-search-tags">
                <a href="https://estakhrjo.ir/pools.html?open=1" class="tag-chip">🟢 الان باز است</a>
                <a href="https://estakhrjo.ir/pools.html?hydro=1" class="tag-chip">🩺 هیدروتراپی</a>
                <a href="https://estakhrjo.ir/pools.html?olympic=1" class="tag-chip">🏟️ المپیک</a>
                <a href="https://estakhrjo.ir/pools.html?sauna=1" class="tag-chip">🧖 سونا</a>
                <a href="https://estakhrjo.ir/coaches.html" class="tag-chip">🏆 مربیان برتر</a>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-foot">
          <div class="scroll-hint"><div class="mouse"></div>اسکرول کنید</div>
        </div>
      </section>
      <div id="homeAfterSearch"></div>

      <div class="container ${uiFlags.on('home_quick') ? '' : 'is-off' }"><div class="cat-circles home-quick">
        <a class="cat-circ" href="https://estakhrjo.ir/pools.html"><span class="cc-img">🏊</span><span class="cc-lbl">استخرها</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/coaches.html"><span class="cc-img">🏆</span><span class="cc-lbl">مربیان</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/courses.html"><span class="cc-img">🎓</span><span class="cc-lbl">دوره‌ها</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/market.html"><span class="cc-img">🛍️</span><span class="cc-lbl">فروشگاه</span></a>
        <a class="cat-circ hot" href="https://estakhrjo.ir/ads.html"><span class="cc-img">🛒</span><span class="cc-lbl">آگهی اعضا</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/pools.html?hydro=1"><span class="cc-img">🩺</span><span class="cc-lbl">هیدروتراپی</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/jobs.html"><span class="cc-img">💼</span><span class="cc-lbl">استخدام</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/nearby.html"><span class="cc-img">📍</span><span class="cc-lbl">نزدیک من</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/events.html"><span class="cc-img">🏅</span><span class="cc-lbl">رویدادها</span></a>
        <a class="cat-circ" href="https://estakhrjo.ir/suppliers.html"><span class="cc-img">🏭</span><span class="cc-lbl">B2B</span></a>
      </div></div>

      <div class="ticker" dir="ltr"><div class="ticker-track">${[['🏊','استخرهای تاییدشده'],['🏆','مربیان رسمی فدراسیون'],['🎟️','رزرو آنی و بلیت الکترونیک'],['🩺','هیدروتراپی تخصصی'],['🛍️','فروشگاه تجهیزات اصل'],['⭐','امتیازدهی واقعی کاربران'],['🧖','سونا و جکوزی'],['👶','کلاس‌های کودک']].flatMap(t => [t, t]).map(t => `<div class="ticker-item"><span>${t[0]}</span>${t[1]}</div>`).join('')}</div></div>

      <section class="section" style="padding-top:44px"><div class="container">
        <div class="deal-strip reveal">
          <div class="deal-head">
            <div class="d-t">⚡ شگفت‌انگیز استخر جو | ESTAKHRJO</div>
            <div class="deal-count" id="dealCount">
              <span>۰۰</span><i>:</i><span>۰۰</span><i>:</i><span>۰۰</span>
            </div>
          </div>
          <div class="deal-row" id="dealRow">
            ${(() => {
              const offOf = (x, seed) => { const pct = [15, 20, 25][(seed + x.id) % 3]; return (x.id + seed) % 3 !== 1 ? pct : 0; };
              const items = [];
              Pools.forEach(p => { const off = offOf(p, 7); if (off && p.price_from) items.push({ t: 'pool', id: p.id, city: p.city, ic: p.image || '🏊', name: p.name, off, now: Math.round(p.price_from * (100 - off) / 100), old: p.price_from, href: 'https://estakhrjo.ir/pool.html?id=' + p.id, tag: 'استخر' }); });
              Coaches.forEach(c => { const off = offOf(c, 3); const pr = c.hourly || c.hourly_rate || 0; if (off && pr) items.push({ t: 'coach', id: c.id, city: c.city, ic: c.image || '🏆', name: c.full_name || c.name, off, now: Math.round(pr * (100 - off) / 100), old: pr, href: 'https://estakhrjo.ir/coach.html?id=' + c.id, tag: 'مربی' }); });
              Courses.forEach(cr => { const off = offOf(cr, 5); if (off && cr.price) items.push({ t: 'course', id: cr.id, city: cr.city, ic: cr.image || '🎓', name: cr.title, off, now: Math.round(cr.price * (100 - off) / 100), old: cr.price, href: 'https://estakhrjo.ir/courses.html', tag: 'دوره' }); });
              const list = (myCity ? items.filter(x => x.city === myCity) : items).slice(0, 8);
              return list.map(p => `
                <div class="deal-card" onclick="location.href='${p.href}'">
                  <span class="dc-off">٪${toFa(p.off)} ـ</span>
                  <div class="dc-img">${esc(p.ic)}</div>
                  <div class="dc-name">${esc(p.name)}</div>
                  <div class="dc-tag">${p.tag} با تخفیف</div>
                  <div class="dc-price"><span class="dc-new">${money(p.now)}</span><span class="dc-old">${money(p.old)}</span></div>
                </div>`).join('') || '<div style="color:#fff">فعلاً پیشنهاد فعال نیست.</div>';
            })()}
          </div>
        </div>
      </div></section>

      <section class="stats-strip" style="margin-top:-80px"><div class="container"><div class="stats-grid">
        <div class="stat-pill reveal"><span class="num" data-count="${stats.pools}" data-suffix="+">۰</span><span class="lbl">استخر فعال</span></div>
        <div class="stat-pill reveal reveal-delay-1"><span class="num" data-count="${stats.coaches}" data-suffix="+">۰</span><span class="lbl">مربی حرفه‌ای</span></div>
        <div class="stat-pill reveal reveal-delay-2"><span class="num" data-count="${stats.sessions}">۰</span><span class="lbl">سانس موجود</span></div>
        <div class="stat-pill reveal reveal-delay-3"><span class="num" data-count="${stats.cities}">۰</span><span class="lbl">شهر</span></div>
      </div></div></section>

      <section class="section-sm"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>⚡ <span class="grad">سانس‌های امروز</span></h2><p>ظرفیت‌های زنده از دیتابیس</p></div><a href="https://estakhrjo.ir/pools.html" class="sec-link">مشاهده همه ←</a></div>
        <div class="slot-grid reveal">${(() => { const t2 = myCity ? todayS.filter(s => (s.city || cityOf(s.pool_id)) === myCity) : todayS; const fin = t2.length ? t2 : todayS; return fin.length ? fin.map(s => page_poolSessionSlot(s)).join('') : '<div class="empty"><span class="e-ic">🌙</span>سانس امروز تمام شده. فردا را بررسی کنید.</div>'; })()}</div>
      </div></section>

      <div class="container ad-slot reveal"><a href="https://estakhrjo.ir/courses.html" class="ad-banner g-1">
        <div class="ad-glow"></div><span class="ad-tag">تبلیغات</span>
        <div class="ad-body"><div class="ad-title">🎓 دوره‌های مهرماه با ۲۰٪ تخفیف شروع شد</div><div class="ad-sub">از مبتدی تا نجات غریق — ثبت‌نام محدود است</div></div>
        <span class="ad-ic">🏊‍♀️</span><span class="ad-cta">مشاهده دوره‌ها ←</span>
      </a></div>

      <section class="section"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>چرا <span class="grad">استخر جو | ESTAKHRJO</span>؟</h2><p>تجربه‌ای که هیچ‌کجا شبیهش نیست</p></div></div>
        <div class="features-grid">
          <div class="feature-tile reveal"><span class="f-ic">🗺️</span><h3>کشف هوشمند</h3><p>نزدیک‌ترین استخر و مربی بر اساس موقعیت شما</p></div>
          <div class="feature-tile reveal reveal-delay-1"><span class="f-ic">🎟️</span><h3 data-lbl-once="feat-book">${LBL('feat-book')}</h3><p>${LBL('feat-book-sub')}</p></div>
          <div class="feature-tile reveal reveal-delay-2"><span class="f-ic">⭐</span><h3>رتبه‌بندی واقعی</h3><p>امتیاز چندمعیاره از روی نظرات تأییدشده کاربران</p></div>
          <div class="feature-tile reveal reveal-delay-3"><span class="f-ic">💳</span><h3>کیف پول و بلیت</h3><p>پرداخت لحظه‌ای، QR بلیت و امتیاز وفاداری</p></div>
        </div>
      </div></section>

      <section class="section" style="background:var(--card2)"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>⭐ <span class="grad">استخرهای منتخب</span></h2><p>بالاترین امتیازها</p></div><a href="https://estakhrjo.ir/pools.html" class="sec-link">همه استخرها ←</a></div>
        <div class="cards reveal">${(() => { let fp = Pools.filter(p => p.featured && (!myCity || p.city === myCity)); if (!fp.length) fp = Pools.filter(p => !myCity || p.city === myCity); return fp.slice(0, 3).map(poolCard).join('') || '<div class="empty"><span class="e-ic">📍</span>استخری در شهر انتخابی یافت نشد.</div>'; })()}</div>
      </div></section>

      <div class="container ad-slot reveal" style="margin:-30px auto 0"><a href="https://estakhrjo.ir/ads.html" class="ad-banner g-2">
        <div class="ad-glow"></div><span class="ad-tag">تبلیغات</span>
        <div class="ad-body"><div class="ad-title">🛒 چیز دست‌نخورده‌ات را بفروش!</div><div class="ad-sub">فین، عینک، مایو — ثبت آگهی رایگان، خرید و فروش امن بین اعضا</div></div>
        <span class="ad-ic">💰</span><span class="ad-cta">ثبت آگهی رایگان ←</span>
      </a></div>

      <section class="section"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>🏆 <span class="grad">مربیان برتر</span></h2></div><a href="https://estakhrjo.ir/coaches.html" class="sec-link">همه مربیان ←</a></div>
        <div class="cards reveal">${(() => { let fc = Coaches.filter(c => c.featured && (!myCity || c.city === myCity)); if (!fc.length) fc = Coaches.filter(c => !myCity || c.city === myCity); return fc.slice(0, 3).map(coachCard).join('') || '<div class="empty"><span class="e-ic">📍</span>مربی‌ای در شهر انتخابی یافت نشد.</div>'; })()}</div>
      </div></section>

      <section class="section" style="background:var(--card2)"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>💬 <span class="grad">از زبان کاربران</span></h2><p>تجربه واقعی شناوران</p></div></div>
        <div class="testi-grid">
          <div class="testi reveal"><div class="testi-rate">★★★★★</div><p class="testi-text">رزرو سانس کمتر از یک دقیقه طول کشید. بلیت QR را در ورودی نشان دادم و مستقیم رفتم داخل. عالی بود!</p><div class="testi-user"><span class="testi-avatar">🧑</span><div><div class="testi-name">امیر رضایی</div><div class="testi-role">شناگر مبتدی</div></div></div></div>
          <div class="testi reveal reveal-delay-1"><div class="testi-rate">★★★★★</div><p class="testi-text">به‌عنوان مربی، زمان‌بندی جلساتم را اینجا مدیریت می‌کنم. شاگردان جدید خودشان مرا پیدا می‌کنند.</p><div class="testi-user"><span class="testi-avatar">🏆</span><div><div class="testi-name">سارا محمدی</div><div class="testi-role">مربی درجه یک</div></div></div></div>
          <div class="testi reveal reveal-delay-2"><div class="testi-rate">★★★★★</div><p class="testi-text">برای بچه‌ها دنبال استخر امن با مربی کودک بودم. فیلترها دقیقاً چیزی بود که لازم داشتم.</p><div class="testi-user"><span class="testi-avatar">👩</span><div><div class="testi-name">نگار حسینی</div><div class="testi-role">مادر دو فرزند</div></div></div></div>
        </div>
      </div></section>

      <section class="section" style="background:var(--card2)"><div class="container">
        <div class="sec-head reveal"><div class="sec-title"><h2>🛍️ <span class="grad">منتخب فروشگاه</span></h2></div><a href="https://estakhrjo.ir/market.html" class="sec-link">همه محصولات ←</a></div>
        <div class="cards reveal">${Products.filter(p => p.featured).slice(0, 4).map(productCard).join('')}</div>
      </div></section>

      <div class="container ad-slot reveal"><a href="https://estakhrjo.ir/suppliers.html" class="ad-banner g-3">
        <div class="ad-glow"></div><span class="ad-tag">تبلیغات</span>
        <div class="ad-body"><div class="ad-title">🏭 شبکه تأمین B2B استخرها فعال شد</div><div class="ad-sub">تجهیزات، مواد شیمیایی، سرویس دوره‌ای — مستقیم از تأمین‌کننده</div></div>
        <span class="ad-ic">🔧</span><span class="ad-cta">ورود کسب‌وکار ←</span>
      </a></div>

      <section class="section"><div class="container"><div class="promo-banner reveal">
        <h2 style="margin-bottom:12px">🏢 استخر یا مربی هستید؟</h2>
        <p style="color:var(--muted);max-width:520px;margin:0 auto 24px">کسب‌وکارتان را در استخر جو | ESTAKHRJO ثبت کنید و مشتری جدید پیدا کنید.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a href="login.html" class="btn btn-primary btn-lg">شروع رایگان</a><a href="https://estakhrjo.ir/pools.html" class="btn btn-ghost btn-lg">کشف پلتفرم</a></div>
      </div></div></section>`;
    },
  };

  function page_poolSessionSlot(s) {
    const remain = (s.capacity || 0) - (s.booked || 0);
    return `<div class="slot">
      <div class="slot-top"><span class="slot-time">${esc(s.time)}</span><span class="slot-kind ${s.kind === 'آزاد' ? 'kind-free' : 'kind-class'}">${esc(s.kind)}</span></div>
      <div class="slot-meta"><span>🏊 ${esc(s.pool_name || '')}</span><span>📍 ${esc(s.city || '')}</span>${s.coach_name ? `<span>👤 ${esc(s.coach_name)}</span>` : ''}</div>
      <div class="slot-meta"><span class="cap">💺 ${toFa(remain)} نفر مانده</span></div>
      <div class="slot-foot"><span class="price">${money(s.price)} <small>/ نفر</small></span><button class="btn btn-primary btn-sm" onclick="shBook(${s.id},1)">رزرو فوری</button></div>
    </div>`;
  }

  pages.cart = function (justPaid) {
    const items = cartStore.get().map(it => ({ ...it, p: Products.find(x => String(x.id) === String(it.id)) })).filter(x => x.p);
    if (justPaid) {
      const orders = JSON.parse(localStorage.getItem('sh_orders') || '[]');
      const o = orders[0] || {};
      $[innerHTML] = `<div class="container reveal in" style="padding-top:56px;padding-bottom:60px">
        <div class="ticket" style="max-width:520px">
          <div class="ticket-head" style="background:linear-gradient(135deg,#34d399,#22d3ee);color:#052e1b"><h2>✓ سفارش ثبت شد</h2><p style="font-size:11.5px;opacity:.85">به‌زودی بسته‌ات ارسال می‌شود</p></div>
          <div class="ticket-body">
            <div style="font-size:56px;margin:8px 0">📦</div>
            <div class="ticket-code" style="font-size:17px">${esc(o.id || 'ORD')}</div>
            <div class="ticket-meta" style="margin-top:18px">
              <div class="tm"><div class="tl">🛒 اقلام</div><div class="tv">${toFa(o.items || 0)} کالا</div></div>
              <div class="tm"><div class="tl">💰 مبلغ فاکتور</div><div class="tv">${money(o.total || 0)}</div></div>
              <div class="tm"><div class="tl">💳 نحوه پرداخت</div><div class="tv">کیف پول استخر جو | ESTAKHRJO</div></div>
              <div class="tm"><div class="tl">🚚 ارسال</div><div class="tv">پست پیشتاز — ۲ تا ۴ روز</div></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:22px;justify-content:center;flex-wrap:wrap">
              <a href="https://estakhrjo.ir/market.html" class="btn btn-ghost">ادامه خرید ←</a>
              <a href="dashboard.html?build=ppf8&tab=wallet" class="btn btn-primary">مشاهده تراکنش‌ها</a>
            </div>
          </div>
        </div></div>`;
      return;
    }
    if (items.length === 0) {
      $[innerHTML] = `<div class="container"><div class="cart-empty reveal in">
        <span class="big">🛒</span>
        <h2 style="font-size:23px;margin-bottom:10px">سبد خرید شما خالی است</h2>
        <p style="color:var(--muted);font-size:14px;margin-bottom:24px">هزاران محصول و تجهیزات شنا در انتظار شماست</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <a href="https://estakhrjo.ir/market.html" class="btn btn-primary btn-lg">🛍️ رفتن به فروشگاه</a>
          <a href="https://estakhrjo.ir/ads.html" class="btn btn-ghost btn-lg">🛒 آگهی‌های اعضا</a>
        </div></div></div>`;
      return;
    }
    const sub = cartStore.total();
    const off = PROMO ? Math.round(sub * PROMO.off) : 0;
    const ship = sub - off > 800000 ? 0 : 95000;
    const total = sub - off + ship;
    const u = me.get();
    $[innerHTML] = `<div class="container" style="padding-top:34px;padding-bottom:50px">
      <div class="sec-head reveal in"><div class="sec-title"><h2>🛒 <span class="grad">سبد خرید</span></h2><p>${toFa(items.length)} کالا در سبد شماست</p></div></div>
      <div class="cart-layout">
        <div>${items.map(it => `
          <div class="cart-item reveal in">
            <div class="ci-img">${esc(it.p.emoji || '🛒')}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
                <div><div class="ci-name">${esc(it.p.name)}</div><div class="ci-meta">${esc(it.p.category || '')} • ${esc(it.p.brand || '')}</div></div>
                <button class="ci-del" onclick="shCartDel('${it.id}')" title="حذف">🗑️</button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px">
                <div class="ci-price">${money(it.p.price * it.qty)}${it.qty > 1 ? ` <small style="font-weight:500;color:var(--muted)">(${money(it.p.price)} × ${toFa(it.qty)})</small>` : ''}</div>
                <div class="qty-ctl"><button onclick="shCartQty('${it.id}',-1)">−</button><b>${toFa(it.qty)}</b><button onclick="shCartQty('${it.id}',1)">+</button></div>
              </div>
            </div>
          </div>`).join('')}
          <a href="https://estakhrjo.ir/market.html" class="btn btn-ghost" style="margin-top:8px">← ادامه خرید</a>
        </div>
        <div class="cart-sum reveal in">
          <h3 style="font-size:15px;margin-bottom:14px">💳 صورتحساب</h3>
          <div class="cs-row"><span>قیمت کالاها (${toFa(cartStore.count())})</span><b>${money(sub)}</b></div>
          ${off ? `<div class="cs-row" style="color:#34d399"><span>🏷️ کد تخفیف ${esc(PROMO.code)}</span><b>- ${money(off)}</b></div>` : ''}
          <div class="cs-row"><span>🚚 ارسال</span><b>${ship === 0 ? '<span style="color:#34d399">رایگان</span>' : money(ship)}</b></div>
          <div class="cs-total"><span>مبلغ نهایی</span><span style="background:var(--grad-text);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${money(total)}</span></div>
          <div class="promo-row"><input id="promoCode" placeholder="کد تخفیف داری؟" value="${PROMO ? esc(PROMO.code) : ''}"><button class="btn btn-ghost btn-sm" onclick="shPromo()">ثبت</button></div>
          ${PROMO ? `<div class="promo-ok">✓ کد ${esc(PROMO.code)} اعمال شد — ۲۰٪ تخفیف</div>` : '<div style="font-size:10.5px;color:var(--muted2);margin-top:7px">💡 با <b dir="ltr">MEHR20</b> تخفیف بگیر</div>'}
          <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px;font-size:15px" onclick="shCheckout()">تسویه حساب — پرداخت از کیف پول</button>
          ${u ? `<div style="font-size:11.5px;color:var(--muted);text-align:center;margin-top:10px">موجودی شما: <b style="color:${(u.wallet || 0) >= total ? '#34d399' : '#fb7185'}">${money(u.wallet || 0)}</b></div>` : '<div style="font-size:11px;color:var(--gold);text-align:center;margin-top:10px">برای پرداخت ابتدا وارد شوید</div>'}
        </div>
      </div>
    </div>`;
  };


  pages.pools = function () {
    const rawCity = qs('city'), cityQ = rawCity ? '&city=' + encodeURIComponent(rawCity) : '';
    const params = { q: qs('q') || '', city: cityScope(rawCity), gender: qs('gender') || '', open: qs('open'), hydro: qs('hydro'), olympic: qs('olympic'), sauna: qs('sauna'), jacuzzi: qs('jacuzzi'), kids: qs('kids'), sort: qs('sort') || '' };
    let list = Pools.filter(p => {
      if (params.q && !(p.name + ' ' + (p.district || '') + ' ' + (p.address || '')).includes(params.q)) return false;
      if (params.city && p.city !== params.city) return false;
      if (params.gender && !(p.gender === params.gender || (params.gender !== 'mixed' && p.gender === 'mixed'))) return false;
      if (params.open && !p.open_now) return false;
      if (params.hydro && !p.hydro) return false;
      if (params.olympic && !p.olympic) return false;
      if (params.sauna && !p.sauna) return false;
      if (params.jacuzzi && !p.jacuzzi) return false;
      if (params.kids && !p.kids) return false;
      return true;
    });
    if (params.sort === 'cheap') list = list.slice().sort((a, b) => (a.price_from || 0) - (b.price_from || 0));
    else if (params.sort === 'full') list = list.slice().sort((a, b) => (a.occupancy || 0) - (b.occupancy || 0));
    const cities = [...new Set(Pools.map(p => p.city))];
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>🏊 استخرها</h2><p>${toFa(list.length)} استخر پیدا شد</p></div></div>
      <div class="filter-bar"><div class="filter-row">
        <div class="fd"><label>شهر</label><select onchange="go()"><option value="all" ${qs('city') === 'all' ? 'selected' : ''}>همه ایران</option>${cities.map(c => `<option ${params.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="fd"><label>جنسیت</label><select id="f_g" onchange="go()"><option value="">همه</option><option value="women" ${params.gender === 'women' ? 'selected' : ''}>بانوان</option><option value="men" ${params.gender === 'men' ? 'selected' : ''}>آقایان</option><option value="mixed" ${params.gender === 'mixed' ? 'selected' : ''}>آقایان و بانوان</option></select></div>
        <div class="fd" style="flex:1;min-width:180px"><label>جستجو</label><input id="f_q" value="${esc(params.q)}" onkeydown="if(event.key==='Enter')go()" placeholder="نام استخر، منطقه…"></div>
        <div class="fd"><label>&nbsp;</label><button class="btn btn-primary" onclick="go()">اعمال</button></div>
        <div class="fd"><label>&nbsp;</label><a href="https://estakhrjo.ir/pools.html?city=all" class="btn btn-ghost">پاک کردن</a></div>
      </div>
      <div class="filter-row" style="margin-top:12px"><span class="lbl">فیلتر سریع:</span>
        <a href="https://estakhrjo.ir/pools.html?open=1${cityQ}" class="filter-chip ${params.open ? 'on' : ''}">🟢 الان باز</a>
        <a href="https://estakhrjo.ir/pools.html?hydro=1${cityQ}" class="filter-chip ${params.hydro ? 'on' : ''}">🩺 هیدروتراپی</a>
        <a href="https://estakhrjo.ir/pools.html?olympic=1${cityQ}" class="filter-chip ${params.olympic ? 'on' : ''}">🏟️ المپیک</a>
        <a href="https://estakhrjo.ir/pools.html?sauna=1${cityQ}" class="filter-chip ${params.sauna ? 'on' : ''}">🧖 سونا</a>
        <a href="https://estakhrjo.ir/pools.html?kids=1${cityQ}" class="filter-chip ${params.kids ? 'on' : ''}">👶 کودک</a>
      </div></div>
      ${list.length === 0 ? '<div class="empty"><span class="e-ic">🔍</span>استخری مطابق فیلترها یافت نشد.</div>' :
        `<div class="cards">${list.map(poolCard).join('')}</div>`}
    </div>`;
    window.go = function () { location.href = 'https://estakhrjo.ir/pools.html?q=' + encodeURIComponent(document.querySelector('.fd input').value) + '&gender=' + qsSel('f_g') + '&city=' + qsCity(); };
    function qsSel(id) { const el = document.getElementById(id); return el ? el.value : ''; }
    function qsCity() { const el = document.querySelectorAll('.fd select')[0]; return el.value; }
  };

  pages.pool = function () {
    const code = qs('code');
    const id = +qs('id');
    const p = code ? Pools.find(x => x.code === code) : Pools.find(x => x.id === id);
    if (!p) { $[innerHTML] = errPage('استخر یافت نشد'); return; }
    if (p.registry) { $[innerHTML] = registryPoolPage(p); return; }
    const days = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); days.push(d.toISOString().slice(0, 10)); }
    const dayIdx = Math.min(Math.max(+(qs('day') || 0), 0), 6);
    const selDate = days[dayIdx];
    const sess = Sessions.filter(s => s.pool_id === id && s.date === selDate).sort((a, b) => a.time.localeCompare(b.time));
    $[innerHTML] = `
    <div class="detail-hero"><div class="detail-hero-bg">${esc(p.image || '🏊')}</div></div>
    <div class="container" style="padding-top:0">
      <div class="panel" style="margin-bottom:26px">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:16px">
          <div style="flex:1;min-width:250px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
              <h1 style="font-size:clamp(20px,3vw,27px)">${esc(p.name)}</h1>
              ${p.verified ? '<span class="tag tag-ok">✓ تأییدشده</span>' : ''}
              ${genderTag(p.gender)}
            </div>
            ${cfgContact('pools', poolOwnerName(p))
          ? `<p style="color:var(--muted);font-size:13.5px">📍 ${esc(p.city)} — ${esc(p.address || '')} | 📞 <span dir="ltr">${esc(p.phone || '')}</span></p>`
          : `<p style="color:var(--muted);font-size:13.5px">📍 ${esc(p.city)} — ${esc(p.address || '')} <span class="mini-tag" style="margin-right:6px">🔒 اطلاعات تماس محدود است</span></p>`}
            <div class="card-rate" style="margin:8px 0"><span class="stars">★★★★★</span><span class="rate-num" style="font-size:16px">${toFa(p.rating || 0)}</span><span class="rate-cnt">(${toFa(p.rate_count || 0)} نقد)</span></div>
            <p style="font-size:14px;color:var(--muted)">${esc(p.description || '')}</p>
            <div class="card-tags" style="margin-top:12px">${(p.features || []).map(f => `<span class="mini-tag">${esc(f)}</span>`).join('')}</div>
          </div>
          <button class="btn ${fav.has('pool', p.id) ? 'btn-danger' : 'btn-ghost'}" onclick="shFav('pool',${p.id})">${fav.has('pool', p.id) ? '❤️ حذف از علاقه‌مندی' : '🤍 ذخیره در علاقه‌مندی'}</button>
        </div>
        <div class="fact-grid">
          <div class="fact"><span class="fv">${toFa(p.water_temp || '—')}°</span><span class="fl">دمای آب</span></div>
          <div class="fact"><span class="fv">${toFa(p.lanes || '—')}</span><span class="fl">خط شنا</span></div>
          <div class="fact"><span class="fv">${toFa(p.occupancy || 0)}٪</span><span class="fl">اشغال فعلی</span></div>
          <div class="fact"><span class="fv">${cfgPrice('pools', poolOwnerName(p)) ? money(p.price_from) : '📞'}</span><span class="fl">${cfgPrice('pools', poolOwnerName(p)) ? 'شروع قیمت' : 'قیمت با تماس'}</span></div>
          <div class="fact"><span class="fv">${p.open_now ? '🟢 باز' : '🔴 بسته'}</span><span class="fl">وضعیت</span></div>
        </div>
        <div style="font-size:12px;color:var(--muted)"><span>اشغال زنده استخر:</span><div class="occ-bar" style="height:10px;border-radius:10px;margin-top:5px"><span class="occ-fill ${occClass(p.occupancy || 0)}" style="width:${p.occupancy || 0}%"></span></div></div>
      </div>

      <div class="panel"><h3>📅 رزرو سانس</h3>
        <div class="day-tabs">${days.map((d, i) => `<a href="https://estakhrjo.ir/pool.html?id=${id}&day=${i}" class="day-tab ${i === dayIdx ? 'active' : ''}">${i === 0 ? 'امروز' : (i === 1 ? 'فردا' : toFa(d.slice(5)))}<span class="d-lbl">${d}</span></a>`).join('')}</div>
        ${sess.length === 0 ? '<div class="empty" style="padding:26px"><span class="e-ic">🌙</span>برای این روز سانسی نیست.</div>' :
          `<div class="slot-grid">${sess.map(s => sessionSlot(s, p)).join('')}</div>`}
      </div>

      ${poolCoachesSection(p)}
    </div>
    ${reviewsSection('pool', id)}`;
  };

  /* ---------- بخش مربیان فعال استخر (برای مشتری) ---------- */
  function poolCoachesSection(p) {
    const seed = Availability.filter(a => String(a.pool_id) === String(p.id) || (a.pool_name && a.pool_name === p.name));
    const localAll = workStore.all();
    const local = Object.entries(localAll).flatMap(([cname, w]) => ((w && w.pools) || []).filter(x => String(x.pool_id) === String(p.id)).flatMap(x => x.sessions.map(s => ({ ...s, coach_name: cname }))));
    const items = [
      ...seed.map(a => ({ coach: (Coaches.find(c => String(c.id) === String(a.coach_id)) || {}), wday: a.weekday, st: String(a.start_time || '').slice(0, 5), en: String(a.end_time || '').slice(0, 5), rate: a.rate, note: a.note, cap: a.capacity || null, booked: 0 })),
      ...local.map(s => ({ coach: { full_name: s.coach_name }, wday: s.weekday, st: s.start, en: s.end, rate: s.price, kind: s.kind, cap: s.capacity, booked: s.booked || 0 })),
    ];
    const WDIFF = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    if (items.length === 0) return `<div class="coach-presence panel" style="margin-top:26px"><h3>👨‍🏫 مربیان فعال در این استخر</h3><div class="empty" style="padding:20px"><span class="e-ic">🌙</span>فعلاً مربی فعال ثبت نشده — برای هماهنگی: <b>${esc(p.phone || '')}</b></div></div>`;
    return `<div class="coach-presence panel" style="margin-top:26px">
      <h3>👨‍🏫 مربیان فعال در این استخر</h3>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">برنامه حضور و نرخ مربیان — رزرو مستقیم یا گفتگو برای هماهنگی (${toFa(items.length)} برنامه فعال)</p>
      ${items.map(it => {
        const c = it.coach || {};
        const free = it.cap ? Math.max(0, it.cap - it.booked) : null;
        const freePct = it.cap ? Math.round(free / it.cap * 100) : 100;
        return `<div class="cp-item">
          <div class="cp-av">${esc(c.image || '🏊')}</div>
          <div class="cp-info">
            <div class="cp-name">${esc(c.full_name || 'مربی استخر جو | ESTAKHRJO')} ${it.rate && cfgPrice('coaches', c.full_name || it.coach_name) ? `<span style="font-size:11px;color:var(--gold);font-weight:700;margin-right:6px">${money(it.rate)} <small style="color:var(--muted)">/ دوره</small></span>` : ''}</div>
            <div class="cp-meta">
              <span>🗓️ ${WDIFF[it.wday] || '—'}</span>
              <span>⏰ ${it.st} تا ${it.en}</span>
              ${it.kind ? `<span>${it.kind === 'private' ? '👤 خصوصی' : it.kind === 'kids' ? '👶 کودک' : '👥 گروهی'}</span>` : ''}
              ${it.note ? `<span>📝 ${esc(it.note)}</span>` : ''}
            </div>
            ${it.cap ? `<div class="cap-row" style="margin-top:8px"><div class="cap-bar2" style="max-width:160px"><div class="cap-fill2 ${free <= 2 ? 'almost' : ''}" style="width:${freePct}%"></div></div><span class="cap-txt">${toFa(free)} نفر از ${toFa(it.cap)} خالی</span></div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;min-width:140px">
            <a class="btn btn-primary btn-sm" href="chat.html?to=${encodeURIComponent('coach:' + (c.id || 'x'))}">💬 گفتگو</a>
            ${cfgSell('coaches', c.full_name || it.coach_name) ? ((it.cap === null || free > 0) ? `<button class="btn btn-gold btn-sm" onclick="toasglass('🎉 درخواست رزرو برای ${esc(c.full_name || 'مربی')} ارسال شد')">رزرو سانس</button>` : '<span class="st err">تکمیل ظرفیت</span>') : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  pages.coaches = function () {
    const rawCity = qs('city'), cityQ = rawCity ? '&city=' + encodeURIComponent(rawCity) : '';
    const params = { q: qs('q') || '', city: cityScope(rawCity), gender: qs('gender') || '', level: qs('level') || '', online: qs('online'), home: qs('home'), sort: qs('sort') || '' };
    let list = Coaches.filter(c => {
      if (params.q && !(c.full_name + ' ' + (c.specialties || []).join(' ')).includes(params.q)) return false;
      if (params.city && c.city !== params.city) return false;
      if (params.gender && c.gender !== params.gender) return false;
      if (params.level && !(c.levels || []).includes(params.level)) return false;
      if (params.online && !c.online) return false;
      if (params.home && !c.home_pool) return false;
      return true;
    });
    if (params.sort === 'cheap') list = list.slice().sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
    else if (params.sort === 'exp') list = list.slice().sort((a, b) => (b.exp_years || 0) - (a.exp_years || 0));
    // پیش‌فرض: محبوب‌ترین‌ها بر اساس ستارهٔ کاربران (رأی کنار کارت مربی).
    else list = list.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0) || (b.rating || 0) - (a.rating || 0));
    const cities = [...new Set(Coaches.map(c => c.city))];
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>🏆 مربیان شنا</h2><p>${toFa(list.length)} مربی</p></div></div>
      <div class="filter-bar"><div class="filter-row">
        <div class="fd"><label>شهر</label><select id="fc_city"><option value="all" ${qs('city') === 'all' ? 'selected' : ''}>همه ایران</option>${cities.map(c => `<option ${params.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="fd"><label>جنسیت مربی</label><select id="fc_g"><option value="">همه</option><option value="male" ${params.gender === 'male' ? 'selected' : ''}>آقا</option><option value="female" ${params.gender === 'female' ? 'selected' : ''}>خانم</option></select></div>
        <div class="fd"><label>مرتب‌سازی</label><select id="fc_s"><option value="">بهترین امتیاز</option><option value="cheap" ${params.sort === 'cheap' ? 'selected' : ''}>ارزان‌ترین</option><option value="exp" ${params.sort === 'exp' ? 'selected' : ''}>بیشترین سابقه</option></select></div>
        <div class="fd" style="flex:1;min-width:170px"><label>جستجو</label><input id="fc_q" value="${esc(params.q)}" onkeydown="if(event.key==='Enter')goC()"></div>
        <div class="fd"><label>&nbsp;</label><button class="btn btn-primary" onclick="goC()">اعمال</button></div>
        <div class="fd"><label>&nbsp;</label><a href="https://estakhrjo.ir/coaches.html?city=all" class="btn btn-ghost">پاک کردن</a></div>
      </div>
      <div class="filter-row" style="margin-top:12px"><span class="lbl">سریع:</span>
        <a href="https://estakhrjo.ir/coaches.html?online=1${cityQ}" class="filter-chip ${params.online ? 'on' : ''}">💻 آنلاین</a>
        <a href="https://estakhrjo.ir/coaches.html?home=1${cityQ}" class="filter-chip ${params.home ? 'on' : ''}">🏠 استخر منزل</a>
      </div></div>
      ${list.length === 0 ? '<div class="empty"><span class="e-ic">🔍</span>مربی یافت نشد.</div>' : `<div class="cards">${list.map(coachCard).join('')}</div>`}
    </div>`;
    window.goC = function () {
      const v = id => { const el = document.getElementById(id); return el ? encodeURIComponent(el.value) : ''; };
      location.href = `coaches.html?q=${v('fc_q')}&city=${v('fc_city')}&gender=${v('fc_g')}&sort=${v('fc_s')}`;
    };
  };

  pages.coach = function () {
    // شناسه ممکن است عددی (مربیان سابق) یا متنیِ عضو واقعی ('m-username') باشد.
    const idRaw = String(qs('id') || '');
    const c = Coaches.find(x => String(x.id) === idRaw);
    if (!c) { $[innerHTML] = errPage('مربی یافت نشد'); return; }
    if (c.username) return pageMemberCoach(c);
    const id = +qs('id');
    $[innerHTML] = `
    <div class="detail-hero" style="min-height:180px"><div class="detail-hero-bg" style="opacity:.3">${esc(c.image || '🏊')}</div></div>
    <div class="container" style="padding-top:0;margin-top:-20px">
      <div class="panel" style="margin-bottom:26px">
        <div style="display:flex;gap:20px;align-items:start;flex-wrap:wrap">
          <span class="dash-avatar" style="width:88px;height:88px;font-size:44px;flex-shrink:0;border-radius:24px;background:linear-gradient(135deg,var(--brand-l),var(--brand));color:#fff">${esc(c.image || '🏊')}</span>
          <div style="flex:1;min-width:230px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><h1 style="font-size:clamp(20px,3vw,26px)">${esc(c.full_name)}</h1>${c.verified ? '<span class="tag tag-ok">✓ تأییدشده</span>' : ''}${c.gender === 'female' ? '<span class="tag" style="background:#fce7f3;color:#db2777">مربی خانم</span>' : ''}</div>
            <p style="color:var(--muted);font-size:13.5px">📍 ${esc(c.city)} • 🕐 ${toFa(c.exp_years || 0)} سال سابقه • 👥 ${toFa(c.students || 0)} شاگرد</p>
            <div class="card-rate" style="margin:8px 0"><span class="stars">★★★★★</span><span class="rate-num" style="font-size:16px">${toFa(c.rating || 0)}</span><span class="rate-cnt">(${toFa(c.rate_count || 0)})</span></div>
            <p style="font-size:14px;color:var(--muted)">${esc(c.bio || '')}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:210px">
            <button class="btn ${fav.has('coach', c.id) ? 'btn-danger' : 'btn-ghost'} btn-block" onclick="shFav('coach',${c.id})">${fav.has('coach', c.id) ? '❤️ حذف از علاقه‌مندی' : '🤍 ذخیره در علاقه‌مندی'}</button>
            <a class="btn btn-primary btn-block" href="chat.html?to=${encodeURIComponent('coach:' + c.id)}&name=${encodeURIComponent(c.full_name)}">💬 گفتگوی مستقیم</a>
            ${cfgSell('coaches', c.full_name)
              ? `<a class="btn btn-gold btn-block" href="#avail-${c.id}">🗓️ رزرو از تقویم اوقات آزاد</a>`
              : `<span class="btn btn-ghost btn-block" style="cursor:default;opacity:.8">🗓️ رزرو مستقیم به‌زودی — فعلاً با گفتگو هماهنگ کنید</span>`}
          </div>
        </div>
        <div class="fact-grid">
          <div class="fact"><span class="fv">${cfgPrice('coaches', c.full_name) ? money(c.hourly_rate) : '💬'}</span><span class="fl">نرخ ساعتی</span></div>
          <div class="fact"><span class="fv">${cfgPrice('coaches', c.full_name) ? money(c.private_price) : '💬'}</span><span class="fl">جلسه خصوصی</span></div>
          <div class="fact"><span class="fv">${cfgPrice('coaches', c.full_name) ? money(c.group_price) : '💬'}</span><span class="fl">جلسه گروهی</span></div>
          <div class="fact"><span class="fv">${c.online ? '✓' : '—'}</span><span class="fl">مشاوره آنلاین</span></div>
          <div class="fact"><span class="fv">${c.home_pool ? '✓' : '—'}</span><span class="fl">استخر منزل</span></div>
        </div>
      </div>
      <div class="panel-grid">
        <div class="panel"><h3>🎯 تخصص‌ها</h3><div class="card-tags" style="gap:8px">${(c.specialties || []).map(s => `<span class="mini-tag" style="font-size:13px;padding:7px 15px">${esc(s)}</span>`).join('')}</div>
          <h3 style="margin-top:22px;font-size:14px">📊 سطح‌ها</h3><div class="card-tags">${(c.levels || []).map(l => `<span class="mini-tag">${esc(l)}</span>`).join('')}</div>
          <h3 style="margin-top:16px;font-size:14px">👶 گروه سنی</h3><div class="card-tags">${(c.age_groups || []).map(a => `<span class="mini-tag">${esc(a)}</span>`).join('')}</div>
        </div>
        <div class="panel"><h3>🏅 مدارک و افتخارات</h3>
          <ul style="list-style:none;font-size:13.5px;color:var(--muted);line-height:2">${(c.certs || []).map(x => `<li>📜 ${esc(x)}</li>`).join('')}${(c.medals || []).map(x => `<li>🏆 ${esc(x)}</li>`).join('')}</ul>
          ${cfgContact('coaches', c.full_name) && (c.instagram || c.telegram || c.website) ? '<h3 style="margin-top:16px;font-size:14px">📱 ارتباط</h3><div style="display:flex;gap:9px;flex-wrap:wrap">' + (c.instagram ? `<span class="mini-tag">📷 ${esc(c.instagram)}</span>` : '') + (c.telegram ? `<span class="mini-tag">✈️ ${esc(c.telegram)}</span>` : '') + (c.website ? `<span class="mini-tag">🌐 ${esc(c.website)}</span>` : '') + '</div>' : ''}
        </div>
      </div>
      ${coachCalendar(c)}
    </div>
    ${reviewsSection('coach', id)}`;
  };

  /* پروفایل مربیِ عضو واقعی — همان ساختار کلاسیک سایت، ولی با دیتای واقعی
     عضو (دایرکتوری + بستهٔ صفحهٔ عمومی). لینک صفحهٔ عمومی مربی همین‌جا قرار
     می‌گیرد؛ کارت‌ها به این صفحه می‌آیند، نه مستقیم به صفحهٔ عمومی. */
  function memberAvailabilityHtml(rows) {
    if (!rows.length) return '<div class="empty" style="padding:18px"><span class="e-ic">🗓️</span>فعلاً سانس فعالی ثبت نشده است.<br><small style="color:var(--muted)">زمان‌بندی دقیق را با خود مربی هماهنگ کنید.</small></div>';
    return `<div class="avail-grid">${WEEKDAYS.map((d, i) => {
      const day = rows.filter(s => Number(s.weekday) === i);
      return `<div class="avail-day"><div class="avail-day-name">${d}</div>${day.length === 0 ? '<div class="avail-empty">—</div>' : day.map(s => `
        <div class="avail-slot"><span class="t">${esc(String(s.start_time || '').slice(0, 5))} تا ${esc(String(s.end_time || '').slice(0, 5))}</span>
          ${s.pool_name ? `<span style="display:block">${esc(s.pool_name)}</span>` : ''}
          ${s.note ? `<span style="display:block;opacity:.75">${esc(String(s.note).slice(0, 60))}</span>` : ''}
        </div>`).join('')}</div>`;
    }).join('')}</div>`;
  }
  async function hydrateMemberCoachDetail(c) {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    try {
      const b = await fetchMemberProfileBundle(c.username);
      const ident = b.identity || {};
      if (ident.avatar && /^data:image\/|^https:/i.test(String(ident.avatar))) {
        const av = document.getElementById('mcAvatar');
        if (av) av.innerHTML = `<img src="${esc(ident.avatar)}" alt="${esc(c.full_name)}" style="width:100%;height:100%;object-fit:cover;border-radius:24px;display:block">`;
      }
      const story = String((b.authored && b.authored.story) || '').trim();
      set('mcStory', story
        ? `<p style="font-size:13.5px;color:var(--ink);line-height:2.1;white-space:pre-line">${esc(story)}</p>`
        : '<div class="empty" style="padding:16px"><span class="e-ic">📝</span>معرفی متنی ثبت نشده است.</div>');
      const pools = (b.data && Array.isArray(b.data.pools)) ? b.data.pools : [];
      set('mcPools', pools.length
        ? pools.map(p => `<span class="mini-tag" style="font-size:13px;padding:7px 14px">🏊 ${esc(p.name || '')}${p.city ? ` <small>${esc(p.city)}</small>` : ''}</span>`).join('')
        : '<span style="font-size:13px;color:var(--muted)">محلی ثبت نشده است.</span>');
      const avl = (b.data && Array.isArray(b.data.availability)) ? b.data.availability : [];
      set('mcSessions', memberAvailabilityHtml(avl));
      /* مدارک و سوابق حرفه‌ای — از همان رکوردی که مربی در «پروفایل من ← پروفایل حرفه‌ای» پر می‌کند */
      const cp = (b.data && b.data.coach) ? b.data.coach : null;
      const facts = [];
      if (cp) {
        if (cp.exp_years) facts.push(`⏳ ${toFa(cp.exp_years)} سال تجربه`);
        if (cp.students) facts.push(`👥 بیش از ${toFa(cp.students)} شاگرد`);
        if (cp.online) facts.push('💻 مشاورهٔ آنلاین');
        if (cp.home_pool) facts.push('🏠 استخر شخصی');
        if (arr(cp.specialties).length) facts.push(...arr(cp.specialties).slice(0, 6).map(s => `◈ ${s}`));
      }
      const certs = cp ? arr(cp.certs) : [];
      const career = cp && Array.isArray(cp.career) ? cp.career : [];
      const proBox = document.getElementById('mcPro');
      if (proBox) {
        if (!cp || (!facts.length && !certs.length && !career.length)) {
          proBox.style.display = 'none';
        } else {
          proBox.innerHTML = `
            ${facts.length ? `<div class="card-tags" style="gap:8px;margin-bottom:14px">${facts.map(f => `<span class="mini-tag" style="font-size:12.5px;padding:6px 12px">${esc(f)}</span>`).join('')}</div>` : ''}
            ${certs.length ? `<div style="margin-bottom:12px"><b style="font-size:13px;display:block;margin-bottom:8px">🎓 مدارک حرفه‌ای</b>${certs.map(c => `<div style="display:flex;gap:8px;align-items:baseline;padding:5px 0;font-size:12.5px"><span style="color:var(--gold)">▸</span><span>${esc(c)}</span></div>`).join('')}</div>` : ''}
            ${career.length ? `<div><b style="font-size:13px;display:block;margin-bottom:8px">🗓️ مسیر حرفه‌ای</b>${career.map(c => `<div style="display:flex;gap:10px;align-items:baseline;padding:5px 0;font-size:12.5px;border-right:2px solid var(--border);padding-right:10px;margin-right:3px"><b style="color:var(--brand);min-width:44px">${esc(c.year || '')}</b><span>${esc(c.title || '')}</span></div>`).join('')}</div>` : ''}`;
        }
      }
    } catch (e) {
      set('mcStory', '<div class="empty" style="padding:16px">⚠️ در بارگذاری اطلاعات مشکلی پیش آمد.</div>');
      set('mcSessions', '');
    }
  }
  function pageMemberCoach(c) {
    const memberHref = coachProfileUrl(c.username);
    const avatarInner = /^(https:|data:image)/i.test(String(c.image || ''))
      ? `<img src="${esc(c.image)}" alt="${esc(c.full_name)}" style="width:100%;height:100%;object-fit:cover;border-radius:24px;display:block">`
      : esc('🏊');
    $[innerHTML] = `
    <div class="detail-hero" style="min-height:180px"><div class="detail-hero-bg" style="opacity:.3">🏊</div></div>
    <div class="container" style="padding-top:0;margin-top:-20px">
      <div class="panel" style="margin-bottom:26px">
        <div style="display:flex;gap:20px;align-items:start;flex-wrap:wrap">
          <span id="mcAvatar" class="dash-avatar" style="width:88px;height:88px;font-size:44px;flex-shrink:0;border-radius:24px;background:linear-gradient(135deg,var(--brand-l),var(--brand));color:#fff;overflow:hidden">${avatarInner}</span>
          <div style="flex:1;min-width:230px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><h1 style="font-size:clamp(20px,3vw,26px)">${esc(c.full_name)}</h1>${c.verified ? '<span class="tag tag-ok">✓ تأییدشده</span>' : ''}</div>
            <p style="color:var(--muted);font-size:13.5px">📍 ${esc(c.city || '—')} • ⭐ ${toFa(c.stars || 0)} رأی کاربران</p>
            ${c.tagline ? `<p style="font-size:14px;color:var(--muted);line-height:1.9">${esc(c.tagline)}</p>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:210px">
            <a class="btn btn-gold btn-block" href="${memberHref}">🌐 صفحهٔ عمومی مربی</a>
            <button class="btn ${coachStarList().includes(c.username) ? 'btn-gold voted' : 'btn-ghost'} btn-block" data-star-user="${esc(c.username)}" onclick="shStarCoach('${esc(c.username)}')">⭐ امتیاز به مربی (<span class="star-cnt">${toFa(c.stars || 0)}</span>)</button>
            <button class="btn ${fav.has('coach', c.id) ? 'btn-danger' : 'btn-ghost'} btn-block" onclick="shFav('coach','${esc(String(c.id))}')">${fav.has('coach', c.id) ? '❤️ حذف از علاقه‌مندی' : '🤍 ذخیره در علاقه‌مندی'}</button>
          </div>
        </div>
      </div>
      <div class="panel-grid">
        <div class="panel"><h3>📝 دربارهٔ مربی</h3><div id="mcStory"><div class="empty" style="padding:16px"><span class="e-ic">⏳</span>در حال بارگذاری…</div></div></div>
        <div class="panel"><h3>🏅 مدارک و سوابق</h3><div id="mcPro"><div class="empty" style="padding:16px"><span class="e-ic">⏳</span>در حال بارگذاری…</div></div></div>
      </div>
      <div class="panel"><h3>🏊 محل‌های فعالیت</h3><div id="mcPools" class="card-tags" style="gap:8px"><span style="font-size:13px;color:var(--muted)">⏳</span></div>
        <p style="font-size:12.5px;color:var(--muted);margin-top:16px;line-height:1.9">💬 برای هماهنگی و رزرو، از بخش «صفحهٔ عمومی مربی» راه‌های ارتباطی ثبت‌شده توسط مربی را ببینید.</p>
      </div>
      <div class="panel" style="margin-top:26px"><h3>🗓️ سانس‌ها و اوقات کاری</h3><div id="mcSessions"><div class="empty" style="padding:16px"><span class="e-ic">⏳</span>در حال بارگذاری…</div></div></div>
    </div>`;
    hydrateMemberCoachDetail(c);
  }

  /* تقویم اوقات آزاد مربی */
  const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  function coachCalendar(c) {
    const slots = Availability.filter(a => String(a.coach_id) === String(c.id));
    if (slots.length === 0) return `<div class="panel" id="avail-${c.id}" style="margin-top:26px"><h3>🗓️ تقویم اوقات آزاد</h3><div class="empty" style="padding:18px"><span class="e-ic">🗓️</span>فعلاً بازه زمانی ثبت نشده — از طریق چت هماهنگ کنید.</div></div>`;
    return `<div class="panel reveal in" id="avail-${c.id}" style="margin-top:26px">
      <h3>🗓️ تقویم اوقات آزاد ${esc(c.full_name)}</h3>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">برای رزرو جلسه روی بازه موردنظر کلیک کنید</p>
      <div class="avail-grid">${WEEKDAYS.map((d, i) => {
        const day = slots.filter(s => s.weekday === i);
        return `<div class="avail-day"><div class="avail-day-name">${d}</div>
          ${day.length === 0 ? '<div class="avail-empty">—</div>' : day.map(s => `
            <div class="avail-slot" onclick="shPickSlot(this,'${esc(d)} ${String(s.start_time).slice(0, 5)}',${c.id})">
              <span class="t">${String(s.start_time).slice(0, 5)} تا ${String(s.end_time).slice(0, 5)}</span>
              ${s.pool_name ? `<span style="display:block">${esc(s.pool_name)}</span>` : '<span style="display:block">📍 محل دلخواه</span>'}
              ${s.rate ? `<span class="r">${money(s.rate)}/ساعت</span>` : ''}
              ${s.note ? `<span style="display:block;opacity:.75">${esc(s.note)}</span>` : ''}
            </div>`).join('')}
        </div>`;
      }).join('')}</div>
      <div id="slotConfirm" style="margin-top:16px"></div>
    </div>`;
  }
  let selectedSlot = null;
  window.shPickSlot = function (el, label, coachId) {
    document.querySelectorAll('.avail-slot').forEach(x => x.classList.remove('picked'));
    el.classList.add('picked');
    selectedSlot = { label, coachId };
    const box = document.getElementById('slotConfirm');
    box.innerHTML = `<div class="b2b-banner" style="padding:16px 20px">
      <span style="font-size:26px">✅</span>
      <div style="flex:1">بازه <b>${esc(label)}</b> انتخاب شد.</div>
      ${cfgSell('coaches', c.full_name)
        ? `<button class="btn btn-primary" onclick="shBookSlot()">تأیید و رزرو جلسه</button>`
        : `<a class="btn btn-primary" href="chat.html?to=${encodeURIComponent('coach:' + c.id)}&name=${encodeURIComponent(c.full_name)}">💬 هماهنگی با گفتگو</a>`}
    </div>`;
  };
  window.shBookSlot = function () {
    if (!selectedSlot) return;
    const u = me.get();
    if (!u) { toasglass('ابتدا وارد شوید'); setTimeout(() => location.href = 'login.html', 900); return; }
    toasglass('🎉 جلسه شما برای «' + selectedSlot.label + '» رزرو شد! تأییدیه در چت ارسال می‌شود.');
    setTimeout(() => location.href = 'https://estakhrjo.ir/chat.html?to=coach:' + selectedSlot.coachId, 1200);
  };

  pages.hydro = function () {
    const selectedCity = cityScope(qs('city')); const list = inCity(Hydro, selectedCity); const cities = [...new Set(Hydro.map(h => h.city).filter(Boolean))];
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>🩺 هیدروتراپی و آب‌درمانی</h2><p>${toFa(list.length)} متخصص تأییدشده${selectedCity ? ' در ' + esc(selectedCity) : ''}</p></div></div>
      <div class="city-scope-bar"><span>📍 ${selectedCity ? 'نمایش شهر انتخابی: ' + esc(selectedCity) : 'نمایش همه ایران'}</span><select id="hydroCity" onchange="location.href='https://estakhrjo.ir/hydro.html?city='+encodeURIComponent(this.value)"><option value="all">همه ایران</option>${cities.map(c => `<option value="${esc(c)}" ${c === selectedCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="cards">${list.map(h => `
        <div class="card coach-card anim-up">
          <div class="card-img" style="height:auto;padding:26px 20px 0;display:flex;justify-content:center"><span class="coach-avatar" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46">${esc(h.image || '🩺')}</span>${h.verified ? '<span class="coach-badge">✓ پروانه رسمی</span>' : ''}</div>
          <div class="card-body" style="text-align:center;padding-top:14px">
            <div class="card-name" style="justify-content:center;flex-direction:column"><span style="font-size:16px">${esc(h.full_name)}</span><span class="card-loc" style="font-size:12px">${esc(h.specialty || '')}</span><span class="card-loc" style="font-size:12px">📍 ${esc(h.city)} — ${esc(h.clinic || '')}</span></div>
            <div class="card-rate" style="justify-content:center"><span class="stars">★★★★★</span><span class="rate-num">${toFa(h.rating || 0)}</span></div>
            <p style="font-size:12.5px;color:var(--muted)">${esc(trunc(h.bio, 100))}</p>
            <div class="card-tags" style="justify-content:center">${(h.services || []).slice(0, 3).map(s => `<span class="mini-tag">${esc(s)}</span>`).join('')}</div>
            <div class="card-tags" style="justify-content:center">${h.insurance ? '<span class="mini-tag" style="background:#d1fae5;color:#059669">✓ بیمه طرف قرارداد</span>' : ''}</div>
            <div class="card-foot"><span class="price">${money(h.price)} <small>/ جلسه</small></span><button class="btn btn-primary btn-sm" onclick="toasglass('درخواست نوبت ثبت شد 🗓️')">درخواست نوبت</button></div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  };

  pages.market = function () {
    const cat = qs('cat') || '', q = qs('q') || '';
    const cats = [...new Set(Products.map(p => p.category).filter(Boolean))];
    const list = Products.filter(p => (!cat || p.category === cat) && (!q || (p.name + ' ' + (p.brand || '')).includes(q)));
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>🛍️ فروشگاه تجهیزات شنا</h2><p>${toFa(list.length)} محصول</p></div></div>
      <div class="filter-bar"><div class="filter-row">
        <div class="fd"><label>دسته‌بندی</label><select id="fm_c"><option value="">همه</option>${cats.map(c => `<option ${cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="fd" style="flex:1;min-width:170px"><label>جستجو</label><input id="fm_q" value="${esc(q)}" onkeydown="if(event.key==='Enter')goM()"></div>
        <div class="fd"><label>&nbsp;</label><button class="btn btn-primary" onclick="goM()">اعمال</button></div>
        <div class="fd"><label>&nbsp;</label><a href="https://estakhrjo.ir/market.html" class="btn btn-ghost">پاک کردن</a></div>
      </div></div>
      ${list.length === 0 ? '<div class="empty"><span class="e-ic">🔍</span>محصولی نیست.</div>' : `<div class="cards">${list.map(productCard).join('')}</div>`}
    </div>`;
    window.goM = () => { const v = id => { const el = document.getElementById(id); return el ? encodeURIComponent(el.value) : ''; }; location.href = `market.html?cat=${v('fm_c')}&q=${v('fm_q')}`; };
  };

  pages.jobs = function () {
    const selectedCity = cityScope(qs('city')); const localJobs = inCity(Jobs, selectedCity); const localRequests = inCity(CoachRequests, selectedCity);
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>💼 فرصت‌های شغلی</h2><p>${toFa(localJobs.length)} آگهی${selectedCity ? ' در ' + esc(selectedCity) : ''}</p></div></div>
      <div class="city-scope-note">📍 نتایج بر اساس شهر انتخابی شما${selectedCity ? ' («' + esc(selectedCity) + '»)' : ''} نمایش داده می‌شوند.</div>
      <div class="cards">${localJobs.map(j => `<div class="card anim-up"><div class="card-body">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span class="mini-tag">${esc(j.job_type || '')}</span><span class="mini-tag">📍 ${esc(j.city || '')}</span></div>
        <div class="card-name" style="font-size:16px">${esc(j.title)}</div>
        <div class="card-loc" style="font-weight:700;color:var(--brand)">${esc(j.pool_name || '')}</div>
        <p style="font-size:13px;color:var(--muted)">${esc(j.description || '')}</p>
        <div class="card-foot"><span class="price">${esc(j.salary || '')}</span>${jobActionHtml('job', j, 'ارسال رزومه')}</div>
      </div></div>`).join('')}</div>

      <div class="sec-head" style="margin-top:44px"><div class="sec-title"><h2>🔥 <span class="grad">استخرها به مربی نیاز دارند</span></h2><p>آگهی‌های فوری استخدام مربی</p></div><a href="https://estakhrjo.ir/resumes.html" class="sec-link">مشاهده برد رزومه ←</a></div>
      <div class="cards">${localRequests.map(q => `<div class="card sup-card anim-up"><div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px"><span class="chip gold" style="font-size:10.5px">⚡ فوری</span><span class="mini-tag">${q.gender === 'women' ? '🌸 ویژه بانوان' : q.gender === 'men' ? '👨 ویژه آقایان' : '👥 عمومی'}</span></div>
        <div class="card-name" style="font-size:16px">${esc(q.title)}</div>
        <div class="card-loc" style="font-weight:700;color:var(--brand)">🏊 ${esc(q.pool_name || '')} • 📍 ${esc(q.city || '')}</div>
        <div class="course-meta" style="margin:8px 0"><span>🗓️ ${esc(q.schedule || '')}</span><span>📊 ${esc(q.level || '')}</span></div>
        <p style="font-size:12.5px;color:var(--muted)">${esc(q.description || '')}</p>
        <div class="card-foot"><span class="price">${esc(q.salary || 'توافقی')}</span>${jobActionHtml('coach', q, isCoachJob(q) ? 'ارسال رزومه' : 'تماس')}</div>
      </div></div>`).join('')}</div>
    </div>`;
  };

  pages.events = function () {
    const selectedCity = cityScope(qs('city')); const localEvents = inCity(Events, selectedCity);
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>🏅 رویدادها و مسابقات</h2><p>${toFa(localEvents.length)} رویداد${selectedCity ? ' در ' + esc(selectedCity) : ''}</p></div></div>
      <div class="cards">${localEvents.map(e => `<div class="card anim-up"><div class="card-body">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span class="mini-tag" style="background:#fef3c7;color:#d97706">${esc(e.level || '')}</span><span class="mini-tag">📅 ${esc(e.date || '')}</span></div>
        <div class="card-name" style="font-size:16px;margin-bottom:8px">${esc(e.title)}</div>
        <p style="font-size:13px;color:var(--muted)">${esc(e.description || '')}</p>
        <div class="fact-grid" style="margin:16px 0"><div class="fact"><span class="fv">${toFa(e.participants || 0)}</span><span class="fl">شرکت‌کننده</span></div><div class="fact"><span class="fv" style="font-size:15px">${esc(e.prize || '')}</span><span class="fl">جایزه</span></div></div>
        <div class="card-foot"><span class="card-loc">📍 ${esc(e.city || '')}</span><button class="btn btn-primary btn-sm" onclick="toasglass('ثبت‌نام در رویداد انجام شد 🎟️')">ثبت‌نام</button></div>
      </div></div>`).join('')}</div>
    </div>`;
  };

  pages.articles = function () {
    $[innerHTML] = `<div class="container" style="padding-top:28px">
      <div class="sec-head"><div class="sec-title"><h2>📖 مجله شنا</h2><p>آموزش، سلامت و اخبار</p></div></div>
      <div class="cards">${Articles.map(a => `<div class="card anim-up">
        <div class="card-img" style="height:150px"><span class="bg" style="background:var(--brand-l);font-size:56px">${esc(a.emoji || '📖')}</span></div>
        <div class="card-body"><span class="tag tag-brand" style="align-self:start">${esc(a.tag || '')}</span>
          <div class="card-name" style="font-size:15.5px;margin-top:8px">${esc(a.title)}</div>
          <p style="font-size:13px;color:var(--muted)">${esc(a.excerpt || '')}</p>
          <div class="card-foot"><span class="mini-tag">⏱️ ${toFa(a.minutes || 5)} دقیقه</span><a class="sec-link" href="https://estakhrjo.ir/articles.html">ادامه ←</a></div>
        </div>
      </div>`).join('')}</div>
    </div>`;
  };

  /* ---------- دروازه امن مدیر سیستم (جدا از ورود عمومی) ---------- */
  pages.admin = function () {
    const cur = me.get();
    if (cur && cur.u === 'admin') { location.href = ADMIN_CONSOLE_URL; return; }
    $[innerHTML] = `<div class="lx-shell">
      <div class="lx-form-side">
        <div class="lx-card-lux" style="max-width:410px" id="adminCard">
          <div class="lx-logo-row">
            <span class="lx-logo-badge">🔐</span>
            <div><div style="font-size:19px;font-weight:900">دروازه مدیر سیستم</div></div>
          </div>
          <h1 class="lx-title" style="font-size:22px">احراز هویت <b>سطح مدیریت</b></h1>
          <form onsubmit="event.preventDefault();shAdminGo()">
            <div class="lx-field"><span>👤</span><input class="lx-inp" id="adm_u" dir="ltr" placeholder="نام کاربری" autocomplete="username"></div>
            <div class="lx-field"><span>🔑</span><input class="lx-inp" id="adm_p" type="password" dir="ltr" placeholder="رمز عبور" autocomplete="current-password"></div>
            <button class="lx-btn-gold" type="submit">تأیید هویت و ورود ←</button>
          </form>
        </div>
      </div>
      <div class="lx-visual">
        <div class="lx-visual-img"></div>
        <div class="lx-waves"></div>
        <div class="lx-visual-veil"></div>
        <div class="lx-visual-content">
          <div class="lx-visual-title" style="font-size:26px">سامانه کنترل یکپارچه <em>استخر جو | ESTAKHRJO</em></div>
          <p class="lx-visual-sub">فعال‌سازی نمایش قیمت، اطلاعات تماس و فروش مستقیم — برای هر بخش و هر کاربر، جداگانه در دستان شما.</p>
        </div>
      </div>
    </div>`;
    window.shAdminGo = () => window.shCredentialLogin('adm_u', 'adm_p', true);
  };

  pages.login = function () {
    if (me.get()) { location.href = 'dashboard.html?build=ppf8'; return; }
    $[innerHTML] = `<div class="lx-shell">
      <div class="lx-form-side">
        <div class="lx-card-lux" id="loginCard">
          <div class="lx-logo-row">
            <span class="lx-logo-badge"><img src="assets/estakhrjo-mark.webp" width="56" height="56" alt="استخر جو"></span>
            <div><div style="font-size:21px;font-weight:900">استخر جو | ESTAKHRJO</div><div style="font-size:11px;color:var(--muted)">بزرگ‌ترین اکوسیستم شنای ایران</div></div>
          </div>
          <h1 class="lx-title">ورود با <b>نام کاربری و رمز</b></h1>
          <p class="lx-sub">حساب شما توسط مدیر استخر جو | ESTAKHRJO ساخته می‌شود. نام کاربری و رمز اختصاصی خود را وارد کنید؛ نقش، اشتراک و وضعیت حساب هنگام ورود بررسی می‌شود.<br><span style="font-size:10.5px;color:var(--muted2)">برای ساخت حساب یا دریافت اطلاعات ورود با مدیر سیستم تماس بگیرید.</span></p>
          <form onsubmit="event.preventDefault();shCredentialLogin('loginUsername','loginPassword',false)">
            <div class="lx-field"><span>👤</span><input class="lx-inp" id="loginUsername" dir="ltr" placeholder="username" autocomplete="username" required></div>
            <div class="lx-field"><span>🔑</span><input class="lx-inp" id="loginPassword" type="password" dir="ltr" placeholder="رمز عبور" autocomplete="current-password" required></div>
            <button class="lx-btn-gold" type="submit">ورود به پنل من ←</button>
          </form>
          <div class="login-managed-note"><span>🛡️</span><div><b>ورود مدیریت‌شده</b><small>اگر حساب غیرفعال باشد، ورود تا فعال‌سازی مدیر امکان‌پذیر نیست.</small></div></div>
        </div>
      </div>
      <div class="lx-visual">
        <div class="lx-visual-img"></div>
        <div class="lx-waves"></div>
        <div class="lx-visual-veil"></div>
        <div class="lx-visual-content">
          <div class="lx-chip-row">
            <span class="lx-chip">🏊 <b>${toFa('۱۲۰')}+</b> استخر فعال</span>
            <span class="lx-chip">🏆 <b>${toFa('۳۵۰')}+</b> مربی حرفه‌ای</span>
            <span class="lx-chip">⭐ <b>${toFa('۴.۸')}</b> امتیاز کاربران</span>
          </div>
          <div class="lx-visual-title">یک هویت، یک پنل،<br>یک اکوسیستم <em>آبی</em></div>
          <p class="lx-visual-sub">مدیر سیستم حساب‌ها را می‌سازد و اعضا می‌توانند از «پروفایل من» نام کاربری و رمز ورود خود را به‌روزرسانی کنند.</p>
        </div>
      </div>
    </div>`;
  };

  /* ---------- سیستم مدیریت کار مربی (استخر + سانس + ظرفیت + قیمت) ---------- */
  const workStore = {
    key: 'sh_coach_work',
    all() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
    mine() { const u = me.get() || {}; return this.all()[u.name] || { pools: [] }; },
    save(data) {
      const u = me.get() || {}; const a = this.all(); a[u.name] = data; localStorage.setItem(this.key, JSON.stringify(a));
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && cloud.active && cloud.saveCoachWork) cloud.saveCoachWork(data).catch(e => toasglass('⚠️ همگام‌سازی محل کار ناموفق بود: ' + (e.message || 'خطا')));
    },
    addPool(pid, name, city) {
      const w = this.mine();
      if (w.pools.some(p => String(p.pool_id) === String(pid))) { toasglass('این استخر قبلاً اضافه شده'); return; }
      const p = Pools.find(x => String(x.id) === String(pid));
      w.pools.push({ pool_id: pid, pool_name: name || (p ? p.name : 'استخر'), pool_city: city || (p ? p.city : ''), sessions: [] });
      this.save(w);
      toasglass('✓ استخر به محل کار شما افزوده شد');
    },
    delPool(pid) { const w = this.mine(); w.pools = w.pools.filter(p => String(p.pool_id) !== String(pid)); this.save(w); toasglass('استخر حذف شد'); },
    addSession(pid, s) {
      const w = this.mine();
      const p = w.pools.find(x => String(x.pool_id) === String(pid));
      if (!p) return;
      p.sessions.push({ id: 's' + Date.now(), ...s, booked: 0 });
      this.save(w);
      toasglass('✓ سانس ثبت شد — برای مشتریان قابل مشاهده است');
    },
    delSession(pid, sid) { const w = this.mine(); const p = w.pools.find(x => String(x.pool_id) === String(pid)); if (p) { p.sessions = p.sessions.filter(s => s.id !== sid); this.save(w); toasglass('سانس حذف شد'); } },
  };
  const WEEKDAYS2 = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

  /* ---------- مدیریت مجموعه‌های آبی مالک استخر ---------- */
  const OWNER_POOL_AMENITIES = [
    ['water', 'امکانات آبی', [['lap', 'خط تمرینی'], ['kids_pool', 'استخر کودک'], ['training_pool', 'استخر آموزشی'], ['warm_pool', 'استخر آب‌گرم'], ['hydro', 'هیدروتراپی'], ['diving', 'سکوی شیرجه'], ['slide', 'سرسره و بازی آبی']]],
    ['wellness', 'سلامت و ریلکسیشن', [['dry_sauna', 'سونا خشک'], ['steam', 'سونا بخار'], ['jacuzzi', 'جکوزی / اسپا'], ['cold_plunge', 'حوضچه آب سرد / یخ'], ['massage', 'ماساژ'], ['salt_room', 'اتاق نمک'], ['relax', 'اتاق ریلکسیشن']]],
    ['guest', 'رفاه مراجعه‌کننده', [['locker', 'رختکن و لاکر'], ['shower', 'دوش'], ['family_change', 'رختکن خانواده'], ['parking', 'پارکینگ'], ['cafe', 'کافی‌شاپ'], ['shop', 'فروشگاه'], ['wifi', 'Wi‑Fi'], ['spectator', 'جایگاه تماشاگر'], ['gym', 'سالن بدنسازی']]],
    ['safety', 'ایمنی و دسترس‌پذیری', [['lifeguard', 'نجات‌غریق مستقر'], ['first_aid', 'کمک‌های اولیه / AED'], ['cctv', 'دوربین مداربسته'], ['water_test', 'کنترل کیفیت آب'], ['wheelchair', 'ورود ویلچر'], ['pool_lift', 'بالابر / رمپ استخر'], ['accessible_change', 'رختکن دسترس‌پذیر']]]
  ];
  const OWNER_POOL_TYPE = ['سرپوشیده', 'روباز', 'چهارفصل', 'آموزشی', 'قهرمانی', 'تفریحی', 'درمانی / هیدروتراپی'];
  const ownerPoolKey = () => { const u = me.get() || {}; return String(u.accountId || u.username || u.name || 'owner'); };
  const ownerPoolStore = {
    key: 'sh_owner_pools',
    all() { try { const value = JSON.parse(localStorage.getItem(this.key) || '[]'); return Array.isArray(value) ? value : []; } catch (e) { return []; } },
    mine() { const key = ownerPoolKey(); return this.all().filter(pool => String(pool.owner_key || '') === key); },
    byId(id) { return this.all().find(pool => String(pool.id) === String(id)); },
    save(list) { localStorage.setItem(this.key, JSON.stringify(list)); },
    upsert(pool) { const list = this.all(); const at = list.findIndex(item => String(item.id) === String(pool.id)); if (at >= 0) list[at] = pool; else list.unshift(pool); this.save(list); return pool; },
    remove(id) { this.save(this.all().filter(pool => String(pool.id) !== String(id))); },
  };
  const amenityLabel = id => OWNER_POOL_AMENITIES.flatMap(group => group[2]).find(item => item[0] === id)?.[1] || id;
  const ownerPoolFeatures = pool => (pool.amenities || []).map(amenityLabel);
  function ownerPoolAsPublic(pool) {
    if (!pool) return null;
    const amenities = pool.amenities || [];
    return { id: pool.id, owner_id: pool.owner_key, name: pool.name, city: pool.city, district: pool.district, kind: pool.kind, gender: pool.gender, olympic: +(pool.competition || false), hydro: +amenities.includes('hydro'), sauna: +amenities.some(item => item === 'dry_sauna' || item === 'steam'), jacuzzi: +amenities.includes('jacuzzi'), parking: +amenities.includes('parking'), wheelchair: +amenities.includes('wheelchair'), kids: +amenities.includes('kids_pool'), temp: pool.water_temp, water_temp: pool.water_temp, lanes: pool.lanes, price_from: pool.price_from, rating: 0, rate_count: 0, open_now: pool.open_now !== false, occupancy: 0, address: pool.address, phone: pool.phone, lat: pool.lat, lng: pool.lng, image: pool.image || '🏊', description: pool.description, features: ownerPoolFeatures(pool), verified: false, owner_pool: true, schedules: pool.schedules || [], coach_roster: pool.coach_roster || [], courses: pool.courses || [], basins: pool.basins || [] };
  }
  function ownerPoolMapUrl(pool) { const lat = Number(pool && pool.lat), lng = Number(pool && pool.lng); return Number.isFinite(lat) && Number.isFinite(lng) ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}` : ''; }
  function ownerPoolMapHtml(pool) {
    const lat = Number(pool && pool.lat), lng = Number(pool && pool.lng); const valid = Number.isFinite(lat) && Number.isFinite(lng);
    if (!valid) return `<div class="op-map-empty">🗺️ مختصات را ثبت کنید تا نقطهٔ استخر روی نقشه نمایش داده شود.</div>`;
    const delta = .012; const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    return `<div class="op-map-frame"><iframe title="نقشه موقعیت استخر" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(lat)}%2C${encodeURIComponent(lng)}"></iframe><a target="_blank" rel="noopener" href="${ownerPoolMapUrl(pool)}">↗ باز کردن نقشه</a></div>`;
  }
  const ownerPoolRowMarkup = (kind, item = {}) => {
    if (kind === 'basin') return `<div class="op-repeat" data-op-row="basin"><button type="button" class="op-row-del" onclick="this.closest('.op-repeat').remove()">×</button><select data-op="type"><option value="lap" ${item.type === 'lap' ? 'selected' : ''}>تمرینی / خطی</option><option value="training" ${item.type === 'training' ? 'selected' : ''}>آموزشی</option><option value="kids" ${item.type === 'kids' ? 'selected' : ''}>کودک</option><option value="warm" ${item.type === 'warm' ? 'selected' : ''}>آب‌گرم</option><option value="hydro" ${item.type === 'hydro' ? 'selected' : ''}>هیدروتراپی</option><option value="diving" ${item.type === 'diving' ? 'selected' : ''}>شیرجه</option></select><input data-op="name" value="${esc(item.name || '')}" placeholder="نام حوضچه / استخر"><input data-op="length" type="number" min="0" value="${esc(item.length || '')}" placeholder="طول (متر)"><input data-op="lanes" type="number" min="0" value="${esc(item.lanes || '')}" placeholder="تعداد خط"><input data-op="depth" value="${esc(item.depth || '')}" placeholder="عمق (مثلاً ۱٫۲ تا ۲ متر)"><input data-op="temperature" type="number" min="0" value="${esc(item.temperature || '')}" placeholder="دمای آب °C"></div>`;
    if (kind === 'coach') return `<div class="op-repeat" data-op-row="coach"><button type="button" class="op-row-del" onclick="this.closest('.op-repeat').remove()">×</button><input data-op="name" value="${esc(item.name || '')}" placeholder="نام مربی / کد پرسنلی"><select data-op="level"><option value="درجه ۳" ${item.level === 'درجه ۳' ? 'selected' : ''}>مربی درجه ۳</option><option value="درجه ۲" ${item.level === 'درجه ۲' ? 'selected' : ''}>مربی درجه ۲</option><option value="درجه ۱" ${item.level === 'درجه ۱' ? 'selected' : ''}>مربی درجه ۱</option><option value="ملی / بین‌المللی" ${item.level === 'ملی / بین‌المللی' ? 'selected' : ''}>ملی / بین‌المللی</option><option value="نجات‌غریق" ${item.level === 'نجات‌غریق' ? 'selected' : ''}>نجات‌غریق</option></select><input data-op="specialty" value="${esc(item.specialty || '')}" placeholder="تخصص (کودک، مسابقه، درمانی…)"/><select data-op="gender"><option value="">جنسیت / همه</option><option value="women" ${item.gender === 'women' ? 'selected' : ''}>خانم</option><option value="men" ${item.gender === 'men' ? 'selected' : ''}>آقا</option></select></div>`;
    if (kind === 'schedule') return `<div class="op-repeat" data-op-row="schedule"><button type="button" class="op-row-del" onclick="this.closest('.op-repeat').remove()">×</button><select data-op="weekday">${WEEKDAYS2.map((day, index) => `<option value="${index}" ${String(item.weekday) === String(index) ? 'selected' : ''}>${day}</option>`).join('')}</select><input data-op="start" type="time" value="${esc(item.start || '')}"><input data-op="end" type="time" value="${esc(item.end || '')}"><select data-op="kind"><option value="عمومی" ${item.kind === 'عمومی' ? 'selected' : ''}>شنای عمومی</option><option value="آموزشی" ${item.kind === 'آموزشی' ? 'selected' : ''}>آموزشی</option><option value="تمرینی" ${item.kind === 'تمرینی' ? 'selected' : ''}>تمرینی / خطی</option><option value="بانوان" ${item.kind === 'بانوان' ? 'selected' : ''}>ویژه بانوان</option><option value="آقایان" ${item.kind === 'آقایان' ? 'selected' : ''}>ویژه آقایان</option><option value="خانوادگی" ${item.kind === 'خانوادگی' ? 'selected' : ''}>خانوادگی</option><option value="درمانی" ${item.kind === 'درمانی' ? 'selected' : ''}>درمانی</option></select><input data-op="capacity" type="number" min="1" value="${esc(item.capacity || '')}" placeholder="ظرفیت"><input data-op="price" type="number" min="0" value="${esc(item.price || '')}" placeholder="قیمت (تومان)"></div>`;
    return `<div class="op-repeat" data-op-row="course"><button type="button" class="op-row-del" onclick="this.closest('.op-repeat').remove()">×</button><input data-op="title" value="${esc(item.title || '')}" placeholder="عنوان دوره"><select data-op="level"><option value="مبتدی" ${item.level === 'مبتدی' ? 'selected' : ''}>مبتدی</option><option value="متوسط" ${item.level === 'متوسط' ? 'selected' : ''}>متوسط</option><option value="پیشرفته" ${item.level === 'پیشرفته' ? 'selected' : ''}>پیشرفته / قهرمانی</option><option value="کودک" ${item.level === 'کودک' ? 'selected' : ''}>کودک</option></select><input data-op="duration" value="${esc(item.duration || '')}" placeholder="مدت (مثلاً ۸ جلسه)"><input data-op="capacity" type="number" min="1" value="${esc(item.capacity || '')}" placeholder="ظرفیت"><input data-op="price" type="number" min="0" value="${esc(item.price || '')}" placeholder="شهریه (تومان)"></div>`;
  };
  window.shOwnerPoolRowAdd = kind => { const box = document.getElementById(`op-${kind}s`); if (box) box.insertAdjacentHTML('beforeend', ownerPoolRowMarkup(kind)); };
  window.shOwnerPoolMapPreview = () => { const lat = document.getElementById('opLat')?.value, lng = document.getElementById('opLng')?.value; const box = document.getElementById('opMapPreview'); if (box) box.innerHTML = ownerPoolMapHtml({ lat, lng }); };
  window.shOwnerPoolUseLocation = () => { if (!navigator.geolocation) { toasglass('مرورگر شما دریافت موقعیت را پشتیبانی نمی‌کند'); return; } navigator.geolocation.getCurrentPosition(position => { const lat = document.getElementById('opLat'), lng = document.getElementById('opLng'); if (lat) lat.value = position.coords.latitude.toFixed(6); if (lng) lng.value = position.coords.longitude.toFixed(6); shOwnerPoolMapPreview(); toasglass('✓ موقعیت فعلی ثبت شد؛ پیش از ذخیره از صحت نقطه مطمئن شوید'); }, () => toasglass('اجازهٔ دسترسی به موقعیت داده نشد')); };
  window.shOwnerPoolCompose = id => { window.__ownerPoolEdit = id || 'new'; shDashTab('venues'); };
  window.shOwnerPoolCancel = () => { window.__ownerPoolEdit = ''; shDashTab('venues'); };
  window.shOwnerPoolDelete = id => { const pool = ownerPoolStore.byId(id); if (!pool || String(pool.owner_key) !== ownerPoolKey()) return; if (!confirm(`«${pool.name}» حذف شود؟`)) return; ownerPoolStore.remove(id); window.__ownerPoolEdit = ''; toasglass('استخر از فهرست شما حذف شد'); shDashTab('venues'); };
  function ownerPoolReadRows(kind, keys) { return [...document.querySelectorAll(`[data-op-row="${kind}"]`)].map(row => Object.fromEntries(keys.map(key => [key, row.querySelector(`[data-op="${key}"]`)?.value || '']))).filter(row => Object.values(row).some(Boolean)); }
  window.shOwnerPoolSave = status => {
    const currentId = window.__ownerPoolEdit; const old = currentId && currentId !== 'new' ? ownerPoolStore.byId(currentId) : null;
    const read = id => document.getElementById(id)?.value.trim() || '';
    const number = id => { const value = read(id).replace(/[٬,]/g, ''); return value === '' ? null : Number(value); };
    const name = read('opName'), city = read('opCity'), address = read('opAddress');
    if (!name || !city || !address) { toasglass('⚠️ نام استخر، شهر و نشانی کامل الزامی است'); return; }
    const amenities = [...document.querySelectorAll('[name="opAmenity"]:checked')].map(input => input.value);
    const pool = { ...(old || {}), id: old?.id || `owner-${Date.now().toString(36)}`, owner_key: ownerPoolKey(), owner_name: (me.get() || {}).name || 'مالک استخر', name, city, district: read('opDistrict'), address, postal_code: read('opPostal'), lat: number('opLat'), lng: number('opLng'), phone: read('opPhone'), website: read('opWebsite'), instagram: read('opInstagram'), image: read('opImage') || '🏊', description: read('opDescription'), kind: read('opKind') || 'سرپوشیده', gender: read('opGender') || 'mixed', open_now: document.getElementById('opOpenNow')?.checked !== false, opening_hours: read('opHours'), price_from: number('opPrice') || 0, water_temp: number('opTemp'), lanes: number('opLanes'), primary_length: number('opLength'), primary_depth: read('opDepth'), competition: document.getElementById('opCompetition')?.checked || false, amenities, rules: read('opRules'), water_quality: read('opWaterQuality'), coach_count: number('opCoachCount') || 0, basins: ownerPoolReadRows('basin', ['type','name','length','lanes','depth','temperature']), coach_roster: ownerPoolReadRows('coach', ['name','level','specialty','gender']), schedules: ownerPoolReadRows('schedule', ['weekday','start','end','kind','capacity','price']), courses: ownerPoolReadRows('course', ['title','level','duration','capacity','price']), status: status === 'pending' ? 'pending' : 'draft', created_at: old?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    pool.coach_count = Math.max(pool.coach_count, pool.coach_roster.length);
    ownerPoolStore.upsert(pool); window.__ownerPoolEdit = ''; toasglass(status === 'pending' ? '📨 اطلاعات استخر برای بررسی و انتشار ارسال شد' : '✓ پیش‌نویس استخر ذخیره شد'); shDashTab('venues');
  };
  const ownerPoolStatus = status => status === 'pending' ? ['در انتظار بررسی', 'pending'] : ['پیش‌نویس', 'draft'];
  function ownerPoolAmenitiesHtml(pool) { const chosen = new Set(pool.amenities || []); return OWNER_POOL_AMENITIES.map(group => `<section class="op-amenity-group"><h4>${esc(group[1])}</h4><div>${group[2].map(([id, label]) => `<label class="op-check"><input type="checkbox" name="opAmenity" value="${id}" ${chosen.has(id) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div></section>`).join(''); }
  function ownerPoolEditorHtml(data) {
    const pool = data || {}; const basins = pool.basins?.length ? pool.basins : [{ type: 'lap' }]; const coaches = pool.coach_roster?.length ? pool.coach_roster : []; const schedules = pool.schedules?.length ? pool.schedules : []; const courses = pool.courses?.length ? pool.courses : [];
    return `<section class="op-editor">
      <div class="op-editor-head"><div><button class="sec-link" onclick="shOwnerPoolCancel()">← بازگشت به استخرهای من</button><h3>${pool.id ? 'ویرایش استخر و مجموعهٔ آبی' : 'ساخت استخر / مجموعهٔ آبی جدید'}</h3><p>هر مجموعه یک پروندهٔ مستقل دارد؛ می‌توانید برای یک حساب، هر تعداد استخر، شعبه یا مرکز آب‌درمانی ثبت و مدیریت کنید.</p></div><span>🏊</span></div>
      <div class="op-section"><div class="op-section-title"><span>۱</span><div><b>هویت، ارتباط و نشانی</b><small>اطلاعاتی که مشتری برای پیدا کردن مجموعه نیاز دارد.</small></div></div><div class="form-grid op-grid"><input id="opName" value="${esc(pool.name || '')}" placeholder="نام استخر / مجموعه *"><select id="opKind">${OWNER_POOL_TYPE.map(type => `<option ${pool.kind === type ? 'selected' : ''}>${type}</option>`).join('')}</select><select id="opGender"><option value="mixed" ${pool.gender === 'mixed' ? 'selected' : ''}>خانوادگی / مختلط</option><option value="women" ${pool.gender === 'women' ? 'selected' : ''}>ویژه بانوان</option><option value="men" ${pool.gender === 'men' ? 'selected' : ''}>ویژه آقایان</option></select><input id="opCity" value="${esc(pool.city || '')}" placeholder="شهر *"><input id="opDistrict" value="${esc(pool.district || '')}" placeholder="منطقه / محله"><input id="opPostal" value="${esc(pool.postal_code || '')}" placeholder="کدپستی"><input id="opAddress" style="grid-column:1/-1" value="${esc(pool.address || '')}" placeholder="نشانی کامل *"><input id="opPhone" value="${esc(pool.phone || '')}" placeholder="تلفن رزرو / پذیرش" dir="ltr"><input id="opWebsite" value="${esc(pool.website || '')}" placeholder="وب‌سایت (اختیاری)" dir="ltr"><input id="opInstagram" value="${esc(pool.instagram || '')}" placeholder="Instagram (اختیاری)" dir="ltr"><input id="opImage" value="${esc(pool.image || '')}" placeholder="ایموجی یا آدرس تصویر کاور (مثلاً 🏊)"><label class="op-inline-check"><input id="opOpenNow" type="checkbox" ${pool.open_now !== false ? 'checked' : ''}> در حال حاضر باز است</label><input id="opHours" style="grid-column:1/-1" value="${esc(pool.opening_hours || '')}" placeholder="ساعت کاری عمومی (مثلاً شنبه تا پنجشنبه، ۶:۰۰ تا ۲۲:۳۰)"></div></div>
      <div class="op-section"><div class="op-section-title"><span>۲</span><div><b>موقعیت دقیق روی نقشه</b><small>مختصات برای مسیریابی، نمایش شعبه و جست‌وجوی نزدیک من استفاده می‌شود.</small></div></div><div class="form-grid op-grid"><input id="opLat" type="number" step="any" value="${esc(pool.lat ?? '')}" placeholder="Latitude / عرض جغرافیایی"><input id="opLng" type="number" step="any" value="${esc(pool.lng ?? '')}" placeholder="Longitude / طول جغرافیایی"><button class="btn btn-ghost" type="button" onclick="shOwnerPoolUseLocation()">⌖ دریافت موقعیت فعلی</button><button class="btn btn-ghost" type="button" onclick="shOwnerPoolMapPreview()">🗺️ پیش‌نمایش نقشه</button></div><div id="opMapPreview">${ownerPoolMapHtml(pool)}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۳</span><div><b>مشخصات استخر اصلی و حوضچه‌ها</b><small>برای رزرو، آموزش، مسابقه و رعایت ظرفیت‌سازی به‌کار می‌رود.</small></div></div><div class="form-grid op-grid"><input id="opLanes" type="number" min="0" value="${esc(pool.lanes ?? '')}" placeholder="تعداد خط استخر اصلی"><input id="opLength" type="number" min="0" value="${esc(pool.primary_length ?? '')}" placeholder="طول استخر اصلی (متر)"><input id="opDepth" value="${esc(pool.primary_depth || '')}" placeholder="بازه عمق (مثلاً ۱٫۲ تا ۲ متر)"><input id="opTemp" type="number" min="0" value="${esc(pool.water_temp ?? '')}" placeholder="دمای آب °C"><input id="opPrice" type="number" min="0" value="${esc(pool.price_from ?? '')}" placeholder="شروع قیمت ورودی (تومان)"><label class="op-inline-check"><input id="opCompetition" type="checkbox" ${pool.competition ? 'checked' : ''}> مناسب مسابقه / تمرین حرفه‌ای</label></div><div class="op-repeat-head"><b>استخرها و حوضچه‌های دیگر</b><button class="btn btn-ghost btn-sm" type="button" onclick="shOwnerPoolRowAdd('basin')">＋ افزودن حوضچه</button></div><div id="op-basins" class="op-repeat-list">${basins.map(item => ownerPoolRowMarkup('basin', item)).join('')}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۴</span><div><b>امکانات کامل مجموعه</b><small>خدمات آبی، سونا، بخار، ماساژ، یخ، رفاهی، ایمنی و دسترس‌پذیری را دقیق انتخاب کنید.</small></div></div><div class="op-amenities">${ownerPoolAmenitiesHtml(pool)}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۵</span><div><b>کادر مربی و کیفیت آموزشی</b><small>تعداد مربی‌ها، سطح حرفه‌ای و تخصصشان را ثبت کنید.</small></div></div><div class="form-grid op-grid"><input id="opCoachCount" type="number" min="0" value="${esc(pool.coach_count ?? '')}" placeholder="تعداد کل مربی و نجات‌غریق"><input id="opWaterQuality" value="${esc(pool.water_quality || '')}" placeholder="کنترل کیفیت آب (مثلاً روزانه / آنلاین)"></div><div class="op-repeat-head"><b>فهرست کادر تخصصی</b><button class="btn btn-ghost btn-sm" type="button" onclick="shOwnerPoolRowAdd('coach')">＋ افزودن مربی</button></div><div id="op-coachs" class="op-repeat-list">${coaches.map(item => ownerPoolRowMarkup('coach', item)).join('') || '<div class="op-empty-inline">هنوز مربی ثبت نشده است؛ تعداد کلی را می‌توانید بالاتر وارد کنید.</div>'}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۶</span><div><b>سانس‌های هفتگی و ظرفیت</b><small>سانس عمومی، بانوان، آقایان، آموزشی، تمرینی و درمانی را جداگانه تعریف کنید.</small></div></div><div class="op-repeat-head"><b>برنامهٔ ثابت هفتگی</b><button class="btn btn-ghost btn-sm" type="button" onclick="shOwnerPoolRowAdd('schedule')">＋ افزودن سانس</button></div><div id="op-schedules" class="op-repeat-list">${schedules.map(item => ownerPoolRowMarkup('schedule', item)).join('') || '<div class="op-empty-inline">سانسی ثبت نشده است.</div>'}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۷</span><div><b>دوره‌ها و کلاس‌ها</b><small>کلاس کودک، بزرگسال، خصوصی، نجات‌غریق، آمادگی مسابقه یا آب‌درمانی را معرفی کنید.</small></div></div><div class="op-repeat-head"><b>دوره‌های قابل ثبت‌نام</b><button class="btn btn-ghost btn-sm" type="button" onclick="shOwnerPoolRowAdd('course')">＋ افزودن دوره</button></div><div id="op-courses" class="op-repeat-list">${courses.map(item => ownerPoolRowMarkup('course', item)).join('') || '<div class="op-empty-inline">دوره‌ای ثبت نشده است.</div>'}</div></div>
      <div class="op-section"><div class="op-section-title"><span>۸</span><div><b>قوانین، ایمنی و معرفی</b><small>برای اعتماد مراجعه‌کننده و کنترل عملیاتی مجموعه.</small></div></div><textarea id="opDescription" rows="3" placeholder="معرفی حرفه‌ای مجموعه، مزیت‌ها و مخاطبان اصلی…">${esc(pool.description || '')}</textarea><textarea id="opRules" rows="3" placeholder="قوانین مهم، شرایط ورود کودک، الزامات سونا/یخ، لغو رزرو و نکات ایمنی…">${esc(pool.rules || '')}</textarea></div>
      <div class="op-save-bar"><div><b>وضعیت انتشار</b><small>پیش‌نویس فقط در پنل شماست؛ ارسال برای بررسی پس از کنترل مدیر قابل انتشار می‌شود.</small></div><div><button class="btn btn-ghost" type="button" onclick="shOwnerPoolSave('draft')">ذخیره پیش‌نویس</button><button class="btn btn-primary" type="button" onclick="shOwnerPoolSave('pending')">📨 ارسال برای بررسی و انتشار</button></div></div>
    </section>`;
  }
  function ownerPoolCardsHtml(pools) { return pools.map(pool => { const status = ownerPoolStatus(pool.status); const facilities = ownerPoolFeatures(pool).slice(0, 5); return `<article class="op-card"><div class="op-card-top"><span class="op-card-icon">${esc(pool.image || '🏊')}</span><div><h3>${esc(pool.name)}</h3><p>📍 ${esc(pool.city)}${pool.district ? '، ' + esc(pool.district) : ''}</p></div><span class="op-status ${status[1]}">${status[0]}</span></div><div class="op-card-stats"><span>🏊 ${toFa(pool.lanes || 0)} خط</span><span>👨‍🏫 ${toFa(Math.max(pool.coach_count || 0, (pool.coach_roster || []).length))} کادر</span><span>🗓️ ${toFa((pool.schedules || []).length)} سانس</span><span>🎓 ${toFa((pool.courses || []).length)} دوره</span></div><div class="op-card-tags">${facilities.map(item => `<span>${esc(item)}</span>`).join('') || '<span>امکانات هنوز تکمیل نشده</span>'}</div><div class="op-card-actions"><button class="btn btn-primary btn-sm" onclick="shOwnerPoolCompose('${esc(pool.id)}')">ویرایش کامل</button><button class="btn btn-ghost btn-sm" onclick="shOwnerPoolCompose('${esc(pool.id)}')">مدیریت سانس‌ها</button><button class="btn btn-danger btn-sm" onclick="shOwnerPoolDelete('${esc(pool.id)}')">حذف</button></div></article>`; }).join(''); }

  /* ---------- کاتالوگ B2B تأمین‌کنندگان استخر ---------- */
  const SUPPLY_PRODUCT_CATEGORIES = ['مواد شیمیایی و تست آب', 'تصفیه و فیلتراسیون', 'پمپ، موتور و سیرکولاسیون', 'دوزینگ و اتوماسیون', 'گرمایش، دیگ و هیت‌پمپ', 'UV، ازن و ضدعفونی مکمل', 'نظافت و ربات استخری', 'لوازم خط، سکوی استارت و مسابقه', 'ایمنی، نجات‌غریق و علائم', 'بالابر و دسترس‌پذیری', 'سونا، بخار، جکوزی و اسپا', 'حوضچه سرد / یخ و ریکاوری', 'رختکن، لاکر و تجهیزات رفاهی', 'روشنایی، کاور و سازه', 'قطعات، شیرآلات و لوله‌کشی'];
  const SUPPLY_SERVICE_CATEGORIES = ['سرویس و نگهداری دوره‌ای', 'آنالیز و بالانس آب', 'تأمین و دوزینگ مواد شیمیایی', 'تعمیر پمپ، فیلتر و موتور', 'تعمیر هیتر، دیگ و هیت‌پمپ', 'نصب و راه‌اندازی تجهیزات', 'نشتی‌یابی و لوله‌کشی', 'بازسازی، کاشی و عایق‌کاری', 'سرویس سونا، بخار و جکوزی', 'سرویس حوضچه سرد / یخ', 'اتوماسیون، سنسور و مانیتورینگ', 'ایمنی، بازرسی و انطباق', 'آموزش پرسنل و نجات‌غریق', 'طراحی، مشاوره و اجرای پروژه', 'فروش عمده و ارسال'];
  const supplyStatus = value => ({ draft: ['پیش‌نویس', 'draft'], pending: ['در انتظار تأیید', 'pending'], ok: ['منتشرشده', 'ok'], rejected: ['نیازمند اصلاح', 'rejected'] }[value] || ['پیش‌نویس', 'draft']);
  const supplierKey = () => { const u = me.get() || {}; return String(u.accountId || u.username || u.name || 'supplier'); };
  const supplierMine = () => (typeof b2bStore === 'undefined' ? [] : b2bStore.get().filter(item => String(item.supplier_key || '') === supplierKey()));
  window.shSupplierCatalogCompose = id => { window.__supplierCatalogEdit = id || 'new'; shDashTab('catalog'); };
  window.shSupplierCatalogCancel = () => { window.__supplierCatalogEdit = ''; shDashTab('catalog'); };
  window.shSupplierCatalogDelete = id => { const all = b2bStore.get(); const item = all.find(x => String(x.id) === String(id)); if (!item || String(item.supplier_key || '') !== supplierKey()) return; if (!confirm(`«${item.title}» حذف شود؟`)) return; b2bStore.set(all.filter(x => String(x.id) !== String(id))); window.__supplierCatalogEdit = ''; toasglass('مورد از کاتالوگ حذف شد'); shDashTab('catalog'); };
  window.shSupplierCatalogImage = async inp => { const file = inp.files && inp.files[0]; if (!file) return; const result = await shImgOpt(file, 'card'); if (!result) return; window.__supplierCatalogImage = result.url; mediaLib.add({ cat: 'supplier-catalog', ref: (me.get() || {}).name || '-', filename: result.filename, fmt: result.fmt, kb: result.kb, w: result.w, h: result.h, url: result.url.slice(0, 220) + '…' }); const preview = document.getElementById('scImgPreview'); if (preview) preview.innerHTML = `<img src="${result.url}" alt="" style="width:100%;height:100%;object-fit:cover">`; };
  window.shSupplierCatalogSave = status => { const oldId = window.__supplierCatalogEdit; const old = oldId && oldId !== 'new' ? b2bStore.get().find(item => String(item.id) === String(oldId)) : null; const read = id => document.getElementById(id)?.value.trim() || ''; const kind = read('scKind') || 'product'; const category = read('scCategory'); const title = read('scTitle'); if (!title || !category) { toasglass('⚠️ نام و دسته‌بندی کالا/خدمت الزامی است'); return; } const suppliedImage = read('scImage'); if (suppliedImage && !isWebpVisualSource(suppliedImage)) { toasglass('⚠️ نشانی تصویر باید WebP باشد؛ برای تبدیل خودکار، فایل را آپلود کنید.'); return; } const u = me.get() || {}; const price = Number(read('scPrice').replace(/[٬,]/g, '')) || 0; const item = { ...(old || {}), id: old?.id || `b2b-${Date.now()}`, supplier_key: supplierKey(), sup: u.name || 'تأمین‌کننده', supplier_city: read('scCity') || u.city || '', kind, title, cat: kind === 'service' ? 'خدمات' : category, subcat: category, brand: read('scBrand'), sku: read('scSku'), price, pricing_mode: read('scPricing') || 'quote', min_order: read('scMinOrder'), stock_status: read('scStock'), lead_time: read('scLeadTime'), warranty: read('scWarranty'), service_area: read('scArea'), service_sla: read('scSla'), tags: read('scTags').split(/[،,]/).map(x => x.trim()).filter(Boolean), specs: read('scSpecs'), desc: read('scDesc'), img: window.__supplierCatalogImage || suppliedImage || old?.img || (kind === 'service' ? '🧰' : '📦'), status: status === 'pending' ? 'pending' : 'draft', at: old?.at || new Date().toISOString(), updated_at: new Date().toISOString() }; const all = b2bStore.get(); const index = all.findIndex(x => String(x.id) === String(item.id)); if (index >= 0) all[index] = item; else all.unshift(item); b2bStore.set(all); window.__supplierCatalogImage = ''; window.__supplierCatalogEdit = ''; toasglass(status === 'pending' ? '📨 کالا/خدمت برای تأیید و انتشار ارسال شد' : '✓ پیش‌نویس کاتالوگ ذخیره شد'); shDashTab('catalog'); };
  function supplierCatalogEditorHtml(source) { const item = source || {}; const type = item.kind || (item.cat === 'خدمات' ? 'service' : 'product'); const categories = type === 'service' ? SUPPLY_SERVICE_CATEGORIES : SUPPLY_PRODUCT_CATEGORIES; return `<section class="sc-editor"><div class="sc-editor-head"><div><button class="sec-link" onclick="shSupplierCatalogCancel()">← بازگشت به کاتالوگ من</button><h3>${item.id ? 'ویرایش کالا / خدمت' : 'ثبت کالا یا خدمت جدید'}</h3><p>اطلاعات دقیق کمک می‌کند مالک استخر سریع‌تر تصمیم بگیرد و درخواست معتبر بفرستد.</p></div><span>${type === 'service' ? '🧰' : '📦'}</span></div><div class="sc-section"><div class="sc-section-title"><span>۱</span><div><b>نوع و معرفی پیشنهاد</b><small>کالا و خدمت در مسیرهای جداگانه برای مالکان استخر نمایش داده می‌شوند.</small></div></div><div class="form-grid sc-grid"><select id="scKind"><option value="product" ${type === 'product' ? 'selected' : ''}>📦 محصول / تجهیزات</option><option value="service" ${type === 'service' ? 'selected' : ''}>🧰 خدمت تخصصی</option></select><select id="scCategory"><optgroup label="محصولات">${SUPPLY_PRODUCT_CATEGORIES.map(category => `<option ${item.subcat === category || (type === 'product' && item.cat === category) ? 'selected' : ''}>${esc(category)}</option>`).join('')}</optgroup><optgroup label="خدمات">${SUPPLY_SERVICE_CATEGORIES.map(category => `<option ${item.subcat === category ? 'selected' : ''}>${esc(category)}</option>`).join('')}</optgroup></select><input id="scTitle" value="${esc(item.title || '')}" placeholder="نام دقیق کالا یا خدمت *"><input id="scBrand" value="${esc(item.brand || '')}" placeholder="برند / سازنده"><input id="scSku" value="${esc(item.sku || '')}" placeholder="مدل یا کد کالا"><input id="scCity" value="${esc(item.supplier_city || (me.get() || {}).city || '')}" placeholder="شهر تأمین‌کننده"></div></div><div class="sc-section"><div class="sc-section-title"><span>۲</span><div><b>قیمت، موجودی و تعهد فروش</b><small>مبلغ به تومان، شرایط تأمین و زمان تحویل را شفاف ثبت کنید.</small></div></div><div class="form-grid sc-grid"><select id="scPricing"><option value="quote" ${item.pricing_mode === 'quote' ? 'selected' : ''}>استعلام قیمت</option><option value="fixed" ${item.pricing_mode === 'fixed' ? 'selected' : ''}>قیمت ثابت</option><option value="contract" ${item.pricing_mode === 'contract' ? 'selected' : ''}>قراردادی</option><option value="subscription" ${item.pricing_mode === 'subscription' ? 'selected' : ''}>اشتراک / دوره‌ای</option></select><input id="scPrice" type="number" min="0" value="${esc(item.price || '')}" placeholder="قیمت پایه (تومان)"><select id="scStock"><option value="in_stock" ${item.stock_status === 'in_stock' ? 'selected' : ''}>موجود</option><option value="preorder" ${item.stock_status === 'preorder' ? 'selected' : ''}>سفارش‌پذیر</option><option value="made_to_order" ${item.stock_status === 'made_to_order' ? 'selected' : ''}>ساخت / اجرای سفارشی</option></select><input id="scMinOrder" value="${esc(item.min_order || '')}" placeholder="حداقل سفارش"><input id="scLeadTime" value="${esc(item.lead_time || '')}" placeholder="زمان تحویل / اجرا"><input id="scWarranty" value="${esc(item.warranty || '')}" placeholder="گارانتی و خدمات پس از فروش"></div></div><div class="sc-section"><div class="sc-section-title"><span>۳</span><div><b>${type === 'service' ? 'دامنه و سطح خدمت' : 'مشخصات فنی و سازگاری'}</b><small>${type === 'service' ? 'محدودهٔ جغرافیایی، زمان پاسخ و مدل قرارداد را روشن کنید.' : 'برای انتخاب درست، ظرفیت، توان، ابعاد، نوع اتصال یا سازگاری را بنویسید.'}</small></div></div><div class="form-grid sc-grid"><input id="scArea" value="${esc(item.service_area || '')}" placeholder="محدوده پوشش / ارسال (مثلاً تهران و البرز)"><input id="scSla" value="${esc(item.service_sla || '')}" placeholder="زمان پاسخ / SLA (مثلاً اعزام ۲۴ ساعته)"><input id="scTags" style="grid-column:1/-1" value="${esc((item.tags || []).join('، '))}" placeholder="برچسب‌ها، با ویرگول جدا کنید (مثلاً کلر، دوزینگ، استخر سرپوشیده)"></div><textarea id="scSpecs" rows="3" placeholder="مشخصات فنی، ظرفیت، استاندارد، اقلام همراه یا جزئیات خدمت…">${esc(item.specs || '')}</textarea><textarea id="scDesc" rows="3" placeholder="توضیح کامل: مسئله‌ای که حل می‌کند، مزیت، شرایط نصب یا نگهداری…">${esc(item.desc || '')}</textarea></div><div class="sc-section"><div class="sc-section-title"><span>۴</span><div><b>تصویر و مدرک بصری</b><small>یک تصویر مناسب انتخاب کنید؛ پروندهٔ آپلودی پیش از ذخیره به WebP تبدیل می‌شود.</small></div></div><div class="sc-image-row"><div id="scImgPreview">${/^data:image|^https?:/.test(item.img || '') ? `<img src="${esc(item.img)}" alt="">` : esc(item.img || (type === 'service' ? '🧰' : '📦'))}</div><label class="btn btn-ghost btn-sm">📤 آپلود تصویر<input type="file" accept="image/*" style="display:none" onchange="shSupplierCatalogImage(this)"></label><input id="scImage" value="${esc(/^data:image/.test(item.img || '') ? '' : item.img || '')}" placeholder="یا ایموجی / نشانی WebP" maxlength="240"></div></div><div class="sc-save"><div><b>انتشار کنترل‌شده</b><small>فقط موارد تأییدشده در کاتالوگ B2B قابل مشاهده برای مالکان استخر خواهند بود.</small></div><div><button class="btn btn-ghost" onclick="shSupplierCatalogSave('draft')">ذخیره پیش‌نویس</button><button class="btn btn-primary" onclick="shSupplierCatalogSave('pending')">📨 ارسال برای تأیید</button></div></div></section>`; }
  function supplierCatalogCards(items) { return items.map(item => { const state = supplyStatus(item.status); const isService = item.kind === 'service' || item.cat === 'خدمات'; const image = /^data:image|^https?:/.test(item.img || '') ? `<img src="${esc(item.img)}" alt="">` : esc(item.img || (isService ? '🧰' : '📦')); return `<article class="sc-card"><div class="sc-card-image">${image}</div><div class="sc-card-main"><div class="sc-card-top"><span class="sc-kind">${isService ? 'خدمت' : 'محصول'}</span><span class="sc-status ${state[1]}">${state[0]}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.subcat || item.cat || '')}${item.brand ? ' · ' + esc(item.brand) : ''}</p><div class="sc-meta"><span>💰 ${item.pricing_mode === 'quote' || !item.price ? 'استعلام' : money(item.price)}</span><span>📍 ${esc(item.service_area || item.supplier_city || '—')}</span></div><div class="sc-card-actions"><button class="btn btn-primary btn-sm" onclick="shSupplierCatalogCompose('${esc(item.id)}')">ویرایش</button><button class="btn btn-danger btn-sm" onclick="shSupplierCatalogDelete('${esc(item.id)}')">حذف</button></div></div></article>`; }).join(''); }

  /* ============================================================
     داشبورد SPA — پوسته (سایدبار راست) ثابت، فقط کادر چپ تعویض می‌شود
     ============================================================ */
  const presenceStore = {
    key: 'sh_presence', dirKey: 'sh_presence_directory',
    get() { const v = localStorage.getItem(this.key); return v === 'offline' ? 'offline' : 'online'; },
    directory() { try { return JSON.parse(localStorage.getItem(this.dirKey) || '{}'); } catch (e) { return {}; } },
    forName(name) { return this.directory()[name || '']; },
    set(v) { const state = v === 'offline' ? 'offline' : 'online'; localStorage.setItem(this.key, state); const u = me.get(); if (u) { u.presence = state; me.set(u); const d = this.directory(); d[u.name || ''] = state; localStorage.setItem(this.dirKey, JSON.stringify(d)); } },
  };
  function incomingCount(tid) { return cloudChatEnabled() ? Math.max(0, Number(cloudChat.unread[tid] || 0)) : chatMsgs(tid).filter(m => !m.me).length; }
  function chatUnreadFor(tid, map) { if (cloudChatEnabled()) return Math.max(0, Number(cloudChat.unread[tid] || 0)); const reads = map || (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })(); return Math.max(0, incomingCount(tid) - Math.min(incomingCount(tid), reads[tid] || 0)); }
  function chatTotalUnread() { const map = (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })(); return chatStore.peers().reduce((n, p) => n + chatUnreadFor(p.id, map), 0); }
  function isPeerOnline(peer) {
    if (!peer) return false; const explicit = presenceStore.forName(peer.name); if (explicit) return explicit === 'online';
    const id = String(peer.id || '');
    if (id.startsWith('coach:')) { const c = Coaches.find(x => String(x.id) === id.slice(6)); return !!(c && c.online); }
    if (id.startsWith('pool:')) { const p = Pools.find(x => String(x.id) === id.slice(5)); return !!(p && p.open_now); }
    return true;
  }
  function syncChatUnreadUi() {
    const total = chatTotalUnread();
    document.querySelectorAll('[data-chat-unread]').forEach(el => { el.textContent = toFa(total); el.style.display = total ? '' : 'none'; });
    const headBadge = document.getElementById('tgpTotalBadge'); if (headBadge) { headBadge.textContent = toFa(total); headBadge.style.display = total ? 'grid' : 'none'; }
    const headText = document.getElementById('tgpTotalText'); if (headText) headText.textContent = total ? toFa(total) + ' پیام خوانده‌نشده' : 'همه‌ی پیام‌ها خوانده شده';
  }
  window.shSetPresence = function (value) {
    presenceStore.set(value); const now = presenceStore.get();
    document.querySelectorAll('[data-presence]').forEach(b => b.classList.toggle('on', b.dataset.presence === now));
    document.querySelectorAll('[data-presence-label]').forEach(x => x.textContent = now === 'online' ? 'آنلاین' : 'آفلاین');
    document.querySelectorAll('[data-sidebar-presence]').forEach(x => { x.classList.toggle('offline', now !== 'online'); x.innerHTML = '<i></i>' + (now === 'online' ? 'سیستم آنلاین' : 'سیستم آفلاین'); });
    document.querySelectorAll('[data-mobile-presence]').forEach(x => { x.classList.toggle('offline', now !== 'online'); x.innerHTML = '<i></i>سیستم ' + (now === 'online' ? 'آنلاین' : 'آفلاین'); });
    toasglass(now === 'online' ? '🟢 وضعیت شما برای دیگران «آنلاین» شد' : '⚪ وضعیت شما برای دیگران «آفلاین» شد');
  };
  const supportState = { loaded:false, loading:false, polling:false, timer:0, signature:'', pendingRender:false, tickets:[], open:'', thread:[], attachments:[], settings:null, meta:{admins:[],macros:[],knowledge:[],workflows:[]}, reports:null, adminTab:'queue', filter:'action', query:'' };
  function supportAdminActionCount(){ return supportState.tickets.filter(t => ['new','waiting_admin'].includes(t.status)).length; }
  function supportMemberUnread(){ return supportState.tickets.reduce((n,t) => n + Math.max(0,Number(t.member_unread_count||0)),0); }
  function supportTicketSignature(tickets){ return (tickets||[]).map(t=>[t.id,t.status,t.priority,t.last_message_at,t.updated_at,t.admin_unread_count||0,t.member_unread_count||0,t.assigned_profile_id||''].join(':')).join('|'); }
  function supportIsTyping(){ const el=document.activeElement; return !!(el&&el.closest&&el.closest('.support-compose,.support-intake,.support-editor,.support-admin-tools')); }
  function supportViewActive(){ return document.body.dataset.page==='console' ? window.__adminView==='support' : document.body.dataset.page==='dashboard'&&window.__dashTab==='inbox'; }
  function syncSupportLiveUi(){
    const adminCount=supportAdminActionCount(),memberCount=supportMemberUnread();
    document.querySelectorAll('[data-support-action]').forEach(el=>{el.textContent=toFa(adminCount);el.style.display=adminCount?'':'none'});document.querySelectorAll('[data-support-action-group]').forEach(el=>{const total=adminCount+Math.max(0,Number(el.dataset.baseCount||0));el.textContent=toFa(total);el.style.display=total&&el.dataset.groupOpen!=='1'?'':'none'});
    document.querySelectorAll('[data-support-unread]').forEach(el=>{el.textContent=toFa(memberCount);el.style.display=memberCount?'':'none'});
    const bell=document.getElementById('bellBadge');if(bell&&me.get()&&(me.get()||{}).u!=='admin'){bell.textContent=toFa(memberCount);bell.style.display=memberCount?'flex':'none'}
  }
  async function refreshSupportOpen(silent){
    if(!supportState.open||!window.SH_CLOUD_AUTH||!window.SH_CLOUD_AUTH.getSupportThread)return;
    try{const out=await window.SH_CLOUD_AUTH.getSupportThread(supportState.open);supportState.thread=out.messages||[];supportState.attachments=out.attachments||[];const i=supportState.tickets.findIndex(t=>t.id===supportState.open);if(i>=0)supportState.tickets[i]={...supportState.tickets[i],...(out.ticket||{})};supportState.signature=supportTicketSignature(supportState.tickets);syncSupportLiveUi();if(!silent&&!supportIsTyping())supportRerender()}
    catch(e){if(!silent)toasglass('⚠️ دریافت گفتگو ناموفق بود: '+e.message)}
  }
  async function pollSupport(initial){
    const cloud=window.SH_CLOUD_AUTH;if(!cloud||!cloud.active||!cloud.getSupportTickets||supportState.polling||document.hidden)return;supportState.polling=true;
    try{const oldAdmin=supportAdminActionCount(),oldMember=supportMemberUnread(),oldById=new Map(supportState.tickets.map(t=>[t.id,t]));const out=await cloud.getSupportTickets(),tickets=out.tickets||[],signature=supportTicketSignature(tickets),changed=signature!==supportState.signature;supportState.tickets=tickets;supportState.loaded=true;supportState.signature=signature;syncSupportLiveUi();if(initial)return;if((me.get()||{}).u==='admin'&&supportAdminActionCount()>oldAdmin)toasglass('🎧 درخواست تازه‌ای نیازمند پاسخ است');if((me.get()||{}).u!=='admin'&&supportMemberUnread()>oldMember)toasglass('🎧 پاسخ جدیدی از پشتیبانی دریافت کردید');if(changed&&supportViewActive()){const previous=oldById.get(supportState.open),current=tickets.find(t=>t.id===supportState.open),threadChanged=!!(current&&(!previous||current.last_message_at!==previous.last_message_at||current.member_unread_count||current.admin_unread_count));if(supportIsTyping())supportState.pendingRender=true;else if(threadChanged)await refreshSupportOpen(false);else supportRerender()}}
    catch(e){console.warn('support live sync:',e.message)}finally{supportState.polling=false}
  }
  function startSupportPolling(){clearInterval(supportState.timer);pollSupport(true);supportState.timer=setInterval(()=>pollSupport(false),7000)}
  window.addEventListener('focus',()=>pollSupport(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollSupport(false)});
  document.addEventListener('focusout',()=>setTimeout(()=>{if(supportState.pendingRender&&!supportIsTyping()){supportState.pendingRender=false;if(supportState.open)refreshSupportOpen(false);else supportRerender()}},80));
  const SUPPORT_STATUS = { intake:'در حال تکمیل', ai_handling:'پاسخ دستیار', new:'جدید', waiting_admin:'منتظر پشتیبانی', in_progress:'در حال بررسی', waiting_user:'منتظر پاسخ عضو', resolved:'حل‌شده', closed:'بسته', spam:'هرزنامه' };
  const SUPPORT_TOPIC = { account:'حساب و ورود', booking:'رزرو و پرداخت', pool:'استخر و سانس', coach:'مربی و آموزش', marketplace:'خرید و آگهی', public_page:'صفحه عمومی', technical:'مشکل فنی', other:'سایر' };
  const SUPPORT_ISSUES = { account:['ورود به حساب','تغییر اطلاعات حساب','تأیید حساب','دسترسی پنل'], booking:['پرداخت ناموفق','رزرو ثبت نشده','لغو یا بازپرداخت','بلیت و کد رزرو'], pool:['اطلاعات استخر','سانس و ظرفیت','ثبت یا مدیریت استخر'], coach:['پروفایل مربی','دوره آموزشی','رزومه مربی'], marketplace:['ثبت آگهی','خرید و سفارش','فروشنده یا تأمین‌کننده'], public_page:['ساخت صفحه','انتشار و تأیید','ویرایش محتوا','اشتراک‌گذاری'], technical:['خطای صفحه','نمایش موبایل','کندی یا قطعی','گزارش باگ'], other:['پرسش عمومی','پیشنهاد','گزارش تخلف','موضوع دیگر'] };
  const SUPPORT_ROLES = { customer:'کاربر',pool:'استخر',coach:'مربی',hydro:'هیدروتراپی',store:'فروشگاه',company:'شرکت',academy:'آکادمی',lifeguard:'نجات‌غریق' };
  const supportNonce = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,'');
  function supportRerender(){ if(document.body.dataset.page==='console') pages.console(); else if(document.body.dataset.page==='dashboard') shDashTab('inbox'); }
  function supportFileData(file){ return new Promise((resolve,reject)=>{ if(!file)return resolve(null); if(file.size>5242880)return reject(new Error('حداکثر حجم فایل ۵ مگابایت است')); const type=String(file.type||''); const allowed=['image/png','image/jpeg','image/webp','image/gif','image/bmp','image/avif','application/pdf','text/plain'];if(!allowed.includes(type))return reject(new Error('فرمت فایل مجاز نیست'));
    // پیوست‌های تصویری هم مثل بقیهٔ ورودی‌های سایت به WebP فشرده تبدیل می‌شوند؛
    // PDF و متن بدون تغییر می‌مانند.
    if(type.startsWith('image/')&&type!=='image/svg+xml'&&window.SH_WEBP){window.SH_WEBP.convert(file,{preset:'card'}).then(out=>resolve({name:out.filename,data:out.url})).catch(e=>reject(new Error(e&&e.message||'فشرده‌سازی تصویر ناموفق بود')));return;}
    const r=new FileReader();r.onload=()=>resolve({name:file.name,data:r.result});r.onerror=()=>reject(new Error('خواندن فایل ناموفق بود'));r.readAsDataURL(file); }); }
  async function hydrateSupport(force){
    const cloud=window.SH_CLOUD_AUTH;if(!cloud||!cloud.active||!cloud.getSupportTickets||supportState.loading||(supportState.loaded&&!force))return;supportState.loading=true;
    try{const admin=(me.get()||{}).u==='admin';const jobs=[cloud.getSupportTickets()];if(admin&&cloud.getMessagingSettings)jobs.push(cloud.getMessagingSettings());if(admin&&cloud.getSupportAdminBundle)jobs.push(cloud.getSupportAdminBundle());if(admin&&cloud.getSupportReports)jobs.push(cloud.getSupportReports());const out=await Promise.all(jobs);supportState.tickets=out[0].tickets||[];supportState.signature=supportTicketSignature(supportState.tickets);supportState.loaded=true;syncSupportLiveUi();if(admin){supportState.settings=(out[1]||{}).settings||supportState.settings;supportState.meta=out[2]||supportState.meta;supportState.reports=out[3]||supportState.reports}if(supportState.open&&!supportState.tickets.some(t=>t.id===supportState.open))supportState.open='';supportRerender()}
    catch(e){toasglass('⚠️ دریافت مرکز پشتیبانی ناموفق بود: '+e.message)}finally{supportState.loading=false}
  }
  window.shSupportOpen=async id=>{supportState.open=id;supportState.thread=[];supportState.attachments=[];window.__supportCompose=false;supportRerender();await refreshSupportOpen(false)};
  window.shSupportNew=open=>{window.__supportCompose=open!==false;supportRerender()};
  window.shSupportTopic=topic=>{const el=document.getElementById('supportIssue');if(el)el.innerHTML='<option value="">انتخاب کنید…</option>'+((SUPPORT_ISSUES[topic]||SUPPORT_ISSUES.other).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join(''))};
  window.shSupportCreate=async()=>{const val=id=>((document.getElementById(id)||{}).value||'').trim(),topic=val('supportTopic'),issue=val('supportIssue'),urgency=val('supportUrgency'),description=val('supportDescription'),fileEl=document.getElementById('supportNewFile');if(!topic||!issue||!description){toasglass('موضوع، نوع مشکل و توضیحات را کامل کنید');return}try{const file=await supportFileData(fileEl&&fileEl.files&&fileEl.files[0]);const out=await window.SH_CLOUD_AUTH.createSupportTicket({topic,subject:issue,description,priority:urgency,intake:{topic,issue,urgency},context:{page:location.href,user_agent:navigator.userAgent,viewport:innerWidth+'x'+innerHeight,language:navigator.language},client_nonce:supportNonce()});if(file)await window.SH_CLOUD_AUTH.uploadSupportAttachment(out.ticket.id,file.name,file.data,out.message&&out.message.id);window.__supportCompose=false;supportState.loaded=false;await hydrateSupport(true);await window.shSupportOpen(out.ticket.id);toasglass('✓ درخواست ثبت و توسط دستیار بررسی شد')}catch(e){toasglass('⚠️ ثبت درخواست ناموفق بود: '+e.message)}};
  window.shSupportReply=async internal=>{const input=document.getElementById(internal?'supportNote':'supportReply'),fileEl=document.getElementById('supportReplyFile'),selectedFile=((fileEl||{}).files||[])[0],body=(input&&input.value.trim())||(selectedFile?'پیوست ارسال شد.':'');if(!body)return;if(!supportState.open)return;input.disabled=true;try{let message=null;if(body){const out=await window.SH_CLOUD_AUTH.replySupportTicket(supportState.open,body,supportNonce(),internal===true);message=out.message}const file=await supportFileData(fileEl&&fileEl.files&&fileEl.files[0]);if(file)await window.SH_CLOUD_AUTH.uploadSupportAttachment(supportState.open,file.name,file.data,message&&message.id);if(!internal&&window.__supportMacro){const m=window.__supportMacro;const patch={};if(m.set_priority)patch.priority=m.set_priority;if(m.set_status)patch.status=m.set_status;if(Object.keys(patch).length)await window.SH_CLOUD_AUTH.updateSupportTicket(supportState.open,patch);window.__supportMacro=null}input.value='';if(fileEl)fileEl.value='';await hydrateSupport(true);await window.shSupportOpen(supportState.open)}catch(e){toasglass('⚠️ ارسال ناموفق بود: '+e.message)}finally{if(input.isConnected)input.disabled=false}};
  window.shSupportOutcome=async solved=>{try{await window.SH_CLOUD_AUTH.setSupportOutcome(supportState.open,solved);await hydrateSupport(true);await window.shSupportOpen(supportState.open);toasglass(solved?'✓ درخواست حل‌شده ثبت شد':'✓ به پشتیبان انسانی منتقل شد')}catch(e){toasglass('⚠️ ثبت نتیجه ناموفق بود: '+e.message)}};
  window.shSupportRate=async rating=>{try{await window.SH_CLOUD_AUTH.rateSupportTicket(supportState.open,rating,'');await hydrateSupport(true);toasglass('از بازخورد شما ممنونیم')}catch(e){toasglass('⚠️ ثبت امتیاز ناموفق بود')}};
  window.shSupportUpdate=async(field,value)=>{if(!supportState.open)return;try{await window.SH_CLOUD_AUTH.updateSupportTicket(supportState.open,{[field]:value});await hydrateSupport(true);await window.shSupportOpen(supportState.open);toasglass('✓ درخواست به‌روزرسانی شد')}catch(e){toasglass('⚠️ به‌روزرسانی ناموفق بود: '+e.message)}};
  window.shSupportAssign=value=>shSupportUpdate('assigned_profile_id',value);
  window.shSupportMacro=id=>{const m=supportState.meta.macros.find(x=>x.id===id);if(!m)return;window.__supportMacro=m;const input=document.getElementById('supportReply');if(input)input.value=m.body};
  window.shSupportAdminTab=tab=>{supportState.adminTab=tab;supportRerender()};
  window.shSupportFilter=(filter,q)=>{if(filter!==undefined)supportState.filter=filter;if(q!==undefined)supportState.query=q;supportRerender()};
  window.shMessagingMode=async mode=>{try{const roles=mode==='restricted'?(supportState.settings.allowed_roles||[]):[];const out=await window.SH_CLOUD_AUTH.setMessagingSettings(mode,roles);supportState.settings=out.settings;supportRerender();toasglass('✓ سیاست پیام‌رسان ذخیره شد')}catch(e){toasglass('⚠️ ذخیره سیاست ناموفق بود: '+e.message)}};
  window.shMessagingRole=async(role,checked)=>{const roles=new Set((supportState.settings||{}).allowed_roles||[]);checked?roles.add(role):roles.delete(role);try{const out=await window.SH_CLOUD_AUTH.setMessagingSettings('restricted',[...roles]);supportState.settings=out.settings;supportRerender()}catch(e){toasglass('⚠️ ذخیره نقش ناموفق بود')}};
  window.shKnowledgeEdit=id=>{window.__kbEdit=id?supportState.meta.knowledge.find(x=>x.id===id):null;supportRerender()};
  window.shKnowledgeSave=async()=>{const val=id=>((document.getElementById(id)||{}).value||'').trim(),old=window.__kbEdit||{};try{await window.SH_CLOUD_AUTH.saveSupportKnowledge({id:old.id,title:val('kbTitle'),topic:val('kbTopic'),question:val('kbQuestion'),answer:val('kbAnswer'),keywords:val('kbKeywords').split(/[,،]/).map(x=>x.trim()).filter(Boolean),status:val('kbStatus')});window.__kbEdit=null;supportState.loaded=false;await hydrateSupport(true);toasglass('✓ مقاله دانش ذخیره شد')}catch(e){toasglass('⚠️ ذخیره مقاله ناموفق بود: '+e.message)}};
  window.shMacroEdit=id=>{window.__macroEdit=id?supportState.meta.macros.find(x=>x.id===id):null;supportRerender()};
  window.shMacroSave=async()=>{const val=id=>((document.getElementById(id)||{}).value||'').trim(),old=window.__macroEdit||{};try{await window.SH_CLOUD_AUTH.saveSupportMacro({id:old.id,title:val('macroTitle'),body:val('macroBody'),set_status:val('macroStatus')||null});window.__macroEdit=null;supportState.loaded=false;await hydrateSupport(true);toasglass('✓ ماکرو ذخیره شد')}catch(e){toasglass('⚠️ ذخیره ماکرو ناموفق بود: '+e.message)}};
  function supportAttachmentHtml(messageId){const files=supportState.attachments.filter(f=>(f.message_id||null)===(messageId||null));return files.map(f=>`<a class="support-file" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.file_name)} <small>${toFa(Math.ceil(f.byte_size/1024))} KB</small></a>`).join('')}
  function supportMessagesHtml(admin){if(!supportState.open)return'<div class="support-empty"><span>🎧</span><b>یک درخواست را انتخاب کنید</b><p>متن کامل، اطلاعات و پیوست‌ها اینجا نمایش داده می‌شود.</p></div>';if(!supportState.thread.length)return'<div class="support-empty"><span>◌</span><b>در حال دریافت گفتگو…</b></div>';return`<div class="support-thread">${supportState.thread.map(m=>`<div class="support-msg ${m.me?'mine':''} ${m.internal?'note':''}"><small>${m.internal?'یادداشت داخلی':m.sender_kind==='admin'?'پشتیبانی':m.sender_kind==='assistant'?'دستیار هوشمند':m.sender_kind==='system'?'سیستم':'عضو'}</small><p>${esc(m.body)}</p>${supportAttachmentHtml(m.id)}<time>${new Date(m.at).toLocaleString('fa-IR')}</time></div>`).join('')}${supportAttachmentHtml(null)}</div>`}
  function supportOutcomeHtml(open){const last=supportState.thread.slice().reverse().find(m=>m.sender_kind==='assistant'&&m.metadata&&m.metadata.asks_solved);if(open&&open.status==='ai_handling'&&last)return'<div class="support-outcome"><b>آیا مشکل شما حل شد؟</b><button class="btn btn-primary btn-sm" onclick="shSupportOutcome(true)">بله، حل شد</button><button class="btn btn-ghost btn-sm" onclick="shSupportOutcome(false)">خیر، اتصال به پشتیبان</button></div>';if(open&&['resolved','closed'].includes(open.status)&&!open.satisfaction)return`<div class="support-outcome"><b>از پاسخ‌گویی راضی بودید؟</b>${[1,2,3,4,5].map(x=>`<button class="support-star" onclick="shSupportRate(${x})">★</button>`).join('')}</div>`;return''}
  function memberSupportHtml(){const tickets=supportState.tickets,open=tickets.find(t=>t.id===supportState.open),composing=window.__supportCompose||(!tickets.length&&supportState.loaded);if(!supportState.loaded&&!supportState.loading)setTimeout(()=>hydrateSupport(),0);return`<div class="support-member"><aside class="support-cases"><button class="btn btn-primary btn-block" onclick="shSupportNew(true)">＋ درخواست جدید</button>${!supportState.loaded?'<div class="support-loading">در حال اتصال…</div>':tickets.map(t=>`<button class="support-case ${supportState.open===t.id?'on':''} ${Number(t.member_unread_count||0)?'unread':''}" onclick="shSupportOpen('${t.id}')"><b>#${toFa(t.ticket_no)} · ${esc(t.subject)}</b><span>${SUPPORT_STATUS[t.status]||t.status} · ${SUPPORT_TOPIC[t.topic]||t.topic}</span><time>${new Date(t.last_message_at).toLocaleDateString('fa-IR')}</time></button>`).join('')||'<div class="support-loading">هنوز درخواستی ندارید.</div>'}</aside><section class="support-main">${composing?`<div class="support-intake"><span class="support-kicker">دستیار هوشمند پشتیبانی</span><h3>چه کمکی از دست ما برمی‌آید؟</h3><p>اطلاعات را کامل کنید؛ دستیار فقط از پایگاه دانش تأییدشده پاسخ می‌دهد و در غیر این صورت درخواست را به انسان تحویل می‌دهد.</p><div class="support-fields"><label>موضوع<select id="supportTopic" onchange="shSupportTopic(this.value)"><option value="">انتخاب کنید…</option>${Object.entries(SUPPORT_TOPIC).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>نوع مشکل<select id="supportIssue"><option value="">ابتدا موضوع را انتخاب کنید…</option></select></label><label>میزان فوریت<select id="supportUrgency"><option value="normal">عادی</option><option value="high">مهم</option><option value="urgent">فوری — سرویس قابل استفاده نیست</option><option value="low">کم</option></select></label><label>پیوست اختیاری<input id="supportNewFile" type="file" accept="image/*,application/pdf,text/plain"><small>حداکثر ۵ مگابایت</small></label><label class="wide">توضیحات<textarea id="supportDescription" rows="5" placeholder="چه اتفاقی افتاد و انتظار داشتید چه شود؟"></textarea></label></div><div class="support-actions"><button class="btn btn-primary" onclick="shSupportCreate()">بررسی و ارسال</button>${tickets.length?'<button class="btn btn-ghost" onclick="shSupportNew(false)">انصراف</button>':''}</div></div>`:`<header class="support-head"><div><span>#${toFa(open?.ticket_no||'')}</span><h3>${esc(open?.subject||'درخواست پشتیبانی')}</h3><p>${SUPPORT_TOPIC[open?.topic]||''} · ${SUPPORT_STATUS[open?.status]||''}</p></div><i class="support-priority ${open?.priority}">${open?.priority==='urgent'?'فوری':open?.priority==='high'?'مهم':'عادی'}</i></header>${supportMessagesHtml(false)}${supportOutcomeHtml(open)}<div class="support-compose"><textarea id="supportReply" rows="2" placeholder="پاسخ خود را بنویسید…"></textarea><label class="support-attach">📎<input id="supportReplyFile" type="file" accept="image/*,application/pdf,text/plain"></label><button class="btn btn-primary" onclick="shSupportReply(false)">ارسال</button></div>`}</section></div>`}
  function supportQueueHtml(){const q=supportState.query.trim().toLowerCase(),filtered=supportState.tickets.filter(t=>(supportState.filter==='all'||supportState.filter==='action'&&['new','waiting_admin'].includes(t.status)||supportState.filter==='open'&&!['resolved','closed','spam'].includes(t.status)||t.status===supportState.filter)&&(!q||(`${t.subject} ${(t.requester||{}).name||''} ${t.ticket_no}`).toLowerCase().includes(q))),open=supportState.tickets.find(t=>t.id===supportState.open);return`<div class="support-admin-tools"><select onchange="shSupportFilter(this.value,undefined)"><option value="action" ${supportState.filter==='action'?'selected':''}>نیازمند پاسخ</option><option value="open" ${supportState.filter==='open'?'selected':''}>همه بازها</option><option value="all" ${supportState.filter==='all'?'selected':''}>همه</option>${Object.entries(SUPPORT_STATUS).map(([v,l])=>`<option value="${v}" ${supportState.filter===v?'selected':''}>${l}</option>`).join('')}</select><input value="${esc(supportState.query)}" placeholder="جستجو شماره، عضو یا عنوان…" onchange="shSupportFilter(undefined,this.value)"></div><div class="support-admin"><aside class="support-cases">${filtered.map(t=>`<button class="support-case ${supportState.open===t.id?'on':''} ${Number(t.admin_unread_count||0)?'unread':''}" onclick="shSupportOpen('${t.id}')"><b>#${toFa(t.ticket_no)} · ${esc(t.subject)}</b><span>${esc((t.requester||{}).name||'عضو')} · ${SUPPORT_STATUS[t.status]||t.status}</span><time>${new Date(t.last_message_at).toLocaleString('fa-IR')}</time></button>`).join('')||'<div class="support-loading">موردی در این فیلتر نیست.</div>'}</aside><section class="support-main">${!open?supportMessagesHtml(true):`<header class="support-head"><div><span>#${toFa(open.ticket_no)} · ${esc((open.requester||{}).name||'عضو')}</span><h3>${esc(open.subject)}</h3><p>${SUPPORT_TOPIC[open.topic]||open.topic}</p></div><div class="support-controls"><select onchange="shSupportAssign(this.value)"><option value="">بدون مسئول</option>${supportState.meta.admins.map(a=>`<option value="${a.id}" ${open.assigned_profile_id===a.id?'selected':''}>${esc(a.full_name)}</option>`).join('')}</select><select onchange="shSupportUpdate('priority',this.value)">${[['low','کم'],['normal','عادی'],['high','مهم'],['urgent','فوری']].map(([v,l])=>`<option value="${v}" ${open.priority===v?'selected':''}>${l}</option>`).join('')}</select><select onchange="shSupportUpdate('status',this.value)">${Object.entries(SUPPORT_STATUS).map(([v,l])=>`<option value="${v}" ${open.status===v?'selected':''}>${l}</option>`).join('')}</select></div></header><div class="support-context"><b>اطلاعات کامل</b><span>موضوع: ${SUPPORT_TOPIC[open.topic]||open.topic}</span><span>نقش: ${esc((open.requester||{}).role||'—')}</span><span>شهر: ${esc((open.requester||{}).city||'—')}</span><span>اطمینان AI: ${toFa(Math.round((open.ai_confidence||0)*100))}٪</span><span>صفحه: ${esc((open.context||{}).page||'—')}</span><span>نمایشگر: ${esc((open.context||{}).viewport||'—')}</span><span>زبان: ${esc((open.context||{}).language||'—')}</span><span class="support-agent">مرورگر: ${esc((open.context||{}).user_agent||'—')}</span><p>${esc(open.ai_summary||'')}</p></div>${supportMessagesHtml(true)}<div class="support-compose"><select onchange="shSupportMacro(this.value)"><option value="">انتخاب ماکرو…</option>${supportState.meta.macros.map(m=>`<option value="${m.id}">${esc(m.title)}</option>`).join('')}</select><textarea id="supportReply" rows="2" placeholder="پاسخ به عضو…"></textarea><label class="support-attach">📎<input id="supportReplyFile" type="file" accept="image/*,application/pdf,text/plain"></label><button class="btn btn-primary" onclick="shSupportReply(false)">ارسال</button><textarea id="supportNote" rows="2" placeholder="یادداشت داخلی…"></textarea><button class="btn btn-ghost" onclick="shSupportReply(true)">ثبت یادداشت</button></div>`}</section></div>`}
  function supportKnowledgeHtml(){const edit=window.__kbEdit||{};return`<div class="support-admin-grid"><section class="panel support-editor"><h3>${edit.id?'ویرایش':'مقاله جدید'}</h3><input id="kbTitle" value="${esc(edit.title||'')}" placeholder="عنوان"><select id="kbTopic">${Object.entries(SUPPORT_TOPIC).map(([v,l])=>`<option value="${v}" ${edit.topic===v?'selected':''}>${l}</option>`).join('')}</select><textarea id="kbQuestion" rows="2" placeholder="پرسش یا مسئله">${esc(edit.question||'')}</textarea><textarea id="kbAnswer" rows="7" placeholder="پاسخ تأییدشده">${esc(edit.answer||'')}</textarea><input id="kbKeywords" value="${esc((edit.keywords||[]).join('، '))}" placeholder="کلیدواژه‌ها با ویرگول"><select id="kbStatus"><option value="draft" ${edit.status==='draft'?'selected':''}>پیش‌نویس</option><option value="approved" ${edit.status==='approved'?'selected':''}>تأییدشده و قابل استفاده AI</option><option value="archived" ${edit.status==='archived'?'selected':''}>بایگانی</option></select><button class="btn btn-primary" onclick="shKnowledgeSave()">ذخیره مقاله</button></section><section class="support-kb-list">${supportState.meta.knowledge.map(a=>`<button onclick="shKnowledgeEdit('${a.id}')"><b>${esc(a.title)}</b><span>${SUPPORT_TOPIC[a.topic]||a.topic} · ${a.status==='approved'?'تأییدشده':a.status==='draft'?'پیش‌نویس':'بایگانی'}</span><p>${esc(a.question)}</p></button>`).join('')||'<div class="support-loading">پایگاه دانش خالی است.</div>'}</section></div>`}
  function supportMacrosHtml(){const edit=window.__macroEdit||{};return`<div class="support-admin-grid"><section class="panel support-editor"><h3>${edit.id?'ویرایش':'ماکروی جدید'}</h3><input id="macroTitle" value="${esc(edit.title||'')}" placeholder="عنوان"><textarea id="macroBody" rows="7" placeholder="متن آماده">${esc(edit.body||'')}</textarea><select id="macroStatus"><option value="">بدون تغییر وضعیت</option>${Object.entries(SUPPORT_STATUS).filter(([v])=>!['intake','ai_handling','spam'].includes(v)).map(([v,l])=>`<option value="${v}" ${edit.set_status===v?'selected':''}>${l}</option>`).join('')}</select><button class="btn btn-primary" onclick="shMacroSave()">ذخیره ماکرو</button></section><section class="support-kb-list">${supportState.meta.macros.map(m=>`<button onclick="shMacroEdit('${m.id}')"><b>${esc(m.title)}</b><span>${m.set_status?SUPPORT_STATUS[m.set_status]:'بدون تغییر وضعیت'}</span><p>${esc(m.body)}</p></button>`).join('')}</section></div>`}
  function supportReportsHtml(){const r=supportState.reports||{};return`<div class="support-report-grid">${[['کل درخواست‌ها',r.total||0],['باز',r.open||0],['حل‌شده',r.resolved||0],['حل خودکار',r.ai_resolved||0],['فوری باز',r.urgent||0],['میانگین پاسخ اول',toFa(r.avg_first_response_minutes||0)+' دقیقه'],['رضایت',r.satisfaction?toFa(r.satisfaction)+' از ۵':'—']].map(([l,v])=>`<article><b>${typeof v==='number'?toFa(v):v}</b><span>${l}</span></article>`).join('')}</div><section class="panel support-topic-report"><h3>درخواست‌ها بر اساس موضوع — ۳۰ روز اخیر</h3>${(r.by_topic||[]).map(x=>`<div><span>${SUPPORT_TOPIC[x.topic]||x.topic}</span><b>${toFa(x.count)}</b></div>`).join('')||'<p>هنوز داده‌ای وجود ندارد.</p>'}</section>`}
  function supportSettingsHtml(){const mode=(supportState.settings||{}).mode||'support_only',roles=(supportState.settings||{}).allowed_roles||[];return`<section class="panel support-settings"><h3>سیاست پیام‌رسان عمومی</h3><p>پشتیبانی در هر سه حالت همیشه برای تمام اعضا فعال می‌ماند. گفتگوهای قبلی حذف نمی‌شوند.</p><div class="support-mode-cards">${[['support_only','فقط پشتیبانی','پیام مستقیم عمومی خاموش'],['restricted','محدود','فقط نقش‌های انتخاب‌شده'],['public','عمومی','برای همه؛ با رعایت انصراف هر عضو']].map(([v,t,d])=>`<button class="${mode===v?'on':''}" onclick="shMessagingMode('${v}')"><b>${t}</b><span>${d}</span></button>`).join('')}</div>${mode==='restricted'?`<div class="support-role-list">${Object.entries(SUPPORT_ROLES).map(([v,l])=>`<label><input type="checkbox" ${roles.includes(v)?'checked':''} onchange="shMessagingRole('${v}',this.checked)">${l}</label>`).join('')}</div>`:''}</section>`}
  function adminSupportHtml(){if(!supportState.loaded&&!supportState.loading)setTimeout(()=>hydrateSupport(),0);const tab=supportState.adminTab;return`<section class="admin-view-head"><div><span>مرکز عملیات پشتیبانی</span><h3>پشتیبانی، دانش و گزارش‌ها</h3><p>از دریافت درخواست تا پاسخ هوشمند، تحویل انسانی و سنجش عملکرد.</p></div><div class="admin-view-actions"><button class="btn btn-ghost btn-sm" onclick="supportState.loaded=false;hydrateSupport(true)">↻ تازه‌سازی</button></div></section><nav class="support-tabs">${[['queue','صف درخواست‌ها'],['knowledge','پایگاه دانش'],['macros','ماکروها'],['reports','گزارش‌ها'],['settings','پیام‌رسان']].map(([v,l])=>`<button class="${tab===v?'on':''}" onclick="shSupportAdminTab('${v}')">${l}</button>`).join('')}</nav>${tab==='knowledge'?supportKnowledgeHtml():tab==='macros'?supportMacrosHtml():tab==='reports'?supportReportsHtml():tab==='settings'?supportSettingsHtml():supportQueueHtml()}`}

  function mountPublicProfilePanel(user, attempt = 0) {
    const mount = document.getElementById('shPublicProfileMount');
    if (!mount) return;
    if (window.SH_PUBLIC_PROFILE_PANEL && typeof window.SH_PUBLIC_PROFILE_PANEL.mount === 'function') {
      window.SH_PUBLIC_PROFILE_PANEL.mount(mount, user);
      return;
    }
    if (attempt < 120) { setTimeout(() => mountPublicProfilePanel(user, attempt + 1), 100); return; }
    mount.innerHTML = '<section class="panel ppf-offline"><h3>صفحهٔ عمومی بارگذاری نشد</h3><p>لطفاً صفحه را یک‌بار تازه‌سازی کنید.</p></section>';
  }

  function dashBodyHtml(tab, u, standalone) {
    const bookings = JSON.parse(localStorage.getItem('sh_bookings') || '[]');
    const favs = fav.list();
    const favPools = Pools.filter(p => favs.some(f => f.t === 'pool' && f.id === p.id));
    const favCoaches = Coaches.filter(c => favs.some(f => f.t === 'coach' && f.id === c.id));
    const myCourses = Courses.filter(c => (JSON.parse(localStorage.getItem('sh_courses') || '[]')).includes(c.id));
    const myAdsList = myAds.get();
    const peers = chatStore.peers();
    const now = new Date();
    const faDate = now.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const faTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const spark = seed => { const rnd = (i => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(seed); return `<div class="w-spark">${Array.from({ length: 12 }, (_, i) => `<span style="height:${Math.round(15 + rnd() * 85)}%;opacity:${0.4 + i / 16}"></span>`).join('')}</div>`; };

    // نوار بالای موبایل — هویت + وضعیت عضویت + تاریخ + زنگ (فقط ≤900px نمایش داده می‌شود)
    const TAB_TITLES = { overview: LBL('tab-overview'), profile: 'پروفایل من', public_profile: 'صفحه عمومی من', inbox: LBL('tab-inbox'), bookings: LBL('tab-bookings'), ads: LBL('tab-ads'), venues: 'استخرهای من', catalog: 'کالا و خدمات من', work: LBL('tab-work'), fav: LBL('tab-fav'), wallet: LBL('tab-wallet'), control: LBL('tab-control'), b2b: LBL('tab-b2b'), jobs: LBL('tab-jobs'), resumes: LBL('tab-resumes'), hydro: LBL('tab-hydro'), events: LBL('tab-events'), articles: LBL('tab-articles'), shop: LBL('tab-shop'), cv: LBL('tab-cv'), sub: LBL('tab-sub'), management: LBL('tab-management') };
    const mobTop = t2 => `<div class="p-mtop anim-up">
      <div class="pmt-r">
        <span class="pmt-av">${avatarMarkup(u.avatar, u.name)}</span>
        <div><b>${esc(u.name)}</b><span class="pmt-status ${m.st}">${m.st === 'verified' ? '✓ تأیید شده' : '⏳ منتظر تأیید'}</span></div>
      </div>
      <div class="pmt-tab">${TAB_TITLES[t2] || ''}</div>
      <div class="pmt-l">
        <span class="pmt-date">📅 ${now.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <button class="pmt-bell" onclick="shDashTab('inbox')" aria-label="صندوق پیام">🔔<b data-support-unread ${supportMemberUnread() ? '' : 'style="display:none"'}>${toFa(supportMemberUnread())}</b></button>
      </div>
    </div>`;

    // وضعیت عضویت دمو: pool/coach تأیید، supplier ممکن است pending، demo عادی
    const statusMap = {
      pool: { st: 'verified', sub: 'مدیر استخر تأییدشده ✓', ic: '🛡️' },
      coach: { st: 'verified', sub: 'مربی رسمی استخر جو | ESTAKHRJO ✓', ic: '🏆' },
      supplier: { st: 'pending', sub: 'مدارک تأمین‌کننده در حال بررسی…', ic: '🏭' },
      admin: { st: 'verified', sub: 'دسترسی کامل مدیر سیستم', ic: '👑' },
      demo: { st: 'verified', sub: 'عضویت فعال استخر جو | ESTAKHRJO', ic: '✓' },
    };
    const m = statusMap[u.u] || statusMap.demo;
    let heroBg = { pool: 'assets/panel-hero.webp', coach: 'assets/panel-coach.webp', admin: 'assets/panel-hero.webp', supplier: 'assets/panel-user.webp', demo: 'assets/panel-user.webp' }[u.u] || 'assets/panel-user.webp';
    if (shViewerGender() === 'women') { const WB = { coach: 'assets/panel-coach-w.webp', user: 'assets/panel-user-w.webp', demo: 'assets/panel-user-w.webp' }; if (WB[u.u]) heroBg = WB[u.u]; }
    const heroTitle = { pool: 'پنل مدیریت استخر', coach: 'پنل مربی شنا', admin: 'پنل مدیر سیستم', supplier: 'پنل تأمین‌کننده', demo: 'پنل کاربری' }[u.u] || 'پنل کاربری';
    const heroGenderChip = ['demo', 'coach', 'hydro'].includes(u.u) && (u.gender === 'women' || u.gender === 'men')
      ? (u.gender === 'women' ? '👩 ویژه بانوان' : '👨 ویژه آقایان') : '';

    const readMap2 = (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })();
    const tgUnread = tid => chatUnreadFor(tid, readMap2);
    const totalUnread = peers.reduce((a, p) => a + tgUnread(p.id), 0);
    const inboxRows = tgRowsHtml(peers);

    let body = '';

    // نوار هیرو بالای تب‌ها
    const TAB_BG = {
      inbox: IMG('tab-inbox'), wallet: IMG('tab-wallet'), fav: IMG('tab-fav'), ads: IMG('tab-ads'),
      bookings: IMG('tab-bookings'), profile: IMG('panel-user'), public_profile: IMG('panel-user'), b2b: IMG('tab-b2b'), jobs: IMG('tab-jobs'), hydro: IMG('tab-hydro'),
      events: IMG('tab-events'), articles: IMG('tab-articles'), resumes: IMG('tab-resumes'), management: IMG('panel-hero'), venues: IMG('panel-hero'), catalog: IMG('tab-b2b'), work: IMG('panel-coach'), shop: IMG('tab-shop'), cv: IMG('tab-cv'), sub: IMG('tab-sub'),
    };
    const heroBar = (title, sub, chips, bg) => `
      <div class="panel-hero reveal in"><div class="panel-hero-bg" style="background-image:url('${bg || heroBg}')"></div>
        <div class="panel-hero-content"><h2>${title}</h2><p>${sub}</p>
          <div class="ph-chips">${heroGenderChip ? `<span class="ph-chip" style="background:rgba(6,182,212,.14);color:#22d3ee">${heroGenderChip}</span>` : ''}${chips}</div>
        </div></div>`;

    if (tab === 'public_profile') {
      body = heroBar('🌐 صفحه عمومی من', 'صفحه حرفه‌ای قابل اشتراک شما در estakhrjo.ir؛ همهٔ محتوای جدید پس از تأیید مدیر عمومی می‌شود.',
        `<span class="ph-chip green">🛡️ انتشار با تأیید مدیر</span><span class="ph-chip">@ لینک کوتاه اختصاصی</span>`, TAB_BG.public_profile) + '<div id="shPublicProfileMount"></div>';
      // The panel script is deferred; retry briefly instead of leaving an empty tab
      // when the tab is opened during the first paint or on a slow connection.
      setTimeout(() => mountPublicProfilePanel(u), 0);
    } else if (tab === 'profile') {
      const isImage = v => /^(data:image|https?:|assets\/)/.test(String(v || ''));
      const avatarHtml = isImage(u.avatar) ? `<img src="${esc(u.avatar)}" alt="عکس پروفایل">` : esc(u.avatar || '🙂');
      const gallery = (u.photos || []).map((src, i) => `<div class="profile-gallery-item"><img src="${esc(src)}" alt="تصویر پروفایل ${toFa(i + 1)}"><button onclick="shProfilePhotoDel(${i})" title="حذف تصویر">×</button></div>`).join('');
      const loginAccount = u.accountId ? authAccounts.byId(u.accountId) : null;
      const credentialsCard = loginAccount ? `<section class="profile-card profile-credentials"><div class="profile-card-head"><div><h3>🔐 نام کاربری و رمز ورود</h3><p>شما می‌توانید اطلاعات ورود اختصاصی خود را تغییر دهید. مدیر سیستم نیز همیشه نسخهٔ به‌روز را در پنل اعضا مشاهده می‌کند.</p></div><span>🔑</span></div><div class="form-grid profile-form"><input id="pfUsername" value="${esc(loginAccount.username)}" placeholder="نام کاربری" dir="ltr" autocomplete="username"><input id="pfPassword" value="${esc(loginAccount.password)}" placeholder="رمز عبور جدید" dir="ltr" autocomplete="new-password"><div class="credential-profile-note" style="grid-column:1/-1">نام کاربری باید ۳ تا ۳۲ کاراکتر لاتین، عدد، نقطه، خط تیره یا زیرخط باشد. رمز حداقل ۶ کاراکتر است.</div><button class="btn btn-gold" style="grid-column:1/-1" onclick="shProfileCredentialsSave()">✓ ذخیره اطلاعات ورود</button></div></section>` : '';
      body = heroBar('👤 پروفایل من', 'اطلاعات، راه‌های ارتباطی و تصاویر حرفه‌ای خود را در یک صفحه مدیریت کنید',
        `<span class="ph-chip">${esc(u.role || 'عضو استخر جو | ESTAKHRJO')}</span><span class="ph-chip green">✓ حساب فعال</span>`, TAB_BG.profile) +
        `<div class="profile-shell">
          <section class="profile-card profile-identity"><div class="profile-avatar" id="pfAvatar">${avatarHtml}</div><div><h3>${esc(u.name)}</h3><p>${esc(u.role || 'عضو استخر جو | ESTAKHRJO')} · 📍 ${esc(u.city || '—')}</p><label class="btn btn-ghost btn-sm profile-photo-btn">📷 تغییر عکس<input type="file" accept="image/*" onchange="shProfilePhoto(this)"></label></div></section>
          <section class="profile-card"><div class="profile-card-head"><div><h3>اطلاعات پایه</h3><p>این اطلاعات در کارت‌های شخصی شما استفاده می‌شود.</p></div><span>✦</span></div><div class="form-grid profile-form"><input id="pfName" value="${esc(u.name || '')}" placeholder="نام و نام خانوادگی"><input id="pfCity" value="${esc(u.city || '')}" placeholder="شهر"><select id="pfGender"><option value="" ${!u.gender ? 'selected' : ''}>جنسیت…</option><option value="women" ${u.gender === 'women' ? 'selected' : ''}>👩 خانم</option><option value="men" ${u.gender === 'men' ? 'selected' : ''}>👨 آقا</option></select><input id="pfPhone" value="${esc(u.phone || '')}" placeholder="شماره تماس" dir="ltr"><input id="pfEmail" value="${esc(u.email || '')}" placeholder="ایمیل (برای دکمهٔ تماس صفحهٔ عمومی)" dir="ltr" type="email"><input id="pfInstagram" value="${esc(u.instagram || '')}" placeholder="Instagram / شبکه اجتماعی" dir="ltr"><textarea id="pfBio" rows="3" style="grid-column:1/-1" placeholder="معرفی کوتاه حرفه‌ای">${esc(u.bio || '')}</textarea><label class="profile-direct-toggle" style="grid-column:1/-1"><span><b>💬 دریافت پیام مستقیم</b><small>اعضا فقط وقتی این گزینه فعال باشد می‌توانند پیام تازه برای پروفایل شما آغاز کنند.</small></span><input id="pfDirectMessage" type="checkbox" ${u.direct_messages !== false ? 'checked' : ''}><i></i></label><button class="btn btn-primary" style="grid-column:1/-1" onclick="shProfileSave()">✓ ذخیره اطلاعات پروفایل</button></div></section>
          ${u.u === 'coach' ? `
          <section class="profile-card profile-pro-card" id="cpfProCard"><div class="profile-card-head"><div><h3>🏅 پروفایل حرفه‌ای مربی</h3><p>مدارک، سوابق، تخصص‌ها و تعرفه‌های شما — منبعِ همهٔ «اطلاعات سیستمی» صفحهٔ عمومی. یک بار پر کنید؛ صفحهٔ عمومی و پروفایل مربی شما همین‌ها را نمایش می‌دهد.</p></div><span>🏅</span></div>
            <p class="cpf-hint" id="cpfProHint">در حال خواندن پروفایل حرفه‌ای…</p>
            <div class="form-grid profile-form">
              <input id="cpfExp" type="number" min="0" max="80" placeholder="سال‌های تجربه (مثلاً ۲۴)">
              <input id="cpfStudents" type="number" min="0" placeholder="تعداد شاگردان تا امروز">
              <input id="cpfHourly" inputmode="numeric" placeholder="نرخ ساعتی (تومان)">
              <input id="cpfPrivate" inputmode="numeric" placeholder="قیمت جلسهٔ خصوصی (تومان)">
              <input id="cpfGroup" inputmode="numeric" placeholder="قیمت کلاس گروهی (تومان)">
              <input id="cpfSpecialties" style="grid-column:1/-1" placeholder="تخصص‌ها — با ویرگول جدا کنید (شنا کودکان، آب‌درمانی، نجات غریق…)">
              <input id="cpfLevels" style="grid-column:1/-1" placeholder="سطوح آموزش — با ویرگول (مبتدی، متوسط، پیشرفته، مسابقه‌ای…)">
              <input id="cpfAgeGroups" style="grid-column:1/-1" placeholder="گروه‌های سنی — با ویرگول (کودکان، نوجوانان، بزرگسالان…)">
              <input id="cpfCerts" style="grid-column:1/-1" placeholder="مدارک حرفه‌ای — هر مدرک با ویرگول (مربی درجه ۱ فدراسیون، مدرس نجات غریق…)">
              <input id="cpfMedals" style="grid-column:1/-1" placeholder="افتخارات و مدال‌ها — با ویرگول">
              <input id="cpfInstagram" placeholder="اینستاگرام (شناسه یا لینک)" dir="ltr">
              <input id="cpfTelegram" placeholder="تلگرام (شناسه یا لینک)" dir="ltr">
              <input id="cpfWebsite" placeholder="وب‌سایت (https://…)" dir="ltr">
              <label class="profile-direct-toggle"><span><b>🏠 تدریس در استخر شخصی</b><small>اگر استخر پایهٔ خودتان را دارید فعال کنید.</small></span><input id="cpfHomePool" type="checkbox"><i></i></label>
              <label class="profile-direct-toggle"><span><b>💻 مشاورهٔ آنلاین</b><small>برنامه‌دهی و مشاوره از راه دور.</small></span><input id="cpfOnline" type="checkbox"><i></i></label>
            </div>
            <div class="cpf-career">
              <div class="cpf-career-head"><b>مسیر حرفه‌ای (تایم‌لاین)</b><button type="button" class="btn btn-ghost btn-sm" onclick="shCoachCareerAdd()">＋ افزودن مقطع</button></div>
              <p class="cpf-career-note">مقطع‌های مهم فعالیت را سال‌به‌سال بنویسید؛ قالب‌های صفحهٔ عمومی همین‌ها را به‌صورت تایم‌لاین نمایش می‌دهند.</p>
              <div id="cpfCareerRows"></div>
            </div>
            <button class="btn btn-primary btn-block" id="cpfProSave" onclick="shCoachProSave()">✓ ذخیرهٔ پروفایل حرفه‌ای</button>
          </section>` : ''}
          ${credentialsCard}
          <section class="profile-card"><div class="profile-card-head"><div><h3>تصاویر من</h3><p>عکس‌های محیط کار، نمونه‌کار یا معرفی مجموعه (تا ۶ تصویر).</p></div><label class="btn btn-ghost btn-sm profile-photo-btn">＋ افزودن تصویر<input type="file" accept="image/*" onchange="shProfileGallery(this)"></label></div><div class="profile-gallery">${gallery || '<div class="profile-gallery-empty">🖼️ هنوز تصویری ثبت نشده است.</div>'}</div></section>
        </div>`;
    } else if (tab === 'venues' && u.u === 'pool') {
      const myPools = ownerPoolStore.mine(); const editId = window.__ownerPoolEdit; const editing = editId && editId !== 'new' ? ownerPoolStore.byId(editId) : null;
      if (editId === 'new' || editing) {
        body = heroBar('🏊 مدیریت استخرهای من', 'ساخت و مدیریت چند شعبه، امکانات، نقشه، کادر، سانس‌ها و دوره‌ها در یک پنل', `<span class="ph-chip">${toFa(myPools.length)} استخر / شعبه</span><span class="ph-chip green">🛡️ اطلاعات عملیاتی</span>`, TAB_BG.venues) + ownerPoolEditorHtml(editing || {});
      } else {
        body = heroBar('🏊 استخرهای من', 'برای هر شعبه یک پروندهٔ کامل بسازید و امکانات، موقعیت، مربی‌ها، سانس‌ها و دوره‌ها را مدیریت کنید', `<span class="ph-chip">${toFa(myPools.length)} استخر / شعبه</span><span class="ph-chip gold">چند استخر در یک حساب</span>`, TAB_BG.venues) + `<section class="op-manager"><div class="op-manager-head"><div><h3>فهرست مجموعه‌های من</h3><p>هر استخر به‌صورت مستقل ذخیره می‌شود و پیش‌نویس‌ها تا زمان ارسال، فقط در پنل شما قابل مشاهده‌اند.</p></div><button class="btn btn-primary" onclick="shOwnerPoolCompose('new')">＋ ساخت استخر جدید</button></div>${myPools.length ? `<div class="op-card-grid">${ownerPoolCardsHtml(myPools)}</div>` : `<div class="op-empty"><span>🏊</span><h3>هنوز استخری ثبت نکرده‌اید</h3><p>از ساخت شعبهٔ اول شروع کنید؛ نشانی و نقطهٔ نقشه، تجهیزات، سونا و بخار، ماساژ، یخ، مربیان، سانس‌ها و دوره‌ها همگی در فرم آماده‌اند.</p><button class="btn btn-primary" onclick="shOwnerPoolCompose('new')">＋ ساخت اولین استخر</button></div>`}</section>`;
      }
    } else if (tab === 'venues') {
      body = heroBar('🏊 استخرهای من', 'مدیریت مجموعه‌های آبی فقط برای حساب‌های مالک یا مدیر استخر فعال است', `<span class="ph-chip gold">دسترسی محدود</span>`, TAB_BG.venues) + `<div class="op-empty"><span>🛡️</span><h3>دسترسی مالک استخر لازم است</h3><p>این بخش برای ساخت و مدیریت شعب، امکانات، موقعیت، مربیان، سانس‌ها و دوره‌های یک مجموعهٔ آبی طراحی شده است.</p></div>`;
    } else if (tab === 'overview') {
      const myWork = workStore.mine();
      const totSessions = myWork.pools.reduce((a, p) => a + p.sessions.length, 0);
      const totBooked = myWork.pools.reduce((a, p) => a + p.sessions.reduce((b, s) => b + (s.booked || 0), 0), 0);
      const totCap = myWork.pools.reduce((a, p) => a + p.sessions.reduce((b, s) => b + (s.capacity || 0), 0), 0);
      body = heroBar(
        `سلام، ${esc(u.name)} 👋`,
        { pool: 'آمار زنده کسب‌وکار شما', coach: 'فعالیت امروز شما در یک نگاه', admin: 'نمای کلی سیستم', supplier: 'نمایشگاه محصولات شما', demo: 'نمای کلی فعالیت‌های شما در استخر جو | ESTAKHRJO' }[u.u] || '',
        `<span class="ph-chip gold">📅 ${faDate}</span>
         <span class="ph-chip">🕐 ${faTime}</span>
         <span class="ph-chip green">🟢 آنلاین</span>
         ${u.u === 'coach' ? `<span class="ph-chip">🏊 ${toFa(myWork.pools.length)} استخر • ${toFa(totSessions)} سانس</span>` : ''}
         <span class="ph-chip">💳 ${money(u.wallet || 0)}</span>`) +
      `<div class="w-grid">
        ${shCan('wallet') ? `<div class="w-card"><div class="w-top"><div><div class="w-num">${money(u.wallet || 0)}</div><div class="w-lbl">موجودی کیف پول</div></div><span class="w-ic c1">💳</span><span class="w-delta up">+۱۲٪</span></div>${spark(7)}</div>` : ''}
        ${shCan('bookings') ? `<div class="w-card"><div class="w-top"><div><div class="w-num">${toFa(bookings.length)}</div><div class="w-lbl">بلیت فعال</div></div><span class="w-ic c2">🎫</span><span class="w-delta up">+۲</span></div>${spark(19)}</div>` : ''}
        ${!shCan('work') && !shCan('bookings') ? '' : u.u === 'coach' ? `<div class="w-card"><div class="w-top"><div><div class="w-num">${toFa(totBooked)}/${toFa(totCap)}</div><div class="w-lbl">ثبت‌نام در سانس‌ها</div></div><span class="w-ic c3">👥</span><span class="w-delta up">${totCap ? Math.round(totBooked / totCap * 100) + '٪' : '—'}</span></div>${spark(31)}</div>` : `<div class="w-card"><div class="w-top"><div><div class="w-num">${toFa(myCourses.length)}</div><div class="w-lbl">دوره ثبت‌نامی</div></div><span class="w-ic c3">🎓</span></div>${spark(31)}</div>`}
        <div class="w-card"><div class="w-top"><div><div class="w-num">${toFa(myAdsList.length)}</div><div class="w-lbl">آگهی فعال</div></div><span class="w-ic c4">🛒</span></div>${spark(43)}</div>
        <div class="w-card"><div class="w-top"><div><div class="w-num">${toFa(u.points || 0)}</div><div class="w-lbl">امتیاز وفاداری</div></div><span class="w-ic c5">⭐</span><span class="w-delta up">+۵٪</span></div>${spark(55)}</div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px" class="dash-cols">
        <div class="p-table"><div class="p-table-head"><h3>🎫 آخرین رزروها</h3><button class="sec-link" style="font-size:12px" onclick="shDashTab('bookings')">همه ←</button></div>
          ${bookings.length === 0 ? '<div class="empty" style="padding:30px"><span class="e-ic">🌙</span>هنوز رزروی انجام نداده‌اید. <a target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html" style="color:var(--brand);font-weight:700">شروع کنید</a></div>' :
            `<table><thead><tr><th>کد</th><th>استخر</th><th>زمان</th><th>مبلغ</th><th>وضعیت</th></tr></thead><tbody>
              ${bookings.slice(0, 5).map(b => `<tr><td><b>${esc(b.code)}</b></td><td>${esc(b.pool_name)}</td><td>${esc(b.date)} • ${esc(b.time)}</td><td>${money(b.total)}</td><td><span class="st ok">فعال</span></td></tr>`).join('')}
            </tbody></table>`}
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div class="panel" style="padding:20px"><h3 style="font-size:14px;margin-bottom:14px">⚡ دسترسی سریع</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              <a target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html" class="btn btn-primary btn-sm btn-block">🏊 رزرو سانس</a>
              <a target="_blank" rel="noopener" href="https://estakhrjo.ir/courses.html" class="btn btn-ghost btn-sm btn-block">🎓 دوره‌ها</a>
              <a target="_blank" rel="noopener" href="https://estakhrjo.ir/nearby.html" class="btn btn-ghost btn-sm btn-block">📍 نزدیک من</a>
              <a target="_blank" rel="noopener" href="https://estakhrjo.ir/ads.html" class="btn btn-ghost btn-sm btn-block">🛒 مارکت</a>
            </div></div>
          ${myCourses.length ? `<div class="panel" style="padding:20px"><h3 style="font-size:14px;margin-bottom:10px">🎓 دوره‌های من</h3>
            ${myCourses.map(c => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>${esc(c.image || '🎓')} ${esc(c.title)}</span><span class="st ok">فعال</span></div>`).join('')}</div>` : ''}
        </div>
      </div>`;
    } else if (tab === 'work') {
      // ---------- تب مدیریت کار عضو (چند استخر، سانس و ساعت جداگانه) ----------
      const w = workStore.mine();
      /* انتخابگر آبشاری استان ← شهر ← استخر از مخزن مرجع استخرهای ایران */
      window.__workAddState = { prov: '', city: '', cityName: '' };
      window.shWorkProv = async prov => {
        const st = window.__workAddState; st.prov = prov || ''; st.city = ''; st.cityName = '';
        const citySel = document.getElementById('workCitySel'), poolSel = document.getElementById('workPoolSel');
        if (poolSel) { poolSel.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید…</option>'; poolSel.disabled = true; }
        if (!citySel) return;
        if (!prov) { citySel.innerHTML = '<option value="">ابتدا استان را انتخاب کنید…</option>'; citySel.disabled = true; return; }
        citySel.disabled = true; citySel.innerHTML = '<option value="">در حال بارگذاری شهرها…</option>';
        try {
          const cities = await registryCities(prov);
          citySel.innerHTML = '<option value="">شهر…</option>' + cities.map(c => `<option value="${esc(c.code)}">${esc(c.name)} (${toFa(c.pools_count || 0)})</option>`).join('');
          citySel.disabled = false;
        } catch (e) { citySel.innerHTML = '<option value="">خطا در دریافت شهرها</option>'; toasglass('⚠️ مخزن استخرهای ایران در دسترس نیست'); }
      };
      window.shWorkCity = async city => {
        const st = window.__workAddState; st.city = city || '';
        const citySel = document.getElementById('workCitySel');
        st.cityName = citySel && citySel.selectedIndex > 0 ? String(citySel.options[citySel.selectedIndex].text).replace(/\s*\([0-9۰-۹]+\)\s*$/, '').trim() : '';
        const poolSel = document.getElementById('workPoolSel');
        if (!poolSel) return;
        if (!city) { poolSel.innerHTML = '<option value="">ابتدا شهر را انتخاب کنید…</option>'; poolSel.disabled = true; return; }
        poolSel.disabled = true; poolSel.innerHTML = '<option value="">در حال بارگذاری استخرها…</option>';
        try {
          const pools = await registryPools(st.prov, city);
          poolSel.innerHTML = '<option value="">' + (pools.length ? 'استخر را انتخاب کنید…' : 'استخری برای این شهر ثبت نشده') + '</option>' + pools.map(p => `<option value="${esc(p.code)}" title="${esc(p.category || '')}">${esc(p.name)}</option>`).join('');
          poolSel.disabled = !pools.length;
        } catch (e) { poolSel.innerHTML = '<option value="">خطا در دریافت استخرها</option>'; }
      };
      const workPickerBackfill = () => {
        const provSel = document.getElementById('workProvSel');
        if (!provSel || provSel.dataset.ready === '1') return;
        provSel.dataset.ready = '1';
        registryProvinces().then(list => {
          if (!provSel.isConnected) return;
          provSel.innerHTML = '<option value="">استان…</option>' + list.map(p => `<option value="${esc(p.code)}">${esc(p.name)} (${toFa(p.pools_count || 0)})</option>`).join('');
        }).catch(() => { if (provSel.isConnected) provSel.innerHTML = '<option value="">مخزن در دسترس نیست</option>'; });
      };
      window.shAddWorkPool = () => {
        const sel = document.getElementById('workPoolSel');
        if (!sel || !sel.value) { toasglass('⚠️ ابتدا استان و شهر را انتخاب و سپس استخر را برگزینید'); return; }
        const st = window.__workAddState || {};
        const chosen = ((registryCache.poolsByCity[st.prov + '-' + st.city]) || []).find(p => p.code === sel.value);
        workStore.addPool(sel.value, chosen ? chosen.name : '', st.cityName || '');
        shDashReload();
      };
      window.shDelWorkPool = pid => { workStore.delPool(pid); shDashReload(); };
      window.shToggleSessionForm = pid => {
        const f = document.getElementById('wsf-' + pid);
        const trigger = [...document.querySelectorAll('.wsn-add[aria-controls]')].find(button => button.getAttribute('aria-controls') === 'wsf-' + String(pid));
        if (!f) return;
        const opening = f.hidden;
        f.hidden = !opening;
        if (trigger) trigger.setAttribute('aria-expanded', String(opening));
        if (opening) requestAnimationFrame(() => f.querySelector('select, input')?.focus());
      };
      const plainDigits = value => String(value || '').replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)).replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)).replace(/[^0-9]/g, '');
      window.shMoneyInput = element => {
        const raw = plainDigits(element?.value);
        if (element) element.value = raw ? faNum(raw) : '';
      };
      window.shWorkSessionAdd = pid => {
        const f = id => { const el = document.getElementById(id + '-' + pid); return el ? el.value : ''; };
        const wd = f('wsd'), st = f('wst'), en = f('wen'), kind = f('wkind'), cap = parseInt(plainDigits(f('wcap'))) || 8, price = parseInt(plainDigits(f('wprice'))) || 0, dur = parseInt(plainDigits(f('wdur'))) || 4;
        if (!st || !en) { toasglass('⚠️ زمان شروع و پایان الزامی است'); return; }
        workStore.addSession(pid, { weekday: parseInt(wd), start: st, end: en, kind, capacity: cap, price, duration_weeks: dur });
        shDashReload();
      };
      window.shWorkSessionDel = (pid, sid) => {
        if (!confirm('این سانس از نمایش عمومی حذف شود؟')) return;
        workStore.delSession(pid, sid); shDashReload();
      };

      body = heroBar('🏊 محل کار و سانس‌های من', 'این اطلاعات به‌صورت زنده برای مشتریان روی سایت نمایش داده می‌شود',
        `<span class="ph-chip green">🟢 زنده روی سایت</span><span class="ph-chip">${toFa(w.pools.length)} استخر • ${toFa(w.pools.reduce((a,p)=>a+p.sessions.length,0))} سانس</span>`) +
      (w.pools.length === 0 ? `<div class="panel" style="padding:34px;text-align:center;margin-bottom:22px">
        <span style="font-size:52px;opacity:.4">🏊</span>
        <h3 style="margin:14px 0 8px">هنوز استخری ثبت نکرده‌اید</h3>
        <p style="color:var(--muted);font-size:13px;max-width:520px;margin:0 auto 18px">ابتدا استان و شهر را انتخاب کنید تا فهرست استخرهای آن شهر بیاید؛ سپس استخرهای محل فعالیتتان را اضافه کنید. می‌توانید چند استخر داشته باشید و برای هر کدام، سانس و ساعت حضورتان را جداگانه تعریف کنید.</p>
      </div>` : '') +
      `<div class="add-pool-bar reveal in" style="row-gap:10px">
        <span style="font-size:22px">🏢</span>
        <select id="workProvSel" onchange="shWorkProv(this.value)" aria-label="انتخاب استان" style="min-width:170px"><option value="">استان…</option></select>
        <select id="workCitySel" onchange="shWorkCity(this.value)" aria-label="انتخاب شهر" disabled style="min-width:170px"><option value="">ابتدا استان را انتخاب کنید…</option></select>
        <select id="workPoolSel" aria-label="انتخاب استخر" disabled><option value="">ابتدا شهر را انتخاب کنید…</option></select>
        <button class="btn btn-primary" onclick="shAddWorkPool()">+ افزودن به محل کار</button>
        <p style="flex-basis:100%;margin:0;font-size:11.5px;color:var(--muted)">هر عضو می‌تواند چند استخر فعالیت داشته باشد؛ سانس و ساعت برای هر استخر به‌صورت مستقل ثبت می‌شود.</p>
      </div>` +
      w.pools.map(p => {
        const pool = Pools.find(x => String(x.id) === String(p.pool_id));
        const city = p.pool_city || (pool ? pool.city : '');
        const poolHref = pool && pool.registry ? 'https://estakhrjo.ir/pool.html?code=' + encodeURIComponent(pool.code || pool.id) : (pool ? 'https://estakhrjo.ir/pool.html?id=' + encodeURIComponent(pool.id) : '');
        return `<div class="work-pool reveal in">
        <div class="wp-head">
          <div class="wp-name"><span class="wpn-ic">${pool && pool.image && !/^(https?:|data:)/.test(String(pool.image)) ? esc(pool.image) : '🏊'}</span><div>${esc(p.pool_name)} <span style="font-size:11px;color:var(--muted);font-weight:600">— ${esc(city)}</span></div></div>
          <div style="display:flex;gap:8px;align-items:center">
            ${poolHref ? `<a target="_blank" rel="noopener" href="${poolHref}" class="btn btn-ghost btn-sm">مشاهده پروفایل</a>` : ''}
            <span class="st ok">${toFa(p.sessions.length)} سانس</span>
            <button class="btn btn-danger btn-sm" onclick="shDelWorkPool('${p.pool_id}')">حذف استخر</button>
          </div>
        </div>
          <div class="wsn-grid">
          ${p.sessions.map(s => {
            const pct = Math.min(100, Math.round(((s.booked || 0) / (s.capacity || 1)) * 100));
            const free = (s.capacity || 0) - (s.booked || 0);
            return `<article class="wsn">
              <button type="button" class="del" aria-label="حذف سانس ${esc(WEEKDAYS2[s.weekday])} ${esc(s.start)}" title="حذف سانس" onclick="shWorkSessionDel('${p.pool_id}','${s.id}')">🗑️</button>
              <div class="t">🗓️ ${WEEKDAYS2[s.weekday]} <span aria-hidden="true">•</span> <time dir="ltr">${s.start}</time> تا <time dir="ltr">${s.end}</time></div>
              <div class="d"><span>${s.kind === 'private' ? '👤 خصوصی' : s.kind === 'kids' ? '👶 کودک' : '👥 گروهی'}</span><span>${toFa(s.duration_weeks)} هفته</span></div>
              <div class="cap-row"><div class="cap-bar2" role="progressbar" aria-label="ظرفیت رزرو شده" aria-valuemin="0" aria-valuemax="${esc(String(s.capacity || 0))}" aria-valuenow="${esc(String(s.booked || 0))}"><div class="cap-fill2 ${free <= 2 ? 'almost' : ''}" style="width:${pct}%"></div></div><span class="cap-txt">${toFa(s.booked)}/${toFa(s.capacity)} <span class="c-free">(${toFa(free)} نفر مانده)</span></span></div>
              <div class="pr">💰 ${money(s.price)} <small>/ دوره ${toFa(s.duration_weeks)} هفته</small></div>
            </article>`;
          }).join('')}
          <button type="button" class="wsn-add" aria-controls="wsf-${p.pool_id}" aria-expanded="false" onclick="shToggleSessionForm('${p.pool_id}')"><span>＋</span> ثبت سانس جدید</button>
        </div>
        <section id="wsf-${p.pool_id}" class="wsn-session-form" hidden aria-label="فرم ثبت سانس جدید">
          <div class="wsn-session-form-head"><div><h3>ثبت سانس جدید</h3><p>اطلاعات را کامل کنید؛ سانس پس از ذخیره در صفحهٔ استخر نمایش داده می‌شود.</p></div><button type="button" class="btn btn-ghost btn-sm" onclick="shToggleSessionForm('${p.pool_id}')">انصراف</button></div>
          <div class="wsn-session-fields">
            <label class="fd"><span>روز برگزاری</span><select id="wsd-${p.pool_id}">${WEEKDAYS2.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></label>
            <label class="fd"><span>نوع سانس</span><select id="wkind-${p.pool_id}"><option value="group">👥 گروهی</option><option value="private">👤 خصوصی</option><option value="kids">👶 کودک</option></select></label>
            <label class="fd"><span>ساعت شروع</span><input id="wst-${p.pool_id}" type="time" value="09:00" dir="ltr" required></label>
            <label class="fd"><span>ساعت پایان</span><input id="wen-${p.pool_id}" type="time" value="11:00" dir="ltr" required></label>
            <label class="fd"><span>ظرفیت (نفر)</span><input id="wcap-${p.pool_id}" type="number" min="1" inputmode="numeric" value="10" required></label>
            <label class="fd"><span>مدت دوره (هفته)</span><input id="wdur-${p.pool_id}" type="number" min="1" inputmode="numeric" value="4" required></label>
            <label class="fd wsn-session-price"><span>قیمت کل دوره (تومان)</span><input id="wprice-${p.pool_id}" type="text" inputmode="numeric" dir="ltr" value="${faNum(3200000)}" oninput="shMoneyInput(this)" aria-describedby="wprice-note-${p.pool_id}" required><small id="wprice-note-${p.pool_id}">مبلغ به تومان وارد شود.</small></label>
          </div>
          <div class="wsn-session-actions"><button type="button" class="btn btn-ghost" onclick="shToggleSessionForm('${p.pool_id}')">انصراف</button><button type="button" class="btn btn-gold" onclick="shWorkSessionAdd('${p.pool_id}')">✓ ذخیره و انتشار سانس</button></div>
        </section>
      </div>`;
      }).join('') +
      (w.pools.length ? `<div class="p-table" style="margin-top:8px"><div class="p-table-head"><h3>👁️ پیش‌نمایش همان‌طور که مشتری می‌بیند</h3><a target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html" class="sec-link" style="font-size:12px">مشاهده در سایت ←</a></div>
        <div style="padding:16px">${w.pools.map(p => {
          const pool = Pools.find(x => String(x.id) === String(p.pool_id));
          return `<div style="padding:11px 0;border-bottom:1px solid var(--border)"><b style="font-size:12.5px">${esc(p.pool_name)}</b>
            <div class="cp-meta" style="margin-top:5px">${p.sessions.map(s => `<span>🗓️ ${WEEKDAYS2[s.weekday]} ${s.start}•‭ ${toFa(s.capacity)} نفر</span>`).join('') || '<span style="color:var(--muted)">هنوز سانسی ثبت نشده</span>'}</div></div>`;
        }).join('')}</div>
      </div>` : '');
      setTimeout(workPickerBackfill, 0);
    } else if (tab === 'inbox') {
      body = heroBar('🎧 پشتیبانی', 'ثبت و پیگیری درخواست‌ها؛ این بخش همیشه برای همه اعضا در دسترس است', `<span class="ph-chip green">● مرکز پشتیبانی فعال</span>`, TAB_BG.inbox) + memberSupportHtml();
    } else if (tab === 'ads') {
      const adCompose = !!window.__panelAdCompose;
      body = heroBar('🛒 آگهی‌های من', `${toFa(myAdsList.length)} آگهی ثبت‌شده توسط ${u.u === 'admin' ? 'کل اعضا' : 'شما'}`, `<span class="ph-chip">🛒 بازار اعضا</span>`, TAB_BG.ads) +
        `<div class="p-topbar"><div class="p-title"></div><div class="p-actions"><button class="btn btn-gold" onclick="shPanelAdCompose(true)">+ ثبت آگهی جدید</button></div></div>
        ${myAdsList.length ? `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${myAdsList.map(a => `${a.status === 'pending' ? '<div class="pend-chip">⏳ در انتظار تأیید مدیر سیستم</div>' : ''}${adCard({ ...a, _local: true })}`).join('')}</div>` : `<div class="panel panel-compose-empty"><span>🛒</span><h3>هنوز آگهی نذاشته‌اید</h3><p>آگهی‌های ثبت‌شده و وضعیت بررسی‌شان همین‌جا نمایش داده می‌شوند.</p><button class="btn btn-gold" onclick="shPanelAdCompose(true)">+ ثبت اولین آگهی</button></div>`}
        ${adCompose ? `<div class="panel panel-compose-form" id="panelAdForm"><div class="panel-compose-head"><div><h3>📦 ثبت آگهی جدید</h3><p>اطلاعات را وارد کنید؛ آگهی پیش از انتشار برای تأیید مدیر ارسال می‌شود.</p></div><button class="btn btn-ghost btn-sm" onclick="shPanelAdCompose(false)">× انصراف</button></div><div class="form-grid"><input id="ad_title" placeholder="عنوان آگهی *"><select id="ad_cat">${AD_CATS.slice(1).map(([v, l, ic]) => `<option value="${v}">${ic} ${l}</option>`).join('')}</select><select id="ad_cond"><option value="new">✨ نو</option><option value="used-like-new">در حد نو</option><option value="used">دست‌دوم</option></select><input id="ad_price" type="number" min="0" placeholder="قیمت (تومان) *"><input id="ad_city" placeholder="شهر"><input id="ad_img" placeholder="ایموجی آگهی (اختیاری)" maxlength="4"><textarea id="ad_desc" rows="2" placeholder="توضیح کوتاه"></textarea><input id="ad_contact" placeholder="شماره تماس"><button class="btn btn-gold btn-block" onclick="shPostAd()">🚀 ثبت و ارسال برای تأیید</button></div></div>` : ''}`;
    } else if (tab === 'bookings') {
      body = heroBar('🎫 بلیت‌های من', 'سابقه رزروها و بلیت‌های فعال شما', `<span class="ph-chip green">✓ پرداخت‌شده</span>`, TAB_BG.bookings) +
        `<div class="p-topbar"><div class="p-title"></div><a target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html" class="btn btn-primary btn-sm">➕ رزرو جدید</a></div>
      <div class="p-table">
        ${bookings.length === 0 ? '<div class="empty" style="padding:32px"><span class="e-ic">🎫</span>بلیتی ندارید. <a target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html" style="color:var(--brand);font-weight:700">رزرو کنید</a></div>' :
          `<table><thead><tr><th>کد</th><th>استخر</th><th>تاریخ/ساعت</th><th>تعداد</th><th>مبلغ</th><th></th></tr></thead><tbody>
            ${bookings.map(b => `<tr><td><b>${esc(b.code)}</b></td><td>${esc(b.pool_name)}</td><td>${esc(b.date)} • ${esc(b.time)}</td><td>${toFa(b.qty)}</td><td>${money(b.total)}</td><td><a target="_blank" rel="noopener" href="https://estakhrjo.ir/ticket.html?code=${encodeURIComponent(b.code)}" class="btn btn-ghost btn-sm">نمایش</a></td></tr>`).join('')}
          </tbody></table>`}
      </div>`;
    } else if (tab === 'fav') {
      body = heroBar('❤️ علاقه‌مندی‌ها', 'موردعلاقه‌های ذخیره‌شده شما', `<span class="ph-chip">⭐ محبوب‌ها</span>`, TAB_BG.fav) +
      `<div class="panel-grid">
        <div class="panel"><h3 style="font-size:14px;margin-bottom:12px">🏊 استخرها</h3>
          ${favPools.length === 0 ? '<div class="empty" style="padding:16px"><span class="e-ic">🏊</span>چیزی نیست</div>' :
            favPools.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><div><b style="font-size:13px">${esc(p.image || '')} ${esc(p.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(p.city)} • ⭐ ${toFa(p.rating || 0)}</div></div><div style="display:flex;gap:5px"><a target="_blank" rel="noopener" href="https://estakhrjo.ir/pool.html?id=${p.id}" class="btn btn-ghost btn-sm">مشاهده</a><button class="btn btn-danger btn-sm" onclick="shFav('pool','${p.id}')">🗑️</button></div></div>`).join('')}
        </div>
        <div class="panel"><h3 style="font-size:14px;margin-bottom:12px">🏆 مربیان</h3>
          ${favCoaches.length === 0 ? '<div class="empty" style="padding:16px"><span class="e-ic">🏆</span>چیزی نیست</div>' :
            favCoaches.map(c => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><div><b style="font-size:13px">${esc(c.image || '')} ${esc(c.full_name)}</b><div style="font-size:11px;color:var(--muted)">${esc(c.city)} • ⭐ ${toFa(c.rating || 0)}</div></div><div style="display:flex;gap:5px"><a target="_blank" rel="noopener" href="https://estakhrjo.ir/coach.html?id=${c.id}" class="btn btn-ghost btn-sm">مشاهده</a><button class="btn btn-danger btn-sm" onclick="shFav('coach',${c.id})">🗑️</button></div></div>`).join('')}
        </div>
      </div>`;
    } else if (tab === 'wallet') {
      const orders = JSON.parse(localStorage.getItem('sh_orders') || '[]');
      body = heroBar('💳 کیف پول', 'امتیازها، شارژ و تراکنش‌ها', `<span class="ph-chip green">✓ فعال</span><span class="ph-chip">⭐ ${toFa(u.points || 0)} امتیاز</span>`, TAB_BG.wallet) +
      `      <div class="wallet-hero"><div><div class="wallet-lbl">💳 موجودی</div><div class="wallet-num">${money(u.wallet || 0)}</div><div style="font-size:12px;color:var(--muted);margin-top:5px">⭐ ${toFa(u.points || 0)} امتیاز وفاداری</div></div>
        <div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">شارژ سریع (دمو):</div>
          <div class="charge-row">${[100000, 200000, 500000, 1000000].map(a => `<button class="charge-btn" onclick="shCharge(${a})">+ ${faNum(a / 1000)} هزار</button>`).join('')}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px" class="dash-cols">
        <div class="panel"><h3 style="font-size:14px;margin-bottom:14px">💸 رزروهای خریداری‌شده</h3>
          ${bookings.slice(0, 6).map(b => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>🎫 ${esc(b.pool_name)} • ${esc(b.date)}</span><span style="color:#fb7185;font-weight:800">- ${money(b.total)}</span></div>`).join('') || '<div class="empty" style="padding:16px">تراکنشی نیست</div>'}
        </div>
        <div class="panel"><h3 style="font-size:14px;margin-bottom:14px">📦 سفارش‌های فروشگاه</h3>
          ${orders.length === 0 ? '<div class="empty" style="padding:16px"><span class="e-ic">📦</span>سفارشی نیست</div>' :
            orders.map(o => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>📦 ${esc(o.id)} • ${toFa(o.items)} کالا</span><span style="color:#fb7185;font-weight:800">- ${money(o.total)}</span></div>`).join('')}
        </div>
      </div>`;
    }
     else if (tab === 'cv') {
      window.__cvStep = window.__cvStep || 1;
      const st = window.__cvStep;
      const d = cvStore.get();
      const P = d.personal;
      const stepPill = (i, lbl) => `<button class="cv-step-pill ${st === i ? 'on' : ''} ${st > i ? 'done' : ''}" onclick="shCvStep(${i})"><span>${['👤', '🎓', '🏊', '💼', '✨'][i - 1]}</span>${lbl}</button>`;
      let stepHtml = '';
      if (st === 1) {
        stepHtml = `<h3>👤 اطلاعات شخصی و تماس</h3><p class="cv-note">این اطلاعات در ستون رزومه می‌نشیند — فیلد انگلیسی برای خروجی EN اختیاری است</p>
        <div class="cv-grid2">
          <input value="${esc(P.name)}" placeholder="نام و نام‌خانوادگی *" oninput="shCvField('name', this.value)">
          <input dir="ltr" value="${esc(P.en_name)}" placeholder="English Name (optional)" oninput="shCvField('en_name', this.value)">
          <input value="${esc(P.city)}" placeholder="شهر" oninput="shCvField('city', this.value)">
          <input dir="ltr" value="${esc(P.en_city)}" placeholder="City in English" oninput="shCvField('en_city', this.value)">
          <input value="${esc(P.phone)}" placeholder="تلفن تماس" dir="ltr" oninput="shCvField('phone', this.value)">
          <input value="${esc(P.age)}" placeholder="سن" style="max-width:110px" oninput="shCvField('age', this.value)">
          <select onchange="shCvGender(this.value)"><option value="men" ${P.gender === 'men' ? 'selected' : ''}>👨 آقا</option><option value="women" ${P.gender === 'women' ? 'selected' : ''}>👩 خانم</option></select>
          <div style="display:flex;align-items:center;gap:9px">
            <div id="cvPhotoPv" style="width:56px;height:56px;border:2px dashed var(--border);border-radius:50%;display:grid;place-items:center;font-size:20px;overflow:hidden">${P.photo ? `<img src="${esc(P.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '📷'}</div>
            <label class="btn btn-ghost btn-sm" style="cursor:pointer">📤 عکس پروفایل<input type="file" accept="image/*" style="display:none" onchange="shCvPhoto(this)"></label>
          </div>
          <div class="cv-full cv-details-form-title"><b>مشخصات تکمیلی زیر عکس در رزومه</b><small>رفرنس، سابقه، عنوان و مجموعه از سوابق کاری ثبت‌شده به‌صورت خودکار ساخته می‌شوند.</small></div>
          <select onchange="shCvField('marital', this.value)"><option value="">وضعیت تأهل…</option><option value="single" ${P.marital === 'single' ? 'selected' : ''}>مجرد</option><option value="married" ${P.marital === 'married' ? 'selected' : ''}>متأهل</option></select>
          ${P.gender === 'women' ? '' : `<select onchange="shCvField('military', this.value)"><option value="">وضعیت خدمت سربازی…</option><option value="done" ${P.military === 'done' ? 'selected' : ''}>تمام‌شده</option><option value="exempt" ${P.military === 'exempt' ? 'selected' : ''}>معاف</option><option value="active" ${P.military === 'active' ? 'selected' : ''}>در حال انجام</option></select>`}
          <input value="${esc(P.current_location || '')}" placeholder="موقعیت مکانی فعلی (مثلاً ایران، خوزستان)" oninput="shCvField('current_location', this.value)">
          <input value="${esc(P.nationality || '')}" placeholder="ملیت" oninput="shCvField('nationality', this.value)">
          <div class="cv-salary-input"><input value="${esc(cvSalaryInput(P.expected_salary))}" inputmode="numeric" placeholder="حقوق ماهانه (مثلاً ۱۵٬۰۰۰٬۰۰۰)" oninput="shCvSalary(this.value)" onblur="shCvSalaryFormat(this)"><small>مبلغ ماهانه را به تومان وارد کنید؛ در رزومه با رقم فارسی و جداکنندهٔ هزارگان نمایش داده می‌شود.</small></div>
          <input dir="ltr" value="${esc(P.email || '')}" placeholder="Email" oninput="shCvField('email', this.value)">
          <div class="cv-full"><textarea rows="3" placeholder="معرفی کوتاه حرفه‌ای (دو جمله)…" oninput="shCvField('bio', this.value)">${esc(P.bio)}</textarea></div>
        </div>`;
      } else if (st === 2) {
        const edu = d.education || []; const educationOn = cvSectionEnabled('education'); const educationLabel = cvSectionLabel('education', 'fa') || 'تحصیلات';
        stepHtml = educationOn ? `<h3>🎓 ${esc(educationLabel)}</h3><p class="cv-note">مقطع، رشته و محل تحصیل را وارد کنید. می‌توانید چند مدرک تحصیلی اضافه کنید.</p>
        <div class="cv-education-list">${edu.map((x, i) => `<div class="cv-education"><button class="cv-del" onclick="shCvEduDel(${i})">🗑️ حذف</button><b>مدرک تحصیلی ${toFa(i + 1)}</b><div class="form-grid"><select onchange="shCvEduField(${i},'degree',this.value)"><option value="">مقطع تحصیلی…</option>${['دیپلم','کاردانی','کارشناسی','کارشناسی ارشد','دکتری','دوره تخصصی'].map(v => `<option ${x.degree === v ? 'selected' : ''}>${v}</option>`).join('')}</select><input value="${esc(x.field || '')}" placeholder="رشته تحصیلی" oninput="shCvEduField(${i},'field',this.value)"><input value="${esc(x.institute || '')}" placeholder="دانشگاه / مؤسسه" oninput="shCvEduField(${i},'institute',this.value)"><input value="${esc(x.city || '')}" placeholder="شهر محل تحصیل" oninput="shCvEduField(${i},'city',this.value)"><input value="${esc(x.from || '')}" placeholder="از (مثلاً ۱۳۹۶)" oninput="shCvEduField(${i},'from',this.value)"><input value="${esc(x.to || '')}" placeholder="تا / سال فراغت" oninput="shCvEduField(${i},'to',this.value)"><input value="${esc(x.grade || '')}" placeholder="معدل (اختیاری)" oninput="shCvEduField(${i},'grade',this.value)"></div></div>`).join('') || '<div class="cv-education-empty">🎓 هنوز مدرک تحصیلی ثبت نشده است.</div>'}</div><button class="btn btn-ghost" onclick="shCvEduAdd()">＋ افزودن مدرک تحصیلی</button>` : '<div class="cv-education-empty">این مرحله توسط مدیر سیستم در خروجی رزومه غیرفعال شده است.</div>';
      } else if (st === 3) {
        const skillChoices = cvCatalog('skills').filter(item => item.enabled !== false); const certChoices = cvCatalog('certs').filter(item => item.enabled !== false);
        const skillsOn = cvSectionEnabled('skills'), certsOn = cvSectionEnabled('certificates');
        stepHtml = `<h3>🏊 مهارت‌ها و مدارک</h3><p class="cv-note">برای انتخاب سطح روی یکی از دایره‌ها بزنید؛ با زدن دوباره روی همان دایره، مهارت حذف می‌شود. انتخاب مدارک نیز با یک کلیک روشن و با کلیک دوباره خاموش می‌شود.</p>
        ${skillsOn ? `<h3 style="font-size:14px;margin:12px 0 8px">${esc(cvSectionLabel('skills', 'fa'))}</h3><div>${skillChoices.map(item => { const cur = (d.skills.find(x => String(x[0]) === String(item.id) || (typeof x[0] === 'number' && x[0] === item.legacyIndex)) || [])[1] || 0; return `
          <button type="button" class="cv-skill-row ${cur ? 'on' : ''}" data-cv-skill="${esc(item.id)}" onclick="shCvSkill('${esc(item.id)}', ${cur || 1})">
            <span class="sname">${esc(item.fa)}</span>
            <span class="cv-dots">${[1, 2, 3].map(lv => `<span class="cv-dot ${cur >= lv ? 'on' : ''}" data-cv-level="${lv}" onclick="event.stopPropagation();shCvSkill('${esc(item.id)}', ${lv})" aria-label="سطح ${lv}"></span>`).join('')}</span>
          </button>`; }).join('') || '<div class="cv-education-empty">هنوز مهارتی برای انتخاب فعال نشده است.</div>'}</div>` : ''}
        ${certsOn ? `<h3 style="font-size:14px;margin:18px 0 8px">🎖️ ${esc(cvSectionLabel('certificates', 'fa'))}</h3><div>${certChoices.map(item => `<button type="button" data-cv-cert="${esc(item.id)}" class="cv-cert-chip ${(d.certs || []).some(id => String(id) === String(item.id) || (typeof id === 'number' && id === item.legacyIndex)) ? 'on' : ''}" onclick="shCvCert('${esc(item.id)}')">🎖️ ${esc(item.fa)}</button>`).join('') || '<div class="cv-education-empty">هنوز مدرکی برای انتخاب فعال نشده است.</div>'}</div>` : ''}
        ${!skillsOn && !certsOn ? '<div class="cv-education-empty">مهارت‌ها و مدارک توسط مدیر سیستم در خروجی رزومه غیرفعال شده‌اند.</div>' : ''}`;
      } else if (st === 4) {
        const experienceOn = cvSectionEnabled('experience'); const customSections = cvSectionList().filter(section => !section.builtin && section.enabled);
        stepHtml = `${experienceOn ? `<h3>💼 ${esc(cvSectionLabel('experience', 'fa'))}</h3><p class="cv-note">هر سابقه را جدا اضافه کنید — استخر، مجموعه یا آکادمی</p>
        ${(d.exp || []).map((x, i) => `<div class="cv-exp">
          <button class="cv-del" onclick="shCvExpDel(${i})">🗑️ حذف</button>
          <b style="font-size:12px">سابقه ${toFa(i + 1)}</b>
          <div class="form-grid">
            <input value="${esc(x.title)}" placeholder="سمت (مثلاً مربی ارشد)" oninput="shCvExpField(${i},'title',this.value)">
            <input id="cv_exp_org_${i}" value="${esc(x.org)}" placeholder="استخر / مجموعه" oninput="shCvExpOrg(${i},this.value)">
            <input value="${esc(x.from)}" placeholder="از (مثلاً ۱۴۰۰)" oninput="shCvExpField(${i},'from',this.value)">
            <input value="${esc(x.to)}" placeholder="تا (مثلاً ۱۴۰۴ / اکنون)" oninput="shCvExpField(${i},'to',this.value)">
            <div style="grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px;align-items:center">
              <select id="cv_exp_prov_${i}" onchange="shCvExpProv(${i},this.value)"><option value="">استان…</option></select>
              <select id="cv_exp_city_${i}" disabled onchange="shCvExpCity(${i},this.value)"><option value="">ابتدا استان…</option></select>
              <select id="cv_exp_pool_${i}" disabled onchange="shCvExpPool(${i},this.value)"><option value="">استخر…</option></select>
            </div>
            <textarea rows="2" style="grid-column:1/-1" placeholder="دستاوردها / وظایف… (خودکار بر اساس سال، از جدید به قدیم در رزومه مرتب می‌شود)" oninput="shCvExpField(${i},'desc',this.value)">${esc(x.desc)}</textarea>
          </div>
        </div>`).join('')}
        <button class="btn btn-ghost" onclick="shCvExpAdd()">➕ افزودن سابقه</button>` : ''}
        ${customSections.length ? `<div class="cv-custom-fields"><h3>✦ بخش‌های افزوده‌شده توسط مدیر</h3>${customSections.map(section => `<label><b>${esc(section.labelFa)}</b><textarea rows="3" placeholder="${esc(section.placeholderFa || '')}" oninput="shCvCustom(this.value,'${esc(section.id)}')">${esc((d.custom_sections || {})[section.id] || '')}</textarea></label>`).join('')}</div>` : ''}
        ${!experienceOn && !customSections.length ? '<div class="cv-education-empty">این مرحله در حال حاضر آیتم فعالی ندارد.</div>' : ''}`;
        if (experienceOn) setTimeout(cvExpPickerBackfill, 0);
      } else {
        stepHtml = `<h3>✨ قالب و زبان خروجی</h3><p class="cv-note">بدون از دست رفتن داده‌ها بین قالب‌ها جابه‌جا شوید — خروجی PDF به دو زبان در دسترس است</p>
        <div class="cv-tpls">${['t-wave', 't-min', 't-cls'].map((t, i) => `<button class="cv-tpl ${d.tpl === t ? 'on' : ''}" onclick="shCvTpl('${t}')"><div class="cv-mini" style="background:linear-gradient(160deg,${['#0a2540,#114a6e', '#f8fafc,#e2e8f0', '#ffffff,#f1f5f9'][i]})"></div><b style="font-size:11.5px">${['🌊 موج آبی', '◻️ مینیمال', '▦ اجرایی'][i]}</b><small style="display:block;font-size:9.5px;color:var(--muted)">${['دوستونه تیره — مدرن', 'تکستونه روشن — ساده', 'سبک حرفه‌ای و سازمانی'][i]}</small></button>`).join('')}</div>
        <div class="cv-lang" style="margin-top:14px"><button data-lang="fa" class="${d.lang === 'en' ? '' : 'on'}" onclick="shCvLang('fa')">🇮🇷 نسخه فارسی</button><button data-lang="en" class="${d.lang === 'en' ? 'on' : ''}" onclick="shCvLang('en')">🇬🇧 English Version</button></div>
        <div class="cv-offline-translate"><span>🛡️ ترجمهٔ فارسی به انگلیسی کاملاً روی دستگاه شما انجام می‌شود؛ متن رزومه به هیچ سرویس ترجمه‌ای ارسال نمی‌شود.</span><button class="btn btn-ghost btn-sm" onclick="shCvTranslateEnglish(false)">🌐 ترجمه/به‌روزرسانی متن انگلیسی</button></div>
        <div class="cv-nav" style="justify-content:flex-start;gap:8px">
          <button class="btn btn-primary" onclick="shCvPrint('fa')">⬇️ دانلود PDF فارسی</button>
          <button class="btn btn-gold" onclick="shCvPrint('en')">⬇️ دانلود PDF English</button>
          <button class="btn btn-ghost" onclick="shCvSend()">📨 ارسال به مالکان استخر</button>
        </div>
        <p class="cv-note" style="margin-top:10px">📨 با «ارسال»، رزومه شما پس از تأیید مدیر، در «برد رزومه» برای هزاران مالک استخر نمایش داده می‌شود.</p>`;
      }
      body = heroBar('📄 رزومه‌ساز هوشمند', 'رزومه حرفه‌ای مربی شنا — با چند کلیک، در دو زبان', `<span class="ph-chip">🏊 تخصصی صنعت شنا</span><span class="ph-chip green">📄 خروجی PDF دو زبان</span>`, IMG('tab-cv')) +
      `<div class="cv-shell">
        <div>
          <div class="cv-steps">${stepPill(1, 'شخصی')}${stepPill(2, 'تحصیلات')}${stepPill(3, 'مهارت‌ها')}${stepPill(4, 'سوابق')}${stepPill(5, 'انتشار')}<span class="cv-bar"><i style="width:${st * 20}%"></i></span></div>
          <div class="panel cv-panel">${stepHtml}
            <div class="cv-nav">${st > 1 ? `<button class="btn btn-ghost" onclick="shCvStep(${st - 1})">→ مرحله قبل</button>` : '<span></span>'}${st < 5 ? `<button class="btn btn-primary" onclick="shCvStep(${st + 1})">مرحله بعد ←</button>` : ''}</div>
          </div>
        </div>
        <div class="cv-preview-col">
          <div class="cv-paper-wrap">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:12px;color:#9fd9ff">👁️ پیش‌نمایش زنده</b><span class="mini-tag">${['موج آبی', 'مینیمال', 'اجرایی'][['t-wave', 't-min', 't-cls'].indexOf(d.tpl)]} • ${d.lang === 'en' ? 'EN' : 'FA'}</span></div>
            <div class="cv-paper" id="cvPaper"></div>
          </div>
          <div class="cv-pv-btns">
            <button class="btn btn-primary" onclick="shCvPrint('fa')">⬇️ PDF فارسی</button>
            <button class="btn btn-gold" onclick="shCvPrint('en')">⬇️ PDF English</button>
            <button class="btn btn-ghost" onclick="shCvSend()">📨 ارسال</button>
          </div>
        </div>
      </div>`;
      setTimeout(() => { try { shCvPreview(); } catch (e) {} }, 60);
    }
     else if (tab === 'sub') {
      const ads = subStore.get(); const mine = ads.filter(x => x.coach === (u.name || '')); const shown = shGenderFilter(ads.filter(x => x.ok || x.coach === u.name || u.u === 'admin'), x => x.g); const subCompose = !!window.__subCompose;
      const subForm = (u.u === 'coach' || u.u === 'admin') && subCompose ? `<div class="panel panel-compose-form" id="subForm"><div class="panel-compose-head"><div><h3>➕ مرحله ثبت آگهی جایگزینی</h3><p>پس از تأیید مدیر نمایش داده می‌شود؛ مربیان دیگر می‌توانند با شما تماس بگیرند.</p></div><button class="btn btn-ghost btn-sm" onclick="shSubCompose(false)">× انصراف</button></div><div class="form-grid"><select id="sub_pool"><option value="">استخر…*</option>${Pools.map(p => `<option>${esc(p.name)} — ${esc(p.city)}</option>`).join('')}</select><select id="sub_gender"><option value="">مخاطب: همه</option><option value="women">🌸 فقط بانوان</option><option value="men">👨 فقط آقایان</option></select><input id="sub_sess" placeholder="سانس / تاریخ (مثلاً سه‌شنبه ۱۴:۰۰ بانوان)"><input id="sub_shifts" type="number" min="1" placeholder="تعداد شیفت موردنیاز"><input id="sub_price" type="number" min="0" placeholder="مبلغ هر شیفت (تومان) *"><input id="sub_phone" placeholder="تلفن تماس (نمایش به مربیان)" dir="ltr"><div style="grid-column:1/-1;font-size:11px;font-weight:800;margin:4px 0 2px">🏷️ امتیازات / برچسب‌ها (اختیاری):</div><div style="grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap"><button class="sub-tag-chk sub-tag" data-tag="🚗 ایاب و ذهاب جدا" onclick="shSubTag(this,'trAmt')">🚗 ایاب و ذهاب جدا</button><input id="trAmt" type="number" min="0" placeholder="مبلغ ایاب/ذهاب (هزار تومان)" style="display:none;width:180px"><button class="sub-tag-chk sub-tag" data-tag="💰 نقدی تسویه همان روز" onclick="shSubTag(this)">💰 نقدی همان روز</button><button class="sub-tag-chk sub-tag" data-tag="🏊 امکان شنای رایگان مربی" onclick="shSubTag(this)">🏊 شنای رایگان مربی</button><button class="sub-tag-chk sub-tag" data-tag="🥤 پذیرایی/غذا" onclick="shSubTag(this)">🥤 پذیرایی</button><button class="sub-tag-chk sub-tag" data-tag="⚡ فوری" onclick="shSubTag(this)">⚡ فوری</button><button class="sub-tag-chk sub-tag" data-tag="🔁 همکاری مداوم" onclick="shSubTag(this)">🔁 همکاری مداوم</button></div><textarea id="sub_desc" rows="2" placeholder="توضیح تکمیلی (اختیاری)" style="grid-column:1/-1"></textarea><button class="btn btn-gold btn-block" onclick="shSubAdd()">📨 ثبت آگهی (در انتظار تأیید مدیر)</button></div></div>` : '';
      body = heroBar('🔁 آگهی جایگزینی مربیان', 'مربی‌ها: جایگزین برای سانس‌ها پیدا کنید — هماهنگی مستقیم', `<span class="ph-chip">${toFa(ads.filter(x => x.ok).length)} آگهی فعال</span>`, IMG('tab-sub')) +
        `${u.u === 'coach' || u.u === 'admin' ? `<div class="p-topbar"><div class="p-title"><b>آگهی‌های جایگزینی من</b><small>${mine.length ? toFa(mine.length) + ' مورد ثبت‌شده' : 'برای شروع، یک آگهی جایگزینی ثبت کنید.'}</small></div><div class="p-actions"><button class="btn btn-gold" onclick="shSubCompose(true)">+ ثبت آگهی جایگزینی</button></div></div>` : ''}${subForm}<div class="plist" style="margin-top:18px">${shown.length ? shown.map(a => `<div class="sub-card"><div class="sub-h"><b>🏊 ${esc(a.coach)}</b>${a.ok ? '<span class="sub-pill">✓ تأییدشده</span>' : '<span class="sub-pill" style="background:rgba(251,191,36,.13);color:var(--gold);border-color:rgba(251,191,36,.4)">⏳ در انتظار تأیید</span>'}</div><div class="sub-meta">📍 استخر: ${esc(a.pool)} • 🕐 سانس: ${esc(a.sess)} • 🔁 ${toFa(a.shifts)} شیفت</div><div class="sub-price">💰 هر شیفت: ${money(a.price)}${a.trans ? ' • 🚗 ایاب/ذهاب: ' + money(a.trans) : ''}</div>${(a.tags.length || a.g) ? `<div class="sub-tags">${a.g ? `<span class="sub-tag gnd">${a.g === 'women' ? '🌸 ویژه بانوان' : '👨 ویژه آقایان'}</span>` : ''}${a.tags.map(t => `<span class="sub-tag">${esc(t)}</span>`).join('')}</div>` : ''}${a.desc ? `<div class="sub-meta" style="margin-top:6px">${esc(a.desc)}</div>` : ''}<div class="sub-foot"><a class="btn btn-primary btn-sm" href="tel:${esc(a.phone || '')}" onmousedown="return !!'${a.phone ? 1 : ''}'">${a.phone ? '📞 تماس و هماهنگی' : '⏳ شماره ثبت نشده'}</a>${u.u === 'admin' && !a.ok ? `<button class="btn btn-ghost btn-sm" onclick="shMod2('sub','${a.id}','approve')">✅ تأیید</button>` : ''}</div></div>`).join('') : `<div class="panel panel-compose-empty"><span>🔁</span><h3>هنوز آگهی جایگزینی نیست</h3><p>${u.u === 'coach' || u.u === 'admin' ? 'با دکمه «ثبت آگهی جایگزینی» مرحله ثبت را باز کنید.' : 'وقتی مربی‌ها آگهی بگذارند اینجا می‌بینید.'}</p>${u.u === 'coach' || u.u === 'admin' ? '<button class="btn btn-gold" onclick="shSubCompose(true)">+ ثبت آگهی جایگزینی</button>' : ''}</div>`}</div>`;
    }
     else if (tab === 'catalog' && u.u === 'supplier') {
      const mine = supplierMine(); const editId = window.__supplierCatalogEdit; const editing = editId && editId !== 'new' ? b2bStore.get().find(item => String(item.id) === String(editId) && String(item.supplier_key || '') === supplierKey()) : null;
      if (editId === 'new' || editing) {
        body = heroBar('📦 کالا و خدمات من', 'کاتالوگ تخصصی تجهیزات و خدمات استخر — با ثبت کنترل‌شده برای انتشار در بازار B2B', `<span class="ph-chip">${toFa(mine.length)} مورد در کاتالوگ</span><span class="ph-chip green">🛡️ انتشار پس از تأیید</span>`, TAB_BG.catalog) + supplierCatalogEditorHtml(editing || {});
      } else {
        const products = mine.filter(item => item.kind !== 'service' && item.cat !== 'خدمات').length, services = mine.length - products, published = mine.filter(item => item.status === 'ok').length;
        body = heroBar('📦 کالا و خدمات من', 'محصولات، قطعات، مواد شیمیایی و خدمات تخصصی خود را برای مشاهدهٔ مالکان استخر ثبت کنید', `<span class="ph-chip">${toFa(products)} محصول • ${toFa(services)} خدمت</span><span class="ph-chip green">${toFa(published)} مورد منتشرشده</span>`, TAB_BG.catalog) + `<section class="sc-manager"><div class="sc-manager-head"><div><h3>کاتالوگ تأمین‌کننده</h3><p>هر مورد پس از ثبت برای کنترل مدیر می‌رود و پس از تأیید در فروشگاه B2B برای مالکان استخر قابل مشاهده است.</p></div><button class="btn btn-primary" onclick="shSupplierCatalogCompose('new')">＋ ثبت کالا / خدمت</button></div>${mine.length ? `<div class="sc-card-grid">${supplierCatalogCards(mine)}</div>` : `<div class="sc-empty"><span>📦</span><h3>کاتالوگ شما هنوز خالی است</h3><p>محصولات تصفیه، پمپ، مواد شیمیایی، تجهیزات ایمنی، سونا و بخار یا خدمات سرویس، نصب و تعمیر را با مشخصات حرفه‌ای ثبت کنید.</p><button class="btn btn-primary" onclick="shSupplierCatalogCompose('new')">＋ ثبت نخستین مورد</button></div>`}</section>`;
      }
    }
     else if (tab === 'catalog') {
      body = heroBar('📦 کالا و خدمات من', 'این بخش مخصوص تأمین‌کنندگان تأییدشده است', `<span class="ph-chip gold">دسترسی محدود</span>`, TAB_BG.catalog) + `<div class="sc-empty"><span>🛡️</span><h3>دسترسی تأمین‌کننده لازم است</h3><p>با حساب تأمین‌کننده وارد شوید تا کالاها و خدمات تخصصی مجموعه‌های آبی را ثبت و برای انتشار ارسال کنید.</p></div>`;
    }
     else if (tab === 'shop') {
      // فیلتر مرحله‌ای: همه ← تأمین‌کنندگان/خدمات ← زیر‌دسته‌های همان انتخاب
      const SHOP_CATS = [['', '🗂️ همه'], ['تجهیزات', '🥽 تجهیزات'], ['مواد شیمیایی', '🧪 مواد شیمیایی'], ['قطعات', '🔧 قطعات'], ['سیستم تصفیه', '💧 سیستم تصفیه'], ['خدمات', '🧰 خدمات'], ['سایر', '📦 سایر']];
      const GOODS_CATS = SHOP_CATS.slice(1).filter(x => x[0] !== 'خدمات');
      const SERVICE_CATS = [['', '🧰 همه خدمات'], ['نگهداری', '🛠️ نگهداری'], ['نصب', '🔩 نصب'], ['مشاوره', '💡 مشاوره'], ['آموزش', '🎓 آموزش'], ['سایر', '📋 سایر خدمات']];
      const serviceType = title => /سرویس|تعمیر|نگهداری/.test(title) ? 'نگهداری' : /نصب|راه‌اندازی/.test(title) ? 'نصب' : /مشاوره|نقشه/.test(title) ? 'مشاوره' : /آموزش/.test(title) ? 'آموزش' : 'سایر';
      window.__shopMode = window.__shopMode || 'all'; window.__shopSub = window.__shopSub || '';
      const supItems = [];
      const rowsOf = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
      Suppliers.forEach(s => {
        rowsOf(s.products).forEach(p => supItems.push({ sup: s.name, logo: s.logo || '🏭', title: p, cat: s.category || 'سایر', kind: 'suppliers', subcat: s.category || 'سایر', price: 0, img: '🏭', official: true }));
        rowsOf(s.services).forEach(p => supItems.push({ sup: s.name, logo: s.logo || '🏭', title: p + ' (خدمت)', cat: 'خدمات', kind: 'services', subcat: serviceType(p), price: 0, img: '🧰', official: true }));
      });
      b2bStore.get().filter(x => x.status === 'ok' || (u.u === 'admin')).forEach(x => { const service = x.cat === 'خدمات'; supItems.push({ sup: x.sup, logo: '🏬', title: x.title, cat: x.cat, kind: service ? 'services' : 'suppliers', subcat: service ? serviceType(x.title) : x.cat, price: x.price || 0, img: x.img, official: false, pend: x.status !== 'ok' }); });
      const mode = window.__shopMode, sub = window.__shopSub;
      const subChoices = mode === 'suppliers' ? GOODS_CATS : mode === 'services' ? SERVICE_CATS : [];
      const list = supItems.filter(x => (mode === 'all' || x.kind === mode) && (!sub || x.subcat === sub));
      const isImg = v => /^data:image|^https?:/.test(v || '');
      const filterButton = (m, icon, label) => `<button class="shop-filter-main ${mode === m ? 'on' : ''}" onclick="shShopMode('${m}')"><span>${icon}</span><small>${label}</small></button>`;
      const subButtons = subChoices.map(([v, label]) => `<button class="shop-filter-sub ${sub === v ? 'on' : ''}" onclick="shShopSub('${v}')"><span>${label.split(' ')[0]}</span><small>${label.split(' ').slice(1).join(' ')}</small></button>`).join('');
      body = heroBar(LBL('tab-shop'), 'اقلام و خدمات تأمین‌کنندگان تأییدشده — ویژه اعضای پنل',
        `<span class="ph-chip">${toFa(new Set(supItems.map(x => x.sup)).size)} تأمین‌کننده</span><span class="ph-chip green">🛡️ همه آیتم‌ها تأیید مدیر دارند</span>`, IMG('tab-shop')) +
      `<div class="shop-filter-line" aria-label="فیلتر فروشگاه تأمین‌کنندگان">
        ${filterButton('all', '🌐', 'همه')}
        ${filterButton('suppliers', '🏭', 'تأمین‌کنندگان')}
        ${mode === 'suppliers' ? `<span class="shop-sub-group">${subButtons}</span>` : ''}
        ${filterButton('services', '🧰', 'خدمات')}
        ${mode === 'services' ? `<span class="shop-sub-group">${subButtons}</span>` : ''}
      </div>
      ${mode !== 'all' ? `<div class="shop-filter-state">فیلتر فعال: <b>${mode === 'services' ? 'خدمات' : 'تأمین‌کنندگان'}</b>${sub ? ' · ' + esc((subChoices.find(x => x[0] === sub) || [0, sub])[1]) : ''}<button onclick="shShopMode('all')">✕ حذف فیلتر</button></div>` : ''}
      <div class="shop-grid" id="shopGrid">
        ${list.length ? list.map(x => `<div class="shop-card">
          <div class="shc-img">${isImg(x.img) ? `<img src="${esc(x.img)}" alt="">` : `<span>${esc(x.img)}</span>`}</div>
          <div class="shc-body">
            <b>${esc(x.title)}</b>
            <div class="shc-meta">${esc(x.sup)} • ${esc(x.cat)}</div>
            <div class="shc-foot">${x.price ? `<span class="shc-price">${money(x.price)}</span>` : '<span class="mini-tag">استعلام قیمت</span>'}${x.pend ? '<span class="pend-tag">⏳ در انتظار</span>' : ''}</div>
          </div>
        </div>`).join('') : `<div class="panel" style="padding:40px;text-align:center"><span style="font-size:44px;opacity:.4">📦</span><h3 style="margin:12px 0 4px">موردی با این فیلتر نیست</h3><p style="font-size:12px;color:var(--muted)">دسته یا تأمین‌کننده دیگری را انتخاب کنید</p></div>`}
      </div>
      ${u.u === 'supplier' ? `
      <div class="panel" style="margin-top:22px" id="b2bFormBox">
        <h3 style="font-size:15px;margin-bottom:6px">➕ افزودن کالا / خدمت جدید</h3>
        <p style="font-size:11px;color:var(--muted);margin-bottom:14px">پس از ثبت، ابتدا در صف تأیید مدیر سیستم قرار می‌گیرد و سپس برای کل اعضا نمایش داده می‌شود.</p>
        <div class="form-grid">
          <input id="b2b_title" placeholder="نام کالا یا خدمت *">
          <select id="b2b_cat">${SHOP_CATS.slice(1).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <input id="b2b_price" type="number" min="0" placeholder="قیمت (تومان — خالی = استعلام قیمت)">
          <input id="b2b_desc" placeholder="توضیح کوتاه">
          <div style="display:flex;gap:8px;align-items:center;grid-column:1/-1">
            <div id="b2bImgPv" style="width:74px;height:74px;border:1.5px dashed var(--border);border-radius:12px;display:grid;place-items:center;font-size:26px;position:relative;overflow:hidden">🖼️</div>
            <label class="btn btn-ghost btn-sm" style="cursor:pointer">📤 آپلود عکس (اختیاری)<input type="file" accept="image/*" style="display:none" onchange="shB2BImgFile(this)"></label>
            <input id="b2b_img" placeholder="یا ایموجی (اختیاری)" maxlength="4" style="width:130px">
          </div>
          <button class="btn btn-gold btn-block" onclick="shB2BAdd()">📨 ثبت در صف تأیید</button>
        </div>
      </div>` : ''}`;
      // از لینک‌های قدیمی ?sup= هم پشتیبانی می‌شود؛ چینش جدید فقط یک خط افقی دارد.
      setTimeout(() => { const sc = qs('sup'); if (sc && !window.__shopMode) shShopMode('suppliers'); }, 50);
    }
     else if (['b2b', 'jobs', 'resumes', 'hydro', 'events', 'articles'].includes(tab)) {
      const plRow = (ic, title, meta, act) => `<div class="pl-row"><span class="pl-ic">${ic}</span><div class="pl-t"><b>${title}</b><span>${meta}</span></div><div class="pl-a">${act}</div></div>`;
      const plWrap = inner => `<div class="plist">${inner}</div>`;
      if (tab === 'b2b') {
        body = heroBar('🏭 شبکه تأمین B2B', 'تأمین‌کنندگان تأییدشده تجهیزات، مواد شیمیایی و خدمات استخری',
          `<span class="ph-chip">${toFa(Suppliers.length)} تأمین‌کننده فعال</span><span class="ph-chip green">✓ ویژه کسب‌وکارها</span>`,
          TAB_BG.b2b) +
        plWrap(Suppliers.map(s => plRow(esc(s.logo || '🏭'), esc(s.name),
          `${esc(s.category)} • 📍 ${esc(s.city)} • ⭐ ${toFa(s.rating || 0)}`,
          (cfgContact('suppliers', s.name) ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(s.phone || '')}">📞 تماس</a>` : '<span class="mini-tag">🔒 تماس محدود</span>') + `<button class="btn btn-primary btn-sm" onclick="shSupplierProfile('${esc(String(s.id))}')">پروفایل کامل</button>`)).join(''));
      } else if (tab === 'jobs') {
        body = heroBar('🔥 آگهی‌های استخدام', 'فرصت‌های شغلی منتشرشده توسط استخرهای عضو',
          `<span class="ph-chip">${toFa(Jobs.length)} موقعیت فعال</span>`,
          TAB_BG.jobs) +
        plWrap(shGenderFilter(Jobs, x => x.gender).map(j => plRow('🏢', esc(j.title || 'فرصت شغلی'),
          `${esc(j.pool_name || 'استخر')} • 📍 ${esc(j.city || '—')} • 💼 ${esc(j.job_type || '')} • 💰 ${esc(j.salary || 'توافقی')}`,
          jobActionHtml('job', j, 'ارسال رزومه'))).join(''));
      } else if (tab === 'resumes') {
        const offers = shGenderFilter(cvOfferStore.get().filter(x => x.ok), x => x.gender || (x.cv && x.cv.personal ? x.cv.personal.gender : ''));
        body = heroBar('📄 برد رزومه', 'مربیان و متخصصان آماده همکاری — رزومه را باز کنید و هماهنگ کنید',
          `<span class="ph-chip">${toFa(Resumes.length + offers.length)} رزومه فعال</span>`,
          TAB_BG.resumes) +
        (offers.length ? `<div class="plist" style="margin-bottom:14px">${offers.map(o => plRow('🌊', esc(o.name) + ' — رزومه استخر جو | ESTAKHRJO' + (o.photo ? ' 📷' : ''),
          `📍 ${esc(o.city || '—')} • ${(o.skills || []).filter(Boolean).slice(0, 2).join('، ')} • قالب ${({ 't-wave': 'موج آبی', 't-min': 'مینیمال', 't-cls': 'کلاسیک' })[o.tpl]}`,
          `<button class="btn btn-ghost btn-sm" onclick="shResumeView('${esc(String(o.id))}')">👁️ نمایش رزومه</button><a class="btn btn-ghost btn-sm" href="tel:${esc(o.phone || '')}">📞 تماس</a><button class="btn btn-gold btn-sm" onclick="toasglass('📨 درخواست همکاری ارسال شد')">درخواست همکاری</button>`)).join('')}</div>` : '') +
        plWrap(shGenderFilter(Resumes, x => x.gender).map(r2 => plRow('🏆', esc(r2.user_name || 'متخصص') + ' — ' + esc(r2.title || ''),
          `📍 ${esc(r2.city || '—')} • ${toFa(r2.exp_years || 0)} سال سابقه • ${esc((Array.isArray(r2.skills) ? r2.skills[0] : String(r2.skills || '').split('\n')[0]) || '')}`,
          `<button class="btn btn-ghost btn-sm" onclick="shResumeView('${esc(String(r2.id))}')">👁️ نمایش رزومه</button><button class="btn btn-gold btn-sm" onclick="toasglass('📨 درخواست همکاری برای ${(r2.user_name || 'متخصص').replace(/'/g, '')} ارسال شد')">درخواست همکاری</button>`)).join(''));
      } else if (tab === 'hydro') {
        body = heroBar('💆 هیدروتراپی و آب‌درمانی', 'مراکز و متخصصان تأییدشده توان‌بخشی در آب',
          `<span class="ph-chip">${toFa(Hydro.length)} متخصص فعال</span><span class="ph-chip green">🩺 سلامت</span>`,
          TAB_BG.hydro) +
        plWrap(Hydro.map(h2 => plRow('🩺', esc(h2.name) + ' — ' + esc(h2.specialty || ''),
          `🏥 ${esc(h2.clinic || '')} • 📍 ${esc(h2.city || '')} • ${toFa(h2.price || 0)} هزار تومان / جلسه`,
          `<button class="btn btn-primary btn-sm" onclick="toasglass('🗓️ درخواست نوبت ارسال شد — هماهنگی از طریق گفتگو')">درخواست نوبت</button>`)).join(''));
      } else if (tab === 'events') {
        body = heroBar('🏅 رویدادها و مسابقات', 'تقویم رقبت‌های رسمی و دوستانه',
          `<span class="ph-chip">${toFa(Events.length)} رویداد پیش‌رو</span>`,
          TAB_BG.events) +
        plWrap(Events.map(e2 => plRow('🏁', esc(e2.title),
          `📅 ${esc(e2.date || '')} • 📍 ${esc(e2.city || '')} • 🏆 ${esc(e2.prize || '')} • 👥 ${toFa(e2.participants || 0)} نفر`,
          `<button class="btn btn-primary btn-sm" onclick="toasglass('🎟️ پیش‌ثبت‌نام انجام شد')">ثبت‌نام</button>`)).join(''));
      } else if (tab === 'articles') {
        body = heroBar('📰 مجله شنا', 'آموزش، تغذیه، سلامت و اخبار دنیای شنا',
          `<span class="ph-chip">${toFa(Articles.length)} مطلب</span>`,
          TAB_BG.articles) +
        plWrap(Articles.map(a2 => plRow(esc(a2.emoji || '📖'), esc(a2.title),
          `🏷️ ${esc(a2.tag || '')} • ⏱️ ${toFa(a2.minutes || 5)} دقیقه مطالعه — ${esc((a2.excerpt || '').slice(0, 60))}…`,
          `<a target="_blank" rel="noopener" class="btn btn-ghost btn-sm" href="https://estakhrjo.ir/articles.html">مطالعه</a>`)).join(''));
      }
    }
     else if (tab === 'management') {
      if (u.u !== 'admin') {
        body = `<div class="panel" style="padding:60px;text-align:center"><span style="font-size:44px">🔒</span><h3 style="margin:14px 0 6px">دسترسی محدود</h3><p style="color:var(--muted);font-size:13px">پنل مدیریت فقط برای مدیر سیستم در دسترس است.</p></div>`;
      } else {
        const view = window.__adminView || 'overview'; const members = cfgAccounts(); const audits = adminAuditStore.get();
        const pending = { ads: myAds.get().filter(x => x.status === 'pending').length, b2b: b2bStore.get().filter(x => x.status === 'pending').length, cv: cvOfferStore.get().filter(x => !x.ok).length, sub: subStore.get().filter(x => !x.ok).length, jobs: jobStore.get().filter(x => x.status === 'pending').length };
        const pendingTotal = adminPendingTotal(pending); const statusText = { active:'فعال', inactive:'غیرفعال' };
        const planOrder = ['پایه','حرفه‌ای','سازمانی']; const activeMembers = members.filter(m => m.status === 'active').length;
        const planCount = plan => members.filter(m => m.plan === plan).length;
        const nav = (id, icon, label, count) => `<button class="admin-nav-item ${view === id ? 'on' : ''}" onclick="shAdminView('${id}')"><span>${icon}</span><b>${label}</b>${count !== undefined ? `<i>${toFa(count)}</i>` : ''}</button>`;
        const roleOptions = selected => Object.entries(AUTH_ROLES).map(([key, def]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${esc(def.label)}</option>`).join('');
        const planOptions = selected => planOrder.map(plan => `<option ${plan === selected ? 'selected' : ''}>${plan}</option>`).join('');
        const memberRows = members.map(m => { const status = m.status || 'active', plan = m.plan || 'پایه', id = m.id; return `<article class="admin-member-card admin-member-card-auth"><span class="admin-member-ic">${avatarMarkup(m.ic, m.name)}</span><div class="admin-member-main"><b>${esc(m.name)}</b><small>${esc(m.role)} · ${statusText[status]}</small><span class="admin-member-sections">${m.secs.map(x => ({ pools:'استخر',coaches:'مربی',courses:'دوره',suppliers:'تأمین',market:'بازار',hydro:'هیدروتراپی',management:'مدیریت',control:'کنترل',site:'سایت' })[x] || x).join(' · ')}</span></div><div class="admin-member-meta"><span class="admin-state ${status}">${statusText[status]}</span>${m.gender === 'women' ? '<span class="admin-plan" style="background:#fce7f3;color:#db2777">👩 خانم</span>' : m.gender === 'men' ? '<span class="admin-plan" style="background:#dbeafe;color:#1d4ed8">👨 آقا</span>' : ''}<span class="admin-plan">${esc(plan)}</span></div><div class="admin-member-actions"><button title="فعال / غیرفعال" class="btn ${status === 'active' ? 'btn-ghost' : 'btn-primary'} btn-sm" onclick="shAdminMemberCycle('${id}')">${status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button><button title="چرخه اشتراک" class="btn btn-gold btn-sm" onclick="shAdminPlanCycle('${id}')">اشتراک</button></div><div class="admin-credential-strip"><span>👤 <b dir="ltr">${esc(m.username)}</b></span><span>🔑 <b dir="ltr">${esc(m.password)}</b></span><span>نقش: ${esc(m.role)}</span></div><details class="admin-member-edit"><summary>ویرایش کامل عضو و اطلاعات ورود</summary><div class="admin-member-edit-grid"><input id="am-${id}-name" value="${esc(m.name)}" placeholder="نام عضو"><input id="am-${id}-city" value="${esc(authAccounts.byId(id).city || '')}" placeholder="شهر"><select id="am-${id}-gender"><option value="" ${((authAccounts.byId(id).gender || '') === '' ? 'selected' : '')}>جنسیت…</option><option value="women" ${authAccounts.byId(id).gender === 'women' ? 'selected' : ''}>👩 خانم</option><option value="men" ${authAccounts.byId(id).gender === 'men' ? 'selected' : ''}>👨 آقا</option></select><input id="am-${id}-username" value="${esc(m.username)}" dir="ltr" placeholder="نام کاربری"><div class="admin-password-field"><input id="am-${id}-password" value="${esc(m.password)}" data-original="${esc(m.password)}" dir="ltr" placeholder="رمز عبور"><button type="button" onclick="shAdminGenerateMemberPassword('${id}')">✨ ساخت رمز</button></div><select id="am-${id}-role">${roleOptions(m.u)}</select><select id="am-${id}-plan">${planOptions(plan)}</select><select id="am-${id}-status"><option value="active" ${status === 'active' ? 'selected' : ''}>فعال</option><option value="inactive" ${status === 'inactive' ? 'selected' : ''}>غیرفعال</option></select><button class="btn btn-primary" onclick="shAdminSaveMember('${id}')">✓ ذخیره همه تغییرها</button></div></details></article>`; }).join('');
        // Every queue that can hold something awaiting a decision, in one list.
        const queueCards = [
          ['◇','صفحات عمومی اعضا', adminRemotePending.publicProfiles, 'view:publicprofiles'],
          ['🛒','آگهی اعضا', pending.ads, 'control-moderation'],
          ['🏭','کالا و خدمات B2B', pending.b2b, 'control-moderation'],
          ['📄','رزومه‌های ارسالی', pending.cv + pending.jobs, 'control-moderation'],
          ['🔁','آگهی جایگزینی', pending.sub, 'control-moderation'],
        ];
        const controlBtn = (id, label) => `<button class="btn btn-ghost btn-sm" onclick="shAdminControlOpen('${id}')">${label} ←</button>`;
        let viewHtml = '';
        if (view === 'support') {
          viewHtml = adminSupportHtml();
        } else if (view === 'members') {
          viewHtml = `<section class="admin-view-head"><div><span>مدیریت هویت و دسترسی</span><h3>اعضا، نام کاربری و رمز عبور</h3><p>هر حساب، وضعیت فعال/غیرفعال، نقش و اشتراک مشخص دارد. اطلاعات ورود در همین پنل مدیریت شده و برای مدیر قابل مشاهده است.</p></div><div class="admin-view-actions"><span class="admin-live"><i></i>${toFa(activeMembers)} حساب فعال</span><button class="btn btn-primary btn-sm" onclick="document.getElementById('adminCreateMember')?.scrollIntoView({behavior:'smooth',block:'center'})">＋ ساخت عضو جدید</button></div></section><section class="admin-create-member" id="adminCreateMember"><div class="admin-create-head"><div><span>👤 عضو جدید</span><h3>ساخت حساب با نام کاربری و رمز اختصاصی</h3><p>ابتدا نام و نقش را وارد کنید، سپس با ساخت هوشمند، اطلاعات ورود پیشنهادی را بسازید یا دستی تغییر دهید.</p></div><button class="btn btn-ghost btn-sm" type="button" onclick="shAdminGenerateCredentials()">✨ تولید هوشمند</button></div><div class="admin-create-grid"><input id="newMemberName" placeholder="نام و نام خانوادگی / نام کسب‌وکار" oninput="this.dataset.changed='1'"><input id="newMemberCity" placeholder="شهر" value="تهران"><select id="newMemberGender"><option value="">جنسیت عضو…</option><option value="women">👩 خانم</option><option value="men">👨 آقا</option></select><select id="newMemberRole">${roleOptions('demo')}</select><select id="newMemberPlan">${planOptions('پایه')}</select><select id="newMemberStatus"><option value="active">فعال</option><option value="inactive">غیرفعال</option></select><input id="newMemberUsername" placeholder="نام کاربری" dir="ltr" autocomplete="off"><div class="admin-password-field"><input id="newMemberPassword" placeholder="رمز عبور" dir="ltr" autocomplete="new-password"><button type="button" onclick="shAdminGenerateCredentials()">✨ تولید</button></div><button class="btn btn-primary" onclick="shAdminAddMember()">✓ ساخت و فعال‌سازی عضو</button></div></section><section class="admin-filter-bar"><label>🔎 <input placeholder="جست‌وجو در اعضا، نقش یا نام کاربری…" oninput="document.querySelectorAll('.admin-member-card').forEach(x=>x.hidden=!x.innerText.toLowerCase().includes(this.value.trim().toLowerCase()))"></label><button class="on">همه ${toFa(members.length)}</button><button>فعال ${toFa(activeMembers)}</button><button>غیرفعال ${toFa(members.length-activeMembers)}</button></section><section class="admin-member-directory">${memberRows}</section>`;
        } else if (view === 'permissions') {
          viewHtml = `<section class="admin-view-head"><div><span>دسترسی گروه‌ها</span><h3>چه گروهی به چه بخشی از پنل دسترسی دارد</h3><p>پیش‌فرض همه‌چیز خاموش است. داشبورد، پروفایل و صفحهٔ عمومی همیشه روشن‌اند و قابل خاموش‌کردن نیستند. هر تغییر بلافاصله روی سرور اعمال می‌شود و فقط پنهان‌کردن دکمه نیست.</p></div><div class="admin-view-actions"><button class="btn btn-ghost btn-sm" onclick="shPermReload()">↻ تازه‌سازی</button></div></section>
          <section class="panel" id="permMatrixHost" style="padding:18px"><div class="ppf-loading">در حال دریافت جدول دسترسی‌ها…</div></section>`;
          setTimeout(() => shPermReload(), 0);
        } else if (view === 'plans') {
          viewHtml = `<section class="admin-view-head"><div><span>درآمد و دسترسی</span><h3>اشتراک‌ها و بسته‌های سازمانی</h3><p>سطح قابلیت‌های هر کسب‌وکار را شفاف، قابل‌پیگیری و آمادهٔ رشد آینده مدیریت کنید.</p></div><div class="admin-view-actions"><button class="btn btn-primary btn-sm" onclick="shAdminView('members')">مدیریت اعضا</button></div></section><section class="admin-plan-grid">${[['پایه','شروع استاندارد','امکانات پایه پنل و حضور در شبکه','🌱'],['حرفه‌ای','رشد کسب‌وکار','اولویت نمایش، ابزار فروش و گزارش کامل','⚡'],['سازمانی','عملیات چندمجموعه‌ای','دسترسی سازمانی، نقش‌های تیمی و پشتیبانی ویژه','🏢']].map(([plan,title,desc,ic])=>`<article class="admin-plan-card ${plan==='حرفه‌ای'?'featured':''}"><span>${ic}</span><div><b>${plan}</b><small>${title}</small></div><strong>${toFa(planCount(plan))} عضو</strong><p>${desc}</p><button class="btn btn-ghost btn-sm" onclick="shAdminView('members')">تخصیص به عضو ←</button></article>`).join('')}</section><section class="panel admin-billing-table"><div class="admin-sec-head"><div><h3>چرخه‌های عضویت</h3><p>تمدید پیش‌فرض پس از هر تغییر سطح برای ۳۰ روز آینده ثبت می‌شود؛ آمادهٔ اتصال به پرداخت و فاکتور سازمانی.</p></div><span>۳۰ روزه</span></div>${members.map(m=>{const a=authAccounts.byId(m.id)||{},d=a.createdAt?new Date(a.createdAt).toLocaleDateString('fa-IR'):'—';return `<div class="admin-billing-row"><span class="admin-billing-avatar">${avatarMarkup(m.ic, m.name)}</span><b>${esc(m.name)}</b><small>${esc(m.plan||'پایه')}</small><small>حساب از: ${d}</small><button class="btn btn-gold btn-sm" onclick="shAdminPlanCycle('${m.id}')">تغییر سطح</button></div>`}).join('')}</section>`;
        } else if (view === 'approvals') {
          viewHtml = `<section class="admin-view-head"><div><span>اعتماد و ایمنی</span><h3>مرکز بررسی و تأیید</h3><p>تمام موارد ورودی در یک صف عملیاتی دیده می‌شوند؛ هیچ انتشار عمومی بدون کنترل مدیر انجام نمی‌شود.</p></div><div class="admin-view-actions"><span class="admin-alert">${pendingTotal ? toFa(pendingTotal)+' مورد منتظر اقدام' : 'صف پاک است'}</span>${controlBtn('control-moderation','باز کردن صف کامل')}</div></section><section class="admin-queue-grid">${queueCards.map(([ic,label,n,id])=>{
            const go = id.startsWith('view:') ? `shAdminView('${id.slice(5)}')` : `shAdminControlOpen('${id}')`;
            const note = !adminRemotePending.loaded && id.startsWith('view:') ? 'در حال دریافت…' : (n ? 'نیازمند تصمیم مدیر' : 'موردی در انتظار نیست');
            return `<article class="admin-queue-card ${n?'waiting':'clear'}"><span>${ic}</span><div><b>${label}</b><small>${note}</small></div><strong>${toFa(n)}</strong><button onclick="${go}">بررسی</button></article>`;
          }).join('')}</section><section class="admin-process"><h3>چرخه تصمیم‌گیری استاندارد</h3><div><span>۱. دریافت</span><i></i><span>۲. بررسی محتوا</span><i></i><span>۳. تأیید یا رد</span><i></i><span>۴. ثبت در گزارش</span></div><p>تصمیم‌های انتشار، رزومه، کالا و جایگزینی همگی از محیط کنترل پیشرفته ثبت و قابل ردیابی می‌شوند.</p></section>`;
        } else if (view === 'cvstudio') {
          const studio = cvStudioStore.get(); const studioSections = studio.sections.slice().sort((a, b) => a.order - b.order);
          const fontOptions = language => CV_FONT_CHOICES[language].map(font => `<option value="${font.id}" ${studio.typography[language] === font.id ? 'selected' : ''}>${esc(font.label)}</option>`).join('');
          const sectionRows = studioSections.map((section, index) => `<article class="cv-admin-section ${section.enabled ? '' : 'is-off'}"><div class="cv-admin-section-top"><span class="cv-admin-order">${toFa(index + 1)}</span><div><b>${esc(section.labelFa)}</b><small>${esc(section.labelEn)}</small></div><label class="cv-admin-toggle">نمایش <input type="checkbox" ${section.enabled ? 'checked' : ''} onchange="shCvStudioSection('${section.id}','enabled',this.checked)"><i></i></label><div class="cv-admin-move"><button title="بالا" ${index ? '' : 'disabled'} onclick="shCvStudioMoveSection('${section.id}',-1)">↑</button><button title="پایین" ${index < studioSections.length - 1 ? '' : 'disabled'} onclick="shCvStudioMoveSection('${section.id}',1)">↓</button></div></div><div class="cv-admin-section-fields"><input value="${esc(section.labelFa)}" placeholder="عنوان فارسی" onchange="shCvStudioSection('${section.id}','labelFa',this.value)"><input dir="ltr" value="${esc(section.labelEn)}" placeholder="English title" onchange="shCvStudioSection('${section.id}','labelEn',this.value)"><select onchange="shCvStudioSection('${section.id}','place',this.value)"><option value="main" ${section.place === 'main' ? 'selected' : ''}>ستون اصلی</option><option value="side" ${section.place === 'side' ? 'selected' : ''}>ستون کناری</option></select>${!section.builtin ? `<input value="${esc(section.placeholderFa || '')}" placeholder="راهنمای ورود فارسی" onchange="shCvStudioSection('${section.id}','placeholderFa',this.value)"><input dir="ltr" value="${esc(section.placeholderEn || '')}" placeholder="English input hint" onchange="shCvStudioSection('${section.id}','placeholderEn',this.value)">` : ''}<button class="btn btn-danger btn-sm" onclick="shCvStudioDeleteSection('${section.id}')">${section.builtin ? 'خاموش‌کردن' : 'حذف'}</button></div></article>`).join('');
          const catalog = (kind, icon, title, subtitle) => `<section class="cv-admin-catalog"><div class="cv-admin-catalog-head"><div><span>${icon} کاتالوگ خروجی</span><h4>${title}</h4><p>${subtitle}</p></div><button class="btn btn-ghost btn-sm" onclick="shCvStudioAddCatalog('${kind}')">＋ افزودن آیتم</button></div><div class="cv-admin-catalog-list">${studio[kind].map(item => `<div class="cv-admin-catalog-row ${item.enabled ? '' : 'is-off'}"><label class="cv-admin-toggle"><input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="shCvStudioCatalog('${kind}','${item.id}','enabled',this.checked)"><i></i></label><input value="${esc(item.fa)}" placeholder="عنوان فارسی" onchange="shCvStudioCatalog('${kind}','${item.id}','fa',this.value)"><input dir="ltr" value="${esc(item.en)}" placeholder="English label" onchange="shCvStudioCatalog('${kind}','${item.id}','en',this.value)"><button class="btn btn-danger btn-sm" onclick="shCvStudioDeleteCatalog('${kind}','${item.id}')">${item.legacyIndex === null ? 'حذف' : 'پنهان'}</button></div>`).join('')}</div></section>`;
          viewHtml = `<section class="admin-view-head cv-admin-head"><div><span>طراحی و کنترل کامل رزومه</span><h3>استودیوی رزومه‌ساز</h3><p>فونت، رنگ، عنوان، ترتیب، ستون، نمایش و فهرست گزینه‌های هر مرحله را از همین‌جا مدیریت کنید. تغییرها فوراً در پیش‌نمایش و PDF تمام اعضا اعمال می‌شود.</p></div><div class="admin-view-actions"><span class="admin-live"><i></i>تنظیمات زنده</span><button class="btn btn-danger btn-sm" onclick="shCvStudioReset()">↺ بازگردانی استاندارد</button></div></section>
          <section class="cv-admin-design"><div class="cv-admin-design-card"><span>🇮🇷 خروجی فارسی</span><b>فونت فارسی</b><select onchange="shCvStudioTypography('fa',this.value)">${fontOptions('fa')}</select><small style="font-family:'${cvFontFamily('fa', studio.typography.fa)}'">نمونه: رزومه حرفه‌ای مربی شنا</small></div><div class="cv-admin-design-card"><span>🇬🇧 English output</span><b>English font</b><select onchange="shCvStudioTypography('en',this.value)">${fontOptions('en')}</select><small dir="ltr" style="font-family:'${cvFontFamily('en', studio.typography.en)}'">Professional Swim Coach Resume</small></div><div class="cv-admin-design-card cv-admin-colors"><span>🎨 هویت بصری PDF</span><b>رنگ‌های خروجی</b><div>${[['text','متن'],['heading','عنوان'],['accent','تأکید'],['side','ستون کناری'],['muted','متن فرعی']].map(([key,label]) => `<label><i style="background:${studio.colors[key]}"></i>${label}<input type="color" value="${studio.colors[key]}" onchange="shCvStudioColor('${key}',this.value)"></label>`).join('')}</div></div></section>
          <section class="cv-admin-footer"><div><span>© امضا و برند خروجی</span><h4>پاورقی PDF</h4><p>متن پایین هر رزومه و نمایش یا پنهان‌بودن آن را کنترل کنید.</p></div><label class="cv-admin-toggle">نمایش <input type="checkbox" ${studio.footer.enabled ? 'checked' : ''} onchange="shCvStudioFooter('enabled',this.checked)"><i></i></label><input value="${esc(studio.footer.fa)}" placeholder="متن فارسی" onchange="shCvStudioFooter('fa',this.value)"><input dir="ltr" value="${esc(studio.footer.en)}" placeholder="English footer" onchange="shCvStudioFooter('en',this.value)"></section>
          <section class="cv-admin-stage"><div class="cv-admin-stage-head"><div><span>۱ تا ۵ · مراحل و بخش‌ها</span><h4>ساختار رزومه</h4><p>هر بخش را تغییر نام دهید، روشن/خاموش کنید، به ستون اصلی یا کناری ببرید، جابه‌جا کنید یا بخش متنی تازه بسازید.</p></div><button class="btn btn-primary btn-sm" onclick="shCvStudioAddSection()">＋ افزودن بخش متنی</button></div><div class="cv-admin-section-list">${sectionRows}</div></section>
          <section class="cv-admin-catalogs">${catalog('skills','🏊','مهارت‌ها','اعضا فقط آیتم‌های روشن را با سطح‌بندی انتخاب می‌کنند.')}${catalog('certs','🎖️','مدارک و دوره‌ها','عنوان فارسی و انگلیسی هر گواهی را ویرایش، پنهان یا اضافه کنید.')}</section>
          <section class="cv-admin-note"><b>✓ کنترل سراسری</b><span>آیتم‌های پایه با «پنهان» از سازنده و PDF حذف می‌شوند؛ آیتم‌ها و بخش‌های سفارشی را می‌توان کامل حذف کرد. داده‌های قبلی اعضا پاک نمی‌شود و اگر مورد دوباره فعال شود بازمی‌گردد.</span></section>`;
        } else if (view === 'publicprofiles') {
          viewHtml = '<div id="shPublicProfileReviewMount"></div>';
          setTimeout(() => { const mount = document.getElementById('shPublicProfileReviewMount'); if (mount && window.SH_PUBLIC_PROFILE_PANEL) window.SH_PUBLIC_PROFILE_PANEL.mountAdmin(mount); }, 0);
        } else if (view === 'activity') {
          viewHtml = '<div id="shActivityLogMount"></div>';
          setTimeout(() => { if (window.shActivityLogMount) window.shActivityLogMount(); }, 0);
        } else if (view === 'builder') {
          viewHtml = `<section class="admin-view-head"><div><span>Visual Website Builder</span><h3>ویرایشگر بصری حرفه‌ای وب‌سایت</h3><p>سایت واقعی بدون حذف در Canvas نمایش داده می‌شود. تغییرها ابتدا Draft هستند و فقط با Publish عمومی می‌شوند.</p></div><div class="admin-view-actions"><span class="admin-live"><i></i>Schema-based · امن</span><button class="btn btn-ghost btn-sm" onclick="shAdminView('design')">سیستم طراحی</button></div></section><div id="shPageBuilderMount"></div>`;
          setTimeout(() => { const mount = document.getElementById('shPageBuilderMount'); if (mount && window.SH_PAGE_BUILDER) window.SH_PAGE_BUILDER.mount(mount); }, 0);
        } else if (view === 'design') {
          viewHtml = designStudioHtml();
        } else if (view === 'experience') {
          viewHtml = `<section class="admin-view-head"><div><span>تجربه و محصول</span><h3>وب‌سایت، پنل و رسانه</h3><p>یک نقطه ورود روشن برای تنظیم تجربه عمومی، ساختار پنل و محتوای بصری برند.</p></div><div class="admin-view-actions"><button class="btn btn-primary btn-sm" onclick="shAdminView('builder')">◇ Visual Builder</button><button class="btn btn-ghost btn-sm" onclick="shAdminView('design')">استودیوی طراحی</button>${controlBtn('control-site','محیط پیکربندی')}</div></section><section class="admin-experience-grid"><article><span>🎨</span><h3>سیستم طراحی</h3><p>رنگ، تایپوگرافی فارسی، تراکم، شعاع و layout سیال سایت و پنل.</p><button class="btn btn-primary btn-sm" onclick="shAdminView('design')">ویرایش طراحی ←</button></article><article><span>🌐</span><h3>وب‌سایت عمومی</h3><p>نمایش، قیمت‌گذاری، فروش و قابلیت تماس برای هر بخش سایت.</p>${controlBtn('control-site','قواعد سایت')}</article><article><span>🧩</span><h3>پنل اعضا</h3><p>قواعد دسترسی اختصاصی، عنوان تب‌ها و تجربهٔ نقش‌های کسب‌وکاری.</p>${controlBtn('control-panel','قواعد پنل')}</article><article><span>✏️</span><h3>متن، رسانه و هویت</h3><p>عنوان‌های ناوبری، متن‌های کلیدی، هیرو و کتابخانه رسانه.</p>${controlBtn('control-content','ویرایش محتوا')}</article></section><section class="admin-process"><h3>راهنمای انتشار ایمن</h3><p>اول ظاهر را در استودیوی طراحی پیش‌نمایش کنید، سپس ذخیره و انتشار را بزنید. فقط tokenهای بصری منتشر می‌شوند؛ رسانه، محتوا و تنظیمات عملیاتی در محیط کنترل جداگانه باقی می‌مانند.</p></section>`;
        } else if (view === 'governance') {
          viewHtml = `<section class="admin-view-head"><div><span>حاکمیت سیستم</span><h3>امنیت، نقش‌ها و گزارش تغییرات</h3><p>ساختار پایهٔ عملیات در مقیاس تیم، چند مدیر و رشد سازمانی.</p></div><div class="admin-view-actions"><button class="btn btn-primary btn-sm" onclick="shAdminView('members')">مدیریت نقش‌ها</button></div></section><section class="admin-governance-grid modern"><article><b>👑 نقش‌های عملیاتی</b><span>مدیر سیستم، مدیر محتوا و مدیر کسب‌وکار؛ نقش هر عضو از فهرست اعضا قابل چرخه است.</span></article><article><b>🛡️ دسترسی حداقلی</b><span>تنظیمات حساس از محیط کنترل پیشرفته جدا شده و فقط برای مدیر سیستم نمایش داده می‌شود.</span></article><article><b>📋 ردگیری تغییرات</b><span>آخرین تغییرهای عضویت و اشتراک در همین مرکز ثبت می‌شود.</span></article><article><b>🔭 آمادگی رشد</b><span>طرح‌های سازمانی، گردش تأیید و اتصال آینده به پرداخت و گزارش‌گیری پیش‌بینی شده‌اند.</span></article></section><section class="panel admin-audit"><div class="admin-sec-head"><div><h3>آخرین رویدادهای مدیریتی</h3><p>گزارش محلی عملیات جاری مدیر؛ برای اتصال به گزارش سرور و تیم چندنفره آماده است.</p></div><span>${toFa(audits.length)} رویداد</span></div>${audits.length?audits.slice(0,10).map(a=>`<div class="admin-audit-row"><span>✓</span><div><b>${esc(a.action)}</b><small>${esc(a.subject)} · ${new Date(a.at).toLocaleString('fa-IR')}</small></div></div>`).join(''):'<div class="empty" style="padding:24px"><span class="e-ic">📋</span>هنوز تغییری در اعضا یا اشتراک‌ها ثبت نشده است.</div>'}</section>`;
        } else {
          viewHtml = `<section class="admin-overview-grid"><article class="admin-score primary"><span>👥</span><b>${toFa(members.length)}</b><small>عضو و کسب‌وکار ثبت‌شده</small><em>${toFa(activeMembers)} فعال</em></article><article class="admin-score warning"><span>🛡️</span><b>${toFa(pendingTotal)}</b><small>مورد منتظر تأیید</small><button onclick="shAdminView('approvals')">رسیدگی فوری ←</button></article><article class="admin-score"><span>✦</span><b>${toFa(planCount('حرفه‌ای') + planCount('سازمانی'))}</b><small>اشتراک رشد و سازمانی</small><button onclick="shAdminView('plans')">مشاهده اشتراک‌ها ←</button></article><article class="admin-score"><span>🌐</span><b>${toFa(CFG_SECTIONS.length)}</b><small>بخش قابل کنترل سایت</small><button onclick="shAdminView('experience')">تنظیم تجربه ←</button></article></section><section class="admin-command-deck"><div class="admin-sec-head"><div><h3>فرمان‌های روزانه</h3><p>کارهای مهم مدیر را بدون گم شدن بین تنظیمات، در جای درست انجام دهید.</p></div><span>مرکز عملیات</span></div><div>${[['members','👥','اعضا','نقش، وضعیت و دسترسی'],['approvals','🛡️','تأییدها',pendingTotal ? toFa(pendingTotal)+' مورد نیازمند بررسی':'صف تأیید پاک است'],['plans','✦','اشتراک‌ها','سطح، تمدید و رشد کسب‌وکار'],['experience','🌐','تجربه محصول','وب‌سایت، پنل و محتوا'],['builder','◇','Website Builder','Canvas، Draft و انتشار کنترل‌شده'],['design','🎨','طراحی','رنگ، فونت، layout و دسترس‌پذیری'],['cvstudio','📄','رزومه‌ساز','قالب، فونت، رنگ و مراحل'],['governance','📋','حاکمیت','امنیت و گزارش تغییرات']].map(([id,ic,t,sub])=>`<button onclick="shAdminView('${id}')"><span>${ic}</span><b>${t}</b><small>${sub}</small><i>←</i></button>`).join('')}</div></section><section class="admin-priority"><div><span>اولویت امروز</span><h3>${pendingTotal ? 'رسیدگی به صف تأیید محتوا' : 'مرکز کنترل در وضعیت پایدار است'}</h3><p>${pendingTotal ? 'موارد معطل‌شده روی کیفیت بازار، رزومه و محتوای عمومی اثر می‌گذارند. ابتدا صف تأیید را بررسی کنید.' : 'اکنون می‌توانید روی رشد اعضا، اشتراک‌ها و بهبود تجربهٔ محصول تمرکز کنید.'}</p></div><button class="btn btn-primary" onclick="shAdminView('${pendingTotal?'approvals':'experience'}')">${pendingTotal?'باز کردن تأییدها':'باز کردن تجربه محصول'} ←</button></section>`;
        }
        body = heroBar('👑 مرکز مدیریت سیستم', 'عملیات، اعضا، درآمد، تجربه محصول و حاکمیت استخر جو | ESTAKHRJO در یک ساختار منظم', `<span class="ph-chip">${toFa(members.length)} عضو کسب‌وکار</span><span class="ph-chip ${pendingTotal ? 'gold' : 'green'}">${pendingTotal ? '⏳ ' + toFa(pendingTotal) + ' مورد منتظر اقدام' : '✓ عملیات پایدار'}</span>`, IMG('panel-hero')) + `<div class="admin-shell"><nav class="admin-nav" aria-label="بخش‌های مدیریت">${adminGroupsHtml(view, pending)}</nav><main class="admin-workspace">${viewHtml}</main></div>`;
      }
    }
     else if (tab === 'control') {
      if (u.u !== 'admin') {
        body = `<div class="panel" style="padding:60px;text-align:center"><span style="font-size:44px">🔒</span><h3 style="margin:14px 0 6px">دسترسی محدود</h3><p style="color:var(--muted);font-size:13px">این بخش فقط برای مدیر سیستم است</p></div>`;
      } else {
        const cfg = siteCfg.get();
        const accs = cfgAccounts();
        const secLbl = Object.fromEntries(CFG_SECTIONS);
        const triBtn = (user, sec, key, kl) => {
          const v = ((cfg.users[user] || {})[sec] || {})[key];
          const cls = v === 1 ? 'ok' : v === 0 ? 'no' : '';
          const ic = v === 1 ? '✅' : v === 0 ? '🚫' : '♻️';
          return `<button class="cfg-tri ${cls}" title="${kl} — چرخه: پیش‌فرض / اجازه / ممنوع" onclick="shCfgCycle('${String(user || '').replace(/'/g, '')}','${sec}','${key}')">${ic}<small>${kl}</small></button>`;
        };
        body = heroBar('⚙️ محیط کنترل پیشرفته', 'تنظیمات عملیاتی سایت و پنل، قوانین دسترسی و صف تأیید محتوا', `<span class="ph-chip green">👑 دسترسی کامل مدیر</span>`, IMG('panel-hero')) +
        `<div class="p-topbar"><div class="p-title"></div><span class="mini-tag" style="background:rgba(52,211,153,.13);color:#34d399;border:1px solid rgba(52,211,153,.4)">مرکز عملیات مدیر سیستم</span></div>
        <div class="panel" id="control-site">
          <h3 style="font-size:15px;margin-bottom:4px">🌐 تنظیمات سراسری وب‌سایت (پیش‌فرض برای همه)</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px">کنترل نمایش، قیمت و فروش خدمات؛ هر تغییر بلافاصله روی وب‌سایت اعمال می‌شود</p>
          <div class="cfg-head"><span>بخش سایت</span>${CFG_KEYS.map(([, l]) => `<span>${l}</span>`).join('')}<span>حالت</span></div>
          ${CFG_SECTIONS.map(([sec, lbl]) => `<div class="cfg-row">
            <span class="cfg-sec">${lbl}</span>
            ${CFG_KEYS.map(([key]) => `<span><button class="cfg-tgl ${siteCfg.val(sec, key) ? 'on' : ''}" onclick="shCfgToggle('${sec}','${key}')" aria-label="${key}"><i></i></button></span>`).join('')}
            <span class="cfg-mode ${siteCfg.mode(sec)}">${siteCfg.mode(sec) === 'sell' ? '🛒 فروشی' : siteCfg.mode(sec) === 'price' ? '💰 نمایش قیمت' : '📞 فقط تماس'}</span>
          </div>`).join('')}
        </div>
        <div class="panel" style="margin-top:20px" id="control-panel">
          <h3 style="font-size:15px;margin-bottom:4px">🧩 تنظیمات پنل و قواعد دسترسی اعضا</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px">برای هر عضو، سطح دسترسی پنل را دقیق کنترل کنید. چرخه: ♻️ پیش‌فرض → ✅ اجازه ویژه → 🚫 ممنوع ویژه</p>
          ${accs.map(a => {
            const hasOv = cfg.users[a.name] && Object.keys(cfg.users[a.name]).length;
            return `<div class="cfg-acc">
            <div class="cfg-acc-head"><span class="cfg-acc-ic">${avatarMarkup(a.ic, a.name)}</span><div><b style="font-size:13.5px">${esc(a.name)}</b><small>${a.role}</small></div>${hasOv ? '<span class="cfg-ov-chip">⭐ قوانین شخصی‌سازی‌شده دارد</span>' : ''}</div>
            ${a.secs.map(sec => `<div class="cfg-acc-row"><span class="cfg-acc-sec">${secLbl[sec]}</span>${CFG_KEYS.map(([key, kl]) => triBtn(a.name, sec, key, kl)).join('')}</div>`).join('')}
          </div>`;
          }).join('')}
        </div>

        <div class="panel" style="margin-top:20px" id="control-moderation">
          <h3 style="font-size:15px;margin-bottom:4px">🛡️ صف تأیید محتوا</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">هیچ محتوای کاربر (آگهی، کالا/خدمت تأمین‌کننده، عکس) بدون تأیید شما منتشر نمی‌شود</p>
          ${(() => {
            const pendAds = myAds.get().filter(x => x.status === 'pending');
            const pendB2B = b2bStore.get().filter(x => x.status === 'pending');
            const pendCv = cvOfferStore.get().filter(x => !x.ok);
            const pendSub = subStore.get().filter(x => !x.ok);
            const rows = [];
            pendCv.forEach(o => rows.push(`<div class="pl-row"><span class="pl-ic">📄</span><div class="pl-t"><b>${esc(o.name)} — رزومه مربی</b><span>📍 ${esc(o.city || '—')} • ${o.targets && o.targets.length ? 'ارسال به ' + toFa(o.targets.length) + ' مالک منتخب: ' + esc(o.targets.map(t => t.owner).join('، ')) : 'ارسال به مالکان استخر'} • ${esc((o.skills || []).filter(Boolean).slice(0, 2).join('، '))}</span></div><div class="pl-a"><button class="btn btn-primary btn-sm" onclick="shMod2('cv','${o.id}','approve')">✅ تأیید و ارسال</button><button class="btn btn-danger btn-sm" onclick="shMod2('cv','${o.id}','reject')">🗑️ رد</button></div></div>`));
            pendSub.forEach(a => rows.push(`<div class="pl-row"><span class="pl-ic">🔁</span><div class="pl-t"><b>جایگزینی: ${esc(a.coach)} @ ${esc(a.pool)}</b><span>${toFa(a.shifts)} شیفت • ${money(a.price)} • ${esc(a.sess)} • ${a.phone ? '📞 دارد' : ''}</span></div><div class="pl-a"><button class="btn btn-primary btn-sm" onclick="shMod2('sub','${a.id}','approve')">✅ تأیید و انتشار</button><button class="btn btn-danger btn-sm" onclick="shMod2('sub','${a.id}','reject')">🗑️ رد</button></div></div>`));
            jobStore.get().filter(x => x.status === 'pending').forEach(a => rows.push(`<div class="pl-row"><span class="pl-ic">📨</span><div class="pl-t"><b>ارسال رزومه: ${esc((a.cv && a.cv.personal && a.cv.personal.name) || 'عضو')}</b><span>برای «${esc(a.title || '')}» در ${esc(a.pool_name || 'مجموعه')} · در انتظار بررسی مدیر</span></div><div class="pl-a"><button class="btn btn-primary btn-sm" onclick="shJobModerate('${a.id}','approve')">✅ تأیید و ارسال</button><button class="btn btn-danger btn-sm" onclick="shJobModerate('${a.id}','reject')">🗑️ رد</button></div></div>`));
            pendAds.forEach(a => rows.push(`<div class="pl-row"><span class="pl-ic">${esc(a.image || '🛍️')}</span><div class="pl-t"><b>${esc(a.title)} — ${money(a.price || 0)}</b><span>آگهی اعضا • ${esc(a.user_name || '')} • 📍 ${esc(a.city || '')}</span></div><div class="pl-a"><button class="btn btn-primary btn-sm" onclick="shMod('ad','${a.id}','approve')">✅ تأیید و انتشار</button><button class="btn btn-danger btn-sm" onclick="shMod('ad','${a.id}','reject')">🗑️ رد</button></div></div>`));
            pendB2B.forEach(b => rows.push(`<div class="pl-row"><span class="pl-ic" style="overflow:hidden">${/^data:image|^https?:/.test(b.img || '') ? `<img src="${esc(b.img)}" style="width:100%;height:100%;object-fit:cover;border-radius:13px">` : esc(b.img || '📦')}</span><div class="pl-t"><b>${esc(b.title)}${b.price ? ' — ' + money(b.price) : ''}</b><span>فروشگاه تأمین‌کنندگان • ${esc(b.sup)} • ${esc(b.cat)}${b.desc ? ' • ' + esc(b.desc) : ''}</span></div><div class="pl-a"><button class="btn btn-primary btn-sm" onclick="shMod('b2b','${b.id}','approve')">✅ تأیید و انتشار</button><button class="btn btn-danger btn-sm" onclick="shMod('b2b','${b.id}','reject')">🗑️ رد</button></div></div>`));
            return rows.length ? rows.join('') : '<div class="empty" style="padding:22px"><span class="e-ic">✅</span>صف تأیید خالی است — همه موردها تأیید شده‌اند</div>';
          })()}
        </div>

        <div class="panel" style="margin-top:20px">
          <h3 style="font-size:15px;margin-bottom:4px">👁️ نمایش بخش‌های صفحه اصلی</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">هر بخش را می‌توانید موقتاً مخفی و هر زمان دوباره فعال کنید</p>
          ${[['home_quick', '🎯 ردیف دسته‌بندی سریع (آیکن‌های گرد زیر هیرو)'], ['announce', '📢 نوار اطلاع‌رسانی بالای سایت']].map(([k, lbl]) => `
            <div class="ui-row"><span>${lbl}</span><button class="cfg-tgl ${uiFlags.on(k) ? 'on' : ''}" onclick="shUiToggle('${k}',{checked:!${uiFlags.on(k)}});this.classList.toggle('on')" aria-label="toggle"><i></i></button></div>`).join('')}
        </div>

        <div class="panel" style="margin-top:20px" id="control-content">
          <h3 style="font-size:15px;margin-bottom:4px">✏️ نام‌ها و متن‌های قابل‌ویرایش</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">هر عنوانی در سایت و پنل را اینجا تغییر دهید — خالی بگذارید تا به پیش‌فرض برگردد</p>
          <div class="lbl-grid">
            ${LABEL_DEFS.map(([key, def, grp]) => `<label class="lbl-row"><span class="lbl-key">${grp} <small>${key}</small></span><input value="${esc(LBL(key))}" placeholder="${esc(def)}" onchange="shSetLabel('${key}', this.value);this.value=this.value||'${esc(def)}'"></label>`).join('')}
          </div>
        </div>

        <div class="panel" style="margin-top:20px" id="control-media">
          <h3 style="font-size:15px;margin-bottom:4px">🖼️ تصاویر هدرها و هیروها</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">برای هر تصویر: آدرس (URL) بدهید یا فایل آپلود کنید — با «↺» به تصویر پیش‌فرض برمی‌گردد</p>
          <div class="img-grid">
            ${IMG_DEFS.map(([key, def, lbl]) => { const cur = IMG(key); const custom = imgStore.get()[key]; return `
            <div class="img-row">
              <div class="img-pv"><img src="${esc(cur)}" alt="" onerror="this.parentElement.innerHTML='🖼️'">${custom ? '<span class="img-custom">سفارشی</span>' : ''}</div>
              <div style="flex:1;min-width:0">
                <b style="font-size:11.5px">${lbl}</b>
                <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
                  <input class="img-url" placeholder="URL تصویر WebP یا ایموجی…" value="${custom && !custom.startsWith('data:') ? esc(custom) : ''}" onchange="shSetImg('${key}', this.value)">
                  <label class="btn btn-ghost btn-sm" style="cursor:pointer">📤<input type="file" accept="image/*" style="display:none" onchange="shImgUpload('${key}', this)"></label>
                  <button class="btn btn-ghost btn-sm" onclick="shSetImg('${key}', '')">↺</button>
                </div>
              </div>
            </div>`; }).join('')}
          </div>
        </div>

        <div class="panel" style="margin-top:20px" id="mediaLibPanel">
          <h3 style="font-size:15px;margin-bottom:4px">🗂️ کتابخانه رسانه (تصاویر بهینه‌شده)</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">هر پروندهٔ تصویر پیش از ذخیره به WebP تبدیل می‌شود. در این نسخه، محتوای WebP همراه با نام فایل استاندارد در دادهٔ پنل نگهداری می‌شود؛ اتصال ذخیره‌سازی شیء در انتشار بک‌اند دنبال خواهد شد.</p>
          ${(() => { const arr = mediaLib.get(); return arr.length ? arr.map(m2 => `<div class="mu-row">
            <div class="mu-pv"><img src="${esc(m2.url)}" alt="" onerror="this.parentElement.innerHTML='🖼️'"></div>
            <div class="mu-mid"><b>${esc(m2.filename || m2.id)}</b>دسته: ${esc(m2.cat)} • مرجع: ${esc(m2.ref)} • ${toFa(m2.w)}×${toFa(m2.h)} • ${m2.fmt}</div>
            <span class="mu-size">${toFa(m2.kb)} KB</span>
            <button class="btn btn-danger btn-sm" onclick="shMediaDel('${m2.id}')">🗑️</button>
          </div>`).join('') : '<div class="empty" style="padding:18px"><span class="e-ic">🗂️</span>هنوز تصویری آپلود نشده است</div>'; })()}
        </div>`;
      }
    }
    return standalone ? body : (mobTop(tab) + body);
  }

  /* ---------- سایدبار راست استاتیک (هویت + منو + خدمات سایت) ---------- */
  function dashSideHtml(tab, u) {
    const now = new Date();
    const faShort = now.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
    const faTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const myPresence = presenceStore.get();
    const statusMap = {
      pool: { st: 'verified', sub: 'مدیر استخر تأییدشده ✓', ic: '🛡️' }, coach: { st: 'verified', sub: 'مربی رسمی استخر جو | ESTAKHRJO ✓', ic: '🏆' },
      supplier: { st: 'pending', sub: 'مدارک تأمین‌کننده در حال بررسی…', ic: '🏭' }, admin: { st: 'verified', sub: 'دسترسی کامل مدیر سیستم', ic: '👑' }, demo: { st: 'verified', sub: 'عضویت فعال استخر جو | ESTAKHRJO', ic: '✓' },
    };
    const m = statusMap[u.u] || statusMap.demo;
    const heroTitle = { pool: 'پنل مدیریت استخر', coach: 'پنل مربی شنا', admin: 'پنل مدیر سیستم', supplier: 'پنل تأمین‌کننده', demo: 'پنل کاربری' }[u.u] || 'پنل کاربری';
    const myAdsList = myAds.get();
    const readMp = (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })();
    const unCnt = supportMemberUnread();
    const btn = (t, ic, lbl, extra) => {
      // The panel now renders only what this account's group is granted.
      // The server sends the list and re-checks it on every call; this is the
      // presentation half of that decision, not the decision itself.
      if (!shCan(t)) return '';
      const ov = labelStore.get()['tab-' + t];
      if (ov) { const parts = ov.split(' '); ic = parts[0]; lbl = parts.slice(1).join(' ') || lbl; }
      return `<button class="p-item ${tab === t ? 'on' : ''}" data-tab="${t}" onclick="shDashTab('${t}')"><span class="pi-ic">${ic}</span>${lbl}${extra || ''}</button>`;
    };
    // Management and advanced settings moved to their own host. An admin gets
    // a link out, not the console embedded inside the member panel.
    const roleBusinessNav = u.u === 'admin' ? `<a class="p-item p-item-out" href="${ADMIN_CONSOLE_URL}"><span class="pi-ic">✦</span>کنسول مدیریت <span class="pi-badge" style="background:var(--gold);color:#3d2b05">↗</span></a>${btn('b2b', '⬡', 'شبکه تأمین B2B')}${btn('jobs', '⌁', 'آگهی‌های استخدام')}${btn('resumes', '▤', 'برد رزومه')}`
      : u.u === 'pool' ? `${btn('venues', '▰', 'استخرهای من', ' <span class="pi-badge" style="background:var(--gold);color:#3d2b05">مدیریت</span>')}${btn('b2b', '⬡', 'شبکه تأمین B2B')}${btn('jobs', '⌁', 'آگهی‌های استخدام')}${btn('resumes', '▤', 'برد رزومه')}`
      : u.u === 'supplier' ? `${btn('catalog', '▣', 'کالا و خدمات من', ' <span class="pi-badge" style="background:var(--gold);color:#3d2b05">مدیریت</span>')}${btn('b2b', '⬡', 'شبکه تأمین B2B')}${btn('jobs', '⌁', 'آگهی‌های استخدام')}${btn('resumes', '▤', 'برد رزومه')}`
      : u.u === 'coach' ? `${btn('work', '≋', 'محل کار و سانس‌ها', ' <span class="pi-badge" style="background:var(--gold);color:#3d2b05">جدید</span>')}` : '';
    const businessNav = `${roleBusinessNav}${btn('shop', '▣', 'فروشگاه تأمین‌کنندگان')}`;
    const group = (title, html) => html.trim() ? `<div class="p-nav-lbl">${title}</div>${html}` : '';
    return `
      <div class="p-nav-lbl p-nav-top">پنل من</div>
      ${btn('overview', '◈', 'داشبورد')}
      ${btn('profile', '◌', 'پروفایل من')}
      ${btn('public_profile', '◇', 'صفحه عمومی من', ' <span class="pi-badge" style="background:var(--cyan);color:#043044">جدید</span>')}
      ${btn('inbox', '🎧', 'پشتیبانی', unCnt ? ` <span class="pi-badge" data-support-unread>${toFa(unCnt)}</span>` : ' <span class="pi-badge" data-support-unread style="display:none"></span>')}
      ${group('کسب و کار', businessNav)}
      ${group('فعالیت', `${btn('bookings', '◉', 'بلیت‌های من')}
      ${btn('ads', '◇', 'آگهی‌های من', myAdsList.length ? ` <span class="pi-badge">${toFa(myAdsList.length)}</span>` : '')}
      ${btn('cv', '▤', 'رزومه‌ساز هوشمند')}
      ${btn('sub', '↻', 'آگهی جایگزینی')}
      ${btn('fav', '♡', 'علاقه‌مندی‌ها')}`)}
      ${group('سلامت و رسانه', `${btn('hydro', '✚', 'هیدروتراپی')}${btn('events', '✺', 'رویدادها')}${btn('articles', '≡', 'مجله شنا')}`)}
      ${group('مالی', btn('wallet', '◌', 'کیف پول'))}
      <div class="p-side-foot p-side-profile">
        <div class="p-bottom-person"><span class="pb-avatar">${avatarMarkup(u.avatar, u.name)}</span><div><b>${esc(u.name)}</b><small>${heroTitle}</small></div><span class="p-verify ${m.st}">${m.st === 'verified' ? '✓' : '⏳'}</span></div>
        <div class="p-bottom-meta"><span class="p-date-time">📅 ${faShort} · 🕐 ${faTime}</span><span class="p-system ${myPresence === 'online' ? '' : 'offline'}" data-sidebar-presence><i></i>${myPresence === 'online' ? 'سیستم آنلاین' : 'سیستم آفلاین'}</span></div>
        <div class="p-bottom-status"><span>${m.ic} ${m.st === 'verified' ? 'تأیید شده' : 'در انتظار تأیید'}</span><small>⭐ ${toFa(u.points || 0)} امتیاز</small></div>
        <div class="p-bottom-actions"><button onclick="location.href='https://estakhrjo.ir/index.html'">⌂ بازگشت سایت</button><button class="exit" onclick="shLogout()">↪ خروج</button></div>
      </div>`;
  }

  /* ---------- صندوق پیام تلگرامی (پنل) ---------- */
  function renderTgRoom(tid) {
    const room = document.getElementById('tgRoom');
    if (!room) return;
    const peer = chatStore.peers().find(pp => pp.id === tid) || { name: 'گفتگو', avatar: '💬', sub: '' };
    const online = isPeerOnline(peer); const msgs = chatMsgs(tid);
    room.innerHTML = `
      <div class="tg-room-head">
        <button class="tg-back" onclick="shTgBack()" aria-label="بازگشت">→</button>
        <div class="tg-av">${esc(peer.avatar)}${online ? '<span class="tg-on"></span>' : '<span class="tg-off"></span>'}</div>
        <div style="flex:1;min-width:0"><div class="tg-room-name">${esc(peer.name)}</div><div class="tg-room-sub ${online ? '' : 'off'}">${online ? 'آنلاین' : 'آفلاین'} · ${esc(peer.sub)}</div></div>
        <span class="tg-hact" title="تماس صوتی">📞</span><span class="tg-hact" title="بیشتر">⋮</span>
      </div>
      <div class="tg-body" id="tgBody">
        <div class="tg-day">— امروز —</div>
        ${msgs.length ? msgs.map(mm => `<div class="msg ${mm.me ? 'msg-out' : 'msg-in'}${mm.attachment ? ' msg-attachment' : ''}"><span class="msg-txt">${esc(mm.body)}</span>${mm.attachment ? `<small class="msg-att-note">${esc(mm.attachment)}</small>` : ''}<span class="msg-meta">${new Date(mm.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}${mm.me ? `<i class="tk ${mm.st === 2 ? 'tk2' : ''}">${mm.st === 2 ? '✓✓' : '✓'}</i>` : ''}</span></div>`).join('') : '<div class="tg-thread-empty"><span>💬</span><b>گفتگو را آغاز کنید</b><p>پیام شما به‌صورت خصوصی در حساب ابری استخر جو | ESTAKHRJO ثبت و برای مخاطب ارسال می‌شود.</p></div>'}
      </div>
      <div class="tg-input-bar">
        <button class="tg-hact tg-composer-btn" onclick="shEmojiToggle()" title="ایموجی" aria-label="ایموجی">😊</button>
        <div class="tg-composer-field"><input id="chatInput" placeholder="پیام بنویسید…" onkeydown="if(event.key==='Enter')shChatSend('${tid}')"><div class="tg-emoji-pop" id="tgEmojiPop" hidden></div></div>
        <button class="tg-hact tg-composer-btn" onclick="shAttachMenu('${tid}')" title="پیوست" aria-label="پیوست">📎</button>
        <div class="tg-attach-pop" id="tgAttachPop" hidden></div>
        <button class="tg-send" onclick="shChatSend('${tid}')" aria-label="ارسال">➤</button>
      </div>`;
    const b = document.getElementById('tgBody');
    if (b) { b.scrollTop = b.scrollHeight; }
    const inp = document.getElementById('chatInput');
    if (inp && matchMedia('(min-width: 901px)').matches) inp.focus();
  }
  function tgRoomPortal(on) {
    const room = document.getElementById('tgRoom');
    if (!room) return;
    const mob = matchMedia('(max-width:900px)').matches;
    if (on && mob && room.parentElement !== document.body) { room.__ph = room.parentElement; document.body.appendChild(room); room.classList.add('in-room'); }
    else if (!on && room.parentElement === document.body && room.__ph) { room.__ph.appendChild(room); room.classList.remove('in-room'); delete room.__ph; }
  }
  window.shTgOpen = function (tid, skipUrl) {
    const peer = chatStore.peers().find(p => p.id === tid);
    if (!peer) { toasglass('مخاطب گفتگو پیدا نشد'); return; }
    const hasPriorThread = cloudChatEnabled() ? cloudChatMessages(tid).length > 0 : !!chatStore.all()[tid];
    if (!directMessageAllowed(peer) && !hasPriorThread) { toasglass('این عضو دریافت پیام مستقیم را غیرفعال کرده است'); return; }
    if (!skipUrl) history.replaceState(null, '', 'dashboard.html?build=ppf8&tab=inbox&to=' + encodeURIComponent(tid));
    const rm = (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })();
    rm[tid] = incomingCount(tid); localStorage.setItem('sh_chat_read', JSON.stringify(rm));
    window.__tgOpenTid = tid;
    const sh = document.querySelector('.tg-shell'); if (sh) sh.classList.add('in-room');
    renderTgRoom(tid); refreshTgList(); tgRoomPortal(true); syncChatUnreadUi();
    if (cloudChatEnabled()) loadCloudThread(tid).then(ok2 => { if (ok2 && window.__tgOpenTid === tid) { renderTgRoom(tid); refreshTgList(); } });
  };
  window.shTgBack = function () {
    tgRoomPortal(false); window.__tgOpenTid = '';
    history.replaceState(null, '', 'dashboard.html?build=ppf8&tab=inbox');
    const sh = document.querySelector('.tg-shell'); if (sh) sh.classList.remove('in-room');
  };
  window.shTgFilter = function (q) {
    document.querySelectorAll('.tg-item').forEach(el => { el.style.display = (el.dataset.name || '').includes(q.trim()) ? '' : 'none'; });
  };
  window.shTgStartMessage = function (place) {
    const rec = document.getElementById(place === 'mobile' ? 'tgMobileRecipient' : 'tgNewRecipient'); const draft = document.getElementById(place === 'mobile' ? 'tgMobileBody' : 'tgNewBody');
    const tid = rec && rec.value; const body = draft && draft.value.trim();
    if (!tid) { toasglass('مخاطب را انتخاب کنید'); return; }
    if (!body) { toasglass('پیام خود را بنویسید'); return; }
    window.shTgOpen(tid);
    const input = document.getElementById('chatInput');
    if (input) { input.value = body; window.shChatSend(tid); }
  };

  // انتخاب‌گر دسته‌بندی‌شده با حس‌وحال واتساپ؛ همه کلیدها Unicode هستند و آفلاین کار می‌کنند.
  const TG_EMOJIS = {
    '😊': ['😀','😃','😄','😁','😆','🥹','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😎','🤗','🤔','🫡','😐','😴','😭','😡','🤯','🥳','👍','👎','👏','🙏','❤️','🔥','✨','🎉'],
    '👋': ['👋','🤝','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🫶','💪','👊','🤛','🤜','👋','🧑‍🏫','🏊','🏊‍♀️','🏊‍♂️','🤽','🤽‍♀️','🧑‍💼','👩‍💼','👨‍💼','🧑‍🔧','👩‍⚕️','👨‍⚕️'],
    '🐬': ['🐬','🐳','🐋','🦈','🐟','🐠','🦭','🦦','🪼','🐙','🦀','🐢','🌊','💧','🏝️','🌴','☀️','🌈','❄️','🌙','⭐','🌟','🌸','🌹','🌿','🍀','🌳','🔥','⚡','🌪️','🏔️','🏖️'],
    '🍉': ['🍏','🍎','🍐','🍊','🍋','🍉','🍇','🍓','🥝','🍒','🥥','🥑','🥗','🍔','🍟','🍕','🍣','🍱','🍪','🍰','🧁','☕','🫖','🥤','🧃','🍫','🍯','🥜','🍳','🥘','🥙','🍽️'],
    '⚽': ['🏊','🏊‍♀️','🏊‍♂️','🤽','🤽‍♀️','🏆','🥇','🥈','🥉','🎖️','🏅','⚽','🏀','🏐','🎾','🏓','🥊','🧘','🚴','🎯','🎮','🎵','🎧','🎬','📚','🎨','🎁','🎈','🛟','⏱️','📅','🚀'],
    '💡': ['💬','📩','📨','📞','📱','💻','⌚','📷','🎥','💡','🔔','🔒','🔑','📎','📄','📦','🧰','⚙️','✅','❌','⚠️','❓','❗','💯','💰','🛒','🏢','📍','🗺️','↩️','➡️','♻️']
  };
  let tgEmojiTab = '😊';
  function tgEmojiMarkup() { return `<div class="tg-emoji-tabs" data-ej-preserve-emoji>${Object.keys(TG_EMOJIS).map(k => `<button class="${k === tgEmojiTab ? 'on' : ''}" onclick="shEmojiTab('${k}')">${k}</button>`).join('')}</div><div class="tg-emoji-grid" data-ej-preserve-emoji>${TG_EMOJIS[tgEmojiTab].map(e => `<button onclick="shEmojiAdd('${e}')">${e}</button>`).join('')}</div>`; }
  window.shEmojiToggle = function () { const p = document.getElementById('tgEmojiPop'); if (!p) return; p.hidden = !p.hidden; const a = document.getElementById('tgAttachPop'); if (a) a.hidden = true; if (!p.hidden) p.innerHTML = tgEmojiMarkup(); };
  window.shEmojiTab = function (tab) { tgEmojiTab = tab; const p = document.getElementById('tgEmojiPop'); if (p) p.innerHTML = tgEmojiMarkup(); };
  window.shEmojiAdd = function (emoji) { const input = document.getElementById('chatInput'); if (!input) return; input.value += emoji; input.focus(); };
  function attachChoices() {
    const role = (me.get() || {}).u || 'demo';
    if (role === 'coach') return [{ type: 'cv', icon: '📄', title: 'رزومه من', sub: 'فقط رزومه حرفه‌ای مربی' }];
    if (role === 'supplier') return [{ type: 'product', icon: '📦', title: 'محصول', sub: 'از کالاهای تأییدشده' }, { type: 'service', icon: '🧰', title: 'خدمت', sub: 'از خدمات تأییدشده' }];
    if (role === 'pool') return [{ type: 'service', icon: '🧰', title: 'خدمت استخر', sub: 'خدمت ثبت‌شده و تأییدشده' }];
    return [];
  }
  window.shAttachMenu = function (tid) {
    const p = document.getElementById('tgAttachPop'); if (!p) return; const e = document.getElementById('tgEmojiPop'); if (e) e.hidden = true;
    p.hidden = !p.hidden; if (p.hidden) return; const opts = attachChoices();
    p.innerHTML = opts.length ? `<b>پیوست مجاز برای نقش شما</b>${opts.map(x => `<button onclick="shAttachChoice('${tid}','${x.type}')"><span>${x.icon}</span><span><strong>${x.title}</strong><small>${x.sub}</small></span></button>`).join('')}<small class="tg-att-safe">🛡️ هر پیوست قبل از ارسال، توسط مدیر بررسی می‌شود.</small>` : '<div class="tg-att-empty">برای نقش فعلی شما پیوست مجاز تعریف نشده است.</div>';
  };
  window.shAttachChoice = function (tid, type) {
    // Never synthesize a browser-local message: that was the source of shared
    // historical threads between accounts. Secure attachment delivery is not
    // enabled until it has a server-side, participant-scoped moderation flow.
    const pop = document.getElementById('tgAttachPop'); if (pop) pop.hidden = true;
    toasglass('پیوست خصوصی هنوز فعال نیست؛ پیام متنی فقط بین همان دو حساب ارسال می‌شود.');
  };

  /* ---------- کروم موبایل پنل: تب‌بار پایین + شیت منوی کامل ---------- */
  function dashMobileChrome(tab, u) {
    const statusMap = {
      pool: { st: 'verified', sub: 'مدیر استخر تأییدشده ✓', ic: '🛡️' },
      coach: { st: 'verified', sub: 'مربی رسمی استخر جو | ESTAKHRJO ✓', ic: '🏆' },
      supplier: { st: 'pending', sub: 'مدارک در حال بررسی…', ic: '🏭' },
      admin: { st: 'verified', sub: 'دسترسی کامل مدیر', ic: '👑' },
      demo: { st: 'verified', sub: 'عضویت فعال', ic: '✓' },
    };
    const m = statusMap[u.u] || statusMap.demo;
    const faShort = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
    const faTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const myPresence = presenceStore.get();
    const fab = {
      coach: { act: "shDashTab('work')", ic: '🏊', lbl: 'سانس‌ها' },
      pool: { act: "shDashTab('venues')", ic: '🏊', lbl: 'استخرهای من' },
      admin: { act: "shDashTab('management')", ic: '👑', lbl: 'مدیریت' },
      supplier: { act: "shDashTab('catalog')", ic: '📦', lbl: 'کاتالوگ من' },
      demo: { act: "location.href='https://estakhrjo.ir/pools.html'", ic: '🏊', lbl: 'رزرو' },
    }[u.u] || { act: "location.href='https://estakhrjo.ir/pools.html'", ic: '🏊', lbl: 'رزرو' };
    const gi = (t, ic, lbl) => { if (!shCan(t)) return ''; const ov = labelStore.get()['tab-' + t]; if (ov) { const p = ov.split(' '); ic = p[0]; lbl = p.slice(1).join(' ') || lbl; } return `<button class="pms-item ${tab === t ? 'on' : ''}" data-tab="${t}" onclick="shMobSheet(false);shDashTab('${t}')"><span>${ic}</span>${lbl}</button>`; };
    /* The bar is whatever the operator chose, narrowed to what this account
       may actually open, then trimmed to the chosen count. "بیشتر" only
       appears when there is genuinely something else to reach. */
    const navCfg = shBottomNav();
    const barItems = navCfg.items.filter(shCan).slice(0, navCfg.max);
    const sheetCount = SH_SHEET_FEATURES.filter(shCan).length + (shCan('site_links') ? 1 : 0);
    const showMore = sheetCount > barItems.length;
    const mi = t => {
      const d = SH_TAB_META[t]; if (!d) return '';
      const badge = t === 'inbox'
        ? `<b class="pm-badge" data-support-unread ${supportMemberUnread() ? '' : 'style="display:none"'}>${toFa(supportMemberUnread())}</b>` : '';
      return `<button class="pm-item ${tab === t ? 'on' : ''}" data-tab="${t}" onclick="shDashTab('${t}')"><span>${d[0]}</span><small>${d[1]}</small>${badge}</button>`;
    };
    return `
    <nav class="p-mbar">
      ${barItems.map(mi).join('')}
      ${shCan('site_links') ? `<button class="pm-fab" onclick="${fab.act}" aria-label="${fab.lbl}"><span>${fab.ic}</span><small>${fab.lbl}</small></button>` : ''}
      ${showMore ? `<button class="pm-item" onclick="shMobSheet(true)"><span>☰</span><small>بیشتر</small></button>` : ''}
    </nav>
    <div class="p-msheet-bg" id="mSheetBg" onclick="shMobSheet(false)"></div>
    <div class="p-msheet" id="mSheet">
      <div class="pms-grab"></div>
      <div class="pms-lbl">📂 بخش‌های پنل</div>
      <div class="pms-grid">
        ${gi('overview', '📊', 'داشبورد')}
        ${gi('profile', '◌', 'پروفایل من')}
        ${gi('public_profile', '◇', 'صفحه عمومی من')}
        ${gi('inbox', '🎧', 'پشتیبانی')}
        ${u.u === 'admin' ? `<a class="pms-item" href="${ADMIN_CONSOLE_URL}"><span>👑</span>کنسول مدیریت ↗</a>` : ''}
        ${u.u === 'pool' ? gi('venues', '🏊', 'استخرهای من') : ''}
        ${u.u === 'supplier' ? gi('catalog', '📦', 'کالا و خدمات من') : ''}
        ${gi('bookings', '🎫', 'بلیت‌ها')}
        ${gi('ads', '🛒', 'آگهی‌ها')}
        ${gi('shop', '🏪', 'فروشگاه')}
        ${gi('cv', '📄', 'رزومه‌ساز')}
        ${gi('sub', '🔁', 'جایگزینی')}
        ${u.u === 'coach' ? gi('work', '🏊', 'محل کار') : ''}
        ${gi('fav', '❤️', 'علاقه‌مندی')}
        ${gi('wallet', '💳', 'کیف پول')}

      </div>
      ${shCan('site_links') ? `<div class="pms-lbl">🌐 خدمات سایت</div>
      <div class="pms-grid">
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/pools.html"><span>🏊</span>استخرها</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/coaches.html"><span>🏆</span>مربیان</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/market.html"><span>🛍️</span>فروشگاه</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/hydro.html"><span>💆</span>هیدروتراپی</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/events.html"><span>🏅</span>رویدادها</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/articles.html"><span>📰</span>مجله</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/nearby.html"><span>📍</span>نزدیک من</a>
        ${['pool', 'admin', 'supplier'].includes(u.u) ? `<a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/suppliers.html"><span>🏭</span>تأمین B2B</a>` : ''}
        ${u.u === 'pool' || u.u === 'admin' ? `<a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/jobs.html"><span>🔥</span>استخدام</a>` : ''}
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/resumes.html"><span>📄</span>رزومه</a>
        <a class="pms-item" target="_blank" rel="noopener" href="https://estakhrjo.ir/chat.html"><span>💬</span>پیام‌رسان</a>
      </div>` : ''}
      <div class="pms-mobile-foot">
        <div class="pms-mobile-person"><span class="pmt-av">${avatarMarkup(u.avatar, u.name)}</span><div><b>${esc(u.name)}</b><small>${m.ic} ${m.st === 'verified' ? 'عضویت تأییدشده' : 'در انتظار تأیید'}</small></div><span class="pms-v ${m.st}">${m.st === 'verified' ? '✓' : '⏳'}</span></div>
        <div class="pms-mobile-meta"><span>📅 ${faShort}</span><span>🕐 ${faTime}</span><span class="${myPresence === 'online' ? '' : 'offline'}" data-mobile-presence><i></i>سیستم ${myPresence === 'online' ? 'آنلاین' : 'آفلاین'}</span><span>⭐ ${toFa(u.points || 0)} امتیاز</span></div>
        <div class="pms-mobile-actions"><button onclick="location.href='https://estakhrjo.ir/index.html'">⌂ بازگشت به سایت</button><button class="danger" onclick="shLogout()">↪ خروج از حساب</button></div>
      </div>
    </div>`;
  }

  /* The admin console is its own surface. It reuses the management workspace
     the dashboard used to host in a tab, but none of the member chrome: no
     member sidebar, no member bottom bar, no member tabs. An operator lands
     here and sees only the tools for running the site and the member panel. */

  pages.console = function () {
    const u = me.get();
    if (!u) { location.href = 'https://admine.estakhrjo.ir/admin.html'; return; }
    if (u.u !== 'admin') {
      $[innerHTML] = `<div class="ac-denied"><span>🔒</span><h2>دسترسی مدیریت لازم است</h2>
        <p>این کنسول فقط برای مدیر سیستم است. برای پنل خودتان به نشانی زیر بروید.</p>
        <a class="btn btn-primary" href="${MEMBER_PANEL_URL}">رفتن به پنل من ←</a></div>`;
      return;
    }
    document.body.classList.remove('tgp-mode');
    if (!adminRemotePending.loaded) refreshAdminRemotePending(() => pages.console());
    $[innerHTML] = `<div class="ac-shell">
      <header class="ac-top">
        <div class="ac-brand"><span class="ac-badge">🔐</span>
          <div><b>کنسول مدیریت</b><small>استخر جو | ESTAKHRJO</small></div></div>
        <div class="ac-who">
          <div class="ac-who-txt"><b>${esc(u.name || 'مدیر سیستم')}</b><small>مدیر سیستم</small></div>
          <a class="btn btn-ghost btn-sm" href="${MEMBER_PANEL_URL}" target="_blank" rel="noopener">پنل اعضا ↗</a>
          <a class="btn btn-ghost btn-sm" href="${SITE_URL}" target="_blank" rel="noopener">سایت ↗</a>
          <button class="btn btn-ghost btn-sm" onclick="shLogout()">خروج</button>
        </div>
      </header>
      <main class="ac-main" id="acMain">${dashBodyHtml('management', u)}</main>
    </div>`;
    requestAnimationFrame(enhanceAccessibility);
  };

  pages.dashboard = function () {
    let u = me.get();
    if (!u) { location.href = 'login.html'; return; }
    const account = activeSessionAccount();
    if ((!account || account.status !== 'active') && !cloudSessionPending()) { me.clear(); toasglass('برای ادامه با حساب فعال وارد شوید'); setTimeout(() => location.href = 'login.html', 250); return; }
    if (account) { u = sessionFor(account, u); me.set(u); }
    /* حالت «در انتظار بازیابی ابری»: پنل با همان نشست محلی رندر می‌شود و
       boot() پس از restore نتیجهٔ قطعی را اعمال می‌کند (یا در صورت بی‌اعتباری
       نشست، خروج). همهٔ عملیات واقعی روی سرور مجدداً مجوز سنجیده می‌شوند. */
    const tab = qs('tab') || 'overview';
    window.__dashTab = tab;
    // صندوق پیام یک تب داخلی پنل است تا منوی راست همیشه کنار گفتگو بماند.
    document.body.classList.remove('tgp-mode');
    $[innerHTML] = `<div class="panel-shell">
      <aside class="p-side">${dashSideHtml(tab, u)}</aside>
      <div class="p-main">${dashBodyHtml(tab, u)}</div>
    </div>${dashMobileChrome(tab, u)}`;
    window.shMobSheet = open2 => {
      const s = document.getElementById('mSheet'), bg = document.getElementById('mSheetBg');
      if (s) s.classList.toggle('open', !!open2);
      if (bg) bg.classList.toggle('open', !!open2);
    };
    requestAnimationFrame(enhanceAccessibility);
  };

  /* تعویض تب بدون رفرش — فقط کادر سمت چپ آپدیت می‌شود */
  /* Single place the panel asks "may this account open that?". Falls back to
     the three core features when the cloud layer is not up yet, which is the
     same default the server applies. */
  const SH_CORE_TABS = ['overview', 'profile', 'public_profile'];
  /* Icon + label for anything that can appear in the bottom bar. */
  const SH_TAB_META = {
    overview: ['📊', 'داشبورد'], profile: ['◌', 'پروفایل'], public_profile: ['◇', 'صفحه عمومی'],
    inbox: ['🎧', 'پشتیبانی'], bookings: ['🎫', 'بلیت‌ها'], ads: ['🛒', 'آگهی‌ها'],
    cv: ['📄', 'رزومه‌ساز'], sub: ['🔁', 'جایگزینی'], fav: ['❤️', 'علاقه‌مندی'],
    hydro: ['💆', 'هیدروتراپی'], events: ['🏅', 'رویدادها'], articles: ['📰', 'مجله'],
    wallet: ['💳', 'کیف پول'], shop: ['🏪', 'فروشگاه'], b2b: ['🏭', 'B2B'],
    jobs: ['🔥', 'استخدام'], resumes: ['📄', 'رزومه'], venues: ['🏊', 'استخرهای من'],
    catalog: ['📦', 'کالاها'], work: ['🏊', 'محل کار'], management: ['👑', 'مدیریت'], control: ['⚙️', 'تنظیمات'],
  };
  /* Everything the "more" sheet can offer, so the bar knows whether a
     "more" button would actually lead anywhere. */
  const SH_SHEET_FEATURES = ['overview','profile','public_profile','inbox','management','venues','catalog','bookings','ads','shop','cv','sub','work','fav','wallet','control'];
  window.shBottomNav = function () {
    const cloud = window.SH_CLOUD_AUTH;
    const cfg = cloud && typeof cloud.bottomNav === 'function' ? cloud.bottomNav() : null;
    const items = cfg && Array.isArray(cfg.items) && cfg.items.length ? cfg.items : SH_CORE_TABS.slice();
    const max = cfg && cfg.max >= 2 && cfg.max <= 5 ? cfg.max : 5;
    return { items, max };
  };
  window.shCan = function (feature) {
    if (!feature || SH_CORE_TABS.indexOf(feature) !== -1) return true;
    const cloud = window.SH_CLOUD_AUTH;
    if (cloud && typeof cloud.can === 'function') return cloud.can(feature);
    return false;
  };

  window.shDashTab = function (t, extra) {
    // Hiding the button is not enough: the tab id also arrives from the URL
    // (?tab=venues) and from old bookmarks. Anything not granted lands on the
    // dashboard instead.
    if ((t === 'management' || t === 'control') && document.body.dataset.page !== 'console') {
      location.href = ADMIN_CONSOLE_URL;
      return;
    }
    if (!window.shCan(t)) {
      if (window.toasglass) window.toasglass('این بخش برای گروه شما فعال نشده است');
      t = 'overview';
    }
    if (window.shTgBack && document.getElementById('tgRoom') && document.getElementById('tgRoom').parentElement === document.body) window.shTgBack();
    history.replaceState(null, '', 'dashboard.html?build=ppf8' + (t === 'overview' ? '' : '&tab=' + t + (extra || '')));
    window.__dashTab = t;
    document.querySelectorAll('.p-item[data-tab], .pm-item[data-tab], .pms-item[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    const main = document.querySelector('.p-main');
    if (!main) { pages.dashboard(); return; }
    main.classList.add('pm-fade');
    setTimeout(() => {
      main.innerHTML = dashBodyHtml(t, me.get());
      main.classList.remove('pm-fade');
      requestAnimationFrame(enhanceAccessibility);
      // لینک‌های «تکمیل در پروفایل» با #هدف می‌آیند؛ بعد از رندر به همان کارت اسکرول شود.
      if (t === 'profile' && window.shCoachProLoad) setTimeout(window.shCoachProLoad, 80);
      if (location.hash && /^#[a-zA-Z][\w-]*$/.test(location.hash)) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
      }
    }, 160);
  };
  window.shDashReload = () => window.shDashTab(window.__dashTab || 'overview');

  /* ---------- ناوبری داخل پنل بدون ریلود ----------
   * لینک‌های داخل خود داشبورد (نوار پایین موبایل، زنگ پیام‌ها، دکمه‌های
   * «تکمیل در پروفایل» و…) قبلاً ریلود کامل صفحه می‌دادند: پری‌لودر + چند
   * ثانیه صفحهٔ خالی + دانلود دوبارهٔ ~۹۰۰KB اسکریپت. این‌جا همان لینک‌ها
   * به جابه‌جایی تب (shDashTab) تبدیل می‌شوند — آنی و بدون فلش. */
  document.addEventListener('click', ev => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (_) { return; }
    if (url.origin !== location.origin || !/\/dashboard\.html$/.test(url.pathname)) return;
    if (document.body.dataset.page !== 'dashboard') return;
    ev.preventDefault();
    const tab = url.searchParams.get('tab') || 'overview';
    window.shDashTab(tab);
    const hash = (url.hash || '').replace(/^#/, '');
    if (hash && /^[a-zA-Z][\w-]*$/.test(hash)) {
      const tryScroll = n => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else if (n > 0) setTimeout(() => tryScroll(n - 1), 180);
      };
      setTimeout(() => tryScroll(12), 280);
    }
  });
  window.shCharge = a => { const u = me.get(); u.wallet = (u.wallet || 0) + a; me.set(u); toasglass('✓ ' + money(a) + ' شارژ شد'); shDashReload(); };
  window.shCfgToggle = (sec, key) => { siteCfg.toggle(sec, key); toasglass('✓ قانون سراسری به‌روز شد'); shDashReload(); };
  window.shCfgCycle = (user, sec, key) => { siteCfg.cycle(user, sec, key); toasglass('✓ استثنای کاربر ذخیره شد'); shDashReload(); };


  /* ============================================================
     صفحات v2 — تأمین‌کنندگان B2B، چت، دوره‌ها، رزومه، نزدیک من
     ============================================================ */

  pages.suppliers = function () {
    const u = me.get();
    const isBiz = u && ['pool', 'coach', 'supplier', 'admin'].includes(u.u || u.kind);
    const catIc = { 'تجهیزات': '🏭', 'مواد شیمیایی': '🧪', 'قطعات': '🔧', 'پوشاک': '👕', 'سیستم تصفیه': '💧' };
    const selectedCity = cityScope(qs('city')); const supplierList = inCity(Suppliers, selectedCity);
    $[innerHTML] = `<div class="container" style="padding-top:34px">
      <div class="sec-head reveal in"><div class="sec-title"><h2>🏭 <span class="grad">شبکه تأمین‌کنندگان B2B</span></h2><p>محصولات و خدمات صنعتی استخر — اختصاصی کسب‌وکارهای عضو</p></div></div>
      <div class="b2b-banner reveal in" style="margin-bottom:26px">
        <span style="font-size:38px">🤝</span>
        <div style="flex:1"><b style="font-size:15px">این بخش فقط برای مدیریت استخرها و مربیان تأییدشده است.</b>
        <p style="font-size:12.5px;color:var(--muted);margin-top:5px">${isBiz ? '✓ دسترسی کامل فعال است — اطلاعات تماس تأمین‌کنندگان نمایش داده می‌شود.' : 'برای مشاهده قیمت‌ها و اطلاعات تماس، با حساب کسب‌وکار (استخر / مربی) وارد شوید.'}</p></div>
        ${isBiz ? '' : '<a href="login.html" class="btn btn-gold">ورود کسب‌وکار</a>'}
      </div>
      ${selectedCity ? `<div class="city-scope-note">📍 تأمین‌کنندگان «${esc(selectedCity)}» نمایش داده می‌شوند.</div>` : ''}
      <div class="cards">${supplierList.map(s => `
        <div class="card sup-card reveal in" style="position:relative">
          <div class="card-body">
            <div style="display:flex;align-items:start;gap:14px">
              <div class="chat-avatar" style="width:56px;height:56px;font-size:28px;border-radius:18px">${esc(s.logo || '🏭')}</div>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;flex-wrap:wrap">
                  <b style="font-size:16px">${esc(s.name)} ${s.verified ? '<span style="color:var(--brand);font-size:13px" title="تأییدشده">✓</span>' : ''}</b>
                  <span class="sup-cat">${catIc[s.category] || '📦'} ${esc(s.category)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:4px">📍 ${esc(s.city || '—')} • ⭐ ${toFa(s.rating || 5)} (${toFa(s.rate_count || 0)} نظر کسب‌وکار)</div>
              </div>
            </div>
            <p style="font-size:12.5px;color:var(--muted);line-height:1.8">${esc(s.description || '')}</p>
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--muted2);margin-bottom:7px">📦 محصولات اصلی:</div>
              <ul class="sup-product-list">${(s.products || []).slice(0, 5).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            </div>
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--muted2);margin-bottom:7px">🛠️ خدمات:</div>
              <ul class="sup-product-list">${(s.services || []).slice(0, 4).map(sv => `<li>${esc(sv)}</li>`).join('')}</ul>
            </div>
            ${s.min_order ? `<div style="font-size:11.5px;color:var(--gold)">💰 حداقل سفارش: ${money(s.min_order)}</div>` : ''}
            <div class="card-foot">
              <button class="btn btn-ghost btn-sm" onclick="shSupplierProfile('${esc(String(s.id))}')">پروفایل کامل</button>
              ${isBiz ? `
                ${directMessageAllowed({ id: 'supplier:' + s.id, name: s.name, direct_message: s.direct_message !== false }) ? `<button class="btn btn-primary btn-sm" onclick="shSupplierChat('${esc(String(s.id))}')">💬 پیام مستقیم</button>` : '<span class="mini-tag">🔒 پیام مستقیم غیرفعال</span>'}
                ${cfgContact('suppliers', s.name) ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(s.phone || '')}">📞 ${esc(s.phone || '')}</a>` : `<span class="mini-tag">🔒 تماس با درخواست B2B</span>`}
              ` : `<span style="font-size:11.5px;color:var(--muted)">🔒 برای دریافت pre-فاکتور وارد شوید</span>`}
            </div>
          </div>
          ${isBiz ? '' : '<div class="locked-overlay"><span class="lock-ic">🔒</span><b>ویژه کسب‌وکارها</b><a href="login.html" class="btn btn-gold btn-sm">ورود / ثبت‌نام کسب‌وکار</a></div>'}
        </div>`).join('')}</div>
      ${isBiz ? '' : `<div class="promo-banner reveal in" style="margin-top:34px"><h2 style="margin-bottom:10px">🏭 تأمین‌کننده هستید؟</h2><p style="color:var(--muted);max-width:520px;margin:0 auto 22px">محصولات صنعتی خود را به هزاران مدیر استخر و مربی معرفی کنید.</p><a href="login.html" class="btn btn-gold btn-lg">ثبت رایگان کسب‌وکار</a></div>`}
    </div>`;
  };

  /* ---------- چت ---------- */
  /* پیام مستقیم: هر عضو/کسب‌وکار از پروفایل خودش اجازه دریافت پیام تازه را کنترل می‌کند. */
  const directMessagePrefs = {
    key: 'sh_direct_message_prefs',
    get() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } },
    set(k, enabled) { const m = this.get(); m[k] = !!enabled; localStorage.setItem(this.key, JSON.stringify(m)); },
  };
  function directMessageAllowed(peer) {
    if (!peer) return false;
    if (peer.id === 'system:admin') return true;
    const saved = directMessagePrefs.get()['name:' + String(peer.name || '')];
    if (saved !== undefined) return saved;
    return peer.direct_message !== false;
  }
  // Legacy browser-only chat was shared by every account using the same browser.
  // Purge it once and never use localStorage as a private-message data source.
  try { ['sh_chat', 'sh_chat_read', 'sh_direct_message_prefs'].forEach(key => localStorage.removeItem(key)); } catch (_) {}
  const cloudChat = { hydrated: false, peers: [], threads: {}, unread: {}, timer: 0, loading: false, owner: '' };
  function resetCloudChat(owner = '') { cloudChat.hydrated = false; cloudChat.peers = []; cloudChat.threads = {}; cloudChat.unread = {}; cloudChat.loading = false; cloudChat.owner = owner; }
  function cloudChatEnabled() {
    const cloud = window.SH_CLOUD_AUTH;
    const enabled = !!(cloud && cloud.active && cloud.getChatList && cloud.getChatThread && cloud.sendChatMessage);
    const current = me.get() || {}; const owner = String(current.accountId || current.id || current.username || '');
    if (enabled && owner && cloudChat.owner && cloudChat.owner !== owner) resetCloudChat(owner);
    else if (enabled && owner && !cloudChat.owner) cloudChat.owner = owner;
    return enabled;
  }
  function cloudChatMessages(tid) { return cloudChat.threads[tid] || []; }
  async function hydrateCloudChat(refreshOnly) {
    if (!cloudChatEnabled() || cloudChat.loading) return false;
    cloudChat.loading = true;
    try {
      const out = await window.SH_CLOUD_AUTH.getChatList();
      const peers = Array.isArray(out.peers) ? out.peers : [];
      cloudChat.peers = peers.map(peer => {
        const last = peer && peer.last && typeof peer.last === 'object' ? peer.last : null;
        if (last && !cloudChat.threads[peer.id]) cloudChat.threads[peer.id] = [last];
        cloudChat.unread[peer.id] = Math.max(0, Number(peer.unread || 0));
        return { id: String(peer.id || ''), name: String(peer.name || 'عضو استخر جو | ESTAKHRJO'), avatar: String(peer.avatar || '🙂'), sub: String(peer.sub || ''), direct_message: peer.direct_message !== false };
      }).filter(peer => peer.id);
      cloudChat.hydrated = true;
      if (!refreshOnly && !cloudChat.peers.length) toasglass('فعلاً مخاطب قابل‌دسترس برای پیام مستقیم وجود ندارد');
      syncChatUnreadUi();
      return true;
    } catch (e) {
      console.warn('استخر جو | ESTAKHRJO cloud chat sync failed:', e.message);
      return false;
    } finally { cloudChat.loading = false; }
  }
  async function loadCloudThread(tid) {
    if (!cloudChatEnabled()) return false;
    try {
      const out = await window.SH_CLOUD_AUTH.getChatThread(tid);
      cloudChat.threads[tid] = Array.isArray(out.messages) ? out.messages : [];
      cloudChat.unread[tid] = 0;
      if (out.peer && !cloudChat.peers.some(peer => peer.id === tid)) cloudChat.peers.push(out.peer);
      syncChatUnreadUi();
      return true;
    } catch (e) {
      toasglass('⚠️ دریافت پیام‌ها ناموفق بود: ' + (e.message || 'خطا'));
      return false;
    }
  }
  const chatStore = {
    // Kept as a harmless compatibility shell for older template calls. Private
    // messages are always Edge Function records scoped to their two participants.
    key: 'sh_chat',
    all() { return {}; },
    save() { try { localStorage.removeItem(this.key); } catch (_) {} },
    peers() {
      if (cloudChatEnabled()) {
        return cloudChat.hydrated ? cloudChat.peers : [{ id: 'system:admin', name: 'مدیر سیستم استخر جو | ESTAKHRJO', avatar: '👑', sub: 'در حال اتصال به پشتیبانی', direct_message: true }];
      }
      const list = [{ id: 'system:admin', name: 'مدیر سیستم استخر جو | ESTAKHRJO', avatar: '👑', sub: 'پاسخ‌گویی و پشتیبانی سیستم', direct_message: true }];
      Coaches.forEach(c => list.push({ id: 'coach:' + c.id, name: c.full_name, avatar: c.image || '🏊', sub: 'مربی شنا', direct_message: c.direct_message !== false }));
      Pools.slice(0, 4).forEach(p => list.push({ id: 'pool:' + p.id, name: p.name, avatar: p.image || '🏢', sub: 'مدیریت استخر', direct_message: p.direct_message !== false }));
      Suppliers.forEach(s => list.push({ id: 'supplier:' + s.id, name: s.name, avatar: s.logo || '🏭', sub: s.category, direct_message: s.direct_message !== false }));
      MemberAds.slice(0, 5).forEach(a => list.push({ id: 'seller:' + a.id, name: a.user_name, avatar: a.image || '🏷️', sub: 'فروشنده آگهی: ' + (a.title || '').slice(0, 18) + '…', direct_message: a.direct_message !== false }));
      return list;
    },
  };
  function tgRowsHtml(peers) {
    const readMap = (() => { try { return JSON.parse(localStorage.getItem('sh_chat_read') || '{}'); } catch (e) { return {}; } })();
    return peers.map((peer, i) => {
      const msgs = chatMsgs(peer.id); const last = msgs.slice(-1)[0]; const un = chatUnreadFor(peer.id, readMap); const online = isPeerOnline(peer);
      const tstr = last ? new Date(last.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '';
      const lastBody = last ? (last.me ? '<span class="tg-you">شما: </span>' : '') + esc(last.body) : esc(peer.sub || 'برای آغاز گفتگو پیام بفرستید');
      return `<div class="tg-item ${un ? 'unread' : ''}" data-tid="${esc(peer.id)}" data-name="${esc(peer.name)}" onclick="shTgOpen('${peer.id}')"><div class="tg-av">${esc(peer.avatar)}${online ? `<span class="tg-on" style="animation-delay:${(i % 4) * 700}ms"></span>` : '<span class="tg-off"></span>'}</div><div class="tg-info"><div class="tg-row1"><span class="tg-name">${esc(peer.name)}</span><span class="tg-time">${tstr}</span></div><div class="tg-row2"><span class="tg-last">${lastBody}</span>${un ? `<span class="tg-un">${toFa(un)}</span>` : ''}</div></div></div>`;
    }).join('');
  }
  function refreshTgList() {
    const list = document.getElementById('tgList'); if (!list) return;
    const q = (document.getElementById('tgSearch') || {}).value || '';
    list.innerHTML = tgRowsHtml(chatStore.peers());
    document.querySelectorAll('.tg-item').forEach(el => { el.classList.toggle('on', el.dataset.tid === window.__tgOpenTid); el.style.display = (el.dataset.name || '').includes(q.trim()) ? '' : 'none'; });
  }
  function chatMsgs(tid) {
    // Public seed data is never a message source. A signed-in cloud session is
    // always backed by the private Edge Function API.
    return cloudChatEnabled() ? cloudChatMessages(tid) : [];
  }
  window.shChatSend = async function (tid) {
    const inp = document.getElementById('chatInput') || document.getElementById('pChatInput');
    const recipientId = tid || window.__tgOpenTid || qs('to');
    const body = inp && inp.value.trim();
    if (!body) return;
    if (!recipientId) { toasglass('مخاطب پیام را انتخاب کنید'); return; }
    if (!cloudChatEnabled()) { toasglass('🔒 برای ارسال واقعی پیام، ابتدا با حساب ابری وارد شوید'); return; }
    inp.disabled = true;
    try {
      const nonce = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))).replace(/-/g, '');
      const out = await window.SH_CLOUD_AUTH.sendChatMessage(recipientId, body, nonce);
      const message = out && out.message;
      if (!message) throw new Error('پاسخ ارسال پیام نامعتبر بود');
      const thread = cloudChat.threads[recipientId] || [];
      if (!thread.some(item => item.id === message.id)) thread.push(message);
      cloudChat.threads[recipientId] = thread;
      cloudChat.unread[recipientId] = 0;
      inp.value = '';
      if (document.getElementById('tgRoom')) renderTgRoom(recipientId);
      else renderRoom(recipientId);
      refreshTgList(); syncChatUnreadUi();
    } catch (e) {
      toasglass('⚠️ پیام ارسال نشد: ' + (e.message || 'خطای ارتباط'));
    } finally {
      if (inp.isConnected) inp.disabled = false;
    }
  };
  window.shChatOpen = function (tid) { history.replaceState(null, '', 'https://estakhrjo.ir/chat.html?to=' + encodeURIComponent(tid)); pages.chat(); };
  function renderRoom(tid) {
    const peer = chatStore.peers().find(p => p.id === tid);
    const isPanel = !!document.getElementById('pChatRoom');
    const room = isPanel ? document.getElementById('pChatRoom') : document.getElementById('chatRoom');
    if (!room) return;
    const msgs = chatMsgs(tid);
    const inputId = isPanel ? 'pChatInput' : 'chatInput';
    room.innerHTML = `
      ${!isPanel ? `<div class="chat-room-head"><div class="chat-avatar">${esc(peer ? peer.avatar : '💬')}</div><div><div class="chat-room-name">${esc(peer ? peer.name : 'گفتگو')}</div><div class="chat-room-status">آنلاین — ${esc(peer ? peer.sub : '')}</div></div></div>` : ''}
      <div class="chat-body" id="chatBody">
        <div class="chat-day-sep">— امروز —</div>
        ${msgs.length ? msgs.map(m => `<div class="msg ${m.me ? 'msg-out' : 'msg-in'}">${esc(m.body)}<span class="msg-time">${new Date(m.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} ${m.me ? '✓✓' : ''}</span></div>`).join('') : '<div class="tg-thread-empty"><span>💬</span><b>نخستین پیام را ارسال کنید</b><p>گفتگو فقط بین شما و مخاطب انتخاب‌شده قابل مشاهده است.</p></div>'}
      </div>
      <div class="chat-input-bar">
        <input id="${inputId}" placeholder="پیامت را بنویس…" onkeydown="if(event.key==='Enter')shChatSend('${tid}')">
        <button class="chat-send" onclick="shChatSend('${tid}')">➤</button>
      </div>`;
    const b = document.getElementById('chatBody');
    if (b) b.scrollTop = b.scrollHeight;
  }
  pages.chat = function () {
    const to = qs('to');
    const peers = chatStore.peers();
    const requested = to && peers.find(p => p.id === to);
    const initial = requested && directMessageAllowed(requested) ? to : peers[0].id;
    if (requested && !directMessageAllowed(requested)) setTimeout(() => toasglass('این عضو دریافت پیام مستقیم را غیرفعال کرده است'), 80);
    $[innerHTML] = `<div class="container" style="padding-top:34px">
      <div class="sec-head reveal in" style="margin-bottom:22px"><div class="sec-title"><h2>💬 <span class="grad">پیام‌رسان استخر جو | ESTAKHRJO</span></h2><p>گفتگوهای خصوصی شما به‌صورت ابری ذخیره می‌شوند؛ ارسال پیام فقط برای مخاطبان دارای اجازهٔ دریافت پیام مستقیم فعال است.</p></div></div>
      <div class="chat-shell reveal in">
        <div class="chat-list">
          <div class="chat-list-head">گفتگوها <span class="badge-ver">${toFa(peers.length)}</span></div>
          <div class="chat-search"><input placeholder="جستجوی گفتگو…" oninput="document.querySelectorAll('.chat-thread').forEach(t=>t.style.display=t.textContent.includes(this.value)?'':'none')"></div>
          <div class="chat-threads">${peers.map(p => {
            const last = chatMsgs(p.id).slice(-1)[0];
            return `<div class="chat-thread ${p.id === initial ? 'active' : ''}" data-tid="${p.id}" onclick="document.querySelectorAll('.chat-thread').forEach(x=>x.classList.remove('active'));this.classList.add('active');shChatOpen('${p.id}')">
              <div class="chat-avatar">${esc(p.avatar)}</div>
              <div class="chat-thread-info"><div class="chat-thread-name">${esc(p.name)}</div><div class="chat-thread-last">${last ? esc(last.body) : esc(p.sub)}</div></div>
              <div class="chat-thread-meta"><div class="chat-time">${last ? new Date(last.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}</div></div>
            </div>`;
          }).join('')}</div>
        </div>
        <div class="chat-room" id="chatRoom"></div>
      </div>
    </div>`;
    renderRoom(initial);
    if (cloudChatEnabled()) loadCloudThread(initial).then(ok2 => { if (ok2) renderRoom(initial); });
  };

  /* ---------- دوره‌ها ---------- */
  pages.courses = function () {
    const cat = qs('cat') || '', level = qs('level') || '', cityRaw = qs('city'), selectedCity = cityScope(cityRaw), cityQ = cityRaw ? '&city=' + encodeURIComponent(cityRaw) : '';
    const cats = [['', 'همه', '📚'], ['swimming', 'آموزش شنا', '🏊'], ['kids', 'کودکان', '👶'], ['lifeguard', 'نجات غریق', '🛟'], ['hydro', 'آب‌درمانی', '🩺'], ['fitness', 'آمادگی مسابقات', '🏆']];
    const courseCities = [...new Set(Courses.map(c => c.city).filter(Boolean))];
    let list = Courses.filter(c => (!selectedCity || c.city === selectedCity) && (!cat || c.category === cat) && (!level || c.level === level));
    window.shEnroll = (id) => {
      const c = Courses.find(x => x.id === id);
      if (!c) return;
      const u = me.get();
      if (!u) { toasglass('برای ثبت‌نام ابتدا وارد شوید'); setTimeout(() => location.href = 'login.html', 900); return; }
      if ((c.enrolled || 0) >= c.capacity) { toasglass('⚠️ ظرفیت دوره تکمیل است'); return; }
      const mine = JSON.parse(localStorage.getItem('sh_courses') || '[]');
      if (mine.includes(id)) { toasglass('قبلاً در این دوره ثبت‌نام کرده‌اید ✓'); return; }
      mine.push(id);
      localStorage.setItem('sh_courses', JSON.stringify(mine));
      c.enrolled = (c.enrolled || 0) + 1;
      toasglass('🎓 ثبت‌نام در «' + c.title + '» انجام شد');
      pages.courses();
    };
    const levels = ['مبتدی', 'متوسط', 'پیشرفته', 'حرفه‌ای'];
    $[innerHTML] = `<div class="container" style="padding-top:34px">
      <div class="sec-head reveal in"><div class="sec-title"><h2>🎓 <span class="grad">دوره‌های آموزشی</span></h2><p>${toFa(list.length)} دوره فعال با مربیان حرفه‌ای</p></div></div>
      <div class="city-scope-bar"><span>📍 ${selectedCity ? 'دوره‌های شهر «' + esc(selectedCity) + '»' : 'دوره‌های همه ایران'}</span><select onchange="location.href='https://estakhrjo.ir/courses.html?city='+encodeURIComponent(this.value)"><option value="all">همه ایران</option>${courseCities.map(c => `<option value="${esc(c)}" ${c === selectedCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="filters reveal in">
        <div class="fchips">${cats.map(([v, l, ic]) => `<a href="courses.html?cat=${v}${level ? '&level=' + level : ''}${cityQ}" class="fchip ${cat === v ? 'on' : ''}" style="text-decoration:none">${ic} ${l}</a>`).join('')}</div>
        <div class="fchips">${levels.map(l => `<a href="courses.html?${cat ? 'cat=' + cat + '&' : ''}level=${l}${cityQ}" class="fchip ${level === l ? 'on' : ''}" style="text-decoration:none">${l}</a>`).join('')}</div>
      </div>
      <div class="cards">${list.map(c => {
        const pct = Math.min(100, Math.round(((c.enrolled || 0) / c.capacity) * 100));
        const hot = pct >= 85, full = (c.enrolled || 0) >= c.capacity;
        const catName = (cats.find(x => x[0] === c.category) || cats[0])[1];
        const myCourses = JSON.parse(localStorage.getItem('sh_courses') || '[]');
        const enrolled = myCourses.includes(c.id);
        return `<div class="card course-card cat-${c.category} reveal in">
          <div class="card-img"><div class="bg">${esc(c.image || '🎓')}</div><span class="course-level">${esc(c.level)}</span></div>
          <div class="card-body">
            <div class="card-name">${esc(c.title)} <span class="cat-chip">${catName}</span></div>
            <div style="font-size:12.5px;color:var(--muted)">👤 ${esc(c.coach_name || '—')} • 🏊 ${esc(c.pool_name || '—')} • 📍 ${esc(c.city || '')}</div>
            <div class="course-meta">
              <span>📅 ${esc(c.start_date || '')}</span><span>🗓️ ${toFa(c.sessions_count)} جلسه / ${toFa(c.duration_weeks)} هفته</span><span>⏰ ${esc(c.schedule || '')}</span>
            </div>
            <p style="font-size:12px;color:var(--muted);line-height:1.75">${esc((c.description || '').slice(0, 130))}…</p>
            <div class="course-cap"><div class="cap-bar"><div class="cap-fill ${hot ? 'hot' : ''}" style="width:${pct}%"></div></div><span>${toFa(c.enrolled || 0)}/${toFa(c.capacity)} نفر</span></div>
            <div class="card-foot">${cfgPrice('courses', c.coach_name) ? `<span class="price">${money(c.price)} <small>/ کل دوره</small></span>` : `<span class="price-lock">💰 قیمت با تماس</span>`}
              ${enrolled ? '<span class="btn btn-sm" style="background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.4);cursor:default">✓ ثبت‌نام شده</span>'
                : full ? '<span class="btn btn-ghost btn-sm" style="cursor:default">ظرفیت تکمیل</span>'
                : cfgSell('courses', c.coach_name) ? `<button class="btn btn-primary btn-sm" onclick="shEnroll(${c.id})">ثبت‌نام فوری</button>` : '<span class="btn btn-ghost btn-sm" style="cursor:default;opacity:.8">📝 فعلاً فقط مشاهده</span>'}
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="empty"><span class="e-ic">🔍</span>دوره‌ای با این فیلتر یافت نشد.</div>'}</div>
    </div>`;
  };

  /* ---------- برد رزومه ---------- */
  pages.resumes = function () {
    const cat = qs('t') || '', cityRaw = qs('city'), selectedCity = cityScope(cityRaw), cityQ = cityRaw ? '&city=' + encodeURIComponent(cityRaw) : '';
    const q = qs('q') || '', availability = qs('availability') || '', skill = qs('skill') || '', cert = qs('cert') || '', gender = qs('gender') || '', minExp = +(qs('exp') || 0);
    const titles = ['مربی شنا', 'نجات غریق', 'مسئول تصفیه‌خانه', 'مربی هیدروتراپی'];
    const baseResumes = resumeIndex().map(r => ({ ...r, skills: lineList(r.skills), certs: lineList(r.certs) }));
    const resumeCities = [...new Set(baseResumes.map(r => r.city).filter(c => c && c !== '—'))];
    const skillOptions = [...new Set(baseResumes.flatMap(r => r.skills || []))].slice(0, 30);
    const certOptions = [...new Set(baseResumes.flatMap(r => r.certs || []))].slice(0, 30);
    let list = baseResumes.filter(r => (!selectedCity || r.city === selectedCity) && (!cat || (r.title || '').includes(cat)) && (!availability || r.availability === availability) && (!gender || r.gender === gender) && (!minExp || +(r.exp_years || 0) >= minExp) && (!skill || (r.skills || []).some(x => x === skill)) && (!cert || (r.certs || []).some(x => x === cert)) && (!q || [r.user_name, r.title, r.city, ...(r.skills || []), ...(r.certs || [])].join(' ').includes(q)));
    window.shPostResume = async function () {
      const current = me.get();
      if (!current || current.u !== 'coach') { toasglass('🔒 انتشار رزومه فقط با حساب مربی شنا امکان‌پذیر است'); return; }
      const f = id => document.getElementById(id).value.trim();
      if (!f('rs_name') || !f('rs_title')) { toasglass('⚠️ نام و سمت شغلی الزامی است'); return; }
      const r = {
        user_name: f('rs_name'), title: f('rs_title'), city: f('rs_city') || '—', exp_years: parseInt(f('rs_exp')) || 0,
        skills: f('rs_skills'), bio: f('rs_bio'), expected_salary: f('rs_salary') || 'توافقی', availability: f('rs_avail') || 'تمام‌وقت',
        contact: f('rs_contact') || '—', status: 'seeking', gender: '',
      };
      const cloud = window.SH_CLOUD_AUTH;
      if (!cloud || !cloud.active || !cloud.submitResume) { toasglass('🔒 برای ارسال امن رزومه، ابتدا وارد حساب کاربری شوید'); return; }
      try {
        await cloud.submitResume(r);
        localStorage.setItem('sh_resume', JSON.stringify({ ...r, _mine: true, pending: true }));
        toasglass('🛡️ رزومه ثبت شد و پیش از انتشار برای تأیید مدیر ارسال شد'); pages.resumes();
      } catch (e) { toasglass('⚠️ ارسال امن رزومه ناموفق بود: ' + (e.message || 'خطا')); }
    };
    window.shDelResume = () => { localStorage.removeItem('sh_resume'); toasglass('رزومه حذف شد'); pages.resumes(); };
    window.shResumeFilters = () => { const v = id => encodeURIComponent((document.getElementById(id) || {}).value || ''); const city = document.getElementById('resumeCity'); location.href = 'https://estakhrjo.ir/resumes.html?q=' + v('rfQ') + '&t=' + v('rfTitle') + '&city=' + encodeURIComponent(city ? city.value : (cityRaw || '')) + '&availability=' + v('rfAvail') + '&exp=' + v('rfExp') + '&skill=' + v('rfSkill') + '&cert=' + v('rfCert') + '&gender=' + v('rfGender'); };
    $[innerHTML] = `<div class="container" style="padding-top:34px">
      <div class="sec-head reveal in"><div class="sec-title"><h2>📄 <span class="grad">برد رزومه</span></h2><p>به سبک ایران‌تلنت — رزومه‌ات را بگذار، استخرها پیدایت می‌کنند</p></div>
        <button class="btn btn-gold" onclick="document.getElementById('resumeForm').scrollIntoView({behavior:'smooth'})">+ انتشار رزومه</button></div>
      <div class="city-scope-bar"><span>📍 ${selectedCity ? 'رزومه‌های شهر «' + esc(selectedCity) + '»' : 'رزومه‌های همه ایران'}</span><select id="resumeCity"><option value="all" ${cityRaw === 'all' ? 'selected' : ''}>همه ایران</option>${resumeCities.map(c => `<option value="${esc(c)}" ${c === selectedCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="resume-filter-panel reveal in"><div class="resume-filter-title"><span>⚡ فیلتر سریع کارفرما</span><small>جستجو بر اساس ساختار رزومه</small></div><div class="resume-filter-grid"><input id="rfQ" value="${esc(q)}" placeholder="نام، تخصص یا کلیدواژه…"><select id="rfTitle"><option value="">همه موقعیت‌ها</option>${titles.map(t => `<option value="${esc(t)}" ${cat === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select id="rfAvail"><option value="">همه نوع همکاری</option>${['تمام‌وقت','پاره‌وقت','شیفتی','پروژه‌ای'].map(v => `<option ${availability === v ? 'selected' : ''}>${v}</option>`).join('')}</select><select id="rfExp"><option value="">هر میزان سابقه</option>${[1,3,5,8,10].map(v => `<option value="${v}" ${minExp === v ? 'selected' : ''}>حداقل ${toFa(v)} سال سابقه</option>`).join('')}</select><select id="rfSkill"><option value="">همه مهارت‌ها</option>${skillOptions.map(v => `<option value="${esc(v)}" ${skill === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select><select id="rfCert"><option value="">همه مدارک</option>${certOptions.map(v => `<option value="${esc(v)}" ${cert === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select><select id="rfGender"><option value="">همه اعضا</option><option value="women" ${gender === 'women' ? 'selected' : ''}>بانوان</option><option value="men" ${gender === 'men' ? 'selected' : ''}>آقایان</option></select><button class="btn btn-primary" onclick="shResumeFilters()">اعمال فیلتر</button></div></div>
      <div class="filters reveal in"><div class="fchips"><a href="resumes.html?${cityRaw ? 'city=' + encodeURIComponent(cityRaw) : ''}" class="fchip ${!cat ? 'on' : ''}" style="text-decoration:none">همه</a>${titles.map(t => `<a href="https://estakhrjo.ir/resumes.html?t=${encodeURIComponent(t)}${cityQ}" class="fchip ${cat === t ? 'on' : ''}" style="text-decoration:none">${esc(t)}</a>`).join('')}</div></div>
      <div class="panel-grid" style="grid-template-columns:1.6fr 1fr;display:grid;gap:24px">
        <div>
          <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${list.map(r => `
            <div class="card resume-card reveal in"><div class="card-body">
              <div class="card-name">
                <span>👤 ${esc(r.user_name)} ${r._mine ? '<span style="font-size:10px;color:var(--gold)">(شما)</span>' : ''}</span>
                <span class="exp-badge">${toFa(r.exp_years || 0)} سال تجربه</span>
              </div>
              <div style="font-size:13.5px;font-weight:800;color:var(--brand)">${esc(r.title || '')}</div>
              <div style="font-size:11.5px;color:var(--muted)">📍 ${esc(r.city || '—')} • ${esc(r.availability || 'تمام‌وقت')} <span class="seeking-dot">فعال در جستجو</span></div>
              ${r.bio ? `<p style="font-size:12px;color:var(--muted);line-height:1.75">${esc(r.bio)}</p>` : ''}
              <div>${(r.skills || []).slice(0, 4).map(sk => `<span class="skill-chip">${esc(sk)}</span>`).join('')}</div>
              <div style="font-size:12px;color:var(--gold)">💰 حقوق موردانتظار: ${esc(r.expected_salary || 'توافقی')}</div>
              <div class="card-foot"><button class="btn btn-ghost btn-sm" onclick="shResumeView('${esc(String(r.id))}')">👁️ نمایش رزومه</button>
                ${r._mine ? `<button class="btn btn-danger btn-sm" onclick="shDelResume()">حذف</button>`
                  : (r.contact ? `<a class="btn btn-primary btn-sm" href="tel:${esc(r.contact)}">📞 تماس</a>` : '<span class="mini-tag">🔒 ارتباط پس از هماهنگی</span>')}
              </div>
            </div></div>`).join('') || '<div class="empty"><span class="e-ic">📄</span>رزومه‌ای یافت نشد.</div>'}</div>
        </div>
        <div>
          <div class="panel reveal in" id="resumeForm">
            <h3>✨ انتشار رزومه (رایگان)</h3>
            <div class="form-grid">
              <input id="rs_name" placeholder="نام و نام خانوادگی *">
              <select id="rs_title"><option value="">سمت شغلی *</option>${titles.map(t => `<option>${t}</option>`).join('')}<option>نگهبان تجهیزات</option><option>منشی مجموعه</option></select>
              <input id="rs_city" placeholder="شهر">
              <input id="rs_exp" type="number" min="0" placeholder="سال‌های تجربه">
              <select id="rs_avail"><option>تمام‌وقت</option><option>پاره‌وقت</option><option>شیفتی</option><option>پروژه‌ای</option></select>
              <input id="rs_salary" placeholder="حقوق موردانتظار">
              <textarea id="rs_skills" rows="2" placeholder="مهارت‌ها (هر خط یکی)"></textarea>
              <textarea id="rs_bio" rows="3" placeholder="خلاصه رزومه / درباره شما"></textarea>
              <input id="rs_contact" placeholder="شماره تماس *" dir="ltr">
              <button class="btn btn-gold btn-block" onclick="shPostResume()">🚀 انتشار در برد رزومه</button>
            </div>
            <p style="font-size:11px;color:var(--muted2);margin-top:10px">✓ رزومه شما بلافاصله برای مدیران استخرها قابل مشاهده است</p>
          </div>
          <div class="panel reveal in" style="margin-top:20px">
            <h3>🔥 آگهی‌های «نیاز به نیرو» از استخرها</h3>
            ${CoachRequests.map(q => `
              <div style="padding:13px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
                  <b style="font-size:13px">${esc(q.title)}</b>
                  <span class="chip gold" style="font-size:10px;white-space:nowrap">فوری</span>
                </div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:5px">🏊 ${esc(q.pool_name || '')} • 📍 ${esc(q.city || '')}</div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:3px">🗓️ ${esc(q.schedule || '')} • 💰 ${esc(q.salary || 'توافقی')}</div>
                ${jobActionHtml('coach', q, isCoachJob(q) ? 'ارسال رزومه' : 'تماس')}
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ---------- آگهی‌های خرید و فروش اعضا ---------- */
  const AD_CATS = [['', 'همه', '🛒'], ['equipment', 'تجهیزات', '🏊'], ['goggles', 'عینک', '🥽'], ['apparel', 'پوشاک', '👕'], ['accessories', 'لوازم جانبی', '🎒'], ['electronics', 'الکترونیک', '⌚'], ['tickets', 'بلیت', '🎟️'], ['kids', 'کودک', '👶']];
  const myAds = {
    get() { try { return JSON.parse(localStorage.getItem('sh_my_ads')) || []; } catch (e) { return []; } },
    set(l) { localStorage.setItem('sh_my_ads', JSON.stringify(l)); },
    add(a) { const l = this.get(); a._local = true; a.id = 'l' + Date.now(); a.created_at = new Date().toISOString(); l.unshift(a); localStorage.setItem('sh_my_ads', JSON.stringify(l)); return a; },
    del(id) { localStorage.setItem('sh_my_ads', JSON.stringify(this.get().filter(x => String(x.id) !== String(id)))); },
  };
  function allAds() { return [...myAds.get().filter(a => a.status !== 'pending'), ...MemberAds]; }
  function adCard(a) {
    const condLbl = { 'new': '✨ نو', 'used': 'دست‌دوم', 'used-like-new': 'در حد نو' };
    const catName = (AD_CATS.find(c => c[0] === a.category) || AD_CATS[1])[1];
    return `<div class="card adc reveal in">
      <div class="card-img"><div class="bg">${esc(a.image || '🛍️')}</div>
        <span class="adc-cond ${a.condition}">${condLbl[a.condition] || 'نو'}</span>
        ${a.negotiable ? '<span class="adc-neg">قابل مذاکره</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-name" style="font-size:15px">${esc(a.title)}</div>
        <div class="adc-seller"><span class="sav">${a._local ? '👤' : '🏷️'}</span><div><div class="sn">${esc(a.user_name)}${a._local ? ' (شما)' : ''}</div><div class="sl">${catName} • 📍 ${esc(a.city || '—')}</div></div></div>
        ${a.description ? `<p style="font-size:12px;color:var(--muted);line-height:1.75">${esc((a.description || '').slice(0, 100))}${(a.description || '').length > 100 ? '…' : ''}</p>` : ''}
        <div class="card-foot">${cfgPrice('ads', a.user_name) ? `<span class="price">${a.price ? money(a.price) : 'توافقی'}</span>` : `<span class="price-lock">💰 با گفتگو</span>`}
          <div style="display:flex;gap:6px">
            ${a._local ? `<button class="btn btn-danger btn-sm" onclick="shDelMyAd('${a.id}')">🗑️</button>` : (cfgContact('ads', a.user_name) ? `<a class="btn btn-primary btn-sm" href="chat.html?to=${encodeURIComponent('seller:' + a.id)}&name=${encodeURIComponent(a.user_name)}">💬 چت با فروشنده</a>` : `<span class="mini-tag">🔒 تماس غیرفعال</span>`)}
          </div>
        </div>
      </div>
    </div>`;
  }
  window.shDelMyAd = id => { myAds.del(id); toasglass('آگهی حذف شد'); document.body.dataset.page === 'ads' ? pages.ads() : pages.dashboard(); };
  window.shPanelAdCompose = show => { window.__panelAdCompose = !!show; shDashTab('ads'); };
  window.shPostAd = async function () {
    const f = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    if (!f('ad_title') || !f('ad_price')) { toasglass('⚠️ عنوان و قیمت الزامی است'); return; }
    const draft = {
      title: f('ad_title'), category: f('ad_cat') || 'equipment', condition: f('ad_cond') || 'new', price: parseInt(f('ad_price')) || 0,
      negotiable: document.getElementById('ad_neg') ? document.getElementById('ad_neg').checked : false, city: f('ad_city') || '—',
      description: f('ad_desc'), image: f('ad_img') || '🛍️', contact: f('ad_contact'), g: f('ad_gender') || '',
    };
    const cloud = window.SH_CLOUD_AUTH;
    if (!cloud || !cloud.active || !cloud.submitMemberAd) { toasglass('🔒 برای ثبت امن آگهی، ابتدا وارد حساب کاربری شوید'); return; }
    try {
      await cloud.submitMemberAd(draft);
      const ad = myAds.add({ user_name: (me.get() || {}).name || 'عضو', ...draft, status: 'pending' });
      toasglass('🛡️ آگهی «' + ad.title + '» ثبت و برای تأیید مدیر ارسال شد');
      window.__panelAdCompose = false; document.body.dataset.page === 'dashboard' ? shDashTab('ads') : pages.ads();
    } catch (e) { toasglass('⚠️ ثبت امن آگهی ناموفق بود: ' + (e.message || 'خطا')); }
  };
  pages.ads = function () {
    const cat = qs('cat') || '', cond = qs('cond') || '', sort = qs('sort') || '', cityRaw = qs('city'), selectedCity = cityScope(cityRaw), cityQ = cityRaw ? '&city=' + encodeURIComponent(cityRaw) : '';
    const q2 = qs('q') || '';
    const adCities = [...new Set(allAds().map(a => a.city).filter(c => c && c !== '—'))];
    let list = shGenderFilter(allAds(), x => x.g || x.gender).filter(a => (!selectedCity || a.city === selectedCity) && (!cat || a.category === cat) && (!cond || a.condition === cond) && (!q2 || (a.title + (a.description || '')).includes(q2)));
    if (sort === 'cheap') list = list.slice().sort((a, b) => (a.price || 1) - (b.price || 1));
    if (sort === 'new') list = list.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    $[innerHTML] = `<div class="container" style="padding-top:34px">
      <div class="sec-head reveal in"><div class="sec-title"><h2>🛒 <span class="grad">بازار خرید و فروش اعضا</span></h2><p>${toFa(list.length)} آگهی فعال — وسایلت را مستقیم به دست خریدار برسان</p></div>
        <button class="btn btn-gold" onclick="document.getElementById('postAdForm').scrollIntoView({behavior:'smooth'})">+ ثبت آگهی رایگان</button></div>
      <div class="city-scope-bar"><span>📍 ${selectedCity ? 'آگهی‌های شهر «' + esc(selectedCity) + '»' : 'آگهی‌های همه ایران'}</span><select onchange="location.href='https://estakhrjo.ir/ads.html?city='+encodeURIComponent(this.value)"><option value="all">همه ایران</option>${adCities.map(c => `<option value="${esc(c)}" ${c === selectedCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="filters reveal in">
        <div class="fchips">${AD_CATS.map(([v, l, ic]) => `<a href="ads.html?cat=${v}${cond ? '&cond=' + cond : ''}${sort ? '&sort=' + sort : ''}${cityQ}" class="fchip ${cat === v ? 'on' : ''}" style="text-decoration:none">${ic} ${l}</a>`).join('')}</div>
        <div class="fchips">
          <a href="ads.html?${cat ? 'cat=' + cat : ''}${cityQ}" class="fchip ${!cond ? 'on' : ''}" style="text-decoration:none">همه حالت‌ها</a>
          <a href="ads.html?cond=new${cat ? '&cat=' + cat : ''}${cityQ}" class="fchip ${cond === 'new' ? 'on' : ''}" style="text-decoration:none">✨ نو</a>
          <a href="ads.html?cond=used-like-new${cat ? '&cat=' + cat : ''}${cityQ}" class="fchip ${cond === 'used-like-new' ? 'on' : ''}" style="text-decoration:none">در حد نو</a>
          <a href="ads.html?cond=used${cat ? '&cat=' + cat : ''}${cityQ}" class="fchip ${cond === 'used' ? 'on' : ''}" style="text-decoration:none">دست‌دوم</a>
          <a href="ads.html?sort=cheap${cat ? '&cat=' + cat : ''}${cityQ}" class="fchip ${sort === 'cheap' ? 'on' : ''}" style="text-decoration:none">💰 ارزان‌ترین</a>
        </div>
      </div>
      <div class="panel-grid" style="grid-template-columns:1fr 320px;display:grid;gap:24px;align-items:start">
        <div><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(270px,1fr))">${list.map(adCard).join('') || '<div class="empty"><span class="e-ic">🔍</span>آگهی‌ای یافت نشد.</div>'}</div></div>
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="panel reveal in" id="postAdForm">
            <h3>📦 ثبت آگهی (رایگان — ۳۰ ثانیه)</h3>
            <div class="form-grid">
              <input id="ad_title" placeholder="عنوان آگهی *">
              <select id="ad_cat">${AD_CATS.slice(1).map(([v, l, ic]) => `<option value="${v}">${ic} ${l}</option>`).join('')}</select>
              <select id="ad_cond"><option value="new">✨ نو</option><option value="used-like-new">در حد نو</option><option value="used">دست‌دوم</option></select>
              <select id="ad_gender"><option value="">مخاطب: همه</option><option value="women">🌸 ویژه بانوان</option><option value="men">👨 ویژه آقایان</option></select>
              <input id="ad_price" type="number" min="0" placeholder="قیمت (تومان) *">
              <input id="ad_city" placeholder="شهر">
              <input id="ad_img" placeholder="ایموجی آگهی (مثل 🥽)" maxlength="4">
              <textarea id="ad_desc" rows="2" placeholder="توضیح (وضع، دلیل فروش...)"></textarea>
              <input id="ad_contact" placeholder="شماره تماس" dir="ltr">
              <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted);cursor:pointer"><input type="checkbox" id="ad_neg" style="width:18px;height:18px"> قیمت قابل مذاکره است</label>
              <button class="btn btn-gold btn-block" onclick="shPostAd()">🚀 انتشار آگهی</button>
            </div>
          </div>
          <div class="b2b-banner reveal in" style="padding:20px"><span style="font-size:30px">🛡️</span><div><b style="font-size:13px">خرید امن</b><p style="font-size:11.5px;color:var(--muted);margin-top:4px">معامله را حضوری و در محل امن انجام دهید. قبل از پرداخت، وسیله را بررسی کنید.</p></div></div>
        </div>
      </div>
    </div>`;
  };

  /* ---------- نزدیک من ---------- */
  pages.nearby = function () {
    const haversine = (a, b, c, d) => {
      const R = 6371, rad = x => x * Math.PI / 180;
      const dLat = rad(c - a), dLng = rad(d - b);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    const tab = qs('tab') || 'pools';
    const selectedCity = cityScope(qs('city'));
    window.shFindMe = function () {
      toasglass('📡 در حال دریافت موقعیت…');
      if (!navigator.geolocation) { shUseCity(); return; }
      navigator.geolocation.getCurrentPosition(
        pos => pages.nearby.withGeo(pos.coords.latitude, pos.coords.longitude),
        () => shUseCity(),
        { timeout: 6000 }
      );
    };
    window.shUseCity = function () {
      // فالبک: مرکز تهران
      pages.nearby.withGeo(35.72, 51.39);
    };
    function renderNear(userLat, userLng) {
      const poolsD = Pools.filter(p => p.lat && p.lng && (!selectedCity || p.city === selectedCity)).map(p => ({ ...p, dist: haversine(userLat, userLng, p.lat, p.lng) })).sort((a, b) => a.dist - b.dist);
      const coachesD = Coaches.filter(c => c.lat && c.lng && (!selectedCity || c.city === selectedCity)).map(c => ({ ...c, dist: haversine(userLat, userLng, c.lat, c.lng) })).sort((a, b) => a.dist - b.dist);
      const items = tab === 'coaches' ? coachesD : poolsD;
      const maxDist = Math.max(...items.map(x => x.dist), 1);
      const minDist = items[0] ? items[0].dist : 0;
      $[innerHTML] = `<div class="container" style="padding-top:34px">
        <div class="sec-head reveal in"><div class="sec-title"><h2>📍 <span class="grad">نزدیک‌ترین‌ها به شما</span></h2><p>مرتب‌شده بر اساس فاصله واقعی از موقعیت شما${selectedCity ? ' در «' + esc(selectedCity) + '»' : ''}</p></div>
          <div style="display:flex;gap:8px">
            <a href="https://estakhrjo.ir/nearby.html?tab=pools" class="fchip ${tab === 'pools' ? 'on' : ''}" style="text-decoration:none">🏊 استخرها</a>
            <a href="https://estakhrjo.ir/nearby.html?tab=coaches" class="fchip ${tab === 'coaches' ? 'on' : ''}" style="text-decoration:none">🏆 مربیان</a>
          </div></div>
        <div class="geo-map reveal in" style="margin-bottom:30px">
          <div class="geo-map-bg"></div>
          <div class="geo-pin me" style="left:50%;top:55%"><span class="pin-ring"></span><span class="pin-ic">📍</span></div>
          ${items.slice(0, 8).map((it, ix) => {
            const x = 50 + ((it.dist - minDist) / maxDist) * 38 * Math.cos(ix * 2.4);
            const y = 55 + ((it.dist - minDist) / maxDist) * 32 * Math.sin(ix * 2.4);
            return `<a class="geo-pin" style="left:${Math.max(6, Math.min(94, x))}%;top:${Math.max(12, Math.min(90, y))}%" href="${tab === 'coaches' ? 'coach' : 'pool'}.html?id=${it.id}">
              <span class="pin-lbl">${esc(tab === 'coaches' ? it.full_name : it.name)} — ${toFa(Math.round(it.dist * 10) / 10)} کیلومتر</span>
              <span class="pin-ic">${tab === 'coaches' ? '🏆' : '🏊'}</span></a>`;
          }).join('')}
        </div>
        <div class="cards">${items.map((it, ix) => `
          <div class="card reveal in"><div class="card-body">
            <div class="card-name">${esc(it.image || (tab === 'coaches' ? '🏆' : '🏊'))} ${esc(tab === 'coaches' ? it.full_name : it.name)}
              <span class="dist-badge ${ix === 0 ? 'nearest' : ''}">${ix === 0 ? '⚡ نزدیک‌ترین • ' : '📍 '}${toFa(Math.round(it.dist * 10) / 10)} کیلومتر</span></div>
            <div style="font-size:12.5px;color:var(--muted)">📍 ${esc(it.city || '')}${it.district ? '، ' + esc(it.district) : ''} • ⭐ ${toFa(it.rating || 5)}</div>
            <div class="card-foot">
              ${tab === 'coaches'
                ? `<a href="https://estakhrjo.ir/coach.html?id=${it.id}" class="btn btn-primary btn-sm">مشاهده پروفایل</a>`
                : `<a href="https://estakhrjo.ir/pool.html?id=${it.id}" class="btn btn-primary btn-sm">رزرو سانس</a>`}
            </div>
          </div></div>`).join('')}</div>
      </div>`;
    }
    pages.nearby.withGeo = renderNear;
    // نمایش اولیه: دکمه دریافت موقعیت
    $[innerHTML] = `<div class="container" style="padding-top:60px;padding-bottom:60px">
      <div class="geo-hero reveal in">
        <div class="sec-title" style="text-align:center"><h2 style="font-size:clamp(26px,4vw,42px)">📍 <span class="grad">نزدیک‌ترین استخر و مربی</span></h2>
        <p style="margin:14px auto 34px;max-width:480px">با یک کلیک، موقعیت شما را دریافت می‌کنیم و نزدیک‌ترین استخرها و مربیان را بر اساس فاصله واقعی مرتب می‌کنیم.</p></div>
        <button class="geo-btn" onclick="shFindMe()">📡 یافتن نزدیک‌ترین‌ها به من</button>
        <div style="margin-top:20px"><button class="btn btn-ghost" onclick="shUseCity()">یا نمایش نزدیک‌ترین‌ها${selectedCity ? ': <b>' + esc(selectedCity) + '</b>' : ': <b>تهران (پیش‌فرض)</b>'}</button></div>
      </div>
    </div>`;
  };

  pages.ticket = function () {
    const code = qs('code');
    const all = JSON.parse(localStorage.getItem('sh_bookings') || '[]');
    const b = all.find(x => x.code === code);
    if (!b) { $[innerHTML] = errPage('بلیت یافت نشد'); return; }
    $[innerHTML] = `<div class="container" style="padding:36px 20px">
      <div class="ticket">
        <div class="ticket-head"><h2>${esc(b.pool_image || '🏊')} ${esc(b.pool_name)}</h2><p style="font-size:11.5px;opacity:.9">بلیت ورود — استخر جو | ESTAKHRJO</p></div>
        <div class="ticket-body">
          <div class="ticket-qr" style="padding:18px;background:#fff;border-radius:16px;display:inline-block">
            <svg viewBox="0 0 100 100" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#fff"/>
              ${qrFake(code)}
              <text x="50" y="55" text-anchor="middle" font-size="9" font-weight="800" fill="#0f172a" font-family="monospace">${esc(b.code)}</text>
            </svg>
          </div>
          <div class="ticket-code">${esc(b.code)}</div>
          <p style="font-size:11px;color:var(--muted);margin-top:4px">هنگام ورود به استخر نشان دهید</p>
          <div class="ticket-meta">
            <div class="tm"><div class="tl">📅 تاریخ</div><div class="tv">${esc(b.date)}</div></div>
            <div class="tm"><div class="tl">⏰ ساعت</div><div class="tv">${esc(b.time)}</div></div>
            <div class="tm"><div class="tl">🏊 نوع</div><div class="tv">${esc(b.kind)}</div></div>
            <div class="tm"><div class="tl">👥 تعداد</div><div class="tv">${toFa(b.qty)} نفر</div></div>
            ${b.coach ? `<div class="tm"><div class="tl">👤 مربی</div><div class="tv">${esc(b.coach)}</div></div>` : ''}
            <div class="tm"><div class="tl">💰 مبلغ</div><div class="tv">${money(b.total)}</div></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:center">
            <button onclick="window.print()" class="btn btn-ghost btn-sm">🖨️ چاپ</button>
            <a href="dashboard.html?build=ppf8&tab=bookings" class="btn btn-primary btn-sm">داشبورد</a>
          </div>
        </div>
      </div>
    </div>`;
  };

  function qrFake(seed) {
    let h = 0; for (const c of seed) h = (h << 5) - h + c.charCodeAt(0) | 0;
    let svg = '';
    const rng = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
    // گوشه‌ها
    const corner = (x, y) => `<rect x="${x}" y="${y}" width="21" height="21" fill="#0f172a"/><rect x="${x + 3}" y="${y + 3}" width="15" height="15" fill="#fff"/><rect x="${x + 6}" y="${y + 6}" width="9" height="9" fill="#0f172a"/>`;
    svg += corner(6, 6) + corner(73, 6) + corner(6, 73);
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      if ((x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17)) continue;
      if (rng() > 0.5) svg += `<rect x="${6 + x * 3.52}" y="${6 + y * 3.52}" width="3" height="3" fill="#0f172a"/>`;
    }
    return svg;
  }

  function errPage(msg) {
    return `<div class="container" style="padding:90px 20px;text-align:center"><div class="empty"><span class="e-ic" style="font-size:64px">😕</span><h2 style="font-size:22px;margin-bottom:10px">${esc(msg)}</h2><div style="margin-top:20px"><a href="https://estakhrjo.ir/index.html" class="btn btn-primary">بازگشت به خانه</a></div></div></div>`;
  }

  /* ---------- اقلام تأمین‌کنندگان (با تأیید مدیر) ---------- */
  const b2bStore = {
    KEY: 'sh_b2b_items',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    set(arr) { localStorage.setItem(this.KEY, JSON.stringify(arr)); },
    add(item) { const a = this.get(); item.id = 'b2b-' + Date.now(); a.unshift(item); this.set(a); return item; },
  };
  window.shB2BAdd = function () {
    const f = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    if (!f('b2b_title')) { toasglass('⚠️ نام کالا/خدمت الزامی است'); return; }
    const u = me.get() || {};
    b2bStore.add({
      sup: u.name || 'تأمین‌کننده', title: f('b2b_title'), cat: f('b2b_cat') || 'تجهیزات',
      price: parseInt(f('b2b_price')) || 0, img: (window.__b2bImgData || f('b2b_img') || '📦'), desc: f('b2b_desc'),
      status: 'pending', at: new Date().toISOString(),
    });
    window.__b2bImgData = '';
    toasglass('📨 ثبت شد — پس از تأیید مدیر سیستم نمایش داده می‌شود');
    shDashTab('shop');
  };
  window.shB2BImgFile = async function (inp) {
    const file = inp.files && inp.files[0]; if (!file) return;
    if (file.size > 9 * 1024 * 1024) { toasglass('⚠️ حداکثر حجم ۹ مگابایت'); inp.value = ''; return; }
    const r = await shImgOpt(file, 'card'); if (!r) { toasglass('⚠️ خواندن تصویر ممکن نشد'); return; }
    window.__b2bImgData = r.url;
    mediaLib.add({ cat: 'b2b', ref: (me.get() || {}).name || '-', filename: r.filename, fmt: r.fmt, kb: r.kb, w: r.w, h: r.h, url: r.url.slice(0, 220) + '…' });
    const pv = document.getElementById('b2bImgPv');
    if (pv) pv.innerHTML = `<img src="${r.url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px"><span style="position:absolute;bottom:3px;left:5px;background:rgba(0,0,0,.6);color:#34d399;font-size:8.5px;padding:2px 6px;border-radius:99px">✓ ${toFa(r.kb)}KB · در انتظار تأیید</span>`;
  };
  window.shShopMode = function (mode) {
    window.__shopMode = mode || 'all'; window.__shopSub = '';
    if (PAGE === 'dashboard') shDashTab('shop');
  };
  window.shShopSub = function (sub) {
    window.__shopSub = sub || ''; if (PAGE === 'dashboard') shDashTab('shop');
  };
  // سازگاری با فراخوانی‌های نسخه‌های پیشین
  window.shShopPick = function (cat) {
    if (!cat) return window.shShopMode('all');
    if (cat === 'خدمات') return window.shShopMode('services');
    window.__shopMode = 'suppliers'; window.__shopSub = cat; if (PAGE === 'dashboard') shDashTab('shop');
  };
  window.shMod = function (kind, id, act) {
    if (kind === 'ad') {
      const arr = myAds.get(); const it = arr.find(x => x.id === id);
      if (!it) return;
      if (act === 'approve') { it.status = 'active'; myAds.set ? myAds.set(arr) : localStorage.setItem('sh_member_ads', JSON.stringify(arr)); toasglass('✅ آگهی تأیید و منتشر شد'); }
      else { const i2 = arr.indexOf(it); arr.splice(i2, 1); myAds.set ? myAds.set(arr) : localStorage.setItem('sh_member_ads', JSON.stringify(arr)); toasglass('🗑️ آگهی رد و حذف شد'); }
    } else if (kind === 'b2b') {
      const arr = b2bStore.get(); const idx = arr.findIndex(x => x.id === id);
      if (idx < 0) return;
      if (act === 'approve') { arr[idx].status = 'ok'; toasglass('✅ کالا/خدمت تأیید و نمایش داده شد'); }
      else { arr.splice(idx, 1); toasglass('🗑️ مورد رد و حذف شد'); }
      b2bStore.set(arr);
    }
    pages.dashboard();
  };

  /* ---------- بهینه‌ساز تصاویر (WebP یکسان + کتابخانه رسانه) ---------- */
  const mediaLib = {
    KEY: 'sh_media',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    add(entry) { const a = this.get(); entry.id = 'media-' + Date.now(); entry.at = new Date().toISOString(); a.unshift(entry); localStorage.setItem(this.KEY, JSON.stringify(a.slice(0, 120))); return entry; },
    del(id) { const a = this.get().filter(x => x.id !== id); localStorage.setItem(this.KEY, JSON.stringify(a)); },
  };
  const WEBP_UPLOAD_MAX_BYTES = 9 * 1024 * 1024;
  const WEBP_UPLOAD_QUALITY = 0.82;
  const webpFileName = (box, stamp = Date.now()) => `estakhrjo-${String(box || 'image').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}-${stamp}.webp`;
  const imageElementFromFile = file => new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('read-failed'));
    rd.onload = () => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('decode-failed'));
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
  const dataUrlFromBlob = blob => new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('encode-failed'));
    rd.onload = () => resolve(rd.result);
    rd.readAsDataURL(blob);
  });
  const isWebpVisualSource = value => {
    const source = String(value || '').trim();
    if (!source || /^data:image\/webp(?:;|,)/i.test(source)) return true;
    if (/^(?:https?:)?\/\//i.test(source) || /^(?:\.{0,2}\/)?assets\//i.test(source)) {
      const path = source.split(/[?#]/, 1)[0];
      return /\.webp$/i.test(path);
    }
    // Non-URL values are deliberately retained for the existing emoji placeholders.
    if (/\.(?:jpe?g|png|gif|avif)(?:[?#].*)?$/i.test(source)) return false;
    return !/[\/:]/.test(source);
  };
  /* Browsers that cannot encode WebP from a canvas do not say so: they hand
     back a PNG with the requested type silently ignored. Probe once and
     remember, so the upload path knows up front what it can produce. */
  let webpEncodeSupport = null;
  async function canEncodeWebp() {
    if (webpEncodeSupport !== null) return webpEncodeSupport;
    try {
      const probe = document.createElement('canvas');
      probe.width = probe.height = 2;
      const ctx = probe.getContext('2d');
      if (!ctx) { webpEncodeSupport = false; return false; }
      ctx.fillRect(0, 0, 2, 2);
      const blob = await new Promise(resolve => probe.toBlob(resolve, 'image/webp', 0.8));
      webpEncodeSupport = !!(blob && blob.type === 'image/webp' && blob.size > 0);
    } catch (_) { webpEncodeSupport = false; }
    return webpEncodeSupport;
  }

  window.shImgOpt = async function (file, box) {
    if (!(file instanceof Blob)) { toasglass('⚠️ پروندهٔ تصویر خوانده نشد.'); return null; }
    // ماژول همگانی WebP: هر پسوندی، فشرده‌سازی تا اندازهٔ موردنیاز نمایش.
    if (window.SH_WEBP) {
      try {
        const presetMap = { avatar: 'avatar', card: 'card', hero: 'hero', gallery: 'gallery', slot: 'slot' };
        return await window.SH_WEBP.convert(file, { preset: presetMap[box] || 'card' });
      } catch (e) {
        toasglass('⚠️ ' + (e && e.message || 'پردازش تصویر ناموفق بود.'));
        return null;
      }
    }
    // Anything the browser can decode is fine, because it is re-encoded here
    // anyway. iPhones hand over image/heic, which the old allow-list rejected
    // with a message about JPEG and PNG that did not explain the real problem.
    const type = String(file.type || '').toLowerCase();
    if (type === 'image/svg+xml') { toasglass('⚠️ SVG پذیرفته نمی‌شود؛ یک تصویر عکسی انتخاب کنید.'); return null; }
    if (type && !type.startsWith('image/')) { toasglass('⚠️ پرونده تصویر نیست.'); return null; }
    if (file.size <= 0) { toasglass('⚠️ پروندهٔ تصویر خالی است.'); return null; }
    if (file.size > WEBP_UPLOAD_MAX_BYTES) { toasglass('⚠️ حجم تصویر باید کمتر از ۹ مگابایت باشد.'); return null; }

    const maxSide = { avatar: 512, card: 960, hero: 1600 }[box] || 960;
    let source;
    let release = () => {};
    let stage = 'decode';
    try {
      try {
        if ('createImageBitmap' in window) {
          try {
            source = await createImageBitmap(file, { imageOrientation: 'from-image' });
            release = () => source.close && source.close();
          } catch (_) {
            source = await createImageBitmap(file);
            release = () => source.close && source.close();
          }
        } else source = await imageElementFromFile(file);
      } catch (_) { source = await imageElementFromFile(file); }

      const sourceWidth = Number(source.width || source.naturalWidth || 0);
      const sourceHeight = Number(source.height || source.naturalHeight || 0);
      if (!sourceWidth || !sourceHeight) throw new Error('decode');

      stage = 'canvas';
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.drawImage(source, 0, 0, width, height);

      stage = 'encode';
      const encode = mime => new Promise(resolve => canvas.toBlob(resolve, mime, WEBP_UPLOAD_QUALITY));
      let blob = null;
      let mime = 'image/webp';
      if (await canEncodeWebp()) blob = await encode('image/webp');
      // Fall back rather than refusing the upload. The image still gets
      // resized, re-encoded and stripped of metadata; only the container
      // differs, and the server accepts these three for member uploads.
      if (!blob || blob.type !== 'image/webp') {
        for (const candidate of ['image/jpeg', 'image/png']) {
          const out = await encode(candidate);
          if (out && out.type === candidate && out.size) { blob = out; mime = candidate; break; }
        }
      }
      if (!(blob instanceof Blob) || !blob.size) throw new Error('encode');

      stage = 'read';
      const ext = mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg';
      const filename = webpFileName(box).replace(/\.webp$/, '.' + ext);
      const outFile = typeof File === 'function' ? new File([blob], filename, { type: mime, lastModified: Date.now() }) : blob;
      const url = await dataUrlFromBlob(blob);
      if (!new RegExp('^data:' + mime.replace('/', '\\/') + '(?:;|,)', 'i').test(String(url))) throw new Error('read');
      if (mime !== 'image/webp') toasglass('ℹ️ این مرورگر WebP نمی‌سازد؛ تصویر به ' + (ext === 'jpg' ? 'JPEG' : 'PNG') + ' فشرده و ذخیره شد.');
      return { url, file: outFile, filename, w: width, h: height, kb: Math.max(1, Math.ceil(blob.size / 1024)), fmt: ext, mime };
    } catch (e) {
      // One message per real cause, instead of blaming WebP for everything.
      toasglass({
        decode: '⚠️ این تصویر باز نشد. اگر عکس HEIC آیفون است، یک بار بازش کنید و به‌صورت JPEG ذخیره کنید.',
        canvas: '⚠️ مرورگر اجازهٔ پردازش تصویر نداد. صفحه را تازه کنید و دوباره امتحان کنید.',
        encode: '⚠️ فشرده‌سازی تصویر در این مرورگر ممکن نشد. تصویر ذخیره نشد.',
        read: '⚠️ خواندن تصویر فشرده‌شده ناموفق بود. تصویر ذخیره نشد.',
      }[String(e && e.message)] || '⚠️ پردازش تصویر ناموفق بود (' + stage + '). تصویر ذخیره نشد.');
      return null;
    } finally { release(); }
  };
  window.shMediaDel = id => { mediaLib.del(id); toasglass('🗑️ تصویر از کتابخانه حذف شد'); pages.dashboard(); };

  /* ---------- سیستم برچسب‌ها و تصاویر قابل‌ویرایش (پنل مدیر) ---------- */
  const labelStore = {
    get() { try { return JSON.parse(localStorage.getItem('sh_labels') || '{}'); } catch (e) { return {}; } },
    set(m) { localStorage.setItem('sh_labels', JSON.stringify(m)); },
  };
  const imgStore = {
    get() { try { return JSON.parse(localStorage.getItem('sh_imgs') || '{}'); } catch (e) { return {}; } },
    set(m) { localStorage.setItem('sh_imgs', JSON.stringify(m)); },
  };
  const LABEL_DEFS = [
    ['nav-home', 'خانه', 'منوی بالا'], ['nav-pools', 'استخرها', 'منوی بالا'], ['nav-coaches', 'مربیان', 'منوی بالا'], ['nav-courses', 'دوره‌ها', 'منوی بالا'], ['nav-hydro', 'هیدروتراپی', 'منوی بالا'],
    ['hero-badge', '✨ اکوسیستم جامع شنا — استخر جو | ESTAKHRJO', 'صفحه اصلی'], ['hero-h1a', 'دنیای', 'صفحه اصلی'], ['hero-h1word', 'شنا', 'صفحه اصلی'], ['hero-h1b', 'در', 'صفحه اصلی'], ['hero-h1em', 'یک پلتفرم', 'صفحه اصلی'],
    ['hero-sub', 'استخر نزدیکت را پیدا کن، بهترین مربی را انتخاب کن، بلیت بگیر. همه‌چیز برای دنیای شنا — زیبا، سریع، هوشمند.', 'صفحه اصلی'],
    ['home-why', 'چرا', 'بخش‌ها'], ['home-why-brand', 'استخر جو | ESTAKHRJO', 'بخش‌ها'], ['home-why-sub', 'تجربه‌ای که هیچ‌کجا شبیهش نیست', 'بخش‌ها'],
    ['deal-title', '⚡ شگفت‌انگیز', 'بخش‌ها'], ['feat-book', 'رزرو سریع', 'ویژگی‌ها'], ['feat-book-sub', 'یک کلیک تا بلیت شنای فردای تو — انتخاب سانس، پرداخت، تمام!', 'ویژگی‌ها'],
    ['foot-badge', 'B.M', 'فوتر'],
    ['tab-overview', '📊 داشبورد', 'پنل'], ['tab-inbox', '🎧 پشتیبانی', 'پنل'], ['tab-shop', '🛒 فروشگاه تأمین‌کنندگان', 'پنل'],
    ['tab-bookings', '🎫 بلیت‌های من', 'پنل'], ['tab-ads', '🛍️ آگهی‌های من', 'پنل'], ['tab-fav', '❤️ علاقه‌مندی‌ها', 'پنل'], ['tab-wallet', '💳 کیف پول', 'پنل'],
    ['tab-work', '🏊 محل کار و سانس‌ها', 'پنل'], ['tab-b2b', '🏭 شبکه تأمین B2B', 'پنل'], ['tab-jobs', '🔥 آگهی‌های استخدام', 'پنل'],
    ['tab-resumes', '📄 برد رزومه', 'پنل'], ['tab-management', '👑 پنل مدیریت', 'پنل'], ['tab-hydro', '💆 هیدروتراپی', 'پنل'], ['tab-events', '🏅 رویدادها', 'پنل'], ['tab-articles', '📰 مجله شنا', 'پنل'], ['tab-control', '⚙️ محیط کنترل پیشرفته', 'پنل'], ['tab-cv', '📄 رزومه‌ساز هوشمند', 'پنل'], ['tab-sub', '🔁 آگهی جایگزینی', 'پنل'],
  ];
  const LBL = key => { const m = labelStore.get(); return (m[key] !== undefined && m[key] !== '') ? m[key] : (LABEL_DEFS.find(d => d[0] === key) || [0, key])[1]; };
  const IMG_DEFS = [
    ['hero-index', 'assets/swim-bg.webp', 'پس‌زمینه هیرو صفحه اصلی'],
    ['panel-hero', 'assets/panel-hero.webp', 'هیروی داشبورد'], ['panel-coach', 'assets/panel-coach.webp', 'هیروی مربی'], ['panel-user', 'assets/panel-user.webp', 'هیروی کاربر'],
    ['panel-coach-w', 'assets/panel-coach-w.webp', 'هیروی مربی (بانوان)'], ['panel-user-w', 'assets/panel-user-w.webp', 'هیروی کاربر (بانوان)'],
    ['tab-inbox', 'assets/tab-inbox.webp', 'هیروی صندوق پیام'], ['tab-wallet', 'assets/tab-wallet.webp', 'هیروی کیف پول'], ['tab-fav', 'assets/tab-fav.webp', 'هیروی علاقه‌مندی'],
    ['tab-ads', 'assets/tab-ads.webp', 'هیروی آگهی‌ها'], ['tab-bookings', 'assets/tab-bookings.webp', 'هیروی بلیت‌ها'], ['tab-shop', 'assets/tab-b2b.webp', 'هیروی فروشگاه تأمین‌کنندگان'],
    ['tab-b2b', 'assets/tab-b2b.webp', 'هیروی B2B'], ['tab-jobs', 'assets/tab-jobs.webp', 'هیروی استخدام'], ['tab-hydro', 'assets/tab-hydro.webp', 'هیروی هیدروتراپی'],
    ['tab-events', 'assets/tab-events.webp', 'هیروی رویدادها'], ['tab-articles', 'assets/tab-articles.webp', 'هیروی مجله'], ['tab-resumes', 'assets/panel-coach.webp', 'هیروی رزومه'], ['tab-cv', 'assets/tab-cv.webp', 'هیروی رزومه‌ساز'], ['tab-sub', 'assets/tab-sub.webp', 'هیروی آگهی جایگزینی'],
  ];
  const IMG = key => { const m = imgStore.get(); return m[key] || (IMG_DEFS.find(d => d[0] === key) || [0, ''])[1]; };
  window.shSyncLabels = () => {
    document.querySelectorAll('[data-lbl]').forEach(el => { el.textContent = LBL(el.dataset.lbl); });
    document.body.classList.toggle('ui-no-announce', !uiFlags.on('announce'));
    document.body.classList.toggle('ui-no-quick', !uiFlags.on('home_quick'));
  };
  const shApplyAfterEdit = () => { try { const fn = pages[PAGE]; if (fn) fn(); shSyncLabels(); } catch (e) {} };
  window.shSetLabel = (key, val) => { const m = labelStore.get(); if (val && val.trim()) m[key] = val.trim(); else delete m[key]; labelStore.set(m); shApplyAfterEdit(); };
  window.shSetImg = (key, val) => {
    const source = String(val || '').trim();
    if (source && !isWebpVisualSource(source)) { toasglass('⚠️ نشانی تصویر باید WebP باشد؛ برای تبدیل خودکار، فایل را آپلود کنید.'); return; }
    const m = imgStore.get(); if (source) m[key] = source; else delete m[key]; imgStore.set(m); shApplyAfterEdit();
  };
  window.shImgUpload = (key, inp) => {
    const file = inp.files && inp.files[0]; if (!file) return;
    const fn2 = async () => {
      if (file.size > 9 * 1024 * 1024) { toasglass('⚠️ حداکثر ۹ مگابایت'); inp.value = ''; return; }
      const r = await shImgOpt(file, key === 'hero-index' ? 'hero' : 'card'); if (!r) { toasglass('⚠️ خواندن تصویر ممکن نشد'); return; }
      const m = imgStore.get(); m[key] = r.url; imgStore.set(m);
      mediaLib.add({ cat: 'ui', ref: key, filename: r.filename, fmt: r.fmt, kb: r.kb, w: r.w, h: r.h, url: r.url.slice(0, 220) + '…' });
      toasglass('🖼️ تصویر «' + key + '» بهینه‌سازی شد (' + toFa(r.kb) + 'KB)');
      shApplyAfterEdit();
    };
    fn2();
  };
  const uiFlags = {
    get() { try { return JSON.parse(localStorage.getItem('sh_ui') || '{}'); } catch (e) { return {}; } },
    set(k, v) { const m = uiFlags.get(); m[k] = v; localStorage.setItem('sh_ui', JSON.stringify(m)); },
    on(k) { const m = uiFlags.get(); return m[k] !== false; },
  };
  window.shUiToggle = (k, el) => { uiFlags.set(k, el.checked); toasglass(el.checked ? '✓ نمایش فعال شد' : '✓ مخفی شد'); };

  /* ---------- Design System منتشرشونده: فقط tokenهای بصری، بدون دادهٔ شخصی ---------- */
  const DESIGN_KEY = 'sh_design_system';
  const DESIGN_DEFAULTS = {
    version: 2,
    colors: { brand: '#22d3ee', brand2: '#0ea5e9', accent: '#f5c66b' },
    typography: { font: 'vazirmatn', base: 16, leading: 1.85 },
    layout: { contentMax: 1280, sidebarWidth: 272, radius: 20, cardMin: 272, density: 'comfortable' },
    experience: { motion: 'full', contrast: 'standard' },
    icons: { theme: 'tide-line' },
  };
  const DESIGN_FONTS = {
    vazirmatn: { label: 'وزیرمتن — خوانا و پیش‌فرض', family: "'Vazirmatn', system-ui, sans-serif" },
    noto: { label: 'Noto Sans Arabic — رسمی و متعادل', family: "'Noto Sans Arabic', 'Vazirmatn', sans-serif" },
    naskh: { label: 'Noto Naskh Arabic — متن‌محور', family: "'Noto Naskh Arabic', 'Vazirmatn', serif" },
  };
  const designNumber = (value, fallback, min, max) => {
    const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const designHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
  function normalizeDesign(raw) {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const colors = input.colors || {}, typography = input.typography || {}, layout = input.layout || {}, experience = input.experience || {}, icons = input.icons || {};
    return {
      version: 2,
      colors: {
        brand: designHex(colors.brand, DESIGN_DEFAULTS.colors.brand),
        brand2: designHex(colors.brand2, DESIGN_DEFAULTS.colors.brand2),
        accent: designHex(colors.accent, DESIGN_DEFAULTS.colors.accent),
      },
      typography: {
        font: DESIGN_FONTS[typography.font] ? typography.font : DESIGN_DEFAULTS.typography.font,
        base: designNumber(typography.base, DESIGN_DEFAULTS.typography.base, 14, 19),
        leading: designNumber(typography.leading, DESIGN_DEFAULTS.typography.leading, 1.55, 2.2),
      },
      layout: {
        contentMax: designNumber(layout.contentMax, DESIGN_DEFAULTS.layout.contentMax, 1040, 1600),
        sidebarWidth: designNumber(layout.sidebarWidth, DESIGN_DEFAULTS.layout.sidebarWidth, 228, 340),
        radius: designNumber(layout.radius, DESIGN_DEFAULTS.layout.radius, 12, 32),
        cardMin: designNumber(layout.cardMin, DESIGN_DEFAULTS.layout.cardMin, 240, 380),
        density: ['compact', 'comfortable', 'relaxed'].includes(layout.density) ? layout.density : DESIGN_DEFAULTS.layout.density,
      },
      experience: {
        motion: ['full', 'reduced'].includes(experience.motion) ? experience.motion : DESIGN_DEFAULTS.experience.motion,
        contrast: ['standard', 'high'].includes(experience.contrast) ? experience.contrast : DESIGN_DEFAULTS.experience.contrast,
      },
      icons: { theme: ['tide-line', 'lagoon-duotone', 'nocturne-crest'].includes(icons.theme) ? icons.theme : DESIGN_DEFAULTS.icons.theme },
    };
  }
  const designSystem = {
    get() { try { return normalizeDesign(JSON.parse(localStorage.getItem(DESIGN_KEY) || 'null')); } catch (e) { return normalizeDesign(null); } },
    setLocal(settings) { const clean = normalizeDesign(settings); localStorage.setItem(DESIGN_KEY, JSON.stringify(clean)); return clean; },
    apply(settings, persist) {
      const clean = normalizeDesign(settings); const root = document.documentElement; const font = DESIGN_FONTS[clean.typography.font];
      root.style.setProperty('--brand', clean.colors.brand);
      root.style.setProperty('--brand-2', clean.colors.brand2);
      root.style.setProperty('--gold', clean.colors.accent);
      root.style.setProperty('--font', font.family);
      root.style.setProperty('--base-font-size', clean.typography.base + 'px');
      root.style.setProperty('--body-leading', String(clean.typography.leading));
      root.style.setProperty('--content-max', clean.layout.contentMax + 'px');
      root.style.setProperty('--sidebar-width', clean.layout.sidebarWidth + 'px');
      root.style.setProperty('--radius-surface', clean.layout.radius + 'px');
      root.style.setProperty('--radius-control', Math.max(10, clean.layout.radius - 6) + 'px');
      root.style.setProperty('--card-min', clean.layout.cardMin + 'px');
      root.dataset.uiDensity = clean.layout.density;
      root.dataset.uiMotion = clean.experience.motion;
      root.dataset.uiContrast = clean.experience.contrast;
      if (window.ESTAKHRJO_ICONS?.setTheme) window.ESTAKHRJO_ICONS.setTheme(clean.icons.theme, persist);
      if (persist) this.setLocal(clean);
      return clean;
    },
  };
  const designFieldValue = (id, fallback) => document.getElementById(id)?.value ?? fallback;
  const designFromForm = () => normalizeDesign({
    colors: { brand: designFieldValue('dsBrand', DESIGN_DEFAULTS.colors.brand), brand2: designFieldValue('dsBrand2', DESIGN_DEFAULTS.colors.brand2), accent: designFieldValue('dsAccent', DESIGN_DEFAULTS.colors.accent) },
    typography: { font: designFieldValue('dsFont', DESIGN_DEFAULTS.typography.font), base: designFieldValue('dsBase', DESIGN_DEFAULTS.typography.base), leading: designFieldValue('dsLeading', DESIGN_DEFAULTS.typography.leading) },
    layout: { contentMax: designFieldValue('dsContentMax', DESIGN_DEFAULTS.layout.contentMax), sidebarWidth: designFieldValue('dsSidebar', DESIGN_DEFAULTS.layout.sidebarWidth), radius: designFieldValue('dsRadius', DESIGN_DEFAULTS.layout.radius), cardMin: designFieldValue('dsCardMin', DESIGN_DEFAULTS.layout.cardMin), density: designFieldValue('dsDensity', DESIGN_DEFAULTS.layout.density) },
    experience: { motion: designFieldValue('dsMotion', DESIGN_DEFAULTS.experience.motion), contrast: designFieldValue('dsContrast', DESIGN_DEFAULTS.experience.contrast) },
    icons: { theme: designFieldValue('dsIconSeries', DESIGN_DEFAULTS.icons.theme) },
  });
  const designStudioHtml = () => {
    const d = designSystem.get(); const select = (id, entries, selected, label) => `<label class="design-field">${label}<select id="${id}" oninput="shDesignPreview()">${entries.map(([value, text]) => `<option value="${value}" ${String(value) === String(selected) ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
    const number = (id, value, min, max, step, label) => `<label class="design-field">${label}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" oninput="shDesignPreview()"></label>`;
    const color = (id, value, label) => `<label class="design-field design-color"><input id="${id}" type="color" value="${value}" oninput="shDesignPreview()"><span>${label}</span></label>`;
    const iconFamily = (id, selected) => { const source = window.ESTAKHRJO_ICONS; const series = source?.themes || { 'tide-line': { fa: 'خطی اقیانوسی', description: 'خطوط نرم و سبک' }, 'lagoon-duotone': { fa: 'دوتون لاگون', description: 'قاب شیشه‌ای دو رنگ' }, 'nocturne-crest': { fa: 'نشان شبانه', description: 'پنل تیره و لوکس' } }; const sample = name => source?.render ? source.render(name, '', 'design-icon-sample') : '◌'; return `<input type="hidden" id="${id}" value="${selected}"><div class="design-icon-series" role="radiogroup" aria-label="سری آیکن سراسری">${Object.entries(series).map(([key, item]) => `<button type="button" data-icon-series="${key}" data-estakhrjo-icon-theme="${key}" role="radio" aria-checked="${key === selected}" class="${key === selected ? 'on' : ''}" onclick="shIconSeriesPreview('${key}')"><span class="design-icon-samples">${sample('pool')}${sample('shield')}${sample('calendar')}</span><b>${esc(item.fa || item.label || key)}</b><small>${esc(item.description || '')}</small></button>`).join('')}</div>`; };
    return `<section class="design-studio" aria-labelledby="designStudioTitle">
      <header class="design-studio-head"><div><span>سیستم طراحی یکپارچه</span><h3 id="designStudioTitle">استودیوی ظاهر و تجربهٔ کاربری</h3><p>توکن‌های زیر برای سایت عمومی و تمام پنل‌ها منتشر می‌شوند؛ تنظیمات فقط توسط مدیر ذخیره می‌شود و هیچ دادهٔ کاربر در این بخش وجود ندارد.</p></div><div class="admin-view-actions"><span class="admin-live"><i></i>پیش‌نمایش زنده</span><button class="btn btn-ghost btn-sm" onclick="shDesignReset()">↺ بازگردانی استاندارد</button></div></header>
      <div class="design-studio-grid">
        <section class="design-card"><div class="design-card-head"><span>🎨</span><div><h4>هویت رنگ</h4><p>سه رنگ semantic برای action، تأکید و وضعیت premium.</p></div></div><div class="design-fields">${color('dsBrand',d.colors.brand,'رنگ اصلی')}${color('dsBrand2',d.colors.brand2,'رنگ مکمل')}${color('dsAccent',d.colors.accent,'رنگ تأکید')}</div></section>
        <section class="design-card wide design-icon-card"><div class="design-card-head"><span>${window.ESTAKHRJO_ICONS?.render ? window.ESTAKHRJO_ICONS.render('pool') : '◌'}</span><div><h4>سری آیکن Estakhrjo</h4><p>یک family واحد برای سایت، پنل اعضا، پنل مدیریت و Builder انتخاب کنید. تغییر، پیش‌نمایش زنده دارد و بعد از ذخیره در کل محصول منتشر می‌شود.</p></div></div>${iconFamily('dsIconSeries',d.icons.theme)}</section>
        <section class="design-card"><div class="design-card-head"><span>ع</span><div><h4>تایپوگرافی فارسی</h4><p>فونت محلی، اندازهٔ پایه و فاصلهٔ خطوط در یک معیار خوانایی.</p></div></div><div class="design-fields">${select('dsFont',Object.entries(DESIGN_FONTS).map(([id,x])=>[id,x.label]),d.typography.font,'فونت')}${number('dsBase',d.typography.base,14,19,1,'اندازهٔ پایه (px)')}${number('dsLeading',d.typography.leading,1.55,2.2,.05,'فاصلهٔ خط')}</div></section>
        <section class="design-card"><div class="design-card-head"><span>▦</span><div><h4>چیدمان سیال</h4><p>عرض محتوا، ناوبری پنل و حداقل عرض کارت بدون شکستن موبایل.</p></div></div><div class="design-fields">${number('dsContentMax',d.layout.contentMax,1040,1600,20,'حداکثر عرض محتوا')}${number('dsSidebar',d.layout.sidebarWidth,228,340,4,'عرض سایدبار')}${number('dsCardMin',d.layout.cardMin,240,380,4,'حداقل عرض کارت')}${number('dsRadius',d.layout.radius,12,32,1,'گردی سطوح')}</div></section>
        <section class="design-card wide"><div class="design-card-head"><span>✦</span><div><h4>تجربه و دسترس‌پذیری</h4><p>تراکم را متناسب با حجم عملیات انتخاب کنید؛ کاهش حرکت به افراد حساس به animation کمک می‌کند.</p></div></div><div class="design-fields">${select('dsDensity',[['compact','فشرده — عملیات پرتراکم'],['comfortable','متعادل — پیشنهاد استخر جو | ESTAKHRJO'],['relaxed','باز — مطالعه و آموزش']],d.layout.density,'تراکم اطلاعات')}${select('dsMotion',[['full','حرکت ملایم'],['reduced','حرکت کاهش‌یافته']],d.experience.motion,'حرکت')}${select('dsContrast',[['standard','کنتراست استاندارد'],['high','کنتراست بالا']],d.experience.contrast,'کنتراست')}</div></section>
        <section class="design-card wide"><div class="design-card-head"><span>🧩</span><div><h4>ساختار، محتوا و رسانه</h4><p>ظاهر در همین استودیو تنظیم می‌شود؛ ساختارهای عملیاتی و محتوایی نیز از مسیرهای تخصصی زیر قابل ویرایش‌اند.</p></div></div><div class="design-module-links"><button class="btn btn-ghost" onclick="shAdminControlOpen('control-site')">🌐 قواعد سایت</button><button class="btn btn-ghost" onclick="shAdminControlOpen('control-panel')">🧭 قواعد پنل</button><button class="btn btn-ghost" onclick="shAdminControlOpen('control-content')">✏️ متن و برچسب‌ها</button><button class="btn btn-ghost" onclick="shAdminControlOpen('control-media')">🖼️ رسانه و هیرو</button></div></section>
        <section class="design-card full"><div class="design-card-head"><span>👁️</span><div><h4>پیش‌نمایش در مقیاس واقعی</h4><p>تغییرهای فرم هم‌زمان روی همین صفحه و همهٔ componentهای فعلی preview می‌شوند.</p></div></div><div class="design-preview"><div class="design-preview-canvas"><span class="sec-kicker">تجربهٔ هماهنگ استخر جو | ESTAKHRJO</span><h5>سریع پیدا کنید، با اطمینان مدیریت کنید.</h5><p>نمونه‌ای از hierarchy، رنگ، خوانایی و لمس‌پذیری در سایت و پنل.</p><div><button class="btn btn-primary" type="button">اقدام اصلی</button><button class="btn btn-ghost" type="button">اقدام ثانویه</button></div></div><aside class="design-preview-notes"><b>✓ معیارهای غیرقابل‌حذف</b><span>همهٔ کنترل‌ها حداقل ۴۴×۴۴ پیکسل هستند.</span><span>چیدمان از موبایل تا دسکتاپ با grid سیال بازچینی می‌شود.</span><span>فونت و رنگ‌ها فقط از دارایی‌های محلی و tokenهای امن استفاده می‌کنند.</span></aside></div></section>
      </div>
      <footer class="design-actions"><p>انتشار، tokenهای بصری را در view عمومی محدود به تنظیمات طراحی قرار می‌دهد. اطلاعات خصوصی پنل و اعضا هرگز عمومی نمی‌شود.</p><div><button class="btn btn-ghost" onclick="shDesignReset()">بازنشانی</button><button class="btn btn-primary" onclick="shAdminDesignSave()">✓ ذخیره و انتشار طراحی</button></div></footer>
    </section>`;
  };
  window.shIconSeriesPreview = theme => {
    const input = document.getElementById('dsIconSeries'); if (!input) return; input.value = theme;
    document.querySelectorAll('[data-icon-series]').forEach(button => { const on = button.dataset.iconSeries === theme; button.classList.toggle('on', on); button.setAttribute('aria-checked', String(on)); });
    designSystem.apply(designFromForm(), false);
  };
  window.shDesignPreview = () => { designSystem.apply(designFromForm(), false); };
  window.shDesignReset = () => { designSystem.apply(DESIGN_DEFAULTS, false); const root = document.querySelector('.admin-workspace'); if (root && typeof window.shAdminView === 'function') window.shAdminView('design'); toasglass('پیش‌نمایش به استاندارد استخر جو | ESTAKHRJO برگشت'); };
  window.shAdminDesignSave = async () => {
    const settings = designFromForm(); designSystem.apply(settings, true);
    try {
      const cloud = window.SH_CLOUD_AUTH;
      if (cloud && cloud.active && cloud.saveSiteDesign) await cloud.saveSiteDesign(settings);
      else throw new Error('ورود ابری مدیر برای انتشار سراسری لازم است');
      toasglass('✓ طراحی برای سایت و پنل‌ها منتشر شد');
    } catch (e) {
      toasglass('⚠️ پیش‌نمایش محلی ذخیره شد؛ انتشار سراسری انجام نشد: ' + (e.message || 'خطای ارتباط'));
    }
  };
  // Apply the last safe design immediately, avoiding a visual flash before data loads.
  designSystem.apply(designSystem.get(), false);

  /* ---------- دسترس‌پذیری مشترک بعد از هر render ---------- */
  function enhanceAccessibility() {
    const labels = {
      h_gender: 'فیلتر جنسیت', f_g: 'فیلتر جنسیت استخر', fc_q: 'جستجوی مربی', fc_city: 'شهر مربی', fc_g: 'جنسیت مربی', fc_s: 'مرتب‌سازی مربیان',
      fm_q: 'جستجوی محصول', fm_c: 'دسته‌بندی محصول', hydroCity: 'شهر هیدروتراپی', resumeCity: 'شهر رزومه',
      rfTitle: 'موقعیت شغلی', rfAvail: 'نوع همکاری', rfExp: 'حداقل سابقه', rfSkill: 'مهارت', rfCert: 'مدرک', rfGender: 'جنسیت رزومه',
      rs_title: 'عنوان شغلی رزومه', rs_avail: 'نوع همکاری رزومه', ad_cat: 'دسته‌بندی آگهی', ad_cond: 'وضعیت کالای آگهی', ad_gender: 'مخاطب آگهی',
    };
    document.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio' || el.getAttribute('aria-label') || el.labels?.length) return;
      const explicit = labels[el.id];
      const nearby = el.closest('.fd, .form-grid, .city-scope-bar')?.querySelector('label')?.textContent?.trim();
      const fallback = el.getAttribute('placeholder')?.replace(/[🔍*…]/g, '').trim();
      el.setAttribute('aria-label', explicit || nearby || fallback || (el.tagName === 'SELECT' ? 'انتخاب گزینه' : 'فیلد ورودی'));
    });
    document.querySelectorAll('#dealRow, .chat-threads').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.id === 'dealRow' ? 'فهرست افقی پیشنهادهای ویژه' : 'فهرست گفتگوها');
      el.classList.add('keyboard-scroll');
    });
  }

  /* ---------- اجرا ---------- */
  function rerender() { const fn = pages[PAGE]; if (fn) fn(); document.dispatchEvent(new CustomEvent('estakhrjo-page-rendered', { detail: { page: PAGE } })); requestAnimationFrame(enhanceAccessibility); }

  /* ---------- روتر SPA (پیمایش بدون پرش صفحه) ---------- */
  const PAGE_TITLES = {
    index: 'خانه — بزرگ‌ترین اکوسیستم شنای ایران', pools: 'استخرها', pool: 'جزئیات استخر', coaches: 'مربیان شنا', coach: 'پروفایل مربی',
    hydro: 'هیدروتراپی و آب‌درمانی', market: 'فروشگاه تجهیزات شنا', jobs: 'فرصت‌های شغلی', events: 'رویدادها', articles: 'مجله شنا',
    login: 'ورود کسب‌وکارها', admin: 'دروازه مدیر', dashboard: 'داشبورد من', ticket: 'بلیت من', suppliers: 'تأمین‌کنندگان B2B',
    chat: 'پیام‌رسان', resumes: 'برد رزومه', courses: 'دوره‌های آموزشی', ads: 'آگهی‌های اعضا', cart: 'سبد خرید', nearby: 'نزدیک من',
  };
  function shReveal() {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(el => {
      try {
        const target = parseInt(el.dataset.count, 10) || 0;
        if (el.__counted) return; el.__counted = true;
        let cur = 0; const step = Math.max(1, Math.ceil(target / 40));
        const tm = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(tm); } el.textContent = toFa(cur) + (el.dataset.suffix || ''); }, 30);
      } catch (e) {}
    });
  }
  window.shNavigate = function (url, push) {
    if (push !== false) push = true;
    const m = String(url).match(/([a-z]+)\.html(\?[^#]*)?(#.*)?$/i);
    if (!m) { location.href = url; return; }
    const page = m[1].toLowerCase();
    const query = m[2] || '';
    if (!PAGE_TITLES[page] || !pages[page]) { location.href = url; return; }
    if (push) history.pushState({ page }, '', page + '.html' + query);
    PAGE = page;
    document.body.dataset.page = page;
    document.title = PAGE_TITLES[page] + ' — استخر جو | ESTAKHRJO';
    const app = document.getElementById('app');
    app.style.opacity = '0'; app.style.transform = 'translateY(8px)';
    try { pages[page](); } catch (e) { console.error(e); location.href = url; return; }
    const nl = document.getElementById('navLinks'); if (nl) nl.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => { app.style.opacity = ''; app.style.transform = ''; });
    try { syncBadges(); } catch (e) {}
    try { if (window.shSyncLabels) shSyncLabels(); } catch (e) {}
    setTimeout(shReveal, 60);
    if (page === 'dashboard') return;
  };
  window.addEventListener('popstate', () => shNavigate(location.pathname, false));
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    if (PAGE === 'dashboard') return; // پنل داخلی، سیستم تب خودش را دارد
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (/^(tel:|mailto:|javascript:|#)/.test(href) || href.startsWith('http') || href.startsWith('//')) {
      if (href.startsWith('http') || href.startsWith('//')) {
        try { if (new URL(href, location.href).origin === location.origin && /[a-z]+\.html/.test(href)) { e.preventDefault(); shNavigate(href); } } catch (err) {}
      }
      return;
    }
    if (/^\/?[a-z]+\.html/i.test(href)) { e.preventDefault(); shNavigate(href); }
  });

  async function boot() {
    /* Public pages paint their local seed immediately. Private pages (پنل،
       ورود، دروازهٔ مدیر) ALSO paint right away from the cached session —
       the member must see the panel (or the login form) instantly instead of
       a blank shell while ~10 network calls finish; cloud restore, the public
       catalogue, chat and support then land in the background. */
    const isPrivate = ['dashboard', 'console', 'login', 'admin'].includes(PAGE);
    const hideShellPreloader = () => { const pre = document.getElementById('preloader'); if (pre && !pre.classList.contains('done')) pre.classList.add('done'); };
    const restoreSession = async () => {
      try {
        const cloud = window.SH_CLOUD_AUTH;
        if (cloud) {
          const restored = await cloud.restore();
          if (restored && restored.active && restored.account) {
            authAccounts.save(cloud.accounts()); me.set(sessionFor(restored.account, me.get() || {})); renderNav();
            if (cloud.getCvStudio) { const remoteStudio = await cloud.getCvStudio(); if (remoteStudio && remoteStudio.settings) cvStudioStore.setLocal(remoteStudio.settings); }
            return true;
          }
        }
      } catch (e) { console.warn('Cloud account restore skipped', e); }
      return false;
    };
    if (isPrivate) {
      /* ۱) رندر فوری با نشستِ ذخیره‌شدهٔ محلی (کش مجوزها همین کار را برای
         «اولین رنگ‌آمیزی» پیش‌بینی کرده). ۲) رندر دوباره فقط وقتی دادهٔ
         تازهٔ حساب آمد و کاربر هنوز با فرمی درگیر نشده است. */
      rerender();
      hideShellPreloader();
      const restoredNow = await restoreSession();
      const userBusy = () => { const el = document.activeElement; return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName); };
      if (restoredNow && !userBusy()) { rerender(); hideShellPreloader(); }
      else if (!restoredNow && PAGE === 'dashboard' && !cloudSessionPending() && !activeSessionAccount() && me.get()) {
        /* restore نشستِ موجود را رد کرد (توکن باطل/حساب غیرفعال) — خروج تمیز. */
        me.clear(); try { toasglass('برای ادامه با حساب فعال وارد شوید'); } catch (e) {}
        location.href = 'login.html'; return;
      }
      loadSupabase().catch(() => {});
      hydrateCloudChat(true).catch(() => {});
      startSupportPolling();
      try { syncBadges(); } catch (e) {}
      try { if (window.shSyncLabels) shSyncLabels(); } catch (e) {}
      setTimeout(shReveal, 90);
      clearInterval(cloudChat.timer);
      cloudChat.timer = setInterval(() => {
        if (!document.hidden && cloudChatEnabled()) hydrateCloudChat(true).then(() => { if (PAGE === 'dashboard') syncChatUnreadUi(); });
      }, 20_000);
      return;
    }
    rerender();
    const hasSb = await loadSupabase();
    await restoreSession();
    if (hasSb) {
      const badge = document.querySelector('.hero-eyebrow');
      if (badge) badge.innerHTML = '🟢 متصل به دیتابیس زنده Supabase';
    }
    await hydrateCloudChat(true);
    await pollSupport(true);
    rerender();
    startSupportPolling();
    try { syncBadges(); } catch (e) {}
    // شمارش معکوس شگفت‌انگیز (تا نیمه‌شب)
    if (PAGE === 'index') {
      const dc = document.getElementById('dealCount');
      if (dc) {
        const tickDeal = () => {
          try {
            const now = new Date();
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            let d = Math.max(0, end - now);
            const h = Math.floor(d / 3600000), m = Math.floor(d % 3600000 / 60000), s = Math.floor(d % 60000 / 1000);
            const sp = dc.querySelectorAll ? dc.querySelectorAll('span') : [];
            if (sp[0]) sp[0].textContent = toFa(String(h).padStart(2, '0'));
            if (sp[1]) sp[1].textContent = toFa(String(m).padStart(2, '0'));
            if (sp[2]) sp[2].textContent = toFa(String(s).padStart(2, '0'));
          } catch (e) {}
        };
        tickDeal();
        setInterval(tickDeal, 1000);
      }
    }
    try { if (window.shSyncLabels) shSyncLabels(); } catch (e) {}
    setTimeout(shReveal, 90);
    // Poll only the private thread index while a signed-in user is viewing the app.
    // Message bodies are fetched only after a thread is opened.
    clearInterval(cloudChat.timer);
    cloudChat.timer = setInterval(() => {
      if (!document.hidden && cloudChatEnabled()) hydrateCloudChat(true).then(() => { if (PAGE === 'dashboard') syncChatUnreadUi(); });
    }, 20_000);
    // Realtime (فقط اگر Supabase فعال باشد)
    if (hasSb && PAGE === 'pool') {
      // برای سادگی، فقط لاگ می‌کنیم؛ اتصال websocket در نسخه بعدی
      console.log('Supabase realtime ready');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
