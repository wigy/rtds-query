const MainQuery = require('./MainQuery');
const RTDSError = require('../RTDSError');
const Field = require('./Field');
const PK = require('../PK');

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
      pk: q.pk || null
    });
    for (const field of this.insert) {
      this.addChild(field);
    }
  }

  getFields() {
    return this.insert;
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

  createSQL(driver, obj) {
    const fields = this.insert.map(f => f.field);
    (obj instanceof Array ? obj : [obj]).forEach(o => Object.keys(o).forEach(key => {
      if (!fields.includes(key)) {
        throw new RTDSError(`A field '${key}' is not defined in insertion query for '${this.table}'.`);
      }
    }));
    return driver.createSQL(this.table, fields, PK.asArray(this.pk), obj);
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
      insert: q.insert.map(s => Field.parse(s, q.table)),
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Insert;
