const RTDSError = require('../RTDSError');
const QueryNode = require('./QueryNode');

/**
 * A single table field description in the select query or in join.
 *
 * Parameters:
 * - `table` name of the table
 * - `field` a name of the field
 * - `[as]` alias for the the field (defaults to `field`)
 *
 * Alternatively `field` can be an object with alias mapping`{<field>: <as>}`.
 */
class Field extends QueryNode {
  constructor(q) {
    super({ table: q.table, field: q.field, as: q.as || q.field});
  }

  getName() {
    return this.as;
  }

  getAsName() {
    return this.getFullName().split('.').splice(1).join('.');
  }

  getRef() {
    return this.parent.ref;
  }

  buildSelectSQL(driver, {pkOnly = false} = {}) {
    return [driver.escapeSelect(this.parent.getName() + this.getRef(), this.field, this.getAsName())];
  }

  buildJoinSQL(driver) {
    return [driver.escapeJoin(this.table, this.field)];
  }

  /**
   * Convert query descriptor to Field instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      if (q.indexOf('.') >= 0) {
        const parts = q.split('.');
        return new Field({ table: parts[0], field: parts[1] });
      }
      return new Field({ table, field: q });
    }
    if (typeof q === 'object') {
      return new Field({ table, field: Object.keys(q)[0], as: Object.values(q)[0]});
    }
    throw new RTDSError(`Unable to parse a field ${JSON.stringify(q)}`);
  }
}

module.exports = Field;
