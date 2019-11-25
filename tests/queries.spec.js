const assert = require('assert');
const knex = require('knex'); // TODO: Drop knex once driver supports inserting.
const { Query, Driver } = require('../src');

// If set, show all parsed queries and results.
const DEBUG = false;

describe('RTDS query', () => {
  let db;
  let driver;

  /**
   * Create and initialize tables for testing.
   */
  before(async () => {
    const DATABASE_URL = process.env.DATABASE_URL || `sqlite:///${__dirname}/test.sqlite`;
    const uri = new URL(DATABASE_URL);
    switch (uri.protocol) {
      case 'sqlite:':
        db = knex({
          client: 'sqlite3',
          connection: {
            filename: uri.pathname
          },
          useNullAsDefault: true
        });
        await db.migrate.latest({directory: `${__dirname}/migrations`});
        break;
      default:
        throw new Error(`Testing ${DATABASE_URL} not yet supported.`);
    }

    await db('users').insert(require('./sample-data/users.json'));
    await db('todos').insert(require('./sample-data/todos.json'));
    await db('projects').insert(require('./sample-data/projects.json'));

    driver = Driver.create(DATABASE_URL);
  });

  /**
   * Rollback changes in database.
   */
  after(async () => {
    await db.migrate.rollback({directory: `${__dirname}/migrations`});
  });

  /**
   * Test executor function.
   */
  const test = async (query, result) => {
    const q = new Query(query);
    const res = await driver.getAll(q);
    if (DEBUG) {
      console.dir(q, {depth: null});
      console.log('=>');
      console.dir(res, {depth: null});
    }
    assert.deepStrictEqual(res, result, `Query ${JSON.stringify(query)} failed.`);
  };

  /**
   * Tests.
   */
  describe('Basic query', () => {
    it('can get named fields', async () => {
      await test({
        table: 'users',
        select: ['id', 'name', 'age']
      }, [
        { id: 1, name: 'Alice A', age: 21 },
        { id: 2, name: 'Bob B', age: 33 },
        { id: 3, name: 'Carl C', age: 44 }
      ]);
    });
    it('can get only some fields', async () => {
      await test({
        table: 'users',
        select: ['id', 'age']
      }, [
        { id: 1, age: 21 },
        { id: 2, age: 33 },
        { id: 3, age: 44 }
      ]);
    });
    it('can rename fields', async () => {
      await test({
        table: 'users',
        select: ['id', {age: 'years'}]
      }, [
        { id: 1, years: 21 },
        { id: 2, years: 33 },
        { id: 3, years: 44 }
      ]);
    });
  });

  describe('Cross join query', () => {
    it('can make simple cross join', async () => {
      await test([
        {
          table: 'users',
          select: ['age']
        },
        {
          table: 'projects',
          select: ['name']
        }
      ], [
        {
          age: 21,
          name: 'Busy Project'
        },
        {
          age: 21,
          name: 'Empty Project'
        },
        {
          age: 33,
          name: 'Busy Project'
        },
        {
          age: 33,
          name: 'Empty Project'
        },
        {
          age: 44,
          name: 'Busy Project'
        },
        {
          age: 44,
          name: 'Empty Project'
        }
      ]);
    });
  });

  xdescribe('Inner join query', () => {
    it('can make simple inner join', async () => {
      await test([
        {
          table: 'users',
          select: ['name']
        },
        {
          table: 'todos',
          select: ['title'],
          join: ['users.id', 'todos.creatorId']
        }
      ], [
      ]);
    });
  });
});
