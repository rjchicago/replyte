exports.up = function(knex) {
  return knex.schema.createTable('handles', table => {
    table.increments('id').primary();
    table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('handle');
    table.string('nickname');
    table.text('emojis');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('handles');
};