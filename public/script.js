// script.js - Оновлений для Fetch API

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

  // Функція для стилізованого customConfirm (залишається без змін)
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

  
  // --- КЕШУВАННЯ ДАНИХ (для клієнта) ---
  let members = [];
  let news = [];
  let gallery = [];
  let currentUser = loadCurrentUser(); 
  
  // --- КЕШУВАННЯ DOM ЕЛЕМЕНТІВ (залишається) ---
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
  let allUsersCache = []; // Кеш користувачів для адмін-панелі


  // --- API ФУНКЦІЇ ---
  
  function getAuthHeaders() {
      if (!currentUser) return {};
      // Надсилаємо дані користувача в заголовках для авторизації на бекенді
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
          customConfirm('Помилка з\'єднання з сервером. Перевірте мережу або Railway.');
          return null;
      }
  }


  // --- ФУНКЦІЇ ЗАВАНТАЖЕННЯ (Loaders) ---
  async function loadInitialData() {
      // 1. Завантаження учасників
      const membersData = await apiFetch('/api/members');
      if (membersData) members = membersData;
      renderMembers(memberSearch ? memberSearch.value : '');

      // 2. Завантаження новин
      const newsData = await apiFetch('/api/news');
      if (newsData) news = newsData;
      renderNews();

      // 3. Завантаження галереї
      const galleryData = await apiFetch('/api/gallery');
      if (galleryData) gallery = galleryData;
      renderGallery();
      
      // 4. Оновлення лічильників
      const countsData = await apiFetch('/api/users/count');
      if(countsData){
          if(totalUsersSidebar) totalUsersSidebar.textContent = countsData.totalUsers;
          if(totalAdminsSidebar) totalAdminsSidebar.textContent = countsData.totalAdmins;
          // Оновлюємо UI реєстрації тут, оскільки ліміт перевіряється на сервері
          if (tabRegister) {
            const canRegister = countsData.totalUsers < 100; // Використовуємо ліміт із сервера
            if (!canRegister) {
              tabRegister.textContent = 'Реєстрація (Зайнято)';
              tabRegister.disabled = true;
            } else {
              tabRegister.textContent = 'Реєстрація';
              tabRegister.disabled = false;
            }
          }
      }

      // 5. Завантаження користувачів для Адмін-панелі (якщо адміністратор)
      if (currentUser && currentUser.role === 'admin') {
          const usersData = await apiFetch('/api/users');
          if (usersData) allUsersCache = usersData;
      }
  }

  // --- UI & РЕНДЕРИНГ (АДАПТОВАНО) ---
  
  function checkAccess() {
    const body = document.body;
    body.classList.toggle('is-logged-in', !!currentUser);
    body.classList.toggle('is-admin', currentUser && currentUser.role === 'admin');
  }

  function updateAuthUI() {
      // ... (схожа логіка як в оригіналі, але без перевірки canRegister, яка тепер у loadInitialData)
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
  
  // --- (renderMembers, renderNews, renderGallery - залишаються як у оригіналі, працюючи з локальними members/news/gallery масивами) ---


  // --- ГЛОБАЛЬНІ ФУНКЦІЇ (ОБРОБКА ДІЙ API) ---
  
  async function banUser(username) {
      customConfirm(`Ви впевнені, що хочете заблокувати користувача ${username}?`, async (result) => {
          if (!result) return;
          
          const data = await apiFetch(`/api/users/${username}`, { method: 'DELETE' });
          if (data) {
              // Оновлюємо кеш та UI
              allUsersCache = allUsersCache.filter(u => u.username !== username);
              renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
              loadInitialData(); // Оновлення лічильників та учасників

              // Якщо забанили самого себе (якщо не адмін)
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

  // --- ОБРОБНИКИ ПОДІЙ (АДАПТОВАНО) ---

  // ... (Delegation, Scroll Events, Smooth Scroll - залишаються) ...

  // Admin Sidebar 
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

  // Обробник подій: Пошук користувачів в Адмін-панелі
  if (userSearchSidebar) {
      userSearchSidebar.addEventListener('input', (e) => {
          renderAdminSidebarData(e.target.value); 
      });
  }

  // AUTH SYSTEM
  if(openAuthBtn) openAuthBtn.addEventListener('click', async () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        // Оновлюємо кеш користувачів перед відкриттям панелі
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
          loadInitialData(); // Оновлюємо лічильники
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


  // Initial Render and Animation Activation
  updateAuthUI(); 
  loadInitialData(); 
  
  // (checkVisibilityAndAnimate - залишається)
});
