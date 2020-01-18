const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Query, Driver } = require('../src');

// If set, show all parsed queries and results.
const DEBUG = false;
// If set, throw assertions.
const ASSERT = true;

// Helper to read in SQL-file.
const readSql = async (driver, filePath) => {
  const fileContent = fs.readFileSync(filePath).toString('utf-8');
  for (let sql of fileContent.split(';')) {
    sql = sql.trim();
    if (sql) {
      await driver.runQuery(sql);
    }
  }
};

describe('Queries', () => {
  let driver;

  /**
   * Create and initialize tables for testing.
   */
  before(async () => {
    const DATABASE_URL = process.env.DATABASE_URL || `sqlite:///${__dirname}/test.sqlite`;
    driver = Driver.create(DATABASE_URL);

    await readSql(driver, path.join(__dirname, 'migrations/init.sql'));
    await driver.initialize();
  });

  /**
   * Drop all testing tables.
   */
  after(async () => {
    await readSql(driver, path.join(__dirname, 'migrations/exit.sql'));
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
      console.log(q.selectSQL(driver, cond) + ';');
    }
    const res = await q.select(driver, cond);
    if (DEBUG) {
      console.log('=>');
      console.dir(res, {depth: null});
    }
    if (ASSERT) {
      assert.deepStrictEqual(res, result, `Query ${JSON.stringify(query)} converted to ${q.selectSQL(driver, cond)} failed.`);
    }
    if (pks) {
      const qpk = q.selectPKs();
      const resPk = await qpk.allPKs(driver, cond);
      if (DEBUG) {
        console.log(qpk.selectSQL(driver, cond) + ';');
        console.log('=> (PKS)');
        console.dir(resPk, {depth: null});
      }
      if (ASSERT) {
        assert.deepStrictEqual(resPk, pks, `Query ${JSON.stringify(query)} did not produce correct PKs.`);
      }
    }
  };

  /**
   * Helper to put back users as they were.
   */
  const restoreUsers = async () => {
    await driver.runQuery('DELETE FROM users');
    await driver.runQuery("INSERT INTO users (id, name, age) VALUES (1, 'Alice A', 21), (2, 'Bob B', 33), (3, 'Carl C', 44)");
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

  describe('Collections', () => {
    // TODO: Collections of collections.
    // TODO: Members with collections.
    // TODO: Multiple collections in single object.
    // TODO: Alias 'as' support for collection.
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
        {
          id: 1,
          name: 'Alice A',
          comments: [
            { id: 1, comment: 'A' },
            { id: 3, comment: 'C' }
          ]
        },
        {
          id: 2,
          name: 'Bob B',
          comments: [
            { id: 2, comment: 'B' }
          ]
        },
        {
          id: 3,
          name: 'Carl C',
          comments: []
        }
      ],
      null,
      { comments: new Set([1, 2, 3, null]), users: new Set([1, 3, 2]) });
    });

    it('can collect members as an array when having multiple keys', async () => {
      await test([
        {
          table: 'users',
          select: ['id', 'name'],
          pk: ['id', 'name'],
          collections: [
            {
              table: 'comments',
              pk: 'comment',
              select: ['id', 'comment'],
              leftJoin: ['comments.userId', 'users.id']
            }
          ]
        }
      ], [
        {
          id: 1,
          name: 'Alice A',
          comments: [
            { id: 1, comment: 'A' },
            { id: 3, comment: 'C' }
          ]
        },
        {
          id: 2,
          name: 'Bob B',
          comments: [
            { id: 2, comment: 'B' }
          ]
        },
        {
          id: 3,
          name: 'Carl C',
          comments: []
        }
      ],
      null,
      {
        comments: new Set(['A', 'B', 'C', null]),
        users: new Set([
          [1, 'Alice A'],
          [1, 'Alice A'],
          [2, 'Bob B'],
          [3, 'Carl C']
        ])
      });
    });

    it('can collect members mixed as an array and an object', async () => {
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
          ],
          members: [
            {
              table: 'projects',
              as: 'project',
              select: ['name'],
              leftJoin: ['project.creatorId', 'users.id']
            }
          ]
        }
      ], [
        {
          id: 1,
          name: 'Alice A',
          project: { name: 'Busy Project' },
          comments: [
            { id: 1, comment: 'A' },
            { id: 3, comment: 'C' }
          ]
        },
        {
          id: 2,
          name: 'Bob B',
          project: { name: 'Empty Project' },
          comments: [
            { id: 2, comment: 'B' }
          ]
        },
        {
          id: 3,
          name: 'Carl C',
          project: { name: null },
          comments: []
        }
      ],
      null,
      {
        comments: new Set([1, 2, 3, null]),
        projects: new Set([1, 2, null]),
        users: new Set([1, 3, 2])
      });
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

    it('support `from` and `as` as an alias', async () => {
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

  describe('Limits and orders', () => {
    it('can limit number and order of search results', async() => {
      await test({
        table: 'users',
        select: 'id',
        limit: 2,
        order: 'id'
      }, [
        { id: 1 },
        { id: 2 }
      ],
      null,
      {users: new Set([1, 2])});
    });

    it('can limit number and order descending of search results', async() => {
      await test({
        table: 'users',
        select: 'id',
        limit: 2,
        order: '-id'
      }, [
        { id: 3 },
        { id: 2 }
      ],
      null,
      {users: new Set([2, 3])});
    });

    it('can order more than one table and still use limit', async() => {
      await test([
        {
          table: 'users',
          order: ['-age'],
          select: ['age']
        },
        {
          table: 'projects',
          order: ['name'],
          select: ['name'],
          limit: 3
        }
      ], [
        {
          age: 44,
          name: 'Busy Project'
        },
        {
          age: 44,
          name: 'Empty Project'
        },
        {
          age: 33,
          name: 'Busy Project'
        }
      ],
      null,
      {users: new Set([2, 3]), projects: new Set([1, 2])});
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
      const res = await q.create(driver, {name: 'Z-man', age: 22});
      assert.strictEqual(res, true);

      const data = await new Query({table: 'users', select: ['name', 'age'], orderBy: 'name'}).select(driver);
      assert.strictEqual(data.length, 4);
      assert.strictEqual(data[3].name, 'Z-man');
      assert.strictEqual(data[3].age, 22);

      await new Query({
        delete: ['name'],
        table: 'users'
      }).delete(driver, {name: 'Z-man'});
    });

    it('multiple items', async () => {
      const q = new Query({
        insert: ['name', 'age'],
        table: 'users'
      });

      await q.create(driver, [
        {name: 'Mass Insert 1', age: 102},
        {name: 'Mass Insert 2', age: 102},
        {name: 'Mass Insert 3', age: 102},
        {name: 'Mass Insert 4', age: 102}
      ]);
      const data = await new Query({
        table: 'users',
        select: ['name', 'age'],
        where: 'age=102',
        order: 'name'
      }).select(driver);
      assert.deepStrictEqual(data, [
        {name: 'Mass Insert 1', age: 102},
        {name: 'Mass Insert 2', age: 102},
        {name: 'Mass Insert 3', age: 102},
        {name: 'Mass Insert 4', age: 102}
      ]);
      await new Query({
        delete: ['age'],
        table: 'users'
      }).delete(driver, {age: 102});
    });
  });

  describe('Updating', () => {
    it('single items fully', async () => {
      const userId = 3;
      const q = new Query({
        update: ['name', 'age'],
        table: 'users'
      });

      const res = await q.update(driver, {id: userId, name: 'Aging', age: 53});
      assert.strictEqual(res.id, userId);
      assert.strictEqual(res.name, 'Aging');
      assert.strictEqual(res.age, 53);

      const unaffected1 = await new Query({table: 'users', select: ['name', 'age'], where: 'id=1'}).select(driver);
      assert.strictEqual(unaffected1.length, 1);
      assert.strictEqual(unaffected1[0].name, 'Alice A');
      assert.strictEqual(unaffected1[0].age, 21);

      const unaffected2 = await new Query({table: 'users', select: ['name', 'age'], where: 'id=2'}).select(driver);
      assert.strictEqual(unaffected2.length, 1);
      assert.strictEqual(unaffected2[0].name, 'Bob B');
      assert.strictEqual(unaffected2[0].age, 33);

      return restoreUsers();
    });

    it('single items partially', async () => {
      const userId = 2;
      const q = new Query({
        update: ['name', 'age'],
        table: 'users'
      });
      const res = await q.update(driver, {id: userId, age: 12});
      assert.strictEqual(res.id, userId);
      assert.strictEqual(res.name, 'Bob B');
      assert.strictEqual(res.age, 12);

      const unaffected = await new Query({table: 'users', select: ['name', 'age'], where: 'id=1'}).select(driver);
      assert.strictEqual(unaffected.length, 1);
      assert.strictEqual(unaffected[0].name, 'Alice A');
      assert.strictEqual(unaffected[0].age, 21);

      return restoreUsers();
    });

    it('multiple items fully', async () => {
      const q = new Query({
        update: ['name', 'age'],
        table: 'users'
      });
      const res = await q.update(driver, [{id: 1, name: 'Foo', age: 1}, {id: 2, name: 'Bar', age: 2}]);
      assert.deepStrictEqual(res, [
        { id: 1, name: 'Foo', age: 1 },
        { id: 2, name: 'Bar', age: 2 }
      ]);

      const users = await new Query({table: 'users', select: ['name', 'age'], orderBy: 'id'}).select(driver);
      assert.deepStrictEqual(users, [
        { name: 'Foo', age: 1 },
        { name: 'Bar', age: 2 },
        { name: 'Carl C', age: 44 }
      ]);

      return restoreUsers();
    });
  });

  describe('Deleting', () => {
    it('with single keys', async () => {
      const q = new Query({
        delete: ['id'],
        table: 'users'
      });
      await q.delete(driver, {id: 3});
      const userIds = await new Query({select: 'id', table: 'users'}).select(driver);
      assert.deepStrictEqual(userIds, [{ id: 1 }, { id: 2 }]);
      return restoreUsers();
    });

    it('with single keys array', async () => {
      const q = new Query({
        delete: ['id'],
        table: 'users'
      });
      await q.delete(driver, [{id: 3}, {id: 2}]);
      const userIds = await new Query({select: 'id', table: 'users'}).select(driver);
      assert.deepStrictEqual(userIds, [{ id: 1 }]);
      return restoreUsers();
    });

    it('with multiple keys', async () => {
      const q = new Query({
        delete: ['id', 'name'],
        table: 'users'
      });
      await q.delete(driver, {id: 1, name: 'Alice A'}); // Hits.
      await q.delete(driver, {id: 2, name: 'Wrong name'}); // No hits.
      const userIds = await new Query({select: 'id', table: 'users'}).select(driver);
      assert.deepStrictEqual(userIds, [{ id: 2 }, { id: 3 }]);
      return restoreUsers();
    });

    it('with non-existing keys', async () => {
      const q = new Query({
        delete: ['name'],
        table: 'users'
      });
      await q.delete(driver, {name: 'Not here'});
      const userIds = await new Query({select: 'id', table: 'users'}).select(driver);
      assert.deepStrictEqual(userIds, [{id: 1}, { id: 2 }, { id: 3 }]);
      return restoreUsers();
    });
  });
});
