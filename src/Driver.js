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

  escapeJoin(table, variable = null) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeSelect().`);
  }

  escapeFrom(table) {
    throw new Error(`Driver ${this.constructor.name} does not implement escapeSelect().`);
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
      case 'sqlite:':
        return Driver.createSqlite(url);
      default:
        throw new Error(`Driver for ${uri} not yet supported.`);
    }
  }

  static createSqlite(uri) {
    const SqliteDriver = require('./drivers/SqliteDriver');
    return new SqliteDriver(uri);
  }
}

module.exports = Driver;
