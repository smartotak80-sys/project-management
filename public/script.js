// script.js — Client for "Variant 1" (everyone sees all; user can create 1 member; events/gallery admin-only)
const API_BASE = "https://project-management-production-f175.up.railway.app"; // <- твій URL
const CURRENT_USER_KEY = 'barakuda_current_user';

// ---------- storage helpers ----------
function loadLocal(k){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null }catch(e){return null} }
function saveLocal(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function clearLocal(k){ try{ localStorage.removeItem(k); }catch(e){} }
function esc(s){ return String(s||'').replace(/[&<>"'`=/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60'}[c])); }

// ---------- api helpers ----------
async function apiGET(path){
  const r = await fetch(API_BASE + path);
  if(!r.ok) throw r;
  return r.json();
}
async function apiPOST(path, body, token){
  const headers = {'Content-Type':'application/json'};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
  let json = null;
  try{ json = await r.json() }catch(e){}
  return { ok: r.ok, status: r.status, body: json };
}
async function apiDELETE(path, token){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'DELETE', headers });
  let json = null;
  try{ json = await r.json() }catch(e){}
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

const memberSearch = document.getElementById('memberSearch');

let currentUser = loadLocal(CURRENT_USER_KEY) || null;
let adminToken = currentUser?.adminToken || null;

// ---------- UI helpers ----------
function updateAuthUI(){
  if(!authBtnText) return;
  if(currentUser){
    authBtnText.textContent = esc(currentUser.username);
    if(currentUser.role === 'admin'){
      openAuthBtn.classList.remove('btn-outline'); openAuthBtn.classList.add('btn-primary');
      openAuthBtn.style.boxShadow = "0 0 12px var(--accent)";
    } else {
      openAuthBtn.classList.remove('btn-primary'); openAuthBtn.classList.add('btn-outline');
      openAuthBtn.style.boxShadow = "none";
    }
  } else {
    authBtnText.textContent = 'Вхід';
    openAuthBtn.classList.add('btn-primary');
    openAuthBtn.classList.remove('btn-outline');
    openAuthBtn.style.boxShadow = "none";
  }

  const isAdmin = currentUser && currentUser.role === 'admin';
  if(addNewsBtn) addNewsBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addGalleryBtn) addGalleryBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addMemberBtn) addMemberBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ---------- render ----------
function renderMembers(list = [], filter = ''){
  if(!membersGrid) return;
  const lower = (filter||'').toLowerCase();
  const items = (list||[]).filter(m => (m.name + ' ' + (m.role||'')).toLowerCase().includes(lower));
  if(items.length === 0){ membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
  const frag = document.createDocumentFragment();
  items.forEach(m => {
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
          ${isOwner ? '<small style="color:#555; display:block; margin-top:6px;">(Ваш запис)</small>' : ''}
        </div>
      </div>
      ${canManage ? `<div class="member-actions">
          ${currentUser.role === 'admin' ? `<button class="btn btn-delete" data-action="delete" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>` : ''}
          ${isOwner ? `<button class="btn btn-edit" data-action="edit" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Редагувати</button>` : ''}
        </div>` : ''}
    `;
    frag.appendChild(el);
  });
  membersGrid.innerHTML = '';
  membersGrid.appendChild(frag);
}

function renderNews(list = []){
  if(!newsList) return;
  if(!list || list.length===0){ newsList.innerHTML = '<p class="muted">Немає подій</p>'; return; }
  newsList.innerHTML = '';
  [...list].reverse().forEach(n=>{
    const el = document.createElement('div');
    el.className = 'news-item animated-content';
    el.innerHTML = `
      <strong>${esc(n.title)}</strong>
      <div class="meta">${esc(n.date)}</div>
      <p>${esc(n.summary)}</p>
      ${currentUser && currentUser.role === 'admin' ? `<div style="margin-top:8px"><button class="btn btn-delete" data-action="delete-news" data-id="${n.id}">Видалити</button></div>` : ''}
    `;
    newsList.appendChild(el);
  });
}

function renderGallery(list = []){
  if(!galleryGrid) return;
  if(!list || list.length===0){ galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
  galleryGrid.innerHTML = '';
  list.forEach((g, idx)=>{
    const d = document.createElement('div');
    d.className = 'animated-content';
    d.innerHTML = `
      <img src="${esc(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'">
      ${currentUser && currentUser.role === 'admin' ? `<div style="margin-top:6px"><button class="btn btn-delete" data-id="${g.id}" data-action="delete-gallery">Видалити</button></div>` : ''}
    `;
    galleryGrid.appendChild(d);
  });
}

// ---------- loadAll ----------
async function loadAll(){
  try{
    const [mRes, nRes, gRes] = await Promise.allSettled([
      fetch(API_BASE + '/api/members'),
      fetch(API_BASE + '/api/news'),
      fetch(API_BASE + '/api/gallery')
    ]);

    // members
    if(mRes.status === 'fulfilled' && mRes.value.ok){
      const json = await mRes.value.json();
      const members = json.members || json || [];
      saveLocal('cached_members', members);
      renderMembers(members, memberSearch ? memberSearch.value : '');
    } else {
      // fallback to cache
      const cached = loadLocal('cached_members') || [];
      renderMembers(cached, memberSearch ? memberSearch.value : '');
    }

    // news
    if(nRes.status === 'fulfilled' && nRes.value.ok){
      const json = await nRes.value.json();
      const news = json.news || json || [];
      saveLocal('cached_news', news);
      renderNews(news);
    } else {
      renderNews(loadLocal('cached_news') || []);
    }

    // gallery
    if(gRes.status === 'fulfilled' && gRes.value.ok){
      const json = await gRes.value.json();
      const gallery = json.gallery || json || [];
      saveLocal('cached_gallery', gallery);
      renderGallery(gallery);
    } else {
      renderGallery(loadLocal('cached_gallery') || []);
    }

  }catch(e){
    console.error('loadAll error', e);
    renderMembers(loadLocal('cached_members') || [], memberSearch ? memberSearch.value : '');
    renderNews(loadLocal('cached_news') || []);
    renderGallery(loadLocal('cached_gallery') || []);
  }
}

// ---------- Auth flows ----------
async function tryGetMe(){
  currentUser = loadLocal(CURRENT_USER_KEY) || currentUser;
  adminToken = currentUser?.adminToken || null;
  updateAuthUI();
}

async function loginHandler(username, password){
  // try admin login first
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
  }catch(e){ /* ignore */ }

  // normal login
  try{
    const r = await fetch(API_BASE + '/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await r.json().catch(()=>null);
    if(r.ok && data && data.ok && data.user){
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
  try{
    const r = await fetch(API_BASE + '/api/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, email, password })
    });
    const data = await r.json().catch(()=>null);
    if(r.ok && data && data.ok){ alert('Зареєстровано — увійдіть'); if(tabLogin) tabLogin.click(); return; }
  }catch(e){ /* fallback to local registration below */ }

  // fallback local
  const users = loadLocal('local_users') || [];
  if(users.find(u=>u.username===username)) return alert('Логін зайнятий (локально)');
  users.push({ username, email, password, role:'member', regDate: new Date().toISOString() });
  saveLocal('local_users', users);
  alert('Зареєстровано локально. Зайдіть в систему.');
  if(tabLogin) tabLogin.click();
}

// ---------- member creation (limit 1 per user for normal users) ----------
async function canUserCreateMember(username){
  try{
    const r = await fetch(API_BASE + '/api/members');
    if(!r.ok) throw r;
    const json = await r.json();
    const arr = json.members || json || [];
    const owned = arr.filter(m => m.owner === username).length;
    return owned === 0;
  }catch(e){
    // if server is down, conservatively allow based on cache
    const cached = loadLocal('cached_members') || [];
    const owned = cached.filter(m => m.owner === username).length;
    return owned === 0;
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

  // admin posts with token to server
  if(currentUser.role === 'admin'){
    const resp = await apiPOST('/api/members', payload, currentUser.adminToken || adminToken);
    if(resp.ok){ addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); alert('Учасника додано (сервер)'); }
    else alert(resp.body?.error || `Помилка: ${resp.status}`);
    return;
  }

  // normal user: check limit, then try to post (server must accept non-admin POST for global visibility)
  const allowed = await canUserCreateMember(currentUser.username);
  if(!allowed){ memberLimitWarning.textContent = 'Ви вже створили одного учасника — ліміт 1'; memberLimitWarning.style.display = 'block'; return; }
  memberLimitWarning.style.display = 'none';

  const resp = await apiPOST('/api/members', payload); // no token
  if(resp.ok){
    addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); alert('Учасника додано — видно всім');
    return;
  }

  // If server refused (401/403), inform admin action required
  if(resp.status === 401 || resp.status === 403){
    alert('Сервер вимагає адмінський доступ для додавання учасників. Щоб звичайні користувачі могли створювати учасників (щоб їх бачили всі), треба змінити server.js і дозволити POST /api/members без requireAdmin. Я можу скинути патч для server.js — скажи "патч server".');
    return;
  }

  // other error
  alert('Не вдалося додати на сервер — перевір сервер або мережу.');
}

// ---------- deletes (admin only) ----------
async function deleteMemberHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін може видаляти'); return; }
  if(!confirm('Видалити учасника?')) return;
  const r = await apiDELETE(`/api/members/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) await loadAll(); else alert(r.body?.error || 'Помилка видалення');
}
async function deleteNewsHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити новину?')) return;
  const r = await apiDELETE(`/api/news/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) await loadAll(); else alert(r.body?.error || 'Помилка');
}
async function deleteGalleryHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити фото?')) return;
  const r = await apiDELETE(`/api/gallery/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) await loadAll(); else alert(r.body?.error || 'Помилка');
}

// ---------- add news/gallery (admin only) ----------
async function addNewsHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const payload = { id: Date.now(), title: newsTitle.value.trim(), date: newsDate.value, summary: newsSummary.value.trim() };
  if(!payload.title || !payload.date || !payload.summary) return alert('Заповніть всі поля');
  const r = await apiPOST('/api/news', payload, currentUser.adminToken || adminToken);
  if(r.ok){ newsTitle.value=''; newsDate.value=''; newsSummary.value=''; await loadAll(); alert('Додано'); } else alert(r.body?.error || 'Помилка');
}
async function addGalleryHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const url = galleryUrl.value.trim();
  if(!url) return alert('Вкажіть URL');
  const r = await apiPOST('/api/gallery', { id: Date.now(), url }, currentUser.adminToken || adminToken);
  if(r.ok){ galleryUrl.value=''; await loadAll(); alert('Фото додано'); } else alert(r.body?.error || 'Помилка');
}

// ---------- event delegation ----------
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  if(action === 'delete') deleteMemberHandler(id);
  if(action === 'delete-news') deleteNewsHandler(id);
  if(action === 'delete-gallery') deleteGalleryHandler(id);
  if(action === 'edit'){
    // minimal edit for owner (client-side prompt -> server edit endpoint not present)
    const name = prompt('Нове імʼя:');
    if(!name) return;
    alert('Редагування серверного запису потребує серверного PATCH endpoint. Зверніться до адміна.');
  }
});

