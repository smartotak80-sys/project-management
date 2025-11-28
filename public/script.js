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
      okBtn.textContent = isAlert ? 'ОК' : 'Так';
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
      
      // Highlight btn
      const btnMap = { 'profile':0, 'my-member':1, 'users':2, 'stats':3 }; // approximate
      const navBtns = document.querySelectorAll('.dash-nav button');
      // Simple loop to find match text or icon could be better, but simple index for now:
      // Just manually managing active class in HTML click handlers is often easier or querySelector
      if(tab==='profile') navBtns[0].classList.add('active');
      if(tab==='my-member') navBtns[1].classList.add('active');
      if(tab==='users') { loadUsersAdmin(); }
      if(tab==='stats') { loadStatsAdmin(); }
  };

  function openDashboard() {
      if(!currentUser) return;
      dashModal.classList.add('show');
      document.getElementById('dashUsername').textContent = currentUser.username;
      document.getElementById('dashRole').textContent = currentUser.role;
      
      // Fill Profile Tab
      document.getElementById('pLogin').textContent = currentUser.username;
      document.getElementById('pRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Учасник';
      document.getElementById('pDate').textContent = new Date().toLocaleDateString(); // Mock date if not saved locally

      // Admin Nav Visibility
      document.querySelector('.admin-only-nav').style.display = currentUser.role === 'admin' ? 'block' : 'none';

      // Load My Member Tab
      loadMyMemberTab();
  }

  function loadMyMemberTab() {
      const container = document.getElementById('myMemberContainer');
      const myMember = members.find(m => m.owner === currentUser.username);
      
      if(myMember) {
          // SHOW MEMBER CARD (Cannot add more)
          container.innerHTML = `
            <div class="dash-limit-msg" style="text-align:left; display:flex; gap:20px; align-items:center;">
                <div style="font-size:40px; color:var(--accent);"><i class="fa-solid fa-user-check"></i></div>
                <div>
                    <h3>${myMember.name}</h3>
                    <p class="muted">Роль: ${myMember.role}</p>
                    <div style="margin-top:10px;">
                        <button class="btn btn-outline" onclick="window.deleteMember('${myMember.id}')">Видалити персонажа</button>
                    </div>
                </div>
            </div>
            <p style="margin-top:20px; color:#555; text-align:center;">У вас вже є 1 персонаж (Ліміт).</p>
          `;
      } else {
          // SHOW ADD FORM
          container.innerHTML = `
            <form id="dashAddMemberForm" class="dash-form">
                <h3>Створити персонажа</h3>
                <input type="text" id="dmName" placeholder="Ім'я (IC Name)" required>
                <input type="text" id="dmRole" placeholder="Посада / Ранг" required>
                <label style="font-size:12px; color:#666;">Соціальні мережі</label>
                <input type="text" id="dmDiscord" placeholder="Discord">
                <input type="text" id="dmYoutube" placeholder="YouTube">
                <button type="submit" class="btn btn-primary full-width">Створити</button>
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
                  // Reload members and refresh tab
                  const m = await apiFetch('/api/members');
                  if(m) { members = m; renderPublicMembers(); loadMyMemberTab(); }
              }
          };
      }
  }

  async function loadUsersAdmin() {
      const list = document.getElementById('adminUsersList');
      list.innerHTML = '<p class="muted">Завантаження...</p>';
      const users = await apiFetch('/api/users');
      if(!users) return;
      list.innerHTML = users.map(u => `
        <div class="u-row">
            <div>
                <strong>${u.username}</strong> <span style="font-size:11px; color:#666;">(${u.email})</span>
                <div style="font-size:10px; color:#444;">Role: ${u.role}</div>
            </div>
            ${u.role!=='admin' ? `<button class="btn-outline" style="padding:5px 10px; font-size:11px; border-color:#d33; color:#d33;" onclick="window.banUser('${u.username}')">BAN</button>` : ''}
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
  function renderPublicMembers() {
      const grid = document.getElementById('membersGrid');
      grid.innerHTML = members.map(m => `
        <div class="card">
            <h3>${m.name}</h3>
            <div style="color:var(--accent); font-size:12px; margin-bottom:10px;">${m.role}</div>
            <div style="font-size:12px; color:#666;">
                ${m.links?.discord ? `<i class="fa-brands fa-discord"></i> ${m.links.discord}` : ''}
            </div>
        </div>
      `).join('');
  }
  
  function renderNews(list) { document.getElementById('newsList').innerHTML = list.map(n => `<div style="background:#151619; padding:15px; margin-bottom:10px; border-radius:8px;"><strong>${n.title}</strong><br><small>${n.date}</small><p>${n.summary}</p><button class="btn btn-outline admin-only" onclick="window.deleteNews('${n.id}')">Del</button></div>`).join(''); }
  function renderGallery(list) { document.getElementById('galleryGrid').innerHTML = list.map(g => `<div><img src="${g.url}" style="width:100%; border-radius:8px;"><button class="btn btn-outline admin-only" onclick="window.deleteGallery('${g.id}')">Del</button></div>`).join(''); }

  // --- AUTH & INIT ---
  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') document.body.classList.add('is-admin');
          txt.textContent = 'Кабінет'; // Button now says "Cabinet"
          btn.onclick = openDashboard; // Opens Dashboard instead of Modal
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
          btn.onclick = () => document.getElementById('authModal').classList.add('show');
      }
  }

  // GLOBAL ACTIONS
  window.deleteMember = async (id) => customConfirm('Видалити персонажа?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); const m = await apiFetch('/api/members'); members=m; renderPublicMembers(); loadMyMemberTab(); } });
  window.deleteNews = async (id) => customConfirm('Del?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); location.reload(); } });
  window.deleteGallery = async (id) => customConfirm('Del?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); location.reload(); } });
  window.banUser = async (u) => customConfirm(`BAN ${u}?`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadUsersAdmin(); } });

  // EVENT LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeDashBtn')?.addEventListener('click', ()=>dashModal.classList.remove('show'));
  document.getElementById('logoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });

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
      if(res && res.success) { customConfirm('Успіх! Тепер увійдіть.', true); document.getElementById('tabLogin').click(); }
  });

  // News/Gallery adds (Admin only, outside dash for now or hook later)
  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{
     const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value };
     if(body.title) { await apiFetch('/api/news', {method:'POST', body:JSON.stringify(body)}); location.reload(); }
  });
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
     const url = document.getElementById('galleryUrl').value;
     if(url) { await apiFetch('/api/gallery', {method:'POST', body:JSON.stringify({url})}); location.reload(); }
  });

  loadInitialData();
});
