const Driver = require('../Driver');

/**
 * Base class for standard SQL driver.
 */
class SqlDriver extends Driver {
  escapeSelect(table, variable, as = null) {
    let sql = `\`${table}\`.\`${variable}\``;
    if (as !== null) {
      sql += ` AS \`${as}\``;
    }
    return sql;
  }

  escapeJoin(table, variable = null) {
    return variable === null ? `\`${table}\`` : this.escapeSelect(table, variable);
  }

  escapeFrom(table, as = null) {
    return as ? `\`${table}\` AS \`${as}\`` : `\`${table}\``;
  }

  escapeInto(table) {
    return `\`${table}\``;
  }

  createSQL(table, fields, pks, obj) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    const singleSql = `(${fields.map(() => '?').join(', ')})`;
    const sql = `INSERT INTO \`${table}\` (${fields.map(f => '`' + f + '`').join(', ')}) VALUES ${obj.map(() => singleSql).join(', ')}`;
    const values = obj.map(o => fields.map(f => o[f])).reduce((prev, cur) => prev.concat(cur), []);
    return [sql, values];
  }

  updateSQL(table, fields, pks, obj) {
    fields = fields.filter(f => f in obj);
    const sql = `UPDATE \`${table}\` SET ${fields.map((f) => `\`${f}\` = ?`).join(', ')} WHERE ` + pks.map(pk => `\`${pk}\` = ?`).join(' AND ');
    const f = fields.map(f => obj[f]).concat(pks.map(pk => obj[pk]));
    return [sql, f];
  }

  deleteSQL(table, obj, pks) {
    if (!(obj instanceof Array)) {
      obj = [obj];
    }
    const values = [];
    const where = [];
    const whereSql = '(' + pks.map(pk => `\`${pk}\` = ?`).join(' AND ') + ')';
    for (const row of obj) {
      for (const pk of pks) {
        values.push(row[pk]);
      }
      where.push(whereSql);
    }
    const sql = `DELETE FROM \`${table}\` WHERE ${where.join(' AND ')}`;
    return [sql, values];
  }

  escapeWhere(variable) {
    return '`' + variable.split('.').join('`.`') + '`';
  }

  escapeOrder(table, variable) {
    return `\`${table}\`.\`${variable}\``;
  }
}

module.exports = SqlDriver;
