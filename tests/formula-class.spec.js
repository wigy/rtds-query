const assert = require('assert');
const { Query, Formula } = require('../src');

describe('Formula class', () => {
  /**
   * Tests.
   */
  it('can post process member data', () => {
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

  it('can post process collection data', () => {
    const formula = new Formula({
      flat: { id: 'id', name: 'name', title: 'title' },
      arrays: {
        comments: {
          flat: {id: 'comments.id', comment: 'comments.comment'}
        }
      }
    });
    const data = [
      { id: 10, name: 'AA', title: 'A', 'comments.id': 1, 'comments.comment': 'C1' },
      { id: 10, name: 'AA', title: 'A', 'comments.id': 2, 'comments.comment': 'C2' },
      { id: 20, name: 'BB', title: 'B', 'comments.id': 3, 'comments.comment': 'C3' },
      { id: 30, name: 'CC', title: 'C', 'comments.id': null, 'comments.comment': null }
    ];
    assert.deepStrictEqual(formula.process(data), [
      {
        id: 10,
        name: 'AA',
        title: 'A',
        comments: [
          { id: 1, comment: 'C1' },
          { id: 2, comment: 'C2' }
        ]
      },
      {
        id: 20,
        name: 'BB',
        title: 'B',
        comments: [
          { id: 3, comment: 'C3' }
        ]
      },
      {
        id: 30,
        name: 'CC',
        title: 'C',
        comments: [
        ]
      }
    ]);
  });

  it('can post process collection data with explicit key', () => {
    const formula = new Formula({
      flat: { number: 'number', name: 'name', title: 'title' },
      pk: 'number',
      arrays: {
        comments: {
          flat: {id: 'comments.id', comment: 'comments.comment'}
        }
      }
    });
    const data = [
      { number: 10, name: 'AA', title: 'A', 'comments.id': 1, 'comments.comment': 'C1' },
      { number: 10, name: 'AA', title: 'A', 'comments.id': 2, 'comments.comment': 'C2' },
      { number: 20, name: 'BB', title: 'B', 'comments.id': 3, 'comments.comment': 'C3' },
      { number: 30, name: 'CC', title: 'C', 'comments.id': null, 'comments.comment': null }
    ];
    assert.deepStrictEqual(formula.process(data), [
      {
        number: 10,
        name: 'AA',
        title: 'A',
        comments: [
          { id: 1, comment: 'C1' },
          { id: 2, comment: 'C2' }
        ]
      },
      {
        number: 20,
        name: 'BB',
        title: 'B',
        comments: [
          { id: 3, comment: 'C3' }
        ]
      },
      {
        number: 30,
        name: 'CC',
        title: 'C',
        comments: [
        ]
      }
    ]);
  });

  it('can post process collection data with multiple keys', () => {
    const formula = new Formula({
      flat: { number: 'number', name: 'name', title: 'title' },
      pk: ['number', 'name'],
      arrays: {
        comments: {
          flat: {id: 'comments.id', comment: 'comments.comment'}
        }
      }
    });
    const data = [
      { number: 10, name: 'AA', title: 'A', 'comments.id': 1, 'comments.comment': 'C1' },
      { number: 10, name: 'AA', title: 'A', 'comments.id': 2, 'comments.comment': 'C2' },
      { number: 20, name: 'BB', title: 'B', 'comments.id': 3, 'comments.comment': 'C3' },
      { number: 30, name: 'CC', title: 'C', 'comments.id': null, 'comments.comment': null }
    ];
    assert.deepStrictEqual(formula.process(data), [
      {
        number: 10,
        name: 'AA',
        title: 'A',
        comments: [
          { id: 1, comment: 'C1' },
          { id: 2, comment: 'C2' }
        ]
      },
      {
        number: 20,
        name: 'BB',
        title: 'B',
        comments: [
          { id: 3, comment: 'C3' }
        ]
      },
      {
        number: 30,
        name: 'CC',
        title: 'C',
        comments: [
        ]
      }
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

  it('can be constructed from query with multiple members', () => {
    const q = new Query({
      table: 'todos',
      select: ['id', 'title'],
      members: [
        {
          table: 'users',
          as: 'owner',
          select: ['id', 'name'],
          leftJoin: ['owner.id', 'todos.ownerId']
        },
        {
          table: 'users',
          as: 'creator',
          select: ['id', 'name'],
          join: ['creator.id', 'todos.creatorId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { id: 'id', title: 'title' },
      objects: {
        owner: { flat: { id: 'owner.id', name: 'owner.name' } },
        creator: { flat: { id: 'creator.id', name: 'creator.name' } }
      }
    }));
  });

  it('can be constructed from nested members', () => {
    const q = new Query({
      table: 'todos',
      select: ['id', 'title'],
      members: [
        {
          table: 'projects',
          as: 'project',
          select: ['id', 'name'],
          join: ['project.id', 'todos.projectId'],
          members: [
            {
              table: 'users',
              as: 'creator',
              select: ['id', 'name'],
              join: ['creator.id', 'project.creatorId']
            }
          ]
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { id: 'id', title: 'title' },
      objects: {
        project: {
          flat: { id: 'project.id', name: 'project.name' },
          objects: {
            creator: {
              flat: { id: 'project.creator.id', name: 'project.creator.name' }
            }
          }
        }
      }
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

  it('can be constructed from query with collections', () => {
    const q = new Query({
      table: 'users',
      select: ['name'],
      collections: [
        {
          table: 'comments',
          select: ['comment'],
          join: ['users.id', 'comments.userId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { name: 'name' },
      arrays: { comments: { flat: { comment: 'comments.comment' } } }
    }));
  });

  it('can be constructed from query with collections', () => {
    const q = new Query({
      table: 'users',
      select: ['name'],
      pk: 'name',
      collections: [
        {
          table: 'comments',
          select: ['comment'],
          join: ['users.id', 'comments.userId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { name: 'name' },
      pk: 'name',
      arrays: { comments: { flat: { comment: 'comments.comment' } } }
    }));
  });

  it('can be constructed from query with collections', () => {
    const q = new Query({
      table: 'users',
      select: ['name'],
      pk: ['id', 'name'],
      collections: [
        {
          table: 'comments',
          select: ['comment'],
          join: ['users.id', 'comments.userId']
        }
      ]
    });
    assert.deepStrictEqual(q.getPostFormula(), new Formula({
      flat: { name: 'name' },
      pk: ['id', 'name'],
      arrays: { comments: { flat: { comment: 'comments.comment' } } }
    }));
  });
});
