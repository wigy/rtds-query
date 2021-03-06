const QueryNode = require('./QueryNode');
const Parser = require('../Parser');
const RTDSError = require('../RTDSError');

/**
 * A where condition.
 *
 * Parameters:
 * - `where` condition
 */
class Where extends QueryNode {
  constructor(q) {
    super({ where: q.where});
  }

  getFullName() {
    return this.where;
  }

  getName() {
    return this.where;
  }

  buildWhereSQL(driver) {
    const scope = this.scope();
    return Parser.substituteScope(scope, this.where, driver);
  }

  /**
   * Convert query descriptor to Where instance.
   * @param {String|Object} q
   */
  static parse(q) {
    if (typeof q === 'string') {
      return new Where({where: q});
    }
    if (q instanceof Object) {
      return Where.parse('(' + Object.entries(q).map(([k, v]) => `${k} = ${v}`).join(' AND ') + ')');
    }
    throw new RTDSError(`Unable to parse a where condition ${JSON.stringify(q)}`);
  }
}

module.exports = Where;
