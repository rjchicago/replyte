exports.up = function(knex) {
  return knex.schema.createTable('usage_log', function(table) {
    table.increments('id').primary();
    table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('template_id').unsigned().references('id').inTable('templates').onDelete('CASCADE');
    table.string('x_user_handle');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'created_at']);
    table.index(['template_id', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('usage_log');
};