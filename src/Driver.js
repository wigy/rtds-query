const fs = require('fs');
const RTDSError = require('./RTDSError');

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
    this.tables = null;
  }

  /**
   * Collect or set information of all tables.
   */
  async initialize(init = null) {
    if (init !== null) {
      this.tables = init;
      return;
    }
    this.tables = {};
    for (const table of await this.getTables()) {
      this.tables[table] = new Set();
      for (const field of await this.getColumns(table)) {
        this.tables[table].add(field);
      }
    }

  }

  /**
   * Check that all columns exist and if not, throw an error.
   * @param {String} table
   * @param {String[]} columns
   */
  verifyTableColumns(table, columns) {
    if (!this.tables) {
      throw new RTDSError('Cannot verify tables, since driver not initialized.');
    }
    if (!this.tables[table]) {
      throw new RTDSError(`No such table '${table}'.`);
    }
    columns.forEach(c => {
      if (!this.tables[table].has(c)) {
        throw new RTDSError(`A table '${table}' has no column '${c}'.`);
      }
    });
  }

  getTables() {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement getTables().`);
  }

  getColumns(table) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement getColumns().`);
  }

  escapeSelect(table, variable, as = null) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement escapeSelect().`);
  }

  escapeJoin(table, variable = null) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement escapeJoin().`);
  }

  escapeFrom(table, as = null) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement escapeFrom().`);
  }

  escapeWhere(variable) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement escapeWhere().`);
  }

  escapeOrder(variable) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement escapeOrder().`);
  }

  createSQL(table, fields, obj, pks) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement createSQL().`);
  }

  updateSQL(table, fields, obj, pks) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement updateSQL().`);
  }

  deleteSQL(table, fields, obj, pks) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement deleteSQL().`);
  }

  async runSelectQuery(sql) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement runSelectQuery().`);
  }

  async runInsertQuery(sql, obj, pk) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement runInsertQuery().`);
  }

  async runUpdateQuery(sql, obj, pk) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement runUpdateQuery().`);
  }

  async runDeleteQuery(sql, obj, pk) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement runDeleteQuery().`);
  }

  async runQuery(sql) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement runQuery().`);
  }

  /**
   * Run the post-processing for data.
   * @param {} formula
   */
  postProcess(data, formula) {
    return formula.process(data, this);
  }

  /**
   * Run the post-processing for data item.
   * @param {String} ruleName
   * @param {Object[]} data
   */
  postProcessItem(ruleName, data) {
    const fn = `${ruleName}PostProcess`;
    if (typeof this[fn] !== 'function') {
      throw new RTDSError(`Driver ${this.constructor.name} does not implement ${fn}().`);
    }
    return this[fn](data);
  }

  /**
   * Execute SQL file on the given path.
   * @param {String} path
   */
  async runSqlFile(path) {
    const fileContent = fs.readFileSync(path).toString('utf-8');
    const r = /((?:[^;"]+|"[^"]*"|'[^']*')*);/;
    for (let sql of fileContent.split(r)) {
      sql = sql.trim();
      if (sql) {
        await this.runQuery(sql);
      }
    }
  }

  static create(uri) {
    const url = new URL(uri);
    switch (url.protocol) {
      case 'dummy:':
        return new Driver(url);
      case 'sql:':
        return Driver.createSql(url);
      case 'sqlite:':
        return Driver.createSqlite(url);
      case 'postgres:':
        return Driver.createPostgres(url);
      case 'mysql:':
        return Driver.createMysql(url);
      default:
        throw new RTDSError(`Driver for ${uri} not yet supported.`);
    }
  }

  static createSql(uri) {
    const SqlDriver = require('./drivers/SqlDriver');
    return new SqlDriver(uri);
  }

  static createSqlite(uri) {
    const SqliteDriver = require('./drivers/SqliteDriver');
    return new SqliteDriver(uri);
  }

  static createPostgres(uri) {
    const PostgresDriver = require('./drivers/PostgresDriver');
    return new PostgresDriver(uri);
  }

  static createMysql(uri) {
    const MysqlDriver = require('./drivers/MysqlDriver');
    return new MysqlDriver(uri);
  }
}

module.exports = Driver;
