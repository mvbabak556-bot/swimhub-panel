/* Estakhrjo Effects — اسکرول، Reveal، Tilt، شمارنده، کرسر */
(function () {
  'use strict';

  /* ---------- پره‌لودر ----------
     پری‌لودر فقط وقتی جمع می‌شود که صفحه واقعاً محتوا دارد؛ قبلاً تایمر
     ثابت ۲.۶ ثانیه‌ای آن را قبل از رندر می‌بست و کاربر چند ثانیه صفحهٔ
     خالیِ تک‌رنگ می‌دید. سقف ۱۵ ثانیه برای حالت خطای کامل JS می‌ماند. */
  const pre = document.getElementById('preloader');
  function hidePre() { if (pre && !pre.classList.contains('done')) pre.classList.add('done'); }
  const preT0 = Date.now();
  const preGate = () => {
    const app = document.getElementById('app');
    const hasContent = !app || app.children.length > 0 || (app.textContent || '').trim().length > 40;
    if (hasContent || Date.now() - preT0 > 15000) hidePre();
    else setTimeout(preGate, 350);
  };
  window.addEventListener('load', () => setTimeout(preGate, 400));
  setTimeout(preGate, 2600); // فالبک

  /* ---------- نوار پیشرفت + ناوبری ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('nav');
  function onScroll() {
    const st = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? (st / max) * 100 : 0) + '%';
    if (nav) nav.classList.toggle('scrolled', st > 30);
    // پارالاکس اورب‌ها
    const orbs = document.querySelectorAll('.orb');
    orbs.forEach((o, i) => { o.style.marginTop = (st * (0.04 + i * 0.02)) + 'px'; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- کرسر نورانی ---------- */
  const glow = document.getElementById('cursorGlow');
  if (glow && matchMedia('(hover:hover)').matches) {
    let gx = 0, gy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', () => glow.style.opacity = '1');
    document.addEventListener('mouseleave', () => glow.style.opacity = '0');
  }

  /* ---------- Reveal با IntersectionObserver ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
        if (en.target.dataset.count) runCounter(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  /* ---------- شمارنده اعداد ---------- */
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const fa = s => String(s).replace(/[0-9]/g, d => FA[+d]);
  function runCounter(el) {
    const target = parseInt(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1500, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fa(Math.round(target * ease).toLocaleString('en-US')) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Tilt سه‌بعدی کارت‌ها ---------- */
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  function bindTilt(card) {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = '1';
    let rect = null, raf2 = null;
    card.addEventListener('mouseenter', () => { rect = card.getBoundingClientRect(); });
    card.addEventListener('mousemove', e => {
      if (!finePointer || !rect) return;
      if (raf2) return;
      raf2 = requestAnimationFrame(() => {
        const px = (e.clientX - rect.left) / rect.width - .5;
        const py = (e.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-7px)`;
        raf2 = null;
      });
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  /* ---------- اسکن صفحه و فعال‌سازی ---------- */
  function scan() {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
    document.querySelectorAll('[data-count]').forEach(el => { if (!el.dataset.counted) { el.dataset.counted = '1'; io.observe(el); } });
    if (finePointer) document.querySelectorAll('.card, .stat-pill, .feature-tile').forEach(bindTilt);
    // لینک فعال ناوبری
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href.replace('.html', '') === page || (page === 'index' && href.includes('index')));
    });
  }

  // app.js صفحه را دوباره رندر می‌کند — با MutationObserver مجدد اسکن می‌کنیم
  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(() => setTimeout(scan, 50)).observe(app, { childList: true, subtree: false });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(scan, 60));
  else setTimeout(scan, 60);

  /* ---------- مغناطیس دکمه‌ها ---------- */
  if (finePointer) {
    document.addEventListener('mousemove', e => {
      const btn = e.target.closest && e.target.closest('.btn-primary, .btn-gold');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.12;
      const dy = (e.clientY - r.top - r.height / 2) * 0.2;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    }, { passive: true });
    document.addEventListener('mouseout', e => {
      const btn = e.target.closest && e.target.closest('.btn-primary, .btn-gold');
      if (btn) btn.style.transform = '';
    }, { passive: true });
  }
})();
