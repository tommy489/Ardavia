const db = require('./db');

const getCurrencyName = (guildId) => {
  const row = db.find('guild_settings', { guildId });
  return row ? row.currencyName : null;
};

const setCurrency = (guildId, name) => {
  db.upsert('guild_settings', { guildId }, { guildId, currencyName: name });
};

const getBalance = (guildId, userId) => {
  const row = db.find('economy', { guildId, userId });
  return row ? row.balance : 0;
};

const addMoney = (guildId, userId, amount) => {
  const current = getBalance(guildId, userId);
  db.upsert('economy', { guildId, userId }, { guildId, userId, balance: current + amount });
  return current + amount;
};

const removeMoney = (guildId, userId, amount) => {
  const current = getBalance(guildId, userId);
  const next = Math.max(0, current - amount);
  db.upsert('economy', { guildId, userId }, { guildId, userId, balance: next });
  return next;
};

const pay = (guildId, fromId, toId, amount) => {
  const fromBalance = getBalance(guildId, fromId);
  if (amount <= 0 || fromBalance < amount) return false;
  removeMoney(guildId, fromId, amount);
  addMoney(guildId, toId, amount);
  return true;
};

const createBankAccount = (guildId, userId) => {
  if (!db.find('bank_accounts', { guildId, userId })) {
    db.insert('bank_accounts', { guildId, userId, balance: 0, createdAt: new Date().toISOString() });
  }
};

const deposit = (guildId, userId, amount) => {
  const current = getBalance(guildId, userId);
  if (amount <= 0 || current < amount) return false;
  removeMoney(guildId, userId, amount);
  const account = db.find('bank_accounts', { guildId, userId });
  if (!account) return false;
  db.update('bank_accounts', { guildId, userId }, { balance: account.balance + amount });
  db.insert('bank_transactions', { guildId, userId, amount, type: 'deposit', createdAt: new Date().toISOString() });
  return true;
};

const withdraw = (guildId, userId, amount) => {
  const account = db.find('bank_accounts', { guildId, userId });
  if (!account || amount <= 0 || account.balance < amount) return false;
  db.update('bank_accounts', { guildId, userId }, { balance: account.balance - amount });
  addMoney(guildId, userId, amount);
  db.insert('bank_transactions', { guildId, userId, amount, type: 'withdraw', createdAt: new Date().toISOString() });
  return true;
};

const getBankAccount = (guildId, userId) => {
  return db.find('bank_accounts', { guildId, userId });
};

const getTransactionHistory = (guildId, userId, limit = 10) => {
  return db.filter('bank_transactions', { guildId, userId })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

module.exports = { getCurrencyName, setCurrency, getBalance, addMoney, removeMoney, pay, createBankAccount, deposit, withdraw, getBankAccount, getTransactionHistory };
