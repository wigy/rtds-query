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
  return ret;
};

/**
 * A processing formula.
 *
 * A formula can have two fields:
 * - `flat` - An object mapping from field names to SQL names.
 * - `objects` - An object mapping sub-object names to sub-formulas.
 */
class Formula {
  constructor(rules = {}) {
    Object.assign(this, rules);
  }

  /**
   * Combine rows of data to object structures according to the formula.
   * (See test files for samples.)
   */
  process(data) {
    if (!this.objects) {
      return data;
    }
    return data.map(line => entry(line, this));
  }
}

module.exports = Formula;
