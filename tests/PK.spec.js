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

  it('can check primary key existence', () => {
    assert.strictEqual(PK.hasPK(null, {id: 1}), true);
    assert.strictEqual(PK.hasPK(null, {id: 0}), true);
    assert.strictEqual(PK.hasPK(null, {id: ''}), true);
    assert.strictEqual(PK.hasPK(null, {id: null}), true);
    assert.strictEqual(PK.hasPK(null, {idx: 1}), false);

    assert.strictEqual(PK.hasPK('foo', {foo: 1}), true);
    assert.strictEqual(PK.hasPK('foo', {foo: 0}), true);
    assert.strictEqual(PK.hasPK('foo', {foo: ''}), true);
    assert.strictEqual(PK.hasPK('foo', {foo: null}), true);
    assert.strictEqual(PK.hasPK('foo', {idx: 1}), false);

    assert.strictEqual(PK.hasPK(['foo', 'bar'], {foo: 1, bar: 0}), true);
    assert.strictEqual(PK.hasPK(['foo', 'bar'], {foo: 0, bar: ''}), true);
    assert.strictEqual(PK.hasPK(['foo', 'bar'], {foo: ''}), false);
    assert.strictEqual(PK.hasPK(['foo', 'bar'], {bar: null}), false);
    assert.strictEqual(PK.hasPK(['foo', 'bar'], {idx: 1}), false);
  });

  it('can recognize primary key', () => {
    assert.strictEqual(PK.isPK(null, 'id'), true);
    assert.strictEqual(PK.isPK(null, 'idx'), false);
    assert.strictEqual(PK.isPK('x', 'x'), true);
    assert.strictEqual(PK.isPK('x', 'idx'), false);
    assert.strictEqual(PK.isPK(['x', 'y'], 'x'), true);
    assert.strictEqual(PK.isPK(['x', 'y'], 'y'), true);
    assert.strictEqual(PK.isPK(['x', 'y'], 'z'), false);
  });

  it('provides unique strings for keys', () => {
    assert(PK.getPKasKey(null, {id: null}) !== PK.getPKasKey(null, {id: 0}));
    assert(PK.getPKasKey(null, {id: null}) !== PK.getPKasKey(null, {id: ''}));
    assert(PK.getPKasKey(null, {id: 0}) !== PK.getPKasKey(null, {id: ''}));

    assert(PK.getPKasKey(['a', 'b'], {a: 0, b: 0}) !== PK.getPKasKey(['a', 'b'], {a: 0, b: ''}));
    assert(PK.getPKasKey(['a', 'b'], {a: '', b: ''}) !== PK.getPKasKey(['a', 'b'], {a: 0, b: ''}));
    assert(PK.getPKasKey(['a', 'b'], {a: null, b: ''}) !== PK.getPKasKey(['a', 'b'], {a: 0, b: ''}));
    assert(PK.getPKasKey(['a', 'b'], {a: 1, b: 2}) !== PK.getPKasKey(['a', 'b'], {a: '1', b: '2'}));

    assert(PK.getPKasKey(['a', 'b'], {a: 1, b: 2}) === PK.getPKasKey(['a', 'b'], {b: 2, a: 1}));
    assert(PK.getPKasKey(['a', 'b'], {a: '', b: 0}) === PK.getPKasKey(['a', 'b'], {b: 0, a: ''}));
  });
});
