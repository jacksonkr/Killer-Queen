/**
 * VOICEOVER: teams during game, all during intermission
 * MENU: model KQ arcade??
 */


"use strict";

process.on('uncaughtException', e => console.warn(e.stack));
process.on('warning', e => console.warn(e.stack));

const http = require('http');
const fs = require('fs');
const port = 3000;
const app = http.createServer(function(req, res) {
	if(!req.url) req.url = "index.html";

	var headers = {'Content-Type': 'text/html'};

	if(req.url.indexOf("css") >= 0)
		headers = {'Content-Type': 'text/css'};
    res.writeHead(200, headers);
    res.end(fs.readFileSync(__dirname + req.url));
});
const io = require('socket.io').listen(app);

io.on('connection', function(socket){
  console.log('a user connected');
});

app.listen(port);

const KQ = {
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

	// server specific
	KEY_UP:"ArrowUp",
	KEY_DOWN:"ArrowDown",
	KEY_LEFT:"ArrowLeft",
	KEY_RIGHT:"ArrowRight",
	ATTACKED:"attacked",
	ATTACK_DURATION: 100,
	WORKER_SPEED: 2,
	WARRIOR_SPEED: 3,
	SHRINE_STANDING_LIMIT: 1 * 1000, // in milliseconds
	SNAIL_SPEED: 0.1,
	SNAIL_SWALLOW_DURATION: 3 * 1000,
	SNAIL_ATTACK: "snail_attack",
	GAME_START_DELAY: 0, // 3,
	GAME_RESET: "game_reset",
	GAME_NO_USERS_RESET_DELAY: 5 * 1000, // after no users for 5 seconds reset.
	JUMP:"jump",
	BERRY_TOON_OFFSET: {
		top: 16,
		left: 7
	},
	ELEMENT_OFFSCREEN_OFFSET: {
		top: -100,
		left: -100
	}
}


/**
 * target is what triggers the event dispatcher
 * currentTarget is what you assigned your listener to
 * todo: make a KQEventDispatcher by the parent class of all
 */
class KQEvent {
	constructor(type, target, priority) {
		if(priority === undefined) priority = 0;
		if(target === undefined) target = null;

		this.target = target;
		this.type = type;
		this.priority = priority;
	}

	get priority() {
		return this._priority;
	}
	set priority(v) {
		this._priority = v;
		if(KQEvent._listeners) KQEvent.prioritize();
	}

	static prioritize() {
		KQEvent._listeners.sort((a, b) => {
			if(a.priority > b.priority) return -1;
			if(a.priority < b.priority) return 1;
			return 0;
		});
	}

	static dispatchEvent(event) {
		if(!event) throw new Error("event must be defined!");
		if(!(event instanceof KQEvent)) throw new Error("event must be type KQEvent!");

		KQEvent._listeners.forEach(l => {
			if(l.type == event.type) l.callback(event);
		});
	}
	
	static addEventListener(currentTarget, type, callback, priority) {
		if(callback === undefined) throw new Error("undefined callback!", this);

		if(!KQEvent._listeners) KQEvent._listeners = [];

		KQEvent._listeners.push({currentTarget:currentTarget, type:type, callback:callback, priority:priority});
		KQEvent.prioritize();
	}
	static hasEventListener(type, currentTarget) {
		for(var i in KQEvent._listeners) {
			var l = KQEvent._listeners[i];

			if(l.type == type && l.currentTarget == currentTarget) return l;
		}

		return null;
	}
	static removeEventListener(event) {
		var list = KQEvent._listeners;
		for(var i in list) {
			var l = list[i];
			if(l.type == event.type
			&& l.currentTarget == event.currentTarget)
				// return KQEvent._listeners.splice(i, 1);
				return true;
		}

		return false;
	}
}

class KQCollideable {
	hitTest(x, y) {
		if(x >= this.left 
		&& x <= this.left + this.width
		&& y >= this.top
		&& y <= this.top + this.height)
			return true;

		return false;
	}

	/**
	 * https://stackoverflow.com/a/12067046/332578
	 * "if one or more expressions in the parenthese are true, 
	 * there's no overlapping. If all are false, there must 
	 * be an overlapping."
	 */
	hitTestBounds(box) {
		var b = this.boundingBox;
		var test = (b.x > box.x+box.width
			    || b.x+b.width < box.x
			    || b.y > box.y+box.height
			    || b.y+b.height < box.y);

		// console.log(b.x, '>', box.x+box.width)
		// console.log(b.x+b.width, '<', box.x)
		// console.log(b.y, '>', box.y+box.height)
		// console.log(b.y+b.height, '<', box.y)

		return !test;
	}

	// set boundingBox(b) {}
	get boundingBox() {
		return {
			x: this.left,
			y: this.top,
			width: this.width,
			height: this.height,
		}
	}
}
class KQElement extends KQCollideable {
	constructor() {
		super();

		KQEvent.addEventListener(this, KQ.GAME_START, () => {
			this.mReset();
		});
	}

