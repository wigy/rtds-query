const QueryNode = require('./QueryNode');

/**
 * Insert query.
 *
 * Parameters:
 * - `insert` an array of fields to insert
 * - `table` name of the table
 * - `[pk]` name of the primary key (default 'id')
 */
class Insert extends QueryNode {
  constructor(q) {
    super({
      insert: q.insert,
      table: q.table,
      pk: q.pk || 'id'
    });
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
