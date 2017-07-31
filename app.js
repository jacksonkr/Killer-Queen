"use strict";

process.on('uncaughtException', e => console.warn(e.stack));
process.on('warning', e => console.warn(e.stack));

const http = require('http');
const fs = require('fs');
global.fs = fs;
const port = 3000;
const app = http.createServer(function(req, res) {
	if(!req.url) req.url = "index.html";
	if(req.url == "/") req.url = "/index.html";

	var headers = {'Content-Type': 'text/html'};

	if(req.url.indexOf("css") >= 0)
		headers = {'Content-Type': 'text/css'};
    res.writeHead(200, headers);
    res.end(fs.readFileSync(__dirname + req.url));
});
const io = require('socket.io').listen(app);
global.io = io;
// module.exports = io;

io.on('connection', function(socket){
  console.log('a user connected');
});

app.listen(port);

const KQ = require("./game.js");

io.sockets.on("connection", socket => {
	var user = {};
	user.id = Date.now();
	user.keys = [];
	user.socket = socket;
	socket.user = user;
	KQ.Game.instance.users.push(user);
	user.toString = function() {
		var toonId = "";
		if(this.toonId) toonId = this.toonId;
		return this.id + ", " + toonId;
	}
	if(KQ.Game.instance.noUsersResetDelayTimeoutID) clearTimeout(KQ.Game.instance.noUsersResetDelayTimeoutID);

	KQ.Game.instance.dispatchEvent(new KQ.Event(KQ.CONST.MENU_UPDATE));

	KQ.Game.instance.addEventListener(KQ.CONST.GAME_RESET, event => {
		user.toonId = null;
	})

	socket.on(KQ.CONST.USER_CHARACTER_SELECT, data => {
		// make sure character isn't already taken
		var taken = false;
		KQ.Game.instance.users.forEach(u => {
			if(u.toonId == data.toonId) {
				socket.emit(KQ.CONST.ALERT, {text:"This character is already taken"});
				taken = true;
			}
		});
		if(taken) return;

		user.ready = false;
		user.toonId = data.toonId;

		KQ.Game.instance.dispatchEvent(new KQ.Event(KQ.CONST.MENU_UPDATE));
	});

	socket.on(KQ.CONST.USER_READY, data => {
		user.ready = data.ready;

		if(user.ready) {
			var e = new KQ.Event(KQ.CONST.USER_READY);
			e.extra = {user:user};
			KQ.Game.instance.dispatchEvent(e);

			if(KQ.Game.instance.gameInProgress) {
				// quick join, send only to this user -jkr
				user.socket.emit(KQ.CONST.GAME_START);
				return;
			}

			// if we're here then no game is in progress -jkr
			var gameReady = true;
			if(KQ.Game.instance.users.forEach(u => {
				if(!u.toonId || !u.ready) gameReady = false;
			}));

			// once all users are ready, start the countdown -jkr
			if(gameReady) {
				KQ.Game.instance.countDownStartTime = Date.now();
				KQ.Game.instance.dispatchEvent(new KQ.Event(KQ.CONST.GAME_COUNTDOWN));
			}
		}
	})

	socket.on(KQ.CONST.KEY_UPDATE, data => {
		user.keys = data;
	});

	// todo: check game ready on disconnect (in case users are in lobby and one leaves);
	socket.on('disconnect', data => {
		// socket.broadcast.emit(COMMAND.GOODBYE, user);
		var e = new KQ.Event(KQ.CONST.USER_DISCONNECT);
		e.extra = {user:user};
		KQ.Game.instance.dispatchEvent(e);


		user.toonId = undefined;
		for(var i in KQ.Game.instance.users) {
			var o = KQ.Game.instance.users[i];
			if(o.id == user.id) KQ.Game.instance.users.splice(i, 1);
		};

		console.log("DISCONNECT", KQ.Game.instance.users.length);

		if(KQ.Game.instance.users.length)
			KQ.Game.instance.dispatchEvent(new KQ.Event(KQ.CONST.MENU_UPDATE));
		else {
			KQ.Game.instance.noUsersResetDelayTimeoutID = setTimeout(() => {
				KQ.Game.instance.dispatchEvent(new KQ.Event(KQ.CONST.GAME_RESET));
			}, KQ.CONST.GAME_NO_USERS_RESET_DELAY);
		}
			
	});
});

new KQ.Game(); // singleton
KQ.Game.instance.loadLevel("index.html", "style.css");

console.log('server started');

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});