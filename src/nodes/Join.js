const RTDSError = require('../RTDSError');
const QueryNode = require('./QueryNode');
const JoinField = require('./JoinField');

/**
 * Description of the table join.
 *
 * Parameters:
 * - `type` join type 'cross', 'inner', 'left', 'right'.
 * - `table` name of the table
 * - `[as]` alias to be used for this member (defaults to `table`)
 * - `links` connected fields as pairs [<Field1>, <Field2>].
 */
class Join extends QueryNode {
  constructor(q) {
    if (!q.type) {
      throw new RTDSError(`Join type missing in query ${JSON.stringify(q)}`);
    }
    if (!q.table) {
      throw new RTDSError(`Join table missing in query ${JSON.stringify(q)}`);
    }
    if (q.type === 'cross') {
      // This does not work anymore in intended way after refactoring more generic Formula
      // class, which now removes duplicates. It would need additional flag for Formula
      // in order to NOT remove duplicates as by default.
      throw new RTDSError('Cross joins not supported.');
    }
    super({
      type: q.type,
      table: q.table,
      as: q.as || undefined,
      links: q.links || []
    });
    for (const link of this.links) {
      this.addChild(link[0]);
      this.addChild(link[1]);
    }
  }

  toJSON() {
    const ret = {
      node: this.constructor.name,
      type: this.type,
      table: this.table,
      links: this.links.map(l => l.map(e => (e && e.toJSON) ? e.toJSON() : e))
    };
    if (this.as) {
      ret.as = this.as;
    }
    return ret;
  }

  getDumpName() {
    let ret = `${this.type} join ${this.table}`;
    if (this.as) {
      ret += ` as ${this.as}`;
    }
    if (this.links.length) {
      ret += ' on';
      for (const link of this.links) {
        ret += ` ${link[0].getDumpName()} = ${link[1].getDumpName()}`;
      }
    }
    return ret;
  }

  getRef() {
    return this.parent.ref;
  }

  /**
   * Construct a JOIN sentence.
   * @param {Driver} driver
   */
  buildJoinSQL(driver) {
    let sql = `${this.type.toUpperCase()} JOIN ${driver.escapeJoin(this.table)}`;
    if (this.as) {
      sql += ` AS ${driver.escapeFrom(this.as + this.getRef())}`;
    } else {
      sql += ` AS ${driver.escapeFrom(this.table + this.getRef())}`;
    }
    if (this.links.length) {
      sql += ' ON ';
      this.links.forEach(link => {
        sql += `${link[0].buildJoinSQL(driver)} = ${link[1].buildJoinSQL(driver)}`;
      });
    }
    return sql;
  }

  static parse(q) {
    if (q.join) {
      if (typeof q.join === 'string') {
        const parts = q.join.split('=');
        if (parts.length === 2) {
          q.join = [parts[0].trim(), parts[1].trim()];
        }
      }
      if (q.join instanceof Array && q.join.length === 2) {
        const links = [[
          JoinField.parse(q.join[0]),
          JoinField.parse(q.join[1])
        ]];
        return new Join({ type: 'inner', links, table: q.table, as: q.as});
      }
      throw new RTDSError(`Unable to parse join ${JSON.stringify(q.join)}`);
    }

    if (q.leftJoin) {
      if (q.leftJoin instanceof Array && q.leftJoin.length === 2) {
        const links = [[
          JoinField.parse(q.leftJoin[0]),
          JoinField.parse(q.leftJoin[1])
        ]];
        return new Join({ type: 'left', links, table: q.table, as: q.as});
      }
      throw new RTDSError(`Unable to parse left join ${JSON.stringify(q.leftJoin)}.`);
    }

    return null;
  }
}

module.exports = Join;
