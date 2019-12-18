const RTDSError = require('../RTDSError');
const Field = require('./Field');

/**
 * A single table field description in the select query or in join.
 *
 * Parameters:
 * - `table` name of the table
 * - `field` a name of the field
 */
class JoinField extends Field {
  constructor(q) {
    super({ table: q.table, field: q.field});
  }

  getFullName() {
    return this.table + '.' + this.field;
  }

  getName() {
    return this.field;
  }

  getRef() {
    const getParentRef = (obj) => {
      if (this.table === (obj.as || obj.table)) {
        return obj.ref;
      }
      if (obj.prev) {
        return getParentRef(obj.prev);
      }
      if (!obj.parent) {
        throw new RTDSError(`Invalid join reference ${this.table}.${this.field}.`);
      }
      return getParentRef(obj.parent);
    };
    return getParentRef(this.parent.parent);
  }

  buildSelectSQL(driver, {pkOnly = false} = {}) {
    return [driver.escapeSelect(this.table, this.field, this.as)];
  }

  buildJoinSQL(driver) {
    return [driver.escapeJoin(this.table + this.getRef(), this.field)];
  }

  /**
   * Convert query descriptor to JoinField instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      if (q.indexOf('.') >= 0) {
        const parts = q.split('.');
        return new JoinField({ table: parts[0], field: parts[1] });
      }
      return new JoinField({ table, field: q });
    }
    if (typeof q === 'object') {
      return new JoinField({ table, field: Object.keys(q)[0], as: Object.values(q)[0]});
    }
    throw new RTDSError(`Unable to parse a field ${JSON.stringify(q)}`);
  }
}

module.exports = JoinField;
