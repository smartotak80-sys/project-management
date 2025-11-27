document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 

  // --- HELPERS (Локальне сховище тільки для сесії адміна) ---
  function loadCurrentUser(){ try{ return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch(e){ return null; } }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  function removeCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY) }
  
  // Custom Confirm
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

  // --- API FETCH (Функція для спілкування з сервером) ---
  // Тільки реальний API-виклик. При помилці з'єднання видає попередження.
  async function apiFetch(url, options = {}) {
      try {
          const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
          const response = await fetch(url, { ...options, headers });
          const data = await response.json();
          if (!response.ok) { 
              console.error("API Error:", data);
              // Якщо є повідомлення про помилку від сервера
              customConfirm(data.message || "Помилка сервера. Перевірте логін або статус бекенду.");
              return null; 
          }
          return data;
      } catch (error) {
          console.error("Network Error: Backend is down or unreachable.", error);
          customConfirm("Критична помилка з'єднання з сервером. Переконайтеся, що Node.js сервер запущено.", true);
          return null;
      }
  }

  // --- LOAD DATA (Завантаження даних при старті) ---
  async function loadInitialData() {
      // 1. Members
      const m = await apiFetch('/api/members');
      if (m) { members = m; renderMembers(); } else { members = []; renderMembers(); }
      
      // 2. News
      const n = await apiFetch('/api/news');
      if (n) renderNews(n); else renderNews([]);
      
      // 3. Gallery
      const g = await apiFetch('/api/gallery');
      if (g) renderGallery(g); else renderGallery([]);

      // 4. Users Count
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
          // Оновлення статистики в Адмін-панелі
          if(document.getElementById('statTotalUsers')) document.getElementById('statTotalUsers').textContent = counts.totalUsers;
          if(document.getElementById('statTotalAdmins')) document.getElementById('statTotalAdmins').textContent = counts.totalAdmins;
          // Новини та Галерея
          if(document.getElementById('statTotalNews')) document.getElementById('statTotalNews').textContent = n ? n.length : 0;
          if(document.getElementById('statTotalGallery')) document.getElementById('statTotalGallery').textContent = g ? g.length : 0;
      }

      // 5. Admin Sidebar (Якщо адмін)
      if (currentUser && currentUser.role === 'admin') {
          const users = await apiFetch('/api/users');
          if (users) renderAdminSidebar(users);
      }
      
      updateAuthUI();
      document.getElementById('year').textContent = new Date().getFullYear();
      checkAnimate();
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
      if (m.links?.discord) socialLinksHtml += `<span class="social-link" title="Discord: ${m.links.discord}"><i class="fa-brands fa-discord"></i></span>`;
      if (m.links?.youtube) socialLinksHtml += `<a href="${m.links.youtube}" target="_blank" class="social-link link-yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>`;
      if (m.links?.tg) socialLinksHtml += `<a href="${m.links.tg}" target="_blank" class="social-link link-tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>`;
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

  // --- ОНОВЛЕНИЙ СПИСОК КОРИСТУВАЧІВ (У АДМІН-ПАНЕЛІ) ---
  function renderAdminSidebar(users) {
      const el = document.getElementById('userDatabaseSidebar');
      if(!el) return;
      
      el.innerHTML = users.map(u => {
          const isMe = currentUser && u.username === u.username;
          // Статус Online/Offline (mocked for demo)
          const isOnline = isMe ? true : (Math.random() > 0.4); 
          const statusClass = isOnline ? 'online' : 'offline';
          
          let dateStr = '---';
          if (u.regDate) {
              const d = new Date(u.regDate);
              dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
          }

          return `
            <div class="user-card-row">
                <div class="u-status-indicator ${statusClass}"></div>
                <div class="u-details-grid">
                    <div class="u-field u-login"><i class="fa-solid fa-user"></i> ${u.username}</div>
                    <div class="u-field u-email"><i class="fa-solid fa-envelope"></i> ${u.email}</div>
                    <div class="u-field u-pass"><i class="fa-solid fa-key"></i> ${u.password}</div>
                    <div class="u-meta">
                        <span class="u-role-tag ${u.role}">${u.role.toUpperCase()}</span>
                        <span class="u-date-tag">Рег. ${dateStr}</span>
                    </div>
                </div>
                ${(!isMe && u.role!=='admin') ? 
                    `<button class="btn-ban-row" onclick="window.banUser('${u.username}')" title="Видалити"><i class="fa-solid fa-trash"></i></button>` 
                    : ''}
            </div>
          `;
      }).join('');
  }

  // --- GLOBAL ACTIONS (CRUD OPERATIONS) ---
  window.editMember = async (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return;
      const newName = prompt("Нове ім'я:", m.name);
      if(newName) {
          const res = await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
          if(res && res.success) {
              customConfirm("Зміни збережено.", true);
              loadInitialData(); 
          }
      }
  };

  window.deleteMember = async (id) => customConfirm('Видалити?', async (r)=>{ 
      if(r) { 
          const res = await apiFetch(`/api/members/${id}`, {method:'DELETE'});
          if(res && res.success) {
            customConfirm("Учасника видалено.", true); 
            loadInitialData(); 
          }
      } 
  });
  window.deleteNews = async (id) => customConfirm('Видалити?', async (r)=>{ 
      if(r) { 
          const res = await apiFetch(`/api/news/${id}`, {method:'DELETE'}); 
          if(res && res.success) {
            customConfirm("Новину видалено.", true); 
            loadInitialData(); 
          }
      } 
  });
  window.deleteGallery = async (id) => customConfirm('Видалити?', async (r)=>{ 
      if(r) { 
          const res = await apiFetch(`/api/gallery/${id}`, {method:'DELETE'}); 
          if(res && res.success) {
            customConfirm("Фото видалено.", true); 
            loadInitialData(); 
          }
      } 
  });
  window.banUser = async (u) => customConfirm(`Видалити користувача ${u}?`, async (r)=>{ 
      if(r) { 
          const res = await apiFetch(`/api/users/${u}`, {method:'DELETE'});
          if(res && res.success) {
             customConfirm(`Користувача ${u} видалено.`, true); 
             loadInitialData(); 
          }
      } 
  });
  
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
          txt.textContent = currentUser.role==='admin' ? 'PANEL' : currentUser.username;
          btn.classList.toggle('btn-primary', currentUser.role==='admin');
      } else {
          document.body.classList.remove('is-logged-in', 'is-admin');
          txt.textContent = 'Вхід';
      }
      
      const addBtn = document.getElementById('addMemberBtn');
      if(addBtn) {
          if(currentUser) {
              const myCount = members.filter(m => m.owner === currentUser.username).length;
              if(currentUser.role !== 'admin' && myCount >= MAX_MEMBER_PER_USER) {
                  addBtn.disabled = true; 
                  addBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ЛІМІТ';
                  if(document.getElementById('memberLimitWarning')) document.getElementById('memberLimitWarning').style.display = 'block';
                  if(document.getElementById('memberLimitWarning')) document.getElementById('memberLimitWarning').textContent = `Ви можете мати лише ${MAX_MEMBER_PER_USER} учасника. Видаліть існуючого, щоб додати нового.`;
              } else {
                  addBtn.disabled = false;
                  addBtn.innerHTML = 'Додати учасника';
                  if(document.getElementById('memberLimitWarning')) document.getElementById('memberLimitWarning').style.display = 'none';
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

  // Auth Tabs
  document.getElementById('tabLogin')?.addEventListener('click', (e) => {
      document.getElementById('tabRegister')?.classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'none';
  });
  document.getElementById('tabRegister')?.addEventListener('click', (e) => {
      document.getElementById('tabLogin')?.classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
  });


  // Forms (Login/Register)
  document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const loginUser = document.getElementById('loginUser').value;
      const loginPass = document.getElementById('loginPass').value;

      const res = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username: loginUser, password: loginPass }) });
      if(res && res.success) {
          saveCurrentUser(res.user);
          location.reload();
      } 
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const regUser = document.getElementById('regUser').value;
      const regEmail = document.getElementById('regEmail').value;
      const regPass = document.getElementById('regPass').value;
      const regPassConfirm = document.getElementById('regPassConfirm').value;

      if(regPass !== regPassConfirm) return customConfirm('Паролі різні');
      
      const res = await apiFetch('/api/auth/register', { method:'POST', body: JSON.stringify({ username: regUser, email: regEmail, password: regPass }) });
      if(res && res.success) {
          customConfirm('Успіх! Тепер увійдіть використовуючи ваш логін і пароль.');
          // Switch to login tab
          document.getElementById('registerForm').style.display = 'none';
          document.getElementById('loginForm').style.display = 'block';
          document.getElementById('tabRegister')?.classList.remove('active');
          document.getElementById('tabLogin')?.classList.add('active');
          // Clear registration form (optional)
          document.getElementById('regUser').value = '';
          document.getElementById('regEmail').value = '';
          document.getElementById('regPass').value = '';
          document.getElementById('regPassConfirm').value = '';

      }
  });

  // Adding Content (Add Member, News, Gallery)
  document.getElementById('addMemberForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!currentUser) return;
      const body = {
          name: document.getElementById('memberNewName').value,
          role: document.getElementById('memberNewRole').value,
          owner: currentUser.username,
          links: { 
              discord: document.getElementById('memberNewDiscord').value, 
              youtube: document.getElementById('memberNewYoutube').value, 
              tg: document.getElementById('memberNewTg').value 
          }
      };
      const res = await apiFetch('/api/members', { method:'POST', body: JSON.stringify(body) });
      if(res && res.success) {
          customConfirm('Учасника додано!', true);
          document.getElementById('addMemberModal').classList.remove('show');
          loadInitialData();
      }
  });
  
  document.getElementById('addNewsBtn')?.addEventListener('click', async (e)=>{
      const title = document.getElementById('newsTitle').value;
      const date = document.getElementById('newsDate').value;
      const summary = document.getElementById('newsSummary').value;
      if (!title || !date || !summary) return customConfirm('Заповніть усі поля для новини!', true);
      
      const body = { title, date, summary };
      const res = await apiFetch('/api/news', { method:'POST', body: JSON.stringify(body) }); 
      if (res && res.success) {
        customConfirm('Новину додано!', true);
        // Clear inputs
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsDate').value = '';
        document.getElementById('newsSummary').value = '';
        loadInitialData();
      }
  });
  
  document.getElementById('addGalleryBtn')?.addEventListener('click', async (e)=>{
      const url = document.getElementById('galleryUrl').value;
      if (!url) return customConfirm('Введіть посилання на зображення!', true);
      
      const body = { url };
      const res = await apiFetch('/api/gallery', { method:'POST', body: JSON.stringify(body) }); 
      if (res && res.success) {
        customConfirm('Фото додано!', true);
        document.getElementById('galleryUrl').value = '';
        loadInitialData();
      }
  });

  // Search
  document.getElementById('memberSearch')?.addEventListener('input', (e) => { renderMembers(e.target.value); });

  document.getElementById('addMemberBtn')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.add('show'));
  document.getElementById('closeMemberModal')?.addEventListener('click', ()=>document.getElementById('addMemberModal').classList.remove('show'));
  
  // Admin Tabs Logic
  document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.sidebar-content .tab-pane').forEach(p => p.classList.remove('active'));
          
          btn.classList.add('active');
          document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
      });
  });

  // Admin Clock & UI Mocks (System info)
  let sessionTime = 0;
  setInterval(() => {
    const now = new Date();
    const clock = document.getElementById('adminClock');
    const dateDisplay = document.getElementById('adminDate');
    if(clock) clock.textContent = now.toLocaleTimeString('uk-UA', {hour12:false});
    if(dateDisplay) dateDisplay.textContent = now.toLocaleDateString('uk-UA');

    // MOCK for System Info (CPU/MEM/PING) - these values are generated client-side
    sessionTime = (sessionTime || 0) + 1;
    const sessionEl = document.getElementById('adminSession');
    if(sessionEl) {
      const h = Math.floor(sessionTime / 3600);
      const m = Math.floor((sessionTime % 3600) / 60);
      const s = sessionTime % 60;
      sessionEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    const pingEl = document.getElementById('adminPing');
    if(pingEl) {
      const randomPing = Math.floor(Math.random() * (150 - 10 + 1)) + 10;
      pingEl.textContent = `${randomPing}ms`;
      pingEl.style.color = randomPing < 50 ? '#22c55e' : (randomPing < 100 ? '#eab308' : '#ef4444');
    }
    const cpuVal = document.getElementById('cpuVal');
    const cpuBar = document.getElementById('cpuBar');
    const memVal = document.getElementById('memVal');
    const memBar = document.getElementById('memBar');
    if(cpuVal) {
      const cpu = Math.floor(Math.random() * (25 - 5 + 1)) + 5;
      cpuVal.textContent = `${cpu}%`;
      cpuBar.style.width = `${cpu}%`;
    }
    if(memVal) {
      const mem = Math.floor(Math.random() * (50 - 30 + 1)) + 30;
      memVal.textContent = `${mem}%`;
      memBar.style.width = `${mem}%`;
    }
    
  }, 1000);

  // Animation
  const animated = document.querySelectorAll('.animated-content');
  function checkAnimate() {
      animated.forEach(el => { 
          if(el.getBoundingClientRect().top < window.innerHeight - 50) {
              el.classList.add('animate-in');
          } 
      });
  }
  window.addEventListener('scroll', checkAnimate);

  // Init
  loadInitialData();
});
