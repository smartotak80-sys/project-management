// script.js — універсальна робоча версія (замініть старий файл цим)
// Підтримує: Railway API (якщо доступний) + локальне збереження як fallback.
// НЕ змінює HTML/CSS (працює з вашою версткою).
(() => {
  // ---------- CONFIG ----------
  const API_BASE = "https://project-management-production-a0ee.up.railway.app"; // змініть, якщо потрібно
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MEMBERS_KEY = 'barakuda_members_v3';
  const NEWS_KEY = 'barakuda_news_v1';
  const GALLERY_KEY = 'barakuda_gallery_v1';
  const USERS_KEY = 'barakuda_users_db';
  const ADMIN_LOGIN_FALLBACK = 'famillybarracuda@gmail.com';
  const ADMIN_PASS_FALLBACK = 'barracuda123';
  const MAX_USERS = 1;
  const MAX_MEMBER_PER_USER = 1;

  // ---------- HELPERS ----------
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));
  function safe(s){ return String(s||'').replace(/[&<>"'`=/]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60'}[ch])); }
  function loadLocal(key, fallback=null){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ console.warn('loadLocal error', e); return fallback; }
  }
  function saveLocal(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){ console.warn('saveLocal', e); }
  }
  function removeLocal(key){ localStorage.removeItem(key); }

  async function apiGET(path){
    try {
      const res = await fetch(API_BASE + path);
      if(!res.ok) throw res;
      return await res.json();
    } catch(e){ throw e; }
  }
  async function apiPOST(path, body, token){
    try {
      const headers = {'Content-Type':'application/json'};
      if(token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(API_BASE + path, { method:'POST', headers, body: JSON.stringify(body) });
      const json = await res.json().catch(()=>({ ok:false, status: res.status }));
      return { ok: res.ok, status: res.status, body: json };
    } catch(e){ return { ok:false, error: e }; }
  }
  async function apiDELETE(path, token){
    try {
      const headers = {};
      if(token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(API_BASE + path, { method:'DELETE', headers });
      const json = await res.json().catch(()=>({ ok:false, status: res.status }));
      return { ok: res.ok, status: res.status, body: json };
    } catch(e){ return { ok:false, error: e }; }
  }

  // ---------- DOM refs (згідно з index.html) ----------
  const membersGrid = q('#membersGrid');
  const newsList = q('#newsList');
  const galleryGrid = q('#galleryGrid');

  const openAuthBtn = q('#openAuthBtn');
  const authBtnText = q('#authBtnText');
  const authModal = q('#authModal');
  const loginForm = q('#loginForm');
  const registerForm = q('#registerForm');
  const tabLogin = q('#tabLogin');
  const tabRegister = q('#tabRegister');

  const addMemberBtn = q('#addMemberBtn');
  const addMemberModal = q('#addMemberModal');
  const addMemberForm = q('#addMemberForm');
  const memberNewName = q('#memberNewName');
  const memberNewRole = q('#memberNewRole');
  const memberNewDiscord = q('#memberNewDiscord');
  const memberNewYoutube = q('#memberNewYoutube');
  const memberNewTg = q('#memberNewTg');
  const memberLimitWarning = q('#memberLimitWarning');

  const addNewsBtn = q('#addNewsBtn');
  const newsTitle = q('#newsTitle');
  const newsDate = q('#newsDate');
  const newsSummary = q('#newsSummary');

  const galleryUrl = q('#galleryUrl');
  const addGalleryBtn = q('#addGalleryBtn');

  const adminSidebar = q('#adminSidebar');
  const closeSidebar = q('#closeSidebar');
  const adminLogoutBtn = q('#adminLogoutBtn');
  const userDatabaseSidebar = q('#userDatabaseSidebar');
  const totalUsersSidebar = q('#totalUsersSidebar');
  const totalAdminsSidebar = q('#totalAdminsSidebar');

  // confirm modal (you have customConfirm in previous scripts — reimplement lightweight if not present)
  function showAlert(msg){ customConfirm ? customConfirm(msg) : alert(msg); }

  // ---------- State ----------
  let currentUser = loadLocal(CURRENT_USER_KEY, null);
  let adminToken = currentUser?.adminToken || null;

  // local fallback storage initialization (if server down)
  function ensureLocalData(){
    if(loadLocal(MEMBERS_KEY, null) === null) saveLocal(MEMBERS_KEY, []);
    if(loadLocal(NEWS_KEY, null) === null) saveLocal(NEWS_KEY, []);
    if(loadLocal(GALLERY_KEY, null) === null) saveLocal(GALLERY_KEY, []);
    if(loadLocal(USERS_KEY, null) === null) saveLocal(USERS_KEY, []);
  }
  ensureLocalData();

  // ---------- UI updates ----------
  function updateAuthUI(){
    if(!authBtnText) return;
    if(currentUser){
      authBtnText.textContent = safe(currentUser.username);
      if(currentUser.role === 'admin'){
        openAuthBtn.classList.remove('btn-outline'); openAuthBtn.classList.add('btn-primary');
        openAuthBtn.style.boxShadow = "0 0 15px var(--accent)";
      } else {
        openAuthBtn.classList.remove('btn-primary'); openAuthBtn.classList.add('btn-outline');
        openAuthBtn.style.boxShadow = "none";
      }
    } else {
      authBtnText.textContent = 'Вхід';
      openAuthBtn.classList.add('btn-primary');
      openAuthBtn.classList.remove('btn-outline');
      openAuthBtn.style.boxShadow = "none";
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    if(addNewsBtn) addNewsBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if(addGalleryBtn) addGalleryBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if(addMemberBtn) addMemberBtn.style.display = currentUser ? 'inline-block' : 'none';
  }

  // ---------- Rendering ----------
  function renderMembers(list){
    if(!membersGrid) return;
    if(!list || list.length === 0){ membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
    const frag = document.createDocumentFragment();
    list.forEach(m=>{
      const el = document.createElement('div');
      el.className = 'member animated-content';
      el.dataset.id = m.id;
      el.innerHTML = `
        <div class="member-top">
          <div class="info">
            <h3>${safe(m.name)}</h3>
            <div class="role-badge">${safe(m.role)}</div>
            <div class="social-links">
              ${m.links?.discord ? `<span class="social-link" title="Discord: ${safe(m.links.discord)}"><i class="fa-brands fa-discord"></i></span>` : ''}
              ${m.links?.youtube ? `<a href="${safe(m.links.youtube)}" target="_blank" class="social-link link-yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>` : ''}
              ${m.links?.tg ? `<a href="${safe(m.links.tg)}" target="_blank" class="social-link link-tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>` : ''}
            </div>
          </div>
        </div>
        <div class="member-actions">
          ${ (currentUser && (currentUser.role === 'admin' || currentUser.username === m.owner)) ? `<button class="btn btn-edit" data-action="edit" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Редагувати</button>` : '' }
          ${ (currentUser && (currentUser.role === 'admin' || currentUser.username === m.owner)) ? `<button class="btn btn-delete" data-action="delete" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>` : '' }
        </div>
      `;
      frag.appendChild(el);
    });
    membersGrid.innerHTML = '';
    membersGrid.appendChild(frag);
  }

  function renderNews(list){
    if(!newsList) return;
    if(!list || list.length === 0){ newsList.innerHTML = '<p class="muted">Немає подій</p>'; return; }
    newsList.innerHTML = '';
    [...list].reverse().forEach(n=>{
      const el = document.createElement('div');
      el.className = 'news-item animated-content';
      el.dataset.id = n.id;
      el.innerHTML = `
        <strong>${safe(n.title)}</strong>
        <div class="meta">${safe(n.date)}</div>
        <p>${safe(n.summary)}</p>
        <div style="margin-top:8px">
          ${(currentUser && currentUser.role === 'admin') ? `<button class="btn btn-delete" data-action="delete-news" data-id="${n.id}">Видалити</button>` : ''}
        </div>
      `;
      newsList.appendChild(el);
    });
  }

  function renderGallery(list){
    if(!galleryGrid) return;
    if(!list || list.length === 0){ galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
    galleryGrid.innerHTML = '';
    list.forEach(g=>{
      const d = document.createElement('div');
      d.className = 'animated-content';
      d.innerHTML = `
        <img src="${safe(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'">
        ${(currentUser && currentUser.role === 'admin') ? `<div style="margin-top:6px"><button class='btn btn-delete' data-id="${g.id}" data-action="delete-gallery">Видалити</button></div>` : ''}
      `;
      galleryGrid.appendChild(d);
    });
  }

  // ---------- Load data (server first, fallback to local) ----------
  async function loadAll(){
    // try server
    try {
      const [mRes, nRes, gRes] = await Promise.allSettled([
        apiGET('/api/members'),
        apiGET('/api/news'),
        apiGET('/api/gallery')
      ]);
      let membersData, newsData, galleryData;
      if(mRes.status === 'fulfilled' && mRes.value && mRes.value.members) {
        membersData = mRes.value.members;
        saveLocal(MEMBERS_KEY, membersData);
      } else {
        membersData = loadLocal(MEMBERS_KEY, []);
      }
      if(nRes.status === 'fulfilled' && nRes.value && nRes.value.news) {
        newsData = nRes.value.news;
        saveLocal(NEWS_KEY, newsData);
      } else {
        newsData = loadLocal(NEWS_KEY, []);
      }
      if(gRes.status === 'fulfilled' && gRes.value && gRes.value.gallery) {
        galleryData = gRes.value.gallery;
        saveLocal(GALLERY_KEY, galleryData);
      } else {
        galleryData = loadLocal(GALLERY_KEY, []);
      }

      renderMembers(membersData);
      renderNews(newsData);
      renderGallery(galleryData);
    } catch(e){
      console.warn('loadAll failed, fallback to local', e);
      renderMembers(loadLocal(MEMBERS_KEY, []));
      renderNews(loadLocal(NEWS_KEY, []));
      renderGallery(loadLocal(GALLERY_KEY, []));
    }
  }

  // ---------- Auth: login/register (server if possible, else local) ----------
  async function loginHandler(username, password){
    username = String(username || '').trim();
    if(!username || !password){ showAlert('Введіть логін і пароль'); return; }
    // try admin route first (server)
    try {
      const adminResp = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ user: username, pass: password })
      });
      const adminData = await adminResp.json().catch(()=>({}));
      if(adminResp.ok && adminData.token){
        currentUser = { username: 'ADMIN 🦈', role: 'admin', adminToken: adminData.token };
        saveLocal(CURRENT_USER_KEY, currentUser);
        adminToken = adminData.token;
        updateAuthUI();
        if(authModal) authModal.classList.remove('show');
        await loadAll();
        showAlert('Успішний вхід як Адмін');
        return;
      }
    } catch(e){
      // ignore, try next
    }

    // try server normal login
    try {
      const res = await fetch(API_BASE + '/api/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok && data.ok && data.user){
        currentUser = { username: data.user.username, role: data.user.role || 'member' };
        saveLocal(CURRENT_USER_KEY, currentUser);
        updateAuthUI();
        if(authModal) authModal.classList.remove('show');
        await loadAll();
        showAlert(`Вітаємо, ${currentUser.username}!`);
        return;
      }
    } catch(e){
      // fallback to local storage
    }

    // fallback: local users DB
    const users = loadLocal(USERS_KEY, []);
    const found = users.find(u => u.username === username && u.password === password);
    if(found){
      currentUser = { username: found.username, role: found.role || 'member' };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      showAlert(`Вітаємо, ${currentUser.username}! (локально)`);
      return;
    }

    // admin fallback credentials (local)
    if(username === ADMIN_LOGIN_FALLBACK && password === ADMIN_PASS_FALLBACK){
      currentUser = { username: 'ADMIN 🦈', role: 'admin' };
      saveLocal(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      await loadAll();
      showAlert('Успішний вхід як Адмін (локально)');
      return;
    }

    showAlert('Невірні дані');
  }

  async function registerHandler(username, email, password){
    username = String(username || '').trim();
    if(!username || !password) return showAlert('Вкажіть логін та пароль');
    // try server register
    try {
      const res = await fetch(API_BASE + '/api/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok && data.ok){
        showAlert('Зареєстровано, тепер увійдіть');
        if(tabLogin) tabLogin.click();
        return;
      }
    } catch(e){ /* continue to local */ }

    // local register fallback
    const users = loadLocal(USERS_KEY, []);
    const regularUsers = users.filter(u => u.role !== 'admin');
    if(regularUsers.length >= MAX_USERS) return showAlert(`Досягнуто ліміту користувачів (${MAX_USERS}).`);
    if(users.find(u => u.username === username)) return showAlert('Логін зайнятий');
    if(users.find(u => u.email === email)) return showAlert('Email вже використовується');

    users.push({ username, email, password, role: 'member', regDate: (new Date()).toISOString() });
    saveLocal(USERS_KEY, users);
    showAlert('Зареєстровано локально — тепер увійдіть');
    if(tabLogin) tabLogin.click();
  }

  // ---------- Member creation (user-limited to 1) ----------
  async function canUserCreateMember(username){
    // try server list
    try {
      const res = await apiGET('/api/members');
      const arr = (res && res.members) ? res.members : loadLocal(MEMBERS_KEY, []);
      const owned = arr.filter(m => m.owner === username).length;
      return owned === 0;
    } catch(e){
      const arr = loadLocal(MEMBERS_KEY, []);
      const owned = arr.filter(m => m.owner === username).length;
      return owned === 0;
    }
  }

  async function addMemberHandler(formData){
    if(!currentUser) return showAlert('Спершу увійдіть в акаунт.');
    const payload = {
      id: Date.now(),
      name: formData.name,
      role: formData.role,
      owner: currentUser.username,
      links: { discord: formData.discord || '', youtube: formData.youtube || '', tg: formData.tg || '' }
    };

    // admin via token/server
    if(currentUser.role === 'admin'){
      const r = await apiPOST('/api/members', payload, currentUser.adminToken || adminToken);
      if(r.ok){ showAlert('Учасника додано'); addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); return; }
      // else fallback to local
    }

    // check local/server if allowed
    const allowed = await canUserCreateMember(currentUser.username);
    if(!allowed){
      if(memberLimitWarning) { memberLimitWarning.textContent = `Ви вже створили одного учасника.`; memberLimitWarning.style.display = 'block'; }
      return;
    }

    // try server without token (if server allows owner-created)
    try {
      const r = await apiPOST('/api/members', payload);
      if(r.ok){ showAlert('Учасника додано (сервер)'); addMemberForm.reset(); addMemberModal.classList.remove('show'); await loadAll(); return; }
    } catch(e){ /* ignore */ }

    // fallback to local
    const arr = loadLocal(MEMBERS_KEY, []);
    arr.push(payload);
    saveLocal(MEMBERS_KEY, arr);
    showAlert('Учасника додано (локально)');
    addMemberForm.reset();
    if(addMemberModal) addMemberModal.classList.remove('show');
    await loadAll();
  }

  // ---------- Deletes & edits ----------
  async function deleteMemberHandler(id){
    if(!(currentUser && (currentUser.role === 'admin'))) {
      // check owner locally to allow owner delete
      const members = loadLocal(MEMBERS_KEY, []);
      const m = members.find(x => String(x.id) === String(id));
      if(m && currentUser && m.owner === currentUser.username){
        if(!confirm('Видалити свого учасника?')) return;
        const newArr = members.filter(x => String(x.id) !== String(id));
        saveLocal(MEMBERS_KEY, newArr);
        showAlert('Учасника видалено локально');
        await loadAll();
        return;
      }
      return showAlert('Тільки адмін або власник можуть видаляти цього учасника.');
    }
    // admin delete via API
    if(confirm('Видалити учасника?')){
      const r = await apiDELETE(`/api/members/${id}`, currentUser.adminToken || adminToken);
      if(r.ok){ showAlert('Видалено'); await loadAll(); return; }
      // fallback local
      const arr = loadLocal(MEMBERS_KEY, []);
      const newArr = arr.filter(x => String(x.id) !== String(id));
      saveLocal(MEMBERS_KEY, newArr);
      showAlert('Видалено локально');
      await loadAll();
    }
  }

  async function editMemberHandler(id){
    // find member locally (edits will be applied to server if admin or server accepted)
    const arr = loadLocal(MEMBERS_KEY, []);
    const member = arr.find(m => String(m.id) === String(id));
    if(!member) return showAlert('Учасник не знайдений');
    if(!(currentUser && (currentUser.role === 'admin' || currentUser.username === member.owner))){
      return showAlert('Недостатньо прав для редагування цього учасника.');
    }

    // simple prompt-based edit (matches попередню логіку)
    const newName = prompt(`Редагувати ім'я для ${member.name}:`, member.name);
    if(newName === null || newName.trim() === '') return;
    const newRole = prompt(`Редагувати роль для ${newName}:`, member.role);
    if(newRole === null || newRole.trim() === '') return;
    const newDiscord = prompt(`Discord (${member.links?.discord || 'немає'}):`, member.links?.discord || '');
    const newYoutube = prompt(`YouTube URL (${member.links?.youtube || 'немає'}):`, member.links?.youtube || '');
    const newTg = prompt(`Telegram URL (${member.links?.tg || 'немає'}):`, member.links?.tg || '');

    // update local copy
    member.name = newName.trim();
    member.role = newRole.trim();
    member.links = { discord: newDiscord?.trim()||'', youtube: newYoutube?.trim()||'', tg: newTg?.trim()||'' };

    // try to update on server (admin only)
    if(currentUser.role === 'admin'){
      // delete then re-add approach (server doesn't provide PATCH in provided API) — skip server update and instruct admin to re-add if needed
      showAlert('Редагування збережено локально. Якщо потрібно синхронізувати із сервером — перезапишіть запис в адмін-панелі.');
    }

    saveLocal(MEMBERS_KEY, arr);
    showAlert(`Інформацію про учасника ${member.name} оновлено.`);
    await loadAll();
  }

  // news/gallery delete (admin only)
  async function deleteNewsHandler(id){
    if(!(currentUser && currentUser.role === 'admin')) return showAlert('Тільки адмін');
    if(!confirm('Видалити новину?')) return;
    const r = await apiDELETE(`/api/news/${id}`, currentUser.adminToken || adminToken);
    if(r.ok){ showAlert('Видалено'); await loadAll(); return; }
    // fallback local
    const arr = loadLocal(NEWS_KEY, []);
    const newArr = arr.filter(x => String(x.id) !== String(id));
    saveLocal(NEWS_KEY, newArr);
    showAlert('Видалено локально');
    await loadAll();
  }
  async function deleteGalleryHandler(id){
    if(!(currentUser && currentUser.role === 'admin')) return showAlert('Тільки адмін');
    if(!confirm('Видалити фото?')) return;
    const r = await apiDELETE(`/api/gallery/${id}`, currentUser.adminToken || adminToken);
    if(r.ok){ showAlert('Видалено'); await loadAll(); return; }
    const arr = loadLocal(GALLERY_KEY, []);
    const newArr = arr.filter(x => String(x.id) !== String(id));
    saveLocal(GALLERY_KEY, newArr);
    showAlert('Видалено локально');
    await loadAll();
  }

  // add news/gallery (admin only)
  async function addNewsHandler(){
    if(!(currentUser && currentUser.role === 'admin')) return showAlert('Тільки адмін');
    const payload = { id: Date.now(), title: (newsTitle?.value||'').trim(), date: newsDate?.value||'', summary: (newsSummary?.value||'').trim() };
    if(!payload.title || !payload.date || !payload.summary) return showAlert('Заповніть всі поля');
    const r = await apiPOST('/api/news', payload, currentUser.adminToken || adminToken);
    if(r.ok){ showAlert('Додано'); await loadAll(); return; }
    // fallback local
    const arr = loadLocal(NEWS_KEY, []);
    arr.push(payload);
    saveLocal(NEWS_KEY, arr);
    showAlert('Додано локально');
    await loadAll();
  }
  async function addGalleryHandler(){
    if(!(currentUser && currentUser.role === 'admin')) return showAlert('Тільки адмін');
    const url = (galleryUrl?.value||'').trim();
    if(!url) return showAlert('Вкажіть URL');
    const payload = { id: Date.now(), url };
    const r = await apiPOST('/api/gallery', payload, currentUser.adminToken || adminToken);
    if(r.ok){ showAlert('Фото додано'); await loadAll(); return; }
    const arr = loadLocal(GALLERY_KEY, []);
    arr.push(payload); saveLocal(GALLERY_KEY, arr);
    showAlert('Фото додано локально');
    await loadAll();
  }

  // ---------- Event delegation ----------
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if(action === 'delete') await deleteMemberHandler(id);
    if(action === 'edit') await editMemberHandler(id);
    if(action === 'delete-news') await deleteNewsHandler(id);
    if(action === 'delete-gallery') await deleteGalleryHandler(id);
  });

  // ---------- Forms and UI handlers ----------
  if(loginForm){
    loginForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const user = (q('#loginUser')?.value||'').trim();
      const pass = (q('#loginPass')?.value||'');
      await loginHandler(user, pass);
    });
  }
  if(registerForm){
    registerForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const user = (q('#regUser')?.value||'').trim();
      const email = (q('#regEmail')?.value||'').trim();
      const pass = (q('#regPass')?.value||'');
      const pass2 = (q('#regPassConfirm')?.value||'');
      if(pass !== pass2) return showAlert('Паролі не співпадають');
      await registerHandler(user, email, pass);
    });
  }

  if(addMemberBtn){
    addMemberBtn.addEventListener('click', async () => {
      if(!currentUser) return showAlert('Увійдіть, щоб додати учасника');
      if(currentUser.role !== 'admin'){
        const ok = await canUserCreateMember(currentUser.username);
        if(!ok){ if(memberLimitWarning) { memberLimitWarning.textContent = `Ви вже створили одного учасника.`; memberLimitWarning.style.display = 'block'; } return; }
        if(memberLimitWarning) memberLimitWarning.style.display = 'none';
      }
      if(addMemberModal) { addMemberModal.classList.add('show'); document.body.style.overflow = 'hidden'; }
    });
  }
  if(addMemberForm){
    addMemberForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const data = {
        name: (memberNewName?.value||'').trim(),
        role: (memberNewRole?.value||'').trim(),
        discord: (memberNewDiscord?.value||'').trim(),
        youtube: (memberNewYoutube?.value||'').trim(),
        tg: (memberNewTg?.value||'').trim()
      };
      if(!data.name || !data.role) return showAlert('Заповніть імʼя і роль');
      await addMemberHandler(data);
    });
  }

  if(addNewsBtn) addNewsBtn.addEventListener('click', addNewsHandler);
  if(addGalleryBtn) addGalleryBtn.addEventListener('click', addGalleryHandler);

  if(openAuthBtn){
    openAuthBtn.addEventListener('click', () => {
      if(currentUser){
        if(confirm('Вийти з акаунту?')){
          currentUser = null; adminToken = null; removeLocal(CURRENT_USER_KEY); updateAuthUI(); loadAll();
        }
      } else {
        if(authModal) authModal.classList.add('show');
      }
    });
  }

  // close member modal (assumes #closeMemberModal exists)
  const closeMemberModal = q('#closeMemberModal');
  if(closeMemberModal) closeMemberModal.addEventListener('click', () => {
    if(addMemberModal) addMemberModal.classList.remove('show');
    if(addMemberForm) addMemberForm.reset();
    document.body.style.overflow = 'auto';
  });

  // tabs behavior
  if(q('#tabLogin')){
    q('#tabLogin').addEventListener('click', (e)=>{
      e.target.classList.add('active');
      if(tabRegister) tabRegister.classList.remove('active');
      if(loginForm) loginForm.style.display = 'block';
      if(registerForm) registerForm.style.display = 'none';
    });
  }
  if(tabRegister){
    tabRegister.addEventListener('click', (e)=>{
      if(tabRegister.disabled) return;
      e.target.classList.add('active');
      if(q('#tabLogin')) q('#tabLogin').classList.remove('active');
      if(registerForm) registerForm.style.display = 'block';
      if(loginForm) loginForm.style.display = 'none';
    });
  }

  // admin sidebar close (if exists)
  if(closeSidebar) closeSidebar.addEventListener('click', ()=>{ if(adminSidebar) adminSidebar.classList.remove('open'); });

  // ---------- Initial load ----------
  (async function init(){
    updateAuthUI();
    await loadAll();
    // try restore auth UI from local
    currentUser = loadLocal(CURRENT_USER_KEY, currentUser);
    adminToken = currentUser?.adminToken || adminToken || null;
    updateAuthUI();
  })();

  // expose small API for console / debugging
  window.__baracuda = {
    API_BASE, loadAll, loginHandler, registerHandler, addMemberHandler, deleteMemberHandler, editMemberHandler
  };
})();
