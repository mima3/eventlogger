let clock;

QUnit.module(
  '初期化の確認', {
  before : function() {
    clock = sinon.useFakeTimers({
      now: new Date(2019, 1, 1, 0, 0),
      shouldAdvanceTime: false,
      advanceTimeDelta: 20
    });
  },
  after : function () {
    clock.restore();
  }
});
QUnit.test("window以外省略した場合、デフォルト値が設定されること", function(assert) {
  let logger = new StorageLogger({
    window : window
  });
  assert.equal(logger.window, window);
  assert.ok(typeof(logger.errorHandler) === 'function');
  assert.equal(logger.prefix, 'storagelogger');
  assert.equal(logger.key, 'storagelogger_1548946800000');
  assert.equal(logger.limitLine, 500);
});
QUnit.test("全て設定した場合、パラメータで指定した内容が設定されていること", function(assert) {
  let callback = function() {
  };
  let logger = new StorageLogger({
    window : window,
    errorHandler: callback,
    prefix : 'test',
    suffix: '12345',
    limitLine : 100
  });
  assert.equal(window , logger.window);
  assert.ok(typeof(logger.errorHandler) === 'function');
  
  assert.equal(logger.errorHandler, callback);
  assert.equal(logger.prefix, 'test');
  assert.equal(logger.key, 'test_12345');
  assert.equal(logger.limitLine, 100);

});

QUnit.module(
  'storage設定確認', {
  before : function() {
    clock = sinon.useFakeTimers({
      now: new Date(2019, 1, 1, 0, 0),
      shouldAdvanceTime: false,
      advanceTimeDelta: 20
    });
  },
  after : function () {
    clock.restore();
  }
});
QUnit.test("ログの最大値を超えたら先頭を削除すること", function(assert) {
  localStorage.clear();
  let logger = new StorageLogger({
    window : window
  });
  // 1回目追加
  logger.log('test1');
  // 確認
  let store = localStorage.getItem('storagelogger_1548946800000');
  assert.ok(typeof(store) === 'string');
  let storeObj = JSON.parse(store);
  assert.ok(Array.isArray(storeObj));
  assert.equal(storeObj.length, 1);
  assert.equal(storeObj[0].t, '1548946800000');
  assert.equal(storeObj[0].m, 'test1');

  // 2回目確認
  logger.log('test2');
  store = localStorage.getItem('storagelogger_1548946800000');
  storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 2);
  assert.equal(storeObj[1].t, '1548946800000');
  assert.equal(storeObj[1].m, 'test2');

  // 500回目までループ
  for (let i = 3; i <= 500; ++i) {
    logger.log('test' + i);
  }
  store = localStorage.getItem('storagelogger_1548946800000');
  storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 500);
  assert.equal(storeObj[0].m, 'test1');
  assert.equal(storeObj[499].m, 'test500');

  // 501回目　ローテ―トが始まる
  logger.log('test501');
  store = localStorage.getItem('storagelogger_1548946800000');
  storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 500);
  assert.equal(storeObj[0].m, 'test2');
  assert.equal(storeObj[498].m, 'test500');
  assert.equal(storeObj[499].m, 'test501');

  // 502回目　ローテ―ト中
  logger.log('test502');
  store = localStorage.getItem('storagelogger_1548946800000');
  storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 500);
  assert.equal(storeObj[0].m, 'test3');
  assert.equal(storeObj[497].m, 'test500');
  assert.equal(storeObj[498].m, 'test501');
  assert.equal(storeObj[499].m, 'test502');
});

