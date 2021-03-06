const MainQuery = require('./MainQuery');
const RTDSError = require('../RTDSError');
const Field = require('./Field');
const PK = require('../PK');

/**
 * Delete query.
 *
 * Parameters:
 * - `delete` an array of fields that can be used to define deletion target
 * - `table` name of the table
 * - `[pk]` name of the primary key (default 'id')
 */
class Delete extends MainQuery {
  constructor(q) {
    super({
      delete: q.delete,
      table: q.table,
      pk: q.pk || null
    });
  }

  getType() {
    return 'delete';
  }

  getFields() {
    return this.delete;
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

  deleteSQL(driver, obj) {
    const fields = this.delete.map(f => f.field);
    driver.verifyTableColumns(this.table, fields);
    (obj instanceof Array ? obj : [obj]).forEach(obj => Object.keys(obj).forEach(k => {
      if (!fields.includes(k)) {
        throw new RTDSError(`A key '${k}' is not allowed as specifying the deletion.`);
      }
    }));
    return driver.deleteSQL(this.table, fields, obj);
  }

  /**
   * Helper to construct delete nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    if (typeof q.delete === 'string') {
      q.delete = [q.delete];
    }
    return new Delete({
      delete: q.delete.map(s => Field.parse(s, q.table)),
      table: q.table,
      pk: q.pk
    });
  }
}

module.exports = Delete;
