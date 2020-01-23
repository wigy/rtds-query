const RTDSError = require('./RTDSError');
const PK = require('./PK');

// Helper to do item level post-processing.
const processItem = (map, obj) => {
  // TODO: Move to the new handler.
  // TODO: Add test for processing.
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

// TODO: Delete these.
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
    const pk = PK.getPKasKey(formula.pk, ret);
    Object.entries(formula.arrays).map(([arrayName, arrayFormula]) => {
      if (!arrays[arrayName]) {
        arrays[arrayName] = {};
      }
      if (!arrays[arrayName][pk]) {
        arrays[arrayName][pk] = []; // Here we collect items.
        arrays[arrayName][`__PKS[${pk}]__`] = new Set(); // Here we collect PKs of the items added.
        ret[`__array[${arrayName}]__`] = pk;
      } else {
        ret = undefined;
      }
      const item = entry(line, arrayFormula, arrays);
      if (PK.hasNonNullPK(arrayFormula.pk, item)) {
        const itemPK = PK.getPKasKey(arrayFormula.pk, item);
        // Collect keys so that in case of multiple left joins we don't add the same twice.
        if (!arrays[arrayName][`__PKS[${pk}]__`].has(itemPK)) {
          arrays[arrayName][pk].push(item);
          arrays[arrayName][`__PKS[${pk}]__`].add(itemPK);
        }
      }
    });
  }
  if (ret !== undefined && formula.process) {
    processItem(formula.process, ret);
  }
  return ret;
};

// Helper to process entire formula.
const OLDprocess = (data, rules) => {
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
    this.reset();
    // console.dir(rules, {depth: null});
  }

  reset() {
    this.items = {};
    this.pks = {};
    this.objects = {};
  }

  /**
   * Combine rows of data to object structures according to the formula.
   */
  process(data) {
    // console.dir(data, {depth: null});
    const map = this.fieldMapping(this.rules);
    // console.log(map);
    this.applyMapToList(map, data);
    const res = this.collectResults(map, data);
    // console.dir(res, {depth: null});
    return res;
  }

  fieldMapping(rule, root = '', parent = null, method = 'root') {
    let ret = [];
    const pk = PK.asArray(rule.pk);
    if (rule.flat) {
      let field = root && root.split('/');
      if (field) {
        field = field[field.length - 1];
      }
      ret.push({
        from: Object.values(rule.flat),
        to: Object.keys(rule.flat),
        path: `${root}/`,
        pks: pk,
        field,
        parent,
        method
      });
    }
    Object.entries(rule.objects || {}).forEach(([memberName, subRule]) => {
      ret = ret.concat(this.fieldMapping(subRule, `${root}/${memberName}`, `${root}/`, 'assign'));
    });
    Object.entries(rule.arrays || {}).forEach(([memberName, subRule]) => {
      ret = ret.concat(this.fieldMapping(subRule, `${root}/${memberName}`, `${root}/`, 'push'));
    });
    return ret;
  }

  applyMapToList(map, data) {
    if (data.length && '__pks__' in data[0]) {
      throw new Error('A member __pks__ is not allowed in data.');
    }
    data.forEach(item => {
      item.__pks__ = {};
    });
    map.forEach(m => {
      const { path } = m;
      this.items[path] = {};
      data.forEach(item => {
        this.applyMapToItem(m, item);
      });
    });
  }

  applyMapToItem({from, to, path, pks}, item) {
    const res = {};
    for (let i = 0; i < from.length; i++) {
      res[to[i]] = item[from[i]];
    }
    const key = PK.getPKasKey(pks, res);
    this.items[path][key] = res;
    item.__pks__[path] = key;
  }

  collectResults(map, data) {
    const res = [];
    map.forEach(m => {
      const { path, method } = m;
      this.pks[path] = new Set();
      this.objects[path] = {};
      const fn = this.getMethod(method);
      data.forEach(item => {
        fn(res, m, item);
      });
    });
    return res;
  }

  getObject(from, to, item) {
    const obj = {};
    from.forEach((f, i) => (obj[to[i]] = item[from[i]]));
    return obj;
  }

  getMethod(name) {
    switch (name) {
      case 'push':
        return (_, {from, to, path, pks, field, parent, method}, item) => {
          const obj = this.getObject(from, to, item);
          const pk = item.__pks__[path];
          if (!this.pks[path].has(pk)) {
            this.pks[path].add(pk);
            const ppk = item.__pks__[parent];
            if (PK.hasNonNullPK(pks, obj)) {
              this.objects[path][pk] = obj;
              if (!this.objects[parent][ppk][field]) {
                this.objects[parent][ppk][field] = [];
              }
              this.objects[parent][ppk][field].push(obj);
            } else {
              this.objects[parent][ppk][field] = [];
            }
          }
        };
      case 'assign':
        return (_, {from, to, path, field, parent}, item) => {
          const pk = item.__pks__[path];
          const ppk = item.__pks__[parent];
          if (!this.pks[path].has(pk)) {
            this.pks[path].add(pk);
            const obj = this.getObject(from, to, item);
            this.objects[path][pk] = obj;
            this.objects[parent][ppk][field] = obj;
          } else {
            this.objects[parent][ppk][field] = this.objects[path][pk];
          }
        };
      case 'root':
        return (res, {from, to, path}, item) => {
          const pk = item.__pks__[path];
          if (!this.pks[path].has(pk)) {
            this.pks[path].add(pk);
            const obj = this.getObject(from, to, item);
            res.push(obj);
            this.objects[path][pk] = obj;
          }
        };
      default:
        throw new Error(`Cannot recognize data collection method '${name}'.`);
    }
  }
}

module.exports = Formula;
