import type {Board} from '$lib/community/board/client';
import ky from 'ky-universal';
import type {IArangoDocumentIdentifier} from '$lib/database';
import { goto } from '$app/navigation';

export class Article {
  constructor(private readonly board: Board) {

  }

  async write(title: string, content: string, tags: string[]) {
    const res = await ky.post(`/community/${this.board.id}/api/write`, {
      json: {title, content, tags},
    });
    const {_key} = await res.json<IArangoDocumentIdentifier>();
    await goto(`/community/${this.board.id}/${_key}`);
  }
}