import type {Hits} from 'meilisearch';

interface PageDataIntenal {
  result: Hits;
  q: string;
}

export type PageData = PageDataIntenal;