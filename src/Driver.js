/**
 * Base class for drivers.
 */
class Driver {

  /**
   * Create driver.
   * @param {URL} url
   */
  constructor(url) {
    this.url = url;
    this.db = null;
  }

  async getAll(query) {
    return query.getAll(this);
  }

  escapeSelect(table, variable, as = null) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeSelect().`);
  }

  escapeFrom(table) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeSelect().`);
  }

  async runSelectQuery(sql) {
    throw new Error(`Driver ${this.constructor.name} does not implement runSelectQuery().`);
  }

  static create(uri) {
    const url = new URL(uri);
    switch (url.protocol) {
      case 'sqlite:':
        return Driver.createSqlite(url);
      default:
        throw new Error(`Driver for ${uri} not yet supported.`);
    }
  }

  static createSqlite(uri) {
    return new SqliteDriver(uri);
  }
}

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

module.exports = Driver;
