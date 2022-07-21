# Community
## License
all source is licensed as `BSD2` excepted the `static/favicon.svg` (it's copyrighted)

## Requires
 * [NodeJS](https://nodejs.org) tested on 16.15.1^
 * [Svelte Kit](https://kit.svelte.dev)
 * [ArangoDB](https://www.arangodb.com)

## Optional
 * Independent Websocket Server (If not available, some feature will not reload automatically)

### How to running (dev)
1. `pnpm install`
2. set env (detail below)
3. `pnpm run dev`
4. open web browser and goto `http://localhost:[PORT]`

### How to running (builded)
1. create new file on `$lib/editor-key.ts` for using tinymce.
   check `$lib/editor-key.example.ts`
2. `pnpm install`
3. `pnpm run build`
4. `env DB_PASSWORD=[YOUR ARANGO PASSWORD] PORT=[PORT WHAT YOU WANT] node ./run.js`
5. open webserver (like caddy) and set reverse proxy to `http://localhost:[PORT]`

## Enviroment Variables
`!` is require. `? [value]` is optional with default value
 * `IS_DEV` development flag `?`
 * `DB_USER` arangodb user name `? root`
 * `DB_ENDPOINT` arangodb endpoint `? http://localhost:8529`
 * `DB_PASSWORD` arangodb password `? root`
 * `PUSHER_KEY` independent ws server key. (not yet published) `?`
 * `ACCESS_KEY_ID` s3 relative `?` if not set, upload won't working
 * `SECRET_ACCESS_KEY` s3 relative `?` if not set, upload won't working
 * `BUCKET_REGION` s3 relative `?` if not set, upload won't working
 * `S3_ENDPOINT` s3 relative `?` if not set, upload won't working
 * `BUCKET_NAME` s3 relative `?` if not set, upload won't working
 * `SEARCH_KEY` meilisearch relative `?` if not set, search won't working