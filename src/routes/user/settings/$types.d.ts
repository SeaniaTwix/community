import type {Settings} from '@root/app';

interface PageDataInternal {
  leftAlign: boolean;
  settings: Settings;
}

export type PageData = PageDataInternal;