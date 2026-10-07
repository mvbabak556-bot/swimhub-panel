/* Estakhrjo Cloud Account + Panel State Adapter
   Uses the server-side Supabase Edge Function `member-auth` when it is deployed.
   Until then, the existing offline/local fallback in app.js remains available. */
(function () {
  'use strict';
  const SESSION_KEY = 'sh_cloud_auth_session';
  const ACCOUNTS_KEY = 'sh_cloud_auth_accounts';
  const OMIT = new Set(['sh_user', 'sh_auth_accounts_v1', SESSION_KEY, ACCOUNTS_KEY]);
  let session = null, active = false, available = null, applying = false, writeTimer = 0, accountCache = [];
  const nativeSet = localStorage.setItem.bind(localStorage);
  const nativeRemove = localStorage.removeItem.bind(localStorage);
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, value) => localStorage.setItem(k, JSON.stringify(value));
  const endpoint = () => window.SUPABASE_URL ? String(window.SUPABASE_URL).replace(/\/$/, '') + '/functions/v1/member-auth' : '';
  const apiKey = () => window.SUPABASE_ANON_KEY || '';
  const result = async response => {
    let body = {}; try { body = await response.json(); } catch (e) {}
    if (!response.ok || !body.ok) throw new Error(body.error || 'ارتباط با سرویس ابری ناموفق بود');
    return body;
  };
  const cloudRequest = async (action, payload, withSession = true) => {
    if (!endpoint() || !apiKey()) throw new Error('تنظیمات Supabase در دسترس نیست');
    const headers = { 'Content-Type': 'application/json', apikey: apiKey() };
    if (withSession && session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    return result(await fetch(endpoint(), { method: 'POST', headers, body: JSON.stringify({ action, ...(payload || {}) }) }));
  };
  const cloudAvailable = async () => {
    if (available !== null) return available;
    try { const status = await cloudRequest('status', {}, false); available = status.ready === true; } catch (e) { available = false; }
    return available;
  };
  const saveSession = value => { session = value || null; if (session) write(SESSION_KEY, session); else localStorage.removeItem(SESSION_KEY); };
  // Credentials are displayed to an authenticated administrator only from this
  // in-memory cache. They are deliberately never written to browser storage.
  const saveAccounts = value => { accountCache = Array.isArray(value) ? value : []; nativeRemove(ACCOUNTS_KEY); nativeRemove('sh_auth_accounts_v1'); return accountCache; };
  const accounts = () => accountCache;
  const panelSnapshot = () => {
    const state = {};
    for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('sh_') && !OMIT.has(key)) state[key] = localStorage.getItem(key); }
    return state;
  };
  const applyPanelState = state => {
    if (!state || typeof state !== 'object') return;
    applying = true;
    try {
      // A cloud record is a complete per-account snapshot: remove the previous
      // browser user's panel data before applying it, preventing cross-account leakage.
      const remove = [];
      for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('sh_') && !OMIT.has(key)) remove.push(key); }
      remove.forEach(key => nativeRemove(key));
      Object.keys(state).forEach(key => { if (key.startsWith('sh_') && !OMIT.has(key) && typeof state[key] === 'string') nativeSet(key, state[key]); });
    } finally { applying = false; }
  };
  const flushPanelState = async () => {
    writeTimer = 0;
    if (!active || !session) return;
    try { await cloudRequest('state-save', { state: panelSnapshot() }); }
    catch (e) { console.warn('Estakhrjo cloud state sync pending:', e.message); }
  };
  const queuePanelState = () => {
    if (!active || applying) return;
    clearTimeout(writeTimer); writeTimer = setTimeout(flushPanelState, 700);
  };
  localStorage.setItem = function (key, value) { nativeSet(key, value); if (String(key).startsWith('sh_') && !OMIT.has(key)) queuePanelState(); };
  localStorage.removeItem = function (key) { nativeRemove(key); if (String(key).startsWith('sh_') && !OMIT.has(key)) queuePanelState(); };

  async function refreshSession() {
    if (!session || !session.refresh_token || !window.SUPABASE_URL || !apiKey()) throw new Error('نشست ورود ابری منقضی شده است');
    const response = await fetch(String(window.SUPABASE_URL).replace(/\/$/, '') + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: apiKey() }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    const data = await response.json(); if (!response.ok || !data.access_token) throw new Error(data.error_description || 'تمدید نشست ناموفق بود');
    saveSession(data); return data;
  }
  async function callWithRefresh(action, payload) {
    try { return await cloudRequest(action, payload, true); }
    catch (e) {
      if (!/نشست|توکن|session|token|معتبر/i.test(e.message || '')) throw e;
      await refreshSession(); return cloudRequest(action, payload, true);
    }
  }
  async function hydrateState() {
    const out = await callWithRefresh('state-get');
    applyPanelState(out.state || {});
    return out.state || {};
  }
  async function restore() {
    if (!await cloudAvailable()) return { active: false, unavailable: true };
    session = read(SESSION_KEY);
    if (!session) return { active: false };
    try {
      const out = await callWithRefresh('me'); active = true;
      savePermissions(out.permissions);
      saveUi(out.ui);
      if (out.account && out.account.u === 'admin') saveAccounts((await callWithRefresh('accounts')).accounts);
      else if (out.account) saveAccounts([out.account]);
      await hydrateState();
      window.dispatchEvent(new CustomEvent('estakhrjo-cloud-ready', { detail: out.account }));
      return { active: true, account: out.account };
    } catch (e) { saveSession(null); active = false; accountCache = []; return { active: false, error: e.message }; }
  }
  /* What this account is allowed to open in the panel. The server decides it
     and sends it with the identity; this is only a cache so the first paint
     does not have to wait. Never treat it as authority — the server checks
     again on every call. */
  const PERM_KEY = 'estakhrjo-cloud-permissions';
  const UI_KEY = 'estakhrjo-cloud-ui';
  const CORE_FEATURES = ['overview', 'profile', 'public_profile', 'inbox'];
  let permissionCache = null;
  function savePermissions(list) {
    permissionCache = Array.isArray(list) && list.length ? list.slice() : CORE_FEATURES.slice();
    try { localStorage.setItem(PERM_KEY, JSON.stringify(permissionCache)); } catch (_) {}
  }
  function permissions() {
    if (permissionCache) return permissionCache.slice();
    try {
      const raw = JSON.parse(localStorage.getItem(PERM_KEY) || 'null');
      if (Array.isArray(raw) && raw.length) { permissionCache = raw; return raw.slice(); }
    } catch (_) {}
    return CORE_FEATURES.slice();
  }
  const can = feature => !feature || permissions().indexOf(feature) !== -1;
  let uiCache = null;
  function saveUi(ui) {
    uiCache = ui && typeof ui === 'object' ? ui : null;
    try { uiCache ? localStorage.setItem(UI_KEY, JSON.stringify(uiCache)) : localStorage.removeItem(UI_KEY); } catch (_) {}
  }
  function bottomNav() {
    if (!uiCache) { try { uiCache = JSON.parse(localStorage.getItem(UI_KEY) || 'null'); } catch (_) {} }
    const nav = uiCache && uiCache.bottomNav;
    return nav && Array.isArray(nav.items) ? nav : null;
  }
  async function setBottomNav(role, items, max) { return callWithRefresh('panel-bottom-nav-set', { role, items, max }); }
  async function getPanelPermissions() { return callWithRefresh('panel-permissions'); }
  async function setPanelPermission(role, feature, allowed) {
    return callWithRefresh('panel-permissions-set', { role, feature, allowed: !!allowed });
  }
  async function setPanelPermissionsBulk(role, allowed) {
    return callWithRefresh('panel-permissions-bulk', { role, allowed: !!allowed });
  }

  async function login(username, password) {
    if (!await cloudAvailable()) throw new Error('سرویس ورود ابری هنوز راه‌اندازی نشده است');
    const out = await cloudRequest('login', { username, password }, false);
    saveSession(out.session); active = true;
    savePermissions(out.permissions);
    saveUi(out.ui);
    try {
      if (out.account && out.account.u === 'admin') saveAccounts((await callWithRefresh('accounts')).accounts);
      else if (out.account) saveAccounts([out.account]);
      await hydrateState();
      return out;
    } catch (e) { saveSession(null); active = false; accountCache = []; throw e; }
  }
  async function logout() {
    permissionCache = null; uiCache = null;
    try { localStorage.removeItem(PERM_KEY); localStorage.removeItem(UI_KEY); } catch (_) {}
    const token = session && session.access_token;
    saveSession(null); active = false; saveAccounts([]);
    const remove = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('sh_') && !OMIT.has(key)) remove.push(key); }
    remove.forEach(key => nativeRemove(key));
    if (token && window.SUPABASE_URL && apiKey()) {
      try { await fetch(String(window.SUPABASE_URL).replace(/\/$/, '') + '/auth/v1/logout', { method: 'POST', headers: { apikey: apiKey(), Authorization: 'Bearer ' + token } }); } catch (e) {}
    }
  }
  async function getCvStudio() { return callWithRefresh('cv-studio-get'); }
  async function saveCvStudio(settings) { return callWithRefresh('cv-studio-save', { settings }); }
  async function getSiteDesign() { return callWithRefresh('site-design-get'); }
  async function saveSiteDesign(settings) { return callWithRefresh('site-design-save', { settings }); }
  // Visual Builder authoring is admin-only. Drafts and version history never
  // pass through public REST views; the Edge Function validates every schema.
  async function getPageBuilder() { return callWithRefresh('page-builder-get'); }
  async function savePageBuilder(draft) { return callWithRefresh('page-builder-save', { draft }); }
  async function publishPageBuilder(draft, changeNote) { return callWithRefresh('page-builder-publish', { draft, change_note: changeNote || '' }); }
  async function listPageBuilderVersions() { return callWithRefresh('page-builder-versions'); }
  async function restorePageBuilderVersion(versionId) { return callWithRefresh('page-builder-restore', { version_id: versionId }); }
  async function createAccount(data) { const out = await callWithRefresh('create-account', data); try { saveAccounts((await callWithRefresh('accounts')).accounts); } catch (e) {} return out; }
  async function submitResume(resume) { return callWithRefresh('submit-resume', { resume }); }
  async function submitMemberAd(ad) { return callWithRefresh('submit-member-ad', { ad }); }
  async function getChatList() { return callWithRefresh('chat-list'); }
  async function getActivityLog(filters) { return callWithRefresh('admin-activity-log', filters || {}); }
  async function getChatThread(recipientId) { return callWithRefresh('chat-thread', { recipient_id: recipientId }); }
  async function sendChatMessage(recipientId, body, clientNonce) { return callWithRefresh('chat-send', { recipient_id: recipientId, body, client_nonce: clientNonce }); }
  async function getSupportTickets() { return callWithRefresh('support-list'); }
  async function createSupportTicket(ticket) { return callWithRefresh('support-create', ticket); }
  async function getSupportThread(ticketId) { return callWithRefresh('support-thread', { ticket_id: ticketId }); }
  async function replySupportTicket(ticketId, body, clientNonce, internal) { return callWithRefresh('support-reply', { ticket_id: ticketId, body, client_nonce: clientNonce, internal: internal === true }); }
  async function updateSupportTicket(ticketId, patch) { return callWithRefresh('support-update', { ticket_id: ticketId, ...(patch || {}) }); }
  async function getMessagingSettings() { return callWithRefresh('messaging-settings-get'); }
  async function setMessagingSettings(mode, allowedRoles) { return callWithRefresh('messaging-settings-set', { mode, allowed_roles: allowedRoles || [] }); }
  async function runSupportAssistant(ticketId) { return callWithRefresh('support-assist', { ticket_id: ticketId }); }
  async function setSupportOutcome(ticketId, solved) { return callWithRefresh('support-outcome', { ticket_id: ticketId, solved: solved === true }); }
  async function rateSupportTicket(ticketId, rating, note) { return callWithRefresh('support-satisfaction', { ticket_id: ticketId, rating, note: note || '' }); }
  async function uploadSupportAttachment(ticketId, fileName, dataUrl, messageId) { return callWithRefresh('support-attachment-upload', { ticket_id: ticketId, file_name: fileName, data_url: dataUrl, message_id: messageId || null }); }
  async function getSupportAdminBundle() { return callWithRefresh('support-admin-bundle'); }
  async function saveSupportKnowledge(article) { return callWithRefresh('support-knowledge-save', { article }); }
  async function saveSupportMacro(macro) { return callWithRefresh('support-macro-save', { macro }); }
  async function getSupportReports() { return callWithRefresh('support-reports'); }

  async function updateAccount(data) {
    const out = await callWithRefresh('update-account', data);
    const list = accounts(); const idx = list.findIndex(x => x.id === out.account.id); if (idx >= 0) { list[idx] = { ...list[idx], ...out.account }; saveAccounts(list); }
    return out;
  }
  // Public Profile content deliberately uses a separate, narrow set of actions.
  // The Edge Function is the authority for moderation states and public reads.
  async function getPublicProfileOwn() { return callWithRefresh('public-profile-own'); }
  async function saveCoachWork(work) { return callWithRefresh('coach-work-save', { work }); }
  /* پروفایل حرفه‌ای مربی: همان رکوردی که «اطلاعات سیستمی» صفحهٔ عمومی را پر می‌کند */
  async function getCoachProfile() { return callWithRefresh('coach-profile-get', {}); }
  async function saveCoachProfile(coach) { return callWithRefresh('coach-profile-save', { coach }); }
  /* v2 sends two payloads: `authored` (reviewed free text/media) and `display`
     (visibility switches over records the member already owns, applied live).
     `content` stays for the v1 callers until they are all migrated. */
  async function savePublicProfile(username, payload, submit) {
    const body = { username, submit: submit === true };
    if (payload && (payload.authored || payload.display)) { body.authored = payload.authored || {}; body.display = payload.display || {}; if (payload.display_only === true) body.display_only = true; }
    else body.content = payload;
    return callWithRefresh('public-profile-save', body);
  }
  async function unpublishOwnPublicProfile() { return callWithRefresh('public-profile-self-unpublish'); }
  async function getPublicProfileAnalytics(range) { return callWithRefresh('public-profile-analytics', { range: range || 'week' }); }
  async function getPublicProfileReviewList() { return callWithRefresh('public-profile-review-list'); }
  async function reviewPublicProfile(profileId, decision, reason) { return callWithRefresh('public-profile-review', { profile_id: profileId, decision, reason: reason || '' }); }
  async function setPublicProfileAdminState(profileId, state) { return callWithRefresh('public-profile-admin-state', { profile_id: profileId, state }); }
  window.addEventListener('beforeunload', () => { if (writeTimer) { clearTimeout(writeTimer); flushPanelState(); } });
  window.SH_CLOUD_AUTH = { get active() { return active; }, get session() { return session; }, accounts, available: cloudAvailable, restore, login, logout, createAccount, updateAccount, submitResume, submitMemberAd, getChatList, getActivityLog, getChatThread, sendChatMessage, getSupportTickets, createSupportTicket, getSupportThread, replySupportTicket, updateSupportTicket, getMessagingSettings, setMessagingSettings, runSupportAssistant, setSupportOutcome, rateSupportTicket, uploadSupportAttachment, getSupportAdminBundle, saveSupportKnowledge, saveSupportMacro, getSupportReports, getCvStudio, saveCvStudio, getSiteDesign, saveSiteDesign, getPageBuilder, savePageBuilder, publishPageBuilder, listPageBuilderVersions, restorePageBuilderVersion, getPublicProfileOwn, saveCoachWork, getCoachProfile, saveCoachProfile, savePublicProfile, unpublishOwnPublicProfile, getPublicProfileAnalytics, getPublicProfileReviewList, reviewPublicProfile, setPublicProfileAdminState, permissions, can, bottomNav, setBottomNav, getPanelPermissions, setPanelPermission, setPanelPermissionsBulk, hydrateState, flushPanelState, bootstrap: key => cloudRequest('bootstrap', key || {}, false) };
})();
