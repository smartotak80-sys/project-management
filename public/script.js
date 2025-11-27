// script.js — CUSTOM EDIT MODAL

document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 
  
  // --- HELPERS ---
  function loadCurrentUser(){ try{ return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch(e){ return null; } }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  function removeCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY) }
  
  // Custom Confirm Modal
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

  // --- STATE ---
  let members = [];
  let currentUser = loadCurrentUser(); 

  // --- API ---
  function getAuthHeaders() {
      if (!currentUser) return {};
      return {
          'X-Auth-User': encodeURIComponent(currentUser.username),
          'X-Auth-Role': encodeURIComponent(currentUser.role)
      };
  }

  async function apiFetch(url, options = {}) {
      try {
          const headers = { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers || {}) };
          const response = await fetch(url, { ...options, headers });
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) throw new Error("Server Error");
          const data = await response.json();
          if (!response.ok && response.status !== 401) { customConfirm(data.message || 'Error'); return null; }
          return data;
      } catch (error) {
          console.error(error);
          return null;
      }
  }

  // --- LOAD ---
  async function loadInitialData() {
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderMembers(); }
      
      const n = await apiFetch('/api/news');
      if (n) renderNews(n);
      
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g);

      const counts = await apiFetch('/api/users/count');
      if(counts){
          const tabReg = document.getElementById('tabRegister');
          if (tabReg) {
            if (counts.totalUsers >= counts.maxUsers) {
              tabReg.textContent = 'Реєстрація (Закрито)';
              tabReg.disabled = true;
              tabReg.style.opacity = '0.5';
            } else {
              tabReg.textContent = 'Реєстрація';
              tabReg.disabled = false;
              tabReg.style.opacity = '1';
            }
          }
          if(document.getElementById('totalUsersSidebar')) document.getElementById('totalUsersSidebar').textContent = counts.totalUsers;
      }

      if (currentUser && currentUser.role === 'admin') {
          const users = await apiFetch('/api/users');
          if (users) renderAdminSidebar(users);
      }
      
      updateAddMemberButton();
  }

  function updateAddMemberButton() {
      const btn = document.getElementById('addMemberBtn');
      if (!btn || !currentUser) return;

      if (currentUser.role === 'admin') {
          btn.disabled = false;
          btn.innerHTML = 'Додати учасника';
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          return;
      }

      const myMembersCount = members.filter(m => m.owner === currentUser.username).length;
      
      if (myMembersCount >= MAX_MEMBER_PER_USER) {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-lock"></i> Ліміт (${myMembersCount}/${MAX_MEMBER_PER_USER})`;
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
      } else {
          btn.disabled = false;
          btn.innerHTML = 'Додати учасника';
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
      }
  }

  // --- RENDERERS ---
  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      if (!btn) return;
      
      if (currentUser) {
          txt.textContent = currentUser.role === 'admin' ? 'ADMIN PANEL' : currentUser.username;
          btn.classList.toggle('btn-primary', currentUser.role === 'admin');
          btn.classList.toggle('btn-outline', currentUser.role !== 'admin');
      } else {
          txt.textContent = 'Вхід';
          btn.classList.add('btn-primary');
          btn.classList.remove('btn-outline');
      }
      document.body.classList.toggle('is-logged-in', !!currentUser);
      document.body.classList.toggle('is-admin', currentUser?.role === 'admin');
      updateAddMemberButton();
  }

  function renderMembers(filter='') {
      const grid = document.getElementById('membersGrid');
      if(!grid) return;
      updateAddMemberButton();

      const filtered = members.filter(m => (m.name+m.role).toLowerCase().includes(filter.toLowerCase()));
      if(!filtered.length) { grid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
      
      grid.innerHTML = filtered.map(m => {
          const isOwner = currentUser && currentUser.username === m.owner;
          const isAdmin = currentUser?.role === 'admin';
          let socials = '<div class="social-links">';
          if(m.links?.discord) socials += `<span class="social-link"><i class="fa-brands fa-discord"></i></span>`;
          if(m.links?.youtube) socials += `<a href="${m.links.youtube}" target="_blank" class="social-link link-yt"><i class="fa-brands fa-youtube"></i></a>`;
          if(m.links?.tg) socials += `<a href="${m.links.tg}" target="_blank" class="social-link link-tg"><i class="fa-brands fa-telegram"></i></a>`;
          socials += '</div>';
          
          return `
            <div class="member animated-content">
              <div class="member-top">
                <h3>${m.name}</h3>
                <div class="role-badge">${m.role}</div>
                ${socials}
              </div>
              ${(isOwner || isAdmin) ? `
              <div class="member-actions admin-only" style="display:flex; gap:10px; margin-top:15px; flex-wrap: wrap;">
                  <button class="btn" style="flex:1; border:1px solid #aaa; color:#fff; min-width: 120px;" onclick="window.editMember(${m.id})">
                    <i class="fa-solid fa-pen"></i> РЕДАГУВАТИ
                  </button>
                  <button class="btn btn-delete" style="flex:1; min-width: 120px;" onclick="window.deleteMember(${m.id})">
                    <i class="fa-solid fa-trash"></i> ВИДАЛИТИ
                  </button>
              </div>` : ''}
            </div>`;
      }).join('');
      checkAnimate();
  }

  function renderNews(list) {
      const el = document.getElementById('newsList');
      if(!el) return;
      el.innerHTML = list.length ? list.map(n => `
        <div class="news-item animated-content">
           <strong>${n.title}</strong><div class="meta">${n.date}</div><p>${n.summary}</p>
           <div class="admin-only"><button class="btn btn-delete" onclick="window.deleteNews(${n.id})">Видалити</button></div>
        </div>`).join('') : '<p class="muted">Немає подій</p>';
      checkAnimate();
  }
  
  function renderGallery(list) {
      const el = document.getElementById('galleryGrid');
      if(!el) return;
      el.innerHTML = list.length ? list.map(g => `
        <div class="animated-content">
           <img src="${g.url}" onclick="window.openLightbox('${g.url}')">
           <div class="admin-only"><button class="btn btn-delete" style="width:100%" onclick="window.deleteGallery(${g.id})">Видалити</button></div>
        </div>`).join('') : '<p class="muted">Пусто</p>';
      checkAnimate();
  }

  function renderAdminSidebar(users) {
      const el = document.getElementById('userDatabaseSidebar');
      if(!el) return;
      el.innerHTML = users.map(u => `
        <div class="user-card-mini">
           <div class="u-info"><span class="u-name">${u.username}</span><span class="u-role">${u.role}</span></div>
           ${(currentUser.username !== u.username && u.role!=='admin') ? `<button class="btn-ban" onclick="window.banUser('${u.username}')"><i class="fa-solid fa-ban"></i></button>` : ''}
        </div>`).join('');
  }

  // --- ACTIONS ---
  
  // ФУНКЦІЯ РЕДАГУВАННЯ ЧЕРЕЗ НОВЕ МОДАЛЬНЕ ВІКНО
  window.editMember = (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return;
      
      const modal = document.getElementById('editMemberModal');
      const form = document.getElementById('editMemberForm');
      
      // Заповнюємо поля
      document.getElementById('editMemberId').value = id;
      document.getElementById('editMemberName').value = m.name;
      document.getElementById('editMemberRole').value = m.role;
      document.getElementById('editMemberDiscord').value = m.links?.discord || '';
      document.getElementById('editMemberYoutube').value = m.links?.youtube || '';
      document.getElementById('editMemberTg').value = m.links?.tg || '';

      // Показуємо вікно
      modal.classList.add('show');
  };

  // ОБРОБНИК ЗБЕРЕЖЕННЯ ЗМІН (РЕДАГУВАННЯ)
  const editMemberForm = document.getElementById('editMemberForm');
  if (editMemberForm) {
      editMemberForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const id = document.getElementById('editMemberId').value;
          const newName = document.getElementById('editMemberName').value;
          const newRole = document.getElementById('editMemberRole').value;
          const newDiscord = document.getElementById('editMemberDiscord').value;
          const newYoutube = document.getElementById('editMemberYoutube').value;
          const newTg = document.getElementById('editMemberTg').value;

          const updateData = {
              name: newName.trim(),
              role: newRole.trim(),
              discord: newDiscord,
              youtube: newYoutube,
              tg: newTg
          };

          const res = await apiFetch(`/api/members/${id}`, {
              method: 'PUT',
              body: JSON.stringify(updateData)
          });

          if(res) {
              document.getElementById('editMemberModal').classList.remove('show');
              loadInitialData();
              customConfirm('Учасника оновлено!');
          }
      });
  }
  
  // Закриття вікна редагування
  const closeEditModalBtn = document.getElementById('closeEditMemberModal');
  if(closeEditModalBtn) {
      closeEditModalBtn.addEventListener('click', () => {
          document.getElementById('editMemberModal').classList.remove('show');
      });
  }

  window.deleteMember = async (id) => { customConfirm('Видалити?', async (r)=>{ if(r && await apiFetch(`/api/members/${id}`, {method:'DELETE'})) loadInitialData(); }); };
  window.deleteNews = async (id) => { customConfirm('Видалити?', async (r)=>{ if(r && await apiFetch(`/api/news/${id}`, {method:'DELETE'})) loadInitialData(); }); };
  window.deleteGallery = async (id) => { customConfirm('Видалити?', async (r)=>{ if(r && await apiFetch(`/api/gallery/${id}`, {method:'DELETE'})) loadInitialData(); }); };
  window.banUser = async (u) => { customConfirm('Забанити?', async (r)=>{ if(r && await apiFetch(`/api/users/${u}`, {method:'DELETE'})) loadInitialData(); }); };
  window.openLightbox = (url) => { 
      const lb = document.getElementById('lightbox'); 
      if(lb) { lb.classList.add('open'); document.getElementById('lightboxImage').src = url; } 
  };

  // --- EVENTS ---
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('open'));
  
  // Auth Forms
  document.getElementById('openAuthBtn')?.addEventListener('click', async ()=>{
      if(currentUser) {
          if(currentUser.role==='admin') { document.getElementById('adminSidebar').classList.add('open'); loadInitialData(); }
          else customConfirm('Вийти?', (r)=>{ if(r){ removeCurrentUser(); location.reload(); }});
      } else document.getElementById('authModal').classList.add('show');
  });
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeSidebar')?.addEventListener('click', ()=>document.getElementById('adminSidebar').classList.remove('open'));
  document.getElementById('adminLogoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });

  document.getElementById('tabLogin')?.addEventListener('click', (e)=>{
      e.target.classList.add('active'); document.getElementById('tabRegister').classList.remove('active');
      document.getElementById('loginForm').style.display='block'; document.getElementById('registerForm').style.display='none';
  });
  document.getElementById('tabRegister')?.addEventListener('click', (e)=>{
      if(e.target.disabled) return;
      e.target.classList.add('active'); document.getElementById('tabLogin').classList.remove('active');
      document.getElementById('registerForm').style.display='block'; document.getElementById('loginForm').style.display='none';
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const body = { username: regUser.value, email: regEmail.value, password: regPass.value };
      if(regPass.value!==regPassConfirm.value) return customConfirm('Паролі різні');
      const res = await apiFetch('/api/auth/register', {method:'POST', body:JSON.stringify(body)});
      if(res) { customConfirm('Готово!'); location.reload(); }
  });
  
  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const res = await apiFetch('/api/auth/login', {method:'POST', body:JSON.stringify({username:loginUser.value, password:loginPass.value})});
      if(res && res.success) { saveCurrentUser(res.user); location.reload(); }
  });

  document.getElementById('addNewsBtn')?.addEventListener('click', async ()=>{
      if(await apiFetch('/api/news', {method:'POST', body:JSON.stringify({title:newsTitle.value, date:newsDate.value, summary:newsSummary.value})})) loadInitialData();
  });
  document.getElementById('addGalleryBtn')?.addEventListener('click', async ()=>{
      if(await apiFetch('/api/gallery', {method:'POST', body:JSON.stringify({url:galleryUrl.value})})) loadInitialData();
  });
  
  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>{
      if(!currentUser) return customConfirm('Увійдіть');
      if (currentUser.role !== 'admin') {
          const myMembers = members.filter(m => m.owner === currentUser.username);
          if (myMembers.length >= MAX_MEMBER_PER_USER) {
              return;
          }
      }
      document.getElementById('addMemberModal').classList.add('show');
  });

  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));
  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const body = { name:memberNewName.value, role:memberNewRole.value, discord:memberNewDiscord.value, youtube:memberNewYoutube.value, tg:memberNewTg.value };
      if(await apiFetch('/api/members', {method:'POST', body:JSON.stringify(body)})) {
          document.getElementById('addMemberModal').classList.remove('show');
          loadInitialData();
      }
  });

  const animated = document.querySelectorAll('.animated-content');
  function checkAnimate() {
      animated.forEach(el => { if(el.getBoundingClientRect().top < window.innerHeight) el.classList.add('animate-in'); });
      document.querySelectorAll('.member, .news-item').forEach(el => el.classList.add('animate-in'));
  }
  window.addEventListener('scroll', checkAnimate);

  updateAuthUI();
  loadInitialData();
});
