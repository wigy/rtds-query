const MainQuery = require('./MainQuery');

/**
 * Delete query.
 *
 * Parameters:
 * - `delete` an array of fields that can be used to define deletion target
 * - `table` name of the table
 * - `[pk]` name of the primary key (default 'id')
 */
class Update extends MainQuery {
  constructor(q) {
    super({
      delete: q.delete,
      table: q.table,
      pk: q.pk || 'id'
    });
  }

  getFields() {
    return this.delete;
  }

  getName() {
    return this.table;
  }

  getDumpName() {
    return this.table + '(' + this.delete.join(', ') + ')';
  }

  deleteOneSQL(driver, obj) {
    // TODO: Verify that fields for matching are defined in `this.delete`.
    return driver.deleteOneSQL(this.table, obj);
  }

  /**
   * Helper to construct delete nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    if (typeof q.delete === 'string') {
      // TODO: These should be converted to Field elements (also in Insert).
      q.delete = [q.delete];
    }
    return new Update({
      delete: q.delete,
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Update;
