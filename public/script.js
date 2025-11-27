// script.js — ВЕРСІЯ З ДЕТАЛЬНИМ ПОШУКОМ ПОМИЛОК

document.addEventListener('DOMContentLoaded', () => {
  // --- КОНСТАНТИ ---
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 

  // --- ДОПОМІЖНІ ФУНКЦІЇ ---
  function loadCurrentUser(){ 
      try{ 
          const v = localStorage.getItem(CURRENT_USER_KEY); 
          return v ? JSON.parse(v) : null;
      } catch(e){ return null; } 
  }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  function removeCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY) }
  
  function timeAgo(dateString) {
      if (!dateString) return 'Невідомо';
      const now = new Date();
      const past = new Date(dateString);
      const diffSeconds = Math.floor((now - past) / 1000);
      const minutes = Math.floor(diffSeconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      return past.toLocaleDateString('uk-UA'); 
  }

  // МОДАЛЬНЕ ВІКНО
  function customConfirm(message, callback) {
      const modal = document.getElementById('customConfirmModal');
      const msg = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const closeBtn = document.getElementById('closeConfirmModal');
      
      const isAlert = callback === undefined; 
      
      if (isAlert) {
          if(cancelBtn) cancelBtn.style.display = 'none';
          if(okBtn) okBtn.textContent = 'Зрозуміло';
          if(document.getElementById('confirmTitle')) document.getElementById('confirmTitle').innerHTML = '<i class="fa-solid fa-circle-info"></i> Повідомлення';
      } else {
          if(cancelBtn) cancelBtn.style.display = 'inline-block';
          if(okBtn) okBtn.textContent = 'Так, продовжити';
          if(document.getElementById('confirmTitle')) document.getElementById('confirmTitle').innerHTML = '<i class="fa-solid fa-circle-question"></i> Підтвердіть дію';
      }

      if (!modal) return isAlert ? window.alert(message) : callback(window.confirm(message)); 

      msg.textContent = message;
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';

      const cleanup = (result) => {
          modal.classList.remove('show');
          document.body.style.overflow = 'auto';
          okBtn.onclick = null;
          cancelBtn.onclick = null;
          closeBtn.onclick = null;
          modal.onclick = null;
          if (!isAlert) callback(result);
      };

      const handleOk = () => cleanup(true);
      const handleCancel = () => cleanup(false);
      const handleOutsideClick = (e) => {
          if (e.target === modal && !isAlert) cleanup(false);
          if (e.target === modal && isAlert) cleanup(true);
      };
      
      if(okBtn) okBtn.onclick = handleOk;
      if(cancelBtn && !isAlert) cancelBtn.onclick = handleCancel;
      if(closeBtn) closeBtn.onclick = handleCancel;
      modal.onclick = handleOutsideClick;
  }
  window.customConfirm = customConfirm;

  
  // --- КЕШУВАННЯ ДАНИХ ---
  let members = [];
  let news = [];
  let gallery = [];
  let currentUser = loadCurrentUser(); 
  
  // Елементи DOM
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const membersGrid = document.getElementById('membersGrid');
  const newsList = document.getElementById('newsList');
  const galleryGrid = document.getElementById('galleryGrid');
  const memberSearch = document.getElementById('memberSearch');
  const adminSidebar = document.getElementById('adminSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const userDatabaseSidebar = document.getElementById('userDatabaseSidebar');
  const totalUsersSidebar = document.getElementById('totalUsersSidebar');
  const totalAdminsSidebar = document.getElementById('totalAdminsSidebar');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');
  const authModal = document.getElementById('authModal');
  const openAuthBtn = document.getElementById('openAuthBtn');
  const authBtnText = document.getElementById('authBtnText');
  const addNewsBtn = document.getElementById('addNewsBtn');
  const galleryUrl = document.getElementById('galleryUrl');
  const addGalleryBtn = document.getElementById('addGalleryBtn');
  const newsTitle = document.getElementById('newsTitle');
  const newsDate = document.getElementById('newsDate');
  const newsSummary = document.getElementById('newsSummary');
  const regUser = document.getElementById('regUser');
  const regEmail = document.getElementById('regEmail');
  const regPass = document.getElementById('regPass');
  const regPassConfirm = document.getElementById('regPassConfirm');
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const addMemberBtn = document.getElementById('addMemberBtn');
  const tabRegister = document.getElementById('tabRegister');
  const userSearchSidebar = document.getElementById('userSearchSidebar');
  const addMemberModal = document.getElementById('addMemberModal');
  const closeMemberModal = document.getElementById('closeMemberModal');
  const addMemberForm = document.getElementById('addMemberForm');
  const memberNewName = document.getElementById('memberNewName');
  const memberNewRole = document.getElementById('memberNewRole');
  const memberNewDiscord = document.getElementById('memberNewDiscord');
  const memberNewYoutube = document.getElementById('memberNewYoutube');
  const memberNewTg = document.getElementById('memberNewTg');
  const memberLimitWarning = document.getElementById('memberLimitWarning');

  let currentImageIndex = 0;
  let allUsersCache = [];


  // --- API ФУНКЦІЇ (ОНОВЛЕНА ЛОГІКА ПОМИЛОК) ---
  
  function getAuthHeaders() {
      if (!currentUser) return {};
      return {
          'X-Auth-User': currentUser.username,
          'X-Auth-Role': currentUser.role
      };
  }

  async function apiFetch(url, options = {}) {
      try {
          const headers = {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
              ...(options.headers || {})
          };
          
          const response = await fetch(url, { ...options, headers });
          
          // Перевіряємо тип контенту перед парсингом JSON
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
              const text = await response.text();
              throw new Error(`Сервер повернув не JSON! Статус: ${response.status}. Відповідь: ${text.substring(0, 100)}...`);
          }

          const data = await response.json();

          if (!response.ok) {
              const message = data.message || `Помилка API: ${response.status}`;
              // Не показуємо алерт для 401 (не авторизований), просто повертаємо null
              if (response.status !== 401) {
                  customConfirm(message);
              }
              return null;
          }
          return data;
      } catch (error) {
          console.error("Деталі помилки Fetch:", error);
          // ТУТ МИ ПОБАЧИМО РЕАЛЬНУ ПРИЧИНУ
          customConfirm(`DEBUG ERROR: ${error.message}`);
          return null;
      }
  }


  // --- ФУНКЦІЇ ЗАВАНТАЖЕННЯ ---
  async function loadInitialData() {
      console.log("Починаємо завантаження даних...");
      
      const membersData = await apiFetch('/api/members');
      if (membersData) {
          members = membersData;
          renderMembers(memberSearch ? memberSearch.value : '');
      }

      const newsData = await apiFetch('/api/news');
      if (newsData) {
          news = newsData;
          renderNews();
      }

      const galleryData = await apiFetch('/api/gallery');
      if (galleryData) {
          gallery = galleryData;
          renderGallery();
      }
      
      const countsData = await apiFetch('/api/users/count');
      if(countsData){
          if(totalUsersSidebar) totalUsersSidebar.textContent = countsData.totalUsers;
          if(totalAdminsSidebar) totalAdminsSidebar.textContent = countsData.totalAdmins;
          
          if (tabRegister) {
            const canRegister = countsData.totalUsers < 100;
            if (!canRegister) {
              tabRegister.textContent = 'Реєстрація (Зайнято)';
              tabRegister.disabled = true;
            } else {
              tabRegister.textContent = 'Реєстрація';
              tabRegister.disabled = false;
            }
          }
      }

      if (currentUser && currentUser.role === 'admin') {
          const usersData = await apiFetch('/api/users');
          if (usersData) allUsersCache = usersData;
      }
  }

  // --- UI & РЕНДЕРИНГ ---
  
  function checkAccess() {
    const body = document.body;
    body.classList.toggle('is-logged-in', !!currentUser);
    body.classList.toggle('is-admin', currentUser && currentUser.role === 'admin');
  }

  function updateAuthUI() {
      if (!openAuthBtn || !authBtnText) return;
      
      if (currentUser) {
        if (currentUser.role === 'admin') {
          authBtnText.textContent = 'ADMIN PANEL';
          openAuthBtn.classList.remove('btn-outline');
          openAuthBtn.classList.add('btn-primary');
          openAuthBtn.style.boxShadow = "0 0 15px var(--accent)";
        } else {
          authBtnText.textContent = currentUser.username;
          openAuthBtn.classList.remove('btn-primary');
          openAuthBtn.classList.add('btn-outline');
          openAuthBtn.style.boxShadow = "none";
        }
      } else {
        authBtnText.textContent = 'Вхід';
        openAuthBtn.classList.add('btn-primary');
        openAuthBtn.classList.remove('btn-outline');
        openAuthBtn.style.boxShadow = "none";
      }

      checkAccess();
  }

  function renderAdminSidebarData(filter = '') {
      if (!userDatabaseSidebar) return;
      
      const lowerFilter = filter.toLowerCase().trim();
      const filteredUsers = allUsersCache.filter(u => 
          u.username.toLowerCase().includes(lowerFilter) || 
          (u.email && u.email.toLowerCase().includes(lowerFilter))
      );
      
      const fragment = document.createDocumentFragment();
      
      filteredUsers.forEach(u => {
        const isMe = currentUser && u.username === currentUser.username;
        const creationInfo = u.regDate ? 
            `<small class="u-date" style="color:#777; font-size:10px;">Створено: ${new Date(u.regDate).toLocaleDateString('uk-UA')}</small>` : '';
            
        const div = document.createElement('div');
        div.className = 'user-card-mini';
        div.setAttribute('data-username', u.username); 
        
        div.innerHTML = `
          <div class="u-info">
            <span class="u-name">${u.username}</span>
            <span class="u-role ${u.role}">${u.role === 'admin' ? 'ADMIN' : 'USER'}</span>
            ${creationInfo}
          </div>
          ${!isMe && u.role !== 'admin' ? 
            `<button class="btn-ban" data-action="ban"><i class="fa-solid fa-ban"></i></button>` : ''}
        `;
        fragment.appendChild(div);
      });
      
      userDatabaseSidebar.innerHTML = '';
      userDatabaseSidebar.appendChild(fragment); 
  }
  
  function renderMembers(filter=''){
    if (!membersGrid) return;
    const list = members.filter(m => (m.name + ' ' + m.role).toLowerCase().includes(filter.toLowerCase()));
    
    if(list.length===0) { membersGrid.innerHTML = '<p class="muted">Немає учасників</p>'; return; }
    
    const fragment = document.createDocumentFragment();

    list.forEach(m => {
      const div = document.createElement('div');
      div.className = 'member animated-content';
      div.setAttribute('data-id', m.id);
      
      const isOwner = currentUser && currentUser.username === m.owner && currentUser.role !== 'admin';
      const canManage = currentUser && (currentUser.role === 'admin' || isOwner);

      let socialLinksHtml = '';
      if (m.links) {
          socialLinksHtml += '<div class="social-links">';
          if (m.links.discord) socialLinksHtml += `<span class="social-link" title="Discord"><i class="fa-brands fa-discord"></i></span>`;
          if (m.links.youtube) socialLinksHtml += `<a href="${m.links.youtube}" target="_blank" class="social-link link-yt"><i class="fa-brands fa-youtube"></i></a>`;
          if (m.links.tg) socialLinksHtml += `<a href="${m.links.tg}" target="_blank" class="social-link link-tg"><i class="fa-brands fa-telegram"></i></a>`;
          socialLinksHtml += '</div>';
      }

      div.innerHTML = `
        <div class="member-top">
          <div class="info">
            <h3>${m.name}</h3>
            <div class="role-badge">${m.role}</div>
            ${socialLinksHtml}
            ${isOwner ? '<small style="color:#555; display:block; margin-top:5px;">(Ваш запис)</small>' : ''}
          </div>
        </div>
        ${canManage ? 
          `<div class="member-actions admin-only">
            <button class="btn btn-edit" data-action="edit" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Редагувати</button>
            <button class="btn btn-delete" data-action="delete" data-id="${m.id}"><i class="fa-solid fa-trash"></i> Видалити</button>
          </div>` : ''}
      `;
      fragment.appendChild(div);
    });
    
    membersGrid.innerHTML = '';
    membersGrid.appendChild(fragment);
    checkAccess();
    setTimeout(checkVisibilityAndAnimate, 50);
  }

  function renderNews(){
    if (!newsList) return;
    const fragment = document.createDocumentFragment();
    if(news.length===0) { newsList.innerHTML = '<p class="muted">Немає подій</p>'; return; }
    
    [...news].reverse().forEach(n=>{
      const el = document.createElement('div'); 
      el.className='news-item animated-content';
      el.setAttribute('data-id', n.id);
      
      el.innerHTML = `
        <strong>${n.title}</strong> 
        <div class="meta">${n.date}</div>
        <p>${n.summary}</p>
        <div style="margin-top:8px" class="admin-only">
          <button class="btn btn-delete" style="border:1px solid #ef4444; color:#ef4444; padding:5px 10px;" data-action="delete-news" data-id="${n.id}">Видалити</button>
        </div>`;
      fragment.appendChild(el);
    });
    
    newsList.innerHTML = '';
    newsList.appendChild(fragment);
    checkAccess();
    setTimeout(checkVisibilityAndAnimate, 50);
  }

  function renderGallery(){
    if (!galleryGrid) return;
    const fragment = document.createDocumentFragment();
    if(gallery.length===0) { galleryGrid.innerHTML = '<p class="muted">Галерея пуста</p>'; return; }
    
    gallery.forEach((g, index)=>{
      const d = document.createElement('div'); 
      d.classList.add('animated-content');
      d.innerHTML = `
        <img src="${g.url}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'" data-index="${index}" data-action="lightbox">
        <div style="margin-top:6px" class="admin-only">
           <button class='btn btn-delete' style="width:100%; border:1px solid #ef4444; color:#ef4444;" data-id="${g.id}" data-action="delete-gallery">Видалити</button>
        </div>`;
      fragment.appendChild(d);
    });
    
    galleryGrid.innerHTML = '';
    galleryGrid.appendChild(fragment);
    checkAccess();
    setTimeout(checkVisibilityAndAnimate, 50);
  }

  // --- ДІЇ (BAN, EDIT, DELETE) ---
  
  async function banUser(username) {
      customConfirm(`Заблокувати користувача ${username}?`, async (result) => {
          if (!result) return;
          const data = await apiFetch(`/api/users/${username}`, { method: 'DELETE' });
          if (data) {
              allUsersCache = allUsersCache.filter(u => u.username !== username);
              renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
              loadInitialData(); 
              if(currentUser && currentUser.username === username) {
                  currentUser = null;
                  removeCurrentUser();
                  updateAuthUI();
              }
              customConfirm(`Користувача видалено.`);
          }
      });
  }

  async function editMember(id) {
      const member = members.find(m => m.id == id);
      if (!member) return;
      const newName = prompt(`Редагувати ім'я:`, member.name);
      if (!newName) return;
      const newRole = prompt(`Редагувати роль:`, member.role);
      const newDiscord = prompt(`Discord:`, member.links?.discord || '');
      const newYoutube = prompt(`YouTube:`, member.links?.youtube || '');
      const newTg = prompt(`Telegram:`, member.links?.tg || '');
      
      const updateData = {
          name: newName.trim(),
          role: newRole ? newRole.trim() : member.role,
          discord: newDiscord, youtube: newYoutube, tg: newTg
      };

      const data = await apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      if (data) {
          const index = members.findIndex(m => m.id == id);
          if (index !== -1) members[index] = data.member;
          renderMembers(memberSearch ? memberSearch.value : '');
          customConfirm(`Оновлено.`);
      }
  }

  async function removeMember(id) {
      customConfirm('Видалити учасника?', async (result) => {
          if (!result) return;
          const data = await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
          if (data) {
              members = members.filter(m => m.id != id);
              renderMembers(memberSearch ? memberSearch.value : '');
              customConfirm('Видалено.');
          }
      });
  }

  async function removeNews(id) {
      customConfirm('Видалити новину?', async (result) => {
          if (!result) return;
          const data = await apiFetch(`/api/news/${id}`, { method: 'DELETE' });
          if (data) {
              news = news.filter(n => n.id != id);
              renderNews();
              customConfirm('Видалено.');
          }
      });
  }
  
  async function removeGallery(id){
    customConfirm('Видалити фото?', async (result) => {
        if (!result) return;
        const data = await apiFetch(`/api/gallery/${id}`, { method: 'DELETE' });
        if(data){
            gallery = gallery.filter(g=>g.id!=id); 
            renderGallery();
            customConfirm('Видалено.');
        }
    });
  }
  
  // Lightbox
  function openLightbox(index) {
      if (gallery.length === 0 || !lightbox) return;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden'; 
      showImage(index);
  }
  function showImage(index) {
      if (gallery.length === 0) return;
      currentImageIndex = (index + gallery.length) % gallery.length;
      lightboxImage.src = gallery[currentImageIndex].url;
  }
  function closeLightbox() {
      if(!lightbox) return;
      lightbox.classList.remove('open');
      document.body.style.overflow = 'auto'; 
  }
  function closeAddMemberModal() {
      if(addMemberModal) addMemberModal.classList.remove('show');
      if(addMemberForm) addMemberForm.reset();
      document.body.style.overflow = 'auto';
  }
  
  // Анімації
  const animatedElements = document.querySelectorAll('.animated-content');
  function checkVisibilityAndAnimate() {
      if (!animatedElements) return;
      animatedElements.forEach(el => {
          if (el.classList.contains('animate-in')) return;
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight - 50) el.classList.add('animate-in');
      });
      animateDynamicContent(membersGrid ? membersGrid.querySelectorAll('.member') : []);
      animateDynamicContent(newsList ? newsList.querySelectorAll('.news-item') : []);
      animateDynamicContent(galleryGrid ? galleryGrid.querySelectorAll('.animated-content') : []);
  }
  function animateDynamicContent(elements) {
      elements.forEach((el) => {
          if (!el.classList.contains('animate-in')) el.classList.add('animate-in');
      });
  }

  // --- LISTENERS ---
  
  if (userDatabaseSidebar) userDatabaseSidebar.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="ban"]')) {
          const u = e.target.closest('.user-card-mini').getAttribute('data-username');
          if (u) banUser(u);
      }
  });
  
  if (membersGrid) membersGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.getAttribute('data-id'));
      const act = btn.getAttribute('data-action');
      if (act === 'edit') editMember(id);
      if (act === 'delete') removeMember(id);
  });
  
  if (newsList) newsList.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete-news"]')) {
          const id = parseInt(e.target.closest('[data-action]').getAttribute('data-id'));
          removeNews(id);
      }
  });
  
  if (galleryGrid) galleryGrid.addEventListener('click', (e) => {
      const t = e.target;
      if (t.tagName === 'IMG') openLightbox(parseInt(t.getAttribute('data-index')));
      if (t.closest('[data-action="delete-gallery"]')) {
          removeGallery(parseInt(t.closest('[data-id]').getAttribute('data-id')));
      }
  });

  if(navToggle) navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  window.addEventListener('scroll', checkVisibilityAndAnimate);
  
  // Auth Listeners
  if(openAuthBtn) openAuthBtn.addEventListener('click', async () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        await loadInitialData(); 
        adminSidebar.classList.add('open');
        renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
      } else {
        customConfirm(`Вийти з акаунту?`, (res) => {
          if (res) { currentUser = null; removeCurrentUser(); updateAuthUI(); loadInitialData(); }
        });
      }
    } else {
      authModal.classList.add('show');
    }
  });

  if(document.getElementById('closeAuth')) document.getElementById('closeAuth').addEventListener('click', () => authModal.classList.remove('show'));
  if(document.getElementById('tabLogin')) document.getElementById('tabLogin').addEventListener('click', (e) => {
    e.target.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.style.display = 'block'; registerForm.style.display = 'none';
  });
  if(tabRegister) tabRegister.addEventListener('click', (e) => {
    if (tabRegister.disabled) return;
    e.target.classList.add('active'); document.getElementById('tabLogin').classList.remove('active');
    registerForm.style.display = 'block'; loginForm.style.display = 'none';
  });

  // Forms
  if(registerForm) registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if(regPass.value !== regPassConfirm.value) return customConfirm('Паролі не співпадають');
      const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username: regUser.value.trim(), email: regEmail.value.trim(), password: regPass.value })
      });
      if (data) {
          customConfirm('Готово! Увійдіть.');
          document.getElementById('tabLogin').click();
          registerForm.reset();
      }
  });

  if(loginForm) loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: loginUser.value.trim(), password: loginPass.value })
      });
      if (data && data.success) {
          currentUser = data.user;
          saveCurrentUser(currentUser);
          updateAuthUI();
          authModal.classList.remove('show');
          customConfirm(data.message);
          loadInitialData();
      }
  });

  if(addNewsBtn) addNewsBtn.addEventListener('click', async () => {
      if (!newsTitle.value) return;
      const data = await apiFetch('/api/news', {
          method: 'POST',
          body: JSON.stringify({ title: newsTitle.value, date: newsDate.value, summary: newsSummary.value })
      });
      if (data) {
          news.push(data.news);
          news.sort((a,b)=>b.id-a.id); 
          renderNews();
          customConfirm('Додано.');
      }
  });

  if(addGalleryBtn) addGalleryBtn.addEventListener('click', async ()=>{
      if(!galleryUrl.value) return;
      const data = await apiFetch('/api/gallery', { method: 'POST', body: JSON.stringify({ url: galleryUrl.value }) });
      if (data) {
          gallery.push(data.item); renderGallery(); galleryUrl.value=''; customConfirm('Додано.');
      }
  });

  if(addMemberBtn) addMemberBtn.addEventListener('click', () => {
      if(!currentUser) return customConfirm('Увійдіть.');
      addMemberModal.classList.add('show');
  });
  if(closeMemberModal) closeMemberModal.addEventListener('click', closeAddMemberModal);
  
  if(addMemberForm) addMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await apiFetch('/api/members', {
          method: 'POST',
          body: JSON.stringify({
            name: memberNewName.value.trim(),
            role: memberNewRole.value.trim(),
            discord: memberNewDiscord.value, youtube: memberNewYoutube.value, tg: memberNewTg.value
          })
      });
      if (data) {
          members.push(data.member);
          renderMembers();
          closeAddMemberModal();
          customConfirm(`Учасника додано!`);
      }
  });

  if(memberSearch) memberSearch.addEventListener('input', (e) => renderMembers(e.target.value));
  if(closeSidebar) closeSidebar.addEventListener('click', () => adminSidebar.classList.remove('open'));
  if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', () => {
      customConfirm('Вийти?', (res) => { if(res){ currentUser=null; removeCurrentUser(); adminSidebar.classList.remove('open'); updateAuthUI(); loadInitialData();} });
  });
  if(userSearchSidebar) userSearchSidebar.addEventListener('input', (e) => renderAdminSidebarData(e.target.value));

  if(lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if(lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => showImage(currentImageIndex - 1));
  if(lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => showImage(currentImageIndex + 1));
  
  // --- START ---
  updateAuthUI(); 
  loadInitialData(); 
  checkVisibilityAndAnimate();
});
