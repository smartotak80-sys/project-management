// script.js — Railway-aware client (updated)
// - Attempts to POST member to server for everyone to see.
// - If server rejects non-admin POST, keep a local unsynced queue and show locally.
// - Admins use token from /auth/login (server returns token).
// - Shows members/news/gallery from server, merges local-unsynced members for local view.

const API_BASE = "https://project-management-production-f175.up.railway.app";
const CURRENT_USER_KEY = 'barakuda_current_user';
const LOCAL_UNSYNC_MEMBERS_KEY = 'barakuda_local_unsynced_members_v1';
const MEMBERS_KEY = 'barakuda_members_v3'; // local cache key (optional)
const NEWS_KEY = 'barakuda_news_v1';
const GALLERY_KEY = 'barakuda_gallery_v1';
const USERS_KEY = 'barakuda_users_db';

let currentUser = loadLocal(CURRENT_USER_KEY) || null;
let adminToken = currentUser?.adminToken || null;

// ---------- helpers ----------
function loadLocal(k){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){return null} }
function saveLocal(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function clearLocal(k){ try{ localStorage.removeItem(k); }catch(e){} }
function esc(s){ return String(s||'').replace(/[&<>"'`=/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60'}[c])); }

async function apiGET(path){ const r = await fetch(API_BASE + path); if(!r.ok) throw r; return r.json(); }
async function apiPOST(path, body, token){
  const headers = {'Content-Type':'application/json'};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
  let json; try{ json = await r.json(); }catch(e){ json = null; }
  return { ok: r.ok, status: r.status, body: json };
}
async function apiDELETE(path, token){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'DELETE', headers });
  let json; try{ json = await r.json(); }catch(e){ json = null; }
  return { ok: r.ok, status: r.status, body: json };
}

// ---------- DOM refs ----------
const membersGrid = document.getElementById('membersGrid');
const newsList = document.getElementById('newsList');
const galleryGrid = document.getElementById('galleryGrid');

const openAuthBtn = document.getElementById('openAuthBtn');
const authBtnText = document.getElementById('authBtnText');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');

const addMemberBtn = document.getElementById('addMemberBtn');
const addMemberModal = document.getElementById('addMemberModal');
const addMemberForm = document.getElementById('addMemberForm');
const memberNewName = document.getElementById('memberNewName');
const memberNewRole = document.getElementById('memberNewRole');
const memberNewDiscord = document.getElementById('memberNewDiscord');
const memberNewYoutube = document.getElementById('memberNewYoutube');
const memberNewTg = document.getElementById('memberNewTg');
const memberLimitWarning = document.getElementById('memberLimitWarning');

const addNewsBtn = document.getElementById('addNewsBtn');
const newsTitle = document.getElementById('newsTitle');
const newsDate = document.getElementById('newsDate');
const newsSummary = document.getElementById('newsSummary');

const galleryUrl = document.getElementById('galleryUrl');
const addGalleryBtn = document.getElementById('addGalleryBtn');

const adminSidebar = document.getElementById('adminSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const userDatabaseSidebar = document.getElementById('userDatabaseSidebar');
const totalUsersSidebar = document.getElementById('totalUsersSidebar');
const totalAdminsSidebar = document.getElementById('totalAdminsSidebar');

const memberSearch = document.getElementById('memberSearch');

// ---------- UI helpers ----------
function updateAuthUI(){
  if(!authBtnText) return;
  if(currentUser){
    authBtnText.textContent = esc(currentUser.username);
    if(currentUser.role === 'admin'){ openAuthBtn.classList.remove('btn-outline'); openAuthBtn.classList.add('btn-primary'); }
    else { openAuthBtn.classList.remove('btn-primary'); openAuthBtn.classList.add('btn-outline'); }
  } else {
    authBtnText.textContent = 'Вхід';
    openAuthBtn.classList.add('btn-primary');
    openAuthBtn.classList.remove('btn-outline');
  }

  // Admin-only controls visibility
  const isAdmin = currentUser && currentUser.role === 'admin';
  if(addNewsBtn) addNewsBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addGalleryBtn) addGalleryBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addMemberBtn) addMemberBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ---------- Render ----------
function renderMembers(allMembers, filter=''){
  if(!membersGrid) return;
  const lower = (filter||'').toLowerCase();
  const list = (allMembers||[]).filter(m => (m.name + ' ' + (m.role||'')).toLowerCase().includes(lower));
  if(list.length===0){ membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
  const frag = document.createDocumentFragment();
  list.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'member animated-content';
    el.setAttribute('data-id', m.id);
    const isOwner = currentUser && currentUser.username === m.owner && currentUser.role !== 'admin';
    const canManage = currentUser && (currentUser.role === 'admin' || isOwner);
    let social = '';
    if(m.links){
      if(m.links.discord) social += `<span class="social-link" title="Discord: ${esc(m.links.discord)}"><i class="fa-brands fa-discord"></i></span>`;
      if(m.links.youtube) social += `<a href="${esc(m.links.youtube)}" target="_blank" class="social-link link-yt"><i class="fa-brands fa-youtube"></i></a>`;
      if(m.links.tg) social += `<a href="${esc(m.links.tg)}" target="_blank" class="social-link link-tg"><i class="fa-brands fa-telegram"></i></a>`;
    }
    el.innerHTML = `
      <div class="member-top">
        <div class="info">
          <h3>${esc(m.name)}</h3>
          <div class="role-badge">${esc(m.role)}</div>
          <div class="social-links">${social}</div>
          ${isOwner?'<small style="color:#555;display:block;margin-top:5px;">(Ваш запис)</small>':''}
        </div>
      </div>
      ${canManage?`<div class="member-actions">
        ${currentUser.role==='admin'?`<button class="btn btn-delete" data-action="delete" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>`:''}
        ${isOwner?`<button class="btn btn-edit" data-action="edit" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Редагувати</button>`:''}
      </div>`:''}
    `;
    frag.appendChild(el);
  });
  membersGrid.innerHTML = '';
  membersGrid.appendChild(frag);
}

function renderNews(news){
  if(!newsList) return;
  if(!news || news.length===0){ newsList.innerHTML = '<p class="muted">Немає подій</p>'; return; }
  newsList.innerHTML = '';
  [...news].reverse().forEach(n=>{
    const el = document.createElement('div');
    el.className = 'news-item animated-content';
    el.innerHTML = `
      <strong>${esc(n.title)}</strong>
      <div class="meta">${esc(n.date)}</div>
      <p>${esc(n.summary)}</p>
      ${ currentUser && currentUser.role==='admin' ? `<div style="margin-top:8px;"><button class="btn btn-delete" data-action="delete-news" data-id="${n.id}">Видалити</button></div>` : '' }
    `;
    newsList.appendChild(el);
  });
}

function renderGallery(gallery){
  if(!galleryGrid) return;
  if(!gallery || gallery.length===0){ galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
  galleryGrid.innerHTML = '';
  gallery.forEach((g, idx)=>{
    const d = document.createElement('div');
    d.className = 'animated-content';
    d.innerHTML = `
      <img src="${esc(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'" data-index="${idx}" data-action="lightbox">
      ${ currentUser && currentUser.role==='admin' ? `<div style="margin-top:6px"><button class="btn btn-delete" data-id="${g.id}" data-action="delete-gallery">Видалити</button></div>` : '' }
    `;
    galleryGrid.appendChild(d);
  });
}

// ---------- Merge server + local-unsynced ----------
function mergeMembers(serverMembers){
  // Load unsynced local members which couldn't be posted
  const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
  // Merge by unique id (local unsynced have ids too)
  const map = new Map();
  (serverMembers || []).forEach(m => map.set(String(m.id), m));
  unsynced.forEach(m => {
    if(!map.has(String(m.id))) map.set(String(m.id), m);
  });
  return Array.from(map.values());
}

// ---------- Load everything ----------
async function loadAll(){
  try{
    const mRes = await apiGET('/api/members').catch(()=>null);
    const nRes = await apiGET('/api/news').catch(()=>null);
    const gRes = await apiGET('/api/gallery').catch(()=>null);

    const serverMembers = mRes && (mRes.members || mRes) ? (mRes.members || mRes) : [];
    const serverNews = nRes && (nRes.news || nRes) ? (nRes.news || nRes) : [];
    const serverGallery = gRes && (gRes.gallery || gRes) ? (gRes.gallery || gRes) : [];

    const mergedMembers = mergeMembers(serverMembers);
    // render
    renderMembers(mergedMembers, memberSearch ? memberSearch.value : '');
    renderNews(serverNews);
    renderGallery(serverGallery);

  }catch(err){
    console.error('loadAll error', err);
    // On error, still render cached + local unsynced
    const cachedMembers = loadLocal(MEMBERS_KEY) || [];
    const merged = mergeMembers(cachedMembers);
    renderMembers(merged, memberSearch ? memberSearch.value : '');
    renderNews(loadLocal(NEWS_KEY) || []);
    renderGallery(loadLocal(GALLERY_KEY) || []);
  }
}

// ---------- Auth flows ----------
async function tryGetMe(){
  currentUser = loadLocal(CURRENT_USER_KEY) || currentUser;
  adminToken = currentUser?.adminToken || null;
  updateAuthUI();
}

async function loginHandler(username, password){
  // Try admin endpoint
  try{
    const r = await fetch(API_BASE + '/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user: username, pass: password })
    });
    if(r.ok){
      const data = await r.json().catch(()=>null);
      if(data && data.token){
        currentUser = { username: 'ADMIN 🦈', role: 'admin', adminToken: data.token };
        saveLocal(CURRENT_USER_KEY, currentUser);
        adminToken = data.token;
        updateAuthUI();
        if(authModal) authModal.classList.remove('show');
        await loadAll();
        alert('Успішний вхід як Адмін');
        return;
      }
    }
  }catch(e){
    // ignore, try normal login
  }

  // Normal login against API (if server supports it)
  try{
    const res = await fetch(API_BASE + '/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(()=>null);
    if(res.ok && data && data.ok && data.user){
      currentUser = { username: data.user.username, role: data.user.role || 'member' };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      alert('Успішно увійшли');
      return;
    }
  }catch(e){
    console.error('login error', e);
  }

  alert('Невірні дані або сервер недоступний');
}

async function registerHandler(username, email, password){
  // Try server register first (if API supports)
  try{
    const r = await fetch(API_BASE + '/api/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, email, password })
    });
    const data = await r.json().catch(()=>null);
    if(r.ok && data && data.ok){ alert('Зареєстровано — тепер увійдіть'); if(tabLogin) tabLogin.click(); return; }
  }catch(e){
    // fallback to local-only registration
  }

  // Local fallback
  const users = loadLocal(USERS_KEY) || [];
  if(users.find(u=>u.username===username)) return alert('Логін зайнятий');
  users.push({ username, email, password, role: 'member', regDate: new Date().toISOString() });
  saveLocal(USERS_KEY, users);
  alert('Зареєстровано локально — увійдіть');
  if(tabLogin) tabLogin.click();
}

// ---------- Add member flow (user limited to 1) ----------
async function canUserCreateMember(username){
  // Check server count
  try{
    const r = await apiGET('/api/members');
    const arr = r.members || r || [];
    const owned = arr.filter(m=>m.owner === username).length;
    const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
    const ownedLocal = unsynced.filter(m=>m.owner===username).length;
    return (owned + ownedLocal) === 0;
  }catch(e){
    // If server unreachable, allow based on local unsynced
    const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
    const ownedLocal = unsynced.filter(m=>m.owner===username).length;
    return ownedLocal === 0;
  }
}

async function addMemberHandler(formData){
  if(!currentUser){ alert('Спочатку увійдіть'); return; }
  const payload = {
    id: Date.now(),
    name: formData.name,
    role: formData.role,
    owner: currentUser.username,
    links: { discord: formData.discord||'', youtube: formData.youtube||'', tg: formData.tg||'' }
  };

  // If admin — post with token
  if(currentUser.role === 'admin'){
    const resp = await apiPOST('/api/members', payload, currentUser.adminToken || adminToken);
    if(resp.ok){ alert('Учасника додано'); addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); return; }
    else { alert('Помилка сервера при додаванні: ' + (resp.body?.error||resp.status)); return; }
  }

  // Regular user: try to POST without token (server must allow this to make it global)
  try{
    const resp = await apiPOST('/api/members', payload);
    if(resp.ok){ alert('Учасника додано на сервер (тепер доступний усім)'); addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); return; }
    // if server returns 401/403 => not allowed
    if(resp.status === 401 || resp.status === 403){
      // Save locally as unsynced
      const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
      unsynced.push(payload);
      saveLocal(LOCAL_UNSYNC_MEMBERS_KEY, unsynced);
      // merge and render so this user sees it immediately
      const srv = (await apiGET('/api/members').catch(()=>({members:[]})) ) || { members: [] };
      const merged = mergeMembers(srv.members || srv);
      renderMembers(merged, memberSearch ? memberSearch.value : '');
      addMemberForm.reset(); addMemberModal.classList.remove('show');
      alert('Сервер не дозволяє додавати учасників без адміна — запис збережено локально (показаний тільки вам)'); 
      return;
    }
    // other error: push to local as fallback
    const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
    unsynced.push(payload);
    saveLocal(LOCAL_UNSYNC_MEMBERS_KEY, unsynced);
    const srv2 = (await apiGET('/api/members').catch(()=>({members:[]})) ) || { members: [] };
    renderMembers(mergeMembers(srv2.members || srv2), memberSearch ? memberSearch.value : '');
    addMemberForm.reset(); addMemberModal.classList.remove('show');
    alert('Не вдалося записати на сервер — збережено локально');
  }catch(e){
    console.error('addMemberHandler error', e);
    const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
    unsynced.push(payload);
    saveLocal(LOCAL_UNSYNC_MEMBERS_KEY, unsynced);
    const srv2 = (await apiGET('/api/members').catch(()=>({members:[]})) ) || { members: [] };
    renderMembers(mergeMembers(srv2.members || srv2), memberSearch ? memberSearch.value : '');
    addMemberForm.reset(); addMemberModal.classList.remove('show');
    alert('Помилка мережі — запис збережено локально');
  }
}

