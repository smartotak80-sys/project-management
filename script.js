// script.js — Railway-ready client
// Постав свій API_BASE якщо потрібно (я підставив твій URL)
const API_BASE = "https://project-management-production-a0ee.up.railway.app";

const CURRENT_USER_KEY = 'barakuda_current_user';

let currentUser = loadLocal(CURRENT_USER_KEY) || null;
let adminToken = currentUser?.adminToken || null;

// ---------------- helpers ----------------
function loadLocal(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){return null} }
function saveLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function clearLocal(k){ localStorage.removeItem(k); }
function esc(s){ return String(s||'').replace(/[&<>"'`=/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60'}[c])); }
async function apiGET(path){ const r = await fetch(API_BASE + path); return r.ok ? r.json() : Promise.reject(r); }
async function apiPOST(path, body, token){ 
  const headers = {'Content-Type':'application/json'};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
  return r.json();
}
async function apiDELETE(path, token){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(API_BASE + path, { method:'DELETE', headers });
  return r.json();
}

// ---------------- DOM refs ----------------
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

// ---------------- UI update ----------------
function updateAuthUI(){
  if(!authBtnText) return;
  if(currentUser){
    authBtnText.textContent = esc(currentUser.username);
    if(currentUser.role === 'admin'){
      openAuthBtn.classList.remove('btn-outline'); openAuthBtn.classList.add('btn-primary');
      openAuthBtn.style.boxShadow = "0 0 15px var(--accent)";
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

  // Control visibility for admin-only controls
  const isAdmin = currentUser && currentUser.role === 'admin';
  if(addNewsBtn) addNewsBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addGalleryBtn) addGalleryBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addMemberBtn) {
    // admin sees add; user sees add only if they don't have member yet (we check async when clicking)
    addMemberBtn.style.display = currentUser ? 'inline-block' : 'none';
  }
}

// ---------------- Render ----------------
function renderMembers(members){
  if(!membersGrid) return;
  if(!members || members.length===0){ membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
  const frag = document.createDocumentFragment();
  members.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'member animated-content';
    el.innerHTML = `
      <div class="member-top">
        <div class="info">
          <h3>${esc(m.name)}</h3>
          <div class="role-badge">${esc(m.role)}</div>
          <div class="social-links">
            ${m.links?.discord ? `<span class="social-link" title="Discord: ${esc(m.links.discord)}"><i class="fa-brands fa-discord"></i></span>` : ''}
            ${m.links?.youtube ? `<a href="${esc(m.links.youtube)}" target="_blank" class="social-link link-yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>` : ''}
            ${m.links?.tg ? `<a href="${esc(m.links.tg)}" target="_blank" class="social-link link-tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>` : ''}
          </div>
        </div>
      </div>
      <div class="member-actions">
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-action="delete" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>` : '' }
      </div>
    `;
    frag.appendChild(el);
  });
  membersGrid.innerHTML = '';
  membersGrid.appendChild(frag);
}

// news
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
      <div style="margin-top:8px">
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-action="delete-news" data-id="${n.id}">Видалити</button>` : '' }
      </div>
    `;
    newsList.appendChild(el);
  });
}

