const PK = require('./PK');

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
  /**
   * Create formula.
   * @param {Object} rules
   */
  constructor(rules = {}, driver = null) {
    this.rules = {};
    Object.assign(this.rules, rules);
    this.reset();
  }

  reset() {
    this.items = {};
    this.pks = {};
    this.objects = {};
  }

  /**
   * Combine rows of data to object structures according to the formula.
   * @param {Object[]} data
   * @param {Driver} [driver] Needed only for formulas with post processing.
   */
  process(data, driver) {
    // console.dir(data, {depth: null});
    const map = this.fieldMapping(this.rules);
    // console.log(map);
    this.applyMapToList(map, data);
    const res = this.collectResults(map, data, driver);
    // console.dir(res, {depth: null});
    return res;
  }

  /**
   * Collect information how to map single row of data to actual data structure.
   * @param {Object} rule
   * @param {String} root
   * @param {String} parent
   * @param {String} method
   *
   * Return value is a list of objects
   * ```
   * {
   *   from: <array of field names in original row>
   *   to: <array of field names in targer structure>
   *   path: <slash seprated path inside the structure>
   *   field: <name of the field>
   *   parent: <parent path>
   *   method: <handling as 'root', 'assign' or 'push'>
   *   process: <post processing rules, if any>
   * }
   * ```
   */
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
        method,
        process: rule.process || null
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

  /**
   * A preparation step to pre-process original rows and collect PK and object information.
   * @param {Object[]} map
   * @param {Object[]} data
   */
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

  /**
   * Construct result data applying mapping to the original data.
   * @param {Object[]} map
   * @param {Object[]} data
   * @param {Driver} driver
   */
  collectResults(map, data, driver = null) {
    const res = [];
    map.forEach(m => {
      const { path, method } = m;
      this.pks[path] = new Set();
      this.objects[path] = {};
      const fn = this.getMethod(method, driver);
      data.forEach(item => {
        fn(res, m, item);
      });
    });
    return res;
  }

  /**
   * Construct a new object using mapping instruction.
   * @param {String[]} from
   * @param {String[]} to
   * @param {Object} item
   */
  getObject(from, to, item) {
    const obj = {};
    from.forEach((f, i) => (obj[to[i]] = item[from[i]]));
    return obj;
  }

  /**
   * Construct a function handling the data processing for the particular structure part.
   * @param {String} name
   * @param {Driver} driver
   */
  getMethod(name, driver = null) {
    const doProcessing = (process, obj) => {
      if (process) {
        Object.entries(process).forEach(([field, processName]) => (obj[field] = driver.postProcessItem(processName, obj[field])));
      }
    };
    switch (name) {
      case 'push':
        return (_, {from, to, path, pks, field, parent, process}, item) => {
          const obj = this.getObject(from, to, item);
          const pk = item.__pks__[path];
          if (!this.pks[path].has(pk)) {
            doProcessing(process, obj);
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
        return (_, {from, to, path, field, parent, process}, item) => {
          const pk = item.__pks__[path];
          const ppk = item.__pks__[parent];
          if (!this.pks[path].has(pk)) {
            this.pks[path].add(pk);
            const obj = this.getObject(from, to, item);
            doProcessing(process, obj);
            this.objects[path][pk] = obj;
            this.objects[parent][ppk][field] = obj;
          } else {
            this.objects[parent][ppk][field] = this.objects[path][pk];
          }
        };
      case 'root':
        return (res, {from, to, path, process}, item) => {
          const pk = item.__pks__[path];
          if (!this.pks[path].has(pk)) {
            this.pks[path].add(pk);
            const obj = this.getObject(from, to, item);
            doProcessing(process, obj);
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
