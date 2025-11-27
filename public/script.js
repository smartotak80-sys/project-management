document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 

  // --- HELPERS ---
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

  // --- STATE ---
  let members = [];
  let currentUser = loadCurrentUser(); 

  // --- API FETCH FUNCTION ---
  async function apiFetch(url, options = {}) {
      try {
          const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
          const response = await fetch(url, { ...options, headers });
          const data = await response.json();
          if (!response.ok) { 
              // customConfirm(data.message || 'Помилка сервера', true); 
              console.error("API Error:", data);
              return null; 
          }
          return data;
      } catch (error) {
          console.error("Network Error:", error);
          customConfirm("Помилка з'єднання з сервером.", true);
          return null;
      }
  }

  // --- LOAD DATA ---
  async function loadInitialData() {
      // 1. Members
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderMembers(); }
      
      // 2. News
      const n = await apiFetch('/api/news');
      if (n) renderNews(n);
      
      // 3. Gallery
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g);

      // 4. Users Count (для кнопки реєстрації)
      const counts = await apiFetch('/api/users/count');
      if(counts){
          const tabReg = document.getElementById('tabRegister');
          if (tabReg) {
            if (counts.totalUsers >= counts.maxUsers) {
              tabReg.textContent = 'Реєстрація (Закрито)';
              tabReg.disabled = true;
            } else {
              tabReg.textContent = 'Реєстрація';
              tabReg.disabled = false;
            }
          }
          if(document.getElementById('totalUsersSidebar')) document.getElementById('totalUsersSidebar').textContent = counts.totalUsers;
          if(document.getElementById('totalAdminsSidebar')) document.getElementById('totalAdminsSidebar').textContent = counts.totalAdmins;
      }

      // 5. Admin Sidebar Data
      if (currentUser && currentUser.role === 'admin') {
          const users = await apiFetch('/api/users');
          if (users) renderAdminSidebar(users);
      }
      
      updateAuthUI();
  }

  // --- RENDERERS ---

  function renderMembers(filter='') {
    const grid = document.getElementById('membersGrid');
    if(!grid) return;
    
    const list = members.filter(m => (m.name + ' ' + m.role).toLowerCase().includes(filter.toLowerCase()));
    
    if(list.length===0) { grid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
    
    grid.innerHTML = list.map(m => {
      const isOwner = currentUser && currentUser.username === m.owner;
      const isAdmin = currentUser?.role === 'admin';
      
      let socialLinksHtml = '<div class="social-links">';
      if (m.links?.discord) socialLinksHtml += `<span class="social-link"><i class="fa-brands fa-discord"></i></span>`;
      if (m.links?.youtube) socialLinksHtml += `<a href="${m.links.youtube}" target="_blank" class="social-link link-yt"><i class="fa-brands fa-youtube"></i></a>`;
      if (m.links?.tg) socialLinksHtml += `<a href="${m.links.tg}" target="_blank" class="social-link link-tg"><i class="fa-brands fa-telegram"></i></a>`;
      socialLinksHtml += '</div>';

      return `
        <div class="member animated-content">
          <div class="member-top">
            <h3>${m.name}</h3>
            <div class="role-badge">${m.role}</div>
            ${socialLinksHtml}
          </div>
          ${(isOwner || isAdmin) ? 
            `<div class="member-actions admin-only" style="display:flex; gap:10px; margin-top:15px;">
              <button class="btn btn-edit" onclick="window.editMember('${m.id}')"><i class="fa-solid fa-pen"></i> РЕД.</button>
              <button class="btn btn-delete" onclick="window.deleteMember('${m.id}')"><i class="fa-solid fa-trash"></i> ВИД.</button>
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
           <strong>${n.title}</strong><div class="meta">${n.date}</div><p>${n.summary}</p>
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
      
      // Зберігаємо глобально для лайтбоксу
      window.galleryData = list;
      checkAnimate();
  }

  function renderAdminSidebar(users) {
      const el = document.getElementById('userDatabaseSidebar');
      if(!el) return;
      
      el.innerHTML = users.map(u => {
          const isMe = currentUser && u.username === currentUser.username;
          const isOnline = isMe ? true : (Math.random() > 0.4); 
          const statusClass = isOnline ? 'online' : 'offline';
          
          let dateStr = 'Невідомо';
          if (u.regDate) {
              const d = new Date(u.regDate);
              dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
          }

          return `
            <div class="user-card-mini">
                <div class="u-main">
                    <div class="u-avatar-mini ${statusClass}">${u.username[0].toUpperCase()}</div>
                    <div class="u-info">
                        <span class="u-name">${u.username} ${u.role==='admin'?'<i class="fa-solid fa-crown" style="color:#eab308"></i>':''}</span>
                        <span class="u-created"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                    </div>
                </div>
                ${(!isMe && u.role!=='admin') ? `<button class="btn-ban" onclick="window.banUser('${u.username}')"><i class="fa-solid fa-ban"></i></button>` : ''}
            </div>
          `;
      }).join('');
  }

  // --- GLOBAL ACTIONS (Window) ---
  window.editMember = async (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return;
      // Тут можна відкрити модальне вікно редагування, яке ми робили раніше.
      // Для простоти поки залишимо prompt, або підключіть editMemberModal з попереднього коду.
      const newName = prompt("Нове ім'я:", m.name);
      if(newName) {
          await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
          loadInitialData();
      }
  };

  window.deleteMember = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/members/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteNews = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/news/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.deleteGallery = async (id) => customConfirm('Видалити?', async (r)=>{ if(r) { await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); loadInitialData(); } });
  window.banUser = async (u) => customConfirm(`Забанити ${u}?`, async (r)=>{ if(r) { await apiFetch(`/api/users/${u}`, {method:'DELETE'}); loadInitialData(); } });
  
  window.openLightbox = (idx) => {
      const g = window.galleryData || [];
      if(!g[idx]) return;
      const lb = document.getElementById('lightbox');
      if(lb) {
          lb.classList.add('open');
          document.getElementById('lightboxImage').src = g[idx].url;
      }
  };

  // --- AUTH & UI ---
  function updateAuthUI() {
      const btn = document.getElementById('openAuthBtn');
      const txt = document.getElementById('authBtnText');
      if(currentUser) {
          document.body.classList.add('is-logged-in');
          if(currentUser.role === 'admin') document.body.classList.add('is-admin');
          txt.textContent = currentUser.role==='admin' ? 'ADMIN PANEL' : currentUser.username;
          btn.classList.toggle('btn-primary', currentUser.role==='admin');
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
      }
      
      // Кнопка додавання
      const addBtn = document.getElementById('addMemberBtn');
      if(addBtn) {
          if(currentUser) {
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
  }

  // EVENT LISTENERS
  document.getElementById('navToggle')?.addEventListener('click', ()=>document.getElementById('mainNav').classList.toggle('open'));
  document.getElementById('lightboxCloseBtn')?.addEventListener('click', ()=>document.getElementById('lightbox').classList.remove('open'));
  
  // Auth
  document.getElementById('openAuthBtn')?.addEventListener('click', ()=>{
      if(currentUser) {
          if(currentUser.role==='admin') { 
              document.getElementById('adminSidebar').classList.add('open'); 
              apiFetch('/api/users').then(renderAdminSidebar);
          } else {
              customConfirm('Вийти?', (r)=>{ if(r) { removeCurrentUser(); location.reload(); } });
          }
      } else {
          document.getElementById('authModal').classList.add('show');
      }
  });
  
  document.getElementById('closeAuth')?.addEventListener('click', ()=>document.getElementById('authModal').classList.remove('show'));
  document.getElementById('closeSidebar')?.addEventListener('click', ()=>document.getElementById('adminSidebar').classList.remove('open'));
  document.getElementById('adminLogoutBtn')?.addEventListener('click', ()=>{ removeCurrentUser(); location.reload(); });

  // Forms
  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: loginUser.value, password: loginPass.value }) });
      if(res && res.success) {
          saveCurrentUser(res.user);
          location.reload();
      } else {
          customConfirm(res?.message || 'Помилка');
      }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(regPass.value !== regPassConfirm.value) return customConfirm('Паролі різні');
      const res = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({ username: regUser.value, email: regEmail.value, password: regPass.value }) });
      if(res && res.success) {
          customConfirm('Успіх! Увійдіть.');
          location.reload();
      } else {
          customConfirm(res?.message || 'Помилка');
      }
  });

  // Adding Content
  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!currentUser) return;
      const body = {
          name: memberNewName.value,
          role: memberNewRole.value,
          owner: currentUser.username,
          links: { discord: memberNewDiscord.value, youtube: memberNewYoutube.value, tg: memberNewTg.value }
      };
      await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
      document.getElementById('addMemberModal').classList.remove('show');
      loadInitialData();
  });
  
  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.add('show'));
  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));

  // Admin Clock
  setInterval(() => {
    const now = new Date();
    const clock = document.getElementById('adminClock');
    if(clock) clock.textContent = now.toLocaleTimeString('uk-UA', {hour12:false});
  }, 1000);

  // Animation
  const animated = document.querySelectorAll('.animated-content');
  function checkAnimate() {
      animated.forEach(el => { if(el.getBoundingClientRect().top < window.innerHeight) el.classList.add('animate-in'); });
      document.querySelectorAll('.member, .news-item').forEach(el => el.classList.add('animate-in'));
  }
  window.addEventListener('scroll', checkAnimate);

  // Init
  loadInitialData();
});
