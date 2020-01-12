const assert = require('assert');
const { PK } = require('../src');

describe('PK', () => {
  it('can retrieve value', () => {
    assert.deepStrictEqual(PK.getPK(undefined, {id: 2}), 2);
    assert.deepStrictEqual(PK.getPK(null, {id: 2}), 2);
    assert.deepStrictEqual(PK.getPK('k', {id: 2, k: 3}), 3);
    assert.deepStrictEqual(PK.getPK(['k', 'm'], {id: 2, k: 3, l: 4, m: 5}), [3, 5]);
  });

  it('can compare values', () => {
    const objects = [
      {id: 5, k: 5, m: 'A'},
      {id: 6, k: 2, m: 'C'},
      {id: 1, k: 2, m: 'B'},
      {id: -4, k: 4, m: 'D'}
    ];
    assert.deepStrictEqual(objects.sort(PK.sorterPK(undefined)), [
      {id: -4, k: 4, m: 'D'},
      {id: 1, k: 2, m: 'B'},
      {id: 5, k: 5, m: 'A'},
      {id: 6, k: 2, m: 'C'}
    ]);
    assert.deepStrictEqual(objects.sort(PK.sorterPK(null)), [
      {id: -4, k: 4, m: 'D'},
      {id: 1, k: 2, m: 'B'},
      {id: 5, k: 5, m: 'A'},
      {id: 6, k: 2, m: 'C'}
    ]);
    assert.deepStrictEqual(objects.sort(PK.sorterPK('m')), [
      {id: 5, k: 5, m: 'A'},
      {id: 1, k: 2, m: 'B'},
      {id: 6, k: 2, m: 'C'},
      {id: -4, k: 4, m: 'D'}
    ]);
    assert.deepStrictEqual(objects.sort(PK.sorterPK('k', 'm')), [
      {id: 1, k: 2, m: 'B'},
      {id: 6, k: 2, m: 'C'},
      {id: -4, k: 4, m: 'D'},
      {id: 5, k: 5, m: 'A'}
    ]);
  });
});
