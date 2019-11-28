const clone = require('clone');
const Formula = require('./Formula');

// TODO: Split to separate files.

// Running reference number counter.
let ref = 0;

/**
 * Base class for query tree elements.
 */
class QueryNode {
  constructor(q) {
    this.ref = ++ref;
    Object.assign(this, q);
    this.next = null;
    this.prev = null;
    this.parent = null;
    this.children = [];
  }

  /**
   * Print out structural description of the node tree.
   */
  dump(tab = '') {
    if (tab === '') {
      console.log('Chain:', this.getChain().map(c => `#${c.ref}`).join(' -> '));
    }
    console.log(`${tab}Ref. #${this.ref} ${this.constructor.name} '${this.getDumpName()}'`);
    for (const c of this.children) {
      c.dump(tab + '  ');
    }
  }

  /**
   * Construct a chain of nodes.
   */
  getChain() {
    return this.next ? [this].concat(this.next.getChain()) : [this];
  }

  /**
   * Get the name for debugging purposes.
   */
  getDumpName() {
    return this.getFullName();
  }

  /**
   * Get the meaningful name for this node.
   */
  getName() {
    throw new Error(`A query node ${this.constructor.name} does not implement getName().`);
  }

  /**
   * Collect all names up until root element from parent chain separated by dots.
   */
  getFullName() {
    let name = this.getName();
    if (this.parent) {
      const parent = this.parent.getFullName();
      if (parent !== null) {
        name = parent + '.' + name;
      }
    }
    return name;
  }

  /**
   * Construct a post-processing formula for the query.
   */
  getPostFormula() {
    const ret = {};
    for (const c of this.children) {
      Object.assign(ret, c.getPostFormula());
    }
    return ret;
  }

  /**
   * Avoid circulars due to structural fields.
   */
  toJSON() {
    const ret = {};
    Object.keys(this).forEach(k => {
      if (k === 'next' || k === 'prev' || k === 'children' || k === 'parent') {
        return;
      }
      ret[k] = this[k];
    });
    return ret;
  }

  /**
   * Construct a SQL for retrieving all matching entries.
   * @param {Driver} driver
   * @returns {String}
   */
  getAllSQL(driver) {
    const select = this.buildSelectSQL(driver);
    const from = this.buildFromSQL(driver);
    return `SELECT ${select.join(', ')} FROM ${from.join(' ')}`;
  }

  async getAll(driver) {
    const sql = this.getAllSQL(driver);
    return driver.runSelectQuery(sql);
  }

  /**
   * Construct a list of entries for SELECT part of SQL.
   * @param {Driver} driver
   * @returns {String[]}
   */
  buildSelectSQL(driver) {
    return this.next ? this.next.buildSelectSQL(driver) : [];
  }

  /**
   * Construct a list of entries for FROM part of SQL.
   * @param {Driver} driver
   * @returns {String[]}
   */
  buildFromSQL(driver) {
    return this.next ? this.next.buildFromSQL(driver) : [];
  }

  /**
   * Append the query as chained continuation for this query.
   * @param {QueryNode} q
   */
  chain(q) {
    // TODO: Allow insertion into the chain?
    if (this.next) {
      throw new Error('Already chained.');
    }
    this.next = q;
    q.prev = this;
  }

  /**
   * Make structural relationship to the other query.
   * @param {QueryNode} q
   */
  addChild(q) {
    q.parent = this;
    this.children.push(q);
  }
}

/**
 * A single table field description in the select query or in join.
 *
 * Parameters:
 * - `table` name of the table
 * - `field` a name of the field
 * - `[as]` alias for the the field (defaults to `field`, not used in join)
 *
 * Alternatively `field` can be an object with alias mapping`{<field>: <as>}`.
 */
class Field extends QueryNode {
  constructor(q) {
    super({ table: q.table, field: q.field, as: q.as || q.field});
  }

  getName() {
    return this.as;
  }

  getAsName() {
    return this.getFullName().split('.').splice(1).join('.');
  }

  buildSelectSQL(driver) {
    return [driver.escapeSelect(this.table, this.field, this.getAsName())];
  }

  buildJoinSQL(driver) {
    return [driver.escapeJoin(this.table, this.field)];
  }

  /**
   * Convert query descriptor to Field instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      if (q.indexOf('.') >= 0) {
        const parts = q.split('.');
        return new Field({ table: parts[0], field: parts[1] });
      }
      return new Field({ table, field: q });
    }
    if (typeof q === 'object') {
      return new Field({ table, field: Object.keys(q)[0], as: Object.values(q)[0]});
    }
    throw new Error(`Unable to parse a field ${JSON.stringify(q)}`);
  }
}

/**
 * A single table field description in the select query or in join.
 *
 * Parameters:
 * - `table` name of the table
 * - `field` a name of the field
 */
class JoinField extends Field {
  constructor(q) {
    super({ table: q.table, field: q.field});
  }

