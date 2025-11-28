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

      const counts = await apiFetch('/api/users/count');
      if(counts && document.getElementById('statTotalUsers')){
          document.getElementById('statTotalUsers').textContent = counts.totalUsers;
          document.getElementById('statTotalAdmins').textContent = counts.totalAdmins;
          document.getElementById('statTotalNews').textContent = n ? n.length : 0;
          document.getElementById('statTotalGallery').textContent = g ? g.length : 0;
      }

      if (currentUser && currentUser.role === 'admin') {
          const users = await apiFetch('/api/users');
          if (users) renderAdminSidebar(users);
      }
      
      updateAuthUI();
      document.getElementById('year').textContent = new Date().getFullYear();
      checkAnimate();
  }

  function renderMembers(filter='') {
    const grid = document.getElementById('membersGrid');
    if(!grid) return;
    const list = members.filter(m => (m.name + ' ' + m.role).toLowerCase().includes(filter.toLowerCase()));
    
    if(list.length===0) { grid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
    
    grid.innerHTML = list.map(m => {
      const isOwner = currentUser && currentUser.username === m.owner;
      const isAdmin = currentUser?.role === 'admin';
      let links = '';
      if(m.links?.discord) links += `<span class="social-link"><i class="fa-brands fa-discord"></i></span>`;
      if(m.links?.youtube) links += `<a href="${m.links.youtube}" target="_blank" class="social-link"><i class="fa-brands fa-youtube"></i></a>`;
      return `
        <div class="member animated-content">
          <div class="member-top">
            <h3>${m.name}</h3>
            <div class="role-badge">${m.role}</div>
            <div class="social-links">${links}</div>
          </div>
          ${(isOwner || isAdmin) ? 
            `<div class="member-actions admin-only" style="display:flex;">
              <button class="btn btn-edit" onclick="window.editMember('${m.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-delete" onclick="window.deleteMember('${m.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
        </div>
      `;
    }).join('');
    checkAnimate();
  }

  function renderNews(list) {
      const el = document.getElementById('newsList');
      if(!el) return;
      el.innerHTML = list.length ? list.map(n => `
        <div class="news-item animated-content">
           <div style="font-size:12px; color:var(--accent);">${n.date}</div>
           <strong>${n.title}</strong>
           <p>${n.summary}</p>
           <div class="admin-only"><button class="btn btn-delete" onclick="window.deleteNews('${n.id}')">Видалити</button></div>
        </div>`).join('') : '<p class="muted">Немає подій</p>';
      checkAnimate();
  }
  
  function renderGallery(list) {
      const el = document.getElementById('galleryGrid');
      if(!el) return;
      el.innerHTML = list.length ? list.map((g, idx) => `
        <div class="animated-content">
           <img src="${g.url}" onclick="window.openLightbox(${idx})">
           <div class="admin-only"><button class="btn btn-delete" style="width:100%" onclick="window.deleteGallery('${g.id}')">Видалити</button></div>
        </div>`).join('') : '<p class="muted">Пусто</p>';
      window.galleryData = list;
      checkAnimate();
  }

  function renderAdminSidebar(users) {
      const el = document.getElementById('userDatabaseSidebar');
      if(!el) return;
      
      el.innerHTML = users.map(u => {
          const isMe = currentUser && u.username === u.username;
          const isAdmin = u.role === 'admin';
          const isOnline = isMe ? true : (Math.random() > 0.4); 
          const statusClass = isOnline ? 'online' : 'offline';
          const statusText = isOnline ? 'Online' : 'Offline';
          
          let avatarIcon = `<i class="fa-solid fa-user"></i>`;
          let avatarClass = 'u-avatar';
          
          if (isAdmin) {
             avatarIcon = `<i class="fa-solid fa-user-shield"></i>`; 
             avatarClass += ' is-admin-avatar';
          }

          return `
            <div class="user-card-row">
                <div class="${avatarClass}">
                   ${avatarIcon}
                </div>
                
                <div class="u-details-grid">
                    <div class="u-name-row">
                        <span class="u-login">${u.username}</span>
                        <div class="u-status-badge ${statusClass}">
                           <div class="status-dot"></div> ${statusText}
                        </div>
                    </div>
                    <div class="u-sub-info">
                       <i class="fa-solid fa-envelope"></i> ${u.email}
                    </div>
                </div>
                
                ${(!isMe && !isAdmin) ? 
                    `<button class="btn-delete-user" onclick="window.banUser('${u.username}')" title="Видалити акаунт">
                        <i class="fa-solid fa-trash-can"></i>
                     </button>` 
                    : ''}
            </div>
          `;
      }).join('');
  }

  // ACTIONS
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

  document.getElementById('editMemberForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editMemberId').value;
      const body = {
          name: document.getElementById('editMemberName').value,
          role: document.getElementById('editMemberRole').value,
          links: {
              discord: document.getElementById('editMemberDiscord').value,
              youtube: document.getElementById('editMemberYoutube').value,
              tg: document.getElementById('editMemberTg').value
          }
      };
      const res = await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      if(res && res.success) {
          customConfirm("Зміни збережено!", true);
          document.getElementById('editMemberModal').classList.remove('show');
          loadInitialData(); 
      }
  });

  window.deleteMember = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteNews = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteGallery = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.banUser = async (u) => customConfirm(`Видалити акаунт ${u}?`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadInitialData(); } });
  
  window.openLightbox = (idx) => {
      const g = window.galleryData || [];
      if(!g[idx]) return;
      const lb = document.getElementById('lightbox');
      if(lb) { lb.classList.add('open'); document.getElementById('lightboxImage').src = g[idx].url; }
  };

  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      const adminAvatar = document.querySelector('.profile-glitch-avatar');
      
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') {
              document.body.classList.add('is-admin');
              if(adminAvatar) adminAvatar.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
          } else {
               if(adminAvatar) adminAvatar.innerHTML = '<i class="fa-solid fa-user"></i>';
          }
          txt.textContent = currentUser.role==='admin' ? 'PANEL' : currentUser.username;
          btn.classList.toggle('btn-primary', currentUser.role==='admin');
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
      }
      
      const addBtn = document.getElementById('addMemberBtn');
      if(addBtn && currentUser) {
          const myCount = members.filter(m => m.owner === currentUser.username).length;
          if(currentUser.role !== 'admin' && myCount >= MAX_MEMBER_PER_USER) {
              addBtn.disabled = true; 
              addBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ЛІМІТ';
          } else {
              addBtn.disabled = false;
              addBtn.innerHTML = 'Додати учасника';
          }
      }
  }

  // LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('open'));
  document.getElementById('openAuthBtn')?.addEventListener('click', ()=>{
      if(currentUser) {
          if(currentUser.role==='admin') { document.getElementById('adminSidebar').classList.add('open'); apiFetch('/api/users').then(renderAdminSidebar); } 
          else { customConfirm('Вийти?', (r)=>{ if(r) { removeCurrentUser(); location.reload(); } }); }
      } else { document.getElementById('authModal').classList.add('show'); }
  });
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeSidebar')?.addEventListener('click', ()=>document.getElementById('adminSidebar').classList.remove('open'));
  document.getElementById('adminLogoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });
  document.getElementById('closeEditMemberModal')?.addEventListener('click', ()=>document.getElementById('editMemberModal').classList.remove('show'));

  document.getElementById('tabLogin')?.addEventListener('click', (e) => {
      document.getElementById('tabRegister')?.classList.remove('active'); e.target.classList.add('active');
      document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none';
  });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => {
      document.getElementById('tabLogin')?.classList.remove('active'); e.target.classList.add('active');
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
      if(pass !== document.getElementById('regPassConfirm').value) return customConfirm('Паролі різні');
      const res = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({ username: document.getElementById('regUser').value, email: document.getElementById('regEmail').value, password: pass }) });
      if(res && res.success) { customConfirm('Успіх! Увійдіть.'); location.reload(); }
  });

  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!currentUser) return;
      const body = {
          name: document.getElementById('memberNewName').value,
          role: document.getElementById('memberNewRole').value,
          owner: currentUser.username,
          links: { discord: document.getElementById('memberNewDiscord').value, youtube: document.getElementById('memberNewYoutube').value, tg: document.getElementById('memberNewTg').value }
      };
      const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
      if(res && res.success) { customConfirm('Учасника додано!', true); document.getElementById('addMemberModal').classList.remove('show'); loadInitialData(); }
  });
  
  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{
      const body = { title: document.getElementById('newsTitle').value, date: document.getElementById('newsDate').value, summary: document.getElementById('newsSummary').value };
      if (!body.title) return customConfirm('Заповніть!', true);
      const res = await apiFetch('/api/news', { method:'POST', body: JSON.stringify(body) }); 
      if (res && res.success) { customConfirm('Новину додано!', true); loadInitialData(); }
  });
  
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
      const url = document.getElementById('galleryUrl').value;
      if (!url) return customConfirm('Введіть URL!', true);
      const res = await apiFetch('/api/gallery', { method:'POST', body: JSON.stringify({ url }) }); 
      if (res && res.success) { customConfirm('Фото додано!', true); loadInitialData(); }
  });

  document.getElementById('memberSearch')?.addEventListener('input', (e) => { renderMembers(e.target.value); });
  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.add('show'));
  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));
  
  document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.sidebar-content .tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active'); document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
      });
  });

  let sessionTime = 0;
  setInterval(() => {
    sessionTime++;
    const now = new Date();
    if(document.getElementById('adminClock')) document.getElementById('adminClock').textContent = now.toLocaleTimeString('uk-UA', {hour12:false});
    if(document.getElementById('adminDate')) document.getElementById('adminDate').textContent = now.toLocaleDateString('uk-UA');
    if(document.getElementById('adminSession')) document.getElementById('adminSession').textContent = new Date(sessionTime * 1000).toISOString().substr(11, 8);
  }, 1000);

  function checkAnimate() { document.querySelectorAll('.animated-content').forEach(el => { if(el.getBoundingClientRect().top < window.innerHeight - 50) el.classList.add('animate-in'); }); }
  window.addEventListener('scroll', checkAnimate);
  loadInitialData();
});
