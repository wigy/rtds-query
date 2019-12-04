const QueryNode = require('./QueryNode');
const Field = require('./Field');
const Join = require('./Join');

/**
 * Select query.
 *
 * Parameters:
 * - `table` name of the table
 * - `[as]` alias to be used when this is as a member (defaults to `table`)
 * - `select` a list of members to select
 * - `join` what join type is used to link this to previous table unless first
 * - `members` additional Select nodes to treat as object members of the result lines
 */
class Select extends QueryNode {
  constructor(q) {
    super({
      table: q.table,
      as: q.as || undefined,
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
      for (let i = 1; i < this.members.length; i++) {
        this.members[i - 1].chain(this.members[i]);
      }
    }
  }

  getName() {
    return this.as || this.table;
  }

  getDumpName() {
    let ret = this.table;
    if (this.as) {
      ret += ` as ${this.as}`;
    }
    return ret;
  }

  getPostFormula() {
    const ret = {};
    ret.flat = this.select.reduce((prev, cur) => ({...prev, [cur.as]: cur.getAsName()}), {});
    if (this.members.length) {
      ret.objects = {};
      this.members.forEach(m => {
        ret.objects[m.getName()] = m.getPostFormula();
      });
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
      ret = [driver.escapeFrom(this.table, this.table + this.getRef())];
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
    if (!(q.select instanceof Array)) {
      q.select = [q.select];
    }
    const join = Join.parse(q);
    const select = q.select.map(s => Field.parse(s, q.table));
    if (q.members && q.members.length) {
      q.members = q.members.map(m => Query.parse(m));
    }
    return new Select({table: q.table, as: q.as, select, join, members: q.members});
  }
}

module.exports = Select;
