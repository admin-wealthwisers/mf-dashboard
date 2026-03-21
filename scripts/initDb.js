import db from '../server/db.js';

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
).all();

console.log('Database initialized successfully.');
console.log('Tables:', tables.map(t => t.name).join(', '));
