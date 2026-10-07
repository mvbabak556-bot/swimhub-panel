/* Estakhrjo — Universal WebP conversion module (SH_WEBP)
 * =====================================================================
 * یک ماژول واحد برای «همهٔ» ورودی‌های تصویر سایت، با هر پسوندی که مرورگر
 * بتواند باز کند (JPEG/PNG/WebP/GIF/BMP/AVIF/HEIC-on-Chrome…).
 *
 * قاعدهٔ اصلی: هر عکس در «بزرگ‌ترین اندازه‌ای که واقعاً در سایت نمایش داده
 * می‌شود» (۲برابر برای صفحه‌های رتینا) نگه داشته می‌شود و کیفیت پله‌پله
 * پایین می‌آید تا به بودجهٔ حجم هدف برسد؛ یعنی حجم تا حد نیاز نمایش کم
 * می‌شود، نه بیشتر.
 *
 * استفاده:
 *   const out = await SH_WEBP.pick(file, 'avatar');     // فشرده + data URL
 *   const out = await SH_WEBP.convert(file, {maxSide, targetKB});
 *   out => { url, blob, file, filename, w, h, kb, mime, fmt, preset }
 *
 * اگر مرورگر توان ساخت WebP نداشته باشد (سافاری‌های خیلی قدیمی) به‌جای
 * ردکردن آپلود، همان تصویر با JPEG فشرده می‌شود — رسانهٔ سایت همچنان
 * کوچک و بی‌متادیتا می‌ماند.
 */
