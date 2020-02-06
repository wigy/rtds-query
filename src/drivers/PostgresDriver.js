const { Client } = require('pg');
const SqlDriver = require('./SqlDriver');

/**
 * Implementation for Postgres.
 */
class PostgresDriver extends SqlDriver {
  constructor(url) {
    super(url, (_, index) => `$${index + 1}`);
    this.client = new Client({
      connectionString: url.href
    });
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return;
    }
    await this.client.connect();
    this.connected = true;
  }

  async runQuery(sql, args = []) {
    await this.connect();
    const res = await this.client.query(sql, args);
    return res.rows;
  }

  async getTables() {
    const res = await this.runQuery("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
    return res.map(table => table.tablename);
  }

  async getColumns(table) {
    const res = await this.runQuery('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [table]);
    return res.map(column => column.column_name);
  }

  async runSelectQuery(sql) {
    return this.runQuery(sql);
  }

  async runInsertQuery(sql, values, pks) {
    return !!this.runQuery(sql, values);
  }

  async runUpdateQuery(sqls, valueList, pks) {
    const runOne = async (sql, values) => {
      const res = await this.runQuery(sql + ' RETURNING *', values);
      return res[0];
    };
    return Promise.all(sqls.map((sql, idx) => runOne(sql, valueList[idx])));
  }

  async runDeleteQuery(sql, values, pk) {
    return this.runQuery(sql, values);
  }
}

module.exports = PostgresDriver;
