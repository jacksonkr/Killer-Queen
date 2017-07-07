"use strict";

window.onload = function() {
	const KQ = {
		ALERT:"alert",
		KEY_UPDATE:"key_update",
		VIRTUAL_UPDATE:"virtual_update",
		CHARACTER_SELECT:"character_select",
		TEAM_BLUE:"teamBlue",
		TOON_QUEEN:"queen",
		TOON_WORKER:"worker",
		GAME_OVER:"game_over",
		WIN_ECONOMIC:"win_economic",
		WIN_MILITARY:"win_military",
		WIN_SNAIL:"win_snail",
	}

	window.characterSelected = (id) => {
		var e = new Event(KQ.CHARACTER_SELECT);
		e.toonId = id;
		window.dispatchEvent(e);
	}

  var socket = io();

  socket.on(KQ.GAME_OVER, data => {
  	alert("GAME OVER: " + data.type + " " + data.team)
  });

  socket.on(KQ.VIRTUAL_UPDATE, data => {
  	var updates = [];
  	updates.push.apply(updates, Object.values(data.level.toons)); // converting object to array
  	updates.push.apply(updates, data.level.berries);
  	// updates.push.apply(updates, [data.level.snail]);

  	// try {
  		updates.forEach(o => {
		  	var ele = document.getElementById(o.id);
		  	if(ele) {
					ele.style.left = o.left;
					ele.style.top = o.top;

					if(o.direction > 0) ele.classList.remove('direction-flip')
					else ele.classList.add('direction-flip');
				}
  		});
		// } catch(e) {
		// 	// it's time to shut it down
		// 	console.warn(e);
		// }
  });

  socket.on(KQ.CHARACTER_SELECT, data => {
  	document.getElementById('menu').classList.add('hide');
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

  window.addEventListener(KQ.CHARACTER_SELECT, (event) => {
  	socket.emit(KQ.CHARACTER_SELECT, {toonId:event.toonId})
  });

	// var loop = () => { // client side animations?
	// 	window.requestAnimationFrame(() => {
	// 		console.log(keys)

	// 		loop();
	// 	});
	// }
	// loop()
}