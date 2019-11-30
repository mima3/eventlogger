// 以下参考にしながら実装
// https://github.com/SeleniumHQ/selenium-ide/blob/61eddf725e1a4422e9379c5a8e3b8d5a765bda78/packages/side-recorder/src/content/record-handlers.js
// args.window : 監視対象のwindow
// args.writeLogCallback : ログ書き込み時のコールバック
// args.secretElements : inputでvalueを隠す対象の要素の配列
const EventLogger = function(args) {
  this.events = [];
  this.window = args.window;
  this.window.addEventListener('click', this.clickHandler.bind(this), true);
  this.window.addEventListener('scroll', this.scrollHandler.bind(this), true);
  this.window.addEventListener('change', this.changeHandler.bind(this), true);
  this.window.addEventListener('message', this.messageHandler.bind(this), true);

  this.writeLogCallback = args.writeLogCallback;
  this.window.addEventListener('beforeunload', function() {
    if (this.writeLogCallback) {
      this.writeLogCallback(this.events);
    }
  }.bind(this));

  this.secretElements = args.secretElements;
  if (!this.secretElements) {
    this.secretElements = [];
  }

  this.preventClickTwice = false;
  this.lastEventTime = 0;
  this.lastEventName = '';
  this.lastLocator = '';
};
EventLogger.prototype.writeLog = function() {
  this.writeLogCallback(this.events);
  this.events = [];
};

EventLogger.prototype.record = function(eventName, target, params, waitTime) {
  const time = (new Date()).getTime();
  const locator = this.buildLocator(target);
  if (this.lastEventName === eventName &&
      JSON.stringify(this.lastLocator) === JSON.stringify(locator) &&
     (time - this.lastEventTime < waitTime)) {
    // 同じイベントが待機時間内に発生したらイベントを纏める
    this.events[this.events.length - 1].params = params;
    this.lastEventTime = time;
    return;
  }
  this.events.push({
    time: time,
    eventName: eventName,
    locator: locator,
    params: params,
  });
  this.lastEventName = eventName;
  this.lastLocator = locator;
  this.lastEventTime = time;
};

EventLogger.prototype.buildLocator = function(el) {
  // IDで解決できるならID
  if (el.id && (typeof (el.id) == 'string' || el.id instanceof String)) {
    return {id: el.id};
  }
  // nameで解決できるならname
  if (el.name && (typeof (el.name) == 'string' || el.name instanceof String)) {
    return {name: el.name, nameIndex: this.getNodeNbrSameName(el)};
  }
  // positionで解決する
  position = this.relativePosition(el);
  if (position) {
    return {position: position};
  }

  // あきらめる
  return {};
};

EventLogger.prototype.getNodeNbrSameName = function(current) {
  const childNodes = current.parentNode.childNodes;
  let total = 0;
  let index = -1;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeName == current.nodeName && child.name == current.name) {
      if (child == current) {
        index = total;
      }
      total++;
    }
  }
  return index;
};


EventLogger.prototype.getNodeNbr = function(current) {
  const childNodes = current.parentNode.childNodes;
  let total = 0;
  let index = -1;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeName == current.nodeName) {
      if (child == current) {
        index = total;
      }
      total++;
    }
  }
  return index;
};

EventLogger.prototype.relativePathFromParent = function(current) {
  const index = this.getNodeNbr(current);
  let currentPath = '/' + current.nodeName.toLowerCase();
  currentPath += '[' + (index) + ']';
  return currentPath;
};

EventLogger.prototype.relativePosition = function(el) {
  let path = '';
  let current = el;
  while (current.parentNode != null) {
    const currentPath = this.relativePathFromParent(current);
    path = currentPath + path;
    current = current.parentNode;
  }
  return path;
};


EventLogger.prototype.clickHandler = function(event) {
  if (event.button !== 0) {
    return;
  }
  if (this.preventClickTwice) {
    return;
  }
  this.preventClickTwice = true;

  this.record(
      'click',
      event.target,
      {
        offsetX: event.offsetX,
        offsetY: event.offsetY
      },
      0
  );
  const self = this;
  setTimeout(function() {
    self.preventClickTwice = false;
  }, 30);
};

EventLogger.prototype.scrollHandler = function(event) {
  this.record(
      'scroll',
      event.target,
      {
        x: window.pageXOffset,
        y: window.pageYOffset,
      },
      1000
  );
};

EventLogger.prototype.changeHandler = function(event) {
  if (!event.target.tagName) {
    return;
  }
  const tagName = event.target.tagName.toLowerCase();
  const typeName = event.target.type.toLowerCase();
  if ('input' === tagName) {
    if (typeName === 'checkbox' || typeName === 'radio') {
      return this.changeCheckHandler(event);
    } else {
      return this.changeInputHandler(event);
    }
  } else if ('textarea' === tagName) {
    return this.changeInputHandler(event);
  } else if ('select' === tagName) {
    return this.changeSelectHandler(event);
  }
  return;
};
EventLogger.prototype.changeInputHandler = function(event) {
  let value = event.target.value;
  const typeName = event.target.type.toLowerCase();
  if (typeName === 'password' ||
      this.secretElements.indexOf(event.target) >= 0) {
    value = '*****';
  }
  this.record(
      'input',
      event.target,
      {
        value: value,
      },
      0
  );
};
EventLogger.prototype.changeCheckHandler = function(event) {
  this.record(
      'check',
      event.target,
      {
        checked: event.target.checked,
      },
      0
  );
};

EventLogger.prototype.changeSelectHandler = function(event) {
  const selectIndex = [];
  const options = event.target.options;
  if (event.target.multiple) {
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectIndex.push(i);
      }
    }
  } else {
    selectIndex.push(options.selectedIndex);
  }
  this.record(
      'select',
      event.target,
      {
        selectIndex: selectIndex,
      },
      0
  );
};
EventLogger.prototype.messageHandler = function(event) {
  this.record(
      'message',
      event.target,
      {
        type: event.data.recordedType,
        message: event.data.recordedMessage,
        result: event.data.recordedResult,
      },
      0
  );
};
