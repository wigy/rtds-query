const RTDSError = require('./RTDSError');
const PK = require('./PK');

// Helper to do item level post-processing.
const processItem = (map, obj) => {
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

// Helper to construct entry for one line of data and update related arrays.
const entry = (line, formula, arrays) => {
  let ret = formula.flat ? pick(formula.flat, line) : {};
  if (formula.objects) {
    const value = {};
    Object.entries(formula.objects).map(([k, v]) => {
      value[k] = entry(line, v, arrays);
    });
    Object.assign(ret, value);
  }
  if (formula.arrays) {
    const pk = PK.getPKasKey(line.pk, ret);
    Object.entries(formula.arrays).map(([k, v]) => {
      if (!arrays[k]) {
        arrays[k] = {};
      }
      if (!arrays[k][pk]) {
        arrays[k][pk] = [];
        ret[`__array[${k}]__`] = pk;
      } else {
        ret = undefined;
      }
      const item = entry(line, v, arrays); // TODO: Or call process() instead?
      if (PK.hasNonNullPK(v.pk, item)) {
        arrays[k][pk].push(item);
      }
    });
  }
  if (ret !== undefined && formula.process) {
    processItem(formula.process, ret);
  }
  return ret;
};

// Helper to process entire formula.
const process = (data, rules) => {
  const arrays = {};
  const ret = [];
  // Process items and collect arrays.
  data.forEach(line => {
    const item = entry(line, rules, arrays);
    if (item !== undefined) {
      ret.push(item);
    }
  });
  // Attach arrays into their parents.
  Object.entries(arrays).forEach(([arrayName, collection]) => {
    for (let i = 0; i < ret.length; i++) {
      ret[i][arrayName] = collection[ret[i][`__array[${arrayName}]__`]];
      delete ret[i][`__array[${arrayName}]__`];
    }
  });
  return ret;
};

/**
 * A processing formula.
 *
 * A formula can have the following fields:
 * - `pk` - A primary key definition (defaults to single field `id`)
 * - `flat` - An object mapping from field names to SQL names.
 * - `objects` - An object mapping sub-object names to sub-formulas constructing member objects.
 * - `arrays` - An object mapping sub-object names to sub-formulas constructing member arrays.
 * - `process` - An object mapping post-processing formulas to completed entities.
 *
 *  (See test files for examples.)
 */
class Formula {
  constructor(rules = {}) {
    this.rules = {};
    Object.assign(this.rules, rules);
  }

  /**
   * Combine rows of data to object structures according to the formula.
   */
  process(data) {
    return process(data, this.rules);
  }
}

module.exports = Formula;
