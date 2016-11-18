// JavaScript Document
// 로컬원격 수정사항 : cafe24_config

exports.getNowTime = function ()
{			
	var day=new Date(); 
	var y=day.getYear(); 
	if(y<2000)y=y+1900; 
	var mon=day.getMonth()+1; 
	var date=day.getDate(); 
	var h = day.getHours();
	var m = day.getMinutes();
	var s = day.getSeconds();
	//return y.toString().substring(2,4) + '/' + mon + '/' + date +' ' + h + ':' + m + ':' + s;
	return mon + '/' + date +' ' + h + ':' + m ;
}

exports.sqlToJsDate = function (unixTimeStamp)
{
	var day=new Date(unixTimeStamp); 
	var y=day.getYear(); 
	if(y<2000)y=y+1900; 
	var mon=day.getMonth()+1; 
	var date=day.getDate(); 
	var h = day.getHours();
	var m = day.getMinutes();
	var s = day.getSeconds();
	//return y.toString().substring(2,4) + '/' + mon + '/' + date +' ' + h + ':' + m + ':' + s; 	
	return mon + '/' + date +' ' + h + ':' + m ;
}


// MySQL
var mysql = require('mysql');
var connection;
var Timer1;

// localhost
var db_config = {
	host     : 'localhost',
	user     : 'mimo',
	password : '6673',
	database : 'mimochat'
};
// cafe24
var cafe24_config = {
	 host     : '10.0.0.1',
	 port : 3306,
     user : 'mimochat',
     password : 'mimodbnoemi24',
     database : 'mimochat'
};

exports.dbStart = function ()
{
	dbconnect();
}

// Connect 연결 
var dbconnect = function ()
{	
	connection = mysql.createConnection(cafe24_config);
	
	connection.connect(function(err) { 
		if(err) { // or restarting (takes a while sometimes).
		  console.log('DB서버 연결도중 에러 발생 error when connecting to db:', err);
		  setTimeout(dbconnect, 2000); 
		}  	
		// connect success!
		connection.query('INSERT INTO `mimochat_tbl` (room, user, message, id, code, date) VALUES (?, ?, ?, ?, ?, now())', 
			['', 'server', 'DB서버 연결', '', 'mimo'], 
			function (err, results, fields){
				 if (err) throw err;
				 console.log('db connect Ok!');
			});
	});

	connection.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
		  	
		  console.log('PROTOCOL_CONNECTION_LOST DB서버와 연결이 끊어짐');
		  dbconnect();                         // lost due to either server restart, or a
		} else {                                      // connnection idle timeout (the wait_timeout
		  throw err;                                  // server variable configures this)
		}
	});
		
	Timer1 = setInterval(function(){ // KeepAlive
		keepalive();
	}, 1000*60*5);
}

// KeepAlive 연결유지
var keepalive = function () 
{
	connection.query('select 1', [], function(err, result) {
		if(err) {
			clearInterval(Timer1);		
			console.log(err);
			return;
		}
		// Successul keepalive
		console.log('KeepAlive Ok! ' + new Date());
	});
}

// Insert 쓰기
exports.dbInsert = function(room, id, name, msg, code, callback)
{	
	// 대화 저장
	connection.query('INSERT INTO `mimochat_tbl` (room, user, message, id, code, date) VALUES (?, ?, ?, ?, ?, now())', [room, name, msg, id, code], function (err, results, fields) {	
								 if (err) throw err;	
								 console.log('Insert Query Ok! ' + results.insertId);								 
								 callback(results.insertId); // 레코드번호
						  });
}

// 대화내용 불러오기
exports.dbList = function(room, from, callback)
{
	
	// 지난 대화 삭제쿼리
	connection.query('DELETE FROM `mimochat_tbl` WHERE room = ? AND date_format(`date`, \'%Y-%m-%d\') < date_add(now(), interval -2 day) ', [room], function(err, results) {
		if (err) throw err;	
		console.log('지난대화삭제 Query Ok!');		
	});		
	
	
	// from 이후 번호 읽어오기
	connection.query('SELECT * FROM `mimochat_tbl` WHERE room = ? and num > ? ORDER BY num', [room, from], function(err, results) {
		if (err) throw err;	
		console.log('List Query Ok!');
		callback(results);
	});	
}