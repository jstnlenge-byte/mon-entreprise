require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;
const WHATSAPP = "243998505243";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@jslengetech.com";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "ChangeMoi123!2026";

const APP_SECRET =
  process.env.APP_SECRET || "CHANGE_THIS_SECRET";

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SECRET_KEY manque dans .env");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY
);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   MULTER
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Le fichier doit être une image."));
    }

    cb(null, true);
  }
});

/* =========================================================
   OUTILS
========================================================= */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonError(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    message
  });
}

function jsonSuccess(res, data = {}) {
  return res.json({
    success: true,
    ...data
  });
}

/* =========================================================
   TOKENS
========================================================= */

function createToken(type, id, email) {
  const payload = `${type}:${id}:${email}:${Date.now()}`;

  const signature = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(
    JSON.stringify({
      type,
      id,
      email,
      createdAt: Date.now(),
      signature
    })
  ).toString("base64url");
}

function verifyToken(token) {
  try {
    const data = JSON.parse(
      Buffer.from(token, "base64url").toString()
    );

    if (!data.type || !data.email || !data.signature) {
      return null;
    }

    const payload = `${data.type}:${data.id}:${data.email}:${data.createdAt}`;

    const expected = crypto
      .createHmac("sha256", APP_SECRET)
      .update(payload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(data.signature),
        Buffer.from(expected)
      )
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function getToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
}

function requireMember(req, res, next) {
  const token = getToken(req);
  const user = token ? verifyToken(token) : null;

  if (!user || user.type !== "member") {
    return jsonError(res, "Connexion membre requise.", 401);
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const token = getToken(req);
  const user = token ? verifyToken(token) : null;

  if (!user || user.type !== "admin") {
    return jsonError(res, "Accès administrateur requis.", 401);
  }

  req.user = user;
  next();
}

/* =========================================================
   PAGE HTML
========================================================= */

function page(title, content, scripts = "") {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)} - JS LENGE TECH SERVICES</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f4f7fb;
  color: #172033;
}

header {
  background: #101828;
  color: white;
  padding: 18px 5%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.logo {
  font-size: 21px;
  font-weight: bold;
}

nav a {
  color: white;
  text-decoration: none;
  margin: 5px;
  padding: 9px 13px;
  border-radius: 8px;
  display: inline-block;
}

nav a:hover {
  background: #24324a;
}

.container {
  width: 92%;
  max-width: 1100px;
  margin: 30px auto;
}

.hero {
  background: white;
  padding: 35px;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,.07);
  margin-bottom: 25px;
}

.hero h1 {
  margin-top: 0;
  font-size: 35px;
}

.hero p {
  line-height: 1.7;
}

.btn {
  border: none;
  background: #101828;
  color: white;
  padding: 12px 18px;
  border-radius: 9px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  margin: 4px;
}

.btn:hover {
  opacity: .9;
}

.btn-green {
  background: #16a34a;
}

.btn-blue {
  background: #2563eb;
}

.btn-red {
  background: #dc2626;
}

.card {
  background: white;
  padding: 22px;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,.06);
  margin-bottom: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
  gap: 18px;
}

