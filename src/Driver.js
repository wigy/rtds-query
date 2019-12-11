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

  async getAll(query, cond = null) {
    // TODO: Duplicate entry point.
    return query.getAll(this, cond);
  }

  getAllSQL(query, cond = null) {
    // TODO: Duplicate entry point.
    return query.getAllSQL(this, cond);
  }

  escapeSelect(table, variable, as = null) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeSelect().`);
  }

  escapeJoin(table, variable = null) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeJoin().`);
  }

  escapeFrom(table, as = null) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeFrom().`);
  }

  escapeWhere(variable) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeWhere().`);
  }

  async runSelectQuery(sql) {
    throw new Error(`Driver ${this.constructor.name} does not implement runSelectQuery().`);
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
        throw new Error(`Driver for ${uri} not yet supported.`);
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
