const RTDSError = require('./RTDSError');

/**
 * Convert PK definition to an array of field names.
 * @param {undefined|null|String|String[]} pk
 */
const PKs = (pk) => {
  if (pk === undefined || pk === null) {
    return ['id'];
  }
  if (typeof pk === 'string') {
    return [pk];
  }
  if (pk instanceof Array) {
    return pk;
  }
  throw new RTDSError(`Ǹot a primary key definition: ${JSON.stringify(pk)}.`);
};

/**
 * Get primary key value from the object.
 *
 * @param {undefined|null|String|String[]} pk
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
 * @param {undefined|null|String|String[]} pk
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
 *
 * @param {undefined|null|String|String[]} pk
 */
const sorterPK = (pk) => {
  return (a, b) => comparePK(pk, a, b);
};

/**
 * Check if the object is equipped with primary key fields.
 * @param {undefined|null|String|String[]} pk
 * @param {Object} obj
 */
const hasPK = (pk, obj) => {
  return PKs(pk).every(k => k in obj);
};

/**
 * Check of the field name is a primary key.
 * @param {undefined|null|String|String[]} pk
 * @param {Object} key
 */
const isPK = (pk, key) => {
  if (pk === undefined || pk === null) {
    return key === 'id';
  }
  if (typeof pk === 'string') {
    return pk === key;
  }
  if (pk instanceof Array) {
    return pk.includes(key);
  }
  throw new RTDSError(`Ǹot a primary key definition: ${JSON.stringify(pk)}.`);
};

module.exports = {
  comparePK,
  getPK,
  hasPK,
  isPK,
  sorterPK
};
