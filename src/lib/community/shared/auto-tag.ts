import type {ArticleItemDto} from '$lib/types/dto/article-item.dto';

export function initAutoTag(articleItem: ArticleItemDto): ArticleItemDto {
  const autoTag = /^[[(]?([a-zA-Z가-힣@]+?)[\])].+/gm;
  const regx = autoTag.exec(articleItem.title?.trim() ?? '');
  // console.log(item.title, regx);
  if (regx) {
    articleItem.autoTag = regx[1];
  }
  return articleItem;
}