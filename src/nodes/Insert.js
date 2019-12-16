const MainQuery = require('./MainQuery');

/**
 * Insert query.
 *
 * Parameters:
 * - `insert` an array of fields to insert
 * - `table` name of the table
 * - `[pk]` name of the primary key (default 'id')
 */
class Insert extends MainQuery {
  constructor(q) {
    super({
      insert: q.insert,
      table: q.table,
      pk: q.pk || 'id'
    });
  }

  getFields() {
    return this.insert;
  }

  getName() {
    return this.table;
  }

  getDumpName() {
    return this.table + '(' + this.insert.join(', ') + ')';
  }

  createOneSQL(driver, obj) {
    return driver.createOneSQL(this.table, this.insert, this.pk, obj);
  }

  /**
   * Helper to construct insert nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    if (typeof q.insert === 'string') {
      // TODO: These should be converted to Field elements.
      q.insert = [q.insert];
    }
    return new Insert({
      insert: q.insert,
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Insert;