// ---------- forms ----------
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
    if(!currentUser){ alert('Увійдіть щоб додати учасника'); return; }
    if(currentUser.role !== 'admin'){
      const ok = await canUserCreateMember(currentUser.username);
      if(!ok){ memberLimitWarning.textContent = 'Ви вже створили одного учасника — ліміт 1'; memberLimitWarning.style.display = 'block'; return; }
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

// auth button
if(openAuthBtn){
  openAuthBtn.addEventListener('click', ()=>{
    if(currentUser){
      if(currentUser.role === 'admin'){
        if(adminSidebar) adminSidebar.classList.add('open');
      } else {
        if(confirm('Вийти з акаунту?')){
          currentUser = null; adminToken = null; clearLocal(CURRENT_USER_KEY); updateAuthUI(); loadAll();
        }
      }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });
}

// member search
if(memberSearch) memberSearch.addEventListener('input', ()=> loadAll().then(()=> {
  // re-filter in renderMembers will use memberSearch.value if possible (we re-call fetch in loadAll)
  // to be safe, re-run render with cached data:
  const cached = loadLocal('cached_members') || [];
  renderMembers(cached, memberSearch.value);
}));

// ---------- initial ----------
document.addEventListener('DOMContentLoaded', async ()=>{
  await tryGetMe();
  updateAuthUI();
  await loadAll();
});
