/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';

@Entity()
export class LoginDto {
  constructor(_obj: any) {}

  @SafeType({type: String})
  id?: string;

  @SafeType({ type: String })
  password?: string;
}