  getFullName() {
    return this.table + '.' + this.field;
  }

  getName() {
    return this.field;
  }

  buildSelectSQL(driver) {
    return [driver.escapeSelect(this.table, this.field, this.as)];
  }

  buildJoinSQL(driver) {
    return [driver.escapeJoin(this.table, this.field)];
  }

  /**
   * Convert query descriptor to JoinField instance.
   * @param {String|Object} q
   * @param {String|null} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      if (q.indexOf('.') >= 0) {
        const parts = q.split('.');
        return new JoinField({ table: parts[0], field: parts[1] });
      }
      return new JoinField({ table, field: q });
    }
    if (typeof q === 'object') {
      return new JoinField({ table, field: Object.keys(q)[0], as: Object.values(q)[0]});
    }
    throw new Error(`Unable to parse a field ${JSON.stringify(q)}`);
  }
}

/**
 * Description of the table join.
 *
 * Parameters:
 * - `type` join type 'cross', 'inner', 'left', 'right'.
 * - `table` name of the table
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
      links: q.links || []
    });
    for (const link of this.links) {
      this.addChild(link[0]);
      this.addChild(link[1]);
    }
  }

  getDumpName() {
    let ret = `${this.type} join ${this.table}`;
    if (this.links.length) {
      ret += ' on';
      for (const link of this.links) {
        ret += ` ${link[0].getDumpName()} = ${link[1].getDumpName()}`;
      }
    }
    return ret;
  }

  /**
   * Construct a JOIN sentence.
   * @param {Driver} driver
   */
  buildJoinSQL(driver) {
    let sql = `${this.type.toUpperCase()} JOIN ${driver.escapeJoin(this.table)}`;
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
      return new Join({ type: 'inner', links, table: q.table});
    } else if (q.leftJoin instanceof Array && q.leftJoin.length === 2) {
      const links = [[
        JoinField.parse(q.leftJoin[0]),
        JoinField.parse(q.leftJoin[1])
      ]];
      return new Join({ type: 'left', links, table: q.table});
    } else {
      return null;
    }
  }
}

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
      ret.members = this.members.map((m) => ({[m.getName()]: m.getPostFormula()}));
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
    const join = Join.parse(q);
    const select = q.select.map(s => Field.parse(s, q.table));
    if (q.members && q.members.length) {
      q.members = q.members.map(m => Query.parse(m));
    }
    return new Select({table: q.table, select, join, members: q.members});
  }
}

class ContainerNode extends QueryNode {
  getName() {
    return null;
  }

  getPostFormula() {
    const ret = {};
    for (const c of this.children) {
      const f = c.getPostFormula();
      if (f.flat) {
        if (!ret.flat) {
          ret.flat = {};
        }
        Object.assign(ret.flat, f.flat);
      }
      if (f.members) {
        if (!ret.members) {
          ret.members = [];
        }
        ret.members = ret.members.concat(f.members);
      }
    }
    return ret;
  }
}

/*********************************************************************************/

/**
 * System independent presentation of the query structure.
 */
class Query {
  constructor(q = Object) {
    this.sql = {};
    this.root = Query.parse(q);
  }

  dump() {
    this.root.dump();
  }

  /**
   * Create a cached copy of the SQL for retrieving all.
   * @param {Driver} driver
   */
  getAllSQL(driver) {
    if (!this.sql.all) {
      this.sql.all = this.root.getAllSQL(driver);
    }
    return this.sql.all;
  }

  getPostFormula() {
    return new Formula(this.root.getPostFormula());
  }

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   */
  async getAll(driver) {
    const data = await this.root.getAll(driver);
    return driver.postProcess(data, this.getPostFormula());
  }

  /**
   * Parse an object to query tree.
   */
  static parse(q) {
    q = clone(q);
    if (q instanceof Array) {
      if (!q.length) {
        throw new Error('Cannot construct query from empty array.');
      }
      let i = 0;
      let ret = Query.parse(q[0]);
      q[0] = ret;
      if (q.length > 1) {
        const container = new ContainerNode();
        container.addChild(ret);
        container.chain(ret);
        ret = container;
        for (i = 1; i < q.length; i++) {
          q[i] = Query.parse(q[i]);
          if (!q[i].join) {
            q[i].join = new Join({type: 'cross', table: q[i].table});
            q[i].addChild(q[i].join);
          }
          q[i - 1].chain(q[i]);
          container.addChild(q[i]);
        }
      }
      return ret;
    }
    if (q.select) {
      return Select.parse(q);
    }
    throw new Error(`Unable to parse query ${JSON.stringify(q)}`);
  }
}

module.exports = Query;
