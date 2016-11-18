/*==================================

	express 채팅서버 v1.0.1
	2016-11-08
	송진호 팀장
	로컬원격 수정사항 : fs.readFile

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
	
	fs.readFile( '/home/hosting_users/mimochat/apps/mimochat_mimochat/chat-ui-inde.html', 'utf-8', function(error, data){ // cafe24
	//fs.readFile( './chat-ui-inde.html', 'utf-8', function(error, data){		
		response.writeHead( 200, { 'Content-Type' : 'text/html' } );
		response.end( ejs.render(data, {
			room: room,
			id: userId,
			name: name,
			memlist: null			
		}) );
	}); 	
	
});

// Admin - id/pw 방식
app.get( '/:id/:pw' , function(request, response) {
    
	// params	
	var room = '관리자';           
	var userId = request.params.id;            
	var pw = request.params.pw; 	       
	var name = 'MiMO';
	
	if( userId == 'admin' && pw == 'okokchat' )
	{
		fs.readFile( '/home/hosting_users/mimochat/apps/mimochat_mimochat/chat-admin.html', 'utf-8', function(error, data){ // cafe24
		//fs.readFile( './chat-admin.html', 'utf-8', function(error, data){									
			
			console.log('admin 접속'); 			
			
			response.writeHead( 200, { 'Content-Type' : 'text/html' } );
			response.end( ejs.render(data, {
				room: room,
				id: userId,
				name: name,
				memlist: '관리자모드 접속중'			
			}) );
		}); 	
		
	}	
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
		
		disconnectSocket(data.room, socket.id, data.name);
		
		//addRoomMem(data.room, socket.id, data.name); // 방 멤버 추가! 		
			 		
		console.log( '소컷ID=> ' + socket.id+' 룸=> ' + data.room + ' JOIN 요청등록 ' + prtDate +'\n');
		

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
			 
			 publicMessage('reCon', data); // 전체 메세지
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
	
	/* 공지메세지
	==============================*/
	socket.on( 'notice', function(data){ //공지메세지
	
		console.log('관리자 메세지 수신: '+data.message);
		
		var prtDate = fns.getNowTime();	
		io.sockets.emit('message', {
			name : 'MiMO',
			message : data.message,
			date : prtDate			
		});		
		
		// 등록된 소켓ID의 메세지만 처리
		if( typeof sockIds[socket.id] != 'undefined' && typeof sockIds[socket.id].id != 'undefined' )
	  	{
			fns.dbInsert(socket.room, data.id, data.name, data.message, function(lastnum){				
				console.log(data);				
			});
		}				
	});
	
	
	
	/* 퇴장
	==============================*/
	socket.on('disconnect', function(data){  
	  
	  var prtDate = fns.getNowTime();
	  console.log( 'disconnect 이벤트 : ' + socket.id +' code: '+ data + '  ' + prtDate +'\n');
	  
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
		console.log('새방 개설!');
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
	
}

// 소켓을 끊는 함수
function disconnectSocket( room, sockid, name ) // 멤버속성을 키로 소켓을 찾아 끊는다.
{
	if(!sockRoom[room]){
		// 최초 방개설
		console.log('신규소켓으로 추가(1)');
		addRoomMem(room, sockid, name); // 방 멤버 추가! 	
		return;
	};
	
	console.log('소켓을 찾기...');
	
	var found = false;
	for ( val in sockRoom[room] ){			
		if( sockRoom[room][val].name == name )
		{			
			console.log('소켓을 찾았음. ' + val);
			
			found = true;
			
			delete sockRoom[room][val]; 	
			console.log('소켓을 끊고 메모리삭제 완료. ');
			
			io.sockets.to( val ).emit('message', { // Private 메세지
				name : 'MiMO',
				message : '서버와의 연결이 종료되었습니다.',
				code : 'closed',
				date : prtDate	
			});

			//io.sockets.connected[val].disconnect(); // 끊기		
			console.log('소켓으로 추가 ');		
			addRoomMem(room, sockid, name); // 방 멤버 추가! 	
				
			break;
		};
	};
	
	if(found == false)
	{
		console.log('신규소켓으로 추가(2)');
		addRoomMem(room, sockid, name); // 방 멤버 추가! 	
	}
}

function deleteRoomMem( room, sockid ) // 소켓id를 키로 찾아 배열에서 삭제
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
				 console.log('빈방: ' + room);
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
		
		case 'reCon' :			
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
		code : code,
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