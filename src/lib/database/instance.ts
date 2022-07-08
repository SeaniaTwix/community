import DefaultDatabase from './index';

class Database {
  static get instance(): DefaultDatabase {
    if (!(<any>global).__db_stored) {
      (<any>global).__db_stored = new DefaultDatabase();
    }
    return (<any>global).__db_stored;
  }
}

const instance = Database.instance;

export default instance;