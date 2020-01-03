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

  createSQL(fields, pk, obj) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement createSQL().`);
  }

  updateSQL(fields, pk, obj) {
    throw new RTDSError(`Driver ${this.constructor.name} does not implement updateSQL().`);
  }

  deleteSQL(fields, pk, obj) {
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
   * @param {Object[]} data
   * @param {} formula
   */
  postProcess(data, formula) {
    return formula.process(data);
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
}

module.exports = Driver;
