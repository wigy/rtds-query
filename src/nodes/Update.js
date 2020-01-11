const RTDSError = require('../RTDSError');
const MainQuery = require('./MainQuery');

/**
 * Update query.
 *
 * Parameters:
 * - `update` an array of fields to update
 * - `table` name of the table
 * - `[pk]` name of the primary key (default 'id')
 */
class Update extends MainQuery {
  constructor(q) {
    super({
      update: q.update,
      table: q.table,
      pk: q.pk || 'id'
    });
  }

  getFields() {
    return this.update;
  }

  getName() {
    return this.table;
  }

  getDumpName() {
    return this.table + '(' + this.update.join(', ') + ')';
  }

  updateSQL(driver, obj) {
    // TODO: Array formatted PK handling.
    if (!(this.pk in obj)) {
      throw new RTDSError(`There is no pk ${JSON.stringify(this.pk)} for update in ${JSON.stringify(obj)}`);
    }
    (obj instanceof Array ? obj : [obj]).forEach(o => Object.keys(o).forEach(key => {
      // TODO: Array format pk.
      if (key === this.pk) {
        return;
      }
      if (!this.update.includes(key)) {
        throw new RTDSError(`A field '${key}' is not defined in update query for '${this.table}'.`);
      }
    }));
    return driver.updateSQL(this.table, this.update, this.pk, obj);
  }

  /**
   * Helper to construct update nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    if (typeof q.update === 'string') {
      // TODO: These should be converted to Field elements (also in Insert).
      q.update = [q.update];
    }
    return new Update({
      update: q.update,
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Update;
