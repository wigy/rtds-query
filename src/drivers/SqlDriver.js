const Driver = require('../Driver');

/**
 * Base class for standard SQL driver.
 */
class SqlDriver extends Driver {
  constructor(url, placeholderFn) {
    super(url);
    this.placeholderFn = placeholderFn;
  }

  escapeSelect(table, variable, as = null) {
    let sql = `"${table}"."${variable}"`;
    if (as !== null) {
      sql += ` AS "${as}"`;
    }
    return sql;
  }

  escapeJoin(table, variable = null) {
    return variable === null ? `"${table}"` : this.escapeSelect(table, variable);
  }

  escapeFrom(table, as = null) {
    return as ? `"${table}" AS "${as}"` : `"${table}"`;
  }

  escapeInto(table) {
    return `"${table}"`;
  }

  createSQL(table, fields, pks, obj) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    let idx = 0;
    const singleSql = () => `(${fields.map((f) => this.placeholderFn(f, idx++)).join(', ')})`;
    const sql = `INSERT INTO "${table}" (${fields.map(f => '"' + f + '"').join(', ')}) VALUES ${obj.map(() => singleSql()).join(', ')}`;
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
      sql.push(`UPDATE "${table}" SET ${fs.map((f, idx) => `"${f}" = ${this.placeholderFn(f, idx)}`).join(', ')} WHERE ` + pks.map((pk, idx) => `"${pk}" = ${this.placeholderFn(pk, fs.length + idx)}`).join(' AND '));
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
    const whereSql = () => '(' + fields.map(f => `"${f}" = ${this.placeholderFn(f, idx++)}`).join(' AND ') + ')';
    for (const row of obj) {
      for (const f of fields) {
        values.push(row[f]);
      }
      where.push(whereSql());
    }
    const sql = `DELETE FROM "${table}" WHERE ${where.join(' OR ')}`;
    return [sql, values];
  }

  escapeWhere(variable) {
    return '"' + variable.split('.').join('"."') + '"';
  }

  escapeOrder(table, variable) {
    return `"${table}"."${variable}"`;
  }
}

module.exports = SqlDriver;
