const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const path = require("path");

const file = path.join(__dirname, "data.json");

const adapter = new JSONFile(file);

const defaultData = {
  members: [],
  messages: [],
  ideas: [],
  projects: [],
  links: []
};

const db = new Low(adapter, defaultData);

async function initDatabase() {
  await db.read();

  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
}

async function saveDatabase() {
  await db.write();
}

module.exports = {
  db,
  initDatabase,
  saveDatabase
};
