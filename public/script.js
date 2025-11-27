// public/script.js
const API_URL = ""; // якщо сервер і фронтенд на одному порту, залишити порожнім

// --- DOM Elements ---
const loginForm = document.getElementById("loginForm");
const membersList = document.getElementById("membersList");
const addMemberForm = document.getElementById("addMemberForm");

// --- UTILS ---
function getToken() {
  return localStorage.getItem("token") || "";
}

function setToken(token) {
  localStorage.setItem("token", token);
}

// --- LOGIN ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = loginForm.username.value;
    const pass = loginForm.password.value;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });

    const data = await res.json();
    if (data.ok) {
      setToken(data.token);
      alert("Вхід успішний!");
    } else {
      alert("Помилка входу: " + data.error);
    }
  });
}

// --- GET MEMBERS ---
async function loadMembers() {
  const res = await fetch(`${API_URL}/api/members`);
  const data = await res.json();
  if (data.ok) {
    membersList.innerHTML = data.members
      .map(
        (m) => `<li>${m.name} — ${m.role} (Owner: ${m.owner})</li>`
      )
      .join("");
  }
}
if (membersList) loadMembers();

// --- ADD MEMBER ---
if (addMemberForm) {
  addMemberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    const name = addMemberForm.name.value;
    const role = addMemberForm.role.value;

    const res = await fetch(`${API_URL}/api/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ name, role }),
    });

    const data = await res.json();
    if (data.ok) {
      alert("Член доданий!");
      loadMembers();
    } else {
      alert("Помилка: " + data.error);
    }
  });
}
