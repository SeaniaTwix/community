import {existsSync, readFileSync} from 'node:fs';
import {last} from 'lodash-es';

const HEAD = './.git/logs/HEAD';

function parseGitLogHead(data: string): string | undefined {
  const lines = data.split('\n');
  const commits = lines.map((line) => {
    console.log(line)
    return last(line.split(/\s/, 2));
  }).filter(v => !!v);
  return last(commits);
}

export function getRecentCommit(): string | undefined {
  if (existsSync(HEAD)) {
    const data = readFileSync(HEAD).toString();
    return parseGitLogHead(data);
  }
}