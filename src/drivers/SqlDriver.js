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

  createOneSQL(table, fields, _pk, obj) {
    const sql = `INSERT INTO \`${table}\` (${fields.map(f => '`' + f + '`').join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
    return [sql, fields.map(f => obj[f])];
  }

  escapeWhere(variable) {
    return '`' + variable.split('.').join('`.`') + '`';
  }
}

module.exports = SqlDriver;
