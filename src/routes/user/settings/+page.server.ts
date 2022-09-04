import type {ServerLoadEvent} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import type {PageData} from './$types';
import {redirect} from '$lib/kit';

export async function load({locals: {user, ui, settings}}: ServerLoadEvent): Promise<PageData> {
  if (!user) {
    throw redirect(HttpStatus.MOVED_TEMPORARILY, '/login');
  }

  return {
    leftAlign: ui.buttonAlign === 'left',
    settings,
  }
}
