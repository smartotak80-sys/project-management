// public/script.js
const API_URL = ""; // якщо фронтенд і бекенд на одному сервері/порту

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

// --- UTILS ---
function getToken() {
  return localStorage.getItem("token") || "";
}
function setToken(token) {
  localStorage.setItem("token", token);
}
function isLoggedIn() {
  return !!getToken();
}
function showAlert(msg) {
  alert(msg);
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
      showAlert("Успішний вхід!");
      loadAll(); // підвантажуємо дані після входу
    } else {
      showAlert("Помилка: " + data.error);
    }
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

// Вихід
if (openAuthBtn) {
  openAuthBtn.addEventListener("click", () => {
    if (isLoggedIn()) {
      localStorage.removeItem("token");
      authBtnText.innerText = "Вхід";
      showAlert("Ви вийшли");
    } else {
      document.getElementById("authModal").style.display = "block";
    }
  });
}

// --- LOAD MEMBERS ---
async function loadMembers() {
  const res = await fetch(`${API_URL}/api/members`);
  const data = await res.json();
  if (!data.ok) return;

  membersGrid.innerHTML = data.members
    .map(
      (m) => `
      <div class="member-card">
        <h4>${m.name}</h4>
        <p>Роль: ${m.role}</p>
        ${m.discord ? `<p>Discord: ${m.discord}</p>` : ""}
        ${m.youtube ? `<p>YouTube: <a href="${m.youtube}" target="_blank">Посилання</a></p>` : ""}
        ${m.tg ? `<p>Telegram: <a href="${m.tg}" target="_blank">Посилання</a></p>` : ""}
      </div>
    `
    )
    .join("");
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        role,
        discord: document.getElementById("memberNewDiscord").value,
        youtube: document.getElementById("memberNewYoutube").value,
        tg: document.getElementById("memberNewTg").value,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      showAlert("Учасник доданий!");
      loadMembers();
    } else showAlert("Помилка: " + data.error);
  });
}

// --- LOAD NEWS ---
async function loadNews() {
  const res = await fetch(`${API_URL}/api/news`);
  const data = await res.json();
  if (!data.ok) return;

  newsList.innerHTML = data.news
    .map(
      (n) => `
      <div class="news-item">
        <h4>${n.title}</h4>
        <small>${n.date}</small>
        <p>${n.summary}</p>
      </div>
    `
    )
    .join("");
}

// --- ADD NEWS ---
if (addNewsBtn) {
  addNewsBtn.addEventListener("click", async () => {
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
    if (data.ok) {
      showAlert("Новина додана!");
      loadNews();
    } else showAlert("Помилка: " + data.error);
  });
}

// --- LOAD GALLERY ---
async function loadGallery() {
  const res = await fetch(`${API_URL}/api/gallery`);
  const data = await res.json();
  if (!data.ok) return;

  galleryGrid.innerHTML = data.images
    .map(
      (img) => `<div class="gallery-item">
        <img src="${img.url}" alt="Gallery Image">
      </div>`
    )
    .join("");
}

// --- INIT ---
async function loadAll() {
  await loadMembers();
  await loadNews();
  await loadGallery();
  authBtnText.innerText = isLoggedIn() ? "Вийти" : "Вхід";
}

// старт
loadAll();
