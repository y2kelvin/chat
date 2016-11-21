var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
server.listen(8080);
// 라우팅 
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/basic-client.html');
});
// 이 채팅 서버에 현재 접속한 사용자명을 저장할 변수
var usernames = {};
io.sockets.on('connection', function (socket) {
  // 클라이언트가 sendchat 이벤트를 전송할 경우 처리할 리스너 함수
  socket.on('sendchat', function (data) {
    // 클라이언트가 updatechat 함수를 실행하도록 알린다. 
    // 이때 updatechat 함수에 전달한 인자는 2개다.
    io.sockets.emit('updatechat', socket.username, data);
  });
  // 클라이언트가 adduser 이벤트를 전송할 경우 처리할 리스너 함수
  socket.on('adduser', function(username){
    // 이 클라이언트를 위한 소켓 세션에 username이라는 필드에 클라이언트가 전송한 값을 저장한다. 
    socket.username = username;
    // 클라이언트의 username을 사용자 목록을 관리하는 전역 변수인 usernames에 추가한다.
    usernames[username] = username;
    // 클라이언트에게 채팅 서버에 접속되었다고 알린다.
    socket.emit('updatechat', 'SERVER', 'you have connected');
    // 사용자가 채팅 서버에 추가되었다는 메시지를 전역으로(모든 클라이언트에게) 알린다.
    socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
    // 채팅을 사용하는 변경된 사용자 목록을 클라이언트에게 업데이트하도록 updateusers 함수를 실행하도록 알린다.
    io.sockets.emit('updateusers', usernames);
  });
  // 사용자가 접속을 끊을 경우 처리할 리스너 함수
  socket.on('disconnect', function(){
    i// 사용자 목록을 관리하는 전역변수에서 해당 사용자를 삭제한다.
    delete usernames[socket.username];
    // 채팅을 사용하는 변경된 사용자 목록을 클라이언트에게 업데이트하도록 updateusers 함수를 실행하도록 알린다.
    io.sockets.emit('updateusers', usernames);
    // 사용자가 채팅 서버에서 나갔다는 메시지를 전역으로(모든 클라이언트에게) 알린다.
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
  });
});