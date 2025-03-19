const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');

const envs = pkg.mirrors.china.ENVS;

fs.writeFileSync(path.join(__dirname, '.env'),
  Object.entries(envs).map(([ key, value ]) => `${key}=${value}`).join('\n') + '\n');
