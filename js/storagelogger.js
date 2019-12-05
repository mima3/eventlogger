// args.window : window
// args.errorHandler : エラー発生時の処理
// args.prefix : Storageに保存する際の接頭語（デフォルトはstoragelogger）
// args.suffix : Storageに保存する際の接尾後（デフォルトは現在時刻)
// args.limitLine : Storageに保存するログの最大数（デフォルトは500)
const StorageLogger = function(args) {
  this.window = args.window;
  this.errorHandler = args.errorHandler;
  if (!this.errorHandler) {
    this.errorHandler = function(name, e) {
      console.error('StorageLogger error %s %o', name, e);
    };
  }
  this.prefix = args.prefix;
  if (!this.prefix) {
    this.prefix = 'storagelogger';
  }
  let suffix = args.suffix;
  if (!suffix) {
    suffix = (new Date()).getTime();
  }
  this.key = this.prefix + '_' + suffix;
  this.limitLine = args.limitLine;
  if (!this.limitLine) {
    this.limitLine = 500;
  }
};
StorageLogger.prototype.getAllLog = function() {
  let result = {};
  let keys = this.getTargetKeys();
  keys.forEach(function(key) {
    result[key] = JSON.parse(this.window.localStorage.getItem(key));
  });
  return result;
}

StorageLogger.prototype.getLog = function() {
  let result = this.window.localStorage.getItem(this.key);
  if (!result) {
    return [];
  }
  try {
    result = JSON.parse(result);
    if (!Array.isArray(result)) {
      this.errorHandler('getLog', 'store data is not array.');
      return [];
    }
    return result;
  } catch (e) {
    this.errorHandler('getLog', e);
    return [];
  }
};

StorageLogger.prototype.log = function(msg) {
  const logs = this.getLog();
  while (logs.length >= this.limitLine) {
    logs.shift();
  }
  logs.push({
    t: (new Date()).getTime(),
    m: msg
  });
  try {
    this.window.localStorage.setItem(this.key, JSON.stringify(logs));
  } catch (e) {
    this.errorHandler('log', e);
  }
};

StorageLogger.prototype.remove = function() {
  this.window.localStorage.removeItem(this.key);
};

StorageLogger.prototype.getTargetKeys = function() {
  let keys = [];
  for (let i = 0; i < this.window.localStorage.length; ++i) {
    const key = this.window.localStorage.key(i);
    if (key.indexOf(this.prefix) === 0) {
      keys.push(key);
    }
  }
  return keys;
}

StorageLogger.prototype.clear = function() {
  let keys = this.getTargetKeys();
  keys.forEach(function(key) {
    this.window.localStorage.removeItem(key);
  });
};
