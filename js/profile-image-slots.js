/* نقشهٔ جای عکس‌های قالب‌های صفحهٔ عمومی اعضا + جایگزینی عکس عضو روی هر جای عکس.
 *
 * هر قالب چند جای عکسِ طراحی دارد (مثلاً estakhrjo-2 سه جا). این فایل دو کار
 * می‌کند:
 *  ۱) registry مشترک برای ویرایشگر «صفحهٔ عمومی من» تا به‌ازای هر جای عکس
 *     یک آیتم آپلود بسازد (window.PP_TEMPLATE_IMAGE_SLOTS)؛
 *  ۲) روی صفحهٔ عمومیِ منتشرشده، عکس‌های آپلودشدهٔ عضو
 *     (authored.template_images[template][slot]) را دقیقاً روی همان جای قالب
 *     می‌گذارد؛ جاهای بدون آپلود همان رفتار قبلیِ قالب را دارند.
 *
 * سلکتورها به کلاس‌های ثابت داخل قالب‌ها گره خورده‌اند (bundle بیلدشدهٔ
 * public-profile-templates). اگر نسخهٔ تازه‌ای از قالب‌ها کلاس‌ها را عوض کرد،
 * این نقشه باید به‌روز شود.
 */
(function () {
  'use strict';

  var SLOTS = {
    'estakhrjo-1': [
      { sel: '.t1-hero-bg', all: false, label: 'عکس اصلی بالای صفحه (هیرو)', fallback: 'editorial-coach.jpg' },
      { sel: '.t1-water', all: true, label: 'عکس کنار روایت', fallback: 'underwater.jpg' }
    ],
    'estakhrjo-2': [
      { sel: '.hero-image', all: false, label: 'عکس اصلی بالای صفحه (هیرو)', fallback: 'editorial-coach.jpg' },
      { sel: '.story-photo', all: true, label: 'عکس بخش داستان', fallback: 'underwater.jpg' },
      { sel: '.statement-image', all: false, label: 'عکس بخش بیانیه', fallback: 'underwater-electric.jpg' }
    ],
    'estakhrjo-3': [
      { sel: '.d3-hero-image', all: false, label: 'عکس اصلی بالای صفحه (هیرو)', fallback: 'editorial-coach.jpg' },
      { sel: '.d3-film-image', all: false, label: 'عکس باند میانی', fallback: 'underwater-electric.jpg' }
    ],
    'estakhrjo-4': [
      { sel: '.t4-hero-photo', all: false, label: 'عکس اصلی بالای صفحه (هیرو)', fallback: 'cinematic-coach.jpg' },
      { sel: '.t4-cinema-bg', all: false, label: 'عکس بخش سینمایی', fallback: 'underwater.jpg' }
    ]
  };

  function slotDefs(tpl) { return SLOTS[tpl] || []; }
  function slotCount(tpl) { return slotDefs(tpl).length; }
  function defaultImg(tpl, i) {
    var s = slotDefs(tpl)[i];
    return s ? 'public-profile-templates/images/' + s.fallback : '';
  }

  window.PP_TEMPLATE_IMAGE_SLOTS = { SLOTS: SLOTS, slotDefs: slotDefs, slotCount: slotCount, defaultImg: defaultImg };

  /* ---------------- بخش عمومی: جایگزینی عکس‌های عضو روی قالب -------------- */
  var appRoot = document.getElementById('app');
  if (!appRoot || !window.SUPABASE_URL) return;

  var QS = new URLSearchParams(location.search);
  var seg = location.pathname.split('/').filter(Boolean).filter(function (x) { return x.charAt(0) === '@'; })[0];
  var username = decodeURIComponent(
    (seg ? seg.slice(1) : '') || QS.get('username') || QS.get('u') ||
    (document.body.getAttribute('data-pp-username') || '')
  ).replace(/^@/, '');
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/i.test(username)) return;

  function applyOverrides(ov, tpl) {
    slotDefs(tpl).forEach(function (s, i) {
      var url = ov[String(i)];
      if (!url) return;
      var nodes = s.all
        ? Array.prototype.slice.call(document.querySelectorAll(s.sel))
        : [document.querySelector(s.sel)].filter(Boolean);
      nodes.forEach(function (el) {
        var cur = String(el.style.backgroundImage || '');
        if (cur.indexOf(url) !== -1) return; // قبلاً اعمال شده — جلوی حلقهٔ ناظر
        el.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
        if (!el.style.backgroundSize) el.style.backgroundSize = 'cover';
        if (!el.style.backgroundPosition) el.style.backgroundPosition = 'center';
        el.setAttribute('data-pp-img-slot', String(i));
      });
    });
  }

  (async function () {
    var profile = null;
    try {
      var r = await fetch(String(window.SUPABASE_URL).replace(/\/$/, '') + '/functions/v1/member-auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: window.SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ action: 'public-profile-get', username: username, source: 'slot-images' })
      });
      var j = await r.json().catch(function () { return {}; });
      if (r.ok && j.ok) profile = j.profile || j;
    } catch (e) { return; }
    if (!profile || !profile.authored) return;

    var forced = QS.get('template') || '';
    var tpl = /^estakhrjo-[1-4]$/.test(forced) ? forced
      : (/^estakhrjo-[1-4]$/.test(profile.template || '') ? profile.template : 'estakhrjo-3');
    var ov = (profile.authored.template_images || {})[tpl] || {};
    if (!Object.keys(ov).length) return;

    applyOverrides(ov, tpl);
    // قالب‌ها تنبل رندر می‌شوند: هر تغییر DOM (ماند mount سکشن‌ها یا اوررایدِ
    // قالب روی استایل، پس از لود) باید جایگزینی دوباره انجام شود. چک
    // includes بالا جلوی حلقهٔ بی‌نهایت را می‌گیرد.
    var tmr = 0;
    var obs = new MutationObserver(function () {
      clearTimeout(tmr);
      tmr = setTimeout(function () { applyOverrides(ov, tpl); }, 120);
    });
    obs.observe(appRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  })();
})();