	get initCSS() {
		return this._initCSS;
	}
	set initCSS(o) {
		this._initCSS = o;
		Object.assign(this, o);
	}

	mReset() {
		var id = "";
		if(this.constructor.name) id = this.constructor.name;
		if(this.id) id = this.id;
		// console.log("RESET", Date.now(), id);
	};
}
class KQGround extends KQElement {
	constructor(x, y, w, h) {
		super();

		this.left = x;
		this.top = y;
		this.width = w;
		this.height = h;
	}
}

class KQVirtual extends KQElement {
	constructor(id) {
		super();

		this.id = id;

		// placeholder values, real values come from css parsing (styles from elements on html level)
		this.left = 0;
		this.top = 0;
		this.width = 0;
		this.height = 0;
	}

	loop() {} // todo: replace with events now that they exist

	collission(o) {
		// console.log("COLLISSION", this.id, o.id);
	}

	mReset() {
		super.mReset();

		if(this.initCSS) this.initCSS = this.initCSS; // starts back at html location
	}

	get team() {
		if(!this.id) return null;

		var str = this.id.toLowerCase().match(/blue|gold/);
		if(!str || !str.length) return null;
		str = str[0];

		str = "team" + str.charAt(0).toUpperCase() + str.slice(1);

		return str
	}
}

class KQUpdateable extends KQVirtual {
	constructor(id) {
		super(id);

		if(!KQUpdateable._pendingUpdates)
			KQUpdateable._pendingUpdates = [];

		if(!KQUpdateable._copies) 
			KQUpdateable._copies = [];

		this.watchMe(); // send updates to browsers
	}

	/**
	 * only "flagged" objects are watched for changes
	 */
	watchMe() {
		// console.log('WATCH ME', this.id)
		KQEvent.addEventListener(this, KQ.LOOP, () => {
			this.updateLoop();
		});

		KQUpdateable.updateCopy(this);
	}

	/** 
	 * returns a stripped copy using only props from "propsToCheck"
	 */
	stripped() {

		var copy = {};

		KQUpdateable.propsToCheck.forEach(prop => {
			if(this[prop] !== undefined) {
				copy[prop] = this[prop];
			}
		});

		copy.id = this.id; // always keep the id, for bridging

		return copy;
	}

	static get propsToCheck() {
		return [
			"left",
			"top",
			"direction",
			"invulnerable",
			"attacking",
			"warrior",
		];
	}

	/**
	 * does an "deep" match for only updateable properties
	 * @return object returns null on non-match
	 */
	static stripMatch(o) {
		if(!KQUpdateable._copies[o.id]) return false;

		var copy = KQUpdateable._copies[o.id];

		var keys = Object.keys(copy);
		for(var i in keys) {
			var key = keys[i];

			if(o[key] != copy[key]) {
				return null;
			}
		};

		return copy;
	}

	/**
	 * stores an "old" copy of this object to be 
	 * compared against on the next loop
	 * @return boolean true if the copy was updated, false if it's the same
	 */
	static updateCopy(o) {
		if(KQUpdateable.stripMatch(o)) return false;

		// update the copy
		KQUpdateable._copies[o.id] = o.stripped();

		// todo: return ONLY the properties that updated
		return true;
	}

	updateLoop() {
		try {
			if(KQUpdateable.updateCopy(this)) {
				// something changed
				KQUpdateable.addUpdate(this);
			}
		} catch(e) {
			console.log(e);
		}
	}

	static addUpdate(o) {
		KQUpdateable._pendingUpdates.push(o.stripped());
	}

	static sendUpdates() {
		if(!KQUpdateable._pendingUpdates.length) return false; // no updates to send

		var arr = KQUpdateable._pendingUpdates.slice(0);
		io.sockets.emit(KQ.VIRTUAL_UPDATE, arr);

		KQUpdateable._pendingUpdates = [];
	}
}

class KQEgg extends KQUpdateable {
	constructor(id) {
		super(id);

		var e = KQEvent.hasEventListener(KQ.GAME_START, this, 1000);
	}

	static eggsForTeam(team) {
		var list = [];
		game.virtual.level.eggs.forEach(egg => {
			if(!egg.hatched && (egg.team == team)) {
				list.push(egg);
			}
		});

		return list;
	}

	hatch(queen) {
		this.hatched = true;

		console.log("HATCH", this.id)

		this.top = KQ.ELEMENT_OFFSCREEN_OFFSET.top;
		this.left = KQ.ELEMENT_OFFSCREEN_OFFSET.left;
	}

	mReset() {
		super.mReset();

		this.hatched = false;
	}
}

class KQBerry extends KQUpdateable {
	constructor(id) {
		super(id);

		this.toon = null;

		this.active = true;
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQWorker) {
			this.toon = o;

			KQEvent.addEventListener(this, KQ.SNAIL_ATTACK, event => {
				if(event.target == this.toon) {
					this.toon = false;
				}
			});
		}

