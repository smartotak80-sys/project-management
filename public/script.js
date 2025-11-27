// script.js - Оновлений для Fetch API

document.addEventListener('DOMContentLoaded', () => {
  // --- КОНСТАНТИ ---
  const CURRENT_USER_KEY = 'barakuda_current_user';
  const MAX_MEMBER_PER_USER = 1; 

  // --- ДОПОМІЖНІ ФУНКЦІЇ ---
  // ... (timeAgo, escapeHtml, customConfirm - залишаються) ...
  
  // Функція для завантаження користувача з LocalStorage (єдине, що залишилось)
  function loadCurrentUser(){ 
      try{ 
          const v = localStorage.getItem(CURRENT_USER_KEY); 
          return v ? JSON.parse(v) : null;
      } catch(e){ return null; } 
  }
  function saveCurrentUser(val){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val)) }
  
  // ...
  
  // --- КЕШУВАННЯ ДАНИХ (для клієнта) ---
  let members = [];
  let news = [];
  let gallery = [];
  let currentUser = loadCurrentUser(); 
  
  // ... (Кешування DOM елементів - залишається) ...
  
  // --- ФУНКЦІЇ ДЛЯ API (КЛЮЧОВА ЗМІНА) ---
  
  /**
   * Створює заголовки для автентифікації на сервері.
   */
  function getAuthHeaders() {
      if (!currentUser) return {};
      return {
          'X-Auth-User': currentUser.username,
          'X-Auth-Role': currentUser.role
      };
  }

  /**
   * Універсальний Fetch-обробник
   */
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
          console.error("API Fetch Error:", error);
          customConfirm('Помилка з\'єднання з сервером.');
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
      }
  }
  
  // ... (checkAccess, updateAuthUI - залишаються, але використовують currentUser) ...
  
  // --- ФУНКЦІЇ РЕНДЕРИНГУ ---
  // ... (renderAdminSidebarData, renderMembers, renderNews, renderGallery - залишаються, але працюють з глобальними масивами members/news/gallery) ...
  
  // --- ГЛОБАЛЬНІ ФУНКЦІЇ (ОБРОБКА ДІЙ) ---
  
  async function banUser(username) {
      customConfirm(`Ви впевнені, що хочете заблокувати користувача ${username}?`, async (result) => {
          if (!result) return;
          
          const data = await apiFetch(`/api/users/${username}`, { method: 'DELETE' });
          if (data && currentUser && currentUser.username === username && currentUser.role !== 'admin') {
              currentUser = null;
              localStorage.removeItem(CURRENT_USER_KEY);
              updateAuthUI();
              loadInitialData(); // Оновлення всіх даних, включаючи список учасників
          }
          if(data) {
              renderAdminSidebarData(userSearchSidebar ? userSearchSidebar.value : '');
              customConfirm(`Користувача ${username} видалено.`);
          }
      });
  }

  async function editMember(id) {
      // ... (схожа логіка перевірки прав та збору даних через prompt) ...
      
      const member = members.find(m => m.id == id);
      if (!member) return;
      
      const newName = prompt(`Редагувати ім'я для ${member.name}:`, member.name);
      if (newName === null || newName.trim() === '') return;
      // ... (збір інших полів) ...

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
          // Оновлення локального кешу
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

  // ... (Lightbox функції - залишаються) ...


  // --- ОБРОБНИКИ ПОДІЙ ---

  // ... (Toggle, Scroll, Smooth Scroll, Sidebar - залишаються) ...

  // AUTH SYSTEM (Login & Register)
  if(registerForm) registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // ... (валідація полів) ...
      
      const body = {
          username: regUser.value.trim(), 
          email: regEmail.value.trim(), 
          password: regPass.value
      };

      const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(body)
      });
      
      if (data && document.getElementById('tabLogin')) {
          updateAuthUI();
          customConfirm('Готово! Тепер можете увійти.');
          document.getElementById('tabLogin').click();
          registerForm.reset();
      }
  });

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
          
          // Для Адміна оновлюємо дані одразу після входу
          if(currentUser.role === 'admin') {
              loadInitialData();
          }
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
            news.sort((a,b)=>b.id-a.id); // Сортування на клієнті
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
          
          // ... (збір даних) ...

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
  loadInitialData(); // Завантаження даних з API
  
  // ... (checkVisibilityAndAnimate - залишається) ...
});
