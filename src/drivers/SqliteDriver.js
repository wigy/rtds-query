const SqlDriver = require('./SqlDriver');

/**
 * Implementation for Sqlite.
 */
class SqliteDriver extends SqlDriver {
  constructor(url) {
    super(url, () => '?');
    let sqlite3;
    try {
      sqlite3 = require('sqlite3').verbose();
    } catch (err) {
      throw new Error("Driver needs a package 'sqlite3'. Please install it.");
    }
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
          console.log(sql);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async runInsertQuery(sql, values, pks) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      db.run(sql, values, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async runUpdateQuery(sqls, valueList, pks) {
    const db = this.db;
    const runOne = async (sql, values) => new Promise((resolve, reject) => {
      const [, table] = /UPDATE "(.*?)"/.exec(sql);
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
    return Promise.all(sqls.map((sql, idx) => runOne(sql, valueList[idx])));
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

  /**
   * Transform strings to JSON, since sqlite store JSON fields as a string.
   * @param {String} str
   */
  jsonPostProcess(str) {
    return typeof str === 'string' ? JSON.parse(str) : str;
  }
}

module.exports = SqliteDriver;
