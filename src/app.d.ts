/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

import type {EUserRanks} from './lib/types/user-ranks';
import type {IUser, JwtUser} from '$lib/types/user';

declare global {
  namespace App {
    interface Locals {
      user: JwtUser;
      commentFolding: boolean;
    }

    // interface Platform {}
    interface Session {
      user: {
        uid: string;
        rank: EUserRanks;
        sub: string;
      };
      commentFolding: boolean;
    }

    // interface Stuff {}
  }
}
