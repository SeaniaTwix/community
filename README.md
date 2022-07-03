# Community
## Requires
 * [NodeJS](https://nodejs.org) tested on 16.15.1^
 * [Svelte Kit](https://kit.svelte.dev)
 * [ArangoDB](https://www.arangodb.com)
 * Independent Websocket Server


### How to running
1. create new file on `$lib/editor-key.ts` for using tinymce.
   check `$lib/editor-key.example.ts`
2. `pnpm install`
3. `pnpm run build`
4. `env DB_PASSWORD=[YOUR ARANGO PASSWORD] PORT=[PORT WHAT YOU WANT] node build`