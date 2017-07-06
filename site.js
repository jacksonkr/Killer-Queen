"use strict";

window.onload = function() {
	const KQ = {
		KEY_UPDATE:"key_update",
		VIRTUAL_UPDATE:"virtual_update",
		CHARACTER_SELECT:"character_select",
		TEAM_BLUE:"teamBlue",
		TOON_QUEEN:"queen",
		TOON_WORKER:"worker"
	}

  var socket = io();

  socket.on(KQ.VIRTUAL_UPDATE, function(data) {
  	// try {
  		var keys = Object.keys(data.level);
  		keys.forEach((key) => {
		  	var o = data.level[key];
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

  socket.emit(KQ.CHARACTER_SELECT, {team:KQ.TEAM_BLUE, toon:KQ.TOON_QUEEN})
}