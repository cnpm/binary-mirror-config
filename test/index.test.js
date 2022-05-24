'use strict';

const assert = require('assert');
const nock = require('nock');
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
});
