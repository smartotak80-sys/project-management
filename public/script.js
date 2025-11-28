// public/script.js
document.addEventListener('DOMContentLoaded', () => {
  const TOKEN_KEY = 'barracuda_token';
  const USER_KEY = 'barracuda_user';

  function getToken(){ return localStorage.getItem(TOKEN_KEY); }
  function saveToken(t){ localStorage.setItem(TOKEN_KEY, t); }
  function removeToken(){ localStorage.removeItem(TOKEN_KEY); }

  function getUser(){ try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
  function saveUser(u){ localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function removeUser(){ localStorage.removeItem(USER_KEY); }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  async function apiFetch(url, options = {}) {
    options.headers = { ...(options.headers||{}), 'Content-Type': 'application/json', ...authHeaders() };
    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(()=>null);
      if (!res.ok) {
        const msg = data?.message || 'Server error';
        customConfirm(msg, undefined);
        return null;
      }
      return data;
    } catch (err) {
      customConfirm('Network error', undefined);
      return null;
    }
  }

  function customConfirm(message, callback) {
      const modal = document.getElementById('customConfirmModal');
      const msg = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const isAlert = callback === undefined;

      cancelBtn.style.display = isAlert ? 'none' : 'inline-block';
      okBtn.textContent = isAlert ? 'Зрозуміло' : 'Так';
      msg.textContent = message;
      modal.classList.add('show');

      const cleanup = (res) => {
          modal.classList.remove('show');
          okBtn.onclick = null; cancelBtn.onclick = null;
          if (!isAlert && callback) callback(res);
      };
      okBtn.onclick = () => cleanup(true);
      if(cancelBtn) cancelBtn.onclick = () => cleanup(false);
      document.getElementById('closeConfirmModal').onclick = () => cleanup(false);
  }

  const authBtn = document.getElementById('openAuthBtn');
  const authText = document.getElementById('authBtnText');

  function updateAuthUI() {
    const user = getUser();
    if (user) {
      document.body.classList.add('is-logged-in');
      if (user.role === 'admin') document.body.classList.add('is-admin');
      authText.textContent = 'Кабінет';
      authBtn.onclick = openDashboard;
    } else {
      document.body.classList.remove('is-logged-in', 'is-admin');
      authText.textContent = 'Вхід';
      authBtn.onclick = () => document.getElementById('authModal').classList.add('show');
    }
  }

  let members = [];

  async function loadInitialData() {
    const m = await apiFetch('/api/members');
    if (m) { members = m; renderMembers(); }
    const n = await apiFetch('/api/news');
    if (n) renderNews(n);
    const g = await apiFetch('/api/gallery');
    if (g) renderGallery(g);
    document.getElementById('year').textContent = new Date().getFullYear();
    updateAuthUI();
  }

  function renderMembers(filter='') {
    const grid = document.getElementById('membersGrid');
    const filtered = members.filter(m => (m.name||'').toLowerCase().includes(filter.toLowerCase()) || (m.role||'').toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = filtered.map(m => `
      <div class="member">
        <h3 style="margin:0 0 5px; color:#fff;">${m.name}</h3>
        <div class="role-badge">${m.role}</div>
        <div style="margin-top:15px; font-size:12px; color:#666;">
          ${m.links?.discord ? `<div><i class="fa-brands fa-discord"></i> ${m.links.discord}</div>` : ''}
        </div>
      </div>
    `).join('') || '<p style="color:#888;">Немає учасників.</p>';
  }

  function renderNews(list) {
    const out = document.getElementById('newsList');
    out.innerHTML = list.map(n => `
      <div style="background:#121315; padding:20px; margin-bottom:15px; border-radius:12px; border:1px solid #222; position:relative;">
          <div style="color:var(--accent); font-size:12px; font-weight:bold;">${n.date || ''}</div>
          <h3 style="margin:5px 0 10px; color:#fff;">${n.title}</h3>
          <p style="color:#bbb; font-size:14px; margin:0;">${n.summary}</p>
          ${ (getUser() && getUser().role === 'admin') ? `<button class="btn btn-outline admin-only" style="position:absolute; top:15px; right:15px; padding:5px 10px; font-size:10px;" data-del="${n.id}">DEL</button>` : '' }
      </div>
    `).join('');
    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-del');
      customConfirm('Видалити новину?', async (r) => { if (r) { await apiFetch('/api/news/' + id, { method: 'DELETE' }); loadInitialData(); } });
    }));
  }

  function renderGallery(list) {
    const out = document.getElementById('galleryGrid');
    out.innerHTML = list.map(g => `
      <div>
        <img src="${g.url}" onclick="document.getElementById('lightbox').classList.add('show'); document.getElementById('lightboxImage').src='${g.url}'">
        ${ (getUser() && getUser().role === 'admin') ? `<button class="btn btn-outline admin-only" style="position:absolute; bottom:5px; right:5px; padding:2px 8px; font-size:10px;" data-gdel="${g.id}">DEL</button>` : '' }
      </div>
    `).join('');
    document.querySelectorAll('[data-gdel]').forEach(b => b.addEventListener('click', (e)=>{
      const id = e.currentTarget.getAttribute('data-gdel');
      customConfirm('Видалити фото?', async (r)=>{ if(r){ await apiFetch('/api/gallery/' + id, { method: 'DELETE' }); loadInitialData(); } });
    }));
  }

  // Auth forms
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (res && res.success) {
      saveToken(res.token);
      saveUser(res.user);
      document.getElementById('authModal').classList.remove('show');
      updateAuthUI();
      loadInitialData();
    }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPassConfirm').value;
    if (pass !== pass2) return customConfirm('Паролі не співпадають', undefined);
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: user, email, password: pass }) });
    if (res && res.success) {
      customConfirm('Зареєстровано. Увійдіть.', undefined);
      document.getElementById('tabLogin').click();
    }
  });

  // Dashboard open / close
  window.switchDashTab = (tab) => {
      document.querySelectorAll('.dash-view').forEach(e => e.classList.remove('active'));
      document.querySelectorAll('.dash-nav button').forEach(e => e.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
      const btns = document.querySelectorAll('.dash-nav button');
      if(tab === 'profile') btns[0].classList.add('active');
      if(tab === 'my-member') btns[1].classList.add('active');
      if(tab === 'users') { btns[2].classList.add('active'); loadUsersAdmin(); }
      if(tab === 'stats') { btns[3].classList.add('active'); loadStatsAdmin(); }
  };

  window.openDashboard = function() {
    const u = getUser();
    if (!u) return document.getElementById('authModal').classList.add('show');
    document.getElementById('dashboardModal').classList.add('show');
    document.getElementById('dashUsername').textContent = u.username;
    document.getElementById('dashRole').textContent = u.role === 'admin' ? 'Administrator' : 'Учасник';
    document.getElementById('pLogin').textContent = u.username;
    document.getElementById('pRole').textContent = u.role === 'admin' ? 'Administrator' : 'Учасник';
    document.querySelector('.admin-only-nav').style.display = u.role === 'admin' ? 'block' : 'none';
    loadMyMemberTab();
  };

  function loadMyMemberTab() {
      const container = document.getElementById('myMemberContainer');
      const current = getUser();
      const myMember = members.find(m => m.owner === current?.username);

      if(myMember) {
          container.innerHTML = `
            <div style="background:#151619; padding:25px; border-radius:12px; border:1px solid #333; display:flex; gap:20px; align-items:center;">
                <div style="width:60px; height:60px; background:var(--accent); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff;">
                    <i class="fa-solid fa-user-check"></i>
                </div>
                <div>
                    <h3 style="margin:0; font-size:22px; color:#fff;">${myMember.name}</h3>
                    <p style="margin:5px 0 0; color:#888;">Роль: <span style="color:var(--accent); font-weight:bold;">${myMember.role}</span></p>
                </div>
            </div>
            <button class="btn btn-outline" style="margin-top:20px; border-color:#d33; color:#d33;" onclick="window.deleteMember('${myMember.id}')">
                <i class="fa-solid fa-trash"></i> Видалити персонажа
            </button>
          `;
      } else {
          container.innerHTML = `
            <form id="dashAddMemberForm" style="max-width:400px;">
                <p style="color:#aaa; font-size:13px; margin-bottom:15px;">У вас ще немає персонажа. Створіть його зараз.</p>
                <input type="text" id="dmName" placeholder="Ім'я (IC Name)" required>
                <input type="text" id="dmRole" placeholder="Посада / Ранг" required>
                <div style="margin:15px 0 5px; font-size:12px; color:#666; text-transform:uppercase; font-weight:bold;">Соцмережі (необов'язково)</div>
                <input type="text" id="dmDiscord" placeholder="Discord User#0000">
                <input type="text" id="dmYoutube" placeholder="YouTube Link">
                <button type="submit" class="btn btn-primary full-width">Створити персонажа</button>
            </form>
          `;
          
          document.getElementById('dashAddMemberForm').onsubmit = async (e) => {
              e.preventDefault();
              const body = {
                  name: document.getElementById('dmName').value,
                  role: document.getElementById('dmRole').value,
                  owner: getUser().username,
                  links: { discord: document.getElementById('dmDiscord').value, youtube: document.getElementById('dmYoutube').value }
              };
              const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
              if(res && res.success) {
                  customConfirm('Персонажа створено!', undefined);
                  const m = await apiFetch('/api/members');
                  if(m) { members = m; renderMembers(); loadMyMemberTab(); }
              }
          };
      }
  }

  async function loadUsersAdmin(query = '') {
      const list = document.getElementById('adminUsersList');
      list.innerHTML = '<p style="color:#666;">Завантаження...</p>';
      const users = await apiFetch('/api/users');
      if(!users) return;
      
      const filtered = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()));
      
      list.innerHTML = filtered.map(u => `
        <div class="u-row">
            <div class="u-info">
                <strong>${u.username} ${u.role==='admin' ? '<i class="fa-solid fa-shield-cat" style="color:var(--accent); font-size:12px;"></i>' : ''}</strong>
                <small>${u.email}</small>
            </div>
            ${u.role!=='admin' ? 
              `<button class="btn btn-outline" style="padding:6px 12px; font-size:11px; border-color:#d33; color:#d33;" onclick="window.banUser('${u.username}')">BAN</button>` 
              : '<span style="font-size:10px; opacity:0.5;">ADM</span>'}
        </div>
      `).join('');
  }

  async function loadStatsAdmin() {
      const s = await apiFetch('/api/users/count');
      if(s) {
          document.getElementById('stUsers').textContent = s.totalUsers;
          document.getElementById('stAdmins').textContent = s.totalAdmins;
          document.getElementById('stMembers').textContent = members.length;
      }
  }

  // GLOBAL ACTIONS
  window.deleteMember = async (id) => customConfirm('Видалити персонажа?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); const m = await apiFetch('/api/members'); members=m; renderMembers(); loadMyMemberTab(); } });
  window.deleteNews = async (id) => customConfirm('Видалити новину?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteGallery = async (id) => customConfirm('Видалити фото?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.banUser = async (u) => customConfirm(`Заблокувати користувача ${u}? Це видалить його акаунт і персонажа.`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadUsersAdmin(); } });

  // EVENT LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeDashBtn')?.addEventListener('click', ()=>document.getElementById('dashboardModal').classList.remove('show'));
  document.getElementById('logoutBtn')?.addEventListener('click', ()=>{ removeToken(); removeUser(); location.reload(); });
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('show'));
  
  document.getElementById('memberSearch')?.addEventListener('input', (e) => renderMembers(e.target.value));
  document.getElementById('adminSearchInput')?.addEventListener('input', (e) => loadUsersAdmin(e.target.value));

  document.getElementById('tabLogin')?.addEventListener('click', (e) => {
      e.target.classList.add('active'); document.getElementById('tabRegister').classList.remove('active');
      document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none';
  });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => {
      e.target.classList.add('active'); document.getElementById('tabLogin').classList.remove('active');
      document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block';
  });

  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{ 
     const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value };
     if(body.title) { await apiFetch('/api/news', {method:'POST', body:JSON.stringify(body)}); loadInitialData(); }
  });
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
     const url = document.getElementById('galleryUrl').value;
     if(url) { await apiFetch('/api/gallery', {method:'POST', body:JSON.stringify({url})}); loadInitialData(); }
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value }) });
      if(res && res.success) { saveToken(res.token); saveUser(res.user); location.reload(); } 
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const pass = document.getElementById('regPass').value;
      if(pass !== document.getElementById('regPassConfirm').value) return customConfirm('Паролі не співпадають', undefined);
      
      const res = await apiFetch('/api/auth/register', { 
          method:'POST', 
          body: JSON.stringify({ 
              username: document.getElementById('regUser').value, 
              email: document.getElementById('regEmail').value, 
              password: pass 
          }) 
      });
      if(res && res.success) { customConfirm('Успіх! Увійдіть.', undefined); document.getElementById('tabLogin').click(); }
  });

  loadInitialData();
  updateAuthUI();
});
