<script lang="ts">
  import type {PageData} from './$types';
  import Checkbox from '$lib/components/Checkbox.svelte';
  import PermissionNames, {type PermissionsFlags} from '$lib/community/permission/name';
  import {flags} from '$lib/community/permission/shared/flags';
  import ky from 'ky-universal';
  import {page} from '$app/stores';

  /**
   * 해당 유저 등급 변경 (관리자로 승격 등)
   * 단, 최고 관리자 계정으로만 접근 가능
   */
  export let data: PageData;
  let checks: Record<PermissionsFlags, boolean> = {
    ADD_TAG: false,
    ADULT: false,
    ALL: false,
    BAN_USER_PERMANENTLY: false,
    BAN_USER_TEMPORARY: false,
    CHANGE_PUB_BOARD: false,
    CHANGE_USERNAME: false,
    CHANGE_USER_GRANT: false,
    CHANGE_USER_PERMISSION: false,
    DELETE_ARTICLE: false,
    DELETE_BOARD: false,
    DELETE_COMMENT: false,
    EDIT_ARTICLE: false,
    EDIT_COMMENT: false,
    LOCK_BOARD: false,
    MANAGE_ARTICLE: false,
    MANAGE_BOARD: false,
    MANAGE_COMMENT: false,
    NEW_BOARD: false,
    READ_ARTICLE: false,
    READ_COMMENT: false,
    REMOVE_OWN_TAG: false,
    REMOVE_TAG: false,
    RENAME_BOARD: false,
    REORDER_BOARD: false,
    VIEW_ARTICLELIST: false,
    VIEW_BOARDLIST: false,
    VIEW_TAG_OWNER: false,
    WRITE_ARTICLE: false,
    WRITE_COMMENT: false
  }

  for (const name of Object.keys(flags)) {
    checks[name] = isChecked(flags[name]);
  }

  function isChecked(v: bigint) {
    return !!(data.userPermissions & v);
  }

  function changed(p: string, value: boolean) {
    const data = new FormData();
    data.set('permission', p);
    data.set('enabled', value.toString());
    ky.post($page.url.pathname, {
      body: data,
    }).then();
  }
</script>

<div class="w-10/12 md:w-3/5 lg:w-1/3 mx-auto space-y-4 py-4">
  <ol class="space-y-2">
    {#each Object.keys(flags) as pname}
      <li>
        <Checkbox bind:checked="{checks[pname]}"
                  on:change={() => changed(pname, checks[pname])}>
          {PermissionNames[pname]}
        </Checkbox>
      </li>
    {/each}
  </ol>
</div>