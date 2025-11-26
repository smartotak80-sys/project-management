// script.js — клієнт, що працює через Railway API
// ВСТАВ СВІЙ API URL в API_BASE (без кінцевого слеша)
const API_BASE = "https://YOUR_RAILWAY_URL"; // <--- заміни тут

// local app keys (client-side): зберігаємо тільки current user (username, role)
const CURRENT_USER_KEY = 'barakuda_current_user';

// helper
function loadLocal(key){ try { const v = localStorage.getItem(key); return v? JSON.parse(v): null } catch(e){return null} }
function saveLocal(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function customConfirm(msg){ return window.confirm(msg); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"'`=/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60;'}[c])); }

// DOM refs (use your existing ids)
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
const memberLimitWarning = document.getElementById('memberLimitWarning');

const addNewsBtn = document.getElementById('addNewsBtn');
const newsTitle = document.getElementById('newsTitle');
const newsDate = document.getElementById('newsDate');
const newsSummary = document.getElementById('newsSummary');

const galleryUrl = document.getElementById('galleryUrl');
const addGalleryBtn = document.getElementById('addGalleryBtn');

let currentUser = loadLocal(CURRENT_USER_KEY);

// ---------- UI updates ----------
function updateAuthUI(){
  if(!authBtnText) return;
  if(currentUser){
    authBtnText.textContent = currentUser.username;
    openAuthBtn.classList.remove('btn-primary');
    openAuthBtn.classList.add('btn-outline');
  } else {
    authBtnText.textContent = 'Вхід';
    openAuthBtn.classList.add('btn-primary');
    openAuthBtn.classList.remove('btn-outline');
  }
}

// ---------- API helpers ----------
async function apiGet(path){ const res = await fetch(API_BASE + path); return res.json(); }
async function apiPost(path, body, token){ 
  const headers = { 'Content-Type':'application/json' };
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
  return res.json();
}
async function apiDelete(path, token){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method:'DELETE', headers });
  return res.json();
}