QUnit.test("すでに最大を超える値が格納されている場合は現在の最大値になるまで先頭のデータを削除すること", function(assert) {
  localStorage.clear();
  let logger = new StorageLogger({
    window : window
  });
  for (let i = 0; i < 100; ++i) {
    logger.log('test' + (i + 1));
  }
  let store = localStorage.getItem('storagelogger_1548946800000');
  
  let storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 100);
  assert.equal(storeObj[0].m, 'test1');
  assert.equal(storeObj[99].m, 'test100');
  logger = null;
  //
  logger = new StorageLogger({
    window : window,
    limitLine : 5
  });
  logger.log('xxxxxx');
  // 確認
  store = localStorage.getItem('storagelogger_1548946800000');
  storeObj = JSON.parse(store);
  assert.equal(storeObj.length, 5);
  assert.equal(storeObj[0].m, 'test97');
  assert.equal(storeObj[1].m, 'test98');
  assert.equal(storeObj[2].m, 'test99');
  assert.equal(storeObj[3].m, 'test100');
  assert.equal(storeObj[4].m, 'xxxxxx');
});

QUnit.test("Suffixによる領域の分割ができていること", function(assert) {
  localStorage.clear();
  let logger1 = new StorageLogger({
    window : window,
    suffix : '1548946800001'
  });
  let logger2 = new StorageLogger({
    window : window,
    suffix : '1548946800002'
  });
  logger1.log('test1_1');
  logger1.log('test1_2');
  logger2.log('test2_1');
  logger2.log('test2_2');
  logger2.log('test2_3');
  
  var act = logger1.getAllLog();
  assert.equal(act['storagelogger_1548946800001'].length, 2);
  assert.equal(act['storagelogger_1548946800001'][0].m, 'test1_1');
  assert.equal(act['storagelogger_1548946800001'][1].m, 'test1_2');
  
  assert.equal(act['storagelogger_1548946800002'].length, 3);
  assert.equal(act['storagelogger_1548946800002'][0].m, 'test2_1');
  assert.equal(act['storagelogger_1548946800002'][1].m, 'test2_2');
  assert.equal(act['storagelogger_1548946800002'][2].m, 'test2_3');
});



QUnit.test("removeの確認.指定したストレージのキーのみ削除されること", function(assert) {
  localStorage.clear();
  //
  let logger1 = new StorageLogger({
    window : window,
    suffix : '1'
  });
  let logger2 = new StorageLogger({
    window : window,
    suffix : '2'
  });
  let logger3 = new StorageLogger({
    window : window,
    prefix : 'xxx',
    suffix : '3'
  });
  logger1.log('test1');
  logger2.log('test2');
  logger3.log('test3');
  
  let storeObj1 = JSON.parse(localStorage.getItem('storagelogger_1'));
  let storeObj2 = JSON.parse(localStorage.getItem('storagelogger_2'));
  let storeObj3 = JSON.parse(localStorage.getItem('xxx_3'));

  assert.equal(storeObj1.length, 1);
  assert.equal(storeObj1[0].m, 'test1');
  assert.equal(storeObj2.length, 1);
  assert.equal(storeObj2[0].m, 'test2');
  assert.equal(storeObj3.length, 1);
  assert.equal(storeObj3[0].m, 'test3');

  logger1.remove();
  storeObj1 = localStorage.getItem('storagelogger_1');
  storeObj2 = JSON.parse(localStorage.getItem('storagelogger_2'));
  storeObj3 = JSON.parse(localStorage.getItem('xxx_3'));
  assert.equal(storeObj1, null);
  assert.equal(storeObj2.length, 1);
  assert.equal(storeObj2[0].m, 'test2');
  assert.equal(storeObj3.length, 1);
  assert.equal(storeObj3[0].m, 'test3');
});