		if(o instanceof KQGoal) {
			this.active = false;
			this.toon.loseBerry();
			this.toon = null;

			this.goal = o;
			this.top = o.top + o.height / 4;
			this.left = o.left + o.width / 3;
		}
	}

	/**
	 * only triggered by a powerup
	 * hides the berry off screen
	 */
	used() {
		this.toon = null;
		this.top = KQ.ELEMENT_OFFSCREEN_OFFSET.top;
		this.left = KQ.ELEMENT_OFFSCREEN_OFFSET.left;
	}

	goalCheck() {
		game.virtual.level.goals.forEach(goal => {
			if(!goal.berry 
			&& this.toon
			&& this.toon.team == goal.team
			&& goal.hitTestBounds(this.boundingBox)) {
				goal.collission(this);
				this.collission(goal);
			}
		});
	}

	loop() {
		super.loop();

		// be carried by the toon
		if(this.toon) {
			var dir_adjust = -1;
			if(this.toon.direction == KQ.DIRECTION_RIGHT) dir_adjust = 1;
			this.top = this.toon.top + KQ.BERRY_TOON_OFFSET.top;
			this.left = this.toon.left + this.toon.width/2 - this.width/2 - KQ.BERRY_TOON_OFFSET.left * dir_adjust;

			this.goalCheck();
		}
	}

	static getBerryByToon(toon) {
		var berries = game.virtual.level.berries;
		for(var i in berries) {
			var berry = berries[i];
			if(berry.toon == toon) return berry;
		}

		return false;
	}
}

class KQSnail extends KQUpdateable {
	constructor(id) {
		super(id);

		this.swallowing = false;
		this.speed = KQ.SNAIL_SPEED;

		KQEvent.addEventListener(this, KQ.SNAIL_ATTACK, event => {
			this.swallowing = true;
			setTimeout(() => {
				this.swallowing = false;
			}, KQ.SNAIL_SWALLOW_DURATION);
		});

		KQEvent.addEventListener(this, KQ.JUMP, event => {
			if(event.target == this.toon) {
				//jumped off the snail;
				this.toon = null;
			}
		});

		KQEvent.addEventListener(this, KQ.GAME_RESET, event => {
			this.mReset();
		});
	}

	collission(o) {
		if(o instanceof KQWorker) {
			if(!this.toon) {
				this.toon = o;

				KQEvent.addEventListener(this, KQ.ATTACKED, event => {
					if(event.target == this.toon) {
						console.log("SNAIL RIDER DEAD")
						this.toon = null;
						console.log(KQEvent.removeEventListener(event));
					}
				});
			} else {
				if(o.team != this.toon.team) {
					//swallow the enemy
					if(this.swallowing === false)
						KQEvent.dispatchEvent(new KQEvent(KQ.SNAIL_ATTACK, o));
				}
			}
		}

		if(o instanceof KQSnailCage) {
			game.win(KQ.WIN_SNAIL, this.toon.team);
		}
	}

	loop() {
		super.loop();

		if(this.toon) {
			// check collission against enemy toon (eat them)
			var keys = Object.keys(game.virtual.level.toons);
			keys.forEach(key => {
				var toon = game.virtual.level.toons[key];
				if(toon != this.toon 
				&& this.hitTestBounds(toon.boundingBox)) {
					this.collission(toon);
					toon.collission(this);
				}
			});

			// check collission against goal
			game.virtual.level.snailCages.forEach(cage => {
				if(this.hitTestBounds(cage.boundingBox)) {
					this.collission(cage);
				}
			});
		}
	}

	mReset() {
		super.mReset();

		this.toon = null;
	}

	goLeft() {
		if(!this.swallowing && this.toon && this.toon.team == KQ.TEAM_BLUE) {
			this.direction = KQ.DIRECTION_LEFT;
			this.left -= this.speed;
		}
	}

	goRight() {
		if(!this.swallowing && this.toon && this.toon.team == KQ.TEAM_GOLD) {
			this.left += this.speed;
			this.direction = KQ.DIRECTION_RIGHT;
		}
	}
}

class KQSnailCage extends KQVirtual {
	constructor(id) {
		super(id);
	}
}

class KQShrine extends KQUpdateable {
	constructor(id) {
		super(id);
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQWorker) {
			if(o.berry && o.standingTime > KQ.SHRINE_STANDING_LIMIT) 
				this.powerUp(o);
		}
	}

	powerUp(o) {
		var berry = KQBerry.getBerryByToon(o);
		if(berry) {
			berry.used();
			o.loseBerry();

			console.log('POWER UP', this.id, o.id);
		}
	}
}
class KQShrineSpeed extends KQShrine {
	constructor(id) {
		super(id);
	}

	powerUp(o) {
		super.powerUp(o);

		o.gainSpeed();
	}
}
class KQShrineWarrior extends KQShrine {
	constructor(id) {
		super(id);
	}

