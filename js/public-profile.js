/* Estakhrjo — Public Profile v2 renderer.
 *
 * Contract: this file renders. It never invents data and it never lets the
 * member type anything that the platform already knows. Everything under
 * `data` comes straight from the role tables (pools / coaches / suppliers /
 * sessions / courses / products), already filtered by `published=true` on the
 * server. `sections` and `fields` are the member's visibility switches, and
 * `authored` is the small, admin-reviewed block of free text and media.
 *
 * Markup is built from the shared design system (css/app.css +
 * css/experience-system.css). Only layout pieces unique to a profile live in
 * css/public-profile.css, so a change to the site theme changes this page too.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const attr = v => esc(v).replace(/\n/g, ' ');
  const num = v => Number(v || 0).toLocaleString('fa-IR');
  const money = v => Number(v || 0) > 0 ? num(v) + ' تومان' : 'توافقی';
  const arr = v => Array.isArray(v) ? v : [];
  const base = () => window.ESTAKHRJO_ASSET_BASE || '/';
  const hhmm = v => String(v || '').slice(0, 5);
  const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const ROLE_LABEL = { pool: 'مجموعهٔ آبی', coach: 'مربی شنا', supplier: 'تأمین‌کننده و فروشگاه' };

  /* Only https / data:image is ever painted — the server sanitises too, but a
     renderer that trusts its input is a renderer waiting for an incident. */
  const safeImg = v => /^(https:|data:image\/(webp|png|jpeg|jpg|gif))/i.test(String(v || '')) ? String(v) : '';
  const safeHref = v => /^(https?:|mailto:|tel:)/i.test(String(v || '')) ? String(v) : '';

  const jdate = iso => {
    try { return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T00:00:00')); }
    catch (_) { return iso; }
  };
  const relday = iso => {
    const today = new Date().toISOString().slice(0, 10);
    const t = new Date(today); t.setDate(t.getDate() + 1);
    if (iso === today) return 'امروز';
    if (iso === t.toISOString().slice(0, 10)) return 'فردا';
    return jdate(iso);
  };

  /* ------------------------------------------------------------------ api */
  const endpoint = () => String(window.SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/member-auth';
  async function api(action, body) {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: window.SUPABASE_ANON_KEY || '' },
      body: JSON.stringify(Object.assign({ action }, body || {}))
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'دریافت صفحه ناموفق بود');
    return data;
  }

  const qs = new URLSearchParams(location.search);
  const source = () => qs.get('source') || qs.get('utm_source') || 'direct';
  function usernameFromUrl() {
    // A prerendered /@user/index.html states its own identity, which survives
    // any host-level rewrite of the path.
    const baked = document.body && document.body.getAttribute('data-pp-username');
    if (baked) return baked;
    const q = qs.get('username') || qs.get('u');
    if (q) return String(q).replace(/^@/, '');
    const seg = location.pathname.split('/').filter(Boolean);
    for (let i = seg.length - 1; i >= 0; i--) if (seg[i].charAt(0) === '@') return decodeURIComponent(seg[i].slice(1));
    return '';
  }
  const track = type => { api('public-profile-event', { username: state.username, event_type: type, source: source() }).catch(() => {}); };

  function toast(text) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.append(el); }
    el.textContent = text; el.classList.add('show', 'on');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show', 'on'), 2600);
  }

  const state = { username: '', bundle: null };

  /* ------------------------------------------------------- shared partials */
  const panel = (kicker, title, body, id) =>
    `<section class="pp-panel"${id ? ` id="pp-${attr(id)}"` : ''}><span class="pp-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2>${body}</section>`;

  const chips = list => arr(list).filter(Boolean).slice(0, 18).map(v => `<span class="chip">${esc(v)}</span>`).join('');
  const facts = pairs => {
    const html = pairs.filter(p => p && p[1] !== '' && p[1] != null && p[1] !== false).map(p => `<div class="pp-fact"><small>${esc(p[0])}</small><b>${esc(p[1])}</b></div>`).join('');
    return html ? `<div class="pp-facts">${html}</div>` : '';
  };
  const cardImg = (url, fallback) => {
    // Registry/provider photos stay out of public profiles; owners can supply
    // their own media through the profile editor.
    const src = /supabase\.co\/storage\//i.test(String(url || '')) ? '' : safeImg(url);
    if (src) return `<img src="${attr(src)}" alt="" loading="lazy" decoding="async">`;
    const glyph = url && String(url).length <= 6 ? String(url) : (fallback || '🌊');
    return `<span aria-hidden="true" style="font-size:38px">${esc(glyph)}</span>`;
  };

  /* ------------------------------------------------------------ hero block */
  function hero(b) {
    const id = b.identity, f = b.fields || {};
    const pool = arr(b.data.pools)[0] || {};
    const cover = safeImg(b.authored.cover) || safeImg(pool.image);
    const pos = b.authored.cover_position || { x: 50, y: 50 };
    const avatar = safeImg(id.avatar);
    const glyph = !avatar && id.avatar && String(id.avatar).length <= 6 ? String(id.avatar) : '';
    const meta = [];
    if (id.verified) meta.push('<span class="badge-ver">✓ احراز هویت‌شده</span>');
    meta.push(`<span class="chip">${esc(ROLE_LABEL[id.role] || 'عضو استخر جو')}</span>`);
    if (id.city) meta.push(`<span class="chip">📍 ${esc(id.city)}</span>`);
    if (id.rating) meta.push(`<span class="chip">★ ${esc(Number(id.rating).toLocaleString('fa-IR'))}${id.rate_count ? ` <small>(${num(id.rate_count)} نظر)</small>` : ''}</span>`);
    if (f.open_now && pool.open_now) meta.push('<span class="card-live">همین حالا باز است</span>');
    if (f.price_from && pool.price_from) meta.push(`<span class="chip">از ${esc(money(pool.price_from))}</span>`);

    const cta = [];
    if (id.contact.phone) cta.push(`<a class="btn btn-primary" href="tel:${attr(id.contact.phone)}" data-pp-track="contact">📞 تماس</a>`);
    if (id.contact.whatsapp) cta.push(`<a class="btn btn-glass" target="_blank" rel="noopener" href="https://wa.me/${attr(String(id.contact.whatsapp).replace(/[^0-9]/g, ''))}" data-pp-track="whatsapp">واتس‌اپ</a>`);
    if (id.contact.map_url) cta.push(`<a class="btn btn-glass" target="_blank" rel="noopener" href="${attr(id.contact.map_url)}" data-pp-track="map">🗺 مسیریابی</a>`);
    cta.push('<button type="button" class="btn btn-glass" data-pp-share>↗ هم‌رسانی</button>');

    return `<section class="pp-hero">
      ${cover ? `<div class="pp-hero-media" style="background-image:url('${attr(cover)}');background-position:${Number(pos.x) || 50}% ${Number(pos.y) || 50}%"></div>` : ''}
      <div class="container"><div class="pp-hero-inner">
        <div class="pp-avatar">${avatar ? `<img src="${attr(avatar)}" alt="${attr(id.name)}" width="124" height="124">` : esc(glyph || (id.name || '?').trim().charAt(0))}</div>
        <div class="pp-hero-copy">
          <span class="pp-dossier-label">پروندهٔ عضویت اختصاصی</span>
          <h1>${esc(id.name)}</h1>
          ${id.tagline ? `<p>${esc(id.tagline)}</p>` : ''}
          <div class="pp-hero-meta">${meta.join('')}</div>
        </div>
        <div class="pp-hero-actions">${cta.join('')}</div>
      </div></div>
    </section>`;
  }

  function statsRow(b) {
    const d = b.data, f = b.fields || {}, out = [];
    const push = (label, value) => { if (value) out.push(`<div class="pp-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`); };
    if (b.role === 'pool') {
      const p = arr(d.pools)[0] || {};
      push('سانس فعال پیشِ‌رو', arr(d.schedule).length ? num(arr(d.schedule).length) : '');
      push('دورهٔ در حال ثبت‌نام', arr(d.courses).length ? num(arr(d.courses).length) : '');
      push('مربی همکار', arr(d.team).length ? num(arr(d.team).length) : '');
      if (f.water_temp && p.water_temp) push('دمای آب', num(p.water_temp) + '°');
    } else if (b.role === 'coach') {
      const c = d.coach || {};
      if (f.exp_years && c.exp_years) push('سال تجربه', num(c.exp_years));
      if (f.students && c.students) push('شناگر آموزش‌دیده', num(c.students));
      push('استخر محل تدریس', arr(d.pools).length ? num(arr(d.pools).length) : '');
      push('دورهٔ فعال', arr(d.courses).length ? num(arr(d.courses).length) : '');
    } else if (b.role === 'supplier') {
      const s = d.supplier || {};
      push('کالای فعال', arr(d.products).length ? num(arr(d.products).length) : '');
      if (f.category && s.category) push('حوزهٔ فعالیت', s.category);
      if (f.min_order && s.min_order) push('حداقل سفارش', money(s.min_order));
    }
    return out.length ? `<div class="pp-stats">${out.join('')}</div>` : '';
  }

  /* -------------------------------------------------------------- sections */
  const SECTIONS = {
    story(b) {
      const s = String(b.authored.story || '').trim();
      if (!s) return '';
      return panel('دربارهٔ ما', 'معرفی', `<p class="pp-prose">${esc(s)}</p>`, 'story');
    },

    /* ------------------------------------------------------------ pool */
    amenities(b) {
      const p = arr(b.data.pools)[0]; if (!p) return '';
      const f = b.fields || {};
      const flags = [[f.olympic && p.olympic, '🏅 استاندارد المپیک'], [f.hydro && p.hydro, '💧 آب‌درمانی'], [f.sauna && p.sauna, '🔥 سونا'],
        [f.jacuzzi && p.jacuzzi, '🛁 جکوزی'], [f.parking && p.parking, '🅿️ پارکینگ'], [f.wheelchair && p.wheelchair, '♿ دسترس‌پذیر'],
        [f.kids && p.kids, '🧒 استخر کودک']].filter(x => x[0]).map(x => x[1]);
      const extra = [].concat(arr(p.features), arr(p.amenities));
      const body = chips(flags.concat(extra));
      if (!body) return '';
      return panel('امکانات', 'چه چیزی در انتظار شماست', `<div class="pp-hero-meta" style="margin-top:14px">${body}</div>`, 'amenities');
    },
    specs(b) {
      const p = arr(b.data.pools)[0]; if (!p) return '';
      const f = b.fields || {};
      const body = facts([
        [f.kind && 'نوع مجموعه', p.kind], [f.gender && 'پذیرش', p.gender],
        [f.length_m && 'طول استخر', p.length_m ? num(p.length_m) + ' متر' : ''],
        [f.lanes && 'تعداد خط', p.lanes ? num(p.lanes) : ''],
        [f.water_temp && 'دمای آب', p.water_temp ? num(p.water_temp) + ' درجه' : ''],
        [f.price_from && 'شروع قیمت', p.price_from ? money(p.price_from) : ''],
        [f.occupancy && 'اشغال فعلی', p.occupancy ? num(p.occupancy) + '٪' : '']
      ].filter(x => x[0]));
      if (!body) return '';
      return panel('مشخصات فنی', 'اطلاعات مجموعه', body + `<p class="pp-empty-hint">این اعداد مستقیم از پروندهٔ ثبت‌شدهٔ مجموعه در استخر جو خوانده می‌شوند و همیشه به‌روزند.</p>`, 'specs');
    },
    schedule(b) {
      const rows = arr(b.data.schedule); if (!rows.length) return '';
      const days = [...new Set(rows.map(r => r.date))].slice(0, 14);
      const html = days.map(date => {
        const list = rows.filter(r => r.date === date);
        return `<article class="pp-day"><header><span>${esc(relday(date))}</span><small>${num(list.length)} سانس</small></header>${list.map(s => {
          const free = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
          return `<div class="pp-row">
            <div><b>${esc(s.kind || 'شنای آزاد')} · ${esc(hhmm(s.time))}</b><small>${free ? num(free) + ' جای خالی' : 'تکمیل'}${s.duration ? ' · ' + num(s.duration) + ' دقیقه' : ''}</small></div>
            <strong>${esc(money(s.price))}</strong>
            <a class="btn btn-sm btn-primary" href="${attr(base())}pools.html?pool=${encodeURIComponent(s.pool_id || '')}&session=${encodeURIComponent(s.id)}" data-pp-track="booking">رزرو</a>
          </div>`;
        }).join('')}</article>`;
      }).join('');
      return panel('رزرو آنلاین', 'سانس‌های پیشِ‌رو', html, 'schedule');
    },
    team(b) {
      const list = arr(b.data.team); if (!list.length) return '';
      const html = list.map(c => `<article class="card">
        <div class="card-img">${cardImg(c.image, '🏊')}${c.verified ? '<span class="card-ver">✓</span>' : ''}</div>
        <div class="card-body">
          <div class="card-name">${esc(c.full_name)}</div>
          <div class="card-loc">${esc(arr(c.specialties).slice(0, 2).join(' · ') || 'مربی شنا')}</div>
          <div class="card-rate">${c.rating ? '★ ' + esc(Number(c.rating).toLocaleString('fa-IR')) : ''} ${c.exp_years ? '· ' + num(c.exp_years) + ' سال تجربه' : ''}</div>
          <a class="btn btn-sm btn-glass" href="${attr(base())}coaches.html?coach=${encodeURIComponent(c.id)}">پروفایل مربی</a>
        </div></article>`).join('');
      return panel('تیم حرفه‌ای', 'مربیان این مجموعه', `<div class="cards" style="margin-top:16px">${html}</div>`, 'team');
    },
    hiring(b) {
      const list = arr(b.data.hiring); if (!list.length) return '';
      const html = list.map(j => `<div class="pp-row">
        <div><b>${esc(j.title)}</b><small>${esc([j.level, j.gender, j.schedule].filter(Boolean).join(' · '))}</small></div>
        <strong>${j.salary ? esc(money(j.salary)) : 'توافقی'}</strong>
        <a class="btn btn-sm btn-glass" href="${attr(base())}jobs.html?job=${encodeURIComponent(j.id)}">ارسال رزومه</a>
      </div>`).join('');
      return panel('همکاری', 'فرصت‌های شغلی این مجموعه', `<div class="pp-list">${html}</div>`, 'hiring');
    },

    /* ----------------------------------------------------------- coach */
    credentials(b) {
      const c = b.data.coach; if (!c) return '';
      const f = b.fields || {};
      const list = [].concat(f.certs ? arr(c.certs) : [], f.medals ? arr(c.medals) : []);
      if (!list.length) return '';
      return panel('اعتبارنامه', 'مدارک و افتخارات', `<div class="pp-hero-meta" style="margin-top:14px">${chips(list)}</div>`, 'credentials');
    },
    expertise(b) {
      const c = b.data.coach; if (!c) return '';
      const f = b.fields || {};
      const tags = [].concat(f.specialties ? arr(c.specialties) : [], f.levels ? arr(c.levels) : [], f.age_groups ? arr(c.age_groups) : []);
      const extra = [f.online && c.online ? 'مشاورهٔ آنلاین' : '', f.home_pool && c.home_pool ? 'استخر پایه: ' + c.home_pool : ''].filter(Boolean);
      const body = (c.bio ? `<p class="pp-prose">${esc(c.bio)}</p>` : '') +
        (tags.length || extra.length ? `<div class="pp-hero-meta" style="margin-top:14px">${chips(tags.concat(extra))}</div>` : '');
      if (!body) return '';
      return panel('تخصص', 'حوزهٔ کاری و سطح آموزش', body, 'expertise');
    },
    pricing(b) {
      const c = b.data.coach; if (!c) return '';
      const f = b.fields || {};
      const body = facts([
        [f.private_price && 'جلسهٔ خصوصی', c.private_price ? money(c.private_price) : ''],
        [f.group_price && 'کلاس گروهی', c.group_price ? money(c.group_price) : ''],
        [f.hourly_rate && 'نرخ ساعتی', c.hourly_rate ? money(c.hourly_rate) : '']
      ].filter(x => x[0]));
      if (!body) return '';
      return panel('تعرفه', 'هزینهٔ آموزش', body + '<p class="pp-empty-hint">تعرفه‌ها از پروفایل مربی در استخر جو خوانده می‌شود؛ برای تغییر، همان پروفایل را ویرایش کنید.</p>', 'pricing');
    },
    pools(b) {
      const list = arr(b.data.pools); if (!list.length) return '';
      const html = list.map(p => {
        const slots = arr(b.data.availability).filter(s => String(s.pool_id || '') === String(p.id || '') || String(s.pool_name || '') === String(p.name || ''));
        const slotHtml = slots.length ? `<div class="pp-pool-slots"><div class="pp-pool-slots-head"><b>سانس‌های این استخر</b><small>برنامهٔ مستقل این مجموعه</small></div>${slots.map(s => `<span>🗓️ ${esc(WEEKDAYS[Number(s.weekday) || 0])} · ${esc(hhmm(s.start_time))} تا ${esc(hhmm(s.end_time))}</span>`).join('')}</div>` : '';
        return `<article class="card pp-pool-card">
        <div class="card-img">${cardImg(p.image, '🏊')}${p.verified ? '<span class="card-ver">✓</span>' : ''}</div>
        <div class="card-body">
          <div class="card-name">${esc(p.name)}</div>
          <div class="card-loc">📍 ${esc([p.city, p.district].filter(Boolean).join('، '))}</div>
          <div class="card-rate">${p.rating ? '★ ' + esc(Number(p.rating).toLocaleString('fa-IR')) : ''}${p.price_from ? ' · از ' + esc(money(p.price_from)) : ''}</div>
          ${slotHtml}
          <a class="btn btn-sm btn-glass" href="${attr(base())}pools.html?pool=${encodeURIComponent(p.id)}">مشاهدهٔ استخر</a>
        </div></article>`;
      }).join('');
      const title = b.role === 'coach' ? 'استخرهای محل تدریس' : 'مجموعه‌های زیرمجموعه';
      return panel('محل حضور', title, `<div class="cards" style="margin-top:16px">${html}</div>`, 'pools');
    },
    availability(b) {
      const list = arr(b.data.availability); if (!list.length) return '';
      const byDay = {};
      list.forEach(s => { (byDay[Number(s.weekday) || 0] = byDay[Number(s.weekday) || 0] || []).push(s); });
      const html = Object.keys(byDay).sort((a, z) => a - z).map(d => `<div class="pp-week-day"><b>${esc(WEEKDAYS[d] || 'روز ' + num(d))}</b>${
        byDay[d].map(s => `<span class="pp-slot">${esc(hhmm(s.start_time))} – ${esc(hhmm(s.end_time))}${s.pool_name ? ' · ' + esc(s.pool_name) : ''}</span>`).join('')
      }</div>`).join('');
      return panel('زمان‌های آزاد', 'برنامهٔ هفتگی', `<div class="pp-week">${html}</div>
        <a class="btn btn-primary" style="margin-top:16px" href="${attr(base())}chat.html?to=${encodeURIComponent(b.username)}" data-pp-track="private_session">درخواست جلسهٔ خصوصی</a>`, 'availability');
    },

    /* -------------------------------------------------------- supplier */
    services(b) {
      const s = b.data.supplier; if (!s) return '';
      const list = [].concat(arr(s.services), arr(s.products));
      const body = (s.description ? `<p class="pp-prose">${esc(s.description)}</p>` : '') + (list.length ? `<div class="pp-hero-meta" style="margin-top:14px">${chips(list)}</div>` : '');
      if (!body) return '';
      return panel('خدمات', 'حوزهٔ فعالیت', body, 'services');
    },
    catalog(b) {
      const list = arr(b.data.products); if (!list.length) return '';
      const html = list.map(p => `<article class="card">
        <div class="card-img">${cardImg(p.image, p.emoji || '📦')}${Number(p.stock) <= 0 ? '' : '<span class="card-live">موجود</span>'}</div>
        <div class="card-body">
          <div class="card-name">${esc(p.name)}</div>
          <div class="card-loc">${esc([p.brand, p.category].filter(Boolean).join(' · '))}</div>
          <div class="card-rate"><strong>${esc(money(p.price))}</strong>${p.old_price ? ` <s style="opacity:.55">${esc(num(p.old_price))}</s>` : ''}</div>
          <a class="btn btn-sm btn-primary" href="${attr(base())}market.html?product=${encodeURIComponent(p.id)}" data-pp-track="products">مشاهده و خرید</a>
        </div></article>`).join('');
      return panel('فروشگاه', 'کاتالوگ کالا', `<div class="cards" style="margin-top:16px">${html}</div>`, 'catalog');
    },
    b2b(b) {
      const s = b.data.supplier; if (!s) return '';
      const f = b.fields || {};
      const body = facts([
        [f.min_order && 'حداقل سفارش', s.min_order ? money(s.min_order) : ''],
        [f.category && 'دستهٔ اصلی', s.category],
        ['شهر انبار', s.city]
      ].filter(x => x[0]));
      if (!body) return '';
      return panel('همکاری عمده', 'شرایط B2B', body + `<a class="btn btn-primary" style="margin-top:16px" href="${attr(base())}chat.html?to=${encodeURIComponent(b.username)}" data-pp-track="contact">درخواست پیش‌فاکتور</a>`, 'b2b');
    },

    /* ---------------------------------------------------------- common */
    courses(b) {
      const list = arr(b.data.courses); if (!list.length) return '';
      const html = list.map(c => {
        const left = Math.max(0, Number(c.capacity || 0) - Number(c.enrolled || 0));
        return `<div class="pp-row">
          <div><b>${esc(c.title)}</b><small>${esc([c.level, c.coach_name, c.pool_name, c.schedule].filter(Boolean).join(' · '))}${left ? ' · ' + num(left) + ' ظرفیت باقی' : ' · تکمیل'}</small></div>
          <strong>${esc(money(c.price))}</strong>
          <a class="btn btn-sm btn-primary" href="${attr(base())}courses.html?course=${encodeURIComponent(c.id)}" data-pp-track="class_booking">ثبت‌نام</a>
        </div>`;
      }).join('');
      return panel('آموزش', 'دوره‌های قابل ثبت‌نام', `<div class="pp-list">${html}</div>`, 'courses');
    },
    gallery(b) {
      const imgs = arr(b.authored.gallery).map(g => Object.assign({}, g, { url: safeImg(g && g.url) })).filter(g => g.url);
      const vids = arr(b.authored.videos).filter(v => safeHref(v && v.url));
      if (!imgs.length && !vids.length) return '';
      const g = imgs.length ? `<div class="pp-gallery">${imgs.map(i => `<figure><img src="${attr(i.url)}" alt="${attr(i.alt || '')}" loading="lazy" decoding="async">${i.alt ? `<figcaption>${esc(i.alt)}</figcaption>` : ''}</figure>`).join('')}</div>` : '';
      const v = vids.map(x => `<video class="pp-video" controls preload="none"${x.poster && safeImg(x.poster) ? ` poster="${attr(safeImg(x.poster))}"` : ''} src="${attr(safeHref(x.url))}"></video>`).join('');
      return panel('نگارخانه', 'تصاویر و ویدیو', g + v, 'gallery');
    },
    offer(b) {
      const o = b.authored.offer || {};
      if (!o.title && !o.text) return '';
      return `<section class="pp-offer" id="pp-offer">
        <div><span style="font-size:11px;font-weight:800;opacity:.7">پیشنهاد ویژه</span>
        <h2>${esc(o.title || 'پیشنهاد ویژه')}</h2>${o.text ? `<p>${esc(o.text)}</p>` : ''}</div>
        ${o.code ? `<button type="button" class="pp-offer-code" data-pp-copy="${attr(o.code)}"><span>کد تخفیف — برای کپی بزنید</span><span dir="ltr" style="font-size:17px">${esc(o.code)}</span></button>` : ''}
      </section>`;
    },
    links() { return ''; },   // rendered in the sidebar
    social() { return ''; },  // rendered in the sidebar
    contact(b) {
      const c = b.identity.contact;
      if (!c.address && !c.map_url) return '';
      return panel('نشانی', 'چطور ما را پیدا کنید',
        (c.address ? `<p class="pp-prose">${esc(c.address)}</p>` : '') +
        (c.map_url ? `<a class="btn btn-glass" style="margin-top:14px" target="_blank" rel="noopener" href="${attr(c.map_url)}" data-pp-track="map">🗺 باز کردن در نقشه</a>` : ''), 'contact');
    }
  };

  /* --------------------------------------------------------------- sidebar */
  function sidebar(b) {
    const id = b.identity, out = [];
    const on = key => (b.sections || []).some(s => s.key === key && s.on !== false);

    const rows = [];
    if (id.contact.phone) rows.push(['📞 تماس تلفنی', 'tel:' + id.contact.phone, 'contact', id.contact.phone]);
    if (id.contact.whatsapp) rows.push(['واتس‌اپ', 'https://wa.me/' + String(id.contact.whatsapp).replace(/[^0-9]/g, ''), 'whatsapp', '']);
    if (id.contact.email) rows.push(['✉️ ایمیل', 'mailto:' + id.contact.email, 'contact', id.contact.email]);
    if (rows.length) {
      out.push(`<div class="pp-panel"><span class="pp-kicker">ارتباط مستقیم</span><h2 style="margin-bottom:12px">تماس</h2><div class="pp-links">${
        rows.map(r => `<a href="${attr(safeHref(r[1]))}"${/^https/.test(r[1]) ? ' target="_blank" rel="noopener"' : ''} data-pp-track="${attr(r[2])}"><span>${esc(r[0])}</span><span dir="ltr" style="font-size:11px;opacity:.65">${esc(r[3])}</span></a>`).join('')
      }</div></div>`);
    }

    const social = id.social || {};
    const SOC = { instagram: 'اینستاگرام', telegram: 'تلگرام', website: 'وب‌سایت', linkedin: 'لینکدین', x: 'ایکس', aparat: 'آپارات' };
    const socialRows = Object.keys(SOC).filter(k => safeHref(social[k]));
    const extraLinks = on('links') ? arr(b.authored.links).filter(l => safeHref(l && l.url)) : [];
    if ((on('social') && socialRows.length) || extraLinks.length) {
      out.push(`<div class="pp-panel"><span class="pp-kicker">شبکه‌ها</span><h2 style="margin-bottom:12px">پیوندها</h2><div class="pp-links">${
        (on('social') ? socialRows : []).map(k => `<a href="${attr(safeHref(social[k]))}" target="_blank" rel="noopener nofollow"><span>${esc(SOC[k])}</span><span aria-hidden="true">↗</span></a>`).join('') +
        extraLinks.map(l => `<a href="${attr(safeHref(l.url))}" target="_blank" rel="noopener nofollow"><span>${esc(l.label || 'پیوند')}</span><span aria-hidden="true">↗</span></a>`).join('')
      }</div></div>`);
    }


    return out.join('');
  }

  const shareUrl = () => `${location.origin}${base()}@${encodeURIComponent(state.username)}`;

  /* ----------------------------------------------------------------- meta */
  function applyMeta(b) {
    const id = b.identity;
    const title = `${id.name} — ${ROLE_LABEL[id.role] || 'عضو'} | استخر جو`;
    const desc = (id.tagline || String(b.authored.story || '').slice(0, 160) || `${id.name} در استخر جو`).replace(/\s+/g, ' ').trim().slice(0, 160);
    document.title = title;
    const set = (sel, a, v) => { const el = $(sel); if (el) el.setAttribute(a, v); };
    set('[data-pp-desc]', 'content', desc);
    set('[data-pp-og-title]', 'content', title);
    set('[data-pp-og-desc]', 'content', desc);
    set('[data-pp-canonical]', 'href', `https://estakhrjo.ir/@${state.username}`);
    const img = safeImg(b.authored.cover) || safeImg(id.avatar);
    if (img && /^https:/.test(img)) set('[data-pp-og-image]', 'content', img);

    const TYPE = { pool: 'SportsActivityLocation', coach: 'Person', supplier: 'Organization' };
    const ld = {
      '@context': 'https://schema.org', '@type': TYPE[id.role] || 'Organization',
      name: id.name, description: desc, url: `https://estakhrjo.ir/@${state.username}`
    };
    if (img) ld.image = img;
    if (id.city) ld.address = { '@type': 'PostalAddress', addressLocality: id.city, streetAddress: id.contact.address || undefined };
    if (id.contact.phone) ld.telephone = id.contact.phone;
    if (id.rating && id.rate_count) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: id.rating, reviewCount: id.rate_count };
    const node = $('[data-pp-jsonld]');
    if (node) node.textContent = JSON.stringify(ld);
  }

  /* ---------------------------------------------------------------- render */
  function render(b) {
    const ordered = (b.sections || []).filter(s => s.on !== false).sort((a, z) => (a.order || 0) - (z.order || 0));
    const main = ordered.map(s => { try { return SECTIONS[s.key] ? SECTIONS[s.key](b) : ''; } catch (e) { console.warn('section failed:', s.key, e); return ''; } }).filter(Boolean).join('');

    const app = $('#app');
    const quote = b.authored.tagline || b.authored.story || `${b.identity.name}؛ روایت حرفه‌ای شما در دنیای آب.`;
    const template = /^estakhrjo-[1-4]$/.test(b.template || "") ? b.template : "estakhrjo-3";
    app.innerHTML = `<div class="pp-architectural-page pp-poster-template pp-template-${template}">
      <div class="pp-poster-frame">
        <div class="pp-poster-top">${hero(b)}</div>
        <section class="pp-poster-body"><aside class="pp-poster-rail"><div class="pp-poster-brand">استخر جو <span>پروندهٔ حرفه‌ای</span></div>${sidebar(b)}<blockquote class="pp-poster-quote">“${esc(quote)}”</blockquote></aside><main class="pp-poster-content"><div class="pp-poster-stats">${statsRow(b)}</div><div class="pp-main">${main || `<div class="pp-panel"><p class="pp-prose">این صفحه هنوز بخشی برای نمایش ندارد.</p></div>`}</div></main></section>
        <footer class="pp-poster-footer">استخر جو | ESTAKHRJO <span>هویت حرفه‌ای در مسیر رشد</span></footer>
      </div>
    </div>`;
    app.setAttribute('aria-busy', 'false');
    applyMeta(b);
    bindStickyName(b.identity.name);
  }

  /* The top bar carries the member's name, not a site menu. It only appears
     once their own <h1> has scrolled out of view. */
  function bindStickyName(name) {
    const label = $('#ppBarName');
    const title = $('.pp-hero-copy h1');
    if (!label) return;
    label.textContent = name || '';
    if (!title || typeof IntersectionObserver !== 'function') { label.classList.add('on'); return; }
    new IntersectionObserver(
      entries => label.classList.toggle('on', !entries[0].isIntersecting),
      { rootMargin: '-56px 0px 0px 0px' }
    ).observe(title);
  }

  function stateCard(title, text, cta) {
    $('#app').innerHTML = `<section class="section"><div class="container"><div class="pp-panel pp-state">
      <b>${esc(title)}</b><p>${esc(text)}</p>
      ${cta || `<a class="btn btn-primary" href="${attr(base())}index.html">بازگشت به استخر جو</a>`}</div></div></section>`;
    $('#app').setAttribute('aria-busy', 'false');
  }

  /* ------------------------------------------------------------ delegation */
  document.addEventListener('click', ev => {
    const share = ev.target.closest('[data-pp-share]');
    if (share) {
      ev.preventDefault();
      const url = shareUrl(), title = document.title;
      track('share');
      if (navigator.share) navigator.share({ title, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => toast('✓ نشانی صفحه کپی شد')).catch(() => {});
      return;
    }
    const copy = ev.target.closest('[data-pp-copy]');
    if (copy) {
      ev.preventDefault();
      navigator.clipboard?.writeText(copy.getAttribute('data-pp-copy')).then(() => toast('✓ کپی شد')).catch(() => {});
      return;
    }
    const t = ev.target.closest('[data-pp-track]');
    if (t) track(t.getAttribute('data-pp-track'));
  });

  /* ------------------------------------------------------------------ boot */
  async function boot() {
    state.username = usernameFromUrl();
    if (!state.username) return stateCard('نشانی نامعتبر است', 'این صفحه با یک نام کاربری معتبر باز می‌شود، مثل estakhrjo.ir/@example');
    try {
      const res = await api('public-profile-get', { username: state.username, source: source() });
      // The endpoint keeps the v1 envelope `{ ok, profile: <bundle> }`.
      const bundle = res.profile || res;
      state.bundle = bundle;
      render(bundle);
    } catch (err) {
      const msg = String(err && err.message || '');
      if (/پیدا نشد|404/.test(msg)) {
        stateCard('این صفحه در دسترس نیست', 'ممکن است نشانی اشتباه باشد یا صاحب صفحه آن را موقتاً از انتشار خارج کرده باشد.',
          `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="${attr(base())}pools.html">جست‌وجوی استخرها</a><a class="btn btn-glass" href="${attr(base())}coaches.html">مربیان</a></div>`);
      } else {
        stateCard('در بارگذاری صفحه مشکلی پیش آمد', msg || 'لطفاً چند لحظه بعد دوباره تلاش کنید.',
          '<button type="button" class="btn btn-primary" onclick="location.reload()">تلاش دوباره</button>');
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
