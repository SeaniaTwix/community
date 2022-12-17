import type {IArangoDocumentIdentifier} from '$lib/database';
import type {IPermissions} from '$lib/types/permissions';

export interface IBoardConfig {
  name: string;
  pub: boolean; // is public?
  order: number;
  permissions?: Partial<IPermissions>;
}

export interface IBoard extends IArangoDocumentIdentifier, IBoardConfig {
  articles: string[]; // list of article ids
  freezing: boolean; // is freezed?
}
