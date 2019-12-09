const assert = require('assert');
const { Query, Formula } = require('../src');

describe('Formula class', () => {
  /**
   * Tests.
   */
  it('can post process data', () => {
    const formula = new Formula({
      flat: { id: 'id', name: 'name', title: 'title' },
      objects: {
        users: {
          flat: {id: 'users.id', creator: 'users.creator'}
        }
      }
    });
    const data = [
      { id: 10, name: 'AA', title: 'A', 'users.id': 1, 'users.creator': 'U1' },
      { id: 20, name: 'BB', title: 'B', 'users.id': 2, 'users.creator': 'U2' },
      { id: 30, name: 'CC', title: 'C', 'users.id': 3, 'users.creator': 'U3' }
    ];
    assert.deepStrictEqual(formula.process(data), [
      { id: 10, name: 'AA', title: 'A', users: { id: 1, creator: 'U1' } },
      { id: 20, name: 'BB', title: 'B', users: { id: 2, creator: 'U2' } },
      { id: 30, name: 'CC', title: 'C', users: { id: 3, creator: 'U3' } }
    ]);
  });

  it('can be constructed from simple query', () => {
    const q = new Query({
      table: 'users',
      select: ['id', 'name', 'age']
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { id: 'id', name: 'name', age: 'age' }
    }));
  });

  it('can be constructed from cross join query', () => {
    const q = new Query([
      {
        table: 'users',
        select: ['age']
      },
      {
        table: 'projects',
        select: ['name']
      }
    ]);
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { name: 'name', age: 'age' }
    }));
  });

  it('can be constructed from query with members', () => {
    const q = new Query({
      table: 'todos',
      select: ['title'],
      members: [
        {
          table: 'users',
          select: [{ name: 'creator'}],
          join: ['users.id', 'todos.creatorId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { title: 'title' },
      objects: { users: {flat: { creator: 'users.creator' } } }
    }));
  });

  it('can be constructed from query with aliased members', () => {
    const q = new Query({
      table: 'todos',
      select: ['title'],
      members: [
        {
          table: 'users',
          as: 'creator',
          select: 'name',
          join: ['creator.id', 'todos.creatorId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { title: 'title' },
      objects: { creator: {flat: { name: 'creator.name' } } }
    }));
  });
});
