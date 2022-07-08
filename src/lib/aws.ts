import {IAMClient} from '@aws-sdk/client-iam';

export class Aws {

  static requestCreateUser() {
    const client = new IAMClient({endpoint: ''})
  }
}