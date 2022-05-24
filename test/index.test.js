'use strict';

const assert = require('assert');
const nock = require('nock');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { MirrorConfig, mirrors } = require('..');

describe('test/index.test.js', () => {
  it('should mirrors exists', () => {
    assert.deepEqual(Object.keys(mirrors), [ 'china' ]);
    assert.equal(mirrors.china.sqlite3.host, 'https://cdn.npmmirror.com/binaries/sqlite3');
    assert.equal(mirrors.china.fsevents.host, 'https://cdn.npmmirror.com/binaries/fsevents');
    assert.equal(mirrors.china['flow-bin'].host, 'https://cdn.npmmirror.com/binaries/flow/v');
    assert.equal(mirrors.china.ENVS.CHROMEDRIVER_CDNURL, 'https://cdn.npmmirror.com/binaries/chromedriver');
  });

  describe('failure', () => {
    let nockScope;
    beforeEach(() => {
      nockScope = nock('https://registry.npmmirror.com')
        .persist()
        .get('/binary-mirror-config/latest')
        .reply(500);
    });

    afterEach(nock.cleanAll);
    it('should fail', async () => {
      const mirrorConfig = new MirrorConfig({
        retryCount: 2,
        retryTimeout: 300,
      });
      await mirrorConfig.init();
      assert(nockScope.isDone());
    });
  });

  describe('success', () => {
    let nockScope;
    beforeEach(() => {
      nockScope = nock('https://registry.npmmirror.com')
        .persist()
        .get('/binary-mirror-config/latest')
        .reply(200, {
          mirrors: {
            china: {
              canvas: {
                host: 'https://cdn.npmmirror.com/binaries/canvas',
              },
            },
          },
        });
    });
    afterEach(nock.cleanAll);
    it('should work', async () => {
      const mirrorConfig = new MirrorConfig({});
      await mirrorConfig.init();

      const pkg = {
        name: 'canvas',
        binary: {
          host: 'https://www.alipay.com',
        },
      };
      mirrorConfig.setMirrorUrl(pkg);

      assert.deepStrictEqual(pkg, {
        name: 'canvas',
        binary: {
          host: 'https://cdn.npmmirror.com/binaries/canvas',
        },
      });
      assert(nockScope.isDone());
    });
  });

  describe('method test', () => {
    let root;
    beforeEach(async () => {
      root = path.join(os.tmpdir(), Date.now() + '');
      fs.mkdir(root, {
        recursive: true,
      });
    });

    afterEach(async () => {
      console.info('rot: ', root);
      await fs.rmdir(root, {
        force: true,
        recursive: true,
      });
    });
    it('should work', async () => {
      const mirrorConfig = new MirrorConfig({});
      await mirrorConfig.init();
      const options = {
        env: {
        },
      };

      const pkg = {
        name: 'canvas',
        binary: {
          host: 'https://www.alipay.com',
        },
      };

      mirrorConfig.setEnvs(options);
      assert.deepStrictEqual(options, {
        env: {
          NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          NVM_NODEJS_ORG_MIRROR: 'https://cdn.npmmirror.com/binaries/node',
          PHANTOMJS_CDNURL: 'https://cdn.npmmirror.com/binaries/phantomjs',
          CHROMEDRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/chromedriver',
          OPERADRIVER_CDNURL: 'https://cdn.npmmirror.com/binaries/operadriver',
          ELECTRON_MIRROR: 'https://cdn.npmmirror.com/binaries/electron/',
          ELECTRON_BUILDER_BINARIES_MIRROR: 'https://cdn.npmmirror.com/binaries/electron-builder-binaries/',
          SASS_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-sass',
          SWC_BINARY_SITE: 'https://cdn.npmmirror.com/binaries/node-swc',
          NWJS_URLBASE: 'https://cdn.npmmirror.com/binaries/nwjs/v',
          PUPPETEER_DOWNLOAD_HOST: 'https://cdn.npmmirror.com/binaries',
          SENTRYCLI_CDNURL: 'https://cdn.npmmirror.com/binaries/sentry-cli',
          SAUCECTL_INSTALL_BINARY_MIRROR: 'https://cdn.npmmirror.com/binaries/saucectl',
          RE2_DOWNLOAD_MIRROR: 'https://cdn.npmmirror.com/binaries/node-re2',
          RE2_DOWNLOAD_SKIP_PATH: 'true',
          npm_config_keytar_binary_host: 'https://cdn.npmmirror.com/binaries/keytar',
          npm_config_sharp_binary_host: 'https://cdn.npmmirror.com/binaries/sharp',
          npm_config_sharp_libvips_binary_host: 'https://cdn.npmmirror.com/binaries/sharp-libvips',
          npm_config_robotjs_binary_host: 'https://cdn.npmmirror.com/binaries/robotjs',
        },
      });

      await mirrorConfig.updatePkg(root, pkg);
      const latestPkg = await fs.readFile(path.join(root, 'package.json'), 'utf8');
      assert.deepStrictEqual(JSON.parse(latestPkg), {
        name: 'canvas',
        binary: {
          host: 'https://cdn.npmmirror.com/binaries/canvas',
        },
      });
    });
  });
});