input, textarea, select {
  width: 100%;
  padding: 12px;
  margin: 7px 0 14px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 15px;
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.member {
  text-align: center;
}

.member img {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #e5e7eb;
}

.badge {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 20px;
  background: #e5e7eb;
  font-size: 13px;
}

.success {
  color: #15803d;
  font-weight: bold;
}

.error {
  color: #dc2626;
  font-weight: bold;
}

footer {
  text-align: center;
  padding: 30px;
  color: #667085;
}

.small {
  color: #667085;
  font-size: 14px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
</head>

<body>

<header>
  <div class="logo">JS LENGE TECH SERVICES</div>

  <nav>
    <a href="/">Accueil</a>
    <a href="/register">Inscription</a>
    <a href="/login">Connexion</a>
    <a href="/admin">Admin</a>
  </nav>
</header>

<main class="container">
${content}
</main>

<footer>
JS LENGE TECH SERVICES © 2026 — Justin Lenge
</footer>

${scripts}

</body>
</html>
`;
}

/* =========================================================
   ACCUEIL
========================================================= */

app.get("/", async (req, res) => {

  let members = [];

  try {
    const result = await supabase
      .from("members")
      .select("id,name,country,skills,bio,photo,phone")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (!result.error) {
      members = result.data || [];
    }
  } catch {}

  const membersHtml = members.length
    ? members.map(member => {

        const phone = (member.phone || "").replace(/\D/g, "");

        const whatsapp =
          phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(
                "Bonjour, je viens de JS LENGE TECH SERVICES et je souhaite collaborer avec vous."
              )}`
            : `https://wa.me/${WHATSAPP}`;

        return `
        <div class="card member">

          ${
            member.photo
              ? `<img src="${escapeHtml(member.photo)}" alt="Photo">`
              : `<div style="
                    width:110px;
                    height:110px;
                    border-radius:50%;
                    margin:auto;
                    background:#e5e7eb;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:40px;
                  ">👤</div>`
          }

          <h3>${escapeHtml(member.name)}</h3>

          <div class="badge">
            ${escapeHtml(member.country || "RDC")}
          </div>

          <p>
            <strong>Compétences :</strong><br>
            ${escapeHtml(member.skills || "Non renseignées")}
          </p>

          <p>
            ${escapeHtml(member.bio || "")}
          </p>

          <a
            class="btn btn-green"
            href="${whatsapp}"
            target="_blank"
          >
            WhatsApp
          </a>

        </div>
        `;
      }).join("")
    : `
      <div class="card">
        <p>Aucun membre approuvé pour le moment.</p>
      </div>
    `;

  res.send(
    page(
      "Accueil",
      `
      <section class="hero">

        <h1>Bienvenue sur JS LENGE TECH SERVICES 🚀</h1>

        <p>
          Bonjour chers membres, bienvenue sur notre plateforme.
        </p>

        <p>
          Moi c'est <strong>Justin Lenge</strong>.
        </p>

        <p>
          Je suis Congolais de la République démocratique du Congo,
          basé à Congo-Kinshasa.
        </p>

        <p>
          Je suis passionné par l'informatique,
          l'intelligence artificielle, le design
          et les nouvelles technologies.
        </p>

        <p>
          Cette plateforme a pour objectif de réunir des personnes
          compétentes, partager des idées, développer des projets
          et collaborer ensemble.
        </p>

        <p>
          Notre objectif est de créer une communauté capable
          de travailler ensemble sur des projets locaux
          et internationaux.
        </p>

        <a class="btn btn-blue" href="/register">
          Rejoindre la plateforme
        </a>

        <a
          class="btn btn-green"
          target="_blank"
          href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
            "Bonjour Justin, je souhaite collaborer avec JS LENGE TECH SERVICES."
          )}"
        >
          Contacter Justin
        </a>

      </section>

      <section class="card">

        <h2>👨‍💻 Fondateur</h2>

        <div style="text-align:center">

          <div style="
            width:150px;
            height:150px;
            border-radius:50%;
            margin:auto;
            background:#e5e7eb;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:60px;
          ">
            👤
          </div>

          <h2>Justin Lenge</h2>

          <p>
            Fondateur — JS LENGE TECH SERVICES
          </p>

          <p>
            Informatique • IA • Design • Technologies
          </p>

        </div>

      </section>

      <section>
        <h2>🌍 Membres de la communauté</h2>

        <div class="grid">
          ${membersHtml}
        </div>
      </section>
      `
    )
  );
});

/* =========================================================
   INSCRIPTION
========================================================= */

app.get("/register", (req, res) => {

  res.send(
    page(
      "Inscription",
      `
      <div class="card">

        <h1>📝 Rejoindre JS LENGE TECH SERVICES</h1>

        <p class="small">
          Remplissez le formulaire. Votre compte devra être
          approuvé par l'administration.
        </p>

        <form id="registerForm">

          <label>Nom complet</label>
          <input id="name" required>

          <label>Email</label>
          <input id="email" type="email" required>

          <label>Mot de passe</label>
          <input id="password" type="password" minlength="6" required>

          <label>Pays</label>
          <input id="country" value="RDC">

          <label>Numéro WhatsApp</label>
          <input
            id="phone"
            placeholder="+243..."
          >

          <label>Compétences</label>
          <input
            id="skills"
            placeholder="Informatique, IA, Design..."
          >

          <label>Présentation</label>
          <textarea
            id="bio"
            placeholder="Présentez-vous..."
          ></textarea>

          <button class="btn btn-blue">
            Créer mon compte
          </button>

        </form>

        <div id="message"></div>

      </div>
      `,
      `
