// public/script.js
const API_URL = ""; // якщо фронтенд і бекенд на одному сервері/порту

// --- DOM Elements ---
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const membersGrid = document.getElementById("membersGrid");
const addMemberForm = document.getElementById("addMemberForm");
const authBtnText = document.getElementById("authBtnText");

// --- UTILS ---
function getToken() {
  return localStorage.getItem("token") || "";
}
function setToken(token) {
  localStorage.setItem("token", token);
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
      alert("Успішний вхід!");
    } else {
      alert("Помилка: " + data.error);
    }
  });
}

// --- LOAD MEMBERS ---
async function loadMembers() {
  const res = await fetch(`${API_URL}/api/members`);
  const data = await res.json();
  if (data.ok) {
    membersGrid.innerHTML = data.members
      .map(
        (m) => `
      <div class="member-card">
        <h4>${m.name}</h4>
        <p>Роль: ${m.role}</p>
        <p>Owner: ${m.owner}</p>
      </div>
    `
      )
      .join("");
  }
}
if (membersGrid) loadMembers();

// --- ADD MEMBER ---
if (addMemberForm) {
  addMemberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    const name = document.getElementById("memberNewName").value;
    const role = document.getElementById("memberNewRole").value;

    const res = await fetch(`${API_URL}/api/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        name, 
        role,
        discord: document.getElementById("memberNewDiscord").value,
        youtube: document.getElementById("memberNewYoutube").value,
        tg: document.getElementById("memberNewTg").value
      }),
    });

    const data = await res.json();
    if (data.ok) {
      alert("Учасник доданий!");
      loadMembers();
    } else {
      alert("Помилка: " + data.error);
    }
  });
}
