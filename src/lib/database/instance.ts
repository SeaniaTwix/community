import DefaultDatabase from './index';

class Database {
  private static stored: DefaultDatabase;

  static get instance(): DefaultDatabase {
    if (!Database.stored) {
      Database.stored = new DefaultDatabase();
    }
    return Database.stored;
  }
}

const instance = Database.instance;

export default instance;