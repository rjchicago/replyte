exports.up = function(knex) {
  return knex.schema.createTable('templates', table => {
    table.increments('id').primary();
    table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name');
    table.text('content');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('templates');
};