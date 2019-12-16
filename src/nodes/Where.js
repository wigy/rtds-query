const QueryNode = require('./QueryNode');
const Parser = require('../Parser');

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
    // TODO: Support for object where like {name: 'This Name'}
    throw new Error(`Unable to parse a where condition ${JSON.stringify(q)}`);
  }
}

module.exports = Where;
