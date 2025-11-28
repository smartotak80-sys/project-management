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
        showAlert(msg);
        return null;
      }
      return data;
    } catch (err) {
      showAlert('Network error');
      return null;
    }
  }

  function showAlert(msg) {
    // small custom alert using customConfirm as alert
    customConfirm(msg, undefined);
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

  // UI
  const authBtn = document.getElementById('openAuthBtn');
  const authText = document.getElementById('authBtnText');
  const dashModal = document.getElementById('dashboardModal');

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

  // Load data
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

  // Renders
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
    // attach deletes
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

  // Dashboard open / close (simple)
  window.openDashboard = function() {
    const u = getUser();
    if (!u) return document.getElementById('authModal').classList.add('show');
    // show dashboard (you should fill dashboard content)
    if (!document.getElementById('dashboardModal')) return alert('Dashboard not found in DOM (add HTML)');
    document.getElementById('dashboardModal').classList.add('show');
    // fill profile info if you have elements
    const nameEl = document.getElementById('dashUsername');
    if (nameEl) nameEl.textContent = u.username;
  };

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    removeToken(); removeUser(); location.reload();
  });
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('show'));
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));

  // Admin actions
  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{
    const title = document.getElementById('newsTitle').value.trim();
    const date = document.getElementById('newsDate').value;
    const summary = document.getElementById('newsSummary').value.trim();
    if (!title) return;
    await apiFetch('/api/news', { method: 'POST', body: JSON.stringify({ title, date, summary }) });
    loadInitialData();
  });

  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
    const url = document.getElementById('galleryUrl').value.trim();
    if (!url) return;
    await apiFetch('/api/gallery', { method: 'POST', body: JSON.stringify({ url }) });
    loadInitialData();
  });

  // Search
  document.getElementById('memberSearch')?.addEventListener('input', (e)=>renderMembers(e.target.value));

  loadInitialData();
  updateAuthUI();
});
