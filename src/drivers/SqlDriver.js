const Driver = require('../Driver');

/**
 * Base class for standard SQL driver.
 */
class SqlDriver extends Driver {
  constructor(url, placeholderFn, separator = '"') {
    super(url);
    this.placeholderFn = placeholderFn;
    this.sep = separator;
  }

  escapeSelect(table, variable, as = null) {
    let sql = `${this.sep}${table}${this.sep}.${this.sep}${variable}${this.sep}`;
    if (as !== null) {
      sql += ` AS ${this.sep}${as}${this.sep}`;
    }
    return sql;
  }

  escapeJoin(table, variable = null) {
    return variable === null ? `${this.sep}${table}${this.sep}` : this.escapeSelect(table, variable);
  }

  escapeFrom(table, as = null) {
    return as ? `${this.sep}${table}${this.sep} AS ${this.sep}${as}${this.sep}` : `${this.sep}${table}${this.sep}`;
  }

  escapeInto(table) {
    return `${this.sep}${table}${this.sep}`;
  }

  createSQL(table, fields, pks, obj) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    let idx = 0;
    const singleSql = () => `(${fields.map((f) => this.placeholderFn(f, idx++)).join(', ')})`;
    const sql = `INSERT INTO ${this.sep}${table}${this.sep} (${fields.map(f => `${this.sep}` + f + `${this.sep}`).join(', ')}) VALUES ${obj.map(() => singleSql()).join(', ')}`;
    const values = obj.map(o => fields.map(f => o[f])).reduce((prev, cur) => prev.concat(cur), []);
    return [sql, values];
  }

  updateSQL(table, fields, pks, obj) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    const sql = [];
    const f = [];
    for (const o of obj) {
      const fs = fields.filter(f => f in o);
      sql.push(`UPDATE ${this.sep}${table}${this.sep} SET ${fs.map((f, idx) => `${this.sep}${f}${this.sep} = ${this.placeholderFn(f, idx)}`).join(', ')} WHERE ` + pks.map((pk, idx) => `${this.sep}${pk}${this.sep} = ${this.placeholderFn(pk, fs.length + idx)}`).join(' AND '));
      f.push(fs.map(f => o[f]).concat(pks.map(pk => o[pk])));
    }
    return [sql, f];
  }

  deleteSQL(table, fields, obj, pks) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    const values = [];
    const where = [];
    let idx = 0;
    const whereSql = () => '(' + fields.map(f => `${this.sep}${f}${this.sep} = ${this.placeholderFn(f, idx++)}`).join(' AND ') + ')';
    for (const row of obj) {
      for (const f of fields) {
        values.push(row[f]);
      }
      where.push(whereSql());
    }
    const sql = `DELETE FROM ${this.sep}${table}${this.sep} WHERE ${where.join(' OR ')}`;
    return [sql, values];
  }

  escapeWhere(variable) {
    return `${this.sep}` + variable.split('.').join(`${this.sep}.${this.sep}`) + `${this.sep}`;
  }

  escapeOrder(table, variable) {
    return `${this.sep}${table}${this.sep}.${this.sep}${variable}${this.sep}`;
  }
}

module.exports = SqlDriver;
