var http = require('http');
var express = require('express');
var app = express();

http.createServer(app).listen(52700, function(){
	console.log('Server Running ...');
});

app.use(function( req, res){
	
	var agent = req.header('User-Agent');
	console.log(req.headers);
	//console.log(agent);
	
	var output = [];
	for(var i=0; i<3; i++)
	{
		output.push({
			count : i,
			name : 'name-'+i
		});
	}
	
	res.send(output);
});


