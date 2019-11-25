exports.up = async function(knex, Promise) {
  await knex.schema.createTable('todos', function (table) {
    table.increments('id');
    table.string('title', 16).notNullable();
    table.integer('creatorId').unsigned().notNullable();
    table.integer('ownerId').unsigned().defaultTo(null);
    table.integer('projectId').unsigned().defaultTo(null);
  });
  await knex.schema.createTable('users', function (table) {
    table.increments('id');
    table.string('name', 256).notNullable();
    table.integer('age').unsigned();
  });
  await knex.schema.createTable('comments', function (table) {
    table.increments('id');
    table.string('comment', 256).notNullable();
    table.integer('userId').unsigned();
  });
  await knex.schema.createTable('projects', function (table) {
    table.increments('id');
    table.string('name', 256).notNullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('todos');
  await knex.schema.dropTable('users');
  await knex.schema.dropTable('comments');
  await knex.schema.dropTable('projects');
};
