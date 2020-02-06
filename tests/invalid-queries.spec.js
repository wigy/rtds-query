const assert = require('assert');
const { Query, Driver } = require('../src');
const { RTDSError } = require('../src');

describe('Catches invalid queries', () => {

  const driver = Driver.create('sql://');

  before(async () => {
    await driver.initialize({
      users: new Set(['id', 'name', 'age']),
      projects: new Set(['id', 'creatorId', 'name']),
      comments: new Set(['id', 'userId', 'todoId', 'comment']),
      todos: new Set(['id', 'title', 'creatorId', 'projectId', 'ownerId'])
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
            select: ['id', 'age'],
            limit: 2
          },
          {
            table: 'projects',
            order: ['name'],
            select: ['name', 'userId'],
            join: ['users.id', 'projects.userId'],
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

  describe('Joins', () => {
    it('refuses cross-joins', async () => {
      assert.throws(
        () => new Query([
          {
            table: 'users',
            select: [{id: 'uid'}, 'age']
          },
          {
            table: 'projects',
            select: [{id: 'pid'}, 'name']
          }
        ]),
        new RTDSError('Cross joins not supported.')
      );
    });
  });

  describe('Column and table checking', () => {
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

    it('detects bad columns in creation', async () => {
      const q = new Query({
        table: 'users',
        insert: ['id', 'name']
      });
      assert.throws(
        () => q.createSQL(driver, {x: 9}),
        new RTDSError("A field 'x' is not defined in insertion query for 'users'.")
      );
    });

    it('detects bad columns in update', async () => {
      const q = new Query({
        table: 'users',
        update: ['id', 'name']
      });
      assert.throws(
        () => q.updateSQL(driver, {x: 9}),
        new RTDSError("A field 'x' is not defined in update query for 'users'.")
      );
    });

    it('detects bad columns in delete', async () => {
      const q = new Query({
        table: 'users',
        delete: ['id']
      });
      assert.throws(
        () => q.deleteSQL(driver, {x: 9}),
        new RTDSError("A key 'x' is not allowed as specifying the deletion.")
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

    it('detects bad table in delete', async () => {
      const q = new Query({
        table: 'strange',
        delete: ['id']
      });
      assert.throws(
        () => q.deleteSQL(driver, {id: 1}),
        new RTDSError("No such table 'strange'.")
      );
    });

    it('detects bad table in creation', async () => {
      const q = new Query({
        table: 'strange',
        insert: ['id', 'name']
      });
      assert.throws(
        () => q.createSQL(driver, {id: 1, name: 'X'}),
        new RTDSError("No such table 'strange'.")
      );
    });

    it('detects bad table in update', async () => {
      const q = new Query({
        table: 'strange',
        update: ['id', 'name']
      });
      assert.throws(
        () => q.updateSQL(driver, {id: 1, name: 'X'}),
        new RTDSError("No such table 'strange'.")
      );
    });

    it('detects duplicate fields', async () => {
      assert.throws(() => new Query([
        {
          table: 'users',
          select: ['id', 'name']
        },
        {
          table: 'todos',
          select: ['id', 'title', 'creatorId'],
          join: ['users.id', 'todos.creatorId']
        }
      ]).selectSQL(driver),
      (err) => {
        assert(err instanceof RTDSError);
        assert(/Error: Contradicting aliases for "id": "users\d+"\."id" and "todos\d+"\."id"\./.test(err));
        return true;
      });
    });
  });
});
