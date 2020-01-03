const RTDSError = require('../RTDSError');
const QueryNode = require('./QueryNode');
const OrderField = require('./OrderField');

/**
 * A limit for query results.
 *
 * Parameters:
 * - `order` An array of order fields.
 */
class Order extends QueryNode {
  constructor(q) {
    super({ order: q.order });
    this.order.forEach(o => this.addChild(o));
  }

  getDumpName() {
    return 'order';
  }

  buildOrderSQL(driver) {
    return this.order.map(o => o.buildOrderSQL(driver));
  }

  /**
   * Convert query descriptor to Order instance.
   * @param {String|String[]} q
   * @param {String} table
   */
  static parse(q, table = null) {
    if (typeof q === 'string') {
      q = q.split(',').map(s => s.trim());
    }
    if (q instanceof Array) {
      q = q.map(s => OrderField.parse(s, table));
      return new Order({ order: q });
    }
    throw new RTDSError(`Unable to parse an order ${JSON.stringify(q)}`);
  }
}

module.exports = Order;
