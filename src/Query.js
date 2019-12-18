const clone = require('clone');
const RTDSError = require('./RTDSError');
const Formula = require('./Formula');
const ContainerNode = require('./nodes/ContainerNode');
const Select = require('./nodes/Select');
const Insert = require('./nodes/Insert');
const Update = require('./nodes/Update');
const Delete = require('./nodes/Delete');
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
  async allPKs(driver, cond = null) {
    // Now they are retrieved unnecessarily.
    const data = await this.select(driver, cond, {noPostProcessing: true, pkOnly: true});
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

      // TODO: We don't support multiple PKs since Sqlite does not. Remove unnecessary code.
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
  selectSQL(driver, where = null, {pkOnly = false} = {}) {
    if (where === null) {
      where = '';
    }
    if (!this.sql[where]) {
      if (where !== '') {
        const q = this.withWhere(where);
        this.sql[where] = q.selectSQL(driver, null, {pkOnly});
      } else {
        this.sql[where] = this.root.selectSQL(driver, {pkOnly});
      }
    }
    return this.sql[where];
  }

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   * @param {String} where
   * @param {Boolean} [param3.noPostProcessing]
   * @param {Boolean} [param3.pkOnly]
   * @returns {Object[]}
   */
  async select(driver, where = null, {noPostProcessing = false, pkOnly = false} = {}) {
    const sql = this.selectSQL(driver, where, {pkOnly});
    const data = await driver.runSelectQuery(sql);
    if (noPostProcessing) {
      return data;
    }
    return driver.postProcess(data, this.getPostFormula());
  }

  /**
   * Execute a query to retrieve first match for the selected query.
   * @param {Driver} driver
   * @param {String} where
   * @param {Boolean} [param3.noPostProcessing]
   * @param {Boolean} [param3.pkOnly]
   * @returns {Object|null}
   */
  async getOne(driver, where = null, {noPostProcessing = false, pkOnly = false} = {}) {
    // TODO: Could limit results to one once supported.
    const data = await this.select(driver, where, {noPostProcessing, pkOnly});
    return data && data.length ? data[0] : null;
  }

  /**
   * Construct SQL for creating one new instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  createSQL(driver, obj) {
    return this.root.createSQL(driver, obj);
  }

  /**
   * Execute a query to create one new instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  async create(driver, obj) {
    const [sql, values] = this.createSQL(driver, obj);
    const data = await driver.runInsertQuery(sql, values, this.root.pk);
    return data;
  }

  /**
   * Construct SQL for updating one instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  updateSQL(driver, obj) {
    return this.root.updateSQL(driver, obj);
  }

  /**
   * Execute a query to update one instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  async update(driver, obj) {
    const [sql, values] = this.updateSQL(driver, obj);
    const data = await driver.runUpdateQuery(sql, values, this.root.pk);
    return data;
  }

  /**
   * Construct SQL for deleting one instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  deleteSQL(driver, obj) {
    return this.root.deleteSQL(driver, obj);
  }

  /**
   * Execute a query to delete one instance.
   * @param {Driver} driver
   * @param {Object} obj
   * @returns {Object}
   */
  async delete(driver, obj) {
    const [sql, values] = this.deleteSQL(driver, obj);
    const data = await driver.runDeleteQuery(sql, values, this.root.pk);
    return data;
  }

  /**
   * Parse an object to query tree.
   */
  static parse(q) {
    q = clone(q);
    if (q instanceof Array) {
      if (!q.length) {
        throw new RTDSError('Cannot construct query from empty array.');
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
    } else if (q.insert) {
      return Insert.parse(q);
    } else if (q.update) {
      return Update.parse(q);
    } else if (q.delete) {
      return Delete.parse(q);
    }
    throw new RTDSError(`Unable to parse query ${JSON.stringify(q)}`);
  }
}

module.exports = Query;
