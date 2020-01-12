
/**
 * Get primary key value from the object.
 *
 * @param {undefined|null|any|any[]} pk
 */
const getPK = (pk, obj) => {
  if (pk === undefined || pk === null) {
    return obj.id;
  }
  if (typeof pk === 'string') {
    return obj[pk];
  }
  return pk.map(k => obj[k]);
};

/**
 * Compare two primary keys.
 *
 * @param {undefined|null|any|any[]} pk
 */
const comparePK = (pk, obj1, obj2) => {
  if (pk === undefined || pk === null) {
    return obj1.id === obj2.id ? 0 : (obj1.id < obj2.id ? -1 : 1);
  }
  if (typeof pk === 'string') {
    return obj1[pk] === obj2[pk] ? 0 : (obj1[pk] < obj2[pk] ? -1 : 1);
  }
  for (const k of pk) {
    if (obj1[k] !== obj2[k]) {
      return obj1[k] < obj2[k] ? -1 : 1;
    }
  }
  return 0;
};

/**
 * Construct sorting function for the given PK.
 * @param {undefined|null|any|any[]} pk
 */
const sorterPK = (pk) => {
  return (a, b) => comparePK(pk, a, b);
};

module.exports = {
  comparePK,
  getPK,
  sorterPK
};
