const RTDSError = require('../RTDSError');
const Field = require('./Field');

/**
 * A single table field description in order part of the query.
 *
 * Parameters:
 * - `table` name of the table
 * - `field` a name of the field
 * - `reverse` if set, order field is descending.
 */
class OrderField extends Field {
  constructor(q) {
    super({ table: q.table, field: q.field });
    this.reverse = q.reverse || false;
  }

  getFullName() {
    return (this.reverse ? '-' : '+') + this.table + '.' + this.field;
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
        throw new RTDSError(`Invalid order reference ${this.table}.${this.field}.`);
      }
      return getParentRef(obj.parent);
    };
    return getParentRef(this.parent.parent);
  }

  buildOrderSQL(driver) {
    const dir = this.reverse ? ' DESC' : '';
    return driver.escapeOrder(this.table + this.getRef(), this.field) + dir;
  }

  /**
   * Convert query descriptor to OrderField instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      q = q.trim();
      let reverse = false;
      if (q.length && q[0] === '-') {
        q = q.substr(1);
        reverse = true;
      }
      if (q.indexOf('.') >= 0) {
        const parts = q.split('.');
        return new OrderField({ table: parts[0], field: parts[1], reverse });
      }
      return new OrderField({ table, field: q, reverse });
    }
    throw new RTDSError(`Unable to parse a field ${JSON.stringify(q)}`);
  }
}

module.exports = OrderField;
