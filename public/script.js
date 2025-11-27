// public/script.js
const API_URL = ""; // якщо фронт і бек на одному сервері/порту

// --- DOM Elements ---
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const membersGrid = document.getElementById("membersGrid");
const newsList = document.getElementById("newsList");
const galleryGrid = document.getElementById("galleryGrid");
const addMemberForm = document.getElementById("addMemberForm");
const addNewsBtn = document.getElementById("addNewsBtn");
const authBtnText = document.getElementById("authBtnText");
const openAuthBtn = document.getElementById("openAuthBtn");
const authModal = document.getElementById("authModal");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const closeAuth = document.getElementById("closeAuth");
const addMemberModal = document.getElementById("addMemberModal");
const closeMemberModal = document.getElementById("closeMemberModal");

// --- UTILS ---
function getToken() { return localStorage.getItem("token") || ""; }
function setToken(token) { localStorage.setItem("token", token); }
function isLoggedIn() { return !!getToken(); }
function showAlert(msg) { alert(msg); }
function toggleAdminUI(show) {
  document.querySelectorAll(".admin-only, .logged-in-only").forEach(el => {
    el.style.display = show ? "block" : "none";
  });
}

// --- AUTH ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    const data = await res.json();
    if (data.ok) {
      setToken(data.token);
      authBtnText.innerText = "Вийти";
      authModal.style.display = "none";
      showAlert("Успішний вхід!");
      loadAll();
    } else showAlert("Помилка: " + data.error);
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("regUser").value;
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPass").value;
    const passConfirm = document.getElementById("regPassConfirm").value;

    if (pass !== passConfirm) return showAlert("Паролі не збігаються!");

    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, email, pass }),
    });
    const data = await res.json();
    if (data.ok) showAlert("Акаунт створено! Вхід через форму логіну.");
    else showAlert("Помилка: " + data.error);
  });
}

// --- OPEN / CLOSE AUTH MODAL ---
if (openAuthBtn) {
  openAuthBtn.addEventListener("click", () => {
    if (isLoggedIn()) {
      localStorage.removeItem("token");
      authBtnText.innerText = "Вхід";
      toggleAdminUI(false);
      showAlert("Ви вийшли");
      loadAll();
    } else authModal.style.display = "flex";
  });
}
if (closeAuth) closeAuth.addEventListener("click", () => authModal.style.display = "none");

// --- SWITCH AUTH TABS ---
if (tabLogin && tabRegister) {
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  });
  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });
}

// --- LOAD MEMBERS ---
async function loadMembers() {
  const res = await fetch(`${API_URL}/api/members`);
  const data = await res.json();
  if (!data.ok) return;
  membersGrid.innerHTML = data.members.map(m => `
    <div class="member-card">
      <h4>${m.name}</h4>
      <p>Роль: ${m.role}</p>
      ${m.discord ? `<p>Discord: ${m.discord}</p>` : ""}
      ${m.youtube ? `<p>YouTube: <a href="${m.youtube}" target="_blank">Посилання</a></p>` : ""}
      ${m.tg ? `<p>Telegram: <a href="${m.tg}" target="_blank">Посилання</a></p>` : ""}
    </div>
  `).join("");
}

// --- ADD MEMBER ---
if (addMemberForm) {
  addMemberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return showAlert("Вхід обов'язковий!");

    const name = document.getElementById("memberNewName").value;
    const role = document.getElementById("memberNewRole").value;

    const res = await fetch(`${API_URL}/api/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name, role,
        discord: document.getElementById("memberNewDiscord").value,
        youtube: document.getElementById("memberNewYoutube").value,
        tg: document.getElementById("memberNewTg").value
      }),
    });
    const data = await res.json();
    if (data.ok) { showAlert("Учасник доданий!"); loadMembers(); addMemberModal.style.display = "none"; }
    else showAlert("Помилка: " + data.error);
  });
}

// --- OPEN / CLOSE ADD MEMBER MODAL ---
document.getElementById("addMemberBtn")?.addEventListener("click", () => {
  if (!isLoggedIn()) return showAlert("Вхід обов'язковий!");
  addMemberModal.style.display = "flex";
});
closeMemberModal?.addEventListener("click", () => addMemberModal.style.display = "none");

// --- LOAD NEWS ---
async function loadNews() {
  const res = await fetch(`${API_URL}/api/news`);
  const data = await res.json();
  if (!data.ok) return;
  newsList.innerHTML = data.news.map(n => `
    <div class="news-item">
      <h4>${n.title}</h4>
      <small>${n.date}</small>
      <p>${n.summary}</p>
    </div>
  `).join("");
}

// --- ADD NEWS ---
addNewsBtn?.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return showAlert("Вхід обов'язковий!");
  const title = document.getElementById("newsTitle").value;
  const date = document.getElementById("newsDate").value;
  const summary = document.getElementById("newsSummary").value;

  const res = await fetch(`${API_URL}/api/news`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, date, summary }),
  });
  const data = await res.json();
  if (data.ok) { showAlert("Новина додана!"); loadNews(); }
  else showAlert("Помилка: " + data.error);
});

// --- LOAD GALLERY ---
async function loadGallery() {
  const res = await fetch(`${API_URL}/api/gallery`);
  const data = await res.json();
  if (!data.ok) return;
  galleryGrid.innerHTML = data.images.map(img => `
    <div class="gallery-item">
      <img src="${img.url}" alt="Gallery Image" class="gallery-thumb">
    </div>
  `).join("");

  // Lightbox
  document.querySelectorAll(".gallery-thumb").forEach((img, idx, arr) => {
    img.addEventListener("click", () => openLightbox(idx, arr));
  });
}

// --- LIGHTBOX ---
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
let currentImgIndex = 0;
let galleryImgs = [];

function openLightbox(idx, arr) {
  currentImgIndex = idx;
  galleryImgs = arr;
  lightbox.style.display = "flex";
  lightboxImage.src = arr[idx].src;
}
document.getElementById("lightboxCloseBtn")?.addEventListener("click", () => lightbox.style.display = "none");
document.getElementById("lightboxPrevBtn")?.addEventListener("click", () => {
  currentImgIndex = (currentImgIndex - 1 + galleryImgs.length) % galleryImgs.length;
  lightboxImage.src = galleryImgs[currentImgIndex].src;
});
document.getElementById("lightboxNextBtn")?.addEventListener("click", () => {
  currentImgIndex = (currentImgIndex + 1) % galleryImgs.length;
  lightboxImage.src = galleryImgs[currentImgIndex].src;
});

// --- INIT ALL ---
async function loadAll() {
  toggleAdminUI(isLoggedIn());
  await loadMembers();
  await loadNews();
  await loadGallery();
  authBtnText.innerText = isLoggedIn() ? "Вийти" : "Вхід";
}

// старт
loadAll();
