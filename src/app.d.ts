/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

import type {EUserRanks} from './lib/types/user-ranks';
import type {JwtUser} from '$lib/types/user';

declare global {
  namespace App {
    interface Locals {
      user: JwtUser;
    }

    // interface Platform {}
    interface Session {
      uid: string;
      rank: EUserRanks;
    }

    // interface Stuff {}
  }
}
