import type {LoadEvent, LoadOutput} from '@sveltejs/kit';
import HttpStatus from 'http-status-codes';
import {key} from '$lib/editor-key';
import type {ITag} from '$lib/types/tag';

type T = {edit: {title: string, content: string, tag: ITag[]}};

export async function load({params, url, fetch, session}: LoadEvent): Promise<LoadOutput> {
  const {id, article} = params;
  try {
    const editableRequest = await fetch(`/community/${id}/${article}/api/edit`);
    const {edit} = await editableRequest.json() as T;
    const {title, content, source, tags, tagCounts} = edit;
    const nr = await fetch(`/community/${id}/api/info`);
    const {name} = await nr.json();
    // console.log(edit);
    // noinspection TypeScriptUnresolvedFunction
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.OK,
      props: {
        board: params.id,
        article,
        name,
        title,
        tagCounts,
        source: source ?? '',
        content,
        tags: Object.values(tags).map(v => v.name),
        editorKey: key,
      },
    };
  } catch {
    throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
    return {
      status: HttpStatus.NOT_ACCEPTABLE,
    }
  }
}
