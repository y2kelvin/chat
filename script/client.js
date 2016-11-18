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