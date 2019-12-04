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
      throw new Error(`Join type missing in query ${JSON.stringify(q)}`);
    }
    if (!q.table) {
      throw new Error(`Join table missing in query ${JSON.stringify(q)}`);
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
    if (q.join instanceof Array && q.join.length === 2) {
      const links = [[
        JoinField.parse(q.join[0]),
        JoinField.parse(q.join[1])
      ]];
      return new Join({ type: 'inner', links, table: q.table, as: q.as});
    } else if (q.leftJoin instanceof Array && q.leftJoin.length === 2) {
      const links = [[
        JoinField.parse(q.leftJoin[0]),
        JoinField.parse(q.leftJoin[1])
      ]];
      return new Join({ type: 'left', links, table: q.table, as: q.as});
    } else {
      return null;
    }
  }
}

module.exports = Join;
