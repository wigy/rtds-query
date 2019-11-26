const clone = require('clone');

/**
 * Base class for query tree elements.
 */
class QueryNode {
  constructor(q) {
    Object.assign(this, q);
    this.next = null;
    this.prev = null;
    this.parent = null;
  }

  /**
   * Avoid circulars due to `next` and `prev` fields.
   */
  toJSON() {
    const ret = {};
    Object.keys(this).forEach(k => {
      if (k === 'next' || k === 'prev') {
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
    this.next = q;
    q.prev = this;
  }

  /**
   * Make structural relationship to the other query.
   * @param {QueryNode} q
   */
  addChild(q) {
    q.parent = this;
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

  buildSelectSQL(driver) {
    return [driver.escapeSelect(this.table, this.field, this.as)];
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
        Field.parse(q.join[0]),
        Field.parse(q.join[1])
      ]];
      return new Join({ type: 'inner', links, table: q.table});
    } else if (q.leftJoin instanceof Array && q.leftJoin.length === 2) {
      const links = [[
        Field.parse(q.leftJoin[0]),
        Field.parse(q.leftJoin[1])
      ]];
      return new Join({ type: 'left', links, table: q.table});
    } else {
      return new Join({type: 'cross', table: q.table});
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
      members: q.members || undefined
    });
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
    if (this.prev) {
      if (!this.join) {
        throw new Error(`Type of join not defined in ${JSON.stringify(this)}`);
      }
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
    const ret = new Select({table: q.table, select, join});
    if (q.members && q.members.length) {
      ret.chain(q.members[0]);
      q.members.forEach(m => ret.addChild(m));
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

  /**
   * Execute a query to retrieve all fields specified in the query.
   * @param {Driver} driver
   */
  async getAll(driver) {
    return this.root.getAll(driver);
  }

  /**
   * Parse an object to query tree.
   */
  static parse(q) {
    if (q instanceof Array) {
      if (!q.length) {
        throw new Error('Cannot construct query from empty array.');
      }
      let i = 0;
      let ret;
      do {
        const part = Query.parse(q[i]);
        if (i) {
          ret.chain(part);
        } else {
          ret = part;
        }
        i++;
      } while (i < q.length);
      return ret;
    }
    q = clone(q);
    if (q.select) {
      if (q.members) {
        q.members = q.members.map(m => Query.parse(m));
      }
      return Select.parse(q);
    }
    throw new Error(`Unable to parse query ${JSON.stringify(q)}`);
  }
}

module.exports = Query;
