exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.string('id').primary();
    table.string('email').unique().notNullable();
    table.string('tier').defaultTo('free');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};