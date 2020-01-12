const assert = require('assert');
const { Query, Driver } = require('../src');
const { RTDSError } = require('../src');

describe('Catches invalid queries', () => {

  const driver = Driver.create('sql://');

  before(async () => {
    await driver.initialize({
      users: new Set(['id', 'name'])
    });
  });

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

  describe('Validity', () => {
    it('detects illegal insertion', async () => {
      const q = new Query({
        table: 'users',
        insert: ['name']
      });

      assert.throws(
        () => q.createSQL(driver, {address: 'No way'}),
        new RTDSError("A field 'address' is not defined in insertion query for 'users'.")
      );
    });

    it('detects illegal update', async () => {
      const q = new Query({
        table: 'users',
        update: ['name']
      });

      assert.throws(
        () => q.updateSQL(driver, {id: 99, address: 'No way'}),
        new RTDSError("A field 'address' is not defined in update query for 'users'.")
      );
    });
  });

  describe('Column checking', () => {
    it('detects bad columns in select', async () => {
      const q = new Query({
        table: 'users',
        select: ['foo']
      });
      assert.throws(
        () => q.selectSQL(driver),
        new RTDSError("A table 'users' has no column 'foo'.")
      );
    });

    it('detects bad table in select', async () => {
      const q = new Query({
        table: 'strange',
        select: ['id']
      });
      assert.throws(
        () => q.selectSQL(driver),
        new RTDSError("No such table 'strange'.")
      );
    });

    // TODO: Check delete, update and create as well.
  });
});
