const clone = require('clone');
const Formula = require('./Formula');
const ContainerNode = require('./nodes/ContainerNode');
const Select = require('./nodes/Select');
const Join = require('./nodes/Join');
const Field = require('./nodes/Field');
const Parser = require('./Parser');

/*********************************************************************************/

/**
 * System independent presentation of the query structure.
 */
class Query {

  static get PK_REGEX() { return /(.*)PK\[(\w+)\[(\d+)\]\]$/; }

  constructor(q = {}) {
    this.sql = {};
    this.root = Query.parse(q);
    this.root.markRoot(this.root);
  }

  dump() {
    this.root.dump();
    return this;
  }

  toJSON() {
    return this.root.toJSON();
  }

  getPostFormula() {
    return new Formula(this.root.getPostFormula());
  }

  /**
   * Create new query from this by adding extra condition.
   * @param {String} cond
   * @returns {Query}
   */
  withWhere(cond) {
    const copy = clone(this);
    copy.sql = {};
    const vars = Parser.vars(cond);
    const node = copy.root.findScope(vars);
    node.addWhere(cond);
    return copy;
  }

  /**
   * Create new query that selects table primary keys.
   * @returns {Query}
   */
  selectPKs() {
    const copy = clone(this);
    copy.sql = {};

    const changeNode = (node) => {
      if (node instanceof Select) {
        const selects = node.pk.map((s, i) => {
          const key = `PK[${node.table}[${i}]]`;
          return Field.parse({[s]: key}, node.table);
        });
        selects.forEach(s => node.addChild(s));
        node.select = node.select.concat(selects);
      }
      if (node.children) {
        for (const c of node.children) {
          changeNode(c);
        }
      }
    };

    changeNode(copy.root);

    return copy;
  }

  /**
   * Collect all PKs from all tables involved.
   * @param {Driver} driver
   * @param {String} cond
   */
  async getAllPKs(driver, cond = null) {
    // Now they are retrieved unnecessarily.
    const data = await this.getAll(driver, cond, {noPostProcessing: true, pkOnly: true});
    let keys = data.length ? Object.keys(data[0]).filter(k => Query.PK_REGEX.test(k)) : [];
    keys = keys.map(k => [...Query.PK_REGEX.exec(k), k]);
    const ret = {};

    // Reorganize all primary keys.
    for (let i = 0; i < data.length; i++) {
      const obj = {};
      for (let [, prefix, table, index, k] of keys) {
        const name = `${prefix}/${table}`;
        if (!obj[name]) {
          obj[name] = [];
        }
        index = parseInt(index);
        while (obj[name].length <= index) {
          obj[name].push(null);
        }
        obj[name][index] = data[i][k];
      }

      // Trim down singletons and collect PKs by table.
      Object.entries(obj).forEach(([name, pks]) => {
        const [, table] = name.split('/');
        if (!ret[table]) {
          ret[table] = [];
        }
        if (pks && pks.length === 1) {
          ret[table].push(pks[0]);
        } else {
          ret[table].push(pks);
        }
      });
    }

    // Reduce them to sets.
    Object.keys(ret).forEach(table => {
      ret[table] = new Set(ret[table]);
    });

    return ret;
  }

  /**
   * Create a cached copy of the SQL for retrieving all.
   * @param {Driver} driver
   * @param {}
   */
  getAllSQL(driver, where = null, {pkOnly = false} = {}) {
    if (where === null) {
      where = '';
    }
    if (!this.sql[where]) {
      if (where !== '') {
        const q = this.withWhere(where);
        this.sql[where] = q.getAllSQL(driver, null, {pkOnly});
      } else {
        this.sql[where] = this.root.getAllSQL(driver, {pkOnly});
      }
    }
    return this.sql[where];
  }

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   */
  async getAll(driver, where = null, {noPostProcessing = false, pkOnly = false} = {}) {
    const sql = this.getAllSQL(driver, where, {pkOnly});
    const data = await driver.runSelectQuery(sql);
    if (noPostProcessing) {
      return data;
    }
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
