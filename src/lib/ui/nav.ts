import {writable} from 'svelte/store';

// nav를 껏다 켤 수 있습니다.
export const toggle = writable<boolean>(true);