	powerUp(o) {
		super.powerUp(o);

		o.gainWarrior();
	}
}

class KQGoal extends KQVirtual {
	constructor(id) {
		super(id);

		KQGoal.goals.push(this);
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQBerry) {
			// this.berry = o; // CRASH WTF
			this.berry = true;
		}

		KQGoal.checkWin(this.team);
	}

	static get goals() {
		if(!KQGoal._goals) KQGoal._goals = [];
		return KQGoal._goals;
	}

	static checkWin(team) {
		var win = true;
		KQGoal.goals.forEach(goal => {
			if(goal.team != team) return;
			if(!goal.berry) win = false;
		});
		
		if(win) {
			game.win(KQ.WIN_ECONOMIC, team);
		}
	}
}

class KQToon extends KQUpdateable {
	constructor(id) {
		super(id);

		this.reset_delay = 3 * 1000;

		KQEvent.addEventListener(this, KQ.USER_READY, event => {
			if(event.target.toonId == this.id) {
				// toon is now human
				this.isAIPlayer = false;
			}
		});
		KQEvent.addEventListener(this, KQ.USER_DISCONNECT, event => {
			if(event.target.toonId && event.target.toonId == this.id) {
				// toon is now AI
				this.isAIPlayer = true;
			}
		});
	}

	/**
	 * using this so the character is not looking down while on the ground
	 */
	get direction() {
		return this._direction;
	}
	set direction(v) {
		if(v == null) {
			this._direction = this._last_horiz_direction;
			return;
		}

		// store only left/right direction
		if(v != KQ.DIRECTION_DOWN)
			this._last_horiz_direction = v;



		// down has priority of left/right when available
		if(this._direction == KQ.DIRECTION_DOWN) return;

		this._direction = v;
	}

	/**
	 * check if this toon is facing another toon 
	 */
	facing(enemy) {
		if(this.direction == KQ.DIRECTION_DOWN && enemy.top > this.top) return true;
		if(this.direction == KQ.DIRECTION_LEFT && enemy.left < this.left) return true;
		if(this.direction == KQ.DIRECTION_RIGHT && enemy.left > this.left) return true;

		return false;
	}

	aiCheck() {
		// human vs ai check
		this.isAIPlayer = true;
		game.users.some(user => {
			if(user.toonId == this.id) 
				this.isAIPlayer = false;
		});
	}

	get invulnerable() {
		return this._invulnerable;
	}
	set invulnerable(b) {
		if(this._invulnerableTimeoutID >= 0 && !b) clearTimeout(invulnerableTimeoutID);

		this._invulnerable = b;

		if(b === true) {
			this._invulnerableTimeoutID = setTimeout(() => {
				this.swallowTimeoutID = null;
				this.invulnerable = false;
			}, this.reset_delay);
		}
	}

	/**
	 * when the character is born / is reborn
	 */
	mReset() {
		super.mReset();

		this.aiCheck();

		this.invulnerable = true;
		super.mReset();

		this.accel = 0;
		this.speed = KQ.WORKER_SPEED;
		this.direction = KQ.DIRECTION_RIGHT;
	}

	attacked() {
		KQEvent.dispatchEvent(new KQEvent(KQ.ATTACKED, this));

		if(this.invulnerable) return;

		console.log("ATTACKED", this.id);
		this.mReset();
	}

	attack() {
		this.attacking = Date.now();
		setTimeout(() => {
			this.attacking = null;
		}, KQ.ATTACK_DURATION);
	}

	loop() {
		this.direction = null;

		// runs every frame
		this.gravityCheck(); // needs to be before ground
		this.groundCheck();
		this.visibilityCheck();
		this.roundNumbers();

		if(this.isAIPlayer === true) this.AILoop();
	}

	gravityCheck() {
		this.accel += game.props.gravity_rate;
		if(this.accel > game.props.gravity_max) this.accel = game.props.gravity_max;
		this.top += this.accel;
	}

	static findNearestElement(arr, o) {
		var distanceFrom = a => {
			return o.left - a.left + o.top - a.top;
		}

		var ret = null;
		arr.forEach(berry => {
			if(berry.active) {
				if(ret) {
					// is closer than current berry?
					if(distanceFrom(berry) < distanceFrom(ret)) ret = berry;
				} else {
					if(!berry.toon) ret = berry;
				}
			}
		});

		return ret;
	}

	AILoop() {
		if(!this.isAIPlayer) return;

		this.goRight();
		return;

		if(this.snail) {
			if(this.team == KQ.TEAM_BLUE) this.goLeft();
			if(this.team == KQ.TEAM_GOLD) this.goRight();
			return;
		}

		if(!this.berry) {
			// target nearest berry
			var b = KQWorker.findNearestElement(game.virtual.level.berries, this);
			// figure out how to get to berry
			if(b) {
				console.log(b.left, this.left);
				if(b.left < this.left) this.goLeft();
				if(b.left > this.left) this.goRight();
				return;
			}
		}

		if(this.berry) {
			// target nearest goal
			KQWorker.findNearestElement(game.virtual.level.goals, this);
		}
	}

