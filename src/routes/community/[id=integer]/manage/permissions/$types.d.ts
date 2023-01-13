import type {IUser} from '$lib/types/user';

export interface PageData {
  managers: IUser[];
  requires: bigint;
}