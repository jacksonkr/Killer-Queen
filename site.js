"use strict";

String.prototype.s2n = function() {
  try {
    // sanity check
    if(typeof(this) == "number") return this;

    let m = this.match(/\d+/);
    return Number(m[0]);
  } catch(e) {
    console.log(e);
    return null;
  }
}
String.prototype.n2s = Number.prototype.n2s = function() {
  try {
    return this.toString().replace("px", "") + "px";
  } catch(e) {
    console.log(e);
  }
}

window.onload = function() {
	const CONST = {
    ALERT:"alert",
    KEY_UPDATE:"key_update",
    VIRTUAL_UPDATE:"virtual_update",
    USER_CHARACTER_SELECT:"USER_CHARACTER_SELECT",
    USER_READY:"user_ready",
    USER_DISCONNECT:"user_disconnect",
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
    DIRECTION_RIGHT:"direction-right",
    DIRECTION_LEFT:"direction-left",
    DIRECTION_DOWN:"direction-down",
    MENU_UPDATE:"menu_update",
    KEY_UP:"ArrowUp",
    KEY_DOWN:"ArrowDown",
    KEY_LEFT:"ArrowLeft",
    KEY_RIGHT:"ArrowRight",
    GAME_RESET: "game_reset",

    // front end only
    GAME_DISPLAY_WIN_DELAY: 1.5 * 1000,
	}

	var game = {
		characterSelected:null
	};

  var socket = io();

  socket.on(CONST.GAME_WIN, data => {
  	// alert("GAME OVER: " + data.type + " " + data.team)

    let d = CONST.GAME_DISPLAY_WIN_DELAY;

    // delay before showing the game over screen
    window.setTimeout(() => {
      let div = document.getElementById("game-over");
      div.classList.remove("hide");

      div = document.getElementById("win-text").innerHTML = data.type;

      div = document.getElementById("win-mask");

      // position circle mask effect

      // getting :before info isn't working ??? -jkr
      let pe = window.getComputedStyle(div, ":before");
      // let top = data.focus.top - pe.height.s2n() / 2;
      // let left = data.focus.left - pe.width.s2n() / 2;

      let top = data.focus.top - 50;
      let left = data.focus.left - 50;

      div.style.top = top;
      div.style.left = left;
    }, d);
  });

  socket.on(CONST.GAME_COUNTDOWN, data => {
  	var ele = document.getElementById("countdown");
  	ele.classList.remove("hide");

  	ele.innerHTML = data.time;
  });

  socket.on(CONST.GAME_RESET, data => {
  	console.log("!! GAME RESET")

  	document.getElementById('menu').classList.remove("hide");
    document.getElementById('game-over').classList.add("hide");
  });

  socket.on(CONST.GAME_START, data => {
  	document.getElementById('game-over').classList.add("hide");
  	var list = document.getElementsByTagName("li");
  	for(var i in list) {
  		var li = list[+i];
  		if(li) li.classList.remove('selected');
  	}
  	document.getElementById('player-ready').classList.remove('selected');
  	document.getElementById('countdown').classList.add('hide');
  	document.getElementById('menu').classList.add('hide');
  });

  socket.on(CONST.VIRTUAL_UPDATE, data => {
  	// try {
  		data.forEach(o => {
		  	var ele = document.getElementById(o.id);
		  	if(ele) {
					ele.style.left = o.left;
					ele.style.top = o.top;

					ele.classList.remove('direction-left');
					ele.classList.remove('direction-right');
					ele.classList.remove('direction-down');
					ele.classList.add(o.direction);

					if(o.warrior == true) ele.classList.add("warrior");
					else ele.classList.remove("warrior");

					if(o.Invulnerable == true) ele.classList.add("invulnerable");
					else ele.classList.remove("invulnerable");

					if(o.attacking > 0) ele.classList.add("attacking");
					else ele.classList.remove("attacking");

					if(o.speedUpgrade > 0) ele.classList.add("speed-upgrade");
					else ele.classList.remove("speed-upgrade");

					if(o.id.indexOf("shrine") > -1) {
						if(o.affiliation == CONST.TEAM_BLUE) ele.classList.add("blue");
						else ele.classList.remove("blue");

						if(o.affiliation == CONST.TEAM_GOLD) ele.classList.add("gold");
						else ele.classList.remove("gold");

						console.log(o.affiliation);
					}
				}
  		});
		// } catch(e) {
		// 	// it's time to shut it down (potential hack?)
		// 	console.warn(e);
		// }
  });

  socket.on(CONST.MENU_UPDATE, data => {
  	var list = document.getElementById("menu").getElementsByTagName("li");
  	for(var i in list) {
  		var li = list[+i];
  		if(li) li.classList.remove("taken");
  	}

  	data.users.forEach(user => {
  		var li = document.getElementById("menu-" + user.toonId);
  		if(li) li.classList.add("taken");
  	});

  	// if(!data.gameInProgress) {
  		document.getElementById('menu').classList.remove("hide");
  	// }
  });

  socket.on(CONST.ALERT, (data) => {
  	window.alert(data.text);
  })

  var keys = [];

  var keyDown = key => {
  	if(keys.indexOf(key) < 0) {
	  	keys.push(key);
	  	socket.emit(CONST.KEY_UPDATE, keys);
	  }
  }
  var keyUp = key => {
  	var xo = keys.indexOf(key);
  	if(xo > -1) {
  		keys.splice(xo, 1);
  		socket.emit(CONST.KEY_UPDATE, keys);
  	}
  }
  window.addEventListener("keydown", function(event) {
  	keyDown(event.key);
  });
  window.addEventListener("keyup", function(event) {
  	keyUp(event.key);
  });

  window.addEventListener("touchstart", function(event) {
  	keyDown(CONST.KEY_UP);
  });
  window.addEventListener("touchend", function(event) {
  	keyUp(CONST.KEY_UP);
  });

  window.addEventListener("deviceorientation", function(event) {
  	if(!event.beta) return;

  	if(event.beta < 5) {
  		keyUp(CONST.KEY_RIGHT);
  		keyDown(CONST.KEY_LEFT);
  	}
  	if(event.beta > 5) {
  		keyUp(CONST.KEY_LEFT);
  		keyDown(CONST.KEY_RIGHT);
  	}
  });

  // mobile disable scrolling
  document.ontouchmove = function(event){
    event.preventDefault();
	}
	// "force" landscape
	document.addEventListener("orientationchange", function(event) {
    switch(window.orientation) 
    {  
        case -90: case 90:
            /* Device is in landscape mode */
            break; 
        default:
            /* Device is in portrait mode */
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

		socket.emit(CONST.USER_CHARACTER_SELECT, {toonId:id});
	}

	window.playerReady = () => {
		var ele = document.getElementById("player-ready");
		ele.classList.add("selected");

		socket.emit(CONST.USER_READY, {
			ready:ele.classList.contains("selected")
		});


	}
}