<script>
document.getElementById("registerForm").addEventListener("submit", async function(e) {

  e.preventDefault();

  const message = document.getElementById("message");

  message.innerHTML = "⏳ Création du compte...";

  try {

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({

        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        country: document.getElementById("country").value,
        phone: document.getElementById("phone").value,
        skills: document.getElementById("skills").value,
        bio: document.getElementById("bio").value

      })
    });

    const data = await response.json();

    if (!data.success) {
      message.innerHTML =
        '<p class="error">❌ ' +
        data.message +
        '</p>';
      return;
    }

    message.innerHTML =
      '<p class="success">✅ ' +
      data.message +
      '</p>';

    document.getElementById("registerForm").reset();

  } catch (error) {

    message.innerHTML =
      '<p class="error">❌ Erreur de connexion au serveur.</p>';
  }

});
</script>
`
    )
  );
});

/* =========================================================
   CONNEXION
========================================================= */

app.get("/login", (req, res) => {

  res.send(
    page(
      "Connexion",
      `
      <div class="card">

        <h1>🔐 Connexion membre</h1>

        <form id="loginForm">

          <label>Email</label>
          <input id="email" type="email" required>

          <label>Mot de passe</label>
          <input id="password" type="password" required>

          <button class="btn btn-blue">
            Se connecter
          </button>

        </form>

        <div id="message"></div>

      </div>
      `,
      `
<script>
document.getElementById("loginForm").addEventListener("submit", async function(e) {

  e.preventDefault();

  const message = document.getElementById("message");

  message.innerHTML = "⏳ Connexion...";

  try {

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({

        email: document.getElementById("email").value,
        password: document.getElementById("password").value

      })
    });

    const data = await response.json();

    if (!data.success) {

      message.innerHTML =
        '<p class="error">❌ ' +
        data.message +
        '</p>';

      return;
    }

    localStorage.setItem("member_token", data.token);

    window.location.href = "/member";

  } catch {

    message.innerHTML =
      '<p class="error">❌ Erreur serveur.</p>';
  }

});
</script>
`
    )
  );
});

/* =========================================================
   ESPACE MEMBRE
========================================================= */

app.get("/member", (req, res) => {

  res.send(
    page(
      "Espace membre",
      `
      <div class="card">

        <h1>👨‍💻 Mon espace membre</h1>

        <div id="profile">
          ⏳ Chargement...
        </div>

      </div>

      <div class="card">

        <h2>📸 Photo de profil</h2>

        <form id="photoForm">

          <input
            id="photo"
            type="file"
            accept="image/*"
            required
          >

          <button class="btn btn-blue">
            Envoyer la photo
          </button>

        </form>

        <div id="photoMessage"></div>

      </div>

      <div class="card">

        <h2>💡 Proposer un projet</h2>

        <form id="projectForm">

          <label>Titre du projet</label>
          <input id="title" required>

          <label>Catégorie</label>
          <input
            id="category"
            placeholder="IA, informatique, design..."
          >

          <label>Description</label>
          <textarea id="description" required></textarea>

          <button class="btn btn-blue">
            Envoyer le projet
          </button>

        </form>

        <div id="projectMessage"></div>

      </div>

      <div class="card">

        <h2>📂 Mes projets</h2>

        <div id="projects">
          ⏳ Chargement...
        </div>

      </div>

      <button
        class="btn btn-red"
        onclick="logout()"
      >
        Déconnexion
      </button>
      `,
      `
<script>

const token = localStorage.getItem("member_token");

if (!token) {
  window.location.href = "/login";
}

async function api(url, options = {}) {

  options.headers = {
    ...(options.headers || {}),
    Authorization: "Bearer " + token
  };

  return fetch(url, options);
}

