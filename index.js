const fs = require('fs/promises');
const path = require('path');
const urllib = require('urllib');
const sleep = require('mz-modules/sleep');

class MirrorConfig {
  constructor(options = {}) {
    this.pkgName = 'binary-mirror-config';
    this.tagName = 'latest';

    this.registry = options.registry || 'https://registry.npmmirror.com';

    this.config = {};
    this.envs = {};

    this.retryCount = options.retryCount || 5;
    this.retryTimeout = options.retryTimeout || 5000;
  }

  async init() {
    if (this.retryCount <= 0) {
      console.warn('[binary-init-config] binary mirror init timeout.');
      return;
    }
    const pkg = await urllib.request(`${this.registry}/${this.pkgName}/${this.tagName}`, {
      method: 'GET',
      dataType: 'json',
      followRedirect: true,
    });

    if (pkg.status !== 200) {
      this.retryCount -= 1;
      await sleep(this.retryTimeout);
      await this.init();
      return;
    }

    this.config = pkg.data.mirrors.china;
    this.envs = this.config.ENVS;
  }

  setMirrorUrl(pkg) {
    const pkgName = pkg.name;
    if (this.config[pkgName]) {
      pkg.binary.host = this.config[pkgName].host;
    }
  }

  setEnvs(options) {
    for (const key in this.envs) {
      options.env[key] = this.envs[key];
    }
  }

  async updatePkg(dir, pkg) {
    this.setMirrorUrl(pkg);
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  }
}

exports.mirrors = require('./package.json').mirrors;
exports.MirrorConfig = MirrorConfig;
