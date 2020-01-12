const assert = require('assert');
const { Query, Driver } = require('../src');

describe('Query (and QueryNode) class', () => {

  const driver = Driver.create('sql://');

  before(async () => {
    driver.initialize({
      users: new Set(['id', 'name', 'age']),
      tools: new Set(['id', 'name'])
    });
  });

  describe('Search queries', () => {
    it('constructs correctly queries', () => {
      const q = new Query([{
        table: 'users',
        select: ['id', 'name', { age: 'years' }],
        where: ['years = 21']
      }, {
        table: 'comments',
        select: ['id', 'todoId', 'comment'],
        join: 'comments.userId = users.id',
        where: 'id < 3'
      }]);
      assert.deepStrictEqual(q.toJSON(), {
        node: 'ContainerNode',
        chidlren: [
          {
            node: 'Select',
            table: 'users',
            pk: ['id'],
            select: [
              { node: 'Field', table: 'users', field: 'id', as: 'id' },
              { node: 'Field', table: 'users', field: 'name', as: 'name' },
              { node: 'Field', table: 'users', field: 'age', as: 'years' }
            ],
            members: [],
            where: [{ node: 'Where', where: 'years = 21' }]
          },
          {
            node: 'Select',
            table: 'comments',
            pk: ['id'],
            select: [
              { node: 'Field', table: 'comments', field: 'id', as: 'id' },
              {
                node: 'Field',
                table: 'comments',
                field: 'todoId',
                as: 'todoId'
              },
              {
                node: 'Field',
                table: 'comments',
                field: 'comment',
                as: 'comment'
              }
            ],
            join: {
              node: 'Join',
              type: 'inner',
              table: 'comments',
              links: [
                [
                  {
                    node: 'JoinField',
                    table: 'comments',
                    field: 'userId',
                    as: 'userId'
                  },
                  {
                    node: 'JoinField',
                    table: 'users',
                    field: 'id',
                    as: 'id'
                  }
                ]
              ]
            },
            members: [],
            where: [{ node: 'Where', where: 'id < 3' }]
          }
        ]
      });
    });

    it('can add conditions', () => {
      const q = new Query({
        table: 'users',
        select: ['id', 'name', 'age'],
        members: [
          {
            table: 'tools',
            select: ['id', 'name'],
            join: ['users.id', 'tools.ownerId']
          }
        ]
      });
      const wq = q.withWhere('users.age > 0 and users.tools.name = "axe"');
      assert.deepStrictEqual(wq.toJSON(), {
        node: 'Select',
        table: 'users',
        pk: ['id'],
        select: [
          { node: 'Field', table: 'users', field: 'id', as: 'id' },
          { node: 'Field', table: 'users', field: 'name', as: 'name' },
          { node: 'Field', table: 'users', field: 'age', as: 'age' }
        ],
        members: [
          {
            node: 'Select',
            table: 'tools',
            pk: ['id'],
            select: [
              { node: 'Field', table: 'tools', field: 'id', as: 'id' },
              { node: 'Field', table: 'tools', field: 'name', as: 'name' }
            ],
            join: {
              node: 'Join',
              type: 'inner',
              table: 'tools',
              links: [
                [
                  {
                    node: 'JoinField',
                    table: 'users',
                    field: 'id',
                    as: 'id'
                  },
                  {
                    node: 'JoinField',
                    table: 'tools',
                    field: 'ownerId',
                    as: 'ownerId'
                  }
                ]
              ]
            },
            members: [],
            where: [
              {
                node: 'Where',
                where: 'users.age > 0 and users.tools.name = "axe"'
              }
            ]
          }
        ]
      });
    });

    it('get correct SQL with additional conditions', () => {
      const q = new Query({
        table: 'users',
        select: ['id', 'name', 'age'],
        members: [
          {
            table: 'tools',
            select: ['id', 'name'],
            join: ['users.id', 'tools.ownerId']
          }
        ]
      });
      const sql = q.selectSQL(driver, 'users.id > 1 AND users.tools.id < 1');
      assert(/SELECT `users\d+`.`id` AS `id`, `users\d+`.`name` AS `name`, `users\d+`.`age` AS `age`, `tools\d+`.`id` AS `tools.id`, `tools\d+`.`name` AS `tools.name` FROM `users` AS `users\d+` INNER JOIN `tools` AS `tools\d+` ON `users\d+`.`id` = `tools\d+`.`ownerId` WHERE \(users.`tools\d+`.`id` > 1 AND `tools\d+`.`id` < 1\)/.test(sql));
    });

    it('find PKs with conditions', () => {
      const q = new Query({
        table: 'users',
        select: ['id', 'name', 'age']
      });
      const qpk = q.selectPKs();
      const sql = qpk.selectSQL(driver, 'users.age < 40 AND users.id > 1');
      assert(/SELECT `users\d+`.`id` AS `id`, `users\d+`.`name` AS `name`, `users\d+`.`age` AS `age`, `users\d+`.`id` AS `PK\[users\[0\]\]` FROM `users` AS `users\d+` WHERE \(`users\d+`.`age` < 40 AND `users\d+`.`id` > 1\)/.test(sql));
    });
  });
});
