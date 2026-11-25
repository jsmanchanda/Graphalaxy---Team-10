// Run the production startup with a disposable database and dedicated port.
process.env.DB_PATH = ':memory:';
process.env.PORT = '3100';
void import('../../server/src/index');