// gallery
function renderGallery(gallery){
  if(!galleryGrid) return;
  if(!gallery || gallery.length===0){ galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
  galleryGrid.innerHTML = '';
  gallery.forEach(g=>{
    const d = document.createElement('div');
    d.className = 'animated-content';
    d.innerHTML = `
      <img src="${esc(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'">
      ${ currentUser && currentUser.role === 'admin' ? `<div style="margin-top:6px"><button class='btn btn-delete' data-id="${g.id}" data-action="delete-gallery">Видалити</button></div>` : '' }
    `;
    galleryGrid.appendChild(d);
  });
}

// ---------------- Load from server ----------------
async function loadAll(){
  try{
    const [mRes, nRes, gRes] = await Promise.all([
      apiGET('/api/members'),
      apiGET('/api/news'),
      apiGET('/api/gallery')
    ]);
    renderMembers(mRes.members || mRes || []);
    renderNews(nRes.news || nRes || []);
    renderGallery(gRes.gallery || gRes || []);
  }catch(err){
    console.error('Load error', err);
  }
}

// ---------------- Auth flows ----------------
async function tryGetMe(){
  // if admin token exists, try to decode by hitting an admin-only endpoint? Our server earlier returns nothing for /me
  // We rely on stored currentUser from localStorage
  currentUser = loadLocal(CURRENT_USER_KEY) || currentUser;
  adminToken = currentUser?.adminToken || adminToken || null;
  updateAuthUI();
}

async function loginHandler(username, password){
  // Try admin login first (returns token)
  try {
    const adminResp = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ user: username, pass: password })
    });
    const adminData = await adminResp.json().catch(()=>({}));
    if(adminResp.ok && adminData.token){
      currentUser = { username: 'ADMIN 🦈', role: 'admin', adminToken: adminData.token };
      saveLocal(CURRENT_USER_KEY, currentUser);
      adminToken = adminData.token;
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      alert('Успішний вхід як Адмін');
      return;
    }
  } catch(e){ /* ignore */ }

  // Normal user login
  try{
    const res = await fetch(API_BASE + '/api/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(res.ok && data.ok && data.user){
      currentUser = { username: data.user.username, role: data.user.role || 'member' };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      alert('Успішно увійшли');
      return;
    } else {
      alert('Невірні дані');
    }
  }catch(e){
    console.error(e);
    alert('Помилка логіну');
  }
}

async function registerHandler(username, email, password){
  try{
    const res = await fetch(API_BASE + '/api/register', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if(res.ok && data.ok){
      alert('Зареєстровано, тепер увійдіть');
      if(tabLogin) tabLogin.click();
    } else {
      alert(data.error || 'Помилка реєстрації');
    }
  }catch(e){ console.error(e); alert('Помилка'); }
}

// ---------------- Actions: add member (user limited to 1) ----------------
async function canUserCreateMember(username){
  // fetch members and check owner equality
  try{
    const res = await apiGET('/api/members');
    const arr = res.members || res;
    const owned = arr.filter(m => m.owner === username).length;
    return owned === 0;
  }catch(e){
    console.error(e);
    return false; // conservative: disallow if error
  }
}

async function addMemberHandler(formData){
  if(!currentUser){ alert('Спочатку увійдіть'); return; }

  const payload = {
    id: Date.now(),
    name: formData.name,
    role: formData.role,
    owner: currentUser.username,
    links: {
      discord: formData.discord || '',
      youtube: formData.youtube || '',
      tg: formData.tg || ''
    }
  };

  if(currentUser.role === 'admin'){
    // admin can post with token
    const resp = await apiPOST('/api/members', payload, currentUser.adminToken || adminToken);
    if(resp.ok){ alert('Учасника додано'); addMemberForm.reset(); addMemberModal.classList.remove('show'); loadAll(); }
    else alert(resp.error || 'Помилка від сервера при додаванні');
    return;
  }

  // regular user: check if already has one
  const allowed = await canUserCreateMember(currentUser.username);
  if(!allowed){
    memberLimitWarning.textContent = `Ви вже створили учасника — тільки один дозволений.`;
    memberLimitWarning.style.display = 'block';
    return;
  }

  // Try POST to server (server must accept owner-created members)
  try{
    const resp = await apiPOST('/api/members', payload); // no token
    if(resp.ok){ alert('Учасника додано (на сервер)'); addMemberForm.reset(); addMemberModal.classList.remove('show'); loadAll(); }
    else {
      // If server denies (e.g. admin-only), fallback: inform user
      alert(resp.error || 'Сервер відхилив запит. Попросіть адміна додати учасника або змініть налаштування сервера.');
    }
  }catch(e){
    console.error(e);
    alert('Помилка при додаванні — перевірте лог сервера');
  }
}

// ---------------- Admin-only deletes ----------------
async function deleteMemberHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити учасника?')) return;
  const r = await apiDELETE(`/api/members/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) loadAll(); else alert(r.error || 'Помилка видалення');
}
async function deleteNewsHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити новину?')) return;
  const r = await apiDELETE(`/api/news/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) loadAll(); else alert(r.error || 'Помилка');
}
async function deleteGalleryHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити фото?')) return;
  const r = await apiDELETE(`/api/gallery/${id}`, currentUser.adminToken || adminToken);
  if(r.ok) loadAll(); else alert(r.error || 'Помилка');
}