	/**
	 * check offscreen / off level (repeat)
	 */
	visibilityCheck() {
		if(this.left + this.width/2 < 0) this.left = game.virtual.level.width - this.width/2;
		if(this.left + this.width/2 > game.virtual.level.width) this.left = 0;

	}

	roundNumbers() {
		this.left = Math.round(this.left);
		this.top = Math.round(this.top);
	}

	/**
	 * hittest against other toons
	 */
	toonCheck() {
		var keys = Object.keys(game.virtual.level.toons);
		keys.forEach(key => {
			var toon = game.virtual.level.toons[key];
			if(this == toon || this.team == toon.team) return;

			if(this.hitTestBounds(toon.boundingBox)) {
				this.collission(toon);
				toon.collission(this);
			}
		});
	}

	loseBerry() {
		this.berry = null;
	};

	/**
	 * boolean on whether the user is "grounded"
	 * check for collisions with the ground
	 * remedy collission by moving character
	 */
	groundCheck() {
		// check toons against ground items
		this.grounded = false;
		game.virtual.level.ground.forEach(gr => {

			// ?? check if ground item is even close to user
			// saves on processing ??

			// grounded check (check right below toon)
			if(gr.hitTest(this.left + this.width/2, this.top + this.height)) {
				this.grounded = true;
			}
			
			// bottom center (ground)
			while(gr.hitTest(this.left + this.width/2, this.top + this.height)) {
				this.top -= 0.1;
				this.accel = 0;
			}

			// top center (ceiling)
			while(gr.hitTest(this.left + this.width/2, this.top)) {
				this.top += 0.1;
				this.accel = 0;
			}

			// right middle (wall)
			while(gr.hitTest(this.left + this.width, this.top + this.height/2)) {
				this.left -= 0.1;
			}

			// left middle (wall)
			while(gr.hitTest(this.left, this.top + this.height/2)) {
				this.left += 0.1;
			}
		});
	}

	jump() {
		KQEvent.dispatchEvent(new KQEvent(KQ.JUMP, this));

		this.grounded = false;
		this.accel = -5;
	}

	goRight() {
		this.left += this.speed;
		this.direction = KQ.DIRECTION_RIGHT;
	}

	goLeft() {
		this.left -= this.speed;
		this.direction = KQ.DIRECTION_LEFT;
	}

	goDown() {
		this.top += this.speed
		if(!this.grounded) this.direction = KQ.DIRECTION_DOWN
	}
}
class KQWorker extends KQToon {
	constructor(id) {
		super(id);

		KQEvent.addEventListener(this, KQ.SNAIL_ATTACK, event => {
			if(this == event.target && !game.virtual.level.snail.swallowing) {
				this.swallowed();
			}
		});

		// REDUNTANT! worker already calls it's own attacked events on itself -jkr
		// KQEvent.addEventListener(this, KQ.ATTACKED, event => {
		// 	if(this == event.target) {
		// 		this.attacked();
		// 	}
		// });
	}

	unresponsive(bool) {
		if(bool === undefined) bool = true;

		this._unresponsive = bool;
	}

	swallowed() {
		this.active = false;

		this.loseBerry();

		// resposition in front of the snail
		var snail = game.virtual.level.snail;
		this.top = snail.top + this.height * 1.2;
		if(snail.direction == KQ.DIRECTION_LEFT)  this.left = snail.left - this.width / 2;
		if(snail.direction == KQ.DIRECTION_RIGHT) this.left = snail.left + snail.width;

		if(!this.swallowTimeoutID) {
			this.swallowTimeoutID = setTimeout(() => {
				this.mReset();
			}, KQ.SNAIL_SWALLOW_DURATION);
		}
	}

	jump() {
		if(this.grounded || this.warrior || this.snail) {
			super.jump();


			// todo: fix the snail jump off
			if(this.snail) {
				// jump off the snail
				if(this.snail.direction == KQ.DIRECTION_LEFT)
					this.left = this.snail.left - this.snail.width * 1;
				if(this.snail.direction == KQ.DIRECTION_RIGHT)
					this.left = this.snail.left + this.snail.width * 1.4;

				this.snail = null;
			}
		}
	}

	loop() {
		if(this.active === true) {
			super.loop();

			this.berryCheck();
			this.snailCheck();
			this.toonCheck();
			this.shrineCheck();
			this.standingCheck();
		}
	}

	attacked() {
		if(this.snail) {
			this.snail = null;
		}

		if(this.berry) {
			this.berry = null;
		}

		super.attacked();
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQBerry) {
			// this.berry = o; // wtf crash
			this.berry = true;
		}

		if(o instanceof KQSnail) {
			if(o.toon.id == this.id)
				this.snail = true;
		}

		if(o instanceof KQWorker) {
			if(o.warrior && o.attacking && o.facing(this)) this.attacked();
		}

