const assert = require('assert');
const { Query, Driver } = require('../src');

describe('Query class', () => {

  const driver = Driver.create('sql://');

  describe('Search queries', () => {
    xit('can search flat fields', async () => {
      const q = Query.parse({
        table: 'users',
        select: ['id', 'name', 'age'],
        members: [
          {
            table: 'tools',
            select: 'name',
            join: ['users.id', 'tools.ownerId']
          }
        ]
    });
      q.addWhere('users.age > 0 and users.tools.name = "axe"');
      q.dump();
    });
  });
});
