const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'database.json');
const defaultData = {
  economy: [],
  bank_accounts: [],
  bank_transactions: [],
  licenses: [],
  parish_roles: [],
  votes: [],
  vote_responses: [],
  raid_config: [],
  ticket_panels: [],
  tickets: [],
  guild_settings: []
};

let store = null;

const loadStore = () => {
  if (store) return store;
  try {
    if (fs.existsSync(dbPath)) {
      store = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } else {
      store = defaultData;
      saveStore();
    }
  } catch (error) {
    store = defaultData;
    saveStore();
  }
  return store;
};

const saveStore = () => {
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf-8');
};

const ensureTable = (table) => {
  const data = loadStore();
  if (!data[table]) data[table] = [];
  return data[table];
};

const matches = (item, query) => {
  if (typeof query === 'function') return query(item);
  return Object.keys(query).every(key => item[key] === query[key]);
};

const find = (table, query) => {
  return ensureTable(table).find(item => matches(item, query)) || null;
};

const filter = (table, query) => {
  return ensureTable(table).filter(item => matches(item, query));
};

const insert = (table, item) => {
  ensureTable(table).push(item);
  saveStore();
  return item;
};

const upsert = (table, query, item) => {
  const existing = find(table, query);
  if (existing) {
    Object.assign(existing, item);
    saveStore();
    return existing;
  }
  return insert(table, item);
};

const update = (table, query, updates) => {
  const entry = find(table, query);
  if (!entry) return null;
  Object.assign(entry, updates);
  saveStore();
  return entry;
};

const remove = (table, query) => {
  const data = ensureTable(table);
  const remaining = data.filter(item => !matches(item, query));
  if (remaining.length === data.length) return 0;
  store[table] = remaining;
  saveStore();
  return data.length - remaining.length;
};

const getNextId = (table) => {
  const items = ensureTable(table);
  const lastId = items.reduce((max, item) => {
    const id = typeof item.id === 'number' ? item.id : Number(item.id) || 0;
    return Math.max(max, id);
  }, 0);
  return lastId + 1;
};

module.exports = { find, filter, insert, upsert, update, remove, getNextId };