		if(o instanceof KQQueen) {
			if(o.attacking && o.facing(this)) this.attacked();
		}

		if (o instanceof KQShrine) {

		}
	}

	/**
	 * keeps track of how long this toon has been standing
	 */
	standingCheck() {
		if(this._oldPos
		&& this._oldPos.left == this.left
		&& this._oldPos.top == this.top) {
			//still
			this.standingTime = Date.now() - this.standingStartTime;
		} else {
			//moving
			this._oldPos = {left:this.left,top:this.top};
			this.standingTime = 0;
			this.standingStartTime = Date.now();
		}
	}

	shrineCheck() {
		if(this.berry) { // only check if you have a berry
			game.virtual.level.shrines.forEach(shrine => {
				if(shrine.hitTestBounds(this.boundingBox)) {
					shrine.collission(this);
					this.collission(shrine);
				}
			});
		}
	}

	gainSpeed() {
		this.speed = KQ.WARRIOR_SPEED;
	}

	gainWarrior() {
		this.warrior = true;
	}

	attack() {
		if(this.warrior) super.attack();
	}

	mReset() {
		super.mReset();

		this.swallowTimeoutID = false;

		this.active = true;
		this.standingStartTime = 0;
		this.standingTime = 0;
		this.warrior = false;
		this.berry = null;
		this.snail = null;
	}

	berryCheck() {
		if(!this.berry && !this.warrior) { // make sure toon doesn't already have a berry
			game.virtual.level.berries.forEach(berry => {

				// todo: check for berry distance from user before processing

				if(!berry.goal && this.hitTestBounds(berry.boundingBox)) {
					this.collission(berry);
					berry.collission(this);
					return;
				}
			});
		}
	}

	snailCheck() {
		if(!this.warrior) {
			if(!this.snail) {
				var snail = game.virtual.level.snail;
				if(!snail.toon && snail.hitTestBounds(this.boundingBox)) {
					snail.collission(this);
					this.collission(snail);
				}
			} else {
				// show riding the snail
				this.top = game.virtual.level.snail.top;
				this.left = game.virtual.level.snail.left;
			}
		}
	}

	goLeft() {
		if(this.active === false) return;
		if(this.snail) game.virtual.level.snail.goLeft();
		else super.goLeft();
	}
	goRight() {
		if(this.active === false) return;
		if(this.snail) game.virtual.level.snail.goRight();
		else super.goRight();
	}
	goDown() {
		if(this.active === false) return;
		if(this.warrior) super.goDown();
	}
}
class KQQueen extends KQToon {
	constructor(id) {
		super(id);

		this.lives = 3;
		this.speed = 3;
	}

	attacked(attacker) {
		if(this.invulnerable) return;

		if(KQEgg.eggsForTeam(this.team).length) {
			super.attacked();
		} else {
			game.win(KQ.WIN_MILITARY, attacker.team);
		}
	}

	attack() {
		super.attack();

		// KQEgg.eggsForTeam(this.team).forEach(egg => {
		// 	console.log(egg.id, egg.hatched)
		// });

	}

	mReset() {
		super.mReset();

		try {
			// respawn at egg
			var eggs = KQEgg.eggsForTeam(this.team);
			var egg = eggs[0];
			console.log("RESPAWN AT EGG", egg.id, egg.hatched);

			if(egg) {
				this.top = egg.top;
				this.left = egg.left;

				egg.hatch(this);
			}
		} catch(e) {
			console.log(e);
		}

	}

	loop() {
		super.loop();

		if(this.attack) this.toonCheck();
	}

	/**
	 * collisson checked only during queen attacks
	 */
	collission(o) {
		super.collission(o);

		if(o instanceof KQToon) {
			// auto attack
			if(o.team != this.team && this.facing(o))
				this.attack();
		}

		if(o instanceof KQQueen) {
			if(o.attacking && o.facing(this) && o.top < this.top)
				this.attacked(o);
		}
	}
}