// ---------- Admin deletes (only admin) ----------
async function deleteMemberHandler(id){
  if(!(currentUser && currentUser.role==='admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити учасника?')) return;
  const r = await apiDELETE(`/api/members/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка видалення');
}
async function deleteNewsHandler(id){
  if(!(currentUser && currentUser.role==='admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити новину?')) return;
  const r = await apiDELETE(`/api/news/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка');
}
async function deleteGalleryHandler(id){
  if(!(currentUser && currentUser.role==='admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити фото?')) return;
  const r = await apiDELETE(`/api/gallery/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка');
}

// ---------- Add news/gallery (admin) ----------
async function addNewsHandler(){
  if(!(currentUser && currentUser.role==='admin')){ alert('Тільки адмін'); return; }
  const payload = { id: Date.now(), title: newsTitle.value.trim(), date: newsDate.value, summary: newsSummary.value.trim() };
  if(!payload.title || !payload.date || !payload.summary) return alert('Заповніть всі поля');
  const r = await apiPOST('/api/news', payload, currentUser.adminToken || adminToken);
  if(r.ok){ newsTitle.value=''; newsDate.value=''; newsSummary.value=''; await loadAll(); alert('Додано'); } else alert(r.body?.error || 'Помилка');
}
async function addGalleryHandler(){
  if(!(currentUser && currentUser.role==='admin')){ alert('Тільки адмін'); return; }
  const url = galleryUrl.value.trim();
  if(!url) return alert('Вкажіть URL');
  const r = await apiPOST('/api/gallery', { id: Date.now(), url }, currentUser.adminToken || adminToken);
  if(r.ok){ galleryUrl.value=''; await loadAll(); alert('Фото додано'); } else alert(r.body?.error || 'Помилка');
}

// ---------- Event listeners ----------
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  if(action === 'delete') deleteMemberHandler(id);
  if(action === 'edit') {
    // only owner or admin can edit local unsynced or (if admin) server side
    const membersAll = mergeMembers((loadLocal(MEMBERS_KEY) || []));
    const m = membersAll.find(x => String(x.id) === String(id));
    if(!m) return alert('Не знайдено');
    if(!currentUser) return alert('Увійдіть');
    if(currentUser.role!=='admin' && currentUser.username !== m.owner) return alert('Недостатньо прав');
    // use prompt like before
    const newName = prompt(`Редагувати ім'я для ${m.name}:`, m.name);
    if(newName === null || newName.trim() === '') return;
    const newRole = prompt(`Редагувати роль для ${newName}:`, m.role);
    if(newRole === null || newRole.trim() === '') return;
    m.name = newName.trim();
    m.role = newRole.trim();
    // if admin: ideally call server edit endpoint (not present). For now update local unsynced or instruct admin to edit on server.
    const unsynced = loadLocal(LOCAL_UNSYNC_MEMBERS_KEY) || [];
    const idx = unsynced.findIndex(x=>String(x.id)===String(m.id));
    if(idx !== -1){
      unsynced[idx] = m;
      saveLocal(LOCAL_UNSYNC_MEMBERS_KEY, unsynced);
      alert('Локальний запис оновлено');
      loadAll();
    } else {
      alert('Щоб змінити серверний запис, використовуй адмінпанель або змінений сервер (PATCH endpoint). Цей UI оновив локальну відображувану копію.');
    }
  }
  if(action === 'delete-news') deleteNewsHandler(id);
  if(action === 'delete-gallery') deleteGalleryHandler(id);
});

