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
    console.log(`${tab}Ref. #${this.ref} (as #${this.getRef()}) ${this.constructor.name} '${this.getDumpName()}'`);
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
   * Get the reference number pointing to the related table.
   */
  getRef() {
    return this.ref;
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
   * Show JSON as a string.
   */
  toString() {
    return `${this.constructor.name}(${JSON.stringify(this.toJSON())})`;
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

  /**
   * Retrieve all matching entries.
   * @param {Driver} driver
   */
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
    let tail = this;
    while (tail.next) {
      tail = tail.next;
    }
    tail.next = q;
    q.prev = tail;
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

module.exports = QueryNode;