(function () {
  'use strict';

  /* نمایش واقعی روی سایت × ۲ (رتینا) → سقف ابعاد و بودجهٔ حجم هر کاربرد */
  const PRESETS = {
    avatar:  { maxSide: 512,  targetKB: 60,  note: 'آواتار / لوگو' },
    card:    { maxSide: 960,  targetKB: 120, note: 'کارت و کاتالوگ' },
    gallery: { maxSide: 1280, targetKB: 170, note: 'گالری صفحه عمومی' },
    slot:    { maxSide: 1400, targetKB: 190, note: 'عکس‌های قالب عمومی' },
    hero:    { maxSide: 1600, targetKB: 230, note: 'کاور و هیرو' }
  };
  const MAX_SOURCE_BYTES = 9 * 1024 * 1024; // سقف پروندهٔ ورودی
  const QUALITY_LADDER = [0.82, 0.74, 0.66, 0.58, 0.5];

  let webpSupport = null;
  function canEncodeWebp() {
    if (webpSupport !== null) return Promise.resolve(webpSupport);
    webpSupport = new Promise(resolve => {
      try {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 2;
        const ctx = probe.getContext('2d');
        if (!ctx) { resolve(false); return; }
        ctx.fillRect(0, 0, 2, 2);
        probe.toBlob(b => resolve(!!(b && b.type === 'image/webp' && b.size > 0)), 'image/webp', 0.8);
      } catch (_) { resolve(false); }
    });
    return webpSupport;
  }

  /* بازکردن پرونده با هر پسوندی؛ اول دیکُدر مدرن بعد fallback کلاسیک */
  async function decode(file) {
    if (window.createImageBitmap) {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { source: bmp, release: () => bmp.close && bmp.close() };
      } catch (_) { /* امتحان حالت بعدی */ }
      try {
        const bmp = await createImageBitmap(file);
        return { source: bmp, release: () => bmp.close && bmp.close() };
      } catch (_) { /* امتحان حالت بعدی */ }
    }
    return new Promise((resolve, reject) => {
      const rd = new FileReader();
      rd.onerror = () => reject(new Error('decode'));
      rd.onload = () => {
        const im = new Image();
        im.onload = () => resolve({ source: im, release: () => {} });
        im.onerror = () => reject(new Error('decode'));
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  function draw(source, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }
  const toBlob = (canvas, mime, quality) => new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  const dataUrl = blob => new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('read'));
    rd.onload = () => resolve(rd.result);
    rd.readAsDataURL(blob);
  });

  /**
   * تبدیل هر پروندهٔ تصویری به WebP فشرده در اندازهٔ موردنیاز نمایش.
   * @param {File|Blob} file پروندهٔ ورودی (هر پسوندی)
   * @param {object} opts {preset} یا {maxSide, targetKB}
   */
  async function convert(file, opts) {
    const o = opts || {};
    const preset = o.preset && PRESETS[o.preset] ? o.preset : 'card';
    const conf = Object.assign({}, PRESETS[preset], o);
    const maxSide = Math.max(64, Math.min(2400, Number(conf.maxSide) || PRESETS[preset].maxSide));
    const targetKB = Math.max(12, Number(conf.targetKB) || PRESETS[preset].targetKB);

    if (!(file instanceof Blob)) throw new Error('پروندهٔ تصویر خوانده نشد.');
    const type = String(file.type || '').toLowerCase();
    if (type === 'image/svg+xml') throw new Error('SVG پذیرفته نمی‌شود؛ یک عکس واقعی انتخاب کنید.');
    if (type && !type.startsWith('image/')) throw new Error('پرونده انتخاب‌شده تصویر نیست.');
    if (file.size <= 0) throw new Error('پروندهٔ تصویر خالی است.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('حجم تصویر باید کمتر از ۹ مگابایت باشد.');

    const webp = await canEncodeWebp();
    let decoded;
    try { decoded = await decode(file); }
    catch (e) { throw new Error('این تصویر باز نشد. اگر عکس HEIC آیفون است، یک بار بازش کنید و به‌صورت JPEG ذخیره کنید.'); }

    try {
      const sw = Number(decoded.source.width || decoded.source.naturalWidth || 0);
      const sh = Number(decoded.source.height || decoded.source.naturalHeight || 0);
      if (!sw || !sh) throw new Error('decode');

      /* پلهٔ ابعاد: اول اندازهٔ هدف، بعد در صورت نیاز کوچک‌تر */
      const scale = Math.min(1, maxSide / Math.max(sw, sh));
      let width = Math.max(1, Math.round(sw * scale));
      let height = Math.max(1, Math.round(sh * scale));
      const budget = targetKB * 1024;

      let best = null; // کوچک‌ترین نتیجهٔ قابل‌قبول
      for (let step = 0; step < QUALITY_LADDER.length + 1; step++) {
        const quality = QUALITY_LADDER[Math.min(step, QUALITY_LADDER.length - 1)];
        const canvas = draw(decoded.source, width, height);
        let blob = null, mime = 'image/webp';
        if (webp) blob = await toBlob(canvas, 'image/webp', quality);
        if (!blob || blob.type !== 'image/webp') {
          // مرورگر WebP نمی‌سازد → JPEG (خودِ پروندهٔ ورودی WebP هم بازسازی می‌شود)
          mime = 'image/jpeg';
          blob = await toBlob(canvas, 'image/jpeg', Math.min(quality + 0.08, 0.9));
        }
        if (!blob || !blob.size) throw new Error('encode');
        if (!best || blob.size < best.blob.size) best = { blob, mime, width, height };
        if (blob.size <= budget) break;
        if (step < QUALITY_LADDER.length - 1) { width = Math.round(width * 0.85); height = Math.round(height * 0.85); }
      }

      const out = best;
      const url = await dataUrl(out.blob);
      const fmt = out.mime === 'image/webp' ? 'webp' : 'jpg';
      const stamp = Date.now();
      const filename = 'estakhrjo-' + preset + '-' + stamp + '.' + fmt;
      const outFile = typeof File === 'function'
        ? new File([out.blob], filename, { type: out.mime, lastModified: stamp })
        : out.blob;
      return {
        url, blob: out.blob, file: outFile, filename,
        w: out.width, h: out.height, kb: Math.max(1, Math.ceil(out.blob.size / 1024)),
        mime: out.mime, fmt, preset,
        fallback: out.mime !== 'image/webp'
      };
    } finally { decoded.release(); }
  }

  /* میان‌بر رایج: خواندن از <input type=file> */
  function pickFile(input, preset) {
    const f = input && input.files && input.files[0];
    return f ? convert(f, { preset }) : Promise.resolve(null);
  }

  window.SH_WEBP = { convert, pickFile, presets: PRESETS, canEncodeWebp };
})();