// login/register forms
if(loginForm){
  loginForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    await loginHandler(user, pass);
  });
}
if(registerForm){
  registerForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPassConfirm').value;
    if(pass !== pass2) return alert('Паролі не співпадають');
    await registerHandler(user, email, pass);
  });
}

if(addMemberBtn){
  addMemberBtn.addEventListener('click', async ()=>{
    if(!currentUser){ alert('Увійдіть, щоб додати учасника'); return; }
    if(currentUser.role !== 'admin'){
      const ok = await canUserCreateMember(currentUser.username);
      if(!ok){ memberLimitWarning.textContent = `Ви вже створили одного учасника.`; memberLimitWarning.style.display = 'block'; return; }
      memberLimitWarning.style.display = 'none';
    }
    addMemberModal.classList.add('show'); document.body.style.overflow = 'hidden';
  });
}
if(addMemberForm){
  addMemberForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const data = {
      name: memberNewName.value.trim(),
      role: memberNewRole.value.trim(),
      discord: memberNewDiscord.value.trim(),
      youtube: memberNewYoutube.value.trim(),
      tg: memberNewTg.value.trim()
    };
    if(!data.name || !data.role) return alert('Заповніть імʼя і роль');
    await addMemberHandler(data);
  });
}

if(addNewsBtn) addNewsBtn.addEventListener('click', addNewsHandler);
if(addGalleryBtn) addGalleryBtn.addEventListener('click', addGalleryHandler);

