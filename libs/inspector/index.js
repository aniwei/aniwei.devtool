var net         = require('net'),
    uuid        = require('uuid'),
    bufferpack  = require('bufferpack'),
    parser      = require('bplist-parser'),
    creater     = require('bplist-creator'),
    plist       = require('plist'),
    Events      = require('events').EventEmitter,
    async       = require('async'),
    _           = require('lodash'),
    config      = require('./config'),
    Selector    = require('./selector'),
    noop        = function () {},
    slice       = [].slice;

module.exports = function (options) {
  var driver;

  options = options || {};
  options = _.assign(config, options);
  driver  = new Driver(options.app);

  return driver
    .set(options)
    .tcp()
    .attachEvent();
}

function Driver (app) {
  this.socket   = new net.Socket({
    type: 'tcp6'
  });

  this.selector = Selector();
}

Driver.prototype = {
  __proto__: Events.prototype,

  set: function (key, value) {
    var ctx     = this,
        setting = this.setting || (this.setting = {});

    if (typeof key == 'object') {
      Object.keys(key).forEach(function (k) {
        ctx.set(k, key[k]);
      });

      return this;
    }

    setting[key] = value;

    return this;
  },

  get: function (key) {
    var setting = this.setting || (this.setting = {});

    return setting[key];
  },

  tcp: function () {
    var type = this.get('type'),
        host = this.get('host'),
        port = this.get('port'),
        path = this.get('path'),
        sock = this.socket,
        argv = type == 'local' ? [port, host] : [path];

    argv.push(function () {
      
    });

    sock.connect.apply(sock, argv);

    return this;
  },

  attachEvent: function () {
    var socket  = this.socket,
        context = this,
        scl     = slice;

    ['data', 'close'].forEach(function (type) {
      socket.on(type, function () {
        var argv = scl.call(arguments);

        argv.unshift(type);

        context.dispatch.apply(context, argv);
      })
    });

    this.on('data', function () {
      var bufferCache = new Buffer(0);

      return (function (data) {
        var bplist,
            length,
            prefix,
            buffer,
            unpack,
            plist,
            i;

        bufferCache = Buffer.concat([bufferCache, data]);
        i           = 0;

        while (true) {
          buffer = bufferCache;

          if (buffer.length === 0) {
            break;
          }

          prefix = buffer.slice(i, i + 4);
          unpack = bufferpack.unpack('L', prefix);

          if (unpack) {
            length = unpack.pop();
          }
      

          if (buffer.length < length + 4) {
            break;
          }

          bufferCache   = buffer.slice(length + i + 4);
          i             = i + 4;
          bplist        = buffer.slice(i, length + 4);
          plist         = parser.parseBuffer(bplist);

          if (plist.length > 0) {
            this.response(plist.pop());
          }

          i = 0;
        }
      }).bind(context);
    }());

    this.on('close', function () {

    });

    this.on('error', function (err) {
      console.log(err)
    })

    return this;
  },

  dispatch: function (type) {
    this.emit.apply(this, arguments);

    return this;
  },

  toBplist: function (json) {
    return creater(json);
  },

  command: function (data, param) {
    var json = new Buffer(JSON.stringify({
          id: 1,
          method: data.method,
          param: data.param
        })),
        message;

    param = param || {};

    message = this.selector.select('command', json, param.page, param.app);

    return this.request(message);
  },

  connected: function () {
    var connected = this.selector.select('connected');

    return this.request(connected);
  },

  
  connect: function () {
    var connect = this.selector.select('connect');

    return this.request(connect);
  },

  listing: function (app) {
    var listing = this.selector.select('listing', app);

    return this.request(listing);
  },

  session: function (page) {
    var session = this.selector.select('session', page);

    return this.request(session)
  },

  response: function (plist) {
    var selector = plist.__selector,
        argv     = plist.__argument,
        type;

    type = selector.replace(/_rpc_|:/g, '');

    console.log(type)

    this.dispatch(type, argv);

    return this;
  },

  request: function (data) {
    var plist   = this.toBplist(data),
        socket  = this.socket;

    socket.write(bufferpack.pack('L', [plist.length]));
    socket.write(plist);

    return this;
  }
}