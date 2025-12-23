module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgres://replyte:replyte@localhost:5432/replyte',
    migrations: {
      directory: './migrations'
    }
  },
  test: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgres://replyte:replyte@localhost:5432/replyte_test',
    migrations: {
      directory: './migrations'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations'
    }
  }
};