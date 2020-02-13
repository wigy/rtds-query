const SqlDriver = require('./SqlDriver');

/**
 * Implementation for MySQL.
 */
class MysqlDriver extends SqlDriver {
  constructor(url) {
    super(url, () => '?', '`');
    let mysql;
    try {
      mysql = require('mysql');
    } catch (err) {
      throw new Error("Driver needs a package 'mysql'. Please install it.");
    }
    this.connection = mysql.createConnection({
      host: url.hostname,
      port: url.port,
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', '')
    });
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return;
    }
    await this.connection.connect();
    this.connected = true;
  }

  async runQuery(sql, args = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args,
        function(err, res, fields) {
          if (err) {
            reject(err);
          } else {
            if (res.length === undefined) {
              resolve(true);
            } else {
              if (res.length === 0) {
                resolve([]);
              }
              const keys = Object.keys(res[0]);
              const ret = [];
              for (let i = 0; i < res.length; i++) {
                ret.push(keys.reduce((prev, cur) => ({...prev, [cur]: res[i][cur]}), {}));
              }
              resolve(ret);
            }
          }
        });
    });
  }

  async getTables() {
    const data = await this.runQuery('SHOW TABLES');
    return data.map(line => Object.values(line)[0]);
  }

  async getColumns(table) {
    const data = await this.runQuery('DESCRIBE ??', [table]);
    return data.map(line => line.Field);
  }

  async runSelectQuery(sql) {
    return this.runQuery(sql);
  }

  async runInsertQuery(sql, values, pks) {
    return !!this.runQuery(sql, values);
  }

  async runUpdateQuery(sqls, valueList, pks) {
    const runOne = async (sql, values) => {
      const table = /^UPDATE `([^`]*)`/.exec(sql)[1];
      await this.runQuery(sql, values);
      const pkSql = pks.map(pk => `\`${pk}\`=?`);
      const res = await this.runQuery(`SELECT * FROM ${table} WHERE ${pkSql.join(' AND ')}`, values.slice(values.length - pks.length));
      return res[0];
    };
    return Promise.all(sqls.map((sql, idx) => runOne(sql, valueList[idx])));
  }

  async runDeleteQuery(sql, values, pk) {
    return this.runQuery(sql, values);
  }
}

module.exports = MysqlDriver;
