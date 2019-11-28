const clone = require('clone');
const Formula = require('./Formula');
const ContainerNode = require('./nodes/ContainerNode');
const Select = require('./nodes/Select');
const Join = require('./nodes/Join');

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
