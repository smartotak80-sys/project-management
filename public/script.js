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
      if(tab === 'admin-members') { btns[2].classList.add('active'); loadAdminMembers(); } // NEW ADMIN MEMBERS TAB
      if(tab === 'users') { btns[3].classList.add('active'); loadUsersAdmin(); } 
      if(tab === 'stats') { btns[4].classList.add('active'); loadStatsAdmin(); }
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
            <button class="btn btn-outline" style="margin-top:20px; border-color:#d33; color:#d33;" onclick="window.deleteMember('${myMember.id}')">
                <i class="fa-solid fa-trash"></i> Видалити персонажа
            </button>
          `;
      } else {
          // Форма створення
          // Updated form structure for two columns and better spacing (mirrors index.html fix)
          container.innerHTML = `
            <form id="dashAddMemberForm" style="max-width:400px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <p style="color:#aaa; font-size:13px; margin:0 0 10px; grid-column: 1 / -1;">У вас ще немає персонажа. Створіть його зараз.</p>
                <input type="text" id="dmName" placeholder="Ім'я (IC Name)" required>
                <input type="text" id="dmRole" placeholder="Посада / Ранг" required>
                <div style="margin:5px 0 0; font-size:12px; color:#666; text-transform:uppercase; font-weight:bold; grid-column: 1 / -1;">Соцмережі (необов'язково)</div>
                <input type="text" id="dmDiscord" placeholder="Discord User#0000">
                <input type="text" id="dmYoutube" placeholder="YouTube Link">
                <button type="submit" class="btn btn-primary full-width" style="margin-top:15px; grid-column: 1 / -1;">Створити персонажа</button>
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

  // --- ADMIN MEMBERS MANAGEMENT FUNCTIONS ---
  async function loadAdminMembers() {
      const list = document.getElementById('adminMembersList');
      list.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Завантаження учасників...</p>';
      const m = await apiFetch('/api/members');
      if (m) { 
          members = m; 
          renderAdminMembersList(); 
      }
  }

  function renderAdminMembersList(query = '') {
      const list = document.getElementById('adminMembersList');
      const filtered = members.filter(m => 
          m.name.toLowerCase().includes(query.toLowerCase()) || 
          m.role.toLowerCase().includes(query.toLowerCase()) || 
          m.owner.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filtered.length === 0) {
          list.innerHTML = `<p style="color:#666; text-align:center; padding:20px;">Учасників не знайдено.</p>`;
          return;
      }

      list.innerHTML = filtered.map(m => `
          <div class="u-row member-admin-row" data-id="${m.id}" style="align-items:center;">
              <div class="u-info" style="flex-grow:1;">
                  <strong class="member-name-${m.id}">${m.name}</strong>
                  <small class="member-role-${m.id}">${m.role} | Власник: ${m.owner}</small>
              </div>
              <div class="u-actions" style="display:flex; gap:10px;">
                  <button class="btn btn-outline" style="padding:6px 12px; font-size:11px; border-radius:8px;" onclick="window.openEditMemberModal('${m.id}')">Редагувати</button>
                  <button class="btn btn-primary" style="padding:6px 12px; font-size:11px; background:linear-gradient(135deg, #d33, #a00); border-radius:8px;" onclick="window.deleteMemberAdmin('${m.id}', '${m.name}')">Видалити</button>
              </div>
          </div>
          <div id="editForm-${m.id}" style="display:none; background:#1e1e1e; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #444;">
              <form id="editFormInner-${m.id}" onsubmit="window.saveMemberEdit(event, '${m.id}')" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  <input type="text" name="name" placeholder="Ім'я" value="${m.name}" required style="flex-grow:1; max-width:150px;">
                  <input type="text" name="role" placeholder="Роль" value="${m.role}" required style="flex-grow:1; max-width:150px;">
                  <input type="text" name="discord" placeholder="Discord" value="${m.links?.discord || ''}" style="flex-grow:1; max-width:150px;">
                  <input type="text" name="youtube" placeholder="Youtube" value="${m.links?.youtube || ''}" style="flex-grow:1; max-width:150px;">
                  <button type="submit" class="btn btn-primary" style="padding:10px 15px; font-size:12px;">Зберегти</button>
                  <button type="button" class="btn btn-outline" style="padding:10px 15px; font-size:12px;" onclick="window.closeEditMemberModal('${m.id}')">Скасувати</button>
              </form>
          </div>
      `).join('');
  }

  window.openEditMemberModal = (id) => {
    document.getElementById(`editForm-${id}`).style.display = 'block';
  };

  window.closeEditMemberModal = (id) => {
    document.getElementById(`editForm-${id}`).style.display = 'none';
  };

  window.saveMemberEdit = async (e, id) => {
      e.preventDefault();
      const form = e.target;
      const body = {
          name: form.elements.name.value,
          role: form.elements.role.value,
          links: {
              discord: form.elements.discord.value,
              youtube: form.elements.youtube.value
          }
      };

      const res = await apiFetch(`/api/members/${id}`, { 
          method: 'PUT', 
          body: JSON.stringify(body) 
      });

      if (res && res.success) {
          customConfirm(`Учасника ${body.name} оновлено!`, true);
          window.closeEditMemberModal(id);
          
          // Optimistic update
          const updatedMember = members.find(m => m.id === id);
          if (updatedMember) {
              updatedMember.name = body.name;
              updatedMember.role = body.role;
              updatedMember.links = body.links;
          }
          
          document.querySelector(`.member-name-${id}`).textContent = body.name;
          document.querySelector(`.member-role-${id}`).textContent = body.role;
          
          renderPublicMembers();
      } else if (res) {
          customConfirm(`Помилка: ${res.message}`, true);
      }
  };

  window.deleteMemberAdmin = async (id, name) => customConfirm(`Видалити персонажа ${name}?`, async (r) => { 
      if (r) { 
          const res = await apiFetch(`/api/members/${id}`, { method: 'DELETE' }); 
          if(res && res.success) {
              customConfirm(`Персонажа ${name} видалено!`, true);
              await loadAdminMembers(); 
              renderPublicMembers(); 
          }
      } 
  });
  // --- END ADMIN MEMBERS MANAGEMENT FUNCTIONS ---


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
  document.getElementById('adminMemberSearchInput')?.addEventListener('input', (e) => renderAdminMembersList(e.target.value)); // NEW LISTENER

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
