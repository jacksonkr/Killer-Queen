"use strict";

window.onload = function() {
	const KQ = {
		ALERT:"alert",
		KEY_UPDATE:"key_update",
		VIRTUAL_UPDATE:"virtual_update",
		CHARACTER_SELECT:"character_select",
		TEAM_BLUE:"teamBlue",
		TEAM_GOLD:"teamGold",
		TOON_QUEEN:"queen",
		TOON_WORKER:"worker",
		GAME_OVER:"game_over",
		GAME_COUNTDOWN:"game_countdown",
		GAME_START:"game_start",
		GAME_WIN:"game_win",
		WIN_ECONOMIC:"win_economic",
		WIN_MILITARY:"win_military",
		WIN_SNAIL:"win_snail",
		DIRECTION_RIGHT:1,
		DIRECTION_LEFT:-1,
		MENU_UPDATE:"menu_update",
		USER_READY:"user_ready",
	}

	var game = {
		characterSelected:null
	};

  var socket = io();

  socket.on(KQ.GAME_WIN, data => {
  	alert("GAME OVER: " + data.type + " " + data.team)
  });

  socket.on(KQ.GAME_COUNTDOWN, data => {
  	var ele = document.getElementById('countdown');
  	ele.classList.remove('hide');

  	ele.innerHTML = data.time;
  });

  socket.on(KQ.GAME_START, data => {
  	var list = document.getElementsByTagName("li");
  	for(var i in list) {
  		var li = list[+i];
  		if(li) li.classList.remove('selected');
  	}
  	document.getElementById('player-ready').classList.remove('selected');
  	document.getElementById('countdown').classList.add('hide');
  	document.getElementById('menu').classList.add('hide');
  });

  socket.on(KQ.VIRTUAL_UPDATE, data => {
  	var updates = [];
  	updates.push.apply(updates, Object.values(data.level.toons)); // converting object to array
  	updates.push.apply(updates, data.level.berries);
  	updates.push.apply(updates, [data.level.snail]);
  	updates.push.apply(updates, data.level.eggs);

  	// try {
  		updates.forEach(o => {
		  	var ele = document.getElementById(o.id);
		  	if(ele) {
					ele.style.left = o.left;
					ele.style.top = o.top;

					if(o.direction > 0) ele.classList.remove('direction-flip')
					else ele.classList.add('direction-flip');

					if(o.warrior == true) ele.classList.add("warrior");
					else ele.classList.remove("warrior");

					if(o.invulnerable == true) ele.classList.add("invulnerable");
					else ele.classList.remove("invulnerable");

					if(o.attacking > 0) ele.classList.add("attacking");
					else ele.classList.remove("attacking");
				}
  		});
		// } catch(e) {
		// 	// it's time to shut it down
		// 	console.warn(e);
		// }
  });

  socket.on(KQ.MENU_UPDATE, data => {
  	var list = document.getElementById("menu").getElementsByTagName("li");
  	for(var i in list) {
  		var li = list[+i];
  		if(li) li.classList.remove("taken");
  	}

  	data.users.forEach(user => {
  		var li = document.getElementById("menu-" + user.toonId);
  		if(li) li.classList.add("taken");
  	});

  	if(!data.gameInProgress) {
  		document.getElementById('menu').classList.remove("hide");
  	}
  });

  socket.on(KQ.ALERT, (data) => {
  	window.alert(data.text);
  })

  var keys = [];

  window.addEventListener("keydown", function(event) {
  	if(keys.indexOf(event.key) < 0) {
	  	keys.push(event.key);
	  	socket.emit(KQ.KEY_UPDATE, keys);
	  }
  });
  window.addEventListener("keyup", function(event) {
  	var xo = keys.indexOf(event.key);
  	if(xo > -1) {
  		keys.splice(xo, 1);
  		socket.emit(KQ.KEY_UPDATE, keys);
  	}
  });

	window.characterSelected = (ele, id) => {
		game.characterSelected = id;

		var list = document.getElementById("menu").getElementsByTagName('li');
		for(var i in list) {
			var li = list[+i];
			if(li) li.classList.remove("selected");
		}
		ele.classList.add("selected");

		document.getElementById("player-ready").disabled = false;
		document.getElementById("player-ready").classList.remove("selected");

		socket.emit(KQ.CHARACTER_SELECT, {toonId:id});
	}

	window.playerReady = () => {
		var ele = document.getElementById("player-ready");
		ele.classList.add("selected");

		socket.emit(KQ.USER_READY, {
			ready:ele.classList.contains("selected")
		});


	}
}