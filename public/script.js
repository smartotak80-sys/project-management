// script.js - Фінальна версія (API + Custom Modal + Scroll Animation)

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

      if (diffSeconds < 60) return `${diffSeconds} сек. тому`;
      if (minutes < 60) return `${minutes} хв. тому`;
      if (hours < 24) return `${hours} год. тому`;
      if (days < 30) return `${days} дн. тому`;
      
      return past.toLocaleDateString('uk-UA'); 
  }

  function customConfirm(message, callback) {
      const modal = document.getElementById('customConfirmModal');
      const msg = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const closeBtn = document.getElementById('closeConfirmModal');
      
      const isAlert = callback === undefined; 
      // ... (скорочена логіка customConfirm, як в оригінальному файлі) ...
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
  
  // ... (Кешування DOM елементів - залишається) ...
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


  // --- API ФУНКЦІЇ (ВИКОРИСТОВУЄМО FETCH) ---
  
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
          const data = await response.json();

          if (!response.ok) {
              const message = data.message || `Помилка: ${response.status} ${response.statusText}`;
              customConfirm(message);
              return null;
          }
          return data;
      } catch (error) {
          // ЦЕЙ ЛОГ ВИКЛИКАВ ПОМИЛКУ НА ЕКРАНІ
          customConfirm('Помилка з\'єднання з сервером. Перевірте мережу або Railway.');
          return null;
      }
  }


  // --- ФУНКЦІЇ ЗАВАНТАЖЕННЯ (Loaders) ---
  async function loadInitialData() {
      const membersData = await apiFetch('/api/members');
      if (membersData) members = membersData;
      renderMembers(memberSearch ? memberSearch.value : '');

      const newsData = await apiFetch('/api/news');
      if (newsData) news = newsData;
      renderNews();

      const galleryData = await apiFetch('/api/gallery');
      if (galleryData) gallery = galleryData;
      renderGallery();
      
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
            `<small class="u-date" style="color:#777; font-size:10px;">Створено: ${new Date(u.regDate).toLocaleDateString('uk-UA')} (${timeAgo(u.regDate)})</small>` : 
            `<small class="u-date" style="color:#777; font-size:10px;">Дата невідома</small>`;
            
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
          
          if (m.links.discord) {
              socialLinksHtml += `<span class="social-link" title="Discord: ${m.links.discord}"><i class="fa-brands fa-discord"></i></span>`;
          }
          if (m.links.youtube) {
              socialLinksHtml += `<a href="${m.links.youtube}" target="_blank" class="social-link link-yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>`;
          }
          if (m.links.tg) {
              socialLinksHtml += `<a href="${m.links.tg}" target="_blank" class="social-link link-tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>`;
          }
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


  // --- ГЛОБАЛЬНІ ФУНКЦІЇ (ОБРОБКА ДІЙ API) ---
  
  async function banUser(username) {
      customConfirm(`Ви впевнені, що хочете заблокувати користувача ${username}?`, async (result) => {
          if (!result) return;
          
          const data = await apiFetch(`/api/users/${username}`, { method: 'DELETE' });
          if (data) {
              allUsersCache = allUsersCache.filter(u => u.username !== username);
              renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
              loadInitialData(); 

              if(currentUser && currentUser.username === username && currentUser.role !== 'admin') {
                  currentUser = null;
                  removeCurrentUser();
                  updateAuthUI();
              }
              customConfirm(`Користувача ${username} видалено.`);
          }
      });
  }

  async function editMember(id) {
      const member = members.find(m => m.id == id);
      if (!member) return;
      
      const newName = prompt(`Редагувати ім'я для ${member.name}:`, member.name);
      if (newName === null || newName.trim() === '') return;
      
      const newRole = prompt(`Редагувати роль для ${newName}:`, member.role);
      if (newRole === null || newRole.trim() === '') return;
      
      const newDiscord = prompt(`Discord (${member.links?.discord || 'немає'}):`, member.links?.discord || '');
      const newYoutube = prompt(`YouTube URL (${member.links?.youtube || 'немає'}):`, member.links?.youtube || '');
      const newTg = prompt(`Telegram URL (${member.links?.tg || 'немає'}):`, member.links?.tg || '');
      
      const updateData = {
          name: newName.trim(),
          role: newRole.trim(),
          discord: newDiscord ? newDiscord.trim() : '',
          youtube: newYoutube ? newYoutube.trim() : '',
          tg: newTg ? newTg.trim() : ''
      };

      const data = await apiFetch(`/api/members/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
      });
      
      if (data) {
          const index = members.findIndex(m => m.id == id);
          if (index !== -1) members[index] = data.member;
          renderMembers(memberSearch ? memberSearch.value : '');
          customConfirm(`Інформацію про учасника ${data.member.name} оновлено.`);
      }
  }

  async function removeMember(id) {
      customConfirm('Видалити цього учасника? Це дія незворотна.', async (result) => {
          if (!result) return;
          
          const data = await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
          if (data) {
              members = members.filter(m => m.id != id);
              renderMembers(memberSearch ? memberSearch.value : '');
              customConfirm('Учасника видалено.');
          }
      });
  }

  async function removeNews(id) {
      customConfirm('Видалити цю новину? Це дія незворотна.', async (result) => {
          if (!result) return;

          const data = await apiFetch(`/api/news/${id}`, { method: 'DELETE' });
          if (data) {
              news = news.filter(n => n.id != id);
              renderNews();
              customConfirm('Подію видалено.');
          }
      });
  }
  
  async function removeGallery(id){
    customConfirm('Видалити це фото з галереї? Це дія незворотна.', async (result) => {
        if (!result) return;
        
        const data = await apiFetch(`/api/gallery/${id}`, { method: 'DELETE' });
        if(data){
            gallery = gallery.filter(g=>g.id!=id); 
            renderGallery();
            customConfirm('Фото видалено.');
        }
    });
  }
  
  // Функції lightbox, scroll animation, smooth scroll - залишаються як в оригінальному файлі

  function openLightbox(index) {
      if (gallery.length === 0 || !lightbox || !document.body) return;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden'; 
      showImage(index);
  }

  function showImage(index) {
      if (gallery.length === 0) return;
      currentImageIndex = (index + gallery.length) % gallery.length;
      lightboxImage.src = gallery[currentImageIndex].url;
      
      const visibility = gallery.length > 1 ? 'visible' : 'hidden';
      if(lightboxPrevBtn) lightboxPrevBtn.style.visibility = visibility;
      if(lightboxNextBtn) lightboxNextBtn.style.visibility = visibility;
  }
  
  function closeLightbox() {
      if(!lightbox || !document.body) return;
      lightbox.classList.remove('open');
      document.body.style.overflow = 'auto'; 
  }
  
  function closeAddMemberModal() {
      if(addMemberModal) addMemberModal.classList.remove('show');
      if(addMemberForm) addMemberForm.reset();
      document.body.style.overflow = 'auto';
  }
  
  const animatedElements = document.querySelectorAll('.animated-content');
  
  function checkVisibilityAndAnimate() {
      if (!animatedElements) return;

      animatedElements.forEach(el => {
          if (el.classList.contains('animate-in')) return;
          
          const rect = el.getBoundingClientRect();
          const viewHeight = window.innerHeight;
          const isVisible = rect.top < viewHeight - 50 && rect.bottom > 50; 

          if (isVisible) {
              const delay = parseFloat(el.getAttribute('data-delay')) || 0;
              if (delay > 0) {
                  el.style.transitionDelay = `${delay}s`;
              }
              el.classList.add('animate-in');
          }
      });
      
      animateDynamicContent(membersGrid ? membersGrid.querySelectorAll('.member.animated-content:not(.animate-in)') : []);
      animateDynamicContent(newsList ? newsList.querySelectorAll('.news-item.animated-content:not(.animate-in)') : []);
      animateDynamicContent(galleryGrid ? galleryGrid.querySelectorAll('.animated-content:not(.animate-in)') : []);
  }
  
  function animateDynamicContent(elements) {
      elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const viewHeight = window.innerHeight;
          const isVisible = rect.top < viewHeight - 50 && rect.bottom > 50;

          if (isVisible) {
              el.classList.add('animate-in');
          }
      });
  }


  // --- ОБРОБНИКИ ПОДІЙ ---
  
  if (userDatabaseSidebar) {
      userDatabaseSidebar.addEventListener('click', (e) => {
          const targetBtn = e.target.closest('[data-action="ban"]');
          if (targetBtn) {
              const userCard = targetBtn.closest('.user-card-mini');
              const username = userCard.getAttribute('data-username');
              if (username) banUser(username);
          }
      });
  }
  
  if (membersGrid) {
      membersGrid.addEventListener('click', (e) => {
          const targetBtn = e.target.closest('[data-action]');
          if (!targetBtn) return;
          
          const id = parseInt(targetBtn.getAttribute('data-id'));
          if (isNaN(id)) return;
          
          const action = targetBtn.getAttribute('data-action');
          if (action === 'edit') editMember(id);
          if (action === 'delete') removeMember(id);
      });
  }
  
  if (newsList) {
      newsList.addEventListener('click', (e) => {
          const targetBtn = e.target.closest('[data-action="delete-news"]');
          if (targetBtn) {
              const id = parseInt(targetBtn.getAttribute('data-id'));
              if (id) removeNews(id);
          }
      });
  }
  
  if (galleryGrid) {
      galleryGrid.addEventListener('click', (e) => {
          const target = e.target;
          const action = target.getAttribute('data-action') || target.closest('[data-action="delete-gallery"]')?.getAttribute('data-action');
          
          if (action === 'lightbox' && target.tagName === 'IMG') {
              const index = parseInt(target.getAttribute('data-index'));
              openLightbox(index);
          } else if (action === 'delete-gallery') {
              const id = parseInt(target.getAttribute('data-id') || target.closest('[data-id]').getAttribute('data-id'));
              if (id) removeGallery(id);
          }
      });
  }


  if(navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });
  }
  
  window.addEventListener('scroll', checkVisibilityAndAnimate);
  window.addEventListener('resize', checkVisibilityAndAnimate);

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const href = a.getAttribute('href');
      if(href.startsWith('#')){
        e.preventDefault();
        const target = document.querySelector(href);
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
        if(mainNav && mainNav.classList.contains('open')) mainNav.classList.remove('open');
      }
    });
  });

  if(closeSidebar) closeSidebar.addEventListener('click', () => {
    if(adminSidebar) adminSidebar.classList.remove('open');
  });
  if(adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
        customConfirm('Ви впевнені, що хочете вийти з адмін-панелі?', (result) => {
            if (result) {
                currentUser = null;
                removeCurrentUser();
                if(adminSidebar) adminSidebar.classList.remove('open');
                updateAuthUI();
                loadInitialData();
            }
        });
    });
  }
  
  if (userSearchSidebar) {
      userSearchSidebar.addEventListener('input', (e) => {
          renderAdminSidebarData(e.target.value); 
      });
  }

  if(lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if(lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => showImage(currentImageIndex - 1));
  if(lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => showImage(currentImageIndex + 1));
  window.addEventListener('keydown', (e) => {
      if (lightbox && lightbox.classList.contains('open')) {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') showImage(currentImageIndex - 1);
          if (e.key === 'ArrowRight') showImage(currentImageIndex + 1);
      }
  });


  // AUTH SYSTEM
  if(openAuthBtn) openAuthBtn.addEventListener('click', async () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        await loadInitialData(); 
        if(adminSidebar) adminSidebar.classList.add('open');
        renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
      } else {
        customConfirm(`Ви впевнені, що хочете вийти з акаунту ${currentUser.username}?`, (result) => {
          if (result) {
            currentUser = null;
            removeCurrentUser();
            updateAuthUI();
            loadInitialData(); 
          }
        });
      }
    } else {
      if(authModal) authModal.classList.add('show');
    }
  });

  if(document.getElementById('closeAuth')) document.getElementById('closeAuth').addEventListener('click', () => {
    if(authModal) authModal.classList.remove('show');
  });

  if(document.getElementById('tabLogin')) document.getElementById('tabLogin').addEventListener('click', (e) => {
    e.target.classList.add('active'); 
    if(tabRegister) tabRegister.classList.remove('active');
    if(loginForm) loginForm.style.display = 'block'; 
    if(registerForm) registerForm.style.display = 'none';
  });

  if(tabRegister) tabRegister.addEventListener('click', (e) => {
    if (tabRegister.disabled) return;
    e.target.classList.add('active'); 
    if(document.getElementById('tabLogin')) document.getElementById('tabLogin').classList.remove('active');
    if(registerForm) registerForm.style.display = 'block'; 
    if(loginForm) loginForm.style.display = 'none';
  });


  // REGISTER
  if(registerForm) registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const user = regUser.value.trim();
      const email = regEmail.value.trim();
      const pass = regPass.value;

      if(user.length < 3) return customConfirm('Логін має бути довший 3 символів');
      if(pass.length < 6) return customConfirm('Пароль має бути довший 6 символів');
      if(pass !== regPassConfirm.value) return customConfirm('Паролі не співпадають');
      
      const body = { username: user, email: email, password: pass };

      const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(body)
      });
      
      if (data && document.getElementById('tabLogin')) {
          loadInitialData();
          customConfirm('Готово! Тепер можете увійти.');
          document.getElementById('tabLogin').click();
          registerForm.reset();
      }
  });

  // LOGIN
  if(loginForm) loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = loginUser.value.trim();
      const pass = loginPass.value;

      const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: user, password: pass })
      });
      
      if (data && data.success) {
          currentUser = data.user;
          saveCurrentUser(currentUser);
          updateAuthUI();
          if(authModal) authModal.classList.remove('show');
          customConfirm(data.message);
          
          loadInitialData();
      }
  });


  // ADD NEWS 
  if(addNewsBtn) {
    addNewsBtn.addEventListener('click', async () => {
        if (!newsTitle.value || !newsDate.value || !newsSummary.value) {
            return customConfirm('Будь ласка, заповніть усі поля для події.');
        }

        const newNewsData = {
            title: newsTitle.value,
            date: newsDate.value,
            summary: newsSummary.value
        };

        const data = await apiFetch('/api/news', {
            method: 'POST',
            body: JSON.stringify(newNewsData)
        });
        
        if (data) {
            news.push(data.news);
            news.sort((a,b)=>b.id-a.id); 
            renderNews();
            newsTitle.value = '';
            newsDate.value = '';
            newsSummary.value = '';
            customConfirm('Подію додано.');
        }
    });
  }

  // ADD GALLERY 
  if(addGalleryBtn) {
    addGalleryBtn.addEventListener('click', async ()=>{
      const url = galleryUrl.value.trim(); 
      if(!url) return customConfirm('Вкажіть коректне посилання на зображення');
      
      const data = await apiFetch('/api/gallery', {
          method: 'POST',
          body: JSON.stringify({ url })
      });
      
      if (data) {
          gallery.push(data.item);
          renderGallery();
          galleryUrl.value=''; 
          customConfirm('Фото додано.');
      }
    });
  }

  // LOGIC FOR CUSTOM ADD MEMBER MODAL
  if(addMemberBtn) {
    addMemberBtn.addEventListener('click', () => {
      if(!currentUser) return customConfirm('Спершу увійдіть в акаунт.');
      
      const isLimited = currentUser.role !== 'admin';
      
      if (isLimited) {
          const userMembersCount = members.filter(m => m.owner === currentUser.username).length;
          if (userMembersCount >= MAX_MEMBER_PER_USER) {
              memberLimitWarning.textContent = `Ви досягли ліміту (${MAX_MEMBER_PER_USER}) учасників. Спершу видаліть існуючий.`;
              memberLimitWarning.style.display = 'block';
              addMemberForm.querySelector('button[type="submit"]').disabled = true;
          } else {
              memberLimitWarning.style.display = 'none';
              addMemberForm.querySelector('button[type="submit"]').disabled = false;
          }
      } else {
          memberLimitWarning.style.display = 'none';
          addMemberForm.querySelector('button[type="submit"]').disabled = false;
      }

      addMemberModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
  }

  if(closeMemberModal) {
    closeMemberModal.addEventListener('click', closeAddMemberModal);
  }

  if(addMemberModal) {
    addMemberModal.addEventListener('click', (e) => {
        if (e.target === addMemberModal) {
            closeAddMemberModal();
        }
    });
  }
  
  // ADD MEMBER FORM SUBMIT
  if(addMemberForm) {
      addMemberForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          if(!currentUser) return; 
          
          const newMemberData = {
            name: memberNewName.value.trim(),
            role: memberNewRole.value.trim(),
            discord: memberNewDiscord.value.trim(),
            youtube: memberNewYoutube.value.trim(),
            tg: memberNewTg.value.trim()
          };

          const data = await apiFetch('/api/members', {
              method: 'POST',
              body: JSON.stringify(newMemberData)
          });
          
          if (data) {
              members.push(data.member);
              members.sort((a,b)=>a.name.localeCompare(b.name));
              renderMembers(memberSearch ? memberSearch.value : '');
              closeAddMemberModal();
              customConfirm(`Учасника ${data.member.name} додано!`);
          }
      });
  }

  // Member Search
  if(memberSearch) {
      memberSearch.addEventListener('input', (e) => {
          renderMembers(e.target.value);
      });
  }

  // Initial Render and Animation Activation
  updateAuthUI(); 
  loadInitialData(); 
  
  checkVisibilityAndAnimate();
});
