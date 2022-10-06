const urllib = require('urllib');
const semver = require('semver');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify, debuglog } = require('util');

const sleep = promisify(setTimeout);
const debug = debuglog('binary-mirror-config');

exports.MirrorConfig = class MirrorConfig {
  constructor(options = {}) {
    this.pkgName = 'binary-mirror-config';
    this.tagName = 'latest';

    this.registry = options.registry || 'https://registry.npmmirror.com';

    this.config = {};
    this.envs = {};

    this.retryCount = options.retryCount || 5;
    this.retryTimeout = options.retryTimeout || 5000;

    this.console = options.console;
  }

  async init() {
    if (this.retryCount <= 0) {
      this.console.warn('[binary-init-config] binary mirror init timeout.');
      return;
    }
    const response = await urllib.request(`${this.registry}/${this.pkgName}/${this.tagName}`, {
      method: 'GET',
      dataType: 'json',
      followRedirect: true,
    });

    if (response.status !== 200) {
      this.retryCount -= 1;
      await sleep(this.retryTimeout);
      await this.init();
      return;
    }

    this.config = response.data.mirrors.china;
    this.envs = this.config.ENVS;
  }

  async setMirrorUrl(pkg, ungzipDir) {
    const pkgName = pkg.name;
    const binaryMirror = this.config[pkgName];
    if (binaryMirror) {
      const installScripts = pkg.scripts?.install;
      // node-pre-gyp
      if (installScripts && !binaryMirror.replaceHostFiles) {
        // leveldown, sqlite3, nodegit
        if (/prebuild --install|prebuild --download|node-pre-gyp install/.test(installScripts) ||
          // utf-8-validate
          /prebuild-install || node-gyp rebuild/.test(installScripts) ||
          [ 'nodegit', 'fsevents' ].includes(pkgName)
        ) {
          const newBinary = pkg.binary || {};
          for (const key in binaryMirror) {
            newBinary[key] = binaryMirror[key];
          }
          // ignore https protocol check on: node_modules/node-pre-gyp/lib/util/versioning.js
          if (/node-pre-gyp install/.test(installScripts)) {
            const versioningFile = path.join(ungzipDir, 'node_modules/node-pre-gyp/lib/util/versioning.js');
            try {
              await fs.stat(versioningFile);
              let content = await fs.readFile(versioningFile, 'utf-8');
              content = content.replace('if (protocol === \'http:\') {',
                'if (false && protocol === \'http:\') { // hack by npminstall');
              await fs.writeFile(versioningFile, content);
            } catch (_) {
              // ignore error
            }
          }
          this.console.info('%s download from binary mirror: %j',
            chalk.gray(`${pkgName}@${pkg.version}`), newBinary);
        }
      } else if ((binaryMirror.replaceHost && binaryMirror.host)
        || binaryMirror.replaceHostMap
        || binaryMirror.replaceHostRegExpMap) {
        // use mirror url instead
        // e.g.: pngquant-bin
        // https://github.com/lovell/sharp/blob/master/install/libvips.js#L19
        const replaceHostFiles = binaryMirror.replaceHostFiles || [
          'lib/index.js',
          'lib/install.js',
        ];
        for (const replaceHostFile of replaceHostFiles) {
          const replaceHostFilePath = path.join(ungzipDir, replaceHostFile);
          await this.replaceHostInFile(pkg, replaceHostFilePath, binaryMirror);
        }
      }

      // replace cypress download url
      // https://github.com/cypress-io/cypress/blob/master/cli/lib/tasks/download.js#L30
      if (pkgName === 'cypress') {
        const defaultPlatforms = {
          darwin: 'osx64',
          linux: 'linux64',
          win32: 'win64',
        };
        let platforms = binaryMirror.platforms || defaultPlatforms;
        // version >= 3.3.0 should use binaryMirror.newPlatforms by default, other use defaultPlatforms
        if (binaryMirror.newPlatforms && semver.gte(pkg.version, '3.3.0')) {
          platforms = binaryMirror.newPlatforms;
        }
        const targetPlatform = platforms[os.platform()];
        if (targetPlatform) {
          this.console.info('%s download from binary mirror: %j, targetPlatform: %s',
            chalk.gray(`${pkgName}@${pkg.version}`), binaryMirror, targetPlatform);
          const downloadFile = path.join(ungzipDir, 'lib/tasks/download.js');
          if (await fs.exists(downloadFile)) {
            let content = await fs.readFile(downloadFile, 'utf-8');
            // return version ? prepend('desktop/' + version) : prepend('desktop');
            const afterContent = 'return "' + binaryMirror.host + '/" + version + "/' + targetPlatform + '/cypress.zip"; // hack by npminstall\n';
            content = content
              .replace('return version ? prepend(\`desktop/${version}\`) : prepend(\'desktop\')', afterContent)
              .replace('return version ? prepend(\'desktop/\' + version) : prepend(\'desktop\');', afterContent);
            await fs.writeFile(downloadFile, content);
          }
        }
      } else if (pkgName === 'vscode') {
        // https://github.com/Microsoft/vscode-extension-vscode/blob/master/bin/install#L64
        const indexFilepath = path.join(ungzipDir, 'bin/install');
        await this.replaceHostInFile(pkg, indexFilepath, binaryMirror);
      }
    }
  }

  setEnvs(options) {
    for (const key in this.envs) {
      options.env[key] = this.envs[key];
    }
  }

  async updatePkg(dir, pkg) {
    await this.setMirrorUrl(pkg, dir);
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  }

  async replaceHostInFile(pkg, filepath, binaryMirror) {
    try {
      await fs.stat(filepath);
    } catch (e) {
      return;
    }

    let content = await fs.readFile(filepath, 'utf8');
    let replaceHostMap;
    // support RegExp string
    if (binaryMirror.replaceHostRegExpMap) {
      replaceHostMap = binaryMirror.replaceHostRegExpMap;
      for (const replaceHost in replaceHostMap) {
        const replaceAllRE = new RegExp(replaceHost, 'g');
        const targetHost = replaceHostMap[replaceHost];
        debug('replace %j(%s) => %s', replaceHost, replaceAllRE, targetHost);
        content = content.replace(replaceAllRE, targetHost);
      }
    } else {
      replaceHostMap = binaryMirror.replaceHostMap;
      if (!replaceHostMap) {
        let replaceHosts = binaryMirror.replaceHost;
        if (!Array.isArray(replaceHosts)) {
          replaceHosts = [ replaceHosts ];
        }
        replaceHostMap = {};
        for (const replaceHost of replaceHosts) {
          replaceHostMap[replaceHost] = binaryMirror.host;
        }
      }
      for (const replaceHost in replaceHostMap) {
        content = content.replace(replaceHost, replaceHostMap[replaceHost]);
      }
    }
    debug('%s: \n%s', filepath, content);
    await fs.writeFile(filepath, content);
    this.console.info('%s download from mirrors: %j, changed file: %s',
      chalk.gray(`${pkg.name}@${pkg.version}`),
      replaceHostMap,
      filepath);
  }
};