async function loadProfile() {

  const response = await api("/api/me");
  const data = await response.json();

  if (!data.success) {
    localStorage.removeItem("member_token");
    window.location.href = "/login";
    return;
  }

  const m = data.member;

  document.getElementById("profile").innerHTML = \`
    <div style="text-align:center">

      \${m.photo
        ? '<img src="' + m.photo + '" style="width:130px;height:130px;border-radius:50%;object-fit:cover">'
        : '<div style="font-size:70px">👤</div>'
      }

      <h2>\${escapeHtml(m.name)}</h2>

      <p><strong>Email :</strong> \${escapeHtml(m.email)}</p>

      <p><strong>Pays :</strong> \${escapeHtml(m.country || "")}</p>

      <p><strong>WhatsApp :</strong> \${escapeHtml(m.phone || "")}</p>

      <p><strong>Compétences :</strong> \${escapeHtml(m.skills || "")}</p>

      <p>\${escapeHtml(m.bio || "")}</p>

      <p>
        Statut :
        <strong>\${escapeHtml(m.status)}</strong>
      </p>

    </div>
  \`;
}

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProjects() {

  const response = await api("/api/my-projects");
  const data = await response.json();

  if (!data.success) return;

  const box = document.getElementById("projects");

  if (!data.projects.length) {

    box.innerHTML =
      "<p>Aucun projet proposé.</p>";

    return;
  }

  box.innerHTML = data.projects.map(p => \`
    <div class="card">

      <h3>\${escapeHtml(p.title)}</h3>

      <p>\${escapeHtml(p.description)}</p>

      <p>
        Catégorie :
        \${escapeHtml(p.category || "Non définie")}
      </p>

      <span class="badge">
        \${escapeHtml(p.status)}
      </span>

    </div>
  \`).join("");

}

document.getElementById("photoForm").addEventListener("submit", async function(e) {

  e.preventDefault();

  const formData = new FormData();

  formData.append(
    "photo",
    document.getElementById("photo").files[0]
  );

  const response = await api("/api/me/photo", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  document.getElementById("photoMessage").innerHTML =
    data.success
      ? '<p class="success">✅ Photo mise à jour.</p>'
      : '<p class="error">❌ ' + data.message + '</p>';

  loadProfile();

});

document.getElementById("projectForm").addEventListener("submit", async function(e) {

  e.preventDefault();

  const response = await api("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({

      title: document.getElementById("title").value,
      category: document.getElementById("category").value,
      description: document.getElementById("description").value

    })
  });

  const data = await response.json();

  document.getElementById("projectMessage").innerHTML =
    data.success
      ? '<p class="success">✅ Projet envoyé à l’administration.</p>'
      : '<p class="error">❌ ' + data.message + '</p>';

  if (data.success) {

    document.getElementById("projectForm").reset();

    loadProjects();
  }

});

function logout() {

  localStorage.removeItem("member_token");

  window.location.href = "/login";
}

loadProfile();
loadProjects();

</script>
`
    )
  );
});

/* =========================================================
   ADMIN
========================================================= */

