/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';

@Entity()
export class BoardDto {
  constructor(_obj: any) {
  }

  @SafeType({type: String})
  name?: string;

  @SafeType({type: Boolean})
  pub = true;

  order?: number;
}