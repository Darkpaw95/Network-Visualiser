var socket_io = require('socket.io');
var config = require('./../../Config.js'); /********** CONSTANTS - BEGIN *********************/
var LOG_CHANNEL_NAME = "log"; //channel for sending the log notifications
var SIGNAL_CHANNEL_NAME = "signal"; //channel for sending the signal notifications
var TESTNET_STATUS_UPDATE_NAME = "testnet_status_update";
var SOCKET_LISTEN_PORT = config.Constants.socketPort; //port for socket connection
var LOG_LEVEL = 0; // 0 - ERROR, 1 - WARN, 2- INFO, 3 - DEBUG
/********** CONSTANTS - END *********************/
var SOCKET_IO_CONFIG = { 'log level': LOG_LEVEL }; //More info - https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO


io = socket_io.listen(SOCKET_LISTEN_PORT, SOCKET_IO_CONFIG);

io.sockets.on('connection', function(socket) {
  // Empty
});

exports.broadcastLog = function(data) {
  io.sockets.emit(LOG_CHANNEL_NAME, data);
};
exports.broadcastSignal = function(data) {
  io.sockets.emit(SIGNAL_CHANNEL_NAME, data);
};
exports.broadcastTestnetStatusUpdate = function(data) {
  io.sockets.emit(TESTNET_STATUS_UPDATE_NAME, data);
};
console.log('socket listening on ' + SOCKET_LISTEN_PORT);