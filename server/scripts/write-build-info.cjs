const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function formatGmt(date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' GMT');
}

const info = {
  commit: process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || git(['rev-parse', 'HEAD']) || 'dev',
  buildTimeGmt: process.env.BUILD_TIME_GMT || formatGmt(new Date()),
};

fs.writeFileSync(
  path.resolve(__dirname, '../build-info.json'),
  `${JSON.stringify(info, null, 2)}\n`,
);
