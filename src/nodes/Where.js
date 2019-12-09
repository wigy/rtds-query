const QueryNode = require('./QueryNode');
const escapeStringRegexp = require('escape-string-regexp');
const clone = require('clone');

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

    // Helper to split array of single sql piece to further pieces from valid scope variable.
    const parseReplaceVar = (piece, variable, as) => {
      if (piece.isVar) {
        return [piece];
      }
      const ret = [];
      const r = new RegExp('\\b(' + escapeStringRegexp(variable) + ')\\b');
      let sql = piece.sql.split(r);
      for (let i = 0; i < sql.length; i++) {
        if (r.test(sql[i])) {
          ret.push({
            sql: driver.escapeWhere(as),
            isVar: true
          })
        } else if (sql[i] !== '') {
          ret.push({
            sql: sql[i],
            isVar: false
          });
        }
      }
      return ret;
    }

    // Helper to replace all scope variables.
    const parseReplace = (pieces) => {
      let ret = pieces;
      let out;
      for (const [name, as] of scope) {
        out = [];
        for (let i = 0; i < ret.length; i++) {
          out = out.concat(parseReplaceVar(ret[i], name, as));
        }
        ret = out;
      }
      return ret;
    };

    // Helper to combine pieces together.
    const collectSql = (pieces) => pieces.map(p => p.sql).join('');

    // Helper to parse and replace all scope variables in SQL.
    const parse = (sql) => collectSql(parseReplace([{isVar: false, sql}]))

    return parse(this.where);
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
