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
var sockRoom = {};
var port = 8001;

fns.dbStart(); //database coinnect!
var prtDate = fns.getNowTime();

http.listen(port, function() {
     
	 console.log('Server running at '+port+' port');	 
});

// Client - room/id/name 방식
app.get( '/:code/:id/:name' , function(request, response) {
    
	// params
	var room = request.params.code;           
	var userId = request.params.id;           
	var name = request.params.name;   	
	//console.log('express get room: '+room+' userId: ' + userId + ' name: '+ name );		
	
	//fs.readFile( '/home/hosting_users/mimochat/apps/mimochat_mimochat/chat-ui-inde.html', 'utf-8', function(error, data){ // cafe24
	fs.readFile( './chat-ui-inde.html', 'utf-8', function(error, data){		
		response.writeHead( 200, { 'Content-Type' : 'text/html' } );
		response.end( ejs.render(data, {
			room: room,
			id: userId,
			name: name,
			memlist: null			
		}) );
	}); 	
	
});

// 소켓 통신
var io = socketio.listen(http);
io.sockets.on( 'connection', function(socket){
	
	//console.log( '소컷ID: ' + socket.id+' 소켓 연결 ' + prtDate +'\n');
	
	/* 가입
	==============================*/
	socket.on( 'join', function(data){ //가입
		
		var prtDate = fns.getNowTime();				
		var room = data.room;
		
		sockIds[socket.id] = [];
		sockIds[socket.id].id = data.id;
		sockIds[socket.id].name = data.name;		
		socket.join(room); 			//사용자가 입력한 방에 socket을 참여시킨다.
		socket.room = room; 		//'room' 속성에 사용자가 입력한 방이름을 저장한다.		
		addRoomMem(data.room, socket.id, data.name); // 방 멤버 추가! 			 		
		console.log( '소컷ID: ' + socket.id+' JOIN 요청등록 ' + prtDate +'\n');
		

		// 개인 메세지
		
		var msg = {			
			message : '2일전 대화내용까지 표시됩니다.'
		}	
		privateMessage('msg', socket.id, msg); // Private 메세지
					
		
		// 이전대화내용 전송
		
		fns.dbList( data.room, 0, function(result){ // 처음부터 
			 
			 result.forEach(function(item, index)
			 {	
				io.sockets.to( socket.id ).emit('message', { // Private 메세지
					id : item.id,
					name : item.user,
					message : item.message,
					date : fns.sqlToJsDate(item.date),
					num : item.num
				});
			 });
			
			 publicMessage('join', data); // 전체 메세지
		});
		
	});	
	
	
	/* 재가입
	==============================*/
	socket.on( 'rejoin', function(data){ 
		
		var prtDate = fns.getNowTime();				
		var room = data.room;
		
		sockIds[socket.id] = [];
		sockIds[socket.id].id = data.id;
		sockIds[socket.id].name = data.name;		
		socket.join(room);
		socket.room = room; //소켓 룸속성 저장
		addRoomMem(data.room, socket.id, data.name); // 방 멤버 추가! 
		
		
		// 이전대화내용 전송
		
		fns.dbList( data.room, data.num, function(result){ // 최근 대화내용 읽어오기 (요청번호)
			
			 result.forEach(function(item, index)
			 {		
				io.sockets.to( socket.id ).emit('message', { // Private 메세지
					id : item.id,
					name : item.user,
					message : item.message,
					date : fns.sqlToJsDate(item.date),
					num : item.num
				});
			 });
			 
			 publicMessage('rejoin', data); // 전체 메세지
		});
		
		console.log('reCon> ' +  data.name + '님 재접속 ' +  data.num);
		
	});	
	
	
	/* 재접속 - Public 메세지 생략한다. 
	==============================*/
	socket.on( 'reCon', function(data){ 
		
		var prtDate = fns.getNowTime();				
		var room = data.room;
		
		sockIds[socket.id] = [];
		sockIds[socket.id].id = data.id;
		sockIds[socket.id].name = data.name;		
		socket.join(room);
		socket.room = room; //소켓 룸속성 저장
		addRoomMem(data.room, socket.id, data.name); // 방 멤버 추가! 
		
		
		// 이전대화내용 전송
		
		fns.dbList( data.room, data.num, function(result){ // 최근 대화내용 읽어오기 (요청번호)
			
			 result.forEach(function(item, index)
			 {		
				io.sockets.to( socket.id ).emit('message', { // Private 메세지
					id : item.id,
					name : item.user,
					message : item.message,
					date : fns.sqlToJsDate(item.date),
					num : item.num
				});
			 });
		});
		
		console.log('reCon> ' +  data.name + '님 재접속 ' + data.num); 			
		
	});	
	
	
	
	
	
	/* 메세지 수신
	==============================*/
	socket.on( 'message', function(data){
		
		console.log( 'message> id : %s, name : %s, msg : %s, date : %s', data.id, data.name, data.message, data.date );
				
		// 등록된 소켓ID의 메세지만 처리
		if( typeof sockIds[socket.id] != 'undefined' && typeof sockIds[socket.id].id != 'undefined' )
	  	{
			fns.dbInsert(socket.room, data.id, data.name, data.message, function(lastnum){				
				console.log(data);
				data.num = lastnum;				
				io.sockets.in( socket.room ).emit('message', data); // public 메세지
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
			deleteRoomMem(room, socket.id); // 방 멤버 삭제!
			delete sockIds[socket.id];	  
			//console.log(' array length: ' + Object.keys(sockIds).length +'\n' );	
			console.log('disconnect> ' + message);	  		  		  
			
			// 방 멤버 출력			
			var memList = [];			
			for ( val in sockRoom[room] ){						
				memList.push( sockRoom[room][val].name );
			};
			 
			// 전체전송			
			var message = name+'님이 ' + room+'방에서 퇴장하셨습니다.';	
			io.sockets.in( room ).emit('message', { // public 메세지
				name : 'MiMO',
				message : message,
				date : prtDate,
				code : 'discon',
				memlist : memList.toString()
			});						  		  
	  }
	  else
	  {
	  		console.log( '소컷ID: ' + socket.id+' 등록되지 않은 소켓 끊어짐 ' + prtDate +'\n');
	  }
	  
	});
});



// 함수

function addRoomMem(room, sockid, name)
{
	/************************************************************
		room 객체 생성 mrm 추가
	************************************************************/	
	if(!sockRoom[room]){
		sockRoom[room] = {};			
	};
	sockRoom[room][sockid] = [];
	sockRoom[room][sockid].name = name;	
	console.log('add room members : '+sockRoom[room][sockid].name);

	// 출력
	var memList = [];
	for ( val in sockRoom[room] ){			
		memList.push( sockRoom[room][val].name );
	};		
	console.log('current room members : '+memList.toString());
	/************************************************************/
}

function deleteRoomMem( room, sockid )
{
	/************************************************************
		room mem 객체 제거
	************************************************************/				
	for ( val in sockRoom[room] ){			
		if( val == sockid )
		{
			 console.log('delete room member : '+ sockRoom[room][val].name );
			 delete sockRoom[room][val];
			 
			 if( Object.keys(sockRoom[room]).length == 0 )
			 {
				 // 멤버가 모두 탈퇴하면 객체삭제
				 console.log('room mem cnt: 0 then delete room!');
				 delete sockRoom[room];
			 }
			 break;
		}
	};	
		
	// 출력
	var memList = [];			
	for ( val in sockRoom[room] ){						
		memList.push( sockRoom[room][val].name );
	};		
	console.log('current room members : '+memList.toString());
	/************************************************************/
}

function publicMessage(code, data)
{
	var message = '';
	var room = data.room;
	
	switch(code)
	{
		case 'join' :		 			
			message = data.name+'님이 ' + room+'방에 입장하셨습니다. ';
			
			break;
		
		case 'rejoin' :			
			message = data.name+'님이 ' + room+'방에 재입장하셨습니다. ';			
			
			break;
			
		case 'notice' :
			message = data.message;			
			
			break;
	}
	
	console.log('join> ' + message); 				
	
	// 방 멤버 출력			
	var memList = [];			
	for ( val in sockRoom[room] ){						
		memList.push( sockRoom[room][val].name );
	};
					
	io.sockets.in( room ).emit('message', {
		name : 'MiMO',
		message : message,
		date : prtDate,
		memlist : memList.toString()
	});		
}

function privateMessage(code, socketid, data)
{
	switch(code)
	{
		case 'msg' :		 			
			
			io.sockets.to( socketid ).emit('message', {				
				name : 'MiMO',
				message : data.message,
				date : prtDate				
			});		
			
			break;
	}	
}