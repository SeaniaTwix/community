import {writable} from 'svelte/store';

export const currentReply = writable<string | undefined>();
export const deletedComment = writable<string | undefined>();
export const highlighed = writable<string | undefined>();