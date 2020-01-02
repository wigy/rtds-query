const RTDSError = require('../RTDSError');
const QueryNode = require('./QueryNode');

/**
 * A limit for query results.
 *
 * Parameters:
 * - `limit` number of entries to return
 */
class Limit extends QueryNode {
  constructor(q) {
    super({ limit: q.limit });
  }

  getName() {
    return `limit ${this.limit}`;
  }

  getFullName() {
    return `limit ${this.limit}`;
  }

  getRef() {
    return this.parent.ref;
  }

  buildLimitSQL(driver) {
    return `LIMIT ${this.limit}`;
  }

  /**
   * Convert query descriptor to Limit instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'number') {
      if (q <= 0) {
        throw new RTDSError(`Invalid limit ${q}.`);
      }
      return new Limit({ limit: q });
    }
    throw new RTDSError(`Unable to parse a limit ${JSON.stringify(q)}`);
  }
}

module.exports = Limit;
