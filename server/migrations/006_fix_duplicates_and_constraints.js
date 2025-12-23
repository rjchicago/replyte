exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Remove duplicate handles - keep the first one for each user_id + handle combination
    await trx.raw(`
      DELETE FROM handles 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM handles 
        GROUP BY user_id, handle
      )
    `);
    
    // Remove duplicate templates - keep the first one for each user_id + name + content combination
    await trx.raw(`
      DELETE FROM templates 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM templates 
        GROUP BY user_id, name, content
      )
    `);
    
    // Add unique constraints
    await trx.schema.alterTable('handles', table => {
      table.unique(['user_id', 'handle']);
    });
    
    await trx.schema.alterTable('templates', table => {
      table.unique(['user_id', 'name', 'content']);
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('handles', table => {
    table.dropUnique(['user_id', 'handle']);
  }).then(() => {
    return knex.schema.alterTable('templates', table => {
      table.dropUnique(['user_id', 'name', 'content']);
    });
  });
};