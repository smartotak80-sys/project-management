document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 

  function loadCurrentUser(){ try{ return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch(e){ return null; } }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  function removeCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY) }
  
  function customConfirm(message, callback) {
      const modal = document.getElementById('customConfirmModal');
      const msg = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      
      if (callback === undefined) { // Alert mode
          cancelBtn.style.display = 'none'; okBtn.textContent = 'OK';
          okBtn.onclick = () => { modal.classList.remove('show'); };
      } else { // Confirm mode
          cancelBtn.style.display = 'inline-block'; okBtn.textContent = 'Так';
          okBtn.onclick = () => { modal.classList.remove('show'); callback(true); };
          cancelBtn.onclick = () => { modal.classList.remove('show'); callback(false); };
      }
      msg.textContent = message;
      modal.classList.add('show');
  }
  window.customConfirm = customConfirm;

  let members = [];
  let currentUser = loadCurrentUser(); 
  let allUsersData = [];

  async function apiFetch(url, options = {}) {
      try {
          const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
          const response = await fetch(url, { ...options, headers });
          const data = await response.json();
          if (!response.ok) { 
              customConfirm(data.message || "Помилка.", undefined);
              return null; 
          }
          return data;
      } catch (error) { return null; }
  }

  async function loadInitialData() {
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderMembers(); }
      const n = await apiFetch('/api/news');
      if (n) renderNews(n);
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g);
      const counts = await apiFetch('/api/users/count');
      if(counts && document.getElementById('statDashUsers')) {
           document.getElementById('statDashUsers').textContent = counts.totalUsers;
      }
      if (currentUser && currentUser.role === 'admin') {
          allUsersData = await apiFetch('/api/users'); 
          if (allUsersData) renderAdminUserList(allUsersData);
      }
      updateAuthUI();
      document.getElementById('year').textContent = new Date().getFullYear();
  }

  function renderMembers(filter='') {
    const grid = document.getElementById('membersGrid');
    if(!grid) return;
    const list = members.filter(m => (m.name + ' ' + m.role).toLowerCase().includes(filter.toLowerCase()));
    if(list.length===0) { grid.innerHTML = '<p class="muted">Пусто</p>'; return; }
    
    grid.innerHTML = list.map(m => {
      const isOwner = currentUser && currentUser.username === m.owner;
      const isAdmin = currentUser?.role === 'admin';
      const adminControls = (isOwner || isAdmin) ? `
        <div class="member-admin-footer">
           <button class="btn" style="flex:1" onclick="window.editMember('${m.id}')">Ред.</button>
           <button class="btn" style="flex:1;color:red" onclick="window.deleteMember('${m.id}')">Вид.</button>
        </div>` : '';
      return `
        <div class="member animated-content">
           <div class="member-header"><span class="member-label">Гравець</span><h3 class="member-name">${m.name}</h3></div>
           <div class="member-body">
               <span class="role-badge">${m.role}</span>
               <div style="margin-top:10px;font-size:12px;color:#888">Discord: ${m.links?.discord || '-'}</div>
           </div>
           ${adminControls}
        </div>`;
    }).join('');
  }

  function renderNews(list) {
      const el = document.getElementById('newsTrack');
      if(!el) return;
      el.innerHTML = list.map(n => `
        <div class="news-card animated-content">
            <div class="news-card-image-placeholder"><span class="news-date-badge">${n.date}</span></div>
            <div class="news-card-content"><h3>${n.title}</h3><p>${n.summary}</p>
            <div class="admin-only"><button onclick="window.deleteNews('${n.id}')" style="color:red;background:none;border:none;cursor:pointer">Видалити</button></div></div>
        </div>`).join('');
  }
  
  function renderGallery(list) {
      const el = document.getElementById('galleryGrid');
      if(!el) return;
      el.innerHTML = list.map((g, idx) => `
        <div class="animated-content">
           <img src="${g.url}" onclick="document.getElementById('lightbox').classList.add('open');document.getElementById('lightboxImage').src='${g.url}'">
           <div class="admin-only"><button class="btn" style="width:100%;margin-top:5px" onclick="window.deleteGallery('${g.id}')">X</button></div>
        </div>`).join('');
  }

  function renderAdminUserList(users, filter = '') {
      const el = document.getElementById('adminUserList');
      if(!el) return;
      el.innerHTML = users.filter(u => u.username.includes(filter)).map(u => `
        <div class="dash-user-row">
            <div><strong>${u.username}</strong> <small>(${u.role})</small></div>
            ${(u.role!=='admin')?`<button onclick="window.banUser('${u.username}')" style="color:red;background:none;border:none">Ban</button>`:''}
        </div>`).join('');
  }

  window.editMember = (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return;
      document.getElementById('editMemberId').value = m.id;
      document.getElementById('editMemberName').value = m.name;
      document.getElementById('editMemberRole').value = m.role;
      document.getElementById('editMemberDiscord').value = m.links?.discord || '';
      document.getElementById('editMemberModal').classList.add('show');
  };

  document.getElementById('editMemberForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editMemberId').value;
      const body = { name: document.getElementById('editMemberName').value, role: document.getElementById('editMemberRole').value, links: { discord: document.getElementById('editMemberDiscord').value } };
      await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      document.getElementById('editMemberModal').classList.remove('show'); loadInitialData();
  });
  
  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!currentUser) return;
      const body = { name: document.getElementById('memberNewName').value, role: document.getElementById('memberNewRole').value, owner: currentUser.username, links: { discord: document.getElementById('memberNewDiscord').value } };
      const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
      if(res && res.success) { document.getElementById('addMemberModal').classList.remove('show'); loadInitialData(); }
  });
  
  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{ const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value }; await apiFetch('/api/news', { method:'POST', body: JSON.stringify(body) }); loadInitialData(); });
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{ const url = document.getElementById('galleryUrl').value; await apiFetch('/api/gallery', { method:'POST', body: JSON.stringify({ url }) }); loadInitialData(); });

  window.deleteMember = async(id)=>customConfirm('Видалити?', async(r)=>{if(r) {await apiFetch(`/api/members/${id}`, {method:'DELETE'}); loadInitialData();}});
  window.deleteNews = async(id)=>customConfirm('Видалити?', async(r)=>{if(r) {await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData();}});
  window.deleteGallery = async(id)=>customConfirm('Видалити?', async(r)=>{if(r) {await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData();}});
  window.banUser = async(u)=>customConfirm('BAN?', async(r)=>{if(r) {await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadInitialData();}});

  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') document.body.classList.add('is-admin');
          txt.textContent = 'Кабінет';
          document.getElementById('dashUsername').textContent = currentUser.username;
          document.getElementById('dashRole').textContent = currentUser.role;
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
      }
      const addBtn = document.getElementById('addMemberBtn');
      if(addBtn && currentUser) {
          const myCount = members.filter(m => m.owner === currentUser.username).length;
          if(currentUser.role !== 'admin' && myCount >= MAX_MEMBER_PER_USER) {
              addBtn.disabled = true; addBtn.innerHTML = 'ЛІМІТ (1)'; addBtn.style.opacity = 0.5;
          } else {
              addBtn.disabled = false; addBtn.innerHTML = 'Додати себе'; addBtn.style.opacity = 1;
          }
      }
  }

  // EVENT LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('open'));
  document.getElementById('openAuthBtn')?.addEventListener('click', ()=>{ if(currentUser) { document.getElementById('dashboardOverlay').classList.add('active'); if(currentUser.role==='admin') apiFetch('/api/users').then(d=>renderAdminUserList(d)); } else { document.getElementById('authModal').classList.add('show'); } });
  document.getElementById('closeDashBtn')?.addEventListener('click', () => { document.getElementById('dashboardOverlay').classList.remove('active'); });
  document.getElementById('dashLogoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('tabLogin')?.addEventListener('click', (e) => { document.getElementById('tabRegister')?.classList.remove('active'); e.target.classList.add('active'); document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => { document.getElementById('tabLogin')?.classList.remove('active'); e.target.classList.add('active'); document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; });
  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value }) }); if(res && res.success) { saveCurrentUser(res.user); location.reload(); } });
  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const pass = document.getElementById('regPass').value; if(pass !== document.getElementById('regPassConfirm').value) return customConfirm('Паролі різні'); const res = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({ username: document.getElementById('regUser').value, email: document.getElementById('regEmail').value, password: pass }) }); if(res && res.success) { customConfirm('Успіх!', undefined); location.reload(); } });
  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.add('show'));
  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));
  document.getElementById('closeEditMemberModal')?.addEventListener('click', ()=>document.getElementById('editMemberModal').classList.remove('show'));

  // Tabs for Dashboard
  document.querySelectorAll('.dash-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(btn.dataset.target).classList.add('active');
      });
  });

  loadInitialData();
});
