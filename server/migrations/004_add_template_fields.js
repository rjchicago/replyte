exports.up = function(knex) {
  return knex.schema.alterTable('templates', table => {
    table.text('tags');
    table.boolean('favorite').defaultTo(false);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('templates', table => {
    table.dropColumn('tags');
    table.dropColumn('favorite');
    table.dropColumn('updated_at');
  });
};