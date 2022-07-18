import {writable} from 'svelte/store';
import type {IPublicNotify} from '$lib/types/notify';

export const notifications = writable<IPublicNotify>(undefined);