// ---------- Render functions ----------
function renderMembersList(members){
  if(!membersGrid) return;
  if(!members || members.length===0){ membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
  membersGrid.innerHTML = '';
  members.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'member';
    div.innerHTML = `
      <div class="member-top">
        <div class="info">
          <h3>${escapeHtml(m.name)}</h3>
          <div class="role-badge">${escapeHtml(m.role)}</div>
        </div>
      </div>
      <div class="member-actions">
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-id="${m.id}" data-type="member">Видалити</button>` : '' }
      </div>
    `;
    membersGrid.appendChild(div);
  });
}
function renderNewsList(news){
  if(!newsList) return;
  if(!news || news.length===0){ newsList.innerHTML = '<p class="muted">Немає подій</p>'; return; }
  newsList.innerHTML = '';
  news.slice().reverse().forEach(n=>{
    const el = document.createElement('div');
    el.className = 'news-item';
    el.innerHTML = `
      <strong>${escapeHtml(n.title)}</strong>
      <div class="meta">${escapeHtml(n.date)}</div>
      <p>${escapeHtml(n.summary)}</p>
      <div style="margin-top:8px">
        ${ currentUser && currentUser.role === 'admin' ? `<button class="btn btn-delete" data-id="${n.id}" data-type="news">Видалити</button>` : '' }
      </div>
    `;
    newsList.appendChild(el);
  });
}
function renderGalleryList(gallery){
  if(!galleryGrid) return;
  if(!gallery || gallery.length===0){ galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
  galleryGrid.innerHTML = '';
  gallery.forEach(g=>{
    const d = document.createElement('div');
    d.innerHTML = `<img src="${escapeHtml(g.url)}" alt="gallery photo" style="width:100%;height:150px;object-fit:cover;">
      ${ currentUser && currentUser.role === 'admin' ? `<div style="margin-top:6px"><button class="btn btn-delete" data-id="${g.id}" data-type="gallery">Видалити</button></div>` : '' }`;
    galleryGrid.appendChild(d);
  });
}

// ---------- Load initial data (public GETs) ----------
async function loadAll(){
  try{
    const m = await apiGet('/api/members'); renderMembersList(m.members || []);
    const n = await apiGet('/api/news'); renderNewsList(n.news || []);
    const g = await apiGet('/api/gallery'); renderGalleryList(g.gallery || []);
  }catch(e){
    console.error(e);
    alert('Помилка завантаження даних. Перевір API_BASE.');
  }
}

// ---------- Handlers: clicks for delete (admin only) ----------
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-id]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const type = btn.getAttribute('data-type');
  if(!id || !type) return;
  if(!currentUser || currentUser.role !== 'admin') return alert('Тільки адмін може видаляти.');
  if(!confirm('Впевнені?')) return;
  await apiDelete(`/api/${type}/${id}`, currentUser.adminToken); // adminToken is optional if server requires Bearer
  loadAll();
});

// ---------- Register / Login (client local) ----------
if(registerForm){
  registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;
    if(pass !== passConfirm) return alert('Паролі не співпадають');
    const res = await apiPost('/api/register', { username, email, password: pass });
    if(res.ok) { alert('Зареєстровано. Увійдіть.'); registerForm.reset(); if(document.getElementById('tabLogin')) document.getElementById('tabLogin').click(); } 
    else alert(res.error || 'Помилка');
  });
}
if(loginForm){
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    // First try admin login via /auth/login to get JWT
    const adminLogin = await fetch(API_BASE + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user, pass}) })
      .then(r => r.json()).catch(()=>({ok:false}));
    if(adminLogin && adminLogin.ok && adminLogin.token){
      currentUser = { username: 'ADMIN 🦈', role: 'admin', adminToken: adminLogin.token };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      loadAll();
      alert('Успішний вхід як адмін');
      return;
    }
    // else try normal user login
    const res = await fetch(API_BASE + '/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: user, password: pass }) })
      .then(r=>r.json()).catch(()=>({ok:false}));
    if(res.ok && res.user){
      currentUser = { username: res.user.username, role: res.user.role || 'member' };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      loadAll();
      alert('Вітаю, ' + currentUser.username);
    } else {
      alert('Невірні дані');
    }
  });
}

// ---------- Add news/gallery/member (admin writable) ----------
if(addNewsBtn){
  addNewsBtn.addEventListener('click', async ()=>{
    if(!currentUser || currentUser.role !== 'admin') return alert('Тільки адмін може додавати новини.');
    if(!newsTitle.value || !newsDate.value || !newsSummary.value) return alert('Заповніть усі поля.');
    await apiPost('/api/news', { title: newsTitle.value, date: newsDate.value, summary: newsSummary.value }, currentUser.adminToken);
    newsTitle.value = newsDate.value = newsSummary.value = '';
    loadAll();
  });
}
if(addGalleryBtn){
  addGalleryBtn.addEventListener('click', async ()=>{
    if(!currentUser || currentUser.role !== 'admin') return alert('Тільки адмін може додавати фото.');
    const url = galleryUrl.value.trim();
    if(!url) return alert('Вкажіть URL');
    await apiPost('/api/gallery', { url }, currentUser.adminToken);
    galleryUrl.value = '';
    loadAll();
  });
}

// Add member modal: allow admin to create on server; normal user can create locally (or we can POST to /api/members only if admin)
if(addMemberBtn){
  addMemberBtn.addEventListener('click', ()=>{
    if(!currentUser) return alert('Увійдіть');
    // For admin: open modal and create server-side member
    // For normal user: open modal and create local member by sending to a local-only add (or you can choose to POST to /api/members with owner=currentUser.username if server supports it)
    addMemberModal.classList.add('show');
  });
}
if(addMemberForm){
  addMemberForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('memberNewName').value.trim();
    const role = document.getElementById('memberNewRole').value.trim();
    const discord = document.getElementById('memberNewDiscord').value.trim();
    const youtube = document.getElementById('memberNewYoutube').value.trim();
    const tg = document.getElementById('memberNewTg').value.trim();
    if(!name||!role) return alert('Заповніть імʼя та роль');
    const payload = { id: Date.now(), name, role, owner: currentUser ? currentUser.username : 'guest', links: { discord, youtube, tg } };

    if(currentUser && currentUser.role === 'admin'){
      // admin -> send to server
      await apiPost('/api/members', payload, currentUser.adminToken);
      alert('Учасник додано на сервері');
    } else if(currentUser){
      // regular user -> we can attempt to POST to server only if your server allows owner-based creation, but default server requires admin
      // Here we'll create locally and notify user to ask admin to approve OR you can implement server logic for owner-based creation
      alert('Звичайні користувачі створюють учасника локально (щоб зберегти глобально, попросіть Адміна додати на сервер)');
      // for convenience, create via localStorage fallback (or you can POST to /api/members if server supports)
      const localMembers = JSON.parse(localStorage.getItem('barakuda_members_local') || '[]');
      localMembers.push(payload);
      localStorage.setItem('barakuda_members_local', JSON.stringify(localMembers));
    } else {
      alert('Спочатку увійдіть.');
    }
    addMemberForm.reset();
    addMemberModal.classList.remove('show');
    loadAll();
  });
}

// ---------- Logout / auth button ----------
if(openAuthBtn){
  openAuthBtn.addEventListener('click', ()=>{
    if(currentUser){
      if(currentUser.role === 'admin'){
        // open admin sidebar or confirm logout
        const want = confirm('Вийти з адмін-акаунту?');
        if(want){ currentUser = null; localStorage.removeItem(CURRENT_USER_KEY); updateAuthUI(); loadAll(); }
      } else {
        const want = confirm('Вийти з акаунту?');
        if(want){ currentUser = null; localStorage.removeItem(CURRENT_USER_KEY); updateAuthUI(); loadAll(); }
      }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });
}

// ---------- Init ----------
updateAuthUI();
loadAll();
