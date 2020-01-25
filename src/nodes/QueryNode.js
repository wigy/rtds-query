const RTDSError = require('../RTDSError');

// Running reference number counter.
let ref = 0;

/**
 * Base class for query tree elements.
 */
class QueryNode {
  constructor(q) {
    this.ref = ++ref;
    Object.assign(this, q);
    this.root = null;
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
    console.log(`${tab}Ref. #${this.ref} (of #${this.getRef()}) ${this.constructor.name} '${this.getDumpName()}'`);
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
   * Get a list of tables involved.
   */
  getTables() {
    return this.getChain().map(node => node.table);
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
    throw new RTDSError(`A query node ${this.constructor.name} does not implement getName().`);
  }

  /**
   * Get the reference number pointing to the related table.
   */
  getRef() {
    return this.ref;
  }

  /**
   * Return the type of the query as 'select', 'create', 'update' or 'delete'.
   */
  getType() {
    throw new RTDSError(`A query node ${this.constructor.name} does not implement getName().`);
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
   * Collect variable resolving mappings as a list from the nearest definition toward the root.
   * The list is a pairs [`short`, `table`, `long`] where `short` is
   * short structural name, `table` is fully qualified name for SQL and `long` is long
   * structural name containing parent names.
   */
  scope() {
    return this.parent ? this.parent.scope() : [];
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
    const ret = {
      node: this.constructor.name
    };
    Object.keys(this).forEach(k => {
      if (k === 'ref' || k === 'next' || k === 'prev' || k === 'children' || k === 'parent' || k === 'root') {
        return;
      }
      if (this[k] === undefined) {
        return;
      }
      if (this[k] instanceof Array) {
        ret[k] = this[k].map(e => (e && e.toJSON) ? e.toJSON() : e);
      } else {
        ret[k] = (this[k] && this[k].toJSON) ? this[k].toJSON() : this[k];
      }
    });
    return ret;
  }

  /**
   * Show JSON as a string.
   */
  toString() {
    return `${this.constructor.name}(${JSON.stringify(this.toJSON())})`;
  }

  /**
   * Mark a node as a root for node tree.
   * @param {QueryNode} root
   */
  markRoot(root) {
    this.root = root;
    for (const c of this.children) {
      c.markRoot(root);
    }
  }

  /**
   * Construct a SQL for retrieving all matching entries.
   * @param {Driver} driver
   * @returns {String}
   */
  selectSQL(driver, {pkOnly = false} = {}) {
    const select = this.buildSelectSQL(driver, {pkOnly});
    const from = this.buildFromSQL(driver);
    let sql = `SELECT ${select.join(', ')} FROM ${from.join(' ')}`;
    const where = this.buildWhereSQL(driver);
    if (where.length) {
      sql += ` WHERE (${where.join(') AND (')})`;
    }
    const order = this.buildOrderSQL(driver);
    if (order.length) {
      sql += ' ORDER BY ' + order.join(', ');
    }
    const limit = this.buildLimitSQL(driver);
    if (limit) {
      sql += ' ' + limit;
    }
    return sql;
  }

  /**
   * Construct a SQL for inserting a row.
   * @param {Driver} driver
   * @param {Object|Object[]} obj
   * @returns {String}
   */
  createSQL(driver, obj) {
    throw new RTDSError(`Creation not supported for ${this.constructor.name}.`);
  }

  /**
   * Construct a SQL for updating a row.
   * @param {Driver} driver
   * @param {Object|Object[]} obj
   * @returns {String}
   */
  updateSQL(driver, obj) {
    throw new RTDSError(`Updating not supported for ${this.constructor.name}.`);
  }

  /**
   * Construct a SQL for deleting a row.
   * @param {Driver} driver
   * @param {Object|Object[]} obj
   * @returns {String}
   */
  deleteSQL(driver, obj) {
    throw new RTDSError(`Deleting not supported for ${this.constructor.name}.`);
  }

  /**
   * Construct a list of entries for SELECT part of SQL.
   * @param {Driver} driver
   * @returns {String[]}
   */
  buildSelectSQL(driver, {pkOnly = false} = {}) {
    return this.next ? this.next.buildSelectSQL(driver, {pkOnly}) : [];
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
   * Construct a list of entries for WHERE part of SQL.
   * @param {Driver} driver
   * @returns {String[]}
   */
  buildWhereSQL(driver) {
    return this.next ? this.next.buildWhereSQL(driver) : [];
  }

  /**
   * Construct an array of ORDER parts for SQL.
   * @param {Driver} driver
   * @returns {String[]}
   */
  buildOrderSQL(driver) {
    return [];
  }

  /**
   * Construct a LIMIT part of SQL.
   * @param {Driver} driver
   * @returns {String|null}
   */
  buildLimitSQL(driver) {
    return null;
  }

  /**
   * Append the query as chained continuation for this query.
   * @param {QueryNode} q
   */
  chain(q) {
    let tail = this;
    while (tail.next) {
      tail = tail.next;
    }
    tail.next = q;
    q.prev = tail;
  }

  /**
   * Make structural relationship to the other query node.
   * @param {QueryNode} q
   */
  addChild(q) {
    q.parent = this;
    this.children.push(q);
  }

  /**
   * Remove structural relations ship to other query node.
   * @param {QueryNode} q
   */
  removeChild(q) {
    q.parent = null;
    this.children = this.children.filter(c => c.ref !== q.ref);
  }

  /**
   * Look for the node which has scope containing all variables.
   * @param {String[]} vars
   * @return {QueryNode}
   */
  findScope(vars) {
    const scopeVars = new Set(this.scope().map(s => s[2]));
    if (vars.every(v => scopeVars.has(v))) {
      return this;
    }
    if (this.next) {
      return this.next.findScope(vars);
    } else {
      const missing = vars.filter(v => !scopeVars.has(v));
      throw new RTDSError(`Unable to find node with the variables ${missing.join(', ')}.`);
    }
  }
}

module.exports = QueryNode;
