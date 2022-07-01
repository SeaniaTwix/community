import {writable} from 'svelte/store';

export function createWritableStore<T>(key: string, startValue: T) {
  const {subscribe, set} = writable<T>(startValue);
  return {
    subscribe,
    set,
    useLocalStorage: () => {
      const json = localStorage.getItem(key);
      if (json) {
        set(JSON.parse(json));
      }

      subscribe((current) => {
        localStorage.setItem(key, JSON.stringify(current));
      });
    },
  };
}

export const theme = createWritableStore('theme', { mode: 'dark' });