const QueryNode = require('./QueryNode');

/**
 * A node for grouping other nodes.
 */
class ContainerNode extends QueryNode {
  getName() {
    return null;
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
          ret.members = [];
        }
        ret.members = ret.members.concat(f.members);
      }
    }
    return ret;
  }
}

module.exports = ContainerNode;
