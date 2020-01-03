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

    it('are denied if more than one defined', () => {
      assert.throws(
        () => Query.parse([
          {
            table: 'users',
            order: ['-age'],
            select: ['age'],
            limit: 2
          },
          {
            table: 'projects',
            order: ['name'],
            select: ['name'],
            limit: 3
          }
        ]).buildLimitSQL(driver),
        new RTDSError('Too many limits declared.')
      );
    });

  });
});
