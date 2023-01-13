import type {ServerLoadEvent} from '@sveltejs/kit';
import {User} from '$lib/auth/user/server';
import {type Actions, error} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type { PageData, ActionData } from './$types';
import {Permissions} from '$lib/community/permission/server';
import type {PermissionsFlags} from '$lib/community/permission/name';


export const actions: Actions = {
  default: async ({request, locals}): Promise<ActionData> => {
    if (!locals.user) {
      throw error(HttpStatus.UNAUTHORIZED);
    }

    const data = await request.formData();
    const permission: PermissionsFlags | File | null = data.get('permission') as any;
    const enabled = data.get('enabled') === 'true';
    const isValidPermission = permission && permission.toString() in Permissions.FLAGS
    if (!permission || typeof permission !== 'string' || !isValidPermission) {
      throw error(HttpStatus.BAD_REQUEST, 'permission key is invalid');
    }

    const user = User.fromSub(locals.user.sub);

    if (!user) {
      throw error(HttpStatus.BAD_GATEWAY, 'invalid user');
    }

    if (permission in Permissions.FLAGS) {
      const p = Permissions.FLAGS[permission];
      if (enabled) {
        await user.permissions.enable(p);
      } else {
        await user.permissions.disable(p);
      }
    }

    return {changed: true};
  }
}

export async function load({url}: ServerLoadEvent): Promise<PageData> {
  const uid = url.searchParams.get('uid');
  const result: PageData = {};
  if (uid) {
    const user = await User.findByUniqueId(uid);
    if (!user || !await user?.exists) {
      throw error(HttpStatus.NOT_FOUND, 'User not exists');
    }

    const permission = await user.permissions.get();
    if (permission) {
      result.userPermissions = permission;
    }
  }
  return result;
}