# Community
## Requires
 * [NodeJS](https://nodejs.org) tested on 16.15.1^
 * [Svelte Kit](https://kit.svelte.dev)
 * [ArangoDB](https://www.arangodb.com)
## Optional
 * Independent Websocket Server (If not available, some feature will not reload automatically)


### How to running
1. create new file on `$lib/editor-key.ts` for using tinymce.
   check `$lib/editor-key.example.ts`
2. `pnpm install`
3. `pnpm run build`
4. `env DB_PASSWORD=[YOUR ARANGO PASSWORD] PORT=[PORT WHAT YOU WANT] node ./run.js`

## Enviroment Variables
`!` is require. `?? [value]` is optional with default value
 * `IS_DEV` development flag `?`
 * `DB_USER` arangodb user name `? root`
 * `DB_ENDPOINT` arangodb endpoint `? http://localhost:8529`
 * `DB_PASSWORD` arangodb password `? root`
 * `PUSHER_KEY` independent ws server key. (not yet published) `?`
 * `ACCESS_KEY_ID` s3 relative `!`
 * `SECRET_ACCESS_KEY` s3 relative `!`
 * `BUCKET_REGION` s3 relative `!`
 * `S3_ENDPOINT` s3 relative `!`
 * `BUCKET_NAME` s3 relative `!`