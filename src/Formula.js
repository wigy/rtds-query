// Helper to collect list of entries from line of data based on flat member list.
const pick = (flat, line) => Object.entries(flat).reduce((prev, cur) => ({...prev, [cur[0]]: line[cur[1]]}), {});
// Helper to construct entry for one line of data.
const entry = (line, formula) => {
  const ret = formula.flat ? pick(formula.flat, line) : {};
  if (formula.members) {
    formula.members.map(member => {
      const value = {};
      Object.entries(member).map(([k, v]) => {
        value[k] = entry(line, v);
      });
      Object.assign(ret, value);
    });
  }
  return ret;
};

// TODO: Members should actually be changed to object and renamed as 'object'.

/**
 * Collection of processing formulas.
 */
class Formula {
  constructor(rules = {}) {
    Object.assign(this, rules);
  }

  /**
   * Combine rows of data to object structures according to the formula.
   * (See test files.)
   */
  process(data) {
    // TODO: Can pass through if no members.
    return data.map(line => entry(line, this));
  }
}

module.exports = Formula;
