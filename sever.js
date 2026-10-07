// ================================
// PAGE ADMIN
// ================================
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - JS LENGE TECH SERVICES</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f2f4f7;
      margin: 0;
      padding: 20px;
    }

    h1 {
      text-align: center;
    }

    .member {
      background: white;
      padding: 20px;
      margin: 15px auto;
      border-radius: 12px;
      max-width: 600px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    button {
      padding: 10px 15px;
      margin: 5px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }

    .approve {
      background: #18a558;
      color: white;
    }

    .reject {
      background: #e63946;
      color: white;
    }

    .delete {
      background: #222;
      color: white;
    }

    .pending {
      color: #e67e22;
      font-weight: bold;
    }

    .approved {
      color: #18a558;
      font-weight: bold;
    }

    .rejected {
      color: #e63946;
      font-weight: bold;
    }
  </style>
</head>

<body>

<h1>👑 Administration</h1>

<div id="members">
  Chargement...
</div>

<script>

async function loadMembers() {

  const response = await fetch("/api/members");
  const data = await response.json();

  const container = document.getElementById("members");

  if (!data.members || data.members.length === 0) {
    container.innerHTML = "<p>Aucun membre.</p>";
    return;
  }

  container.innerHTML = data.members.map(member => {

    return \`
      <div class="member">

        <h2>\${member.name}</h2>

        <p><strong>Email :</strong> \${member.email}</p>

        <p><strong>Pays :</strong> \${member.country}</p>

        <p><strong>Compétences :</strong> \${member.skills}</p>

        <p>
          <strong>Statut :</strong>
          <span class="\${member.status}">
            \${member.status}
          </span>
        </p>

        <button
          class="approve"
          onclick="approveMember('\${member.id}')">
          ✅ Approuver
        </button>

        <button
          class="reject"
          onclick="rejectMember('\${member.id}')">
          ❌ Rejeter
        </button>

        <button
          class="delete"
          onclick="deleteMember('\${member.id}')">
          🗑️ Supprimer
        </button>

      </div>
    \`;

  }).join("");
}


async function approveMember(id) {

  const response = await fetch(
    "/api/members/" + id + "/approve",
    {
      method: "PUT"
    }
  );

  const data = await response.json();

  alert(data.message);

  loadMembers();
}


async function rejectMember(id) {

  const response = await fetch(
    "/api/members/" + id + "/reject",
    {
      method: "PUT"
    }
  );

  const data = await response.json();

  alert(data.message);

  loadMembers();
}


async function deleteMember(id) {

  if (!confirm("Voulez-vous vraiment supprimer ce membre ?")) {
    return;
  }

  const response = await fetch(
    "/api/members/" + id,
    {
      method: "DELETE"
    }
  );

  const data = await response.json();

  alert(data.message);

  loadMembers();
}


loadMembers();

</script>

</body>
</html>
  `);
});
