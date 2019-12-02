const QueryNode = require('./QueryNode');
const Field = require('./Field');
const Join = require('./Join');

/**
 * Select query.
 *
 * Parameters:
 * - `table` name of the table
 * - `select` a list of members to select
 * - `join` what join type is used to link this to previous table unless first
 * - `members` additional Select nodes to treat as object members of the result lines
 */
class Select extends QueryNode {
  constructor(q) {
    super({
      table: q.table,
      select: q.select,
      join: q.join || undefined,
      members: q.members || []
    });
    if (this.join) {
      this.addChild(this.join);
    }
    for (const field of this.select) {
      this.addChild(field);
    }
    if (this.members && this.members.length) {
      this.chain(this.members[0]);
      this.members.forEach(m => this.addChild(m));
    }
  }

  getName() {
    return this.table;
  }

  getPostFormula() {
    const ret = {};
    ret.flat = this.select.reduce((prev, cur) => ({...prev, [cur.as]: cur.getAsName()}), {});
    if (this.members.length) {
      const objects = this.members.map((m) => ({[m.getName()]: m.getPostFormula()}));
      ret.objects = {};
      objects.forEach(o => Object.assign(ret.objects, o));
    }
    return ret;
  }

  buildSelectSQL(driver) {
    let ret = this.select.reduce((prev, cur) => prev.concat(cur.buildSelectSQL(driver)), []);
    if (this.next) {
      ret = ret.concat(this.next.buildSelectSQL(driver));
    }
    return ret;
  }

  buildFromSQL(driver) {
    let ret;
    if (this.join) {
      ret = [`${this.join.buildJoinSQL(driver)}`];
    } else {
      ret = [driver.escapeFrom(this.table)];
    }

    if (this.next) {
      ret = ret.concat(this.next.buildFromSQL(driver));
    }
    return ret;
  }

  /**
   * Helper to construct select nodes for the query.
   * @param {Object} q
   */
  static parse(q) {
    const Query = require('../Query');

    const join = Join.parse(q);
    const select = q.select.map(s => Field.parse(s, q.table));
    if (q.members && q.members.length) {
      q.members = q.members.map(m => Query.parse(m));
    }
    return new Select({table: q.table, select, join, members: q.members});
  }
}

module.exports = Select;
