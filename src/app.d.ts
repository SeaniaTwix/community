/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

import type {EUserRanks} from './lib/types/user-ranks';
import type {IUser, JwtUser} from '$lib/types/user';

declare global {
  namespace App {
    interface Locals {
      user: IUserSession;
      ui: UI,
      sessionId: string;
    }

    // interface Platform {}
    interface Session {
      user: IUserSession | undefined;
      ui: UI,
      // client only
      settings: Settings
    }

    // interface Stuff {}
  }
}

export type IUserSession = JwtUser & { adult: boolean };

export interface UI {
  commentFolding: boolean;
  buttonAlign: 'left' | 'right';
  listType: 'list' | 'gallery';
}

export interface Settings {
  imageOrder: AllowedExtensions[];
}

declare type AllowedExtensions = 'jxl' | 'avif' | 'webp' | 'png';