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

  async runUpdateQuery(sql, values, pk) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      const [, table] = /UPDATE `(.*?)`/.exec(sql);
      db.run(sql, values, function(err, res) {
        if (err) {
          reject(err);
        } else {
          db.all(`SELECT * FROM \`${table}\` WHERE \`${pk}\` = ?`, [values[values.length - 1]], function(err, res) {
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
}

module.exports = SqliteDriver;