// ---------------- add news/gallery (admin only) ----------------
async function addNewsHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const payload = { id: Date.now(), title: newsTitle.value.trim(), date: newsDate.value, summary: newsSummary.value.trim() };
  if(!payload.title || !payload.date || !payload.summary) return alert('Заповніть всі поля');
  const r = await apiPOST('/api/news', payload, currentUser.adminToken || adminToken);
  if(r.ok){ newsTitle.value=''; newsDate.value=''; newsSummary.value=''; loadAll(); alert('Додано'); } else alert(r.error || 'Помилка');
}
async function addGalleryHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const url = galleryUrl.value.trim();
  if(!url) return alert('Вкажіть URL');
  const r = await apiPOST('/api/gallery', { id: Date.now(), url }, currentUser.adminToken || adminToken);
  if(r.ok){ galleryUrl.value=''; loadAll(); alert('Фото додано'); } else alert(r.error || 'Помилка');
}

// ---------------- Event listeners, delegation ----------------
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  if(action === 'delete') deleteMemberHandler(id);
  if(action === 'delete-news') deleteNewsHandler(id);
  if(action === 'delete-gallery') deleteGalleryHandler(id);
});

// Auth modal/form handlers
if(loginForm){
  loginForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    await loginHandler(user, pass);
  });
}
if(registerForm){
  registerForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPassConfirm').value;
    if(pass !== pass2) return alert('Паролі не співпадають');
    await registerHandler(user, email, pass);
  });
}

// Add member modal open
if(addMemberBtn){
  addMemberBtn.addEventListener('click', async ()=>{
    if(!currentUser){ return alert('Увійдіть, щоб додати учасника'); }
    if(currentUser.role !== 'admin'){
      const ok = await canUserCreateMember(currentUser.username);
      if(!ok){ memberLimitWarning.textContent = `Ви вже створили одного учасника.`; memberLimitWarning.style.display = 'block'; return; }
      memberLimitWarning.style.display = 'none';
    }
    addMemberModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  });
}
if(addMemberForm){
  addMemberForm.addEventListener('submit', async (ev)=>{
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

// add news/gallery listeners
if(addNewsBtn) addNewsBtn.addEventListener('click', addNewsHandler);
if(addGalleryBtn) addGalleryBtn.addEventListener('click', addGalleryHandler);

// auth/Open button logic
if(openAuthBtn){
  openAuthBtn.addEventListener('click', ()=>{
    if(currentUser){
      if(confirm('Вийти з акаунту?')){ currentUser = null; adminToken = null; clearLocal(CURRENT_USER_KEY); updateAuthUI(); loadAll(); }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });
}
if(closeSidebar) closeSidebar.addEventListener('click', ()=>{ if(adminSidebar) adminSidebar.classList.remove('open'); });

// Modal close behavior (addMember modal close) - using closeMemberModal id from your markup
const closeMemberModal = document.getElementById('closeMemberModal');
if(closeMemberModal) closeMemberModal.addEventListener('click', ()=>{
  if(addMemberModal) addMemberModal.classList.remove('show');
  if(addMemberForm) addMemberForm.reset();
  document.body.style.overflow = 'auto';
});

// ---------------- On load ----------------
document.addEventListener('DOMContentLoaded', async ()=>{
  await tryGetMe();
  updateAuthUI();
  await loadAll();
});
