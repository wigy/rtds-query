const assert = require('assert');
const { Query, Driver } = require('../src');
const { RTDSError } = require('../src');

describe('Catches invalid queries', () => {

  const driver = Driver.create('sql://');

  describe('Search queries', () => {
    it('constructs correctly queries', () => {
      const q = new Query({
        table: 'users',
        delete: ['id']
      });

      assert.throws(
        () => q.deleteSQL(driver, {foo: 22}),
        new RTDSError("A key 'foo' is not allowed as specifying the deletion.")
      );
    });
  });

  describe('Limits', () => {
    it('are denied if zero or negative', () => {
      assert.throws(
        () => Query.parse({
          table: 'users',
          select: ['id'],
          limit: 0
        }),
        new RTDSError('Invalid limit 0.')
      );
      assert.throws(
        () => Query.parse({
          table: 'users',
          select: ['id'],
          limit: -1
        }),
        new RTDSError('Invalid limit -1.')
      );
    });
  });
});
