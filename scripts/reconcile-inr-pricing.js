const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['platform-staging.db', 'platform-development.db'];

for (const dbName of dbs) {
  const dbPath = path.join(__dirname, '..', 'server', 'data', dbName);
  if (fs.existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    db.exec(`UPDATE game_regional_prices SET price_minor = 14900, price_display = '₹149' WHERE country_code = 'IN'`);
    console.log(`Successfully reconciled INR prices to 14900 / ₹149 in ${dbName}`);
  }
}
