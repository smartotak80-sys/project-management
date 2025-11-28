document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_USER_KEY = 'barakuda_current_user';
  
  function loadCurrentUser(){ try{ return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch(e){ return null; } }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  function removeCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY) }
  
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
          if (!isAlert) callback(res);
      };
      okBtn.onclick = () => cleanup(true);
      if(cancelBtn) cancelBtn.onclick = () => cleanup(false);
      document.getElementById('closeConfirmModal').onclick = () => cleanup(false);
  }

  let members = [];
  let currentUser = loadCurrentUser(); 
  
  async function apiFetch(url, options = {}) {
      try {
          const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
          const response = await fetch(url, { ...options, headers });
          const data = await response.json();
          if (!response.ok) { 
              customConfirm(data.message || "Помилка сервера.", true);
              return null; 
          }
          return data;
      } catch (error) { return null; }
  }

  async function loadInitialData() {
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderPublicMembers(); }
      
      const n = await apiFetch('/api/news');
      if (n) renderNews(n);
      
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g);
      
      updateAuthUI();
      document.getElementById('year').textContent = new Date().getFullYear();
  }

  // --- DASHBOARD LOGIC ---
  const dashModal = document.getElementById('dashboardModal');
  
  window.switchDashTab = (tab) => {
      document.querySelectorAll('.dash-view').forEach(e => e.classList.remove('active'));
      document.querySelectorAll('.dash-nav button').forEach(e => e.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
      
      // Highlight correct button 
      const btns = document.querySelectorAll('.dash-nav button');
      if(tab === 'profile') btns[0].classList.add('active');
      if(tab === 'my-member') btns[1].classList.add('active');
      if(tab === 'admin-members') { btns[2].classList.add('active'); loadAdminMembers(); } // Учасники
      if(tab === 'users') { btns[3].classList.add('active'); loadUsersAdmin(); } // Користувачі
      if(tab === 'stats') { btns[4].classList.add('active'); loadStatsAdmin(); } // Статистика
  };

  function openDashboard() {
      if(!currentUser) return;
      dashModal.classList.add('show');
      document.getElementById('dashUsername').textContent = currentUser.username;
      document.getElementById('dashRole').textContent = currentUser.role;
      
      document.getElementById('pLogin').textContent = currentUser.username;
      document.getElementById('pRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Учасник';

      document.querySelector('.admin-only-nav').style.display = currentUser.role === 'admin' ? 'block' : 'none';
      loadMyMemberTab();
  }

  function loadMyMemberTab() {
      const container = document.getElementById('myMemberContainer');
      const myMember = members.find(m => m.owner === currentUser.username);
      
      if(myMember) {
          // Вже є персонаж
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
            <button class="btn btn-outline btn-large" style="margin-top:20px; border-color:#d33; color:#d33; min-width: 200px; padding: 12px 20px;" onclick="window.deleteMember('${myMember.id}')">
                <i class="fa-solid fa-trash"></i> Видалити персонажа
            </button>
          `;
      } else {
          // Форма створення (використовуємо display:grid для 2-х колонок)
          container.innerHTML = `
            <form id="dashAddMemberForm" style="max-width:400px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <p style="color:#aaa; font-size:13px; margin:0 0 15px; grid-column: 1 / -1;">У вас ще немає персонажа. Створіть його зараз.</p>
                <input type="text" id="dmName" placeholder="Ім'я (IC Name)" required>
                <input type="text" id="dmRole" placeholder="Посада / Ранг" required>
                <div style="margin:5px 0 0; font-size:12px; color:#666; text-transform:uppercase; font-weight:bold; grid-column: 1 / -1;">Соцмережі (необов'язково)</div>
                <input type="text" id="dmDiscord" placeholder="Discord User#0000">
                <input type="text" id="dmYoutube" placeholder="YouTube Link">
                <button type="submit" class="btn btn-primary full-width btn-large" style="margin-top:15px; grid-column: 1 / -1;">Створити персонажа</button>
            </form>
          `;
          
          document.getElementById('dashAddMemberForm').onsubmit = async (e) => {
              e.preventDefault();
              const body = {
                  name: document.getElementById('dmName').value,
                  role: document.getElementById('dmRole').value,
                  owner: currentUser.username,
                  links: { discord: document.getElementById('dmDiscord').value, youtube: document.getElementById('dmYoutube').value }
              };
              const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
              if(res && res.success) {
                  customConfirm('Персонажа створено!', true);
                  const m = await apiFetch('/api/members');
                  if(m) { members = m; renderPublicMembers(); loadMyMemberTab(); }
              }
          };
      }
  }

  async function loadAdminMembers() {
      // Тут буде логіка завантаження/керування
      const list = document.getElementById('adminMembersList');
      if (list) {
          list.innerHTML = `<p style="color:#666; text-align:center; padding:20px;">Функціонал керування учасниками тут.</p>`;
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

  // --- PUBLIC RENDER ---
  function renderPublicMembers(filter = '') {
      const grid = document.getElementById('membersGrid');
      const filtered = members.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()) || m.role.toLowerCase().includes(filter.toLowerCase()));
      
      grid.innerHTML = filtered.map(m => `
        <div class="member">
            <h3 style="margin:0 0 5px; color:#fff;">${m.name}</h3>
            <div class="role-badge">${m.role}</div>
            <div style="margin-top:15px; font-size:12px; color:#666;">
                ${m.links?.discord ? `<div><i class="fa-brands fa-discord"></i> ${m.links.discord}</div>` : ''}
            </div>
        </div>
      `).join('');
  }
  
  function renderNews(list) { document.getElementById('newsList').innerHTML = list.map(n => `
    <div style="background:#121315; padding:20px; margin-bottom:15px; border-radius:12px; border:1px solid #222; position:relative;">
        <div style="color:var(--accent); font-size:12px; font-weight:bold;">${n.date}</div>
        <h3 style="margin:5px 0 10px; color:#fff;">${n.title}</h3>
        <p style="color:#bbb; font-size:14px; margin:0;">${n.summary}</p>
        <button class="btn btn-outline admin-only" style="position:absolute; top:15px; right:15px; padding:5px 10px; font-size:10px;" onclick="window.deleteNews('${n.id}')">DEL</button>
    </div>`).join(''); 
  }

  function renderGallery(list) { document.getElementById('galleryGrid').innerHTML = list.map(g => `
    <div>
        <img src="${g.url}" onclick="document.getElementById('lightbox').classList.add('show'); document.getElementById('lightboxImage').src='${g.url}'">
        <button class="btn btn-outline admin-only" style="position:absolute; bottom:5px; right:5px; padding:2px 8px; font-size:10px; background:rgba(0,0,0,0.7); border:none;" onclick="window.deleteGallery('${g.id}')">DEL</button>
    </div>`).join(''); 
  }

  // --- UI HANDLERS ---
  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') document.body.classList.add('is-admin');
          txt.textContent = 'Кабінет';
          btn.onclick = openDashboard;
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
          btn.onclick = () => document.getElementById('authModal').classList.add('show');
      }
  }

  // GLOBAL ACTIONS
  window.deleteMember = async (id) => customConfirm('Видалити персонажа?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); const m = await apiFetch('/api/members'); members=m; renderPublicMembers(); loadMyMemberTab(); } });
  window.deleteNews = async (id) => customConfirm('Видалити новину?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteGallery = async (id) => customConfirm('Видалити фото?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.banUser = async (u) => customConfirm(`Заблокувати користувача ${u}? Це видалить його акаунт і персонажа.`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadUsersAdmin(); } });

  // EVENT LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeDashBtn')?.addEventListener('click', ()=>dashModal.classList.remove('show'));
  document.getElementById('logoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('show'));
  
  document.getElementById('memberSearch')?.addEventListener('input', (e) => renderPublicMembers(e.target.value));
  document.getElementById('adminSearchInput')?.addEventListener('input', (e) => loadUsersAdmin(e.target.value));

  document.getElementById('tabLogin')?.addEventListener('click', (e) => {
      e.target.classList.add('active'); document.getElementById('tabRegister').classList.remove('active');
      document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none';
  });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => {
      e.target.classList.add('active'); document.getElementById('tabLogin').classList.remove('active');
      document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block';
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value }) });
      if(res && res.success) { saveCurrentUser(res.user); location.reload(); } 
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const pass = document.getElementById('regPass').value;
      if(pass !== document.getElementById('regPassConfirm').value) return customConfirm('Паролі не співпадають', true);
      
      const res = await apiFetch('/api/auth/register', { 
          method:'POST', 
          body: JSON.stringify({ 
              username: document.getElementById('regUser').value, 
              email: document.getElementById('regEmail').value, 
              password: pass 
          }) 
      });
      if(res && res.success) { customConfirm('Успіх! Увійдіть.', true); document.getElementById('tabLogin').click(); }
  });

  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{
     const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value };
     if(body.title) { await apiFetch('/api/news', {method:'POST', body:JSON.stringify(body)}); loadInitialData(); }
  });
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
     const url = document.getElementById('galleryUrl').value;
     if(url) { await apiFetch('/api/gallery', {method:'POST', body:JSON.stringify({url})}); loadInitialData(); }
  });

  loadInitialData();
});
