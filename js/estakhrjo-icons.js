/* Estakhrjo Icon System v1 — first-party, accessible SVG icons. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const SPRITE_ID = 'estakhrjo-icon-sprite';
  const THEME_KEY = 'estakhrjo-icon-theme';
  const THEMES = Object.freeze({
    'tide-line': Object.freeze({ label: 'Tide Line', fa: 'خطی اقیانوسی', description: 'خطوط نرم، سبک و شفاف برای تجربهٔ روزمرهٔ سایت.' }),
    'lagoon-duotone': Object.freeze({ label: 'Lagoon Duotone', fa: 'دوتون لاگون', description: 'قاب‌های شیشه‌ای و دو رنگ برای مسیرهای تجاری و عملیاتی.' }),
    'nocturne-crest': Object.freeze({ label: 'Nocturne Crest', fa: 'نشان شبانه', description: 'نشان‌های تیره و لوکس با کنتراست بالا برای پنل حرفه‌ای.' }),
  });
  const ICONS = {
    home: '<path d="M3 10.8 12 3l9 7.8v9.1a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.9v-9.1Z"/><path d="M9.1 21.7v-6.1h5.8v6.1"/>',
    pool: '<circle cx="15.6" cy="6.2" r="2.2"/><path d="M4 12.5c2.3-3.2 4.9-4.1 7-1.7l2 2.2 3.4-1.5M2.8 17.1c2.3 1.8 4.7 1.8 7 0s4.7-1.8 7 0 4.7 1.8 7 0M2.8 20.6c2.3 1.8 4.7 1.8 7 0s4.7-1.8 7 0 4.7 1.8 7 0"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.4 21c.6-4 3.3-6.1 7.6-6.1s7 2.1 7.6 6.1"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.3" r="2.4"/><path d="M3.6 20.5c.6-3.8 2.4-5.7 5.4-5.7s4.9 1.9 5.5 5.7M15 15.2c3.2-.3 5 1.5 5.5 4.8"/>',
    accessibility: '<circle cx="12" cy="4.8" r="2.2"/><path d="M4.2 9.2h15.6M12 7v13M8.2 21l3.8-5 3.8 5"/>',
    coach: '<circle cx="12" cy="5.8" r="2.6"/><path d="M12 8.5v7.1M6.3 11.2 12 13l5.7-1.8M8.5 21l1.5-5.4M15.5 21 14 15.6"/><path d="M4 4.4h4M16 4.4h4"/>',
    award: '<path d="M8 3.5h8v5.7a4 4 0 0 1-8 0V3.5Z"/><path d="M8 5.4H4.7v1.3c0 2 1.5 3.6 3.5 3.6M16 5.4h3.3v1.3c0 2-1.5 3.6-3.5 3.6M12 13.2v4.1M8.8 20.5h6.4M10.1 17.3h3.8"/>',
    course: '<path d="M3.4 5.2A3.3 3.3 0 0 1 7 4.4h4.8v15.2H7a3.3 3.3 0 0 0-3.6.8V5.2ZM20.6 5.2a3.3 3.3 0 0 0-3.6-.8h-4.8v15.2H17a3.3 3.3 0 0 1 3.6.8V5.2Z"/><path d="m9.1 9.4 2.8 1.6 2.9-1.6"/>',
    cart: '<path d="M3 4.2h2l2.1 10.1h10.7l2.1-7.3H6.2"/><circle cx="9" cy="19.3" r="1.4"/><circle cx="17" cy="19.3" r="1.4"/>',
    market: '<path d="M4 9.2h16v11.1H4z"/><path d="M3 9.2 4.8 4h14.4L21 9.2M3 9.2c.5 2 3.4 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 3.4 2 4 0"/><path d="M9.2 20.3v-6h5.6v6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 4.7 4.7"/>',
    location: '<path d="M12 21s6.8-6.2 6.8-11.4a6.8 6.8 0 1 0-13.6 0C5.2 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/>',
    bell: '<path d="M18.2 9.8c0-3.8-2.2-6.3-6.2-6.3s-6.2 2.5-6.2 6.3c0 6-2.4 6.5-2.4 7.8h17.2c0-1.3-2.4-1.8-2.4-7.8Z"/><path d="M9.4 20.2c.7 1.1 1.5 1.5 2.6 1.5s1.9-.4 2.6-1.5"/>',
    message: '<path d="M4 5.2A2.2 2.2 0 0 1 6.2 3h11.6A2.2 2.2 0 0 1 20 5.2v8.2a2.2 2.2 0 0 1-2.2 2.2H10l-4.6 4v-4H6.2A2.2 2.2 0 0 1 4 13.4V5.2Z"/><path d="M8 9.3h8M8 12.4h5"/>',
    calendar: '<rect x="3.8" y="5.2" width="16.4" height="15" rx="2"/><path d="M7.2 3v4.3M16.8 3v4.3M3.8 10h16.4M8 14h.1M12 14h.1M16 14h.1M8 17.4h.1M12 17.4h.1"/>',
    ticket: '<path d="M4.1 7.2A2.2 2.2 0 0 0 6.3 9.4 2.2 2.2 0 0 0 4.1 11.6v5.2h15.8v-5.2a2.2 2.2 0 0 0 0-4.4V4.8H4.1v2.4Z"/><path d="M10 5.1v11.4"/>',
    shield: '<path d="M12 2.8 20 6v5.6c0 5-3.3 8.5-8 9.7-4.7-1.2-8-4.7-8-9.7V6l8-3.2Z"/><path d="m8.6 12.1 2.1 2.1 4.8-4.9"/>',
    lock: '<rect x="4.5" y="10.1" width="15" height="10.3" rx="2"/><path d="M8 10.1V7.4a4 4 0 0 1 8 0v2.7M12 14.4v2.2"/>',
    key: '<circle cx="8.1" cy="15.9" r="3.4"/><path d="m10.6 13.5 8-8M15.4 8.6l2.1 2.1M17.5 6.5l2.1 2.1"/>',
    admin: '<path d="m3.2 7.4 3.2 2.2 2.1-4 3.5 3.1L15.5 3l2.1 6.6 3.2-2.2-1.5 9.4H4.7L3.2 7.4Z"/><path d="M5.1 20.2h13.8M8.3 13.2h7.4"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="m19.4 13.6 1.2 1.1-2.1 3.6-1.6-.5a7.6 7.6 0 0 1-1.8 1l-.4 1.7h-4.2l-.4-1.7a7.6 7.6 0 0 1-1.8-1l-1.6.5-2.1-3.6 1.2-1.1a7.8 7.8 0 0 1 0-2.1l-1.2-1.1 2.1-3.6 1.6.5a7.6 7.6 0 0 1 1.8-1l.4-1.7h4.2l.4 1.7a7.6 7.6 0 0 1 1.8 1l1.6-.5 2.1 3.6-1.2 1.1a7.8 7.8 0 0 1 0 2.1Z"/>',
    camera: '<path d="M4 8.1h3l1.4-2h7.2l1.4 2h3v11.1H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
    gallery: '<rect x="3.3" y="4" width="17.4" height="16" rx="2"/><circle cx="8.2" cy="9" r="1.4"/><path d="m4.5 18 4.6-4.7 3.4 3 2.1-2.1 4.2 3.8"/>',
    video: '<rect x="3.3" y="5.7" width="12.8" height="12.6" rx="2"/><path d="m16.1 10 4.6-2.5v9l-4.6-2.5"/>',
    image: '<rect x="3.5" y="4.2" width="17" height="15.6" rx="2"/><circle cx="8.5" cy="9" r="1.4"/><path d="m4.7 17.6 5.2-5.1 3.4 3.1 2-2 4 4"/>',
    edit: '<path d="m4 17.5-.6 3.1 3.1-.6L18.7 7.8 16.2 5.3 4 17.5Z"/><path d="m14.8 6.7 2.5 2.5M3.7 21h16.6"/>',
    trash: '<path d="M4.5 7.2h15M9.2 3.7h5.6l.8 3.5H8.4l.8-3.5ZM6.5 7.2l.8 13.1h9.4l.8-13.1M10 10.5v6.3M14 10.5v6.3"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    check: '<path d="m4.5 12.2 4.6 4.6 10.4-10.5"/>',
    heart: '<path d="M20.2 8.4c0 6-8.2 11.3-8.2 11.3S3.8 14.4 3.8 8.4a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    wallet: '<path d="M4.2 6.1h14.3a1.8 1.8 0 0 1 1.8 1.8v10.2a1.8 1.8 0 0 1-1.8 1.8H5.5a2.3 2.3 0 0 1-2.3-2.3V6.5A2.3 2.3 0 0 1 5.5 4.2h12"/><path d="M15.4 12h4.9v3.2h-4.9a1.6 1.6 0 1 1 0-3.2Z"/>',
    building: '<path d="M4 21V4h11v17M15 9h5v12M7 7h2M11 7h1M7 11h2M11 11h1M7 15h2M11 15h1M17 12h1M17 16h1"/>',
    briefcase: '<rect x="3.4" y="7.3" width="17.2" height="12.1" rx="2"/><path d="M8.5 7.3V5.7A1.7 1.7 0 0 1 10.2 4h3.6a1.7 1.7 0 0 1 1.7 1.7v1.6M3.4 12h17.2M10.5 12v2h3v-2"/>',
    document: '<path d="M6 3.5h8.5l4 4V20.5H6z"/><path d="M14.5 3.5v4h4M9 12h6M9 15.5h6"/>',
    chart: '<path d="M4 20.5V4.2M4 20.5h17"/><path d="m7.2 16.7 4-4 3 2.2 5-6"/><circle cx="7.2" cy="16.7" r=".8"/><circle cx="11.2" cy="12.7" r=".8"/><circle cx="14.2" cy="14.9" r=".8"/><circle cx="19.2" cy="8.9" r=".8"/>',
    filter: '<path d="M3.5 5h17M6.8 12h10.4M10 19h4"/>',
    arrow: '<path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
    map: '<path d="m3.5 5.2 5-2 7 2.5 5-2v15l-5 2-7-2.5-5 2v-15Z"/><path d="M8.5 3.2v14.7M15.5 5.7v14.7"/>',
    clock: '<circle cx="12" cy="12" r="8.7"/><path d="M12 7v5.3l3.8 2.2"/>',
    phone: '<path d="M7.2 3.8 4.8 5.1c-.8.4-1.1 1.4-.7 2.3 2.4 5.8 5.4 8.8 11.2 11.2.9.4 1.9.1 2.3-.7l1.3-2.4-3.7-2.1-1.3 1.3c-2-1.1-3.5-2.6-4.6-4.6l1.3-1.3-2.1-3.7Z"/>',
    alert: '<path d="M12 3.3 21 20H3l9-16.7Z"/><path d="M12 9v4.7M12 16.7h.1"/>',
    info: '<circle cx="12" cy="12" r="8.7"/><path d="M12 10.7v5M12 7.7h.1"/>',
    sauna: '<path d="M5 20.5V9.2M5 9.2h8.2v11.3M16.8 9.2v11.3M3.5 20.5h17M7.2 5.2c.8-1 1.7-1 2.5 0M14.5 5.2c.8-1 1.7-1 2.5 0"/>',
    lifebuoy: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><path d="m5.9 5.9 3.7 3.7m4.8 4.8 3.7 3.7m0-12.2-3.7 3.7m-4.8 4.8-3.7 3.7"/>',
    bolt: '<path d="m13.3 2.8-8 10h5.5l-.3 8.4 8.2-10.4h-5.6l.2-8Z"/>',
    sun: '<circle cx="12" cy="12" r="3.7"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M19.8 15.5A8.7 8.7 0 0 1 8.5 4.2a8.8 8.8 0 1 0 11.3 11.3Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    eye: '<path d="M2.8 12s3.2-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.3"/>',
    tools: '<path d="m14.5 5.3 4.2-2.2 1.7 1.7-2.2 4.2-2.3.4-7.8 7.8-2.8-2.8 7.8-7.8.4-2.3ZM5.1 16.8l2.1 2.1-2.8 2.8-2.1-2.1 2.8-2.8Z"/>',
    box: '<path d="m3.7 7.2 8.3-4 8.3 4v9.6l-8.3 4-8.3-4V7.2Z"/><path d="m3.7 7.2 8.3 4 8.3-4M12 11.2v9.6"/>',
    spark: '<path d="m12 2.8 1.9 7.3 7.3 1.9-7.3 1.9-1.9 7.3-1.9-7.3-7.3-1.9 7.3-1.9L12 2.8Z"/>',
    health: '<path d="M4 21V3h16v18M8 7h8M8 11h8M10 15h4M12 13v4"/>',
  };

  const EMOJI = {
    // Navigation, controls and status.
    '🏊‍♂️': 'pool', '🏊‍♀️': 'pool', '🏊': 'pool', '🤽‍♂️': 'pool', '🤽‍♀️': 'pool', '🤽': 'pool', '🌊': 'pool', '💧': 'pool',
    '🏆': 'award', '🏅': 'award', '🎖️': 'award', '🥇': 'award', '🥈': 'award', '🥉': 'award', '🎓': 'course', '📚': 'course',
    '🎫': 'ticket', '🎟️': 'ticket', '🎟': 'ticket', '🛒': 'cart', '🛍️': 'market', '🛍': 'market', '🏪': 'market',
    '🏠': 'home', '🏡': 'home', '🏢': 'building', '🏭': 'building', '🏬': 'building', '🏟️': 'building', '🏟': 'building', '🏥': 'health', '🏛️': 'building',
    '👤': 'user', '👥': 'users', '👨': 'user', '👩': 'user', '🧑': 'user', '👶': 'user', '👨‍🏫': 'coach', '🧑‍🏫': 'coach', '👨‍💼': 'briefcase', '👩‍💼': 'briefcase', '🧑‍💼': 'briefcase', '👨‍⚕️': 'health', '👩‍⚕️': 'health', '🧑‍🔧': 'tools',
    '👑': 'admin', '🔔': 'bell', '🔕': 'bell', '🔍': 'search', '🔎': 'search', '📍': 'location', '💬': 'message', '📨': 'message', '📩': 'message', '✈️': 'message', '✈': 'message',
    '🛡️': 'shield', '🛡': 'shield', '⚙️': 'settings', '⚙': 'settings', '🔧': 'tools', '🔩': 'tools', '🛠️': 'tools', '🛠': 'tools', '🧰': 'tools',
    '📅': 'calendar', '🗓️': 'calendar', '🗓': 'calendar', '🕐': 'clock', '⏱️': 'clock', '⏱': 'clock', '⏳': 'clock',
    '💼': 'briefcase', '🩺': 'health', '💆': 'health', '🧘': 'health', '🧼': 'health', '🦴': 'health', '🦶': 'health',
    '📷': 'camera', '🖼️': 'gallery', '🖼': 'gallery', '🎥': 'video', '🎬': 'video', '▶️': 'video', '▶': 'video',
    '📦': 'box', '📂': 'box', '🗂️': 'box', '🗂': 'box', '💰': 'wallet', '💳': 'wallet', '💸': 'wallet',
    '❤️': 'heart', '❤': 'heart', '🤍': 'heart', '⭐': 'star', '🌟': 'star', '★': 'star', '☆': 'star',
    '✦': 'spark', '✨': 'spark', '🎉': 'spark', '🎈': 'spark', '🎁': 'spark', '✓': 'check', '✅': 'check',
    '＋': 'plus', '➕': 'plus', '🗑️': 'trash', '🗑': 'trash', '✏️': 'edit', '✏': 'edit', '📝': 'edit', '✍️': 'edit', '✍': 'edit',
    '🗺️': 'map', '🗺': 'map', '🌐': 'map', '📄': 'document', '📋': 'document', '📖': 'document', '📜': 'document', '📎': 'document',
    '📈': 'chart', '📊': 'chart', '⚡': 'bolt', '☀️': 'sun', '☀': 'sun', '🌙': 'moon', '☰': 'menu', '🔐': 'lock', '🔑': 'key', '🔒': 'lock', '🔓': 'lock',
    '👁️': 'eye', '👁': 'eye', '❌': 'close', '🚨': 'alert', '⚠️': 'alert', '⚠': 'alert', '❓': 'info', '❗': 'alert', 'ℹ️': 'info', 'ℹ': 'info', '📞': 'phone',
    // Facilities, sport, retail and legacy category glyphs.
    '🧖': 'sauna', '🛁': 'sauna', '🛏️': 'sauna', '🛏': 'sauna', '🛟': 'lifebuoy', '🔴': 'alert', '🟢': 'check',
    '🏐': 'course', '🏀': 'course', '⚽': 'course', '🎾': 'course', '🏓': 'course', '🥊': 'course', '🚴': 'course', '🏄': 'course', '🎯': 'course', '🎮': 'course', '🎵': 'course', '🎧': 'course', '🎨': 'course',
    '🎒': 'briefcase', '👕': 'market', '🧢': 'market', '🩳': 'market', '🦺': 'market', '🥽': 'market', '💺': 'market',
    '🍏': 'market', '🍎': 'market', '🍐': 'market', '🍊': 'market', '🍋': 'market', '🍉': 'market', '🍇': 'market', '🍓': 'market', '🥝': 'market', '🍒': 'market', '🥥': 'market', '🥑': 'market', '🥗': 'market', '🍔': 'market', '🍟': 'market', '🍕': 'market', '🍣': 'market', '🍱': 'market', '🍪': 'market', '🍰': 'market', '🧁': 'market', '☕': 'market', '🫖': 'market', '🥤': 'market', '🧃': 'market', '🍫': 'market', '🍯': 'market', '🥜': 'market', '🍳': 'market', '🥘': 'market', '🥙': 'market', '🍽️': 'market', '🍽': 'market',
    '🐋': 'pool', '🐙': 'pool', '🐟': 'pool', '🐠': 'pool', '🐢': 'pool', '🐬': 'pool', '🐳': 'pool', '🦀': 'pool', '🦈': 'pool', '🦦': 'pool', '🦭': 'pool', '🪼': 'pool',
    '🏔️': 'map', '🏔': 'map', '🏖️': 'pool', '🏖': 'pool', '🏝️': 'pool', '🏝': 'pool', '🌪️': 'alert', '🌪': 'alert', '🌬️': 'pool', '🌬': 'pool', '❄️': 'moon', '❄': 'moon', '🌈': 'spark', '🌱': 'spark', '🌳': 'spark', '🌴': 'spark', '🌸': 'spark', '🌹': 'heart', '🌿': 'spark', '🍀': 'spark',
    // Light-weight replacements for old reaction/presence tokens. Chat text and icon picker are opted out below.
    '😀': 'spark', '😃': 'spark', '😄': 'spark', '😁': 'spark', '😆': 'spark', '🥹': 'heart', '😂': 'spark', '🙂': 'spark', '🙃': 'spark', '😉': 'spark', '😊': 'spark', '😇': 'spark', '🥰': 'heart', '😍': 'heart', '🤩': 'star', '😘': 'heart', '😎': 'spark', '🤗': 'heart', '🤔': 'info', '🫡': 'check', '😐': 'info', '😴': 'moon', '😭': 'alert', '😡': 'alert', '🤯': 'alert', '🥳': 'spark', '👍': 'check', '👎': 'close', '👏': 'award', '🙏': 'heart',
    '👋': 'user', '🤝': 'users', '👌': 'check', '✌️': 'check', '✌': 'check', '🤞': 'check', '🤟': 'check', '🤘': 'bolt', '🤙': 'phone', '👈': 'arrow', '👉': 'arrow', '👆': 'arrow', '👇': 'arrow', '☝️': 'arrow', '☝': 'arrow', '✋': 'user', '🤚': 'user', '🖐️': 'user', '🖐': 'user', '🫶': 'heart', '💪': 'bolt', '👊': 'bolt', '🤛': 'bolt', '🤜': 'bolt', '💡': 'spark', '💯': 'check', '💻': 'course', '📱': 'phone', '📡': 'bell', '📢': 'bell', '📤': 'message', '🔁': 'settings', '♻️': 'settings', '♻': 'settings', '⚗️': 'health', '⚗': 'health', '⚪': 'info', '🖨️': 'document', '🖨': 'document', '🧩': 'spark', '🧪': 'health', '🧭': 'map', '🤖': 'settings', '⌚': 'clock', '⏰': 'clock', '↩️': 'arrow', '↩': 'arrow', '↪️': 'arrow', '↪': 'arrow', '↗️': 'arrow', '↗': 'arrow', '↔️': 'arrow', '↔': 'arrow', '↕️': 'arrow', '↕': 'arrow', '➡️': 'arrow', '➡': 'arrow', '⬇️': 'arrow', '⬇': 'arrow', '◻️': 'box', '◻': 'box', '♿': 'accessibility', '🌡️': 'health', '🌡': 'health', '🎋': 'spark', '🏁': 'award', '🏷️': 'document', '🏷': 'document', '📰': 'document', '🔥': 'bolt', '🔭': 'search', '🕌': 'building', '😕': 'info', '🚀': 'bolt', '🚗': 'map', '🚚': 'map', '🚫': 'close',
  };

  const emojiTokens = Object.keys(EMOJI).sort((a, b) => b.length - a.length);
  const emojiRegex = new RegExp(`(${emojiTokens.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const excluded = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'PRE', 'CODE', 'KBD', 'SVG']);

  function ensureSprite() {
    if (document.getElementById(SPRITE_ID)) return;
    const sprite = document.createElementNS(NS, 'svg'); sprite.id = SPRITE_ID; sprite.setAttribute('aria-hidden', 'true'); sprite.setAttribute('focusable', 'false'); sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    sprite.innerHTML = `<defs><linearGradient id="ej-icon-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#25d7e9"/><stop offset=".52" stop-color="#169ddd"/><stop offset="1" stop-color="#164a9b"/></linearGradient></defs>${Object.entries(ICONS).map(([name, markup]) => `<symbol id="ej-i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${markup}</symbol>`).join('')}`;
    (document.body || document.documentElement).prepend(sprite);
  }

  function ensureStyles() {
    if (document.getElementById('estakhrjo-icon-styles')) return;
    const style = document.createElement('style'); style.id = 'estakhrjo-icon-styles';
    style.textContent = `
      .ej-icon{--ej-icon-color:#3fd5e8;--ej-stroke:1.8;display:inline-flex;inline-size:1.13em;block-size:1.13em;align-items:center;justify-content:center;vertical-align:-.17em;margin-inline:.08em;color:var(--ej-icon-color);filter:drop-shadow(0 2px 4px rgba(14,165,233,.18));line-height:1;flex:0 0 auto;transition:color .22s ease,background .22s ease,border-radius .22s ease,box-shadow .22s ease}
      .ej-icon svg{inline-size:100%;block-size:100%;overflow:visible;fill:none;stroke:currentColor;stroke-width:var(--ej-stroke);stroke-linecap:round;stroke-linejoin:round}
      .ej-icon--pool,.ej-icon--home,.ej-icon--search,.ej-icon--location{--ej-icon-color:#29cfe7}.ej-icon--admin,.ej-icon--award,.ej-icon--wallet{--ej-icon-color:#f4c96c}.ej-icon--shield,.ej-icon--check{--ej-icon-color:#43d9a0}.ej-icon--alert,.ej-icon--heart{--ej-icon-color:#fb7185}.ej-icon--settings,.ej-icon--tools,.ej-icon--document{--ej-icon-color:#95b9d6}
      html[data-estakhrjo-icon-theme="tide-line"] .ej-icon{--ej-stroke:1.8;filter:drop-shadow(0 2px 4px rgba(14,165,233,.18))}
      html[data-estakhrjo-icon-theme="lagoon-duotone"] .ej-icon,[data-estakhrjo-icon-theme="lagoon-duotone"] .ej-icon{--ej-stroke:1.65;inline-size:1.36em;block-size:1.36em;padding:.14em;border:1px solid color-mix(in srgb,currentColor 30%,transparent);border-radius:.46em;background:linear-gradient(145deg,color-mix(in srgb,currentColor 20%,transparent),rgba(13,57,94,.34));box-shadow:inset 0 1px rgba(255,255,255,.16),0 5px 13px rgba(6,31,62,.16);filter:none}
      html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon,[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon{--ej-stroke:2.15;inline-size:1.34em;block-size:1.34em;padding:.16em;border:1px solid color-mix(in srgb,currentColor 42%,#0b1932);border-radius:.38em;background:linear-gradient(145deg,#112b4a,#071427);box-shadow:0 5px 12px rgba(1,12,29,.38),inset 0 1px rgba(255,255,255,.08);filter:none}
      html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--pool,html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--home,html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--search,html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--location{--ej-icon-color:#6fe8f4}html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--admin,html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--award,html[data-estakhrjo-icon-theme="nocturne-crest"] .ej-icon--wallet{--ej-icon-color:#ffd782}
      .ej-icon-btn{inline-size:2.55rem;block-size:2.55rem;border-radius:.85rem;padding:.58rem;background:linear-gradient(145deg,rgba(28,194,223,.15),rgba(20,78,153,.22));border:1px solid rgba(66,209,233,.28)}.ej-icon-btn .ej-icon{font-size:1.25rem;margin:0}.ej-icon-card{inline-size:2.9rem;block-size:2.9rem;border-radius:1rem;padding:.65rem;background:linear-gradient(145deg,rgba(47,218,235,.18),rgba(13,62,125,.28));border:1px solid rgba(80,219,239,.24)}.ej-icon-card .ej-icon{font-size:1.55rem;margin:0}
      @media(prefers-reduced-motion:reduce){.ej-icon{transition:none}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function normalize(name) { return ICONS[name] ? name : 'spark'; }
  function normalizeTheme(theme) { return Object.prototype.hasOwnProperty.call(THEMES, theme) ? theme : 'tide-line'; }
  function getTheme() { return normalizeTheme(document.documentElement?.dataset.estakhrjoIconTheme || ''); }
  function setTheme(theme, persist) {
    const value = normalizeTheme(String(theme || ''));
    if (document.documentElement) document.documentElement.dataset.estakhrjoIconTheme = value;
    if (persist) try { localStorage.setItem(THEME_KEY, value); } catch (_) {}
    try { document.dispatchEvent(new CustomEvent('estakhrjo-icon-theme-change', { detail: { theme: value } })); } catch (_) {}
    return value;
  }
  function restoreTheme() {
    let stored = ''; try { stored = localStorage.getItem(THEME_KEY) || ''; } catch (_) {}
    return setTheme(document.documentElement?.dataset.estakhrjoIconTheme || stored || 'tide-line', false);
  }
  function create(name, label) {
    ensureSprite(); ensureStyles();
    const icon = document.createElement('span'); const key = normalize(String(name || ''));
    icon.className = `ej-icon ej-icon--${key}`; icon.dataset.ejIcon = key;
    if (label) { icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', String(label)); } else icon.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(NS, 'use'); use.setAttribute('href', `#ej-i-${key}`); svg.appendChild(use); icon.appendChild(svg);
    return icon;
  }
  function render(name, label, extraClass) { const icon = create(name, label); if (extraClass) icon.classList.add(...String(extraClass).split(/\s+/).filter(Boolean)); return icon.outerHTML; }

  function shouldSkip(parent) {
    if (!parent || parent.nodeType !== 1) return true;
    return excluded.has(parent.tagName) || parent.closest?.('.ej-icon,[data-ej-preserve-emoji],.msg-txt,.profile-avatar,.dash-avatar,.chat-avatar,.cp-av,.coach-avatar') || parent.isContentEditable;
  }
  function replaceText(node) {
    const value = node.nodeValue || ''; if (!value || !emojiRegex.test(value)) { emojiRegex.lastIndex = 0; return; }
    emojiRegex.lastIndex = 0; const fragment = document.createDocumentFragment(); let last = 0;
    value.replace(emojiRegex, (match, _group, offset) => {
      if (offset > last) fragment.appendChild(document.createTextNode(value.slice(last, offset)));
      fragment.appendChild(create(EMOJI[match] || 'spark')); last = offset + match.length; return match;
    });
    if (last < value.length) fragment.appendChild(document.createTextNode(value.slice(last)));
    node.parentNode?.replaceChild(fragment, node); emojiRegex.lastIndex = 0;
  }
  function cleanNativeControls(root) {
    const selector = 'input[placeholder],textarea[placeholder],option'; const controls = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) controls.push(root);
    root.querySelectorAll?.(selector).forEach(control => controls.push(control));
    controls.forEach(control => {
      if (control.closest?.('[data-ej-preserve-emoji]')) return;
      if ('placeholder' in control && control.hasAttribute('placeholder')) {
        const value = control.getAttribute('placeholder') || ''; emojiRegex.lastIndex = 0;
        if (emojiRegex.test(value)) { emojiRegex.lastIndex = 0; control.setAttribute('placeholder', value.replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trimStart()); emojiRegex.lastIndex = 0; }
      }
      if (control.tagName === 'OPTION') {
        const value = control.textContent || ''; emojiRegex.lastIndex = 0;
        if (emojiRegex.test(value)) { emojiRegex.lastIndex = 0; control.textContent = value.replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trimStart(); emojiRegex.lastIndex = 0; }
      }
    });
  }
  function scan(root) {
    ensureSprite(); ensureStyles();
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { if (!shouldSkip(root.parentElement)) replaceText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && (shouldSkip(root) || root.matches?.('.ej-icon'))) return;
    cleanNativeControls(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(node) { return shouldSkip(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(replaceText);
  }
  function observe() {
    if (!document.body || document.body.dataset.ejIconObserver) return;
    document.body.dataset.ejIconObserver = 'true';
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => scan(node)))).observe(document.body, { childList: true, subtree: true });
  }
  function mount() { ensureSprite(); ensureStyles(); restoreTheme(); scan(document.body); observe(); }

  window.ESTAKHRJO_ICONS = Object.freeze({ version: 2, names: Object.freeze(Object.keys(ICONS)), themes: THEMES, create, render, scan, mount, getTheme, setTheme, emoji: Object.freeze({ ...EMOJI }) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
