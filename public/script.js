// ----------------- РЕЄСТРАЦІЯ -----------------
async function registerUser() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        localStorage.setItem("currentUser", username);
        window.location.href = "/create.html";
    }
}

// ----------------- СТВОРЕННЯ ПЕРСОНАЖА -----------------
async function createCharacter() {
    const name = document.getElementById("char-name").value;
    const rank = document.getElementById("char-rank").value;
    const discord = document.getElementById("char-discord").value;
    const youtube = document.getElementById("char-youtube").value;

    const owner = localStorage.getItem("currentUser");

    const res = await fetch("/api/create-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rank, discord, youtube, owner })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        window.location.href = "/index.html";
    }
}
