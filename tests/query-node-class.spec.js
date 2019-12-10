const assert = require('assert');
const { Query, Driver } = require('../src');

describe('Query class', () => {

  // const driver = Driver.create('sql://');

  describe('Search queries', () => {
    it('constructs correctly queries', async () => {
      const q = new Query([{
        table: 'users',
        select: ['id', 'name', {'age': 'years'}],
        where: ['years = 21']
      },{
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
            select: [
              { node: 'Field', table: 'users', field: 'id', as: 'id' },
              { node: 'Field', table: 'users', field: 'name', as: 'name' },
              { node: 'Field', table: 'users', field: 'age', as: 'years' }
            ],
            members: [],
            where: [ { node: 'Where', where: 'years = 21' } ]
          },
          {
            node: 'Select',
            table: 'comments',
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
            where: [ { node: 'Where', where: 'id < 3' } ]
          }
        ]
      });
    });

    it('can add conditions', async () => {
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
        select: [
          { node: 'Field', table: 'users', field: 'id', as: 'id' },
          { node: 'Field', table: 'users', field: 'name', as: 'name' },
          { node: 'Field', table: 'users', field: 'age', as: 'age' }
        ],
        members: [
          {
            node: 'Select',
            table: 'tools',
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
  });
});
