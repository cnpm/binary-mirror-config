'use strict';

const assert = require('assert');
const config = require('..');

describe('test/index.test.js', () => {
  it('should config exists', () => {
    console.log(config);
    assert.deepEqual(Object.keys(config), [ 'china' ]);
    assert.equal(config.china.sqlite3.host, 'https://cdn.npm.taobao.org/dist');
    assert.equal(config.china.fsevents.host, 'https://cdn.npm.taobao.org/dist/fsevents');
    assert.equal(config.china['flow-bin'].host, 'https://cdn.npm.taobao.org/dist/flow/v');
    assert.equal(config.china.ENVS.CHROMEDRIVER_CDNURL, 'https://tnpm-hz.oss-cn-hangzhou.aliyuncs.com/dist/chromedriver');
  });
});
