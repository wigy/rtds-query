const assert = require('assert');
const { Query, Driver } = require('../src');
const { RTDSError } = require('../src');

describe('Catches invalid queries', () => {

  const driver = Driver.create('sql://');

  describe.only('Search queries', () => {
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
});