app.get("/admin", (req, res) => {

  res.send(
    page(
      "Administration",
      `
      <div id="loginBox" class="card">

        <h1>🛡️ Administration</h1>

        <form id="adminLogin">

          <label>Email administrateur</label>
          <input id="adminEmail" type="email" required>

          <label>Mot de passe</label>
          <input id="adminPassword" type="password" required>

          <button class="btn btn-blue">
            Connexion
          </button>

        </form>

        <div id="adminMessage"></div>

      </div>

      <div id="dashboard" style="display:none">

        <div class="card">

          <h1>🛡️ Tableau de bord</h1>

          <button
            class="btn btn-red"
            onclick="adminLogout()"
          >
            Déconnexion
          </button>

        </div>

        <div class="card">

          <h2>👥 Membres</h2>

          <div id="members">
            Chargement...
          </div>

        </div>

        <div class="card">

          <h2>💡 Projets</h2>

          <div id="projects">
            Chargement...
          </div>

        </div>

      </div>
      `,
      `
<script>

let adminToken =
  localStorage.getItem("admin_token");

const loginBox =
  document.getElementById("loginBox");

const dashboard =
  document.getElementById("dashboard");

async function adminApi(url, options = {}) {

  options.headers = {
    ...(options.headers || {}),
    Authorization: "Bearer " + adminToken
  };

  return fetch(url, options);
}

document.getElementById("adminLogin").addEventListener("submit", async function(e) {

  e.preventDefault();

  const response = await fetch("/api/admin/login", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      email: document.getElementById("adminEmail").value,

      password:
        document.getElementById("adminPassword").value

    })

  });

  const data = await response.json();

  if (!data.success) {

    document.getElementById("adminMessage").innerHTML =
      '<p class="error">❌ ' +
      data.message +
      '</p>';

    return;
  }

  adminToken = data.token;

  localStorage.setItem(
    "admin_token",
    adminToken
  );

  showDashboard();

});

function showDashboard() {

  loginBox.style.display = "none";

  dashboard.style.display = "block";

  loadMembers();

  loadProjects();

}

async function loadMembers() {

  const response =
    await adminApi("/api/admin/members");

  const data =
    await response.json();

  if (!data.success) return;

  const box =
    document.getElementById("members");

  if (!data.members.length) {

    box.innerHTML =
      "<p>Aucun membre.</p>";

    return;
  }

  box.innerHTML =
    data.members.map(m => \`

      <div class="card">

        <h3>\${escapeHtml(m.name)}</h3>

        <p>
          Email :
          \${escapeHtml(m.email)}
        </p>

        <p>
          Pays :
          \${escapeHtml(m.country || "")}
        </p>

        <p>
          WhatsApp :
          \${escapeHtml(m.phone || "")}
        </p>

        <p>
          Compétences :
          \${escapeHtml(m.skills || "")}
        </p>

        <p>
          Statut :
          <strong>\${escapeHtml(m.status)}</strong>
        </p>

        <button
          class="btn btn-green"
          onclick="memberAction(\${m.id}, 'approve')"
        >
          ✅ Approuver
        </button>

        <button
          class="btn"
          onclick="memberAction(\${m.id}, 'reject')"
        >
          ❌ Refuser
        </button>

        <button
          class="btn btn-red"
          onclick="deleteMember(\${m.id})"
        >
          🗑️ Supprimer
        </button>

        \${m.phone
          ? '<a class="btn btn-blue" target="_blank" href="https://wa.me/' +
            m.phone.replace(/\\\\D/g, "") +
            '?text=Bonjour%20' +
            encodeURIComponent(m.name) +
            '%2C%20je%20vous%20contacte%20via%20JS%20LENGE%20TECH%20SERVICES.">WhatsApp</a>'
          : ''
        }

      </div>

    \`).join("");

}

async function memberAction(id, action) {

  const response =
    await adminApi(
      "/api/admin/members/" +
      id +
      "/" +
      action,
      {
        method: "PUT"
      }
    );

  const data =
    await response.json();

  alert(
    data.success
      ? "Action effectuée."
      : data.message
  );

  loadMembers();
}

async function deleteMember(id) {

  if (!confirm("Supprimer définitivement ce membre ?")) {
    return;
  }

  const response =
    await adminApi(
      "/api/admin/members/" + id,
      {
        method: "DELETE"
      }
    );

  const data =
    await response.json();

  alert(
    data.success
      ? "Membre supprimé."
      : data.message
  );

  loadMembers();
}

async function loadProjects() {

  const response =
    await adminApi("/api/admin/projects");

  const data =
    await response.json();

  if (!data.success) return;

  const box =
    document.getElementById("projects");

  if (!data.projects.length) {

    box.innerHTML =
      "<p>Aucun projet.</p>";

    return;
  }

  box.innerHTML =
    data.projects.map(p => \`

      <div class="card">

        <h3>\${escapeHtml(p.title)}</h3>

        <p>
          \${escapeHtml(p.description)}
        </p>

        <p>
          Catégorie :
          \${escapeHtml(p.category || "")}
        </p>

        <p>
          Statut :
          <strong>\${escapeHtml(p.status)}</strong>
        </p>

        <button
          class="btn btn-green"
          onclick="projectAction(\${p.id}, 'approve')"
        >
          ✅ Approuver
        </button>

        <button
          class="btn"
          onclick="projectAction(\${p.id}, 'reject')"
        >
          ❌ Refuser
        </button>

      </div>

    \`).join("");

}

async function projectAction(id, action) {

  const response =
    await adminApi(
      "/api/admin/projects/" +
      id +
      "/" +
      action,
      {
        method: "PUT"
      }
    );

  const data =
    await response.json();

  alert(
    data.success
      ? "Action effectuée."
      : data.message
  );

  loadProjects();
}

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminLogout() {

  localStorage.removeItem("admin_token");

  adminToken = null;

  dashboard.style.display = "none";

  loginBox.style.display = "block";
}

if (adminToken) {
  showDashboard();
}

</script>
`
    )
  );
});