QUnit.test("clearの確認.prefixが一致するストレージのデータのみ削除されること", function(assert) {
  localStorage.clear();
  //
  let logger1 = new StorageLogger({
    window : window,
    suffix : '1'
  });
  let logger2 = new StorageLogger({
    window : window,
    suffix : '2'
  });
  let logger3 = new StorageLogger({
    window : window,
    prefix : 'xxx',
    suffix : '3'
  });
  logger1.log('test1');
  logger2.log('test2');
  logger3.log('test3');
  
  let storeObj1 = JSON.parse(localStorage.getItem('storagelogger_1'));
  let storeObj2 = JSON.parse(localStorage.getItem('storagelogger_2'));
  let storeObj3 = JSON.parse(localStorage.getItem('xxx_3'));

  assert.equal(storeObj1.length, 1);
  assert.equal(storeObj1[0].m, 'test1');
  assert.equal(storeObj2.length, 1);
  assert.equal(storeObj2[0].m, 'test2');
  assert.equal(storeObj3.length, 1);
  assert.equal(storeObj3[0].m, 'test3');

  logger1.clear();
  storeObj1 = localStorage.getItem('storagelogger_1');
  storeObj2 = localStorage.getItem('storagelogger_2');
  storeObj3 = JSON.parse(localStorage.getItem('xxx_3'));
  assert.equal(storeObj1, null);
  assert.equal(storeObj2, null);
  assert.equal(storeObj3.length, 1);
  assert.equal(storeObj3[0].m, 'test3');
});


QUnit.module(
  '異常処理の確認', {
  beforeEach : function() {
    clock = sinon.useFakeTimers({
      now: new Date(2019, 1, 1, 0, 0),
      shouldAdvanceTime: false,
      advanceTimeDelta: 20
    });
  },
  afterEach : function () {
    clock.restore();
    sinon.restore();
  }
});
QUnit.test("localStorage.setItemで例外が発生する場合に初期化時に設定したerrorHandlerが実行されること", function(assert) {
  // setItemで例外を発生させる
  let exception = new Error('QuotaExceededError');
  
  //EdgeだとlocalStorage.setItemが上書きできない。
  //let fakeStorage = sinon.fake.throws(exception);
  //sinon.replace(localStorage, 'setItem', fakeStorage);

  //
  let spyErrorHandle = sinon.spy();
  let logger = new StorageLogger({
    window : {
      localStorage : {
        setItem : function () {
          throw exception;
        },
        getItem : function () {
          return [];
        }
      }
    },
    errorHandler : spyErrorHandle
  });

  //
  logger.log('test');
  assert.ok(spyErrorHandle.calledWith('log', exception));
});

QUnit.test("localStorage.setItemで例外が発生する場合にerrorHandlerが未指定の場合はconsole.errorが実行されること", function(assert) {
  // setItemで例外を発生させる
  let exception = new Error('QuotaExceededError');
  //EdgeだとlocalStorage.setItemが上書きできない。
  //let fakeStorage = sinon.fake.throws(exception);
  //sinon.replace(localStorage, 'setItem', fakeStorage);

  let spyConsole = sinon.spy();
  sinon.replace(console, 'error', spyConsole);

  //
  let logger = new StorageLogger({
    window : {
      localStorage : {
        setItem : function () {
          throw exception;
        },
        getItem : function () {
          return [];
        }
      }
    }
  });

  //
  logger.log('test');
  assert.ok(spyConsole.calledWith('StorageLogger error %s %o', 'log', exception));
});

QUnit.test("localStorageにJSONではないデータが格納されていた場合", function(assert) {
  //
  let spyErrorHandle = sinon.spy();
  let logger = new StorageLogger({
    window : window,
    errorHandler : spyErrorHandle
  });
  localStorage.clear();
  localStorage.setItem('storagelogger_1548946800000', '{test:');
  //
  logger.log('test');
  assert.ok(spyErrorHandle.calledWith('getLog', sinon.match.any));
});
QUnit.test("localStorageに配列ではないデータが格納されていた場合", function(assert) {
  //
  let spyErrorHandle = sinon.spy();
  let logger = new StorageLogger({
    window : window,
    errorHandler : spyErrorHandle
  });
  localStorage.clear();
  localStorage.setItem('storagelogger_1548946800000', '{"test":"2"}');
  //
  logger.log('test');
  assert.ok(spyErrorHandle.calledWith('getLog', 'store data is not array.'));
});
