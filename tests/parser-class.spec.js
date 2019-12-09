const assert = require('assert');
const { Parser } = require('../src');

describe('Parser class', () => {

  it('can extract variables', async () => {
    assert.deepStrictEqual(Parser.vars('table.field'), [ 'table.field' ]);
    assert.deepStrictEqual(Parser.vars('a.b.c and d.e.f or g.h.i'), [ 'a.b.c', 'd.e.f', 'g.h.i' ]);
    assert.deepStrictEqual(Parser.vars('users.age > 0 and users.tools.name = "axe"'),[ 'users.age', 'users.tools.name' ]);
    assert.deepStrictEqual(Parser.vars('axe.short'), [ 'axe.short' ]);
    assert.deepStrictEqual(Parser.vars("'axe.short'"), []);
    assert.deepStrictEqual(Parser.vars('"axe.short"'), []);
    assert.deepStrictEqual(Parser.vars(''), []);
  });
});
