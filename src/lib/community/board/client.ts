import ky from 'ky-universal';
import type {IArangoDocumentIdentifier} from '$lib/database';
import type {IBoardConfig} from '$lib/types/board';

export class Board {
  constructor(readonly id: string) {
  }

  static async new(config: IBoardConfig): Promise<string> {
    const response = await ky.post('/community/admin/add?type=board', {
      json: config,
    });
    const {_key} = await response.json<IArangoDocumentIdentifier>();
    return _key;
  }

  /**
   *
   * @param after 여기에 주어진 게시글 번호 이후부터 불러옵니다.
   * @param order 정렬 순서입니다.
   * @return - 게시글 목록을 반환합니다. {_key, name, author(mapped), viewer, tags,}[]
   */
  async listArticles(after = '', order: 'asc' | 'desc' = 'desc') {
    const res = await ky.get(`/community/${this.id}/read?after=${after}&order=${order}`);

  }
}