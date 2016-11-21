// JavaScript Document

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
	//return y.toString().substring(2,4) + '/' + mon + '/' + date +' ' + h + ':' + m + ':' + s;
	return mon + '/' + date +' ' + h + ':' + m ;
}

function nl2br (str, is_xhtml) {   
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';   
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}

function sendEmoticon(url)
{
	// 소켓변수 
	var uid = $('#uid').val();
	var name = $('#name').val();
	var msg = url;		
	var prtDate = getNowTime();

	// 소켓이벤트 
	socket.emit('emot', {
		id : uid,
		name : name,
		message : msg, // 이모티콘 아이콘 이미지 주소 
		date : prtDate,
		code : 'emot'
	}); 

}