var game = {
	timer: null, // the id for the game timer
	props: {
		gravity_max: 4,
		gravity_rate: 0.2,
	},
	users: [],
	virtual: {
		level: {
			width: 800,
			height: 600,
			eggs:[],
			toons:{},
			snail: null,
			snailCages: [],
			shrines:[],
			goals:[],
			berries:[],
			ground:[]
		}
	},
	win:(type,team) => {
		io.sockets.emit(KQ.GAME_WIN, {type:type, team:team});
		KQEvent.dispatchEvent(new KQEvent(KQ.GAME_OVER));
		clearInterval(game.timer);
	}
};
game.loop = () => {
	KQEvent.dispatchEvent(new KQEvent(KQ.LOOP));

	game.users.forEach(user => {
		try {
			if(!user.toonId) return; // user isn't ready yet

			// todo: add these to the KQ.LOOP event
			var looped = []; // calls loop on KQVirtual objects
			looped.push.apply(looped, game.virtual.level.berries);
			looped.push.apply(looped, game.virtual.level.goals);
			looped.push.apply(looped, [game.virtual.level.snail]);
			looped.push.apply(looped, Object.values(game.virtual.level.toons));

			looped.forEach(o => {
				if(o.loop) o.loop.apply(o);
			});

			var toon = game.virtual.level.toons[user.toonId];

			user.keys.forEach(key => {
				switch(true) {
					case key == KQ.KEY_UP:
						toon.jump();
						break;
					case key == KQ.KEY_DOWN:
						toon.goDown();
						break;
					case key == KQ.KEY_LEFT:
						toon.goLeft();
						break;
					case key == KQ.KEY_RIGHT:
						toon.goRight();
						break;
					case key == "r":
						toon.mReset();
						break;
				}
			});

			// disable jump key if it's listed
 			var xos = user.keys.indexOf(KQ.KEY_UP);
 			if(xos >= 0) user.keys.splice(xos, 1);

		} catch(e) { 
			console.warn(e);
		};
	});

	// loop on all
	// todo: move this to the KQ.LOOP event for the KQVirtual class
	// var keys = Object.keys(game.virtual.level.toons);
	// keys.forEach(key => {
	// 	var toon = game.virtual.level.toons[key];
		
		
	// });

	// io.sockets.emit(KQ.VIRTUAL_UPDATE, game.virtual);
	KQUpdateable.sendUpdates();
}
KQEvent.addEventListener(this, KQ.GAME_START, event => {
	game.gameInProgress = true;
	if(game.timer) clearInterval(game.timer);
	game.timer = setInterval(game.loop, 1000 / 60);
	io.sockets.emit(KQ.GAME_START, null);
});
KQEvent.addEventListener(this, KQ.GAME_OVER, event => {
	KQEvent.dispatchEvent(new KQEvent(KQ.GAME_RESET));
	io.sockets.emit(KQ.GAME_OVER);
});
KQEvent.addEventListener(this, KQ.GAME_COUNTDOWN, event => {
	game.countdownTimer = setTimeout(() => {
		var diff = Date.now() - game.countDownStartTime;
		diff = Math.round(diff / 1000);

		io.sockets.emit(KQ.GAME_COUNTDOWN, {time:KQ.GAME_START_DELAY - diff});

		if(diff >= KQ.GAME_START_DELAY) {
			KQEvent.dispatchEvent(new KQEvent(KQ.GAME_START));
		} else {
			KQEvent.dispatchEvent(new KQEvent(KQ.GAME_COUNTDOWN));
		}
	}, 1000);
});
KQEvent.addEventListener(this, KQ.GAME_RESET, event => {
	console.log("GAME RESET !!");
	game.gameInProgress = false;
	clearInterval(game.timer);
	game.timer = null;
});
KQEvent.addEventListener(this, KQ.MENU_UPDATE, event => {
	var us = [];
	game.users.forEach(user => {
		var u = {};
		Object.assign(u, user);
		delete u.socket;
		us.push(u)
	});
	game.users.forEach(user => {
		if(!user.toonId) {
			user.socket.emit(KQ.MENU_UPDATE, {
				users: us,
				gameInProgress: game.gameInProgress,
			});
		}
	});
});

