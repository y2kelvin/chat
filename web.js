/*==================================

	express 채팅서버 v1.0.1
	2016-11-08
	송진호 팀장

==================================*/

var fs = require('fs');
var ejs = require('ejs');
var url = require('url');
var app = require('express')();
var http = require('http').createServer(app);
var socketio = require('socket.io');
var fns = require('./functions.js');
var sockIds = {};
var port = 8001;

fns.dbStart(); //database coinnect!

http.listen(port, function() {
     
	 console.log('Server running at '+port+' port');
	 
	 // 번호이후 대화내용 읽어오기
	 /*
	 fns.dbList('테니스', 20, function(data){		 
		 data.forEach(function(item, index)
		 {
			console.log(item.num + ' ['+item.user+']'+item.message);
		 });
	 });
	 */
});

// Client - room/id/name 방식
app.get( '/:code/:id/:name' , function(request, response) {
    
	// params
	var room = request.params.code;           
	var userId = request.params.id;           
	var name = request.params.name;   
	
	console.log('express get room: '+room+' userId: ' + userId + ' name: '+ name );		
	
	fs.readFile( '/home/hosting_users/mimochat/apps/mimochat_mimochat/chat-ui.html', 'utf-8', function(error, data){ // cafe24
	//fs.readFile( './chat-ui-inde.html', 'utf-8', function(error, data){		
		response.writeHead( 200, { 'Content-Type' : 'text/html' } );
		response.end( ejs.render(data, {
			room: room,
			id: userId,
			name: name			
		}) );
	}); 	
	
});

// 소켓 통신
var io = socketio.listen(http);
io.sockets.on( 'connection', function(socket){
	
	var prtDate = fns.getNowTime();
	console.log( '소컷ID: ' + socket.id+' 소켓 연결 ' + prtDate +'\n');
	
	/* 가입
	==============================*/
	socket.on( 'join', function(data){ //가입
		
		var prtDate = fns.getNowTime();				
		
		sockIds[socket.id] = [];
		sockIds[socket.id].id = data.id;
		sockIds[socket.id].name = data.name;
		console.log( '소컷ID: ' + socket.id+' JOIN 요청등록 ' + prtDate +'\n');
		
		socket.join(data.room); 			//사용자가 입력한 방에 socket을 참여시킨다.
		socket.room = data.room; 		//'room' 속성에 사용자가 입력한 방이름을 저장한다.
		var message = data.name+'님이 ' + data.room+'방에 입장하셨습니다.';
		/*
		io.sockets.in( socket.room ).emit('message', {
			name : 'MiMO',
			message : message,
			date : prtDate
	    });*/
		console.log('join> ' + message); 
		fns.dbInsert(socket.room, data.id, data.name, message, function(lastnum){			
			io.sockets.in( socket.room ).emit('message', {
				name : 'MiMO',
				message : message,
				date : prtDate,
				num : lastnum
			});
		}); // database
	});	
	
	
	/* 재가입
	==============================*/
	socket.on( 'rejoin', function(data){ 
		
		var prtDate = fns.getNowTime();				
		
		sockIds[socket.id] = [];
		sockIds[socket.id].id = data.id;
		sockIds[socket.id].name = data.name;
		console.log( '소컷ID: ' + socket.id+' RE-JOIN 요청등록 ' + prtDate +'\n');
		
		
		// Private 전송		
		fns.dbList( data.room, data.num, function(data){ // 번호이후 대화내용 읽어오기		
			 data.forEach(function(item, index)
			 {
				//console.log(item.num + ' ['+item.user+']'+item.message);
				// 누락된 대화내용 전송하기
				io.sockets.to( socket.id ).emit('message', {
					id : item.id,
					name : item.user,
					message : item.message,
					date : item.date,
					num : item.num
				});
			 });
		});
		/*		
		io.sockets.to( socket.id ).emit('message', {
			name : 'MiMO',
			message : 'rejoin 성공',
			date : prtDate
	    });
		*/		
		
		
		socket.join(data.room);
		socket.room = data.room; 
		var message = data.name+'님이 ' + data.room+'방에 입장하셨습니다. ';		
		
		console.log('rejoin> ' + message + ' rejoin-num: '+data.num); 		
		
		/*
		// db insert				
		fns.dbInsert(socket.room, data.id, data.name, message, function(lastnum){
			
			// 전체 전송
			io.sockets.in( socket.room ).emit('message', {
				name : 'MiMO',
				message : message,
				date : prtDate,
				num : lastnum
			});
			
		}); // database
		*/
	});	
	
	
	
	
	
	
	
	
	
	/* 메세지
	==============================*/
	socket.on( 'message', function(data){
		//'room' 속성값에 해당하는 방에 참여중인 Client에 메세지를 보낸다.
		console.log( 'message> id : %s, name : %s, msg : %s, date : %s', data.id, data.name, data.message, data.date );
		//io.sockets.in( socket.room ).emit('message', data); //public 통신 : io.sockets.emit(...);				
		
		// 등록되지 않은 소캣으로부터 메세지 수신시 error처리
		if( typeof sockIds[socket.id] != 'undefined' && typeof sockIds[socket.id].id != 'undefined' )
	  	{
			fns.dbInsert(socket.room, data.id, data.name, data.message, function(lastnum){				
				data.num = lastnum;
				console.log(data);
				io.sockets.in( socket.room ).emit('message', data); //public 통신 : io.sockets.emit(...);				
			});
		}
	});
	
	/* 퇴장
	==============================*/
	socket.on('disconnect', function(data){  
	  
	  var prtDate = fns.getNowTime();
	  console.log( '소컷ID: ' + socket.id +' code: '+ data + ' ... disconnect event At ' + prtDate +'\n');
	  
	  if( typeof sockIds[socket.id] != 'undefined' && typeof sockIds[socket.id].id != 'undefined' )
	  {
		
		  var room = socket.room;
		  var id = sockIds[socket.id].id;
		  var name = sockIds[socket.id].name;			  
		  var message = name+'님이 퇴장하셨습니다.';  			  

		  console.log('disconnect> ' + message);	  
		  
		  /*
		  fns.dbInsert(room, id, name, message, function(lastnum){
			
			  io.sockets.in( room ).emit('message', {
				name : 'MiMO',
				message : message,
				date : prtDate,
				num : lastnum
			  });
			 
		  }); // database
		  */
		  
		  delete sockIds[socket.id];	  
		  //console.log(' array length: ' + Object.keys(sockIds).length +'\n' );		  		  
	  }
	  else
	  {
		  console.log( '소컷ID: ' + socket.id+' 등록되지 않은 소켓 끊어짐 ' + prtDate +'\n');
	  }
	  
	  //socket.disconnect();	  
	  
	});
});