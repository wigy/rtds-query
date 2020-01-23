const RTDSError = require('../RTDSError');
const MainQuery = require('./MainQuery');
const Field = require('./Field');
const PK = require('../PK');

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
      pk: q.pk || null
    });
    for (const field of this.update) {
      this.addChild(field);
    }
  }

  getType() {
    return 'update';
  }

  getFields() {
    return this.update;
  }

  getName() {
    return this.table;
  }

  getDumpName() {
    let ret = this.table;
    if (this.pk !== null) {
      ret += ` (PK: ${PK.asArray(this.pk).join(' + ')})`;
    }
    return ret;
  }

  updateSQL(driver, obj) {
    const fields = this.update.map(f => f.field);
    driver.verifyTableColumns(this.table, fields);
    (obj instanceof Array ? obj : [obj]).forEach(o => Object.keys(o).forEach(key => {
      if (PK.isPK(this.pk, key)) {
        return;
      }
      if (!fields.includes(key)) {
        throw new RTDSError(`A field '${key}' is not defined in update query for '${this.table}'.`);
      }
    }));
    return driver.updateSQL(this.table, fields, PK.asArray(this.pk), obj);
  }

  /**
   * Helper to construct update nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    if (typeof q.update === 'string') {
      q.update = [q.update];
    }
    return new Update({
      update: q.update.map(s => Field.parse(s, q.table)),
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Update;
