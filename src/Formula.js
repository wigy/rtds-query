const RTDSError = require('./RTDSError');

// Helper to do processing.
const process = (map, obj) => {
  Object.keys(map).forEach(k => {
    switch (map[k]) {
      case 'json':
        if (typeof obj[k] === 'string') {
          obj[k] = JSON.parse(obj[k]);
        }
        break;
      default:
        throw new RTDSError(`No such processing as '${map[k]}'.`);
    }
  });

};

// Helper to collect list of entries from line of data based on flat member list.
const pick = (flat, line) => Object.entries(flat).reduce((prev, cur) => ({...prev, [cur[0]]: line[cur[1]]}), {});

// Helper to construct entry for one line of data.
const entry = (line, formula) => {
  const ret = formula.flat ? pick(formula.flat, line) : {};
  if (formula.objects) {
    const value = {};
    Object.entries(formula.objects).map(([k, v]) => {
      value[k] = entry(line, v);
    });
    Object.assign(ret, value);
  }
  if (formula.process) {
    process(formula.process, ret);
  }
  return ret;
};

/**
 * A processing formula.
 *
 * A formula can have the following fields:
 * - `flat` - An object mapping from field names to SQL names.
 * - `objects` - An object mapping sub-object names to sub-formulas.
 * - `process` - An object mapping post-processing formulas to completed entities.
 */
class Formula {
  constructor(rules = {}) {
    this.rules = {};
    Object.assign(this.rules, rules);
  }

  /**
   * Combine rows of data to object structures according to the formula.
   * (See test files for samples.)
   */
  process(data) {
    return data.map(line => entry(line, this.rules));
  }
}

module.exports = Formula;
