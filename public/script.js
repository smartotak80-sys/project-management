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
      const isAlert = callback === undefined; 
      
      if (isAlert) {
          if(cancelBtn) cancelBtn.style.display = 'none';
          if(okBtn) okBtn.textContent = 'Зрозуміло';
      } else {
          if(cancelBtn) cancelBtn.style.display = 'inline-block';
          if(okBtn) okBtn.textContent = 'Так, продовжити';
      }
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
              customConfirm(data.message || "Помилка сервера.", true);
              return null; 
          }
          return data;
      } catch (error) {
          console.error(error);
          return null;
      }
  }

  async function loadInitialData() {
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderMembers(); }
      
      const n = await apiFetch('/api/news');
      if (n) renderNews(n);
      
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g);

      // Оновлення статистики на головній панелі (dashboard)
      const counts = await apiFetch('/api/users/count');
      if(counts && document.getElementById('statDashUsers')){
          document.getElementById('statDashUsers').textContent = counts.totalUsers;
          document.getElementById('statDashNews').textContent = n ? n.length : 0;
      }

      if (currentUser && currentUser.role === 'admin') {
          allUsersData = await apiFetch('/api/users'); 
          if (allUsersData) renderAdminUserList(allUsersData);
      }
      
      updateAuthUI();
      document.getElementById('year').textContent = new Date().getFullYear();
      checkAnimate();
  }

  // --- RENDER FUNCTIONS ---
  function renderMembers(filter='') {
    const grid = document.getElementById('membersGrid');
    if(!grid) return;
    const list = members.filter(m => (m.name + ' ' + m.role).toLowerCase().includes(filter.toLowerCase()));
    if(list.length===0) { grid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
    
    grid.innerHTML = list.map(m => {
      const isOwner = currentUser && currentUser.username === m.owner;
      const isAdmin = currentUser?.role === 'admin';
      
      let links = '';
      if(m.links?.discord) links += `<a href="#" class="social-link"><i class="fa-brands fa-discord"></i></a>`;
      if(m.links?.youtube) links += `<a href="${m.links.youtube}" target="_blank" class="social-link"><i class="fa-brands fa-youtube"></i></a>`;
      if(m.links?.tg) links += `<a href="${m.links.tg}" target="_blank" class="social-link"><i class="fa-brands fa-telegram"></i></a>`;

      const adminControls = (isOwner || isAdmin) ? `
        <div class="member-admin-footer">
           <button class="btn-edit" onclick="window.editMember('${m.id}')" style="color:#fff"><i class="fa-solid fa-pen"></i></button>
           <button class="btn-delete" onclick="window.deleteMember('${m.id}')" style="color:#ff2a2a"><i class="fa-solid fa-trash"></i></button>
        </div>` : '';

      return `
        <div class="member animated-content">
           <div class="member-header"><span class="member-label">Учасник</span><h3 class="member-name">${m.name}</h3></div>
           <div class="member-body">
               <div class="member-role-row"><span class="role-badge">${m.role}</span></div>
               <div class="social-links">${links || '<span class="muted" style="font-size:12px;">Немає зв\'язку</span>'}</div>
           </div>
           ${adminControls}
        </div>
      `;
    }).join('');
    checkAnimate();
  }

  function renderNews(list) {
      const el = document.getElementById('newsTrack');
      if(!el) return;
      if(list.length === 0) { el.innerHTML = '<p class="muted" style="padding: 20px;">Поки немає новин.</p>'; return; }
      el.innerHTML = list.map(n => `
        <article class="news-card animated-content">
            <div class="news-card-image-placeholder"><div class="news-date-badge">${n.date}</div></div>
            <div class="news-card-content">
                <h3>${n.title}</h3><p>${n.summary}</p>
                <div class="news-footer"><div class="admin-only"><button class="btn-delete" onclick="window.deleteNews('${n.id}')" style="color:#ff2a2a;background:none;border:none;cursor:pointer;">Видалити</button></div></div>
            </div>
        </article>`).join('');
      checkAnimate();
  }
  
  function renderGallery(list) {
      const el = document.getElementById('galleryGrid');
      if(!el) return;
      el.innerHTML = list.length ? list.map((g, idx) => `
        <div class="animated-content">
           <img src="${g.url}" onclick="window.openLightbox(${idx})">
           <div class="admin-only"><button class="btn" style="width:100%;margin-top:5px;background:#333;" onclick="window.deleteGallery('${g.id}')">Видалити</button></div>
        </div>`).join('') : '<p class="muted">Пусто</p>';
      window.galleryData = list;
      checkAnimate();
  }

  // --- DASHBOARD ADMIN FUNCTIONS ---
  function renderAdminUserList(users, filter = '') {
      const el = document.getElementById('adminUserList');
      if(!el) return;
      const filtered = users.filter(u => u.username.toLowerCase().includes(filter.toLowerCase()));
      if(filtered.length === 0) { el.innerHTML = '<p class="muted" style="padding:20px;">Нікого не знайдено</p>'; return; }

      el.innerHTML = filtered.map(u => {
          const isMe = currentUser && u.username === u.username;
          const isAdmin = u.role === 'admin';
          return `
            <div class="dash-user-row">
                <div class="dur-info">
                    <div class="dur-avatar">${u.username.substring(0,2).toUpperCase()}</div>
                    <div>
                        <div class="dur-name">${u.username} <span class="dur-role-badge">${u.role}</span></div>
                        <div class="dur-email">${u.email}</div>
                    </div>
                </div>
                <div class="dur-actions">
                     ${(!isMe && !isAdmin) ? `<button onclick="window.banUser('${u.username}')"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div>
          `;
      }).join('');
  }

  // --- ACTIONS ---
  window.editMember = (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return;
      document.getElementById('editMemberId').value = m.id;
      document.getElementById('editMemberName').value = m.name;
      document.getElementById('editMemberRole').value = m.role;
      document.getElementById('editMemberDiscord').value = m.links?.discord || '';
      document.getElementById('editMemberYoutube').value = m.links?.youtube || '';
      document.getElementById('editMemberTg').value = m.links?.tg || '';
      document.getElementById('editMemberModal').classList.add('show');
  };
  
  // Submit handlers for Add/Edit Member, News, Gallery etc. (Same as before)
  document.getElementById('editMemberForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editMemberId').value;
      const body = { name: document.getElementById('editMemberName').value, role: document.getElementById('editMemberRole').value, links: { discord: document.getElementById('editMemberDiscord').value, youtube: document.getElementById('editMemberYoutube').value, tg: document.getElementById('editMemberTg').value } };
      await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      document.getElementById('editMemberModal').classList.remove('show'); loadInitialData();
  });
  
  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!currentUser) return;
      const body = { name: document.getElementById('memberNewName').value, role: document.getElementById('memberNewRole').value, owner: currentUser.username, links: { discord: document.getElementById('memberNewDiscord').value, youtube: document.getElementById('memberNewYoutube').value, tg: document.getElementById('memberNewTg').value } };
      const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
      if(res && res.success) { document.getElementById('addMemberModal').classList.remove('show'); loadInitialData(); }
  });

  window.deleteMember = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteNews = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteGallery = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.banUser = async (u) => customConfirm(`Видалити акаунт ${u}?`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadInitialData(); } });
  window.openLightbox = (idx) => { const lb = document.getElementById('lightbox'); if(lb) { lb.classList.add('open'); document.getElementById('lightboxImage').src = window.galleryData[idx].url; } };

  // --- AUTH & UI LOGIC ---
  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') document.body.classList.add('is-admin');
          txt.textContent = 'Кабінет'; // Change text to Dashboard/Cabinet
          
          // Update Dashboard Info
          document.getElementById('dashUsername').textContent = currentUser.username;
          document.getElementById('dashRole').textContent = currentUser.role;
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
      }
      
      // Update Add Button Limit Logic
      const addBtn = document.getElementById('addMemberBtn');
      if(addBtn && currentUser) {
          const myCount = members.filter(m => m.owner === currentUser.username).length;
          if(currentUser.role !== 'admin' && myCount >= MAX_MEMBER_PER_USER) {
              addBtn.disabled = true; addBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ЛІМІТ'; addBtn.classList.add('btn-disabled-limit');
          } else {
              addBtn.disabled = false; addBtn.innerHTML = 'Додати учасника'; addBtn.classList.remove('btn-disabled-limit');
          }
      }
  }

  // --- EVENT LISTENERS ---
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('open'));
  
  // OPEN DASHBOARD OR LOGIN
  document.getElementById('openAuthBtn')?.addEventListener('click', ()=>{
      if(currentUser) {
          // Open new Full Screen Dashboard
          document.getElementById('dashboardOverlay').classList.add('active');
          if(currentUser.role === 'admin') {
             apiFetch('/api/users').then(data => { allUsersData = data; renderAdminUserList(allUsersData); });
          }
      } else { 
          document.getElementById('authModal').classList.add('show'); 
      }
  });

  // CLOSE DASHBOARD
  document.getElementById('closeDashBtn')?.addEventListener('click', () => {
      document.getElementById('dashboardOverlay').classList.remove('active');
  });

  // DASHBOARD LOGOUT
  document.getElementById('dashLogoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });

  // DASHBOARD TABS NAVIGATION
  const dashTabs = document.querySelectorAll('.dash-nav-btn');
  dashTabs.forEach(btn => {
      btn.addEventListener('click', () => {
          dashTabs.forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
          
          btn.classList.add('active');
          const target = btn.getAttribute('data-target');
          document.getElementById(target).classList.add('active');
          document.getElementById('dashPageTitle').textContent = btn.innerText.trim();
      });
  });
  
  // Auth Form Listeners
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('tabLogin')?.addEventListener('click', (e) => { document.getElementById('tabRegister')?.classList.remove('active'); e.target.classList.add('active'); document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => { document.getElementById('tabLogin')?.classList.remove('active'); e.target.classList.add('active'); document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; });
  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value }) }); if(res && res.success) { saveCurrentUser(res.user); location.reload(); } });
  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const pass = document.getElementById('regPass').value; if(pass !== document.getElementById('regPassConfirm').value) return customConfirm('Паролі різні'); const res = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({ username: document.getElementById('regUser').value, email: document.getElementById('regEmail').value, password: pass }) }); if(res && res.success) { customConfirm('Успіх! Увійдіть.'); location.reload(); } });

  // Add Member Modal
  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.add('show'));
  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));
  document.getElementById('closeEditMemberModal')?.addEventListener('click', ()=>document.getElementById('editMemberModal').classList.remove('show'));

  // Add News/Gallery Listeners
  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{ const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value }; const res = await apiFetch('/api/news', { method:'POST', body: JSON.stringify(body) }); if (res && res.success) { loadInitialData(); }});
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{ const url = document.getElementById('galleryUrl').value; const res = await apiFetch('/api/gallery', { method:'POST', body: JSON.stringify({ url }) }); if (res && res.success) { loadInitialData(); }});

  // Search Listeners
  document.getElementById('memberSearch')?.addEventListener('input', (e) => { renderMembers(e.target.value); });
  document.getElementById('adminUserSearch')?.addEventListener('input', (e) => { renderAdminUserList(allUsersData, e.target.value); });

  // News Slider Logic
  const newsTrack = document.getElementById('newsTrack');
  const newsPrevBtn = document.getElementById('newsPrevBtn');
  const newsNextBtn = document.getElementById('newsNextBtn');
  if (newsTrack && newsPrevBtn && newsNextBtn) {
      const scrollAmount = 400;
      newsNextBtn.addEventListener('click', () => { newsTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
      newsPrevBtn.addEventListener('click', () => { newsTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
  }

  function checkAnimate() { document.querySelectorAll('.animated-content').forEach(el => { if(el.getBoundingClientRect().top < window.innerHeight - 50) el.classList.add('animate-in'); }); }
  window.addEventListener('scroll', checkAnimate);
  loadInitialData();
});
