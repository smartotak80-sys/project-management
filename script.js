const API = "https://YOUR-RAILWAY-URL/api";

// --- Download Members ---
async function loadMembers() {
  const list = await fetch(API + "/members").then(r => r.json());
  renderMembers(list);
}

// --- Add Member ---
async function addMember(data) {
  await fetch(API + "/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  loadMembers();
}

// --- Delete Member ---
async function deleteMember(id) {
  await fetch(API + "/members/" + id, { method: "DELETE" });
  loadMembers();
}

// -------------------- NEWS -------------------

async function loadNews() {
  const list = await fetch(API + "/news").then(r => r.json());
  renderNews(list);
}

async function addNews(data) {
  await fetch(API + "/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  loadNews();
}

async function deleteNews(id) {
  await fetch(API + "/news/" + id, { method: "DELETE" });
  loadNews();
}

// -------------------- GALLERY -------------------

async function loadGallery() {
  const list = await fetch(API + "/gallery").then(r => r.json());
  renderGallery(list);
}

async function addGallery(data) {
  await fetch(API + "/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  loadGallery();
}

async function deleteGallery(id) {
  await fetch(API + "/gallery/" + id, { method: "DELETE" });
  loadGallery();
}

// ------------------------ INIT ------------------------

loadMembers();
loadNews();
loadGallery();

// Далі лишаєш свої render-функції, модалки, UI та ін.
