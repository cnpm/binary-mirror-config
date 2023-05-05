const assert = require('assert');
const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = require('urllib');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const pkgJSON = require('../package.json');
const { MirrorConfig, mirrors } = require('..');

const fixtures = path.join(__dirname, './fixtures');

describe('test/index.test.js', () => {
  const mockAgent = new MockAgent();
  const globalAgent = getGlobalDispatcher();

  before(async () => {
    await fs.mkdir(path.join(fixtures, 'canvas'), { recursive: true });
    await fs.mkdir(path.join(fixtures, 'cwebp-bin'), { recursive: true });
    await fs.mkdir(path.join(fixtures, 'sqlite3'), { recursive: true });
    setGlobalDispatcher(mockAgent);
  });

  after(async () => {
    setGlobalDispatcher(globalAgent);
    await mockAgent.close();
  });

  it('should mirrors exists', () => {
    assert.deepEqual(Object.keys(mirrors), [ 'china' ]);
    assert.equal(mirrors.china.sqlite3.host, 'https://cdn.npmmirror.com/binaries/sqlite3');
    assert.equal(mirrors.china.fsevents.host, 'https://cdn.npmmirror.com/binaries/fsevents');
    assert.equal(mirrors.china['flow-bin'].host, 'https://cdn.npmmirror.com/binaries/flow/v');
    assert.equal(mirrors.china.ENVS.CHROMEDRIVER_CDNURL, 'https://cdn.npmmirror.com/binaries/chromedriver');
  });

  describe('failure', () => {
    it('should fail', async () => {
      mockAgent.get('https://registry.npmmirror.com')
        .intercept({
          path: '/binary-mirror-config/latest',
          method: 'GET',
        })
        .reply(500)
        .times(2);

      const mirrorConfig = new MirrorConfig({
        retryCount: 2,
        retryTimeout: 300,
        console: globalThis.console,
      });
      await mirrorConfig.init();
      mockAgent.assertNoPendingInterceptors();
    });
  });

  describe('success', () => {
    it('should work', async () => {
      mockAgent.get('https://registry.npmmirror.com')
        .intercept({
          path: '/binary-mirror-config/latest',
          method: 'GET',
        }).reply(200, {
          mirrors: {
            china: {
              canvas: {
                host: 'https://cdn.npmmirror.com/binaries/canvas',
              },
              sqlite3: {
                host: 'https://cdn.npmmirror.com/binaries/sqlite3',
              },
            },
          },
        });

      const mirrorConfig = new MirrorConfig({
        console: globalThis.console,
      });
      await mirrorConfig.init();

      const pkg = {
        name: 'canvas',
        scripts: {
          install: 'node-pre-gyp install --fallback-to-build --update-binary',
        },
        binary: {
          module_name: 'canvas',
          module_path: 'build/Release',
          host: 'https://github.com/Automattic/node-canvas/releases/download/',
          remote_path: 'v{version}',
          package_name: '{module_name}-v{version}-{node_abi}-{platform}-{libc}-{arch}.tar.gz',
        },
      };
      mirrorConfig.setMirrorUrl(pkg, path.join(fixtures, 'canvas'));

      assert.deepStrictEqual(pkg, {
        name: 'canvas',
        scripts: {
          install: 'node-pre-gyp install --fallback-to-build --update-binary',
        },
        binary: {
          module_name: 'canvas',
          module_path: 'build/Release',
          remote_path: 'v{version}',
          package_name: '{module_name}-v{version}-{node_abi}-{platform}-{libc}-{arch}.tar.gz',
          host: 'https://cdn.npmmirror.com/binaries/canvas',
        },
      });
      mockAgent.assertNoPendingInterceptors();
    });
  });

  describe('method test', () => {
    let root;
    beforeEach(async () => {
      root = path.join(os.tmpdir(), Date.now() + '');
      fs.mkdir(root, {
        recursive: true,
      });
      mockAgent
        .get('https://registry.npmmirror.com')
        .intercept({
          path: '/binary-mirror-config/latest',
          method: 'GET',
        })
        .reply(200, pkgJSON);
    });

    afterEach(async () => {
      await fs.rm(root, {
        force: true,
        recursive: true,
      });
    });
    it('should work', async () => {
      const mirrorConfig = new MirrorConfig({
        console: globalThis.console,
      });
      await mirrorConfig.init();
      const options = {
        env: {
        },
      };

      const pkg = {
        name: 'canvas',
        scripts: {
          install: 'node-pre-gyp install --fallback-to-build --update-binary',
        },
        binary: {
          host: 'https://www.alipay.com',
        },
      };

      mirrorConfig.setEnvs(options);
      assert.deepStrictEqual(options, {
        env: {
          NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          COREPACK_NPM_REGISTRY: 'https://registry.npmmirror.com',
          NVM_NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          PHANTOMJS_CDNURL: 'https://cdn.npmmirror.com/binaries/phantomjs',
          CHROMEDRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/chromedriver',
          CYPRESS_DOWNLOAD_PATH_TEMPLATE: 'https://cdn.npmmirror.com/binaries/cypress/${version}/${platform}-${arch}/cypress.zip',
          OPERADRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/operadriver',
          ELECTRON_MIRROR: 'https://cdn.npmmirror.com/binaries/electron/',
          ELECTRON_BUILDER_BINARIES_MIRROR: 'https://cdn.npmmirror.com/binaries/electron-builder-binaries/',
          SASS_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-sass',
          SWC_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-swc',
          NWJS_URLBASE: 'https://cdn.npmmirror.com/binaries/nwjs/v',
          PUPPETEER_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          PUPPETEER_DOWNLOAD_BASE_URL: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          SENTRYCLI_CDNURL: 'https://cdn.npmmirror.com/binaries/sentry-cli',
          SAUCECTL_INSTALL_BINARY_MIRROR: 'https://cdn.npmmirror.com/binaries/saucectl',
          PLAYWRIGHT_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/playwright',
          RE2_DOWNLOAD_MIRROR: 'https://cdn.npmmirror.com/binaries/node-re2',
          RE2_DOWNLOAD_SKIP_PATH: 'true',
          npm_config_better_sqlite3_binary_host: 'https://cdn.npmmirror.com/binaries/better-sqlite3',
          npm_config_keytar_binary_host: 'https://cdn.npmmirror.com/binaries/keytar',
          npm_config_sharp_binary_host: 'https://cdn.npmmirror.com/binaries/sharp',
          npm_config_sharp_libvips_binary_host: 'https://cdn.npmmirror.com/binaries/sharp-libvips',
          npm_config_robotjs_binary_host: 'https://cdn.npmmirror.com/binaries/robotjs',
        },
      });

      await mirrorConfig.updatePkg(path.join(fixtures, 'canvas'), pkg);
      const latestPkg = await fs.readFile(path.join(fixtures, 'canvas/package.json'), 'utf8');
      assert.deepStrictEqual(JSON.parse(latestPkg), {
        name: 'canvas',
        scripts: {
          install: 'node-pre-gyp install --fallback-to-build --update-binary',
        },
        binary: {
          host: 'https://cdn.npmmirror.com/binaries/canvas',
        },
      });
    });

    it('should work with sqlite3', async () => {
      const mirrorConfig = new MirrorConfig({
        console: globalThis.console,
      });
      await mirrorConfig.init();
      const options = {
        env: {
        },
      };

      const pkg = {
        name: 'sqlite3',
        scripts: {
          install: 'prebuild --install',
        },
        binary: {
          module_name: 'node_sqlite3',
          module_path: './lib/binding/napi-v{napi_build_version}-{platform}-{libc}-{arch}',
          host: 'https://github.com/TryGhost/node-sqlite3/releases/download/',
          remote_path: 'v{version}',
          package_name: 'napi-v{napi_build_version}-{platform}-{libc}-{arch}.tar.gz',
          napi_versions: [
            3,
            6,
          ],
        },
      };

      mirrorConfig.setEnvs(options);
      assert.deepStrictEqual(options, {
        env: {
          NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          NVM_NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          COREPACK_NPM_REGISTRY: 'https://registry.npmmirror.com',
          PHANTOMJS_CDNURL: 'https://cdn.npmmirror.com/binaries/phantomjs',
          CHROMEDRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/chromedriver',
          CYPRESS_DOWNLOAD_PATH_TEMPLATE: 'https://cdn.npmmirror.com/binaries/cypress/${version}/${platform}-${arch}/cypress.zip',
          OPERADRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/operadriver',
          ELECTRON_MIRROR: 'https://cdn.npmmirror.com/binaries/electron/',
          ELECTRON_BUILDER_BINARIES_MIRROR: 'https://cdn.npmmirror.com/binaries/electron-builder-binaries/',
          SASS_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-sass',
          PLAYWRIGHT_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/playwright',
          SWC_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-swc',
          NWJS_URLBASE: 'https://cdn.npmmirror.com/binaries/nwjs/v',
          PUPPETEER_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          PUPPETEER_DOWNLOAD_BASE_URL: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          SENTRYCLI_CDNURL: 'https://cdn.npmmirror.com/binaries/sentry-cli',
          SAUCECTL_INSTALL_BINARY_MIRROR: 'https://cdn.npmmirror.com/binaries/saucectl',
          RE2_DOWNLOAD_MIRROR: 'https://cdn.npmmirror.com/binaries/node-re2',
          RE2_DOWNLOAD_SKIP_PATH: 'true',
          npm_config_better_sqlite3_binary_host: 'https://cdn.npmmirror.com/binaries/better-sqlite3',
          npm_config_keytar_binary_host: 'https://cdn.npmmirror.com/binaries/keytar',
          npm_config_sharp_binary_host: 'https://cdn.npmmirror.com/binaries/sharp',
          npm_config_sharp_libvips_binary_host: 'https://cdn.npmmirror.com/binaries/sharp-libvips',
          npm_config_robotjs_binary_host: 'https://cdn.npmmirror.com/binaries/robotjs',
        },
      });

      await mirrorConfig.updatePkg(path.join(fixtures, 'sqlite3'), pkg);
      const latestPkg = await fs.readFile(path.join(fixtures, 'sqlite3/package.json'), 'utf8');
      assert.deepStrictEqual(JSON.parse(latestPkg), {
        name: 'sqlite3',
        scripts: {
          install: 'prebuild --install',
        },
        binary: {
          module_name: 'node_sqlite3',
          module_path: './lib/binding/napi-v{napi_build_version}-{platform}-{libc}-{arch}',
          host: 'https://cdn.npmmirror.com/binaries/sqlite3',
          remote_path: 'v{version}',
          package_name: 'napi-v{napi_build_version}-{platform}-{libc}-{arch}.tar.gz',
          napi_versions: [
            3,
            6,
          ],
        },
      });
    });

    describe('modify file', () => {
      let latestFileIndexData;
      let latestFileInstallData;
      beforeEach(async () => {
        latestFileIndexData = await fs.readFile(path.join(fixtures, 'cwebp-bin/lib/index.js'), 'utf8');
        latestFileInstallData = await fs.readFile(path.join(fixtures, 'cwebp-bin/lib/install.js'), 'utf8');
      });
      afterEach(async () => {
        await fs.writeFile(path.join(fixtures, 'cwebp-bin/lib/index.js'), latestFileIndexData, 'utf8');
        await fs.writeFile(path.join(fixtures, 'cwebp-bin/lib/install.js'), latestFileInstallData, 'utf8');
      });
      it('should work with cwebp-bin', async () => {
        const mirrorConfig = new MirrorConfig({
          console: globalThis.console,
        });
        await mirrorConfig.init();
        const options = {
          env: {
          },
        };

        const pkg = {
          name: 'cwebp-bin',
          version: '8.0.0',
        };

        mirrorConfig.setEnvs(options);
        assert.deepStrictEqual(options.env, {
          NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          COREPACK_NPM_REGISTRY: 'https://registry.npmmirror.com',
          NVM_NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          PHANTOMJS_CDNURL: 'https://cdn.npmmirror.com/binaries/phantomjs',
          CHROMEDRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/chromedriver',
          CYPRESS_DOWNLOAD_PATH_TEMPLATE: 'https://cdn.npmmirror.com/binaries/cypress/${version}/${platform}-${arch}/cypress.zip',
          OPERADRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/operadriver',
          ELECTRON_MIRROR: 'https://cdn.npmmirror.com/binaries/electron/',
          ELECTRON_BUILDER_BINARIES_MIRROR: 'https://cdn.npmmirror.com/binaries/electron-builder-binaries/',
          SASS_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-sass',
          PLAYWRIGHT_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/playwright',
          SWC_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-swc',
          NWJS_URLBASE: 'https://cdn.npmmirror.com/binaries/nwjs/v',
          PUPPETEER_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          PUPPETEER_DOWNLOAD_BASE_URL: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
          SENTRYCLI_CDNURL: 'https://cdn.npmmirror.com/binaries/sentry-cli',
          SAUCECTL_INSTALL_BINARY_MIRROR: 'https://cdn.npmmirror.com/binaries/saucectl',
          RE2_DOWNLOAD_MIRROR: 'https://cdn.npmmirror.com/binaries/node-re2',
          RE2_DOWNLOAD_SKIP_PATH: 'true',
          npm_config_better_sqlite3_binary_host: 'https://cdn.npmmirror.com/binaries/better-sqlite3',
          npm_config_keytar_binary_host: 'https://cdn.npmmirror.com/binaries/keytar',
          npm_config_sharp_binary_host: 'https://cdn.npmmirror.com/binaries/sharp',
          npm_config_sharp_libvips_binary_host: 'https://cdn.npmmirror.com/binaries/sharp-libvips',
          npm_config_robotjs_binary_host: 'https://cdn.npmmirror.com/binaries/robotjs',
        });

        await mirrorConfig.updatePkg(path.join(fixtures, 'cwebp-bin'), pkg);

        const latestFileIndex = await fs.readFile(path.join(fixtures, 'cwebp-bin/lib/index.js'), 'utf8');
        const latestFileInstall = await fs.readFile(path.join(fixtures, 'cwebp-bin/lib/install.js'), 'utf8');
        assert.match(latestFileIndex, /https:\/\/cdn.npmmirror.com\/binaries\/cwebp-bin/);
        assert.match(latestFileInstall, /https:\/\/cdn.npmmirror.com\/binaries\/cwebp-bin/);
      });
    });
  });
});
