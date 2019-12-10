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
      chidlren: this.children.map(c => c.toJSON())
    };
  }
}
module.exports = ContainerNode;