// parse index.html for level data
const cheerio = require('cheerio');
const css = require('css');
var vhtml;
fs.readFile('index.html', 'utf8', (err,data) => {
	if(err) throw err;
	vhtml = cheerio.load(data);

	fs.readFile('style.css', 'utf8', (err,data) => {
		if(err) throw err;
		var vcss = css.parse(data);

		// add json version to css rules
		vcss.stylesheet.rules.forEach(rule => {
			rule.json = {};
			if(rule.declarations) {
				rule.declarations.forEach(dec => {
					try {
						if(dec.property) 
							rule.json[dec.property] = dec.value;
					} catch(e) {
						// css parser DOES NOT like @keyframes
						// console.log(e);
					}
				});
			}
		});

		// genStyleBySelectors(['.queen', 'blue']).json)
		var genStyleBySelectors = function(selectors) {
			if(!selectors.length) selectors = [selectors];

			var ret = {};
			vcss.stylesheet.rules.forEach(rule => { // class rules
				selectors.forEach((sel) => { // class names
					if(rule.selectors && rule.selectors[0].indexOf(sel) >= 0) { // class properties
						Object.assign(ret, rule);
					}
				});
			});
			return ret;
		}

		var styleToJson = function(str) {
			var o = {};
			str.split(';').forEach((p) => {
				if(!p) return o;
				var s = p.split(':');
				o[s[0]] = s[1];
			});

			return o;
		}

		// parse html for values
		var c = vhtml('#level').children();
		for(var i = 0; i < c.length; ++i) {
			var o = c[i];

			var mclass = o.attribs.class.split(' ');
			// if(o.attribs.is) mclass.push(o.attribs.id);
			var id = o.attribs.id || mclass[0];
			var vrule = genStyleBySelectors(mclass);
			var vobj = null;
			switch(true) {
				case id.indexOf('queen') >= 0:
					vobj = new KQQueen(id);
					game.virtual.level.toons[id] = vobj;
					break;
				case id.indexOf('worker') >= 0:
					vobj = new KQWorker(id);
					game.virtual.level.toons[id] = vobj;
					break;
				case id.indexOf('shrine') >= 0:
					if(id.indexOf('speed') >= 0)
						vobj = new KQShrineSpeed(id);
					else if(id.indexOf('warrior') >= 0)
						vobj = new KQShrineWarrior(id);
					game.virtual.level.shrines.push(vobj);
					break;
				case id.indexOf('berry') >= 0:
					vobj = new KQBerry(id);
					game.virtual.level.berries.push(vobj);
					break;
				case id.indexOf('goal') >= 0:
					vobj = new KQGoal(id);
					game.virtual.level.goals.push(vobj);
					break;
				case id == 'snail':
					vobj = new KQSnail(id);
					game.virtual.level.snail = vobj;
					break;
				case id.indexOf('cage') >= 0:
					vobj = new KQSnailCage(id);
					game.virtual.level.snailCages.push(vobj);
					break;
				case id == 'ground':
					vobj = new KQGround();
					game.virtual.level.ground.push(vobj);
					break;
				case id.indexOf('egg') == 0:
					vobj = new KQEgg(id);
					game.virtual.level.eggs.push(vobj);
					break;
			}

			// strip 'px' and change to number
			var s2n = (str) => {
				if(str.indexOf('px') >= 0) {
					return +(str.replace('px',''))
				}
				return s;
			}

			var flattenJsonCss = (element, classes) => {
				return Object.assign(classes, element); // element overrides by default
			}

			if(vobj) {
				var j = styleToJson(o.attribs.style);
				j = flattenJsonCss(j, vrule.json);
				var o = {};
				o.left = s2n(j.left);
				o.top = s2n(j.top);

				if(j.width)
					o.width = s2n(j.width);
				if(j.height)
					o.height = s2n(j.height);

				vobj.initCSS = o;
			}
		}

		// console.log(game.virtual)
	});
});

io.sockets.on("connection", socket => {
	var user = {};
	user.id = Date.now();
	user.keys = [];
	user.socket = socket;
	socket.user = user;
	game.users.push(user);
	user.toString = function() {
		var toonId = "";
		if(this.toonId) toonId = this.toonId;
		return this.id + ", " + toonId;
	}
	if(game.noUsersResetDelayTimeoutID) clearTimeout(game.noUsersResetDelayTimeoutID);

	KQEvent.dispatchEvent(new KQEvent(KQ.MENU_UPDATE, game));

	socket.on(KQ.USER_CHARACTER_SELECT, data => {
		// make sure character isn't already taken
		var taken = false;
		game.users.forEach(u => {
			if(u.toonId == data.toonId) {
				socket.emit(KQ.ALERT, {text:"This character is already taken"});
				taken = true;
			}
		});
		if(taken) return;

		user.ready = false;
		user.toonId = data.toonId;

		KQEvent.dispatchEvent(new KQEvent(KQ.MENU_UPDATE), game);
	});

	socket.on(KQ.USER_READY, data => {
		user.ready = data.ready;

		if(user.ready) {
			KQEvent.dispatchEvent(new KQEvent(KQ.USER_READY, user));

			if(game.gameInProgress) {
				// quick join
				user.socket.emit(KQ.GAME_START);
				return;
			}

			// if we're here then no game is in progress
			var gameReady = true;
			if(game.users.forEach(u => {
				if(!u.toonId || !u.ready) gameReady = false;
			}));

			// once all users are ready, start the countdown
			if(gameReady) {
				game.countDownStartTime = Date.now();
				KQEvent.dispatchEvent(new KQEvent(KQ.GAME_COUNTDOWN), game);
			}
		}
	})

	socket.on(KQ.KEY_UPDATE, data => {
		user.keys = data;
	});

	socket.on('disconnect', data => {
		// socket.broadcast.emit(COMMAND.GOODBYE, user);
		// clearInterval(loop_id);

		KQEvent.dispatchEvent(new KQEvent(KQ.USER_DISCONNECT, user));


		user.toonId = undefined;
		for(var i in game.users) {
			var o = game.users[i];
			if(o.id == user.id) game.users.splice(i, 1);
		};

		console.log("DISCONNECT", game.users.length);

		if(game.users.length)
			KQEvent.dispatchEvent(new KQEvent(KQ.MENU_UPDATE, game));
		else {
			game.noUsersResetDelayTimeoutID = setTimeout(() => {
				console.log("GAME SHUT OFF");
				io.sockets.broadcast(KQ.GAME_RESET);
				KQEvent.dispatchEvent(new KQEvent(KQ.GAME_RESET, game));	
			}, KQ.GAME_NO_USERS_RESET_DELAY);
		}
			
	});
});

console.log('server started');

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});





