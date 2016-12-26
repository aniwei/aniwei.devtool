var uuid = require('uuid'),
    _    = require('lodash');

module.exports = function () {
  return new Selector();
}

function Selector () {
  this.id       = uuid.v4();
  this.sender   = uuid.v4();
  this.app      = null;
  this.page     = 1;

  this.rpcTable = {
    connect: '_rpc_reportIdentifier:',
    connected: '_rpc_getConnectedApplications:',
    listing: '_rpc_forwardGetListing:',
    session: '_rpc_forwardSocketSetup:',
    command: '_rpc_forwardSocketData:'
  };
}

Selector.prototype = {
  select: function (type) {
    var argv      = [].slice.call(arguments, 1),
        rpc       = this[type];

    return {
      __argument: rpc.apply(this, argv),
      __selector: this.rpcTable[type]
    };
  },

  connected: function () {
    return {
      WIRConnectionIdentifierKey: this.id
    }
  },

  connect: function () {
    return {
      WIRConnectionIdentifierKey: this.id
    }
  },

  listing: function (app) {
    var rpc = this.connect();

    this.app = app || this.app;
    
    rpc.WIRApplicationIdentifierKey = this.app;

    return rpc;
  },

  session: function (page, app) {
    var rpc = this.listing(app);

    this.page = page || this.page;

    rpc.WIRSenderKey          = this.sender;
    rpc.WIRPageIdentifierKey  = this.page;

    return rpc;
  },

  command: function (data, page, app) {
    var rpc = this.session(page, app);

    rpc.WIRSocketDataKey = data;

    return rpc;
  }
}

