const QueryNode = require('./QueryNode');
const RTDSError = require('../RTDSError');

/**
 * A node for grouping other nodes.
 *
 * Parameters:
 * - `children` a list of sub-nodes
 */
class ContainerNode extends QueryNode {
  getName() {
    return null;
  }

  buildOrderSQL(driver) {
    return this.children.reduce((prev, cur) => prev.concat(cur.buildOrderSQL(driver)), []);
  }

  buildLimitSQL(driver) {
    const ret = this.children.map(c => c.buildLimitSQL(driver)).filter(s => s !== null);
    if (ret.length > 1) {
      throw new RTDSError('Too many limits declared.');
    }
    return ret.length ? ret[0] : null;
  }

  getPostFormula() {
    const ret = {};
    for (const c of this.children) {
      const f = c.getPostFormula();
      if (f.flat) {
        if (!ret.flat) {
          ret.flat = {};
        }
        Object.assign(ret.flat, f.flat);
      }
      if (f.members) {
        if (!ret.members) {
          ret.objects = {};
        }
        Object.assign(ret.objects, f.objects);
      }
    }
    return ret;
  }

  toJSON() {
    return {
      node: this.constructor.name,
      children: this.children.map(c => c.toJSON())
    };
  }
}
module.exports = ContainerNode;
