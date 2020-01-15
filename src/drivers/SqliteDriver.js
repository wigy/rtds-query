const SqlDriver = require('./SqlDriver');

/**
 * Implementation for Sqlite.
 */
class SqliteDriver extends SqlDriver {
  constructor(url) {
    super(url);
    const sqlite3 = require('sqlite3').verbose();
    this.db = new sqlite3.Database(url.pathname);
  }

  async getTables() {
    const data = await this.runSelectQuery('SELECT * FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite%"');
    return data.map(t => t.tbl_name);
  }

  async getColumns(table) {
    const data = await this.runSelectQuery(`PRAGMA table_info(\`${table}\`)`);
    return data.map(f => f.name);
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

  async runInsertQuery(sql, values, pk) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      const [, table] = /INSERT INTO `(.*?)`/.exec(sql);
      db.run(sql, values, function(err, res) {
        if (err) {
          reject(err);
        } else {
          db.all(`SELECT * FROM \`${table}\` WHERE \`${pk}\` = ?`, [this.lastID], function(err, res) {
            if (err) {
              reject(err);
            } else {
              // TODO: This returns only one value even if multiple were inserted.
              resolve(res[0]);
            }
          });
        }
      });
    });
  }

  async runUpdateQuery(sql, values, pks) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      const [, table] = /UPDATE `(.*?)`/.exec(sql);
      db.run(sql, values, function(err, res) {
        if (err) {
          reject(err);
        } else {
          const where = pks.map(pk => `\`${pk}\` = ?`).join(' AND ');
          db.all(`SELECT * FROM \`${table}\` WHERE ${where}`, values.slice(values.length - pks.length), function(err, res) {
            if (err) {
              reject(err);
            } else {
              resolve(res[0]);
            }
          });
        }
      });
    });
  }

  async runDeleteQuery(sql, values, pk) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      db.run(sql, values, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async runQuery(sql) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      db.run(sql, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
}

module.exports = SqliteDriver;
