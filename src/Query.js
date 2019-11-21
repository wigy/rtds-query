const clone = require('clone');

/**
 * Base class for query tree elements.
 */
class QueryNode {
  constructor(q) {
    Object.assign(this, q);
  }

  async getAll(driver) {
    throw new Error(`A class ${this.constructor.name} does not implement getAll().`);
  }
}

/**
 * A single result member in the select query.
 *
 * Parameters:
 * - `table` name of the table
 * - `select` a name of the field
 * - `[as]` alias for the the field (defaults to `select`)
 *
 * Alternatively select can be an object with alias mapping`{<select>: <as>}`.
 */
class Field extends QueryNode {
  constructor(q) {
    if (q.select instanceof Object) {
      super({table: q.table, select: Object.keys(q.select)[0], as: Object.values(q.select)[0]});
    } else {
      super(q);
    }
  }

  escape(driver) {
    return driver.escapeSelect(this.table, this.select, this.as);
  }
}

/**
 * Select query.
 *
 * Parameters:
 * - `table` name of the table
 * - `select` a list of members to select
 */
class Select extends QueryNode {
  constructor(q) {
    super({
      table: q.table,
      select: q.select.map(s => new Field({table: q.table, select: s}))
    });
  }

  async getAll(driver) {
    const select = this.select.map(f => f.escape(driver));
    const from = driver.escapeFrom(this.table);
    const sql = `SELECT ${select.join(', ')} FROM ${from}`;
    return driver.runSelectQuery(sql);
  }
}

/**
 * System independent presentation of the query structure.
 */
class Query {
  constructor(q = Object) {
    this.root = Query.parse(q);
  }

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   */
  async getAll(driver) {
    return this.root.getAll(driver);
  }

  /**
   * Helper to construct select nodes from the query.
   * @param {Object} q
   */
  static parseSelect(q) {

  }

  /**
   * Parse an object to query tree.
   */
  static parse(q) {
    q = clone(q);
    const keys = new Set(Object.keys(q));
    if (keys.has('members')) {
      // TODO: Implement joins as chained selects.
      console.log(q.members);
    }
    if (keys.size === 2 && keys.has('table') && keys.has('select')) {
      return new Select({table: q.table, select: q.select});
    }
    throw new Error(`Unable to parse query ${JSON.stringify(q)}`);
  }
}

module.exports = Query;
