/* eslint-disable @typescript-eslint/no-explicit-any,
                  @typescript-eslint/no-empty-function,
                  @typescript-eslint/no-unused-vars*/

import {Entity, SafeType} from 'dto-mapping';

@Entity()
export class EditDto {
  constructor(_obj: any) {
  }

  @SafeType({type: String})
  title?: string;

  @SafeType({type: String})
  source?: string;

  @SafeType({type: String})
  content?: string;

  tags: string[] = [];
}