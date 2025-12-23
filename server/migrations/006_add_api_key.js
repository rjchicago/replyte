exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('api_key').unique();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('api_key');
  });
};