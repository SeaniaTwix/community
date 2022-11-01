interface PageDataInternal {
  boardName: string,
  title: string,
  tagCounts: number,
  source: string,
  content: string,
  tags: string[],
  // editorKey: string,
}

export type PageData = PageDataInternal;