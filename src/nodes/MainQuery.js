const RTDSError = require('../RTDSError');
const QueryNode = require('./QueryNode');

/**
 * A query that constitutes a member of main chain of the query tree.
 */
class MainQuery extends QueryNode {
  /**
   * Get fields targeted by the query.
   */
  getFields() {
    throw new RTDSError(`Not implemented getFields() in ${this.constructor.name}.`);
  }
}

module.exports = MainQuery;
