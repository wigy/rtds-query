const assert = require('assert');
const knex = require('knex'); // TODO: Drop knex once driver supports inserting.
const { Query, Driver } = require('../src');

// If set, show all parsed queries and results.
const DEBUG = false;
// If set, throw assertions.
const ASSERT = true;

describe('Queries', () => {
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
    await db('comments').insert(require('./sample-data/comments.json'));

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
  const test = async (query, result, cond = null, pks = null) => {
    const q = new Query(query);
    if (DEBUG) {
      console.log();
      q.dump();
      console.log();
      console.log(q.getAllSQL(driver, cond) + ';');
    }
    const res = await q.getAll(driver, cond);
    if (DEBUG) {
      console.log('=>');
      console.dir(res, {depth: null});
    }
    if (ASSERT) {
      assert.deepStrictEqual(res, result, `Query ${JSON.stringify(query)} converted to ${q.getAllSQL(driver, cond)} failed.`);
    }
    if (pks) {
      const qpk = q.selectPKs();
      const resPk = await qpk.getAllPKs(driver, cond);
      if (DEBUG) {
        console.log(qpk.getAllSQL(driver, cond) + ';');
        console.log('=> (PKS)');
        console.dir(resPk, {depth: null});
      }
      if (ASSERT) {
        assert.deepStrictEqual(resPk, pks, `Query ${JSON.stringify(query)} did not produce correct PKs.`);
      }
    }
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
      ],
      null,
      { users: new Set([1, 2, 3]) });
    });

    it('can get only some fields', async () => {
      await test({
        table: 'users',
        select: ['id', 'age']
      }, [
        { id: 1, age: 21 },
        { id: 2, age: 33 },
        { id: 3, age: 44 }
      ],
      null,
      { users: new Set([1, 2, 3]) });
    });

    it('can rename fields', async () => {
      await test({
        table: 'users',
        select: ['id', {age: 'years'}]
      }, [
        { id: 1, years: 21 },
        { id: 2, years: 33 },
        { id: 3, years: 44 }
      ],
      null,
      { users: new Set([1, 2, 3]) });
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
      ],
      null,
      { users: new Set([1, 2, 3]), projects: new Set([1, 2])});
    });
  });

  describe('Inner join query', () => {
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
        {
          name: 'Alice A',
          title: 'Find something'
        },
        {
          name: 'Alice A',
          title: 'Cook something'
        },
        {
          name: 'Bob B',
          title: 'Run unit-test'
        },
        {
          name: 'Bob B',
          title: 'Write unit-test'
        }
      ],
      null,
      { users: new Set([1, 2]), todos: new Set([1, 2, 3, 4]) });
    });

    it('can add members with inner join', async () => {
      await test([
        {
          table: 'todos',
          select: 'title',
          members: [
            {
              table: 'users',
              select: { name: 'creator'},
              join: ['users.id', 'todos.creatorId']
            }
          ]
        }
      ], [
        {
          title: 'Find something',
          users: {
            creator: 'Alice A'
          }
        },
        {
          title: 'Cook something',
          users: {
            creator: 'Alice A'
          }
        },
        {
          title: 'Run unit-test',
          users: {
            creator: 'Bob B'
          }
        },
        {
          title: 'Write unit-test',
          users: {
            creator: 'Bob B'
          }
        }
      ],
      null,
      { users: new Set([1, 2]), todos: new Set([1, 2, 3, 4]) });
    });

    it('can rename members when using inner join', async () => {
      await test([
        {
          table: 'todos',
          select: 'title',
          members: [
            {
              table: 'users',
              as: 'creator',
              select: 'name',
              join: ['creator.id', 'todos.creatorId']
            }
          ]
        }
      ], [
        {
          title: 'Find something',
          creator: {
            name: 'Alice A'
          }
        },
        {
          title: 'Cook something',
          creator: {
            name: 'Alice A'
          }
        },
        {
          title: 'Run unit-test',
          creator: {
            name: 'Bob B'
          }
        },
        {
          title: 'Write unit-test',
          creator: {
            name: 'Bob B'
          }
        }
      ],
      null,
      { users: new Set([1, 2]), todos: new Set([1, 2, 3, 4]) });
    });
  });

  describe('Left join query', () => {
    it('can make simple left join', async () => {
      await test([
        {
          table: 'todos',
          select: ['title']
        },
        {
          table: 'users',
          select: [{name: 'owner'}],
          leftJoin: ['users.id', 'todos.ownerId']
        }
      ], [
        {
          owner: null,
          title: 'Find something'
        },
        {
          owner: 'Carl C',
          title: 'Cook something'
        },
        {
          owner: 'Bob B',
          title: 'Run unit-test'
        },
        {
          owner: null,
          title: 'Write unit-test'
        }
      ],
      null,
      { todos: new Set([1, 2, 3, 4]), users: new Set([null, 3, 2]) });
    });
  });

  describe('Mixed joins query', () => {
    it('can combine left join and inner join', async () => {
      await test([
        {
          table: 'todos',
          select: ['title'],
          members: [
            {
              table: 'users',
              as: 'owner',
              select: 'name',
              leftJoin: ['owner.id', 'todos.ownerId']
            },
            {
              table: 'users',
              as: 'creator',
              select: 'name',
              join: ['creator.id', 'todos.creatorId']
            }
          ]
        }
      ], [
        {
          title: 'Find something',
          creator: {
            name: 'Alice A'
          },
          owner: {
            name: null
          }
        },
        {
          title: 'Cook something',
          creator: {
            name: 'Alice A'
          },
          owner: {
            name: 'Carl C'
          }
        },
        {
          title: 'Run unit-test',
          creator: {
            name: 'Bob B'
          },
          owner: {
            name: 'Bob B'
          }
        },
        {
          title: 'Write unit-test',
          creator: {
            name: 'Bob B'
          },
          owner: {
            name: null
          }
        }
      ],
      null,
      { todos: new Set([1, 2, 3, 4]), users: new Set([null, 1, 3, 2]) });
    });

    it('can chain inner joins', async () => {
      await test([
        {
          table: 'todos',
          select: ['title'],
          members: [
            {
              table: 'projects',
              as: 'project',
              select: 'name',
              join: ['project.id', 'todos.projectId'],
              members: [
                {
                  table: 'users',
                  as: 'creator',
                  select: 'name',
                  join: ['creator.id', 'project.creatorId']
                }
              ]
            }
          ]
        }
      ], [
        {
          title: 'Find something',
          project: {
            name: 'Busy Project',
            creator: {
              name: 'Alice A'
            }
          }
        },
        {
          title: 'Cook something',
          project: {
            name: 'Busy Project',
            creator: {
              name: 'Alice A'
            }
          }
        },
        {
          title: 'Run unit-test',
          project: {
            name: 'Busy Project',
            creator: {
              name: 'Alice A'
            }
          }
        },
        {
          title: 'Write unit-test',
          project: {
            name: 'Busy Project',
            creator: {
              name: 'Alice A'
            }
          }
        }
      ],
      null,
      { todos: new Set([1, 2, 3, 4]), projects: new Set([1]), users: new Set([1]) });
    });

    it('can chain into the same root twice with the same alias', async () => {
      await test({
        table: 'todos',
        select: ['title'],
        members: [
          {
            table: 'projects',
            as: 'project',
            select: 'name',
            join: ['project.id', 'todos.projectId'],
            members: [
              {
                table: 'users',
                as: 'creator',
                select: 'name',
                join: ['creator.id', 'project.creatorId']
              }
            ]
          },
          {
            table: 'users',
            as: 'creator',
            select: 'name',
            join: ['creator.id', 'todos.creatorId']
          }
        ]
      },
      [
        {
          title: 'Find something',
          project: { name: 'Busy Project', creator: { name: 'Alice A' } },
          creator: { name: 'Alice A' }
        },
        {
          title: 'Cook something',
          project: { name: 'Busy Project', creator: { name: 'Alice A' } },
          creator: { name: 'Alice A' }
        },
        {
          title: 'Run unit-test',
          project: { name: 'Busy Project', creator: { name: 'Alice A' } },
          creator: { name: 'Bob B' }
        },
        {
          title: 'Write unit-test',
          project: { name: 'Busy Project', creator: { name: 'Alice A' } },
          creator: { name: 'Bob B' }
        }
      ],
      null,
      { todos: new Set([1, 2, 3, 4]), projects: new Set([1]), users: new Set([1, 2]) });
    });
  });

  xdescribe('Collections', () => {
    it('can collect members as an array', async () => {
      await test([
        {
          table: 'users',
          select: ['id', 'name'],
          collections: [
            {
              table: 'comments',
              select: ['id', 'comment'],
              leftJoin: ['comments.userId', 'users.id']
            }
          ]
        }
      ], [
      ]);
    });
  });

  describe('Specials', () => {
    it('handles deeper chains correctly', async() => {
      const q = new Query({
        table: 'a',
        select: 'id',
        members: [
          {
            table: 'b',
            select: 'id',
            members: [
              {
                table: 'c',
                select: 'id'
              }
            ]
          },
          {
            table: 'd',
            select: 'id',
            members: [
              {
                table: 'e',
                select: 'id'
              }
            ]
          }
        ]
      });
      assert.strictEqual(q.root.getChain().length, 5);
    });

    it('support `from` ans `as` as an alias', async () => {
      await test([
        {
          table: 'todos',
          select: {title: 'as'},
          members: [
            {
              table: 'users',
              as: 'from',
              select: {name: 'from'},
              leftJoin: ['from.id', 'todos.ownerId']
            }
          ]
        }
      ],
      [
        { as: 'Find something', from: { from: null } },
        { as: 'Cook something', from: { from: 'Carl C' } },
        { as: 'Run unit-test', from: { from: 'Bob B' } },
        { as: 'Write unit-test', from: { from: null } }
      ],
      null,
      { todos: new Set([1, 2, 3, 4]), users: new Set([null, 3, 2])});
    });
  });

  describe('Search queries', () => {
    it('can search flat fields', async () => {
      await test({
        table: 'users',
        select: ['id', 'name', 'age'],
        where: ['age < 40', 'id > 1']
      }, [
        { id: 2, name: 'Bob B', age: 33 }
      ],
      null,
      { users: new Set([2])});
    });

    it('can use additional conditions', async () => {
      await test({
        table: 'users',
        select: ['id', 'name', 'age']
      }, [
        { id: 2, name: 'Bob B', age: 33 }
      ],
      'users.age < 40 AND users.id > 1',
      { users: new Set([2])});
    });

    it('can search multiple table fields with aliases and overlapping names', async () => {
      await test([{
        table: 'users',
        select: ['id', 'name', { age: 'years' }],
        where: ['years = 21']
      }, {
        table: 'comments',
        select: ['id', 'todoId', 'comment'],
        join: 'comments.userId = users.id',
        where: 'id < 3'
      }], [
        { id: 1, name: 'Alice A', years: 21, todoId: 1, comment: 'A' }
      ],
      null,
      { comments: new Set([1]), users: new Set([1])});
    });
  });

  describe('Inserting', () => {
    it('single items', async () => {
      const q = new Query({
        insert: ['name', 'age'],
        table: 'users'
      });

      const res = await q.createOne(driver, {name: 'Freshly Made', age: 22});
      assert.strictEqual(res.name, 'Freshly Made');
      assert.strictEqual(res.age, 22);

      const data = await new Query({table: 'users', select: ['name', 'age'], where: `id=${res.id}`}).getAll(driver);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].name, 'Freshly Made');
      assert.strictEqual(data[0].age, 22);
    });
  });

  describe('Updating', () => {
    it('single items fully', async () => {
      const userId = 3;
      const q = new Query({
        update: ['name', 'age'],
        table: 'users'
      });
      const res = await q.updateOne(driver, {id: userId, name: 'Aging', age: 53});
      assert.strictEqual(res.id, userId);
      assert.strictEqual(res.name, 'Aging');
      assert.strictEqual(res.age, 53);

      const unaffected = await new Query({table: 'users', select: ['name', 'age'], where: 'id=1'}).getAll(driver);
      assert.strictEqual(unaffected.length, 1);
      assert.strictEqual(unaffected[0].name, 'Alice A');
      assert.strictEqual(unaffected[0].age, 21);
    });

    it('single items partially', async () => {
      const userId = 2;
      const q = new Query({
        update: ['name', 'age'],
        table: 'users'
      });
      const res = await q.updateOne(driver, {id: userId, age: 12});
      assert.strictEqual(res.id, userId);
      assert.strictEqual(res.name, 'Bob B');
      assert.strictEqual(res.age, 12);

      const unaffected = await new Query({table: 'users', select: ['name', 'age'], where: 'id=1'}).getAll(driver);
      assert.strictEqual(unaffected.length, 1);
      assert.strictEqual(unaffected[0].name, 'Alice A');
      assert.strictEqual(unaffected[0].age, 21);
    });
  });
});
