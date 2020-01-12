const clone = require('clone');
const MainQuery = require('./MainQuery');
const Field = require('./Field');
const Join = require('./Join');
const Where = require('./Where');
const Order = require('./Order');
const Limit = require('./Limit');

/**
 * Select query.
 *
 * Parameters:
 * - `table` name of the table
 * - `[as]` alias to be used when this is as a member (defaults to `table`)
 * - `[pk]` a list of primary keys (defaults to `['id']`)
 * - `select` a list of members to select
 * - `join` what join type is used to link this to previous table unless first
 * - `members` additional Select nodes to treat as object members of the result lines
 * - `[where]` array of conditions attached if any
 * - `[order]` order conditions if any
 * - `[limit]` limit condition if any
 */
class Select extends MainQuery {
  constructor(q) {
    super({
      table: q.table,
      as: q.as || undefined,
      pk: q.pk || ['id'],
      select: q.select,
      join: q.join || undefined,
      members: q.members || [],
      process: q.process || undefined,
      where: q.where || undefined,
      order: q.order || undefined,
      limit: q.limit || undefined
    });
    for (const field of this.select) {
      this.addChild(field);
    }
    if (this.join) {
      this.addChild(this.join);
    }
    if (this.where) {
      this.where.forEach(w => this.addChild(w));
    }
    if (this.limit) {
      this.addChild(this.limit);
    }
    if (this.members && this.members.length) {
      this.chain(this.members[0]);
      this.members.forEach(m => this.addChild(m));
      for (let i = 1; i < this.members.length; i++) {
        this.members[i - 1].chain(this.members[i]);
      }
    }
    if (this.order) {
      this.addChild(this.order);
    }
  }

  getFields() {
    return this.select;
  }

  getName() {
    return this.as || this.table;
  }

  getDumpName() {
    let ret = this.table;
    if (this.as) {
      ret += ` as ${this.as}`;
    }
    if (this.pk.length !== 1 || this.pk[0] !== 'id') {
      ret += ` (PK: ${this.pk.join(' + ')})`;
    }
    return ret;
  }

  scope() {
    const map = this.select.map(s => ([s.getName(), s.table + this.ref + '.' + s.field, s.getFullName()]));
    return this.parent ? map.concat(this.parent.scope()) : map;
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
    if (this.process) {
      ret.process = clone(this.process);
    }
    return ret;
  }

  buildSelectSQL(driver, {pkOnly = false} = {}) {
    const Query = require('../Query');

    driver.verifyTableColumns(this.table, this.select.map(s => s.field));

    let ret = this.select.reduce((prev, cur) => {
      if (pkOnly && !Query.PK_REGEX.test(cur.as)) {
        return prev;
      }
      return prev.concat(cur.buildSelectSQL(driver, {pkOnly}));
    }, []);
    if (this.next) {
      ret = ret.concat(this.next.buildSelectSQL(driver, {pkOnly}));
    }
    return ret;
  }

  buildWhereSQL(driver) {
    let ret = this.where ? this.where.reduce((prev, cur) => prev.concat(cur.buildWhereSQL(driver)), []) : [];
    if (this.next) {
      ret = ret.concat(this.next.buildWhereSQL(driver));
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

  buildOrderSQL(driver) {
    let ret = [];
    if (this.order) {
      ret = this.order.buildOrderSQL(driver);
    }
    if (this.next) {
      ret = ret.concat(this.next.buildOrderSQL(driver));
    }
    return ret;
  }

  buildLimitSQL(driver) {
    return this.limit ? this.limit.buildLimitSQL(driver) : null;
  }

  /**
   * Append additional where condition.
   * @param {String} cond
   */
  addWhere(cond) {
    if (!this.where) {
      this.where = [];
    }
    const where = Where.parse(cond);
    this.addChild(where);
    this.where.push(where);
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
    if ('where' in q) {
      if (!(q.where instanceof Array)) {
        q.where = [q.where];
      }
      q.where = q.where.map(w => Where.parse(w));
    }
    if ('pk' in q) {
      if (typeof q.pk === 'string') {
        q.pk = [q.pk];
      }
    }
    if ('order' in q) {
      q.order = Order.parse(q.order, q.table);
    }
    if ('limit' in q) {
      q.limit = Limit.parse(q.limit);
    }
    return new Select({
      table: q.table,
      as: q.as,
      pk: q.pk,
      select,
      join,
      members:
      q.members,
      process: q.process,
      where: q.where,
      limit: q.limit,
      order: q.order
    });
  }
}

module.exports = Select;
