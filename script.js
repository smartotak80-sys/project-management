// script.js — Final Logic (ОСТАННЯ ВЕРСІЯ: CUSTOM MODAL + CUSTOM CONFIRM + SCROLL ANIMATION)

document.addEventListener('DOMContentLoaded', () => {
  // --- КОНСТАНТИ ---
  const MEMBERS_KEY = 'barakuda_members_v3';
  const NEWS_KEY = 'barakuda_news_v1';
  const GALLERY_KEY = 'barakuda_gallery_v1';
  const USERS_KEY = 'barakuda_users_db';
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const ADMIN_LOGIN = 'famillybarracuda@gmail.com'; 
  const ADMIN_PASS = 'barracuda123';
  const MAX_USERS = 1; 
  const MAX_MEMBER_PER_USER = 1; 


  // --- ДОПОМІЖНІ ФУНКЦІЇ ---
  function load(key, fallback){ 
      try{ 
          const v = localStorage.getItem(key); 
          return v ? JSON.parse(v) : fallback;
      } catch(e){
          console.error(`Error loading key ${key}:`, e);
          return fallback;
      } 
  }
  function save(key,val){ localStorage.setItem(key, JSON.stringify(val)) }
  function escapeHtml(str){ return String(str).replace(/[&<>"'`=/]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','=':'&#x3D;','`':'&#x60;'}[s])); }
  
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

  /**
   * Замінює стандартний confirm/alert на стилізоване модальне вікно.
   */
  function customConfirm(message, callback) {
      const modal = document.getElementById('customConfirmModal');
      const msg = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const closeBtn = document.getElementById('closeConfirmModal');
      
      // Якщо це просто сповіщення (alert), приховуємо кнопку "Відмінити"
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
          
          // Видалення всіх обробників, щоб уникнути конфліктів
          okBtn.onclick = null;
          cancelBtn.onclick = null;
          closeBtn.onclick = null;
          modal.onclick = null;
          
          if (!isAlert) callback(result);
      };

      const handleOk = () => cleanup(true);
      const handleCancel = () => cleanup(false);
      const handleOutsideClick = (e) => {
          if (e.target === modal && !isAlert) cleanup(false); // Тільки confirm можна закрити кліком поза межами
          if (e.target === modal && isAlert) cleanup(true); // Alert можна закрити
      };
      
      if(okBtn) okBtn.onclick = handleOk;
      if(cancelBtn && !isAlert) cancelBtn.onclick = handleCancel;
      if(closeBtn) closeBtn.onclick = handleCancel;
      modal.onclick = handleOutsideClick;
  }
  window.customConfirm = customConfirm; // Доступно глобально, якщо потрібно


  // --- ПОЧАТКОВІ ДАНІ ---
  const defaultMembers = [
    {
        id:1, 
        name:'Vlad_B', 
        role:'Голова', 
        owner:'system', 
        links: {
            discord: 'vladb#0001', 
            youtube: 'https://youtube.com/@vladb_channel',
            tg: ''
        }
    },
    {
        id:2, 
        name:'Kostya', 
        role:'Зам', 
        owner:'system',
        links: {
            discord: 'kostya_rp#1234', 
            youtube: 'https://youtube.com/kostyastar',
            tg: 'https://t.me/kostya_tg'
        }
    }
  ];
  let members = load(MEMBERS_KEY, defaultMembers);
  let news = load(NEWS_KEY, [{id:101,title:'Операція на маяку',date:'2025-11-20',summary:'Успішно захопили маяк.'}]);
  let gallery = load(GALLERY_KEY, [
    {id:201,url:'https://i.postimg.cc/QtxK543b/gallery1.jpg'},
    {id:202,url:'https://i.postimg.cc/wT7s0x9Y/gallery2.jpg'}
  ]);
  let currentUser = load(CURRENT_USER_KEY, null); 

  // --- КЕШУВАННЯ DOM ЕЛЕМЕНТІВ ---
  if(document.getElementById('year')) document.getElementById('year').textContent = new Date().getFullYear();
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
  
  // НОВІ ЕЛЕМЕНТИ МОДАЛЬНОГО ВІКНА
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


  // --- SCROLL ANIMATION LOGIC ---
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
      
      // Динамічний контент (члени, новини, галерея)
      animateDynamicContent(membersGrid ? membersGrid.querySelectorAll('.member.animated-content:not(.animate-in)') : []);
      animateDynamicContent(newsList ? newsList.querySelectorAll('.news-item.animated-content:not(.animate-in)') : []);
      animateDynamicContent(galleryGrid ? galleryGrid.querySelectorAll('.animated-content:not(.animate-in)') : []);
  }
  
  // *** ЗМІНЕНО: Прибрано індексну затримку для динамічних елементів для усунення рассинхрону ***
  function animateDynamicContent(elements) {
      elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const viewHeight = window.innerHeight;
          const isVisible = rect.top < viewHeight - 50 && rect.bottom > 50;

          if (isVisible) {
              // el.style.transitionDelay = `${index * 0.1}s`; // ВИДАЛЕНО
              el.classList.add('animate-in');
          }
      });
  }


  // --- ФУНКЦІЇ РЕНДЕРИНГУ ТА ДОСТУПУ ---

  function checkAccess() {
    const body = document.body;
    body.classList.toggle('is-logged-in', !!currentUser);
    body.classList.toggle('is-admin', currentUser && currentUser.role === 'admin');
  }

  function updateAuthUI() {
    if (!openAuthBtn || !authBtnText) return;
    
    const users = load(USERS_KEY, []);
    const regularUsers = users.filter(u => u.role !== 'admin'); 
    const canRegister = regularUsers.length < MAX_USERS;

    if (currentUser) {
      if (currentUser.role === 'admin') {
        authBtnText.textContent = 'ADMIN PANEL';
        openAuthBtn.classList.remove('btn-outline');
        openAuthBtn.classList.add('btn-primary');
        openAuthBtn.style.boxShadow = "0 0 15px var(--accent)";
      } else {
        authBtnText.textContent = escapeHtml(currentUser.username);
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

    if (tabRegister) {
      if (!canRegister) {
        tabRegister.textContent = 'Реєстрація (Зайнято)';
        tabRegister.disabled = true;
      } else {
        tabRegister.textContent = 'Реєстрація';
        tabRegister.disabled = false;
      }
    }

    checkAccess();
  }

  function renderAdminSidebarData(filter = '') {
    if (!userDatabaseSidebar) return;
    const allUsers = load(USERS_KEY, []);
    
    const lowerFilter = filter.toLowerCase().trim();
    const filteredUsers = allUsers.filter(u => 
        u.username.toLowerCase().includes(lowerFilter) || 
        (u.email && u.email.toLowerCase().includes(lowerFilter))
    );
    
    const fragment = document.createDocumentFragment();
    
    filteredUsers.forEach(u => {
      const isMe = currentUser && u.username === currentUser.username;
      
      // Використання timeAgo
      const creationInfo = u.regDate ? 
          `<small class="u-date" style="color:#777; font-size:10px;">Створено: ${new Date(u.regDate).toLocaleDateString('uk-UA')} (${timeAgo(u.regDate)})</small>` : 
          `<small class="u-date" style="color:#777; font-size:10px;">Дата невідома</small>`;
          
      const div = document.createElement('div');
      div.className = 'user-card-mini';
      div.setAttribute('data-username', escapeHtml(u.username)); 
      
      div.innerHTML = `
        <div class="u-info">
          <span class="u-name">${escapeHtml(u.username)}</span>
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

    if(totalUsersSidebar) totalUsersSidebar.textContent = allUsers.length;
    if(totalAdminsSidebar) totalAdminsSidebar.textContent = allUsers.filter(u => u.role === 'admin').length;
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
              socialLinksHtml += `<span class="social-link" title="Discord: ${escapeHtml(m.links.discord)}"><i class="fa-brands fa-discord"></i></span>`;
          }
          if (m.links.youtube) {
              socialLinksHtml += `<a href="${escapeHtml(m.links.youtube)}" target="_blank" class="social-link link-yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>`;
          }
          if (m.links.tg) {
              socialLinksHtml += `<a href="${escapeHtml(m.links.tg)}" target="_blank" class="social-link link-tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>`;
          }
          socialLinksHtml += '</div>';
      }


      div.innerHTML = `
        <div class="member-top">
          <div class="info">
            <h3>${escapeHtml(m.name)}</h3>
            <div class="role-badge">${escapeHtml(m.role)}</div>
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
        <strong>${escapeHtml(n.title)}</strong> 
        <div class="meta">${escapeHtml(n.date)}</div>
        <p>${escapeHtml(n.summary)}</p>
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
        <img src="${escapeHtml(g.url)}" alt="gallery photo" onerror="this.src='https://i.postimg.cc/k47tX6Qd/hero-placeholder.jpg'" data-index="${index}" data-action="lightbox">
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

  // --- ГЛОБАЛЬНІ ФУНКЦІЇ (ОБРОБКА ДІЙ) ---
  
  function banUser(username) {
    customConfirm(`Ви впевнені, що хочете заблокувати користувача ${username}? Це призведе до видалення його записів та виходу з системи.`, (result) => {
        if (!result) return;
        
        let users = load(USERS_KEY, []);
        users = users.filter(u => u.username !== username);
        save(USERS_KEY, users);
        renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
        
        if(currentUser && currentUser.username === username && currentUser.role !== 'admin') {
            currentUser = null;
            localStorage.removeItem(CURRENT_USER_KEY);
            updateAuthUI();
            members = members.filter(m => m.owner !== username);
            save(MEMBERS_KEY, members);
            renderMembers(memberSearch ? memberSearch.value : '');
        }
        updateAuthUI(); 
        customConfirm(`Користувача ${username} видалено.`, );
    });
  }

  function editMember(id) {
      const member = members.find(m => m.id == id);
      if (!member) return;
      if(currentUser.role !== 'admin' && currentUser.username !== member.owner) {
        return customConfirm('Недостатньо прав для редагування цього учасника.');
      }

      // **ЗБЕРЕЖЕНО prompt ДЛЯ РЕДАГУВАННЯ, Оскільки це єдина функція, яка повертає введене значення синхронно**
      const newName = prompt(`Редагувати ім'я для ${member.name}:`, member.name);
      if (newName === null || newName.trim() === '') return;
      
      const newRole = prompt(`Редагувати роль для ${newName}:`, member.role);
      if (newRole === null || newRole.trim() === '') return;
      
      const newDiscord = prompt(`Discord (${member.links?.discord || 'немає'}):`, member.links?.discord || '');
      const newYoutube = prompt(`YouTube URL (${member.links?.youtube || 'немає'}):`, member.links?.youtube || '');
      const newTg = prompt(`Telegram URL (${member.links?.tg || 'немає'}):`, member.links?.tg || '');
      
      member.name = newName.trim();
      member.role = newRole.trim();
      member.links = {
          discord: newDiscord ? newDiscord.trim() : '',
          youtube: newYoutube ? newYoutube.trim() : '',
          tg: newTg ? newTg.trim() : ''
      };

      save(MEMBERS_KEY, members);
      renderMembers(memberSearch ? memberSearch.value : '');
  }

  function removeMember(id) {
      customConfirm('Видалити цього учасника? Це дія незворотна.', (result) => {
          if (!result) return;
          
          const member = members.find(m => m.id == id);
          if (!member) return;

          if(currentUser.role !== 'admin' && currentUser.username !== member.owner) {
            return customConfirm('Недостатньо прав для видалення цього учасника.');
          }

          members = members.filter(m => m.id != id);
          save(MEMBERS_KEY, members);
          renderMembers(memberSearch ? memberSearch.value : '');
          customConfirm('Учасника видалено.', );
      });
  }

  function removeNews(id) {
      customConfirm('Видалити цю новину? Це дія незворотна.', (result) => {
          if (!result) return;

          news = news.filter(n => n.id != id);
          save(NEWS_KEY, news);
          renderNews();
          customConfirm('Подію видалено.', );
      });
  }
  
  function removeGallery(id){
    customConfirm('Видалити це фото з галереї? Це дія незворотна.', (result) => {
        if (!result) return;
        
        gallery = gallery.filter(g=>g.id!=id); 
        save(GALLERY_KEY,gallery); 
        renderGallery();
        customConfirm('Фото видалено.', );
    });
  }
  
  // Lightbox
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
  
  // Функція для закриття модального вікна додавання учасника
  function closeAddMemberModal() {
      if(addMemberModal) addMemberModal.classList.remove('show');
      if(addMemberForm) addMemberForm.reset();
      document.body.style.overflow = 'auto';
  }


  // --- ДЕЛЕГУВАННЯ ПОДІЙ ---
  
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


  // --- ОБРОБНИКИ ПОДІЙ ---
  
  if(navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });
  }
  
  // Scroll & Animation Events
  window.addEventListener('scroll', checkVisibilityAndAnimate);
  window.addEventListener('resize', checkVisibilityAndAnimate);

  // Smooth Scroll
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

  // Admin Sidebar 
  if(closeSidebar) closeSidebar.addEventListener('click', () => {
    if(adminSidebar) adminSidebar.classList.remove('open');
  });
  if(adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
        customConfirm('Ви впевнені, що хочете вийти з адмін-панелі?', (result) => {
            if (result) {
                currentUser = null;
                localStorage.removeItem(CURRENT_USER_KEY);
                if(adminSidebar) adminSidebar.classList.remove('open');
                updateAuthUI();
            }
        });
    });
  }
  
  // Обробник подій: Пошук користувачів в Адмін-панелі
  if (userSearchSidebar) {
      userSearchSidebar.addEventListener('input', (e) => {
          renderAdminSidebarData(e.target.value); 
      });
  }

  // Lightbox 
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
  if(openAuthBtn) openAuthBtn.addEventListener('click', () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        if(adminSidebar) adminSidebar.classList.add('open');
        renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
      } else {
        customConfirm(`Ви впевнені, що хочете вийти з акаунту ${currentUser.username}?`, (result) => {
          if (result) {
            currentUser = null;
            localStorage.removeItem(CURRENT_USER_KEY);
            updateAuthUI();
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
  if(registerForm) registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const users = load(USERS_KEY, []);
    const regularUsers = users.filter(u => u.role !== 'admin');
    if (regularUsers.length >= MAX_USERS) {
        return customConfirm(`Досягнуто ліміту користувачів (${MAX_USERS}). Зверніться до Адміна.`);
    }

    const user = regUser.value.trim();
    const email = regEmail.value.trim();
    const pass = regPass.value;

    if(user.length < 3) return customConfirm('Логін має бути довший 3 символів');
    if(pass.length < 6) return customConfirm('Пароль має бути довший 6 символів');
    if(pass !== regPassConfirm.value) return customConfirm('Паролі не співпадають');
    
    if(users.find(u => u.username === user)) return customConfirm('Логін зайнятий');
    if(users.find(u => u.email === email)) return customConfirm('Email вже використовується');
    
    const now = new Date();
    users.push({ 
        username: user, 
        email: email, 
        password: pass, 
        role: 'member', 
        regDate: now.toISOString() 
    });
    save(USERS_KEY, users);
    
    updateAuthUI();
    customConfirm('Готово! Тепер можете увійти.');
    if(document.getElementById('tabLogin')) document.getElementById('tabLogin').click();
    registerForm.reset();
  });

  // LOGIN
  if(loginForm) loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = loginUser.value.trim();
    const pass = loginPass.value;

    if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
      currentUser = { username: 'ADMIN 🦈', role: 'admin' };
      save(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      customConfirm('Ласкаво просимо, Адмін!');
      return;
    }

    const users = load(USERS_KEY, []); 
    const found = users.find(u => u.username === user && u.password === pass);

    if (found) {
      currentUser = { username: found.username, role: found.role };
      save(CURRENT_USER_KEY, currentUser);
      updateAuthUI();
      if(authModal) authModal.classList.remove('show');
      customConfirm(`Вітаємо, ${found.username}!`);
    } else {
      customConfirm('Невірні дані (логін або пароль)');
    }
  });


  // ADD NEWS 
  if(addNewsBtn) {
    addNewsBtn.addEventListener('click', () => {
        if (!newsTitle.value || !newsDate.value || !newsSummary.value) {
            return customConfirm('Будь ласка, заповніть усі поля для події.');
        }

        const newNews = {
            id: Date.now(),
            title: newsTitle.value,
            date: newsDate.value,
            summary: newsSummary.value
        };

        news.push(newNews);
        save(NEWS_KEY, news);
        renderNews();

        newsTitle.value = '';
        newsDate.value = '';
        newsSummary.value = '';
        customConfirm('Подію додано.');
    });
  }

  // ADD GALLERY 
  if(addGalleryBtn) {
    addGalleryBtn.addEventListener('click', ()=>{
      const url = galleryUrl.value.trim(); 
      if(!url) return customConfirm('Вкажіть коректне посилання на зображення');
      gallery.push({id:Date.now(), url});
      save(GALLERY_KEY,gallery); 
      galleryUrl.value=''; 
      renderGallery();
      customConfirm('Фото додано.');
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
  
  if(addMemberForm) {
      addMemberForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          if(!currentUser) return; 
          
          const newName = memberNewName.value.trim();
          const newRole = memberNewRole.value.trim();
          const newDiscord = memberNewDiscord.value.trim();
          const newYoutube = memberNewYoutube.value.trim();
          const newTg = memberNewTg.value.trim();
          
          if (!newName || !newRole) return customConfirm("Будь ласка, заповніть ім'я та роль.");

          const newId = Date.now();
          const newMember = {
            id: newId,
            name: newName,
            role: newRole,
            owner: currentUser.username,
            links: {
                discord: newDiscord,
                youtube: newYoutube,
                tg: newTg
            }
          };

          members.push(newMember);
          save(MEMBERS_KEY, members);
          renderMembers(memberSearch ? memberSearch.value : '');
          closeAddMemberModal();
          customConfirm(`Учасника ${newName} додано!`);
      });
  }


  // Member Search (основний)
  if(memberSearch) {
      memberSearch.addEventListener('input', (e) => {
          renderMembers(e.target.value);
      });
  }

  // Initial Render and Animation Activation
  updateAuthUI(); 
  renderMembers();
  renderNews();
  renderGallery();
  
  // Активація анімації після початкового завантаження DOM
  checkVisibilityAndAnimate();
});