if(openAuthBtn){
  openAuthBtn.addEventListener('click', ()=>{
    if(currentUser){
      if(confirm('Вийти з акаунту?')){ currentUser = null; adminToken = null; clearLocal(CURRENT_USER_KEY); updateAuthUI(); loadAll(); }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });
}

// search
if(memberSearch){
  memberSearch.addEventListener('input', (e) => loadAll().then(()=> {
    // after loadAll will re-render with filter applied by renderMembers call (we re-call renderMembers manually)
    // But renderMembers in loadAll uses current value; to be safe, re-run merge/render:
    apiGET('/api/members').then(r => {
      const merged = mergeMembers(r.members || r || []);
      renderMembers(merged, memberSearch.value);
    }).catch(()=> {
      const merged = mergeMembers(loadLocal(MEMBERS_KEY) || []);
      renderMembers(merged, memberSearch.value);
    });
  }));
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async ()=>{
  await tryGetMe();
  updateAuthUI();
  await loadAll();
});

// ---------- NOTES for server (if you want all user-created members to be global visible) ----------
/*
  1) Current server.js requires admin for POST /api/members.
     To allow normal users to create members visible to everyone, modify server.js:
     
     - Either remove requireAdmin middleware from POST /api/members;
       i.e. change:
         app.post("/api/members", requireAdmin, (req,res)=>{...});
       to:
         app.post("/api/members", (req,res)=>{ ... });
       (ensure you still validate required fields)

     - Or add a special endpoint that accepts unauthenticated POSTS and inserts them into DB
       (maybe with field owner set to username passed in body).

  2) Security note: allowing unauthenticated writes can enable spam. Consider:
     - Require registration + JWT tokens (server issues token on /api/login), and client uses it.
     - Or add rate-limits / moderation queue.

  3) If you want, я можу також прислати готовий патч для server.js,
     щоб POST /api/members приймав запис від звичайних користувачів (і тоді всі побачать відразу).
*/

