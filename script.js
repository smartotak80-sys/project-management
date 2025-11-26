// script.js — FULL fixed version (Railway-ready)
// API base (твій Railway URL)
const API_BASE = "https://project-management-production-a0ee.up.railway.app";

// Local storage key
const CURRENT_USER_KEY = 'barakuda_current_user';

// In-memory state
let currentUser = safeJSONParse(localStorage.getItem(CURRENT_USER_KEY)) || null;
let adminToken = currentUser?.adminToken || null;

// ---------- HELPERS ----------
function safeJSONParse(s){ try { return JSON.parse(s); } catch(e){ return null; } }
function saveCurrentUser(u){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u)); currentUser = u; adminToken = u?.adminToken || null; }
function clearCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY); currentUser = null; adminToken = null; }
function esc(s){ return String(s || '').replace(/[&<>"'`=/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60'}[c])); }

// Fetch wrappers with basic error handling
async function apiGET(path){
  const url = API_BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}
async function apiPOST(path, body = {}, token = null){
  const headers = {'Content-Type':'application/json'};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
  const json = await safeResJson(res);
  return { ok: res.ok, status: res.status, body: json };
}
async function apiDELETE(path, token = null){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method:'DELETE', headers });
  const json = await safeResJson(res);
  return { ok: res.ok, status: res.status, body: json };
}
async function safeResJson(res){ try { return await res.json(); } catch(e){ return null; } }

// ---------- DOM REFS ----------
const membersGrid = document.getElementById('membersGrid');
const newsList = document.getElementById('newsList');
const galleryGrid = document.getElementById('galleryGrid');

const openAuthBtn = document.getElementById('openAuthBtn');
const authBtnText = document.getElementById('authBtnText');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

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

const closeMemberModal = document.getElementById('closeMemberModal');
const closeSidebar = document.getElementById('closeSidebar');
const adminSidebar = document.getElementById('adminSidebar');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const userDatabaseSidebar = document.getElementById('userDatabaseSidebar');

// ---------- UI UPDATE ----------
function updateAuthUI(){
  if(!authBtnText) return;
  if(currentUser){
    authBtnText.textContent = esc(currentUser.username);
    if(currentUser.role === 'admin'){
      openAuthBtn.classList.remove('btn-outline');
      openAuthBtn.classList.add('btn-primary');
      openAuthBtn.style.boxShadow = "0 0 15px var(--accent)";
    } else {
      openAuthBtn.classList.remove('btn-primary');
      openAuthBtn.classList.add('btn-outline');
      openAuthBtn.style.boxShadow = "none";
    }
  } else {
    authBtnText.textContent = 'Вхід';
    openAuthBtn.classList.add('btn-primary');
    openAuthBtn.classList.remove('btn-outline');
    openAuthBtn.style.boxShadow = "none";
  }

  // Admin-only controls visibility
  const isAdmin = currentUser && currentUser.role === 'admin';
  if(addNewsBtn) addNewsBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if(addGalleryBtn) addGalleryBtn.style.display = isAdmin ? 'inline-block' : 'none';
  // Add member button: visible to logged users and admin; for users we will check allowedness later
  if(addMemberBtn) addMemberBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ---------- RENDER FUNCTIONS ----------
function renderMembers(members){
  if(!membersGrid) return;
  if(!Array.isArray(members) || members.length === 0){
    membersGrid.innerHTML = '<p class="muted">Немає учасників</p>';
    return;
  }
  membersGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  members.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'member animated-content';
    el.dataset.id = m.id;
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
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-action="delete-member" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>` : '' }
      </div>
    `;
    frag.appendChild(el);
  });
  membersGrid.appendChild(frag);
}