/* =========================================================
   API — STATUS
========================================================= */

app.get("/api/status", async (req, res) => {

  try {

    const { error } =
      await supabase
        .from("members")
        .select("id")
        .limit(1);

    if (error) {
      return jsonError(
        res,
        "Connexion Supabase impossible.",
        500
      );
    }

    return jsonSuccess(res, {
      service: "JS LENGE TECH SERVICES",
      database: "Supabase",
      status: "online"
    });

  } catch {

    return jsonError(
      res,
      "Erreur de connexion.",
      500
    );
  }
});

/* =========================================================
   API — INSCRIPTION
========================================================= */

app.post("/api/register", async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      country,
      phone,
      skills,
      bio
    } = req.body;

    if (!name || !email || !password) {
      return jsonError(
        res,
        "Nom, email et mot de passe sont obligatoires."
      );
    }

    if (password.length < 6) {
      return jsonError(
        res,
        "Le mot de passe doit contenir au moins 6 caractères."
      );
    }

    const cleanEmail =
      String(email).trim().toLowerCase();

    const { data: existing } =
      await supabase
        .from("members")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

    if (existing) {
      return jsonError(
        res,
        "Cette adresse email est déjà utilisée."
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const { error } =
      await supabase
        .from("members")
        .insert({
          name: String(name).trim(),
          email: cleanEmail,
          password: hashedPassword,
          country: country || "RDC",
          phone: phone || null,
          skills: skills || null,
          bio: bio || null,
          status: "pending"
        });

    if (error) {

      console.error(error);

      return jsonError(
        res,
        "Impossible de créer le compte.",
        500
      );
    }

    return jsonSuccess(res, {
      message:
        "Compte créé avec succès. Il doit maintenant être approuvé par l'administration."
    });

  } catch (error) {

    console.error(error);

    return jsonError(
      res,
      "Erreur serveur.",
      500
    );
  }
});

/* =========================================================
   API — CONNEXION MEMBRE
========================================================= */

app.post("/api/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return jsonError(
        res,
        "Email et mot de passe obligatoires."
      );
    }

    const cleanEmail =
      String(email).trim().toLowerCase();

    const { data: member, error } =
      await supabase
        .from("members")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

    if (error || !member) {

      return jsonError(
        res,
        "Email ou mot de passe incorrect.",
        401
      );
    }

    const valid =
      await bcrypt.compare(
        password,
        member.password
      );

    if (!valid) {

      return jsonError(
        res,
        "Email ou mot de passe incorrect.",
        401
      );
    }

    if (member.status !== "approved") {

      if (member.status === "pending") {

        return jsonError(
          res,
          "Votre compte est encore en attente d'approbation."
        );
      }

      return jsonError(
        res,
        "Votre compte a été refusé."
      );
    }

    const token =
      createToken(
        "member",
        member.id,
        member.email
      );

    return jsonSuccess(res, {
      token
    });

  } catch {

    return jsonError(
      res,
      "Erreur serveur.",
      500
    );
  }
});

/* =========================================================
   API — MON PROFIL
========================================================= */

app.get("/api/me", requireMember, async (req, res) => {

  const { data, error } =
    await supabase
      .from("members")
      .select(
        "id,name,email,country,phone,skills,bio,photo,status,created_at"
      )
      .eq("id", req.user.id)
      .single();

  if (error || !data) {
    return jsonError(
      res,
      "Profil introuvable.",
      404
    );
  }

  return jsonSuccess(res, {
    member: data
  });
});

/* =========================================================
   API — PHOTO PROFIL
========================================================= */

