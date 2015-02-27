var socket = require('socket.io-client')('http://54.169.158.27:1114'); 
var fs = require('fs')
, path = require('path')
, _ = require('underscore');
var RaspiCam = require("raspicam");
var ss = require('socket.io-stream');
var dl  = require('delivery');
var async = require('async');
var stream = ss.createStream();
var delivery = null;

socket.on('connect',function(){
	console.log('socket connect')
	delivery = dl.listen( socket );
	delivery.connect();
	delivery.on('delivery.connect',function(delivery){
		console.log('connect success')

	});
})

socket.on('from_server_shot', function(data){
	console.log(data.message);
	if(data.message == "shot"){
		CameraOn(function(filename){
			console.log(filename)
			delivery.send({
				name: filename.name,
				path : filename.dir
			});
			delivery.on('send.success',function(file){
				console.log('File sent successfully!');
			});
		});
	}
});

socket.on('from_server_shot_list', function(data){
	getShotPhotoList(function(list){
		socket.emit('from_client_shot_list', list);
	})
});

socket.on('from_server_remove_shot_list', function(data){
	var dir = 'photo/';
	removeFolder(function(dir,callback){
		socket.emit('from_client_remove_shot_list', callback);
	})
});

socket.on('from_server_shot_name', function(data){
	fs.exists('photo/' + data.name , function(exists) {
		if(exists) {
			delivery.send({
				name: data.name,
				path : 'photo/' + data.name
			});
			delivery.on('send.success',function(file){
				console.log('File sent successfully!');
			});
		} else {
			delivery.send({
				name: null,
				path : null
			});
			delivery.on('send.success',function(file){
				console.log('File sent successfully!');
			});
		}
	})
})

function CameraOn(callback) {
	var date = new Date().getTime()
	var file = "photo/" + date + "img.png"
	var name = date + "img.png"
	var camera = new RaspiCam({
		mode: "photo",
		timeout: 1,
		quality: 100,
		width:960,
		height:1280,
		output: file
	});

	camera.on("started", function( err, timestamp ){
		console.log("video started at " + timestamp );
	});

	camera.on("read", function( err, timestamp, filename ){
		console.log("video captured with filename: " + filename + " at " + timestamp );
	});

	camera.on("exit", function( timestamp ){
		console.log("video child process has exited at " + timestamp );
		callback({dir:file,name:name})
	});

	camera.start();
}

function VideoOn(req, res) {
	var camera = new RaspiCam({
		mode: "video",
		output: "video/video.h264",
		framerate: 15,
		timeout: 20000 // take a 5 second video
	});

	camera.on("started", function( err, timestamp ){
		console.log("video started at " + timestamp );
	});

	camera.on("read", function( err, timestamp, filename ){
		console.log("video captured with filename: " + filename + " at " + timestamp );
	});

	camera.on("exit", function( timestamp ){
		console.log("video child process has exited at " + timestamp );
	});

	camera.start();
}

function getShotPhotoList(callback){
	var path = 'photo/';
	fs.exists(path,function(exists){
		if(exists){
			fs.readdir(path,function(err,list){
				callback(list)
			})
		} else {
			callback(null)
		}
	})
}

function removeFolder(location, next) {
    fs.readdir('photo', function (err, files) {
        async.each(files, function (file, cb) {
            file = location + '/' + file
            fs.stat(file, function (err, stat) {
                if (err) {
                    return cb(err);
                }
                if (stat.isDirectory()) {
                    removeFolder(file, cb);
                } else {
                    fs.unlink(file, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb();
                    })
                }
            })
        }, function (err) {
            if (err) return next(err)
            fs.rmdir(location, function (err) {
                return next(err)
            })
        })
    })
}


console.log('running');
