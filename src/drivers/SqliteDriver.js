const Driver = require('../Driver');

/**
 * Implementation for Sqlite.
 */
class SqliteDriver extends Driver {
  constructor(url) {
    super(url);
    const sqlite3 = require('sqlite3').verbose();
    this.db = new sqlite3.Database(url.pathname);
  }

  escapeSelect(table, variable, as = null) {
    let sql = `\`${table}\`.\`${variable}\``;
    if (as !== null) {
      sql += ` AS \`${as}\``;
    }
    return sql;
  }

  escapeJoin(table, variable = null) {
    return variable === null ? `\`${table}\`` : this.escapeSelect(table, variable);
  }

  escapeFrom(table) {
    return `\`${table}\``;
  }

  async runSelectQuery(sql) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = SqliteDriver;
