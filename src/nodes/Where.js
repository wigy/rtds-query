const QueryNode = require('./QueryNode');

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
    // TODO: This is too simple. Need more comprehensive analysis of expression.
    let sql = this.where.split(/\b(\w+)\b/);
    const scope = this.scope();
    for (let i = 0; i < sql.length; i++) {
      if (/\b(\w+)\b/.test(sql[i])) {
        for (const v of scope) {
          if (v[0] === sql[i]) {
            sql[i] = driver.escapeWhere(v[1]);
            break;
          }
        }
      }
    }
    return sql.join('');
  }

  /**
   * Convert query descriptor to Where instance.
   * @param {String|Object} q
   */
  static parse(q) {
    if (typeof q === 'string') {
      return new Where({where: q});
    }
    throw new Error(`Unable to parse a where condition ${JSON.stringify(q)}`);
  }
}

module.exports = Where;