function renderNews(news){
  if(!newsList) return;
  if(!Array.isArray(news) || news.length === 0){
    newsList.innerHTML = '<p class="muted">Немає подій</p>';
    return;
  }
  newsList.innerHTML = '';
  const frag = document.createDocumentFragment();
  [...news].reverse().forEach(n=>{
    const el = document.createElement('div');
    el.className = 'news-item animated-content';
    el.dataset.id = n.id;
    el.innerHTML = `
      <strong>${esc(n.title)}</strong>
      <div class="meta">${esc(n.date)}</div>
      <p>${esc(n.summary)}</p>
      <div style="margin-top:8px">
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-action="delete-news" data-id="${n.id}">Видалити</button>` : '' }
      </div>
    `;
    frag.appendChild(el);
  });
  newsList.appendChild(frag);
}

function renderGallery(gallery){
  if(!galleryGrid) return;
  if(!Array.isArray(gallery) || gallery.length === 0){
    galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>';
    return;
  }
  galleryGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  gallery.forEach(g=>{
    const d = document.createElement('div');
    d.className = 'animated-content';
    d.dataset.id = g.id;
    d.innerHTML = `
      <img src="${esc(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'">
      ${ currentUser && currentUser.role === 'admin' ? `<div style="margin-top:6px"><button class='btn btn-delete' data-action="delete-gallery" data-id="${g.id}">Видалити</button></div>` : '' }
    `;
    frag.appendChild(d);
  });
  galleryGrid.appendChild(frag);
}

// ---------- LOAD ALL DATA ----------
async function loadAll(){
  try{
    const [membersRes, newsRes, galleryRes] = await Promise.all([
      apiGET('/api/members').catch(e => { console.warn('members load failed', e); return []; }),
      apiGET('/api/news').catch(e => { console.warn('news load failed', e); return []; }),
      apiGET('/api/gallery').catch(e => { console.warn('gallery load failed', e); return []; }),
    ]);
    // server might return arrays or objects with keys; support both
    const members = Array.isArray(membersRes) ? membersRes : (membersRes.members || membersRes.data || []);
    const news = Array.isArray(newsRes) ? newsRes : (newsRes.news || newsRes.data || []);
    const gallery = Array.isArray(galleryRes) ? galleryRes : (galleryRes.gallery || galleryRes.data || []);
    renderMembers(members);
    renderNews(news);
    renderGallery(gallery);
  }catch(err){
    console.error('loadAll error', err);
  }
}

// ---------- AUTH FLOW ----------
async function loginHandler(username, password){
  // try admin login first (endpoint /auth/login -> { token })
  try {
    const r = await apiPOST('/auth/login', { user: username, pass: password });
    if(r.ok && r.body && r.body.token){
      const userObj = { username: 'ADMIN 🦈', role: 'admin', adminToken: r.body.token };
      saveCurrentUser(userObj);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      alert('Успішний вхід як Адмін');
      return;
    }
  } catch(e){
    // ignore admin attempt errors and try normal user
    console.debug('admin login attempt failed', e);
  }

  // normal user login -> POST /api/login { username, password } -> { ok:true, user:{ username, role } }
  try{
    const r = await apiPOST('/api/login', { username, password });
    if(r.ok && r.body && (r.body.ok || r.body.user)){
      const u = r.body.user || r.body;
      const userObj = { username: u.username, role: u.role || 'member' };
      saveCurrentUser(userObj);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      alert('Успішно увійшли');
      return;
    } else {
      alert('Невірні дані (логін або пароль)');
    }
  }catch(e){
    console.error('user login error', e);
    alert('Помилка логіну');
  }
}

async function registerHandler(username, email, password){
  try{
    const r = await apiPOST('/api/register', { username, email, password });
    if(r.ok && (r.body?.ok || r.body?.user)){
      alert('Зареєстровано. Тепер увійдіть.');
      // switch to login tab if UI supports it
      const tabLogin = document.getElementById('tabLogin');
      if(tabLogin) tabLogin.click();
      return;
    } else {
      alert(r.body?.message || r.body?.error || 'Помилка реєстрації');
    }
  }catch(e){
    console.error('register error', e);
    alert('Помилка реєстрації');
  }
}

// ---------- MEMBER CREATION RULE (1 per user) ----------
async function canUserCreateMember(username){
  // fetch members and check existing owner
  try{
    const res = await apiGET('/api/members');
    const arr = Array.isArray(res) ? res : (res.members || res.data || []);
    return arr.filter(m => m.owner === username).length === 0;
  }catch(e){
    console.error('canUserCreateMember error', e);
    // conservative: disallow when can't verify
    return false;
  }
}

async function addMemberHandler(formData){
  if(!currentUser){ alert('Спочатку увійдіть'); return; }

  const payload = {
    id: Date.now(),
    name: formData.name,
    role: formData.role,
    owner: currentUser.username,
    links: { discord: formData.discord || '', youtube: formData.youtube || '', tg: formData.tg || '' }
  };

  // Admin: post with token
  if(currentUser.role === 'admin'){
    const r = await apiPOST('/api/members', payload, currentUser.adminToken || adminToken);
    if(r.ok){ addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); alert('Учасника додано'); }
    else alert(r.body?.error || 'Помилка при додаванні (admin)');
    return;
  }

  // Non-admin user: enforce frontend limit (1), then POST (server must accept)
  const allowed = await canUserCreateMember(currentUser.username);
  if(!allowed){
    memberLimitWarning.textContent = `Ви вже створили одного учасника.`;
    memberLimitWarning.style.display = 'block';
    return;
  }
  memberLimitWarning.style.display = 'none';

  const r = await apiPOST('/api/members', payload);
  if(r.ok && (r.body?.ok || r.body?.id || r.status === 201)){
    addMemberForm.reset();
    addMemberModal.classList.remove('show');
    await loadAll();
    alert('Учасника додано (на сервер)');
  } else {
    // server might require auth — inform user
    console.warn('add member response', r);
    alert(r.body?.error || 'Сервер відхилив запит на додавання. Попросіть адміна або перевірте сервер.');
  }
}

// ---------- ADMIN DELETES ----------
async function deleteMemberHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити учасника?')) return;
  const r = await apiDELETE(`/api/members/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка видалення');
}
async function deleteNewsHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити новину?')) return;
  const r = await apiDELETE(`/api/news/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка видалення новини');
}
async function deleteGalleryHandler(id){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  if(!confirm('Видалити фото?')) return;
  const r = await apiDELETE(`/api/gallery/${id}`, currentUser.adminToken || adminToken);
  if(r.ok){ await loadAll(); } else alert(r.body?.error || 'Помилка видалення фото');
}

// ---------- ADD NEWS / ADD GALLERY (admin only) ----------
async function addNewsHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const title = (newsTitle?.value || '').trim();
  const date = (newsDate?.value || '').trim();
  const summary = (newsSummary?.value || '').trim();
  if(!title || !date || !summary) return alert('Заповніть всі поля');
  const payload = { id: Date.now(), title, date, summary };
  const r = await apiPOST('/api/news', payload, currentUser.adminToken || adminToken);
  if(r.ok){ newsTitle.value=''; newsDate.value=''; newsSummary.value=''; await loadAll(); alert('Подію додано'); } else alert(r.body?.error || 'Помилка при додаванні події');
}
async function addGalleryHandler(){
  if(!(currentUser && currentUser.role === 'admin')){ alert('Тільки адмін'); return; }
  const url = (galleryUrl?.value || '').trim();
  if(!url) return alert('Вкажіть URL');
  const r = await apiPOST('/api/gallery', { id: Date.now(), url }, currentUser.adminToken || adminToken);
  if(r.ok){ galleryUrl.value=''; await loadAll(); alert('Фото додано'); } else alert(r.body?.error || 'Помилка при додаванні фото');
}

// ---------- EVENT DELEGATION ----------
document.addEventListener('click', e=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  if(action === 'delete-member') deleteMemberHandler(id);
  if(action === 'delete-news') deleteNewsHandler(id);
  if(action === 'delete-gallery') deleteGalleryHandler(id);
});

// ---------- FORMS & UI HANDLERS ----------
if(loginForm){
  loginForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const user = (document.getElementById('loginUser')?.value || '').trim();
    const pass = (document.getElementById('loginPass')?.value || '');
    if(!user || !pass) return alert('Вкажіть логін та пароль');
    await loginHandler(user, pass);
  });
}
if(registerForm){
  registerForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const user = (document.getElementById('regUser')?.value || '').trim();
    const email = (document.getElementById('regEmail')?.value || '').trim();
    const pass = (document.getElementById('regPass')?.value || '');
    const pass2 = (document.getElementById('regPassConfirm')?.value || '');
    if(!user || !email || !pass) return alert('Заповніть поля');
    if(pass !== pass2) return alert('Паролі не співпадають');
    await registerHandler(user, email, pass);
  });
}

if(addMemberBtn){
  addMemberBtn.addEventListener('click', async ()=>{
    if(!currentUser) return alert('Увійдіть, щоб додати учасника');
    if(currentUser.role !== 'admin'){
      const ok = await canUserCreateMember(currentUser.username);
      if(!ok){ memberLimitWarning.textContent = `Ви вже створили одного учасника.`; memberLimitWarning.style.display = 'block'; return; }
      memberLimitWarning.style.display = 'none';
    }
    if(addMemberModal) { addMemberModal.classList.add('show'); document.body.style.overflow = 'hidden'; }
  });
}
if(addMemberForm){
  addMemberForm.addEventListener('submit', async ev=>{
    ev.preventDefault();
    const data = {
      name: (memberNewName?.value || '').trim(),
      role: (memberNewRole?.value || '').trim(),
      discord: (memberNewDiscord?.value || '').trim(),
      youtube: (memberNewYoutube?.value || '').trim(),
      tg: (memberNewTg?.value || '').trim()
    };
    if(!data.name || !data.role) return alert('Заповніть імʼя і роль');
    await addMemberHandler(data);
  });
}

// Add news/gallery button handlers
if(addNewsBtn) addNewsBtn.addEventListener('click', addNewsHandler);
if(addGalleryBtn) addGalleryBtn.addEventListener('click', addGalleryHandler);

// Auth/Open button
if(openAuthBtn){
  openAuthBtn.addEventListener('click', ()=>{
    if(currentUser){
      if(confirm('Вийти з акаунту?')){
        clearCurrentUser();
        updateAuthUI();
        loadAll();
      }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });
}

// close member modal
if(closeMemberModal){
  closeMemberModal.addEventListener('click', ()=>{ if(addMemberModal) addMemberModal.classList.remove('show'); if(addMemberForm) addMemberForm.reset(); document.body.style.overflow = 'auto'; });
}

// admin sidebar close
if(closeSidebar) closeSidebar.addEventListener('click', ()=>{ if(adminSidebar) adminSidebar.classList.remove('open'); });
if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', ()=>{
  if(confirm('Ви впевнені, що хочете вийти з адмін-панелі?')){
    clearCurrentUser();
    updateAuthUI();
    if(adminSidebar) adminSidebar.classList.remove('open');
    loadAll();
  }
});

// ---------- PAGE INIT ----------
document.addEventListener('DOMContentLoaded', async ()=>{
  updateAuthUI();
  await loadAll();
});
