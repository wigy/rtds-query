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
        node.select.forEach(s => node.removeChild(s));
        const process = {};
        const selects = node.pk.map((s, i) => {
          const key = `PK[${node.table}[${i}]]`;
          process[key] = 'collectPKs'
          return Field.parse({[s]: key}, node.table);
        });
        selects.forEach(s => node.addChild(s));
        node.select = selects;
        node.process = process;
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
   * Create a cached copy of the SQL for retrieving all.
   * @param {Driver} driver
   * @param {}
   */
  getAllSQL(driver, where = null) {
    if (where === null) {
      where = '';
    }
    if (!this.sql[where]) {
      if (where !== '') {
        const q = this.withWhere(where);
        this.sql[where] = q.getAllSQL(driver);
      } else {
        this.sql[where] = this.root.getAllSQL(driver);
      }
    }
    return this.sql[where];
  }

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   */
  async getAll(driver, where = null) {
    const sql = this.getAllSQL(driver, where);
    const data = await driver.runSelectQuery(sql);
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
