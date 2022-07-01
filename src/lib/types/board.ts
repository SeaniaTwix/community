import type {IArangoDocumentIdentifier} from '$lib/database';

export interface IBoardConfig {
  name: string;
  pub: boolean; // is public?
}

export interface IBoard extends IArangoDocumentIdentifier, IBoardConfig {
  articles: string[]; // list of article ids
  freezed: boolean; // is freezed?
}
