// Chat Server 1.0.0

var fs = require('fs');
var ejs = require('ejs');
var url = require('url');
var sys = require('sys');
var getNowTime = function ()
{			
	var day=new Date(); 
	var y=day.getYear(); 
	if(y<2000)y=y+1900; 
	var mon=day.getMonth(); 
	var date=day.getDate(); 
	var h = day.getHours();
	var m = day.getMinutes();
	var s = day.getSeconds();
	return y.toString().substring(2,4) + '/' + mon + '/' + date +' ' + h + ':' + m + ':' + s;
}

var server = require('http').createServer();
var sockIds = {};

server.listen(8001, function(){
	console.log('Server Running at port 8001');
});

server.on('request', function(req, res){ 
	
	// params
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	if( query.id && query.name ){
		var userId = query.id;
		var name = query.name;
		var room = query.room;
		console.log('request Call '+userId + '  name: '+ name+' room: '+room);	
	}
	else
	{
		var userId = '';
		var name = 'hidden';
		var room = 'room';
		console.log('request Call empty');	
	}
	
	fs.readFile( '/home/hosting_users/mimochat/apps/mimochat_mimochat/chat.html', 'utf-8', function(error, data){ // cafe24
	//fs.readFile( './chat.html', 'utf-8', function(error, data){		
		res.writeHead( 200, { 'Content-Type' : 'text/html' } );
		res.end( ejs.render(data, {
			id: userId,
			name: name,
			room: room
		}) );
	}); 
});

var io = require('socket.io').listen(server);

io.sockets.on( 'connection', function(socket){
	
	/* 가입
	==============================*/
	socket.on( 'join', function(data){ //가입
		
		var prtDate = getNowTime();
		
		/*test*/console.log(socket.id + ' join> '+data.name+'님이 ' + data.room+'방에 입장하셨습니다.'); // data : 사용자가 입력한 방이름
		sockIds[socket.id] = data.name;		
		
		socket.join(data.room); //사용자가 입력한 방에 socket을 참여시킨다.
		socket.room = data.room; //'room' 속성에 사용자가 입력한 방이름을 저장한다.
		io.sockets.in( socket.room ).emit('message', {
			id : 'server',
			message : data.name+'님이 ' + data.room+'방에 입장하셨습니다.',
			date : prtDate
		  });
	});	
	
	/* 메세지
	==============================*/
	socket.on( 'message', function(data){
		//'room' 속성값에 해당하는 방에 참여중인 Client에 메세지를 보낸다.
		console.log( 'message> id : %s, msg : %s, date : %s', data.id, data.message, data.date );
		io.sockets.in( socket.room ).emit('message', data); //public 통신 : io.sockets.emit(...);
	});
	
	/* 퇴장
	==============================*/
	socket.on('disconnect', function(data){  
	  var prtDate = getNowTime();
	  
	  console.log( socket.id+' disconnect event At ' + prtDate +'\n');
	  
	  io.sockets.in( socket.room ).emit('message', {
		id : 'server',
		message : sockIds[socket.id]+'님이 퇴장하셨습니다.',
		date : prtDate
	  });
	  
	  delete sockIds[socket.id];	  
	  console.log(' array length: ' + Object.keys(sockIds).length +'\n' );
	  
	});
});


