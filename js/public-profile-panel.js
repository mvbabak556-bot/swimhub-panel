/* Estakhrjo — Public Profile v2: member editor + admin moderation console.
 *
 * Design rule enforced by this file: the member never re-types anything the
 * platform already knows. Every value that lives in `pools` / `coaches` /
 * `suppliers` / `sessions` / `courses` / `products` is shown here READ-ONLY
 * with a visibility switch next to it and a deep link to the one place it can
 * actually be edited. The only writable material is the small `authored`
 * block (headline, tagline, story, media, offer, links) — and that is the only
 * thing that goes to the admin review queue.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const E = (s, r) => (r || document).querySelector(s);
  const EA = (s, r) => [...(r || document).querySelectorAll(s)];
  const notify = m => (window.toasglass ? window.toasglass(m) : console.log(m));
  const arr = v => Array.isArray(v) ? v : [];
  const num = v => Number(v || 0).toLocaleString('fa-IR');
  const money = v => Number(v || 0) > 0 ? num(v) + ' تومان' : '—';
  const hhmm = v => String(v || '').slice(0, 5);
  const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const roleLabel = r => ({ pool: 'مجموعهٔ آبی', coach: 'مربی شنا', supplier: 'تأمین‌کننده / فروشگاه' }[r] || 'عضو');
  const validUsername = x => /^[a-z0-9][a-z0-9_-]{2,31}$/.test(x);
  const safeImg = v => /^(https:|data:image\/(webp|png|jpeg|jpg))/i.test(String(v || '')) ? String(v) : '';

  const profileBase = () => { const b = location.pathname.split('/').filter(Boolean); return /\.github\.io$/i.test(location.hostname) && b.length ? `/${b[0]}/` : '/'; };
  const projectPages = () => /\.github\.io$/i.test(location.hostname) && profileBase() !== '/';
  const profileUrl = u => {
    const slug = encodeURIComponent(String(u || '').replace(/^@/, ''));
    return projectPages()
      ? `${location.origin}${profileBase()}public-profile.html?username=${slug}`
      : `https://estakhrjo.ir/@${slug}`;
  };
  const statusChip = s => ({ draft: ['پیش‌نویس', 'draft'], pending: ['در انتظار بررسی', 'pending'], approved: ['تأییدشده', 'approved'], rejected: ['نیازمند اصلاح', 'rejected'], published: ['منتشرشده', 'approved'], disabled: ['غیرفعال', 'rejected'] }[s] || ['پیش‌نویس', 'draft']);

  /* ------------------------------------------------------------- registry */
  const SECTION_LABEL = {
    story: 'معرفی و داستان', gallery: 'گالری تصاویر و ویدیو', offer: 'پیشنهاد ویژه', links: 'پیوندهای دلخواه',
    social: 'شبکه‌های اجتماعی', contact: 'نشانی و نقشه',
    amenities: 'امکانات مجموعه', specs: 'مشخصات فنی استخر', schedule: 'سانس‌های پیشِ‌رو', team: 'مربیان همکار',
    courses: 'دوره‌های آموزشی', hiring: 'آگهی‌های استخدام',
    credentials: 'مدارک و افتخارات', expertise: 'تخصص و سطح آموزش', pools: 'استخرهای محل تدریس',
    availability: 'زمان‌های آزاد هفتگی', pricing: 'تعرفهٔ آموزش',
    services: 'خدمات و حوزهٔ فعالیت', catalog: 'کاتالوگ کالا', b2b: 'شرایط همکاری عمده'
  };
  const SECTION_NOTE = {
    story: 'تنها بخشی که متنش را خودتان می‌نویسید — نیازمند تأیید مدیر.',
    schedule: 'مستقیم از سانس‌های باز شما خوانده می‌شود.',
    team: 'مربیانی که در سانس‌های شما ثبت شده‌اند.',
    courses: 'دوره‌های منتشرشدهٔ شما.',
    pools: 'از روی برنامهٔ هفتگی و سانس‌های شما محاسبه می‌شود.',
    catalog: 'محصولات منتشرشدهٔ فروشگاه شما.'
  };
  const FIELD_LABEL = {
    phone: 'تلفن', whatsapp: 'واتس‌اپ', email: 'ایمیل', address: 'نشانی', map: 'نقشه و مسیریابی',
    city: 'شهر', rating: 'امتیاز', rate_count: 'تعداد نظر',
    price_from: 'شروع قیمت', open_now: 'وضعیت باز/بسته', occupancy: 'میزان اشغال', water_temp: 'دمای آب',
    lanes: 'تعداد خط', length_m: 'طول استخر', kind: 'نوع مجموعه', gender: 'پذیرش', olympic: 'استاندارد المپیک',
    hydro: 'آب‌درمانی', sauna: 'سونا', jacuzzi: 'جکوزی', parking: 'پارکینگ', wheelchair: 'دسترس‌پذیری', kids: 'استخر کودک',
    exp_years: 'سال تجربه', students: 'تعداد شاگرد', hourly_rate: 'نرخ ساعتی', private_price: 'جلسهٔ خصوصی',
    group_price: 'کلاس گروهی', certs: 'مدارک', medals: 'افتخارات', specialties: 'تخصص‌ها', levels: 'سطوح',
    age_groups: 'گروه سنی', online: 'مشاورهٔ آنلاین', home_pool: 'استخر پایه', instagram: 'اینستاگرام',
    telegram: 'تلگرام', website: 'وب‌سایت',
    min_order: 'حداقل سفارش', category: 'دستهٔ اصلی', services: 'خدمات'
  };
  const ITEM_LABEL = { pools: 'استخرها', schedule: 'سانس‌ها', team: 'مربیان', courses: 'دوره‌ها', availability: 'زمان‌های آزاد', products: 'محصولات' };
  /* Where each system value is actually edited. Zero re-entry means we must
     always be able to send the member to the real form. */
  const SOURCE_LINK = {
    pool: ['پروندهٔ استخر', 'dashboard.html?build=ppf8&tab=pools'],
    coach: ['پروفایل مربی', 'dashboard.html?build=ppf8&tab=coach'],
    supplier: ['پروندهٔ فروشگاه', 'dashboard.html?build=ppf8&tab=store']
  };

  /* Editable copy points of each public template. Slot ids must match the
     template bundles exactly (texts.<slot>); the third item is only the
     placeholder shown to the member — an empty input means "use the
     template's built-in default". Overrides live per member+template in
     display.custom_texts and apply instantly through the display-only save. */
  const TEMPLATE_TEXT_SLOTS = {
    'estakhrjo-1': [
      ['منو و سربرگ', [
        ['nav_story', 'گزینهٔ منو — داستان', 'داستان'],
        ['nav_career', 'گزینهٔ منو — سوابق', 'سوابق'],
        ['nav_venues', 'گزینهٔ منو — استخرها', 'استخرها'],
        ['nav_contact', 'گزینهٔ منو — ارتباط', 'ارتباط'],
        ['header_cta', 'دکمهٔ سربرگ', 'گفت‌وگو با مربی']
      ]],
      ['بخش آغازین (هیرو)', [
        ['hero_eyebrow', 'عنوان کوچک هیرو', 'A PERSONAL STORY / ESTAKHRJO'],
        ['hero_cta', 'دکمهٔ ورود به داستان', 'ورود به داستان'],
        ['hero_motto', 'شعار پایین هیرو', 'انضباط در تمرین، آزادی در آب.']
      ]],
      ['داستان', [
        ['story1_label', 'برچسب روایت ۱', '01 / نگاه من'],
        ['story2_label', 'برچسب روایت ۲', '02 / فلسفه تمرین'],
        ['story2_text', 'متن روایت ۲', 'تمرین با هدف و رشد با اعتماد؛ مسیر هر شناگر منحصر‌به‌فرد است.'],
        ['story3_label', 'برچسب روایت ۳', '03 / ادامه مسیر'],
        ['story3_text', 'متن روایت ۳', 'هدف ساختن شناگری‌ست که هم به تکنیک مسلط باشد و هم به خودش باور داشته باشد.']
      ]],
      ['سوابق و مدارک', [
        ['career_label', 'برچسب بخش سوابق', '02 / مسیر حرفه‌ای'],
        ['credentials_head', 'تیتر مدارک و تخصص', 'مدارک و تخصص‌ها'],
        ['career_note', 'یادداشت زیر سوابق', 'سوابق و مدارک از پروندهٔ عمومی عضو در استخرجو خوانده می‌شود.']
      ]],
      ['استخرها و سانس‌ها', [
        ['venues_label', 'برچسب بخش استخرها', '03 / فضاهای تمرین'],
        ['sessions_head', 'پیشوند سانس‌ها', 'سانس‌های'],
        ['venues_disclaimer', 'توضیح زیر سانس‌ها', 'سانس‌ها از برنامهٔ منتشرشدهٔ عضو خوانده می‌شود و هماهنگی نهایی با گفت‌وگو قطعی است.']
      ]],
      ['ارتباط', [
        ['contact_label', 'برچسب بخش ارتباط', '04 / ارتباط'],
        ['contact_p', 'متن دعوت به گفت‌وگو', 'برای پرسش درباره تمرین و برنامه، گفت‌وگو را شروع کنید.'],
        ['contact_cta', 'دکمهٔ شروع گفت‌وگو', 'شروع گفت‌وگو'],
        ['contact_hint', 'راهنمای زیر دکمه', 'ارسال درخواست فقط برنامهٔ ایمیل شما را با متن آماده باز می‌کند؛ رزرو خودکار انجام نمی‌شود.']
      ]]
    ],
    'estakhrjo-2': [
      ['منو و سربرگ', [
        ['nav_story', 'گزینهٔ منو — داستان', 'داستان من'],
        ['nav_record', 'گزینهٔ منو — مسیر حرفه‌ای', 'مسیر حرفه‌ای'],
        ['nav_pools', 'گزینهٔ منو — استخرها', 'استخر و سانس‌ها'],
        ['nav_contact', 'گزینهٔ منو — ارتباط', 'ارتباط'],
        ['header_cta', 'دکمهٔ سربرگ', 'شروع گفتگو']
      ]],
      ['بخش آغازین (هیرو)', [
        ['hero_kicker', 'جملهٔ کلیدی هیرو', 'یک نگاه متفاوت به شنا'],
        ['hero_intro', 'معرفی کوتاه هیرو', 'در آب، همه‌چیز از نو شروع می‌شود.'],
        ['hero_link', 'پیوند زیر هیرو', 'داستان را کشف کنید'],
        ['hero_footer', 'نشان لاتین هیرو', 'ESTAKHRJO / PERSONAL EDITION'],
        ['visual_word', 'کلمهٔ بزرگ بخش داستان', 'FLOW']
      ]],
      ['داستان', [
        ['story1_label', 'برچسب روایت ۱', 'نگاه من'],
        ['story2_label', 'برچسب لاتین روایت ۲', '01 / THE MINDSET'],
        ['story2_text', 'متن روایت ۲', 'در هر تمرین، تکنیک مهم است. اما چیزی که ماندگار می‌شود، باوری‌ست که در خودت می‌سازی.'],
        ['story3_label', 'برچسب لاتین روایت ۳', '02 / THE PROMISE'],
        ['story3_text', 'متن روایت ۳', 'مسیر هر شناگر منحصر‌به‌فرد است. اینجا قرار نیست شبیه دیگری شنا کنی؛ قرار است بهترین نسخه خودت باشی.'],
        ['statement_eyebrow', 'عنوان لاتین نقل‌قول بزرگ', 'THE ART OF SWIMMING']
      ]],
      ['سوابق', [
        ['record_label', 'برچسب اعتبار و تجربه', 'اعتبار و تجربه'],
        ['record_intro', 'معرفی زیر سوابق', 'دانش و تجربه، در خدمت یک هدف: رشد واقعی.'],
        ['history_label', 'برچسب مسیر حرفه‌ای', 'مسیر حرفه‌ای'],
        ['record_note', 'یادداشت زیر سوابق', 'مدارک و سوابق بر اساس تصویر مرجع درج شده‌اند و پیش از انتشار نیاز به تأیید دارند.']
      ]],
      ['استخرها و برنامه', [
        ['pools_label', 'برچسب فضاهای تمرین', 'فضاهای تمرین'],
        ['pools_intro', 'معرفی فضاهای تمرین', 'هر مجموعه، تجربه‌ای متفاوت. فضا، مشخصات و برنامه تمرین را یک‌جا ببینید.'],
        ['schedule_label', 'برچسب برنامه تمرین', 'برنامه تمرین'],
        ['schedule_intro', 'راهنمای انتخاب روز', 'روز را انتخاب کنید و سانس‌های نمونه این مجموعه را ببینید.'],
        ['schedule_meta', 'توضیح کنار ساعت', 'برنامه هفتگی نمونه'],
        ['schedule_disclaimer', 'توضیح زیر برنامه', 'این برنامه و وضعیت ظرفیت‌ها صرفاً برای نمایش طراحی شده‌اند و به تقویم یا ظرفیت واقعی متصل نیستند. زمان و جای خالی باید مستقیم با مربی تأیید شود.'],
        ['pool_after_note', 'توضیح تصاویر فضاها', 'تصاویر فضاها نمایشی هستند و به مجموعه‌های نام‌برده تعلق ندارند.'],
        ['pool_after_cta', 'پیوند پایان فضاها', 'درباره تمرین گفتگو کنیم']
      ]],
      ['ارتباط و فرم', [
        ['contact_label', 'برچسب بخش ارتباط', 'ارتباط'],
        ['contact_intro', 'متن دعوت به گفت‌وگو', 'هر مسیر تازه‌ای، با یک گفت‌وگوی ساده آغاز می‌شود. سانس دلخواهتان را انتخاب کنید یا درباره برنامه مناسب خودتان بپرسید.'],
        ['contact_note', 'یادداشت اطلاعات تماس', 'اطلاعات تماس نمونه است؛ پیش از انتشار با اطلاعات واقعی جایگزین شود.'],
        ['form_submit', 'دکمهٔ ارسال فرم', 'آماده‌سازی ایمیل درخواست'],
        ['form_hint', 'راهنمای زیر فرم', 'با زدن این دکمه، برنامه ایمیل شما با متن آماده باز می‌شود. هیچ درخواست یا رزروی خودکار ثبت نمی‌شود.']
      ]],
      ['پاصفحه', [
        ['footer_motto', 'شعار پاصفحه', 'انضباط در تمرین، آزادی در آب.']
      ]]
    ],
    'estakhrjo-3': [
      ['منو و سربرگ', [
        ['nav_about', 'گزینهٔ منو — نگاه من', 'نگاه من'],
        ['nav_journey', 'گزینهٔ منو — مسیر', 'مسیر حرفه‌ای'],
        ['nav_venues', 'گزینهٔ منو — محل‌ها', 'محل‌های تمرین'],
        ['nav_schedule', 'گزینهٔ منو — برنامه', 'برنامه سانس‌ها'],
        ['header_cta', 'دکمهٔ سربرگ', 'درخواست هماهنگی']
      ]],
      ['بخش آغازین (هیرو)', [
        ['hero_kicker', 'عنوان لاتین هیرو', 'THE ART OF MOVING THROUGH WATER'],
        ['hero_summary_a', 'خط اول معرفی هیرو', 'هر شنا، یک شروع تازه.'],
        ['hero_summary_b', 'خط دوم معرفی هیرو', 'هر تمرین، قدمی نزدیک‌تر به خودت.'],
        ['hero_action', 'پیوند زیر هیرو', 'داستان را دنبال کنید'],
        ['hero_bottom', 'نشان لاتین پایین هیرو', 'ESTAKHRJO / COACH PROFILE']
      ]],
      ['درباره و فیلم', [
        ['about_extra', 'پاراگراف دوم درباره', 'در این مسیر، تکنیک تنها بخشی از داستان است. شناخت ریتم خودت، اعتماد به بدن و تکرار هوشمندانه، چیزی‌ست که شنا را به تجربه‌ای ماندگار تبدیل می‌کند.'],
        ['film_eyebrow', 'عنوان لاتین بخش فیلم', 'BEYOND THE SURFACE / 02'],
        ['film_p', 'نقل‌قول بخش فیلم', 'شنا، هنر هماهنگی ذهن، بدن و آب است.']
      ]],
      ['سوابق', [
        ['creds_intro', 'معرفی مدارک و تجربه', 'نگاهی روشن به دانش تخصصی و مسیر حرفه‌ای.'],
        ['history_p', 'معرفی تایم‌لاین', 'هر فصل، آغازی برای عمیق‌تر شدن.'],
        ['fact_note', 'یادداشت زیر سوابق', 'مدارک، سوابق و محل‌های تمرین بر اساس تصویر مرجع وارد شده‌اند. پیش از انتشار عمومی باید با خود مربی تأیید شوند.']
      ]],
      ['استخرها و برنامه', [
        ['venues_intro', 'معرفی انتخاب مجموعه', 'مجموعه را انتخاب کنید؛ جزئیات و برنامه نمونه آن را پایین‌تر ببینید.'],
        ['schedule_pre', 'شروع جملهٔ برنامه', 'برنامه نمونه هفتگی'],
        ['schedule_post', 'ادامهٔ جملهٔ برنامه', 'برای اطلاع از ظرفیت واقعی، درخواست هماهنگی بفرستید.'],
        ['schedule_note', 'توضیح زیر برنامه', 'این برنامه و وضعیت ظرفیت‌ها نمایشی است، به تقویم زنده متصل نیست و هیچ سانسی بدون تأیید مربی رزرو نمی‌شود. تصاویر استخرها نیز نمایشی‌اند.']
      ]],
      ['راهنمای شروع', [
        ['how_eyebrow', 'عنوان لاتین راهنما', 'FROM FIRST HELLO TO FIRST LENGTH'],
        ['how_h', 'تیتر راهنمای شروع', 'مسیرِ شروع، روشن است.'],
        ['how1_p', 'متن گام ۱', 'مجموعه، روز و ساعت مناسب را از برنامه نمونه ببین.'],
        ['how2_p', 'متن گام ۲', 'جزئیات را در یک ایمیل آماده برای مربی ارسال کن.'],
        ['how3_p', 'متن گام ۳', 'زمان و ظرفیت فقط پس از پاسخ مربی نهایی می‌شود.']
      ]],
      ['ارتباط و پاصفحه', [
        ['contact_p', 'متن دعوت به گفت‌وگو', 'سانس مناسبی دیدی؟ یا هنوز در انتخاب مرددی؟ گفت‌وگو را از همین‌جا شروع کن.'],
        ['form_submit', 'دکمهٔ ارسال فرم', 'آماده‌سازی ایمیل درخواست'],
        ['form_hint', 'راهنمای زیر فرم', 'این فرم فقط برنامه ایمیل شما را با متن آماده باز می‌کند؛ رزرو یا ثبت خودکار انجام نمی‌شود.'],
        ['footer_motto', 'شعار پاصفحه', 'انضباط در تمرین. آزادی در آب.'],
        ['footer_note', 'یادداشت پاصفحه', 'پرتره، تصاویر مجموعه‌ها، راه‌های تماس و برنامه سانس‌ها نمایشی‌اند و برای انتشار نهایی باید با اطلاعات تأییدشده جایگزین شوند.']
      ]]
    ],
    'estakhrjo-4': [
      ['منو و سربرگ', [
        ['nav_about', 'گزینهٔ منو — درباره', 'درباره'],
        ['nav_history', 'گزینهٔ منو — مسیر', 'مسیر'],
        ['nav_places', 'گزینهٔ منو — مجموعه‌ها', 'مجموعه‌ها'],
        ['nav_contact', 'گزینهٔ منو — ارتباط', 'ارتباط'],
        ['header_cta', 'دکمهٔ سربرگ', 'درخواست جلسه']
      ]],
      ['بخش آغازین (هیرو)', [
        ['hero_overline_a', 'بخش اول عنوان لاتین', 'THE PRIVATE EDITION'],
        ['hero_overline_b', 'بخش دوم عنوان لاتین', 'ESTAKHRJO'],
        ['hero_desc', 'جملهٔ زیر نقش', 'وقتی حرکت، به هنر تبدیل می‌شود.'],
        ['hero_bottom', 'نشان لاتین پایین هیرو', 'A STUDY IN MOTION']
      ]],
      ['عنوان فصل‌ها', [
        ['intro_chapter', 'عنوان فصل فلسفه', 'فلسفه من'],
        ['history_chapter', 'عنوان فصل اعتبار', 'اعتبار و مسیر'],
        ['places_chapter', 'عنوان فصل فضاها', 'فضاهای تمرین'],
        ['schedule_chapter', 'عنوان فصل برنامه', 'برنامه نمونه'],
        ['contact_chapter', 'عنوان فصل ارتباط', 'ارتباط']
      ]],
      ['متن‌های اصلی', [
        ['cinema_eyebrow', 'عنوان لاتین بخش سینمایی', '02 / THE WATER CHANGES EVERYTHING'],
        ['cinema_p', 'نقل‌قول بخش سینمایی', 'شنا، هنر هماهنگی ذهن، بدن و آب است.'],
        ['history_note', 'یادداشت زیر سوابق', 'اعتبارنامه و سوابق از پروندهٔ عمومی عضو در استخرجو خوانده می‌شود.'],
        ['schedule_intro_a', 'شروع معرفی سانس‌ها', 'سانس‌های منتشرشدهٔ'],
        ['schedule_intro_b', 'پایان معرفی سانس‌ها', 'را ببینید. زمان نهایی با هماهنگی قطعی می‌شود.'],
        ['schedule_note', 'توضیح زیر برنامه', 'سانس‌ها بر اساس برنامهٔ منتشرشدهٔ عضو نمایش داده می‌شود؛ انتخاب سانس به‌تنهایی رزرو نیست و با هماهنگی قطعی می‌شود.'],
        ['contact_p', 'متن دعوت به گفت‌وگو', 'برای هماهنگی تمرین، هدف و سطح فعلی شنا را بنویسید.']
      ]],
      ['فرم و پاصفحه', [
        ['form_header', 'تیتر فرم', 'PRIVATE ENQUIRY / درخواست هماهنگی'],
        ['form_submit', 'دکمهٔ ارسال فرم', 'آماده‌سازی ایمیل'],
        ['form_hint', 'راهنمای زیر فرم', 'ارسال این فرم تنها برنامه ایمیل شما را باز می‌کند؛ رزرو خودکار انجام نمی‌شود.'],
        ['footer_note', 'یادداشت پاصفحه', 'محتوای این صفحه از پروندهٔ عمومی عضو استخرجو خوانده و به‌روز نگه داشته می‌شود.']
      ]]
    ]
  };

  /* ----------------------------------------------------------------- state */
  let host = null, account = null, model = null, owned = null;
  let textsSaveTimer = null;
  let authored = null, display = null, lastSaveMessage = '', activeTab = 'content';

  const cacheKey = () => `estakhrjo_pp2_draft:${String(account && (account.id || account.username) || 'anon')}`;
  const cacheDraft = () => { try { localStorage.setItem(cacheKey(), JSON.stringify({ authored, display, at: Date.now() })); } catch (_) {} };
  const loadCache = () => { try { return JSON.parse(localStorage.getItem(cacheKey()) || 'null'); } catch (_) { return null; } };

  const emptyAuthored = () => ({
    headline: (account && account.name) || '', tagline: '', story: '', cover: '', avatar: (account && account.avatar) || '',
    cover_position: { x: 50, y: 50 }, gallery: [], videos: [], links: [], social: {},
    offer: { title: '', text: '', code: '' }, contact: { whatsapp: '', address: '', map_url: '' }
  });

  /* ------------------------------------------------------- system readouts */
  /* Renders the real, current value of a system field so the member can see
     exactly what the switch controls. Never an input. */
  function systemValue(key) {
    const d = owned || {}, role = (model.account || {}).role;
    const p = arr(d.pools)[0] || {}, c = d.coach || {}, s = d.supplier || {}, a = model.account || {};
    const yn = v => v ? 'بله' : 'خیر';
    const list = v => arr(v).length ? arr(v).slice(0, 6).join('، ') : '';
    const map = {
      phone: p.phone || s.phone || a.phone, email: s.email || a.email, address: p.address,
      city: p.city || c.city || s.city || a.city,
      rating: p.rating || c.rating || s.rating, rate_count: p.rate_count || c.rate_count || s.rate_count,
      map: (p.lat && p.lng) || (c.lat && c.lng) ? 'موقعیت ثبت‌شده روی نقشه' : '',
      price_from: p.price_from ? money(p.price_from) : '', open_now: p.open_now === undefined ? '' : yn(p.open_now),
      occupancy: p.occupancy ? num(p.occupancy) + '٪' : '', water_temp: p.water_temp ? num(p.water_temp) + '°' : '',
      lanes: p.lanes ? num(p.lanes) : '', length_m: p.length_m ? num(p.length_m) + ' متر' : '',
      kind: p.kind, gender: p.gender, olympic: p.olympic === undefined ? '' : yn(p.olympic),
      hydro: p.hydro === undefined ? '' : yn(p.hydro), sauna: p.sauna === undefined ? '' : yn(p.sauna),
      jacuzzi: p.jacuzzi === undefined ? '' : yn(p.jacuzzi), parking: p.parking === undefined ? '' : yn(p.parking),
      wheelchair: p.wheelchair === undefined ? '' : yn(p.wheelchair), kids: p.kids === undefined ? '' : yn(p.kids),
      exp_years: c.exp_years ? num(c.exp_years) + ' سال' : '', students: c.students ? num(c.students) : '',
      hourly_rate: c.hourly_rate ? money(c.hourly_rate) : '', private_price: c.private_price ? money(c.private_price) : '',
      group_price: c.group_price ? money(c.group_price) : '', certs: list(c.certs), medals: list(c.medals),
      specialties: list(c.specialties), levels: list(c.levels), age_groups: list(c.age_groups),
      online: c.online === undefined ? '' : yn(c.online), home_pool: c.home_pool,
      instagram: c.instagram, telegram: c.telegram, website: c.website || s.website,
      min_order: s.min_order ? money(s.min_order) : '', category: s.category, services: list(s.services)
    };
    const value = map[key];
    return { value: value === undefined || value === null ? '' : String(value), role };
  }

  function ownedItems(key) {
    const d = owned || {};
    if (key === 'pools') return arr(d.pools).map(x => ({ id: x.id, label: x.name, note: x.city || '' }));
    if (key === 'team') return arr(d.team).map(x => ({ id: x.id, label: x.full_name, note: arr(x.specialties).slice(0, 2).join('، ') }));
    if (key === 'courses') return arr(d.courses).map(x => ({ id: x.id, label: x.title, note: [x.level, money(x.price)].filter(Boolean).join(' · ') }));
    if (key === 'products') return arr(d.products).map(x => ({ id: x.id, label: x.name, note: money(x.price) }));
    if (key === 'availability') return arr(d.availability).map(x => ({ id: x.id, label: `${WEEKDAYS[Number(x.weekday) || 0]} ${hhmm(x.start_time)}–${hhmm(x.end_time)}`, note: x.pool_name || '' }));
    if (key === 'schedule') return arr(d.schedule).slice(0, 40).map(x => ({ id: x.id, label: `${x.date} · ${hhmm(x.time)}`, note: x.kind || '' }));
    return [];
  }

  /* ------------------------------------------------------------- partials */
  const field = (id, label, value, placeholder, type) =>
    `<label class="ppf-field"><span>${esc(label)}</span><input id="${id}" type="${esc(type || 'text')}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}"></label>`;
  const area = (id, label, value, placeholder, rows) =>
    `<label class="ppf-field ppf-wide"><span>${esc(label)}</span><textarea id="${id}" rows="${rows || 3}" placeholder="${esc(placeholder || '')}">${esc(value || '')}</textarea></label>`;
  const mediaPreview = (src, label) => safeImg(src) ? `<img src="${esc(safeImg(src))}" alt="">` : `<span>${esc(label || '—')}</span>`;
  const switchBox = (checked, dataAttr) => `<label class="ppf-switch"><input type="checkbox" ${checked ? 'checked' : ''} ${dataAttr}><i></i></label>`;

  function blockHead(title, note) {
    return `<div class="ppf-block-title"><b>${esc(title)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
  }

  /* ---------------------------------------------------------- editor: tabs */
  function tabsHtml() {
    const tabs = [['content', 'محتوای من'], ['display', 'چه چیزی دیده شود'], ['share', 'لینک، QR و آمار']];
    return `<div class="ppf-tabs">${tabs.map(t => `<button type="button" class="${activeTab === t[0] ? 'on' : ''}" data-tab="${t[0]}">${esc(t[1])}</button>`).join('')}</div>`;
  }

  /* -------------------------------------------------------- editor: content */
  function contentTab(p, username) {
    const a = authored;
    return `
    <section class="ppf-block">
      ${blockHead('۱. نشانی صفحه و عنوان', 'نام لینک پس از تأیید قفل می‌شود؛ عنوان و شعار پیش از انتشار بررسی می‌شوند.')}
      <div class="ppf-grid">
        ${field('ppfUsername', 'estakhrjo.ir/@', username, 'aqua-center')}
        ${field('ppfHeadline', 'عنوان صفحه', a.headline, (model.account || {}).name || 'نام کسب‌وکار')}
        ${area('ppfTagline', 'شعار / معرفی یک‌خطی', a.tagline, 'در یک جمله بگویید چه ارائه می‌کنید.', 2)}
      </div>
      ${p.username ? `<p class="ppf-hint">نشانی فعلی: <a target="_blank" rel="noopener" href="${esc(profileUrl(p.username))}">@${esc(p.username)}</a></p>` : ''}
    </section>

    <section class="ppf-block">
      ${blockHead('۲. کاور و تصویر شاخص', 'تصاویر هنگام انتخاب به WebP فشرده می‌شوند.')}
      <div class="ppf-media-grid">
        <div class="ppf-media">
          <div class="ppf-media-prev ppf-cover-prev" id="ppfCoverPrev" style="background-position:${Number(a.cover_position.x) || 50}% ${Number(a.cover_position.y) || 50}%;${safeImg(a.cover) ? `background-image:url('${esc(safeImg(a.cover))}')` : ''}">${a.cover ? '' : 'تصویر کاور'}</div>
          <label class="ppf-upload">انتخاب کاور<input id="ppfCoverFile" type="file" accept="image/*" hidden></label>
          <div class="ppf-position">
            <label>افقی <input id="ppfCoverX" type="range" min="0" max="100" value="${Number(a.cover_position.x) || 50}"></label>
            <label>عمودی <input id="ppfCoverY" type="range" min="0" max="100" value="${Number(a.cover_position.y) || 50}"></label>
          </div>
        </div>
        <div class="ppf-media">
          <div class="ppf-media-prev ppf-avatar-prev" id="ppfAvatarPrev">${mediaPreview(a.avatar, 'لوگو / تصویر')}</div>
          <label class="ppf-upload">انتخاب لوگو<input id="ppfAvatarFile" type="file" accept="image/*" hidden></label>
        </div>
      </div>
    </section>

    <section class="ppf-block">
      ${blockHead('۳. معرفی کامل', 'داستان، مزیت و سبک کار شما. این متن بررسی می‌شود.')}
      <div class="ppf-grid">${area('ppfStory', 'متن معرفی', a.story, 'آنچه مخاطب باید دربارهٔ شما بداند…', 7)}</div>
    </section>

    <section class="ppf-block ppf-offer-editor">
      ${blockHead('۴. پیشنهاد ویژه', 'یک مزیت کوتاه مثل کد تخفیف — اختیاری.')}
      <div class="ppf-grid">
        ${field('ppfOfferTitle', 'عنوان', a.offer.title, 'تخفیف ویژهٔ ثبت‌نام')}
        ${field('ppfOfferCode', 'کد تخفیف', a.offer.code, 'MEHR20')}
        ${area('ppfOfferText', 'توضیح کوتاه', a.offer.text, '۲۰٪ تخفیف تا پایان هفته', 2)}
      </div>
    </section>

    <section class="ppf-block">
      ${blockHead('۵. گالری', 'حداکثر ۱۲ تصویر. همهٔ رسانه‌ها بررسی می‌شوند.')}
      <div class="ppf-gallery-edit" id="ppfGallery">
        ${arr(a.gallery).map((g, i) => `<figure data-index="${i}">${mediaPreview(g.url, '🖼️')}<button type="button" title="حذف" data-remove-gallery="${i}">×</button></figure>`).join('')}
        <label class="ppf-gallery-add">＋<small>افزودن عکس</small><input id="ppfGalleryFile" type="file" accept="image/*" multiple hidden></label>
      </div>
    </section>

    <section class="ppf-block">
      ${blockHead('۶. پیوندها و شبکه‌های اجتماعی', 'اگر اینستاگرام یا وب‌سایت در پروفایل اصلی‌تان ثبت شده باشد، خودکار نمایش داده می‌شود؛ این‌ها موارد اضافه است.')}
      <div class="ppf-grid">
        ${field('ppfSocInstagram', 'اینستاگرام', a.social.instagram, 'https://instagram.com/…', 'url')}
        ${field('ppfSocTelegram', 'تلگرام', a.social.telegram, 'https://t.me/…', 'url')}
        ${field('ppfSocWebsite', 'وب‌سایت', a.social.website, 'https://…', 'url')}
        ${field('ppfSocAparat', 'آپارات', a.social.aparat, 'https://aparat.com/…', 'url')}
        ${field('ppfWhatsapp', 'شمارهٔ واتس‌اپ', a.contact.whatsapp, '989…')}
        ${field('ppfMapUrl', 'لینک نقشه (اگر موقعیت ثبت نشده)', a.contact.map_url, 'https://maps…', 'url')}
        ${area('ppfAddressFallback', 'نشانی جایگزین', a.contact.address, 'فقط اگر در پروندهٔ اصلی نشانی ندارید', 2)}
      </div>
      <div class="ppf-links-edit" id="ppfLinks">
        ${arr(a.links).map((l, i) => `<div class="ppf-link-row" data-index="${i}"><input data-link-label="${i}" value="${esc(l.label || '')}" placeholder="برچسب"><input data-link-url="${i}" value="${esc(l.url || '')}" placeholder="https://…" dir="ltr"><button type="button" data-remove-link="${i}">×</button></div>`).join('')}
        <button type="button" class="btn btn-ghost btn-sm" id="ppfAddLink">＋ افزودن پیوند</button>
      </div>
    </section>`;
  }

  /* -------------------------------------------------------- editor: display */
  /* Per-template copy overrides UI: one grouped list of the template's
     hardcoded texts. Empty = template default; typed = instant override. */
  function textsBlockHtml(tpl) {
    const groups = TEMPLATE_TEXT_SLOTS[tpl] || [];
    if (!groups.length) return '';
    const saved = (display.custom_texts || {})[tpl] || {};
    const body = groups.map((g, gi) => `
      <details class="ppf-texts-group" ${gi === 0 ? 'open' : ''}>
        <summary>${esc(g[0])}<small>${g[1].filter(s => saved[s[0]]).length ? ` · ${g[1].filter(s => saved[s[0]]).length} متن سفارشی` : ''}</small></summary>
        ${g[1].map(s => `<label class="ppf-field ppf-text-slot${saved[s[0]] ? ' edited' : ''}">
          <span>${esc(s[1])}</span>
          <input type="text" maxlength="300" data-text-slot="${esc(s[0])}" value="${esc(saved[s[0]] || '')}" placeholder="${esc(s[2])}" dir="auto">
        </label>`).join('')}
      </details>`).join('');
    return `<section class="ppf-block ppf-texts" id="ppfTexts">${blockHead('متن‌های قالب انتخاب‌شده', 'همهٔ متن‌هایی که قالب به‌صورت پیش‌فرض روی صفحهٔ شما نمایش می‌دهد. هرکدام را که خالی بگذارید، متن پیش‌فرض همان قالب دیده می‌شود؛ هر متنی بنویسید، <b>بلافاصله و بدون نیاز به تأیید</b> جایگزین همان بخش می‌شود.')}<p class="ppf-texts-note">تغییرها فقط روی قالب «${esc(tpl)}» و فقط روی صفحهٔ عمومی خودتان اعمال می‌شود.</p>${body}</section>`;
  }

  function displayTab() {
    const role = (model.account || {}).role;
    const reg = model.registry || { sections: [], fields: [], items: [] };
    const src = SOURCE_LINK[role] || ['پروندهٔ من', 'dashboard.html?build=ppf8'];

    const sections = display.sections.map(s =>
      `<div class="ppf-order-row" draggable="true" data-section="${esc(s.key)}">
        <span class="ppf-grab" aria-hidden="true">⠿</span>
        <div><b>${esc(SECTION_LABEL[s.key] || s.key)}</b>${SECTION_NOTE[s.key] ? `<small>${esc(SECTION_NOTE[s.key])}</small>` : ''}</div>
        ${switchBox(s.on !== false, `data-section-on="${esc(s.key)}"`)}
      </div>`).join('');

    const fields = reg.fields.map(k => {
      const sv = systemValue(k);
      const known = sv.value !== '';
      return `<div class="ppf-sysrow${known ? '' : ' empty'}">
        <div><b>${esc(FIELD_LABEL[k] || k)}</b><small dir="auto">${known ? esc(sv.value) : 'در پروندهٔ اصلی ثبت نشده'}</small></div>
        ${known ? switchBox(display.fields[k] !== false, `data-field-on="${esc(k)}"`) : `<a class="ppf-sysfix" href="${esc(src[1])}">تکمیل در ${esc(src[0])} ↗</a>`}
      </div>`;
    }).join('');

    const items = reg.items.filter(k => ownedItems(k).length || k === 'schedule').map(k => {
      const pref = display.items[k] || { mode: 'all', ids: [] };
      const list = ownedItems(k);
      return `<div class="ppf-itemgroup" data-item="${esc(k)}">
        <header>
          <b>${esc(ITEM_LABEL[k] || k)}</b>
          <div class="ppf-modes">
            ${['all', 'pick', 'none'].map(m => `<label><input type="radio" name="mode-${esc(k)}" value="${m}" ${pref.mode === m ? 'checked' : ''} data-item-mode="${esc(k)}"><span>${({ all: 'همه', pick: 'انتخابی', none: 'هیچ‌کدام' })[m]}</span></label>`).join('')}
          </div>
        </header>
        ${k === 'schedule' ? `<label class="ppf-horizon">نمایش سانس‌های <input type="number" min="1" max="30" value="${Number(pref.horizon_days) || 7}" data-item-horizon="${esc(k)}"> روز آینده</label>` : ''}
        <div class="ppf-picklist" ${pref.mode === 'pick' ? '' : 'hidden'}>
          ${list.length ? list.map(x => `<label><input type="checkbox" value="${esc(x.id)}" ${arr(pref.ids).indexOf(Number(x.id)) > -1 ? 'checked' : ''} data-item-id="${esc(k)}"><span>${esc(x.label)}${x.note ? ` <small>${esc(x.note)}</small>` : ''}</span></label>`).join('') : '<p class="ppf-hint">موردی برای انتخاب وجود ندارد.</p>'}
        </div>
      </div>`;
    }).join('');

    const templateOptions = [
      ['estakhrjo-1', 'Cinematic Profile', 'روایت سینمایی با عکس و داستان بلند', 'editorial-coach.jpg'],
      ['estakhrjo-2', 'Personal Story', 'پروفایل روایی با تصویر چسبان', 'cinematic-coach.jpg'],
      ['estakhrjo-3', 'Editorial Profile', 'پرونده ادیتوریال حرفه‌ای', 'hero-pool.jpg'],
      ['estakhrjo-4', 'Luxury Editorial', 'پرونده لوکس با تایپوگرافی نمایشی', 'underwater-electric.jpg']
    ];
    const selectedTemplate = display.template || 'estakhrjo-3';
    const templatePicker = `<section class="ppf-block ppf-template-picker">${blockHead('قالب صفحهٔ عمومی', 'این انتخاب فقط روی صفحهٔ عمومی همین عضو اثر می‌گذارد؛ اطلاعات و آدرس صفحه تغییر نمی‌کند.')}<div class="ppf-template-grid">${templateOptions.map(t => `<label class="ppf-template-card ${selectedTemplate === t[0] ? 'selected' : ''}"><input type="radio" name="ppf-template" value="${t[0]}" ${selectedTemplate === t[0] ? 'checked' : ''} data-template-choice><span class="ppf-template-image" style="background-image:url('/images/${t[3]}')"></span><b>${t[1]}</b><small>${t[2]}</small><em>${selectedTemplate === t[0] ? 'قالب انتخاب‌شده' : 'انتخاب قالب'}</em></label>`).join('')}</div></section>`;

    return `
      ${templatePicker}
      ${textsBlockHtml(selectedTemplate)}
      <div class="ppf-notice">
        <b>هیچ داده‌ای را دوباره وارد نمی‌کنید.</b>
        <span>هر چیزی که این‌جا می‌بینید از ${esc(src[0])} خوانده می‌شود. این‌جا فقط تصمیم می‌گیرید چه چیزی روی صفحهٔ عمومی دیده شود. تغییرات این برگه <b>بدون نیاز به تأیید مدیر</b> و بلافاصله اعمال می‌شود.</span>
        <a class="btn btn-ghost btn-sm" href="${esc(src[1])}">ویرایش دادهٔ اصلی در ${esc(src[0])} ↗</a>
      </div>
      <section class="ppf-block">${blockHead('بخش‌های صفحه', 'برای جابه‌جایی بکشید؛ برای پنهان‌کردن کلید را خاموش کنید.')}<div class="ppf-order" id="ppfOrder">${sections}</div></section>
      <section class="ppf-block">${blockHead('اطلاعات سیستمی', 'مقدارها فقط‌خواندنی‌اند. برای اصلاح، پروندهٔ اصلی را ویرایش کنید.')}<div class="ppf-syslist">${fields}</div></section>
      ${items ? `<section class="ppf-block">${blockHead('موارد قابل نمایش', 'انتخاب کنید کدام رکوردها روی صفحه بیایند.')}<div class="ppf-items">${items}</div></section>` : ''}`;
  }

  /* ---------------------------------------------------------- editor: share */
  function shareTab(p, username) {
    const live = validUsername(username);
    return `
      <section class="ppf-block">
        ${blockHead('کارت QR و معرفی صفحه', 'کارت را ذخیره کنید یا مستقیم بفرستید؛ هرکس اسکنش کند مستقیم به صفحهٔ شما می‌رود.')}
        ${live ? `<div class="ppf-qr2">
          <div class="ppf-qr2-card"><canvas id="ppfQrCard" width="340" height="470" role="img" aria-label="کارت QR صفحهٔ عمومی"></canvas></div>
          <div class="ppf-qr2-side">
            <label class="ppf-field"><span>نشانی صفحه</span>
              <input id="ppfUrl" type="text" dir="ltr" readonly value="${esc(profileUrl(username))}"></label>
            <div class="ppf-qr2-btns">
              <button type="button" class="btn btn-primary" id="ppfShare">↗ اشتراک‌گذاری صفحه</button>
              <button type="button" class="btn btn-ghost" id="ppfCopy">کپی لینک</button>
              <button type="button" class="btn btn-ghost" id="ppfPng">دانلود کارت (PNG)</button>
              <button type="button" class="btn btn-ghost" id="ppfSvg">QR ساده (SVG)</button>
              <button type="button" class="btn btn-ghost" id="ppfPrint">چاپ</button>
            </div>
            <div class="ppf-qr2-quick">
              <a id="ppfWa" target="_blank" rel="noopener">واتس‌اپ</a>
              <a id="ppfTg" target="_blank" rel="noopener">تلگرام</a>
              <a id="ppfMail" target="_blank" rel="noopener">ایمیل</a>
            </div>
            <p class="ppf-hint">کارت با تم فعلی سایت ساخته می‌شود؛ اگر رنگ‌های Design Studio عوض شوند، کارت هم عوض می‌شود.</p>
          </div>
        </div>` : '<p class="ppf-hint">ابتدا در برگهٔ «محتوای من» یک نام لینک معتبر ثبت کنید تا کارت QR ساخته شود.</p>'}
      </section>
      <section class="ppf-block">
        ${blockHead('آمار صفحه', 'بازدید و کلیک‌های هدفمند.')}
        <div class="ppf-analytics">
          <div><b>بازهٔ زمانی</b><select id="ppfRange"><option value="today">امروز</option><option value="week" selected>هفته</option><option value="month">ماه</option></select></div>
          <div class="ppf-metrics" id="ppfMetrics"><span>—<small>بازدید</small></span><span>—<small>بازدیدکننده</small></span><span>—<small>کلیک</small></span></div>
        </div>
      </section>
      ${p.publish_state === 'published' ? `<section class="ppf-block"><div class="ppf-danger"><div><b>لغو انتشار موقت</b><small>صفحه از دسترس عمومی خارج می‌شود؛ محتوا و آمار حفظ می‌ماند و هر زمان می‌توانید دوباره ارسال کنید.</small></div><button type="button" class="btn btn-ghost" id="ppfUnpublish">لغو انتشار</button></div></section>` : ''}`;
  }

  /* ------------------------------------------------------------- shell */
  function editorHtml() {
    const p = (model && model.profile) || {};
    const username = p.requested_username || p.username || '';
    const st = statusChip(p.review_status === 'pending' ? 'pending' : (p.publish_state || p.review_status || 'draft'));
    const filled = [username, authored.headline, authored.tagline, authored.story, authored.cover, authored.avatar, arr(authored.gallery).length].filter(Boolean).length;
    const pct = Math.round(filled / 7 * 100);
    /* Real, live preview: the very page the public sees, rendered with the
       member's published data. The template app accepts a ?template= override
       exactly for this, so picking a card can re-render the frame instantly.
       Only available once the page is actually published; before that the
       structured mini mock stays as the fallback. */
    const livePreviewUrl = (String(p.publish_state) === 'published' && validUsername(p.username || username || ''))
      ? profileUrl(p.username || username) + '?template=' + encodeURIComponent(display.template || 'estakhrjo-3')
      : '';

    let body = '';
    if (activeTab === 'content') body = contentTab(p, username);
    else if (activeTab === 'display') body = displayTab();
    else body = shareTab(p, username);

    return `<section class="ppf-shell">
      <div class="ppf-head">
        <div><span class="ppf-kicker">ESTAKHRJO PUBLIC PROFILE</span><h2>صفحهٔ عمومی من</h2>
          <p>یک صفحهٔ حرفه‌ای که خودش را از پروندهٔ ${esc(roleLabel((model.account || {}).role))} شما پر می‌کند. فقط متن‌های معرفی بررسی می‌شوند.</p></div>
        <div class="ppf-head-status">
          <span class="ppf-status ${st[1]}">${esc(st[0])}</span>
          ${p.username && p.publish_state === 'published' ? `<a target="_blank" rel="noopener" href="${esc(profileUrl(p.username))}">↗ مشاهدهٔ صفحه</a>` : ''}
        </div>
      </div>
      ${p.rejection_reason ? `<div class="ppf-reject"><b>دلیل نیاز به اصلاح</b><span>${esc(p.rejection_reason)}</span><small>نسخهٔ تأییدشدهٔ قبلی تا زمان تأیید ویرایش جدید عمومی می‌ماند.</small></div>` : ''}
      ${p.pending_authored ? `<div class="ppf-notice pending"><b>یک نسخه در صف بررسی است.</b><span>تا تعیین تکلیف، نسخهٔ تأییدشدهٔ قبلی روی صفحهٔ عمومی می‌ماند.</span></div>` : ''}
      <div class="ppf-progress"><div><b>کامل بودن صفحه</b><span>${pct.toLocaleString('fa-IR')}٪</span></div><i><em style="width:${pct}%"></em></i></div>
      ${tabsHtml()}
      <div class="ppf-layout">
        <div class="ppf-form">
          ${body}
          <div class="ppf-save">
            <div><b>انتشار کنترل‌شده</b><small id="ppfSaveState">${esc(lastSaveMessage || 'کلیدهای نمایش بلافاصله اعمال می‌شوند؛ فقط متن‌های نوشتاری به صف بررسی می‌روند.')}</small></div>
            <div><button type="button" class="btn btn-ghost" id="ppfDraft">ذخیرهٔ پیش‌نویس</button><button type="button" class="btn btn-primary" id="ppfSubmit">ارسال برای بررسی</button></div>
          </div>
        </div>
        <aside class="ppf-preview">
          <div class="ppf-preview-head"><b>پیش‌نمایش زنده</b><span>همگام با فرم</span></div>
          <div class="ppf-preview-tabs"><button type="button" class="on" data-preview="desk">دسکتاپ</button><button type="button" data-preview="mobile">موبایل</button></div>
          ${livePreviewUrl
            ? `<div class="ppf-liveframe-wrap desk" id="ppfFrameWrap"><iframe class="ppf-liveframe" id="ppfLiveFrame" title="پیش‌نمایش واقعی صفحهٔ عمومی" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="${esc(livePreviewUrl)}"></iframe></div>`
            : `<div class="ppf-device desk" id="ppfDevice">
            <div class="ppf-mini-cover" id="ppfMiniCover"></div>
            <div class="ppf-mini-ident"><div id="ppfMiniAvatar"></div><div><small>${esc(roleLabel((model.account || {}).role))}</small><b id="ppfMiniName"></b><p id="ppfMiniBio"></p></div></div>
            <div class="ppf-mini-body"><b>بخش‌های فعال</b><p id="ppfMiniSections"></p></div>
          </div>`}
        </aside>
      </div>
    </section>`;
  }

  /* --------------------------------------------------------------- reading */
  const read = id => { const el = E('#' + id, host); return el ? String(el.value || '').trim() : ''; };

  function collectAuthored() {
    authored.headline = read('ppfHeadline');
    authored.tagline = read('ppfTagline');
    authored.story = read('ppfStory');
    authored.offer = { title: read('ppfOfferTitle'), text: read('ppfOfferText'), code: read('ppfOfferCode').toUpperCase() };
    authored.social = {
      instagram: read('ppfSocInstagram'), telegram: read('ppfSocTelegram'),
      website: read('ppfSocWebsite'), aparat: read('ppfSocAparat')
    };
    authored.contact = { whatsapp: read('ppfWhatsapp'), address: read('ppfAddressFallback'), map_url: read('ppfMapUrl') };
    const x = Number(read('ppfCoverX')), y = Number(read('ppfCoverY'));
    if (!Number.isNaN(x) && read('ppfCoverX') !== '') authored.cover_position = { x, y: Number.isNaN(y) ? 50 : y };
    const links = [];
    EA('[data-link-url]', host).forEach(el => {
      const i = el.getAttribute('data-link-url');
      const label = E(`[data-link-label="${i}"]`, host);
      if (el.value.trim()) links.push({ label: label ? label.value.trim() : '', url: el.value.trim() });
    });
    if (EA('[data-link-url]', host).length || arr(authored.links).length) authored.links = links;
    cacheDraft();
    return authored;
  }

  /* ------------------------------------------------------------- bindings */
  async function toWebp(file) {
    if (!file) return '';
    let image, dispose = () => {};
    try { if (window.createImageBitmap) image = await createImageBitmap(file); } catch (_) {}
    if (!image) {
      const url = URL.createObjectURL(file);
      try { image = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('مرورگر نتوانست این تصویر را بخواند')); i.src = url; }); }
      finally { dispose = () => URL.revokeObjectURL(url); }
    }
    try {
      /* WebKit ignores the requested type here and hands back a PNG, so ask
         for WebP, check what actually came out, and fall back to JPEG rather
         than storing something mislabelled. */
      const encode = (cv, mime) => {
        const out = cv.toDataURL(mime, .82);
        return out.slice(0, 11 + mime.length).toLowerCase().startsWith('data:' + mime) ? out : '';
      };
      let longest = Math.min(1800, Math.max(image.width, image.height));
      for (let a = 0; a < 5; a++) {
        const scale = longest / Math.max(image.width, image.height), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(image.width * scale)); cv.height = Math.max(1, Math.round(image.height * scale));
        cv.getContext('2d').drawImage(image, 0, 0, cv.width, cv.height);
        const out = encode(cv, 'image/webp') || encode(cv, 'image/jpeg') || cv.toDataURL('image/jpeg', .82);
        if (out.length <= 280000) return out;
        longest = Math.round(longest * .72);
      }
      throw new Error('تصویر بیش از حد بزرگ است؛ عکس کوچک‌تری انتخاب کنید.');
    } finally { if (image && image.close) image.close(); dispose(); }
  }

  function syncPreview() {
    const device = E('#ppfDevice', host);
    if (device) device.className = 'ppf-device ' + (device.classList.contains('mobile') ? 'mobile' : 'desk') + ' ppf-preview-' + (display.template || 'estakhrjo-3');
    const cover = E('#ppfMiniCover', host); if (!cover) return;
    const c = safeImg(authored.cover);
    cover.style.backgroundImage = c ? `url('${c}')` : '';
    cover.style.backgroundPosition = `${Number(authored.cover_position.x) || 50}% ${Number(authored.cover_position.y) || 50}%`;
    E('#ppfMiniAvatar', host).innerHTML = mediaPreview(authored.avatar, '◈');
    E('#ppfMiniName', host).textContent = read('ppfHeadline') || authored.headline || (model.account || {}).name || '';
    E('#ppfMiniBio', host).textContent = read('ppfTagline') || authored.tagline || '';
    const on = display.sections.filter(s => s.on !== false).map(s => SECTION_LABEL[s.key] || s.key);
    const mini = E('#ppfMiniSections', host); if (mini) mini.textContent = on.join(' · ') || 'هیچ بخشی فعال نیست';
  }

  function bind() {
    EA('[data-tab]', host).forEach(b => b.addEventListener('click', () => {
      if (activeTab === 'content') collectAuthored();
      activeTab = b.getAttribute('data-tab'); renderEditor();
    }));

    /* content tab */
    ['ppfHeadline', 'ppfTagline', 'ppfStory'].forEach(id => { const el = E('#' + id, host); if (el) el.addEventListener('input', syncPreview); });
    ['ppfCoverX', 'ppfCoverY'].forEach(id => {
      const el = E('#' + id, host);
      if (el) el.addEventListener('input', () => {
        authored.cover_position = { x: Number(read('ppfCoverX')) || 50, y: Number(read('ppfCoverY')) || 50 };
        const prev = E('#ppfCoverPrev', host);
        if (prev) prev.style.backgroundPosition = `${authored.cover_position.x}% ${authored.cover_position.y}%`;
        syncPreview();
      });
    });
    const coverFile = E('#ppfCoverFile', host);
    if (coverFile) coverFile.addEventListener('change', async ev => {
      try { authored.cover = await toWebp(ev.target.files[0]); const p = E('#ppfCoverPrev', host); if (p) { p.style.backgroundImage = `url('${authored.cover}')`; p.textContent = ''; } cacheDraft(); syncPreview(); }
      catch (e) { notify('⚠️ ' + e.message); }
    });
    const avatarFile = E('#ppfAvatarFile', host);
    if (avatarFile) avatarFile.addEventListener('change', async ev => {
      try { authored.avatar = await toWebp(ev.target.files[0]); E('#ppfAvatarPrev', host).innerHTML = mediaPreview(authored.avatar, '◈'); cacheDraft(); syncPreview(); }
      catch (e) { notify('⚠️ ' + e.message); }
    });
    const galleryFile = E('#ppfGalleryFile', host);
    if (galleryFile) galleryFile.addEventListener('change', async ev => {
      for (const f of [...ev.target.files].slice(0, 12 - arr(authored.gallery).length)) {
        try { const url = await toWebp(f); if (url) authored.gallery.push({ url, alt: '' }); } catch (e) { notify('⚠️ ' + e.message); }
      }
      cacheDraft(); renderEditor();
    });
    EA('[data-remove-gallery]', host).forEach(b => b.addEventListener('click', () => {
      authored.gallery.splice(Number(b.getAttribute('data-remove-gallery')), 1); cacheDraft(); renderEditor();
    }));
    const addLink = E('#ppfAddLink', host);
    if (addLink) addLink.addEventListener('click', () => { collectAuthored(); authored.links.push({ label: '', url: '' }); renderEditor(); });
    EA('[data-remove-link]', host).forEach(b => b.addEventListener('click', () => {
      collectAuthored(); authored.links.splice(Number(b.getAttribute('data-remove-link')), 1); renderEditor();
    }));

    /* display tab — every switch writes straight to `display` */
    EA('[data-template-choice]', host).forEach(el => el.addEventListener('change', () => {
      if (!el.checked) return;
      display.template = el.value;
      EA('.ppf-template-card', host).forEach(card => card.classList.toggle('selected', card.contains(el)));
      const device = E('#ppfDevice', host);
      if (device) device.className = `ppf-device desk ppf-preview-${display.template}`;
      const frame = E('#ppfLiveFrame', host);
      if (frame) frame.src = profileUrl(currentUsername() || (model.profile || {}).username) + '?template=' + encodeURIComponent(display.template);
      cacheDraft();
      // Template selection is a presentation preference, not reviewed copy.
      // Persist it immediately so the already-published public URL changes
      // without requiring the member to submit authored content again.
      save(false, true);
      notify('قالب انتخاب شد و در حال اعمال روی صفحهٔ عمومی است.');
    }));

    EA('[data-text-slot]', host).forEach(el => el.addEventListener('input', () => {
      const tpl = display.template || 'estakhrjo-3';
      display.custom_texts = display.custom_texts || {};
      display.custom_texts[tpl] = display.custom_texts[tpl] || {};
      const slot = el.getAttribute('data-text-slot');
      const v = String(el.value || '').trim().slice(0, 300);
      if (v) display.custom_texts[tpl][slot] = v;
      else {
        delete display.custom_texts[tpl][slot];
        if (!Object.keys(display.custom_texts[tpl]).length) delete display.custom_texts[tpl];
      }
      const wrap = el.closest('.ppf-text-slot'); if (wrap) wrap.classList.toggle('edited', !!v);
      cacheDraft();
      clearTimeout(textsSaveTimer);
      textsSaveTimer = setTimeout(() => {
        save(false, true, { quiet: true }).then(out => {
          /* reload the live preview so it re-fetches the bundle with the
             freshly saved custom texts (published pages only). */
          const frame = E('#ppfLiveFrame', host);
          if (out && frame && frame.src) frame.src = frame.src;
        });
      }, 1200);
    }));

    EA('[data-section-on]', host).forEach(el => el.addEventListener('change', () => {
      const key = el.getAttribute('data-section-on');
      const row = display.sections.find(s => s.key === key);
      if (row) row.on = el.checked;
      cacheDraft(); syncPreview();
    }));
    EA('[data-field-on]', host).forEach(el => el.addEventListener('change', () => {
      display.fields[el.getAttribute('data-field-on')] = el.checked; cacheDraft();
    }));
    EA('[data-item-mode]', host).forEach(el => el.addEventListener('change', () => {
      const key = el.getAttribute('data-item-mode');
      display.items[key] = display.items[key] || { mode: 'all', ids: [] };
      display.items[key].mode = el.value;
      const group = el.closest('.ppf-itemgroup'), list = group && group.querySelector('.ppf-picklist');
      if (list) list.hidden = el.value !== 'pick';
      cacheDraft();
    }));
    EA('[data-item-id]', host).forEach(el => el.addEventListener('change', () => {
      const key = el.getAttribute('data-item-id');
      display.items[key] = display.items[key] || { mode: 'pick', ids: [] };
      const ids = new Set(arr(display.items[key].ids).map(Number));
      if (el.checked) ids.add(Number(el.value)); else ids.delete(Number(el.value));
      display.items[key].ids = [...ids];
      cacheDraft();
    }));
    EA('[data-item-horizon]', host).forEach(el => el.addEventListener('change', () => {
      const key = el.getAttribute('data-item-horizon');
      display.items[key] = display.items[key] || { mode: 'all', ids: [] };
      display.items[key].horizon_days = Math.min(30, Math.max(1, Number(el.value) || 7));
      cacheDraft();
    }));
    bindDrag();

    /* share tab */
    const shareBtn = E('#ppfShare', host); if (shareBtn) shareBtn.addEventListener('click', sharePage);
    const copy = E('#ppfCopy', host); if (copy) copy.addEventListener('click', copyUrl);
    const png = E('#ppfPng', host); if (png) png.addEventListener('click', () => downloadQr('png'));
    const svg = E('#ppfSvg', host); if (svg) svg.addEventListener('click', () => downloadQr('svg'));
    const pr = E('#ppfPrint', host); if (pr) pr.addEventListener('click', () => window.print());
    const u = currentUsername();
    if (validUsername(u)) {
      const msg = encodeURIComponent(shareText(u));
      const wa = E('#ppfWa', host); if (wa) wa.href = 'https://wa.me/?text=' + msg;
      const tg = E('#ppfTg', host); if (tg) tg.href = 'https://t.me/share/url?url=' + encodeURIComponent(profileUrl(u)) + '&text=' + encodeURIComponent('صفحهٔ من در استخر جو');
      const ml = E('#ppfMail', host); if (ml) ml.href = 'mailto:?subject=' + encodeURIComponent('صفحهٔ عمومی من در استخر جو') + '&body=' + msg;
    }
    const range = E('#ppfRange', host); if (range) { range.addEventListener('change', loadAnalytics); loadAnalytics(); }
    const unpub = E('#ppfUnpublish', host);
    if (unpub) unpub.addEventListener('click', async () => {
      if (!confirm('صفحه موقتاً از دسترس عمومی خارج شود؟')) return;
      try { await window.SH_CLOUD_AUTH.unpublishOwnPublicProfile(); notify('صفحه از انتشار خارج شد'); await reload(); }
      catch (e) { notify('⚠️ ' + e.message); }
    });

    EA('[data-preview]', host).forEach(b => b.addEventListener('click', () => {
      EA('[data-preview]', host).forEach(x => x.classList.remove('on')); b.classList.add('on');
      const d = E('#ppfDevice', host); if (d) d.className = 'ppf-device ' + b.getAttribute('data-preview') + ' ppf-preview-' + (display.template || 'estakhrjo-3');
      const w = E('#ppfFrameWrap', host); if (w) w.className = 'ppf-liveframe-wrap ' + (b.getAttribute('data-preview') === 'mobile' ? 'mobile' : 'desk');
    }));

    const draftBtn = E('#ppfDraft', host); if (draftBtn) draftBtn.addEventListener('click', () => save(false));
    const submitBtn = E('#ppfSubmit', host); if (submitBtn) submitBtn.addEventListener('click', () => save(true));

    syncPreview();
    if (activeTab === 'share') renderQrCard(currentUsername());
  }

  function bindDrag() {
    const box = E('#ppfOrder', host); if (!box) return;
    let dragged = null;
    EA('[data-section]', box).forEach(row => {
      row.addEventListener('dragstart', () => { dragged = row; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging'); dragged = null;
        display.sections = EA('[data-section]', box).map((el, i) => {
          const key = el.getAttribute('data-section');
          const prev = display.sections.find(s => s.key === key) || { key, on: true };
          return { key, on: prev.on !== false, order: i + 1 };
        });
        cacheDraft(); syncPreview();
      });
      row.addEventListener('dragover', ev => {
        ev.preventDefault();
        if (!dragged || dragged === row) return;
        const r = row.getBoundingClientRect();
        box.insertBefore(dragged, (ev.clientY - r.top) / r.height > .5 ? row.nextSibling : row);
      });
    });
  }

  /* ----------------------------------------------------------------- save */
  async function save(submit, displayOnly, opts) {
    const quiet = !!(opts && opts.quiet);
    const username = read('ppfUsername').toLowerCase().replace(/^@/, '') || (model.profile || {}).username || '';
    if (!validUsername(username)) {
      lastSaveMessage = 'نام لینک باید ۳ تا ۳۲ کاراکتر انگلیسی، عدد، خط تیره یا زیرخط باشد.';
      const s = E('#ppfSaveState', host); if (s) s.textContent = lastSaveMessage;
      notify('⚠️ ' + lastSaveMessage); return null;
    }
    if (activeTab === 'content') collectAuthored();
    const btn = E(submit ? '#ppfSubmit' : '#ppfDraft', host);
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'در حال ذخیره…'; }
    try {
      const out = await window.SH_CLOUD_AUTH.savePublicProfile(username, { authored, display, display_only: displayOnly === true }, submit);
      model = Object.assign({}, model, out);
      if (out.profile) { display = out.profile.display_prefs || display; }
      lastSaveMessage = submit
        ? '✓ متن‌ها برای بررسی ارسال شد. کلیدهای نمایش همین حالا اعمال شدند.'
        : '✓ پیش‌نویس ذخیره شد. کلیدهای نمایش همین حالا اعمال شدند.';
      if (quiet) {
        const s = E('#ppfSaveState', host); if (s) s.textContent = lastSaveMessage;
      } else {
        notify(submit ? 'برای بررسی مدیر ارسال شد' : 'پیش‌نویس ذخیره شد');
        renderEditor();
      }
      return out;
    } catch (e) {
      lastSaveMessage = 'ذخیره ناموفق بود: ' + (e.message || 'دوباره تلاش کنید.');
      const s = E('#ppfSaveState', host); if (s) s.textContent = lastSaveMessage;
      notify('⚠️ ' + e.message); return null;
    } finally {
      if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
    }
  }

  /* ------------------------------------------------------------- QR/stats */
  /* The card is drawn by hand rather than by QRCode.toCanvas, because a
     plain black grid on white would ignore the product's design language.
     `QRCode.create` hands over the raw module matrix; from there the dots,
     the three finder eyes and the centre badge are ours to style, the same
     way Instagram styles its nametag. Colours are read from the live CSS
     custom properties, so the Admin Design Studio drives the card too. */

  const CARD_W = 340, CARD_H = 470;

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* One of the three big squares a scanner uses to orient itself. The ring
     must read as dark1 : light1 : dark3 : light1 : dark1 across its middle,
     so the gap is painted in the plate colour rather than erased — a
     destination-out hole leaves transparent pixels, which a decoder reads as
     dark and the eye then never matches the pattern. */
  function finder(ctx, x, y, cell, colour, plateColour) {
    ctx.fillStyle = colour;
    roundRect(ctx, x, y, cell * 7, cell * 7, cell * 2.1); ctx.fill();
    ctx.fillStyle = plateColour;
    roundRect(ctx, x + cell, y + cell, cell * 5, cell * 5, cell * 1.45); ctx.fill();
    ctx.fillStyle = colour;
    roundRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.9); ctx.fill();
  }

  /* Canvas silently falls back to a default font if the webfont has not been
     parsed yet, which is why the first card came out with the wrong Persian
     and Latin shapes. The site self-hosts Vazirmatn with font-display:block,
     so ask for the exact weights and wait before drawing any text. */
  const CARD_FONT = '"Vazirmatn", system-ui, -apple-system, sans-serif';
  let fontsReady = null;
  function ensureCardFonts() {
    if (fontsReady) return fontsReady;
    if (!document.fonts || !document.fonts.load) return (fontsReady = Promise.resolve());
    fontsReady = Promise.all([
      document.fonts.load('400 13px "Vazirmatn"'),
      document.fonts.load('600 16px "Vazirmatn"'),
      document.fonts.load('700 21px "Vazirmatn"')
    ]).then(() => document.fonts.ready).catch(() => {});
    return fontsReady;
  }

  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function drawQrCard(canvas, opts) {
    if (!canvas || !window.QRCode || !window.QRCode.create) return false;
    await ensureCardFonts();
    const scale = opts.scale || 1;
    canvas.width = CARD_W * scale;
    canvas.height = CARD_H * scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, CARD_W, CARD_H);

    const brand = cssVar('--brand', '#22d3ee');
    const brand2 = cssVar('--brand-2', '#0ea5e9');
    const ink = '#062032';

    // 1. brand gradient body
    const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    g.addColorStop(0, brand);
    g.addColorStop(1, brand2);
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 34); ctx.fill();

    // 2. water rings — a quiet nod to the product without shouting
    ctx.save();
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 34); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CARD_W - 28, -18, 66 + i * 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(22, CARD_H - 10, 74, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    ctx.restore();

    // 3. white plate holding the code
    const plate = 252, px = (CARD_W - plate) / 2, py = 44;
    ctx.save();
    ctx.shadowColor = 'rgba(3,26,40,.28)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 9;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, px, py, plate, plate, 30); ctx.fill();
    ctx.restore();

    // 4. the code itself
    const matrix = window.QRCode.create(opts.url, { errorCorrectionLevel: 'H' });
    const size = matrix.modules.size, bits = matrix.modules.data;
    const pad = 32, area = plate - pad * 2, cell = area / size;  // ~5 modules of quiet zone, spec asks for 4
    const ox = px + pad, oy = py + pad;
    const on = (r, c) => !!bits[r * size + c];

    // clear zone for the centre badge, sized so 'H' error correction covers it
    const badgeR = area * 0.15, cx = ox + area / 2, cy = oy + area / 2;

    ctx.fillStyle = ink;
    const dot = cell * 0.86, off = (cell - dot) / 2;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!on(r, c)) continue;
        const inFinder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
        if (inFinder) continue;
        const mx = ox + c * cell + cell / 2, my = oy + r * cell + cell / 2;
        if (Math.hypot(mx - cx, my - cy) < badgeR + cell * 0.7) continue;
        roundRect(ctx, ox + c * cell + off, oy + r * cell + off, dot, dot, dot * 0.34);
        ctx.fill();
      }
    }
    finder(ctx, ox, oy, cell, ink, '#ffffff');
    finder(ctx, ox + (size - 7) * cell, oy, cell, ink, '#ffffff');
    finder(ctx, ox, oy + (size - 7) * cell, cell, ink, '#ffffff');

    // 5. centre badge — our mark, sitting in the hole the error correction covers
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, badgeR + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
    const bg2 = ctx.createLinearGradient(cx - badgeR, cy - badgeR, cx + badgeR, cy + badgeR);
    bg2.addColorStop(0, brand); bg2.addColorStop(1, brand2);
    ctx.fillStyle = bg2; ctx.fill();
    const img = await loadImage(opts.badge);
    if (img) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, badgeR - 1, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, cx - badgeR, cy - badgeR, badgeR * 2, badgeR * 2);
      ctx.restore();
    } else {
      drawMark(ctx, cx, cy, badgeR);
    }
    ctx.restore();

    // 6. identity under the plate
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 21px ${CARD_FONT}`;
    ctx.fillText(trimTo(ctx, opts.name || '', CARD_W - 56), CARD_W / 2, py + plate + 44);
    // the handle is Latin, so render it left-to-right whatever the page direction
    ctx.direction = 'ltr';
    ctx.font = `600 15.5px ${CARD_FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(trimTo(ctx, '@' + opts.username, CARD_W - 56), CARD_W / 2, py + plate + 70);
    ctx.font = `400 12px ${CARD_FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,.66)';
    ctx.fillText('estakhrjo.ir', CARD_W / 2, CARD_H - 23);
    return true;
  }

  /* The logo drawn as paths, used when the .webp cannot be fetched (offline,
     a blocked request, a canvas that must stay untainted). Same silhouette as
     assets/estakhrjo-mark.webp: a location pin with a swimmer's wave. */
  function drawMark(ctx, cx, cy, r) {
    const s = r / 12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-12, -12.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D('M12 2.6a7.2 7.2 0 0 0-7.2 7.2c0 5.4 7.2 13.4 7.2 13.4s7.2-8 7.2-13.4A7.2 7.2 0 0 0 12 2.6z'));
    ctx.strokeStyle = ctx.fillStyle = '#0b7fa8';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6.4, 11.4);
    ctx.bezierCurveTo(8.2, 9.9, 9.6, 12.3, 11.6, 11.2);
    ctx.bezierCurveTo(13.5, 10.1, 15.2, 12.4, 17.4, 10.9);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(14.6, 7.6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6.9, 8.6);
    ctx.bezierCurveTo(9.1, 7.2, 10.8, 8.4, 12.7, 8.4);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function trimTo(ctx, text, max) {
    let t = String(text || '');
    if (ctx.measureText(t).width <= max) return t;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
  }

  function cardOptions(username) {
    const account = model.account || {};
    return {
      url: profileUrl(username),
      username,
      name: authored.headline || account.name || '',
      // our mark, always — the card is an Estakhrjo nametag
      badge: profileBase() + 'assets/estakhrjo-mark.webp'
    };
  }

  async function renderQrCard(username) {
    const canvas = E('#ppfQrCard', host);
    if (!canvas || !validUsername(String(username || ''))) return;
    try { await drawQrCard(canvas, Object.assign(cardOptions(username), { scale: window.devicePixelRatio > 1 ? 2 : 1 })); }
    catch (err) { console.warn('QR card failed', err); }
  }

  const shareText = username =>
    `صفحهٔ من در استخر جو را ببینید — ${authored.headline || (model.account || {}).name || ''}\n${profileUrl(username)}`;

  function currentUsername() {
    return (read('ppfUsername') || (model.profile || {}).username || '').toLowerCase().replace(/^@/, '');
  }

  async function cardBlob(username) {
    const off = document.createElement('canvas');
    await drawQrCard(off, Object.assign(cardOptions(username), { scale: 3 }));
    return new Promise(resolve => off.toBlob(resolve, 'image/png'));
  }

  async function sharePage() {
    const u = currentUsername();
    if (!validUsername(u)) return notify('ابتدا نام لینک معتبر وارد کنید');
    const url = profileUrl(u), text = shareText(u);
    // Share the card itself where the browser allows it; the link alone otherwise.
    try {
      const blob = await cardBlob(u);
      const file = blob ? new File([blob], `estakhrjo-${u}.png`, { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'صفحهٔ عمومی من', text, url });
        return;
      }
    } catch (_) { /* fall through to the plain share */ }
    if (navigator.share) { try { await navigator.share({ title: 'صفحهٔ عمومی من', text, url }); return; } catch (_) { return; } }
    try { await navigator.clipboard.writeText(text); notify('متن معرفی و لینک کپی شد'); } catch (_) { notify('اشتراک‌گذاری پشتیبانی نمی‌شود'); }
  }

  async function copyUrl() {
    const u = currentUsername();
    if (!validUsername(u)) return notify('ابتدا نام لینک معتبر وارد کنید');
    try { await navigator.clipboard.writeText(profileUrl(u)); notify('لینک کپی شد'); } catch (_) { notify('کپی ممکن نشد'); }
  }

  async function downloadQr(kind) {
    const u = currentUsername();
    if (!validUsername(u) || !window.QRCode) return;
    const a = document.createElement('a');
    if (kind === 'svg') {
      const svg = await window.QRCode.toString(profileUrl(u), { type: 'svg', margin: 1, errorCorrectionLevel: 'H' });
      a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      a.download = `estakhrjo-${u}-qr.svg`;
    } else {
      const blob = await cardBlob(u);
      if (!blob) return notify('ساخت تصویر ممکن نشد');
      a.href = URL.createObjectURL(blob);
      a.download = `estakhrjo-${u}-card.png`;
    }
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  }

  async function loadAnalytics() {
    const box = E('#ppfMetrics', host); if (!box) return;
    try {
      const o = await window.SH_CLOUD_AUTH.getPublicProfileAnalytics((E('#ppfRange', host) || {}).value || 'week');
      const m = o.metrics || {};
      const clicks = ['contact', 'whatsapp', 'telegram', 'map', 'booking', 'products', 'class_booking', 'private_session'].reduce((n, k) => n + Number(m[k] || 0), 0);
      box.innerHTML = `<span>${num(m.view)}<small>بازدید</small></span><span>${num(m.unique_visitors)}<small>بازدیدکننده</small></span><span>${num(clicks)}<small>کلیک هدفمند</small></span>`;
    } catch (_) { /* a brand-new page simply has no events yet */ }
  }

  /* ---------------------------------------------------------------- mount */
  function renderEditor() { host.innerHTML = editorHtml(); bind(); }

  async function reload() {
    model = await window.SH_CLOUD_AUTH.getPublicProfileOwn();
    owned = model.owned || {};
    account = model.account || account || {};
    const p = model.profile || {};
    const cached = loadCache();
    const serverAuthored = (p.pending_authored && Object.keys(p.pending_authored).length) ? p.pending_authored : p.authored_content;
    authored = Object.assign(emptyAuthored(), serverAuthored || (cached && cached.authored) || {});
    authored.offer = Object.assign({ title: '', text: '', code: '' }, authored.offer || {});
    authored.contact = Object.assign({ whatsapp: '', address: '', map_url: '' }, authored.contact || {});
    authored.social = Object.assign({}, authored.social || {});
    authored.cover_position = Object.assign({ x: 50, y: 50 }, authored.cover_position || {});
    authored.gallery = arr(authored.gallery); authored.links = arr(authored.links); authored.videos = arr(authored.videos);
    display = p.display_prefs || { template: 'estakhrjo-3', sections: [], fields: {}, items: {} };
    display.template = ['estakhrjo-1','estakhrjo-2','estakhrjo-3','estakhrjo-4'].includes(display.template) ? display.template : 'estakhrjo-3';
    display.sections = arr(display.sections); display.fields = display.fields || {}; display.items = display.items || {};
    renderEditor();
  }

  async function mount(el, user) {
    host = el; account = user || {};
    if (!window.SH_CLOUD_AUTH || !window.SH_CLOUD_AUTH.active) {
      host.innerHTML = '<section class="panel ppf-offline"><h3>اتصال حساب ابری لازم است</h3><p>برای ذخیرهٔ امن پیش‌نویس و گردش بررسی محتوا، ابتدا با حساب ابری وارد شوید.</p></section>';
      return;
    }
    host.innerHTML = '<section class="panel ppf-loading">در حال آماده‌سازی صفحهٔ عمومی…</section>';
    try { await reload(); }
    catch (e) { host.innerHTML = `<section class="panel ppf-offline"><h3>صفحهٔ عمومی در دسترس نیست</h3><p>${esc(e.message)}</p></section>`; }
  }

  /* ============================== admin console ========================== */
  const shorten = v => { const s = String(v == null ? '' : v); return s.length > 400 ? s.slice(0, 400) + '…' : s; };
  function diffRow(label, before, after) {
    const a = shorten(before), b = shorten(after);
    if (!a && !b) return '';
    const changed = a !== b;
    return `<article class="ppf-review-diff${changed ? ' changed' : ''}">
      <b>${esc(label)}${changed ? ' <em>تغییر کرده</em>' : ''}</b>
      <div><small>نسخهٔ عمومی فعلی</small><p>${esc(a || '—')}</p></div>
      <div><small>نسخهٔ پیشنهادی</small><p>${esc(b || '—')}</p></div>
    </article>`;
  }
  function diffList(label, before, after) {
    const a = arr(before).map(x => x && (x.url || x.label || x)).join(' ، ');
    const b = arr(after).map(x => x && (x.url || x.label || x)).join(' ، ');
    return (a || b) ? diffRow(label, shorten(a), shorten(b)) : '';
  }
  function authoredDiff(cur, neu) {
    return diffRow('عنوان صفحه', cur.headline, neu.headline)
      + diffRow('شعار', cur.tagline, neu.tagline)
      + diffRow('متن معرفی', cur.story, neu.story)
      + diffRow('عنوان پیشنهاد', (cur.offer || {}).title, (neu.offer || {}).title)
      + diffRow('متن پیشنهاد', (cur.offer || {}).text, (neu.offer || {}).text)
      + diffRow('کد تخفیف', (cur.offer || {}).code, (neu.offer || {}).code)
      + diffRow('نشانی جایگزین', (cur.contact || {}).address, (neu.contact || {}).address)
      + diffRow('واتس‌اپ', (cur.contact || {}).whatsapp, (neu.contact || {}).whatsapp)
      + diffRow('لینک نقشه', (cur.contact || {}).map_url, (neu.contact || {}).map_url)
      + diffRow('شبکه‌های اجتماعی', Object.values(cur.social || {}).join(' ، '), Object.values(neu.social || {}).join(' ، '))
      + diffList('پیوندها', cur.links, neu.links)
      + diffList('گالری', cur.gallery, neu.gallery)
      + diffList('ویدیو', cur.videos, neu.videos);
  }

  async function mountAdmin(el) {
    el.innerHTML = '<section class="panel ppf-loading">در حال دریافت صف بررسی…</section>';
    try {
      const out = await window.SH_CLOUD_AUTH.getPublicProfileReviewList();
      const items = out.items || [], published = out.published || [];
      const card = (x, mode) => {
        const person = x.profiles || {};
        const cur = x.authored_content || {}, neu = x.pending_authored || {};
        const prefs = x.display_prefs || {};
        const onSections = arr(prefs.sections).filter(s => s.on !== false).map(s => SECTION_LABEL[s.key] || s.key);
        const hiddenFields = Object.keys(prefs.fields || {}).filter(k => prefs.fields[k] === false).map(k => FIELD_LABEL[k] || k);
        return `<article class="ppf-review-card${mode === 'published' ? ' ppf-published-card' : ''}">
          <header>
            <span>${mediaPreview(person.avatar, '◈')}</span>
            <div><b>${esc(cur.headline || neu.headline || person.full_name || 'عضو')}</b>
              <small>${esc(roleLabel(({ pool: 'pool', coach: 'coach', store: 'supplier', supplier: 'supplier' })[person.role] || person.role))} · @${esc(x.requested_username || x.username || '')}${x.content_version ? ` · نسخهٔ ${num(x.content_version)}` : ''}</small></div>
            <time>${x.submitted_at ? new Date(x.submitted_at).toLocaleString('fa-IR') : '—'}</time>
          </header>
          ${mode === 'queue' ? `<div class="ppf-review-media">${mediaPreview(cur.cover || cur.avatar, 'نسخهٔ فعلی')}<span>←</span>${mediaPreview(neu.cover || neu.avatar, 'نسخهٔ جدید')}</div>` : ''}
          ${arr(neu.gallery).length ? `<div class="ppf-review-gallery">${arr(neu.gallery).map(g => `<figure>${mediaPreview(g.url, '🖼️')}<figcaption>${esc(g.alt || 'رسانهٔ پیشنهادی')}</figcaption></figure>`).join('')}</div>` : ''}
          ${mode === 'queue' ? authoredDiff(cur, neu) : `<p class="ppf-published-copy">${esc(cur.tagline || cur.story || '—')}</p>`}
          <details class="ppf-prefs"><summary>تنظیمات نمایش (نیازمند تأیید نیست — فقط مشاهده)</summary>
            <p><b>بخش‌های روشن:</b> ${esc(onSections.join(' · ') || '—')}</p>
            <p><b>فیلدهای پنهان‌شده:</b> ${esc(hiddenFields.join(' · ') || 'هیچ')}</p>
            <p class="ppf-hint">این کلیدها فقط رکوردهای منتشرشدهٔ خودِ عضو را نشان یا پنهان می‌کنند و محتوای تازه‌ای نمی‌سازند، بنابراین از صف بررسی عبور نمی‌کنند.</p>
          </details>
          <footer>
            ${mode === 'queue'
              ? `<button class="btn btn-ghost" data-review="reject" data-id="${esc(x.profile_id)}">رد با دلیل</button>
                 <button class="btn btn-danger" data-state="disabled" data-id="${esc(x.profile_id)}">غیرفعال‌سازی فوری</button>
                 <button class="btn btn-primary" data-review="approve" data-id="${esc(x.profile_id)}">✓ تأیید و انتشار</button>`
              : `<button class="btn btn-ghost" data-state="unpublished" data-id="${esc(x.profile_id)}">لغو انتشار</button>
                 <button class="btn btn-danger" data-state="disabled" data-id="${esc(x.profile_id)}">غیرفعال‌سازی</button>
                 <button class="btn btn-ghost" data-state="remove" data-id="${esc(x.profile_id)}">حذف محتوا</button>
                 ${x.removed_at ? `<button class="btn btn-primary" data-state="restore" data-id="${esc(x.profile_id)}">بازگردانی از پشتیبان</button>` : ''}`}
          </footer>
        </article>`;
      };

      el.innerHTML = `<section class="ppf-admin">
        <div class="admin-view-head">
          <div><span>گردش تأیید سرورمحور</span><h3>بررسی محتوای صفحات عمومی</h3>
          <p>فقط متن‌ها و رسانه‌های نوشتهٔ عضو این‌جا بررسی می‌شوند. داده‌های سیستمی (سانس، دوره، محصول) در همان جای اصلی خود تأیید می‌شوند و این صفحه فقط آن‌ها را می‌خواند.</p></div>
          <span class="ppf-status pending">${num(items.length)} در صف</span>
        </div>
        ${items.length ? `<div class="ppf-review-list">${items.map(x => card(x, 'queue')).join('')}</div>`
          : '<div class="empty" style="padding:35px"><span class="e-ic">✓</span>صف بررسی صفحات عمومی خالی است.</div>'}
        ${published.length ? `<section class="ppf-published-list">
          <div class="ppf-published-head"><b>صفحات عمومی منتشرشده</b><small>حذف محتوا یک نسخهٔ پشتیبان نگه می‌دارد و قابل بازگردانی است.</small></div>
          ${published.map(x => card(x, 'published')).join('')}</section>` : ''}
      </section>`;

      EA('[data-review]', el).forEach(b => b.addEventListener('click', async () => {
        const d = b.getAttribute('data-review');
        const reason = d === 'reject' ? prompt('دلیل رد برای عضو (ضروری):', '') : '';
        if (d === 'reject' && !reason) return;
        try {
          await window.SH_CLOUD_AUTH.reviewPublicProfile(b.getAttribute('data-id'), d, reason);
          notify(d === 'approve' ? 'محتوا تأیید و منتشر شد' : 'دلیل رد برای عضو ثبت شد');
          mountAdmin(el);
        } catch (e) { notify('⚠️ ' + e.message); }
      }));
      EA('[data-state]', el).forEach(b => b.addEventListener('click', async () => {
        const s = b.getAttribute('data-state');
        const ask = { disabled: 'صفحه فوراً غیرفعال شود؟', unpublished: 'انتشار صفحه لغو شود؟', remove: 'محتوای عمومی حذف شود؟ یک نسخهٔ پشتیبان برای بازگردانی نگه داشته می‌شود.', restore: 'صفحه از نسخهٔ پشتیبان بازگردانی شود؟' }[s];
        if (ask && !confirm(ask)) return;
        try { await window.SH_CLOUD_AUTH.setPublicProfileAdminState(b.getAttribute('data-id'), s); notify('انجام شد'); mountAdmin(el); }
        catch (e) { notify('⚠️ ' + e.message); }
      }));
    } catch (e) {
      el.innerHTML = `<section class="panel ppf-offline"><h3>صف بررسی در دسترس نیست</h3><p>${esc(e.message)}</p></section>`;
    }
  }

  window.SH_PUBLIC_PROFILE_PANEL = { mount, mountAdmin };
})();
