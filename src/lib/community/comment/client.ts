import {writable} from 'svelte/store';

export const currentReply = writable<string | undefined>();