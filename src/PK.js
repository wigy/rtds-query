const RTDSError = require('./RTDSError');

/**
 * Convert PK definition to an array of field names.
 * @param {undefined|null|String|String[]} pk
 */
const asArray = (pk) => {
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
 * @param {Object}
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
 * Get primary key value from the object and convert it to unique string.
 * @param {undefined|null|String|String[]} pk
 * @param {Object}
 */
const getPKasKey = (pk, obj) => {
  if (pk === undefined || pk === null) {
    if (obj.id === undefined) {
      throw new Error(`Unable to get primary key 'id' for object ${JSON.stringify(obj)}.`);
    }
    return JSON.stringify(obj.id);
  }
  if (typeof pk === 'string') {
    if (obj[pk] === undefined) {
      throw new Error(`Unable to get primary key '${pk}' for object ${JSON.stringify(obj)}.`);
    }
    return JSON.stringify(obj[pk]);
  }
  return pk.map(k => {
    if (obj[k] === undefined) {
      throw new Error(`Unable to get primary key part '${k}' for object ${JSON.stringify(obj)}.`);
    }
    return JSON.stringify(obj[k]);
  }).join('\0');
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
  return asArray(pk).every(k => k in obj);
};

/**
 * Check if the object is equipped with primary key fields and they are not null.
 * @param {undefined|null|String|String[]} pk
 * @param {Object} obj
 */
const hasNonNullPK = (pk, obj) => {
  return asArray(pk).every(k => (k in obj) && obj[k] !== null);
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
  asArray,
  comparePK,
  getPK,
  getPKasKey,
  hasPK,
  hasNonNullPK,
  isPK,
  sorterPK
};