app.post(
  "/api/me/photo",
  requireMember,
  upload.single("photo"),
  async (req, res) => {

    try {

      if (!req.file) {
        return jsonError(
          res,
          "Aucune image reçue."
        );
      }

      const extension =
        path.extname(req.file.originalname)
          .toLowerCase() || ".jpg";

      const filePath =
        `${req.user.id}/${Date.now()}${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("profiles")
          .upload(
            filePath,
            req.file.buffer,
            {
              contentType: req.file.mimetype,
              upsert: true
            }
          );

      if (uploadError) {

        console.error(uploadError);

        return jsonError(
          res,
          "Impossible d'envoyer la photo.",
          500
        );
      }

      const {
        data: publicData
      } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      const photoUrl =
        publicData.publicUrl;

      const { error } =
        await supabase
          .from("members")
          .update({
            photo: photoUrl
          })
          .eq("id", req.user.id);

      if (error) {

        return jsonError(
          res,
          "Photo envoyée mais profil non mis à jour.",
          500
        );
      }

      return jsonSuccess(res, {
        photo: photoUrl
      });

    } catch (error) {

      console.error(error);

      return jsonError(
        res,
        "Erreur pendant l'envoi de la photo.",
        500
      );
    }
  }
);

/* =========================================================
   API — PROPOSER UN PROJET
========================================================= */

app.post(
  "/api/projects",
  requireMember,
  async (req, res) => {

    try {

      const {
        title,
        description,
        category
      } = req.body;

      if (!title || !description) {
        return jsonError(
          res,
          "Titre et description obligatoires."
        );
      }

      const { error } =
        await supabase
          .from("projects")
          .insert({
            member_id: req.user.id,
            title: String(title).trim(),
            description: String(description).trim(),
            category: category || null,
            status: "pending"
          });

      if (error) {

        console.error(error);

        return jsonError(
          res,
          "Impossible d'envoyer le projet.",
          500
        );
      }

      return jsonSuccess(res, {
        message: "Projet envoyé."
      });

    } catch {

      return jsonError(
        res,
        "Erreur serveur.",
        500
      );
    }
  }
);

/* =========================================================
   API — MES PROJETS
========================================================= */

app.get(
  "/api/my-projects",
  requireMember,
  async (req, res) => {

    const { data, error } =
      await supabase
        .from("projects")
        .select("*")
        .eq("member_id", req.user.id)
        .order("created_at", {
          ascending: false
        });

    if (error) {

      return jsonError(
        res,
        "Impossible de charger les projets.",
        500
      );
    }

    return jsonSuccess(res, {
      projects: data || []
    });
  }
);

/* =========================================================
   API — CONNEXION ADMIN
========================================================= */

app.post("/api/admin/login", (req, res) => {

  const {
    email,
    password
  } = req.body;

  if (
    String(email).toLowerCase() !==
      String(ADMIN_EMAIL).toLowerCase() ||
    password !== ADMIN_PASSWORD
  ) {

    return jsonError(
      res,
      "Identifiants administrateur incorrects.",
      401
    );
  }

  const token =
    createToken(
      "admin",
      "administrator",
      ADMIN_EMAIL
    );

  return jsonSuccess(res, {
    token
  });
});

/* =========================================================
   API ADMIN — MEMBRES
========================================================= */

app.get(
  "/api/admin/members",
  requireAdmin,
  async (req, res) => {

    const { data, error } =
      await supabase
        .from("members")
        .select(
          "id,name,email,country,phone,skills,bio,photo,status,created_at"
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {

      return jsonError(
        res,
        "Impossible de charger les membres.",
        500
      );
    }

    return jsonSuccess(res, {
      members: data || []
    });
  }
);

/* =========================================================
   APPROUVER / REFUSER MEMBRE
========================================================= */

app.put(
  "/api/admin/members/:id/approve",
  requireAdmin,
  async (req, res) => {

    const { error } =
      await supabase
        .from("members")
        .update({
          status: "approved"
        })
        .eq("id", req.params.id);

    if (error) {

      return jsonError(
        res,
        "Impossible d'approuver le membre.",
        500
      );
    }

    return jsonSuccess(res);
  }
);

app.put(
  "/api/admin/members/:id/reject",
  requireAdmin,
  async (req, res) => {

    const { error } =
      await supabase
        .from("members")
        .update({
          status: "rejected"
        })
        .eq("id", req.params.id);

    if (error) {

      return jsonError(
        res,
        "Impossible de refuser le membre.",
        500
      );
    }

    return jsonSuccess(res);
  }
);

/* =========================================================
   SUPPRIMER MEMBRE
========================================================= */

app.delete(
  "/api/admin/members/:id",
  requireAdmin,
  async (req, res) => {

    const { error } =
      await supabase
        .from("members")
        .delete()
        .eq("id", req.params.id);

    if (error) {

      return jsonError(
        res,
        "Impossible de supprimer le membre.",
        500
      );
    }

    return jsonSuccess(res);
  }
);

/* =========================================================
   API ADMIN — PROJETS
========================================================= */

app.get(
  "/api/admin/projects",
  requireAdmin,
  async (req, res) => {

    const { data, error } =
      await supabase
        .from("projects")
        .select(`
          id,
          member_id,
          title,
          description,
          category,
          status,
          created_at,
          members (
            name,
            email,
            phone
          )
        `)
        .order("created_at", {
          ascending: false
        });

    if (error) {

      console.error(error);

      return jsonError(
        res,
        "Impossible de charger les projets.",
        500
      );
    }

    return jsonSuccess(res, {
      projects: data || []
    });
  }
);

/* =========================================================
   APPROUVER / REFUSER PROJET
========================================================= */

app.put(
  "/api/admin/projects/:id/approve",
  requireAdmin,
  async (req, res) => {

    const { error } =
      await supabase
        .from("projects")
        .update({
          status: "approved"
        })
        .eq("id", req.params.id);

    if (error) {

      return jsonError(
        res,
        "Impossible d'approuver le projet.",
        500
      );
    }

    return jsonSuccess(res);
  }
);

app.put(
  "/api/admin/projects/:id/reject",
  requireAdmin,
  async (req, res) => {

    const { error } =
      await supabase
        .from("projects")
        .update({
          status: "rejected"
        })
        .eq("id", req.params.id);

    if (error) {

      return jsonError(
        res,
        "Impossible de refuser le projet.",
        500
      );
    }

    return jsonSuccess(res);
  }
);

/* =========================================================
   PAGE PARTAGE
========================================================= */

app.get("/share", (req, res) => {

  res.send(
    page(
      "Partager",
      `
      <div class="hero">

        <h1>🔗 Rejoindre JS LENGE TECH SERVICES</h1>

        <p>
          Invite tes amis, développeurs, designers,
          informaticiens et autres personnes compétentes
          à rejoindre notre communauté.
        </p>

        <input
          id="link"
          readonly
          value=""
        >

        <button
          class="btn btn-blue"
          onclick="copyLink()"
        >
          Copier le lien
        </button>

        <a
          class="btn btn-green"
          id="whatsapp"
          target="_blank"
        >
          Partager sur WhatsApp
        </a>

      </div>
      `,
      `
<script>

const link =
  window.location.origin + "/register";

document.getElementById("link").value =
  link;

document.getElementById("whatsapp").href =
  "https://wa.me/?text=" +
  encodeURIComponent(
    "Rejoins JS LENGE TECH SERVICES : " +
    link
  );

function copyLink() {

  navigator.clipboard.writeText(link);

  alert("Lien copié !");
}

</script>
`
    )
  );
});

/* =========================================================
   ERREURS
========================================================= */

app.use((err, req, res, next) => {

  console.error(err);

  if (err instanceof multer.MulterError) {

    return jsonError(
      res,
      "Image trop grande ou problème d'envoi.",
      400
    );
  }

  return jsonError(
    res,
    err.message || "Erreur serveur.",
    500
  );
});

/* =========================================================
   SERVEUR
========================================================= */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("==========================================");
  console.log("   JS LENGE TECH SERVICES");
  console.log("==========================================");
  console.log("");
  console.log(
    "Serveur lancé sur http://localhost:" + PORT
  );
  console.log("");
  console.log("Base de données : Supabase");
  console.log("Stockage photos : Supabase Storage");
  console.log("");
  console.log("Serveur prêt !");
  console.log("");
});
