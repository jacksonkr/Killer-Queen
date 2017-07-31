/**
 * VOICEOVER: teams during game, all during intermission
 * MENU: model KQ arcade??
 *
 */


const io = global.io; // use io from app.js

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

	// server specific
	ATTACKED:"attacked",
	ATTACK_DURATION: 200,
	WORKER_SPEED: 2,
	WARRIOR_SPEED: 3,
	WARRIOR_SUPER_SPEED: 4,
	SNAIL_SPEED: 0.1,
	SNAIL_SWALLOW_DURATION: 3000,
	SNAIL_ATTACK: "snail_attack",
	GAME_START_DELAY: 0, // 3, // in seconds (todo: change to ms?) -jkr
	GAME_RESET_DELAY: 8000,
	GAME_NO_USERS_RESET_DELAY: 10 * 1000, // after last user leaves, reset game after this time -jkr
	TOON_RESET_DELAY: 3000,
	JUMP:"jump",
	ELE_BUMP:"ele_bump", // when two elemens bump into each other -jkr
	TOON_MASS:10, // mass of a toon (do queens/warriors weigh more?) -jkr
	BERRY_MASS:3, // mass of a berry -jkr
	BERRY_PICKUP: "berry_pickup",
	SHRINE_POWER_UP:"shrine_power_up",
	SHRINE_POWER_UP_DELAY: 2000,
	BERRY_TOON_OFFSET: {
		top: 16,
		left: 7
	},
	ELEMENT_OFFSCREEN_OFFSET: { // element off stage graveyard -jkr
		top: -100,
		left: -100
	},
	LOOP: "loop",
	L1K_DEBUG_LOOP: "l1k_debug_loop", // for 1000 loops -jkr
	MOVE_TASK_COMPLETE:"move_task_complete",
	GRAVITY_MAX: 4,
	GRAVITY_RATE: 0.2,
}


/**
 * todo: make a EventDispatcher by the parent class of all
 */
class Event {
	constructor(type, bubbles = true) {
		if(type === undefined) throw new Error("a type has to be set");

		// this.target = target;
		this._type = type;
		this._bubbles = bubbles;
	}

	get extra() {
		return this._extra;
	}
	set extra(o) {
		// console.log("EXTRA", this.type, o);
		this._extra = o;
	}

	get type() {
		return this._type;
	}

	get bubbles() {
		return this._bubbles;
	}
}

class EventDispatcher {
	constructor() {
		this._listeners = [];
	}

	prioritize() {
		this._listeners.sort((a, b) => {
			if(a.priority > b.priority) return -1;
			if(a.priority < b.priority) return 1;
			return 0;
		});
	}

	/**
	 * target obj dispatchEvent was used on
	 * currentTarget obj addEventListener was used on
	 */
	dispatchEvent(event) {
		if(!event) throw new Error("event must be defined!");
		if(!(event instanceof Event)) throw new Error("event must be type Event!");

		if(!event.target)
			event.target = this;

		this._listeners.forEach(l => {
			if(l.type == event.type) {
				event.currentTarget = l.currentTarget;
				l.callback(event);
			}
		});

		// bubble up
		if(event.bubbles === true && !(this instanceof Game)) {
			// dispatch on Game
			Game.instance.dispatchEvent(event);
		}
	}
	
	addEventListener(type, callback, priority) {
		if(callback === undefined) throw new Error("undefined callback!", this);

		this._listeners.push({currentTarget:this, type:type, callback:callback, priority:priority});
		this.prioritize();
	}

	hasEventListener(type, currentTarget) {
		for(var i in this._listeners) {
			var l = this._listeners[i];

			if(l.type == type && l.currentTarget == currentTarget) return l;
		}

		return null;
	}
	removeEventListener(event) { // todo: not working
		var list = this._listeners;
		for(var i in list) {
			var l = list[i];
			if(l.type == event.type
			&& l.currentTarget == event.currentTarget)
				this._listeners.splice(i, 1);
				return true;
		}

		return false;
	}
}

class Collideable extends EventDispatcher {
	constructor() {
		super();
	}

	hitTest(x, y) {
		// console.log(this.left, this.top, x, y);

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

	/**
	 * uses pythagorean
	 */
	static distanceFrom(a, b) {
		var x = a.left - b.left;
		var xx = Math.pow(x, 2);
		var y = a.top - b.top;
		var yy = Math.pow(y, 2);
		var d = Math.sqrt(xx + yy, 2);

		return d;
	}
}
class Element extends Collideable {
	constructor() {
		super();

		this.addRestartListener();
	}

	addRestartListener() {
		Game.instance.addEventListener(CONST.GAME_START, event => {
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

class Virtual extends Element {
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

	get center() {
		return {
			left: this.left + this.width / 2,
			top: this.top + this.height / 2
		}
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


class Ground extends Virtual {
	/**
	 * a pseudo ray trace
	 */
	static rayTraceGroundToFrom(obj, toon, includeWalls = false) {
		var ret = null;

		// rad (line) to target
		var oc = obj.center;
		var tc = toon.center;
		var rad = Math.atan2(oc.top - tc.top, oc.left - tc.left);

		// hittest every point until there's a match();
		var xx = Math.pow(oc.left - tc.left, 2);
		var yy = Math.pow(oc.top - tc.top, 2);
		var dd = Math.sqrt(xx + yy, 2);
		var p = {};
		for(var i = 0; i < dd; i += 2) { // skip 5 safely (half of ground / wall width) jkr
			p.left = tc.left + Math.cos(rad) * i;
			p.top = tc.top + Math.sin(rad) * i;

			Game.instance.virtual.level.ground.some(gr => {
				if(gr.id.indexOf("wall") > -1) return false;

				if(gr.hitTest(p.left, p.top))
					ret = gr;

				return ret;
			});

			if(ret) return ret; // found ground
		}

		// console.log("RAYTRACE", ret, toon.id);

		return ret;
	}
}

class Updateable extends Virtual {
	constructor(id) {
		super(id);

		if(!Updateable._pendingUpdates)
			Updateable._pendingUpdates = [];

		if(!Updateable._copies) 
			Updateable._copies = [];

		this.watchMe(); // send updates to browsers
	}

	/**
	 * only "flagged" objects are watched for changes
	 */
	watchMe() {
		// console.log('WATCH ME', this.id)
		Game.instance.addEventListener(CONST.LOOP, () => {
			this.updateLoop();
		});

		Updateable.updateCopy(this);
	}

	/** 
	 * returns a stripped copy using only props from "propsToCheck"
	 */
	stripped() {

		var copy = {};

		Updateable.propsToCheck.forEach(prop => {
			if(this[prop] !== undefined) {
				copy[prop] = this[prop];
			}
		});

		copy.id = this.id; // always keep the id, for bridging

		return copy;
	}

	/**
	 * only these properties are checked and transfered to the clients
	 * todo: make a special "updatables" array and anything found in 
	 * there is watched for updates, instead of listing every prop manuall
	 */
	static get propsToCheck() {
		return [
			"left",
			"top",
			"direction",
			"Invulnerable",
			"attacking",
			"upgrade-warrior",
			"upgrade-speed",
			"affiliation", // for shrines
		];
	}

	/**
	 * does an "deep" match for only updateable properties
	 * @return object returns null on non-match
	 */
	static stripMatch(o) {
		if(!Updateable._copies[o.id]) return false;

		var copy = Updateable._copies[o.id];

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
		if(Updateable.stripMatch(o)) return false;

		// update the copy
		Updateable._copies[o.id] = o.stripped();

		// todo: return ONLY the properties that updated
		return true;
	}

	updateLoop() {
		try {
			if(Updateable.updateCopy(this)) {
				// something changed
				Updateable.addUpdate(this);
			}
		} catch(e) {
			console.log(e);
		}
	}

	static addUpdate(o) {
		Updateable._pendingUpdates.push(o.stripped());
	}

	static sendUpdates() {
		if(!Updateable._pendingUpdates.length) return false; // no updates to send

		var arr = Updateable._pendingUpdates.slice(0);
		io.sockets.emit(CONST.VIRTUAL_UPDATE, arr);

		Updateable._pendingUpdates = [];
	}
}

class Egg extends Updateable {
	constructor(id) {
		super(id);

		this.hatched = false;
	}

	addRestartListener() {
		Game.instance.addEventListener(CONST.GAME_START, event => {
			this.mReset();
		}, 1000);
	}

	static eggsForTeam(team) {
		var list = [];
		Game.instance.virtual.level.eggs.forEach(egg => {
			if(!egg.hatched && (egg.team == team)) {
				list.push(egg);
			}
		});

		return list;
	}

	hatch(queen) {
		this.hatched = true;

		console.log("!! HATCH", this.id)

		this.top = CONST.ELEMENT_OFFSCREEN_OFFSET.top;
		this.left = CONST.ELEMENT_OFFSCREEN_OFFSET.left;
	}

	mReset() {
		super.mReset();

		this.hatched = false;
	}
}

class Berry extends Updateable {
	constructor(id) {
		super(id);

		this.toon = null;

		this.active = true;

		Game.instance.addEventListener(CONST.LOOP, event => {
			this.loop();
		})
		Game.instance.addEventListener(CONST.SHRINE_POWER_UP, event => {
			if(event.extra.toon == this.toon) {
				this.usedForShrine();
			}
		});
		Game.instance.addEventListener(CONST.ATTACKED, event => {
			if(event.extra.toon == this.toon) {
				this.toon = null;
			}
		});
		Game.instance.addEventListener(CONST.BERRY_PICKUP, event => {
			if(event.extra.berry != this) return;

			if(this.toon || event.extra.toon.berry != this) {
				console.log("DUPE")
				// multiple berries picked up at once!
				return;
			}

			this.toon = event.extra.toon;
		});
	}

	collission(o) {
		super.collission(o);

		if(o instanceof Worker) {
			this.toon = o;

			Game.instance.addEventListener(CONST.SNAIL_ATTACK, event => {
				if(event.extra.toon == this.toon) {
					this.toon = false;

					Game.instance.removeEventListener(event);
				}
			});
		}

		if(o instanceof Goal) {
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
	usedForShrine() {
		this.toon = null;
		this.top = CONST.ELEMENT_OFFSCREEN_OFFSET.top;
		this.left = CONST.ELEMENT_OFFSCREEN_OFFSET.left;
	}

	goalCheck() {
		Game.instance.virtual.level.goals.forEach(goal => {
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
			if(this.toon.direction == CONST.DIRECTION_RIGHT) dir_adjust = 1;
			this.top = this.toon.top + CONST.BERRY_TOON_OFFSET.top;
			this.left = this.toon.left + this.toon.width/2 - this.width/2 - CONST.BERRY_TOON_OFFSET.left * dir_adjust;

			this.goalCheck();
		}
	}
}

class Snail extends Updateable {
	constructor(id) {
		super(id);

		this.swallowing = false;
		this.speed = CONST.SNAIL_SPEED;


		Game.instance.addEventListener(CONST.LOOP, event => {
			this.loop();
		})
		Game.instance.addEventListener(CONST.SNAIL_ATTACK, event => {
			this.swallowing = true;
			setTimeout(() => {
				this.swallowing = false;
			}, CONST.SNAIL_SWALLOW_DURATION);
		});

		Game.instance.addEventListener(CONST.JUMP, event => {
			if(event.extra.toon == this.toon) {
				//jumped off the snail;
				this.toon = null;
			}
		});
	}

	collission(o) {
		if(this.active === false) return;

		if(o instanceof Worker) {
			if(!this.toon) {
				this.toon = o;

				Game.instance.addEventListener(CONST.ATTACKED, event => {
					if(event.extra.toon == this.toon) {
						console.log("SNAIL RIDER DEAD")
						this.toon = null;
						console.log(Game.instance.removeEventListener(event));
					}
				});
			} else {
				if(o.team != this.toon.team) {
					//swallow the enemy
					if(this.swallowing === false) {
						var e = new Event(CONST.SNAIL_ATTACK);
						e.extra = {toon:o};
						Game.instance.dispatchEvent(e);
					}
				}
			}
		}

		if(o instanceof SnailCage) {
			Game.instance.win(CONST.WIN_SNAIL, this.toon.team, Game.instance.virtual.level.snail.toon);
		}
	}

	loop() {
		super.loop();

		if(this.toon) {
			// check collission against enemy toon (eat them)
			var keys = Object.keys(Game.instance.virtual.level.toons);
			keys.forEach(key => {
				var toon = Game.instance.virtual.level.toons[key];
				if(toon != this.toon 
				&& this.hitTestBounds(toon.boundingBox)) {
					this.collission(toon);
					toon.collission(this);
				}
			});

			// check collission against goal
			Game.instance.virtual.level.snailCages.forEach(cage => {
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
		if(!this.swallowing && this.toon && this.toon.team == CONST.TEAM_BLUE) {
			this.direction = CONST.DIRECTION_LEFT;
			this.left -= this.speed;
		}
	}

	goRight() {
		if(!this.swallowing && this.toon && this.toon.team == CONST.TEAM_GOLD) {
			this.left += this.speed;
			this.direction = CONST.DIRECTION_RIGHT;
		}
	}
}

class SnailCage extends Virtual {
	constructor(id) {
		super(id);
	}
}

class Shrine extends Updateable {
	constructor(id) {
		super(id);
	}

	collission(o) {
		super.collission(o);

		if(o instanceof Worker) {
			if(o.berry 
			&& this.inUse === false 
			&& o.warrior === false) {
				if(o.left > this.left + this.width * 0.4
				&& this.left < this.left + this.width * 0.6) { // standing in the middle
					console.log("POWER UP", this.id, o.id);

					this.inUse = true;
					var e = new Event(CONST.SHRINE_POWER_UP);
					e.extra = {toon:o, shrine:this};
					Game.instance.dispatchEvent(e);
				}
			}
		}
		else
		if(o instanceof Queen) {
			// change the power to this team
			this.affiliation = o.team;
			console.log("CHANGE")
		}
	}

	get inUse() {
		return this._inUse;
	}
	set inUse(bool) {
		this._inUse = bool;

		if(bool) {
			//close doors and blink

			// set timer
			setTimeout(() => {
				this.inUse = false;
			}, CONST.SHRINE_POWER_UP_DELAY);
		} else {
			// open doors
		}
	}

	mReset() {
		this.inUse = false;
	}
}
class ShrineSpeed extends Shrine {
	constructor(id) {
		super(id);
	}
}
class ShrineWarrior extends Shrine {
	constructor(id) {
		super(id);
	}
}

class Goal extends Virtual {
	constructor(id) {
		super(id);

		Goal.goals.push(this);

		Game.instance.addEventListener(CONST.LOOP, event => {
			this.loop();
		})
	}

	get active() {
		return !this.berry;
	}

	collission(o) {
		super.collission(o);

		if(o instanceof Berry) {
			this.berry = o; // WTF CRASH
			// this.berry = true;
		}

		if(Goal.checkWin(this.team)) {
			Game.instance.win(CONST.WIN_ECONOMIC, this.team, o);
		}
	}

	static get goals() {
		if(!Goal._goals) Goal._goals = [];
		return Goal._goals;
	}

	static checkWin(team) {
		var win = true;
		Goal.goals.forEach(goal => {
			if(goal.team != team) return;
			if(!goal.berry) win = false;
		});

		return win;
	}
}

/**
 * used by moveTask for intermediate steps to finalTarget
 * @jump when the toon reaches the point, make it jump
 */
class PathPoint extends Collideable {
	constructor(left, top, jump = false) {
		super();

		this.id = "tmp-path-point-" + Date.now();
		this.left = left;
		this.top = top;
		this.jump = jump;
	}
}

/**
 * move to berry / move to goal
 * @param finalTarget is the end goal
 * currentTarget is the current goal
 */
class MoveTask {
	constructor(toon, finalTarget) {
		this.toon = toon;
		this.finalTarget = finalTarget;
		this.stepTarget = null;
	}

	genStepTarget() {
		// must be grounded before finding a target
		if(!this.toon.grounded) return;

		// final is close, go to it
		let d = Collideable.distanceFrom(this.toon, this.finalTarget);
		if(d < this.toon.height) {
			this.stepTarget = this.finalTarget;
			return;
		}

		// final is on same level, check for gap in ground
		if(Math.abs(this.toon.top - this.finalTarget.top) < this.toon.height) {
			let tt = {left:this.toon.left, top:this.toon.top, center:this.toon.center};
			tt.top += 50;
			tt.center.top += 25;
			let gr = Ground.rayTraceGroundToFrom(tt, this.toon); // check directly below us
			if(!gr || gr.left + gr.width - this.toon.left > this.finalTarget.left) {
				// there's no gap, go for final
				this.stepTarget = this.finalTarget;
				return;
			}
		}

		// final is far, use pathpoint
		let gr = Ground.rayTraceGroundToFrom(this.finalTarget, this.toon);
		// if(this.toon.id == "teamBlue-worker0") console.log(this.finalTarget.id, this.toon.id, gr.id);
		if(!gr) {
			this.stepTarget = this.finalTarget;
			return;
		}

		let dl = gr.left - this.finalTarget.left;
		let dr = gr.left + gr.width - this.finalTarget.left;

		this.stepTarget = new PathPoint(0, gr.center.top);
		if(dl < dr) {
			this.stepTarget.left = gr.left - this.toon.width;
		} else {
			this.stepTarget.right = gr.right + this.toon.width * 2;
		}

		console.log("GEN STEP TARGET", this.toon.id, this.stepTarget.id, this.stepTarget.left, this.stepTarget.top, this.finalTarget.id);
	}

	/**
	 * called by the creator, matches loop
	 */
	step() {
		if(this.stepTarget == null) {
			this.genStepTarget();
			return;
		}

		// console.log("STEP", this.toon.id, this.finalTarget.id, this.stepTarget.left, this.stepTarget.top);

		// todo: move this into the Toon, or an event. anything to stop calling commands on toon -jkr
		if(this.stepTarget.left < this.toon.left)
			this.toon.goLeft();
		else
			this.toon.goRight();

		// is the next target a path point?
		if(this.stepTarget instanceof PathPoint) {
			let d = Collideable.distanceFrom(this.toon, this.stepTarget);
			// if(this.toon.id == "teamBlue-worker0") console.log(d);
			if(d < 10) {
				// console.log("reached pathpoint", this.toon.id);
				this.stepTarget = null;
			}
		}

		// target was picked up or taken by someone else
		if(this.finalTarget.active === false) {
			console.log("move task complete", this.toon.id, this.finalTarget.id)
			this.toon.dispatchEvent(new Event(CONST.MOVE_TASK_COMPLETE));
		}
	}
}

class Toon extends Updateable {
	constructor(id) {
		super(id);

		this.mass = CONST.TOON_MASS;

		Game.instance.addEventListener(CONST.LOOP, event => {
			this.loop();
		})
		Game.instance.addEventListener(CONST.USER_READY, event => {
			if(event.extra.user.toonId == this.id) {
				// toon is now human
				this.isAIPlayer = false;
			}
		});
		Game.instance.addEventListener(CONST.USER_DISCONNECT, event => {
			if(event.extra.user.toonId && event.extra.user.toonId == this.id) {
				// toon is now AI
				this.isAIPlayer = true;
			}
		});
		Game.instance.addEventListener(CONST.ELE_BUMP, event => {
			// todo: not complete - need pi based direction for elements, velocity returns direction * mass
			// event.extra.forEach(o => {
			// 	if(this.id == o.id) {
			// 		// bump
			// 		var v = 0; // velocity
			// 		v += event.extra[0].element.velocity;
			// 		v += event.extra[1].element.velocity;
			// 	}
			// });
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
		if(v != CONST.DIRECTION_DOWN)
			this._last_horiz_direction = v;

		// down has priority of left/right when available
		if(this._direction == CONST.DIRECTION_DOWN) return;

		this._direction = v;
	}

	/**
	 * check if this toon is facing another toon 
	 */
	facing(enemy) {
		if(this.direction == CONST.DIRECTION_DOWN && enemy.top > this.top) return true;
		if(this.direction == CONST.DIRECTION_LEFT && enemy.left < this.left) return true;
		if(this.direction == CONST.DIRECTION_RIGHT && enemy.left > this.left) return true;

		return false;
	}

	aiCheck() {
		// human vs ai check
		this.isAIPlayer = true;
		Game.instance.users.some(user => {
			if(user.toonId == this.id) 
				this.isAIPlayer = false;
		});
	}

	get Invulnerable() {
		return this._invulnerable;
	}
	set Invulnerable(b) {
		// clear timeout either way
		if(this._invulnerableTimeoutID !== null) clearTimeout(this._invulnerableTimeoutID);

		this._invulnerable = b;

		if(b === false) return;

		if(b === true) b = CONST.TOON_RESET_DELAY;

		this._invulnerableTimeoutID = setTimeout(() => {
			this._invulnerableTimeoutID = null;
			this.swallowTimeoutID = null;
			this.Invulnerable = false;
		}, b);
	}

	/**
	 * when the character is born / is reborn
	 */
	mReset() {
		super.mReset();

		this.active = true;
		this.Invulnerable = true;

		this.aiCheck();

		this.accel = 0;
		this.speed = CONST.WORKER_SPEED;
		this.direction = CONST.DIRECTION_RIGHT;
	}

	attacked() {
		if(this.Invulnerable || !this.active) return;

		var e = new Event(CONST.ATTACKED);
		e.extra = {toon:this};
		Game.instance.dispatchEvent(e);

		console.log("ATTACKED", this.id);
		this.mReset();
	}

	attack() {
		console.log("ATTACK", this.id);

		this.attacking = Date.now();
		setTimeout(() => {
			this.attacking = null;
		}, CONST.ATTACK_DURATION);
	}

	loop() {
		this.direction = null;

		// runs every frame
		this.gravityCheck(); // needs to be before ground
		this.groundCheck();
		this.visibilityCheck();
		this.roundNumbers();

		// disabling this until AI can be nailed down -jkr
		// if(this.isAIPlayer === true) this.aiLoop();
	}

	gravityCheck() {
		this.accel += Game.instance.props.gravity_rate;
		if(this.accel > Game.instance.props.gravity_max) this.accel = Game.instance.props.gravity_max;
		this.top += this.accel;
	}

	/**
	 * @param arr is the array of elements to sort through
	 * @param o is the object to compare the array against
	 *
	 * @return $item from $arr that is the closest to $o
	 */
	static findNearestElement(arr, o) {
		// console.log("FIND NEAREST ELEMENT", o.id);

		var ret = null;
		arr.forEach(item => {
			if((item instanceof Goal) && item.team != o.team) return;
			if((item instanceof Berry) && item.toon) return;
			if(item.active != true) return 

			if(ret) {
				// is closer than current return?
				// console.log(item.id, ret.id);
				// console.log(distanceFrom(item), distanceFrom(ret));
				if(Collideable.distanceFrom(item, o) < Collideable.distanceFrom(ret, 0)) ret = item;
			} else {
				ret = item;
			}
		});

		return ret;
	}

	aiLoop() {
		if(!this.isAIPlayer) return;
		if(!this.active) return;

		if(this.moveTask) {
			this.moveTask.step();
			return;
		}

		if(this.snail) {
			if(this.team == CONST.TEAM_BLUE) this.goLeft();
			if(this.team == CONST.TEAM_GOLD) this.goRight();
			return;
		}

		if(false) { // targetting snail (every worker0 ?)
			var snail = Game.instance.virtual.level.snail;
			this.moveTask = new MoveTask(this, snail);
			return;
		}

		if(!this.berry) {
			// target nearest berry
			var b = Worker.findNearestElement(Game.instance.virtual.level.berries, this);
			this.moveTask = new MoveTask(this, b);
		}

		if(this.berry) {
			// target nearest goal
			var g = Worker.findNearestElement(Game.instance.virtual.level.goals, this);
			this.moveTask = new MoveTask(this, g);
		}
	}

	/**
	 * check offscreen / off level (repeat)
	 */
	visibilityCheck() {
		if(this.left + this.width/2 < 0) this.left = Game.instance.virtual.level.width - this.width/2;
		if(this.left + this.width/2 > Game.instance.virtual.level.width) this.left = 0;

	}

	roundNumbers() {
		this.left = Math.round(this.left);
		this.top = Math.round(this.top);
	}

	/**
	 * hittest against other toons
	 */
	toonCheck() {
		var keys = Object.keys(Game.instance.virtual.level.toons);
		keys.forEach(key => {
			var toon = Game.instance.virtual.level.toons[key];
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
	 * broke this out of groundCheck to be used with path solving for worker
	 * @param toon the toon being checked against
	 * @param ground the ground being checked against
	 * @return bool it's a match
	 * todo: this doesn't need to be static. usage coulde be toon.groundedCheck instead -jkr
	 */
	static groundedCheck(toon, ground) {
		var ret = false;

		ret = ground.hitTestBounds({
			x: toon.left, 
			y: toon.top + toon.height,
			width: toon.width,
			height: 1
		});

		// console.log("GROUNDED CHECK", ret, toon.id, ground.id);

		return ret;
	}

	/**
	 * check for collissions with the ground / walls
	 * remedy collission by moving character
	 */
	groundCheck() {
		this.grounded = false;

		// superior side always fits flush with frame (eg widith is superior for top/bottom)
		var bp = 8; // how much to pad the inferior side inward from the frame (eg width is inferior for top/bottom boundrays)
		var bt = 4; // how thick is the boundary

		// check toons against ground items
		Game.instance.virtual.level.ground.forEach(gr => {
			// ?? check if ground item is even close to user
			// saves on processing ??

			// grounded check (check right below toon)
			if(this.grounded === false)
				this.grounded = Toon.groundedCheck(this, gr);
			
			// bottom (ground)
			// while(gr.hitTest(this.left + this.width/2, this.top + this.height)) {
			while(gr.hitTestBounds({
					x: this.left + bp/2, 
					y: this.top + this.height - bt,
					width: this.width - bp,
					height: bt
				})) {
					// if(this.id == "teamBlue-queen") console.log("bottom")
				this.top -= 0.1;
				this.accel = 0;
			}

			// top (ceiling)
			// while(gr.hitTest(this.left + this.width/2, this.top)) {
			while(gr.hitTestBounds({
					x: this.left + bp/2,
					y: this.top,
					width: this.width - bp,
					height: bt,
				})) {
					// if(this.id == "teamBlue-queen") console.log("top")
				this.top += 0.1;
				this.accel = 0;
			}

			// right (wall)
			// while(gr.hitTest(this.left + this.width, this.top + this.height/2)) {
			while(gr.hitTestBounds({
					x: this.left + this.width - bt,
					y: this.top + bp/2,
					width: bt,
					height: this.height - bp
				})) {
				// if(this.id == "teamBlue-queen") console.log("right")
				this.left -= 0.1;
			}

			// left (wall)
			// while(gr.hitTest(this.left, this.top + this.height/2)) {
			while(gr.hitTestBounds({
					x: this.left,
					y: this.top + bp/2,
					width: bt,
					height: this.height - bp
				})) {
				this.left += 0.1;
			}
		});
	}

	jump() {
		if(this.active === false) return;

		var e = new Event(CONST.JUMP);
		e.extra = {toon:this};
		Game.instance.dispatchEvent(e);

		this.grounded = false;
		this.accel = -5;
	}

	goRight() {
		if(this.active === false) return;

		this.left += this.speed;
		this.direction = CONST.DIRECTION_RIGHT;
	}

	goLeft() {
		if(this.active === false) return;

		this.left -= this.speed;
		this.direction = CONST.DIRECTION_LEFT;
	}

	goDown() {
		if(this.active === false) return;
		if(this.grounded === true) return;

		this.top += this.speed
		this.direction = CONST.DIRECTION_DOWN
	}
}
class Worker extends Toon {
	constructor(id) {
		super(id);

		Game.instance.addEventListener(CONST.SNAIL_ATTACK, event => {
			if(!this.warrior && this == event.extra.toon && !Game.instance.virtual.level.snail.swallowing) {
				this.swallowed();
			}
		});
		Game.instance.addEventListener(CONST.SHRINE_POWER_UP, event => {
			if(this.berry && event.extra.toon == this) {
				this.inactiveFor(CONST.SHRINE_POWER_UP_DELAY);
				this.loseBerry();

				// position correctly in the shrine
				this.left = event.extra.shrine.left + event.extra.shrine.width / 2 - this.width / 2;
				this.top = event.extra.shrine.top + 25;

				if(!this.warrior && event.extra.shrine instanceof ShrineWarrior) {
					// dispatch door close
					// dispatch door open (assign power up)
					this.gainWarrior();
				}
				else
				if(!this.speedUpgrade && event.extra.shrine instanceof ShrineSpeed) {
					this.gainSpeed();
				}
			}
		});
		this.addEventListener(CONST.MOVE_TASK_COMPLETE, event => {
			this.moveTask = null;
			console.log("MOVE TASK COMPLETE", this.id)
		});
		this.addEventListener(CONST.BERRY_PICKUP, event => {
			if(event.extra.toon != this) return;

			if(this.berry || event.extra.berry.toon) {
				console.log("DUPE")
				// multiple berries picked up at once!
				return;
			}

			this.berry = event.extra.berry;
		})
	}

	/**
	 * Make the toon inactive for a predefined amount of time
	 * @param ms Number in milliseconds to make the toon active again
	 * @param reset bool trigger mReset on timeout? Used with death animations
	 * @param callback function 
	 */
	inactiveFor(ms, reset, callback) {
		if(reset === undefined) reset = false;

		this.active = false;

		setTimeout(() => {
			this.active = true;

			if(reset) this.mReset();
		}, ms);
	}

	/**
	 * This toon has been swallowed by the snail
	 */
	swallowed() {
		this.inactiveFor(CONST.SNAIL_SWALLOW_DURATION, true);

		this.loseBerry();

		// resposition in front of the snail
		var snail = Game.instance.virtual.level.snail;
		this.top = snail.top + this.height * 1.2;
		if(snail.direction == CONST.DIRECTION_LEFT)  this.left = snail.left - this.width / 2;
		if(snail.direction == CONST.DIRECTION_RIGHT) this.left = snail.left + snail.width;
	}

	jump() {
		if(this.grounded || this.warrior || this.snail) {
			super.jump();


			// todo: fix the snail jump off
			if(this.snail) {
				// jump off the snail
				var snail = Game.instance.virtual.level.snail;
				console.log(snail.left, snail.width)
				if(snail.direction == CONST.DIRECTION_LEFT)
					this.left = snail.left - snail.width * 0.4;
				if(snail.direction == CONST.DIRECTION_RIGHT)
					this.left = snail.left + snail.width * 1.2;

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

		if(o instanceof Berry) {
			if(this.berry) return;
			if(o.toon) return; 
			this.berry = o; // wtf crash
			// this.berry = true;
		}

		if(o instanceof Snail) {
			if(o.toon.id == this.id)
				this.snail = true;
		}

		if(o instanceof Worker) {
			// auto attack
			if(this.warrior && o.team != this.team && this.facing(o))
				this.attack();

			if(o.warrior && o.attacking && o.facing(this)) this.attacked();
		}

		if(o instanceof Queen) {
			if(o.attacking && o.facing(this)) this.attacked();
		}
	}

	shrineCheck() {
		if(this.berry) { // only check if you have a berry
			Game.instance.virtual.level.shrines.forEach(shrine => {
				if(shrine instanceof ShrineSpeed && this.speedUpgrade) return;

				if(shrine.hitTestBounds(this.boundingBox)) {
					shrine.collission(this);
					this.collission(shrine);
				}
			});
		}
	}

	gainSpeed() {
		if(this.warrior) return; // not possible, but in case -jkr
		if(this.speedUpgrade) return; // cancel upgrade if it already exists

		this.inactiveFor(CONST.SHRINE_POWER_UP_DELAY, false);

		this.speedUpgrade = true;
		this.speed = CONST.WARRIOR_SPEED;
	}

	gainWarrior() {
		if(this.warrior) return; // do nothing

		this.warrior = true;
		this.speed = CONST.WARRIOR_SPEED;

		if(this.speedUpgrade)
			this.speed = CONST.WARRIOR_SUPER_SPEED;
	}

	attack() {
		if(this.warrior) super.attack();
	}

	mReset() {
		super.mReset();

		this.swallowTimeoutID = false;

		this.speed = CONST.WORKER_SPEED;

		this.warrior = false;
		this.speedUpgrade = false;
		this.berry = null;
		this.snail = null;
	}

	berryCheck() {
		if(!this.berry && !this.warrior) { // make sure toon doesn't already have a berry
			
			// iterate through all berries
			Game.instance.virtual.level.berries.forEach(berry => {

				// todo: check for berry distance from user before processing (performance)

				if(berry.active != true) return;
				if(berry.toon != null) return;
				if(berry.goal != null) return;

				if(this.hitTestBounds(berry.boundingBox)) {
					var e = new Event(CONST.BERRY_PICKUP);
					e.extra = {toon:this, berry:berry};
					this.dispatchEvent(e);
				}
			});
		}
	}

	snailCheck() {
		if(!this.warrior) {
			var snail = Game.instance.virtual.level.snail;
			if(!this.snail) {
				if(!snail.toon && snail.hitTestBounds(this.boundingBox)) {
					snail.collission(this);
					this.collission(snail);
				}
			} else {
				// show riding the snail
				this.top = Game.instance.virtual.level.snail.top;
				if(snail.direction == CONST.DIRECTION_LEFT) {
					this.left = Game.instance.virtual.level.snail.left + 5;
				} else if(snail.direction == CONST.DIRECTION_RIGHT) {
					this.left = Game.instance.virtual.level.snail.left + 30;
				}
			}
		}
	}

	goLeft() {
		if(this.snail) Game.instance.virtual.level.snail.goLeft();
		else super.goLeft();
	}
	goRight() {
		if(this.snail) Game.instance.virtual.level.snail.goRight();
		else super.goRight();
	}
}
class Queen extends Toon {
	constructor(id) {
		super(id);

		this.lives = 3;
		this.speed = 3;
	}

	attacked(attacker) {
		if(this.Invulnerable) return;

		if(Egg.eggsForTeam(this.team).length) {
			super.attacked();
		} else {
			Game.instance.win(CONST.WIN_MILITARY, attacker.team, attacker);
		}
	}

	attack() {
		super.attack();
	}

	mReset() {
		super.mReset();

		// respawn at egg
		var eggs = Egg.eggsForTeam(this.team);
		var egg = eggs[0];
		// console.log("RESPAWN AT EGG", egg.id, egg.hatched);

		if(egg) {
			this.top = egg.top;
			this.left = egg.left;

			egg.hatch(this);
		}

	}

	loop() {
		super.loop();

		if(this.attack) this.toonCheck();
	}

	aiLoop() {
		return; // no ai for queen (yet)
	}

	/**
	 * collisson checked only during queen attacks
	 */
	collission(o) {
		super.collission(o);

		if(o instanceof Shrine) {
			o.collission(this);
		}

		if(o instanceof Toon) {
			// auto attack
			if(o.active 
			&& o.team != this.team 
			&& this.facing(o))
				this.attack();
		}

		if(o instanceof Queen) {
			if(o.attacking) {
				if(o.facing(this)) {
					if(this.facing(o)) {
						if(o.top < this.top) this.attacked(o); // killed by ranked vertical position
						else {
							var e = new Event(CONST.ELE_BUMP);
							e.extra = [this, o];
							Game.instance.dispatchEvent(e);
							this.bump();
						}
					} else this.attacked(o); // stabbed in the back
				}
			}
		}
	}
}

class Game extends EventDispatcher {
	constructor() {
		super();

		this._loopCount = 0;
		this._loopIntervalDelay = 1000 / 60;

		if(Game.instance) {
			console.warn("Use Game.instance.instance to get singleton, don't create a new instance");
			return Game.instance;
		}
		Game._instance = this;

		// todo: temporary, change to methods / members
		this.loopIntervalId = null;
		this.props = {
			gravity_max: CONST.GRAVITY_MAX,// 4,
			gravity_rate: CONST.GRAVITY_RATE,//0.2,
		};
		this.users = [];
		this.virtual = {
			level: {
				width: 800, // todo: pull in from this.loadLevel()
				height: 600,
				eggs:[],
				toons:{},
				snail: null,
				snailCages: [],
				// pathPoints: [],
				shrines:[],
				goals:[],
				berries:[],
				ground:[]
			}
		};

		this.addEventListener(CONST.GAME_START, event => {
			console.log("!! GAME START");
			Game.instance.gameInProgress = true;
			if(Game.instance.loopIntervalId) clearInterval(Game.instance.loopIntervalId);
			Game.instance.loopIntervalId = setInterval(() => {
				++this._loopCount;
				if(this._testMode && this.loopCount % 1000 == 0) this.dispatchEvent(new Event(CONST.L1K_DEBUG_LOOP));
				this.loop();
			}, this._loopIntervalDelay);
			io.sockets.emit(CONST.GAME_START, null);
		});
		this.addEventListener(CONST.GAME_OVER, event => {
			let d = {
				type:event.extra.type, 
				team:event.extra.team, 
				focus:event.extra.focus
			};
			io.sockets.emit(CONST.GAME_WIN, d); // CRASH ??

			// wait to reset game

			setTimeout(() => {
				Game.instance.dispatchEvent(new Event(CONST.GAME_RESET));
			}, CONST.GAME_RESET_DELAY);
		});
		this.addEventListener(CONST.GAME_COUNTDOWN, event => {
			Game.instance.countdownTimer = setTimeout(() => {
				var diff = Date.now() - Game.instance.countDownStartTime;
				diff = Math.round(diff / 1000);

				io.sockets.emit(CONST.GAME_COUNTDOWN, {time:CONST.GAME_START_DELAY - diff});

				console.log("!!", diff, CONST.GAME_START_DELAY)
				if(diff >= CONST.GAME_START_DELAY) {
					Game.instance.dispatchEvent(new Event(CONST.GAME_START));
				} else {
					Game.instance.dispatchEvent(new Event(CONST.GAME_COUNTDOWN));
				}
			}, 1000);
		});
		this.addEventListener(CONST.GAME_RESET, event => {
			console.log("!! GAME RESET");

			io.sockets.emit(CONST.GAME_RESET, {});

			Game.instance.gameInProgress = false;
			clearInterval(Game.instance.loopIntervalId);
			Game.instance.loopIntervalId = null;
		});
		this.addEventListener(CONST.MENU_UPDATE, event => {
			var us = [];
			Game.instance.users.forEach(user => {
				var u = {};
				Object.assign(u, user);
				delete u.socket;
				us.push(u)
			});
			Game.instance.users.forEach(user => {
				if(!user.toonId) {
					user.socket.emit(CONST.MENU_UPDATE, {
						users: us,
						gameInProgress: Game.instance.gameInProgress,
					});
				}
			});
		});
	}

	static get instance() {
		return Game._instance;
	}

	get loopCount() {
		return this._loopCount;
	}

	/**
	 * @type string the win type (economic, militar, snail)
	 * @team string the winning team
	 * @focus Element the item to zoom on during game over screen (needs top & left)
	 */
	win(type,team,focus) {
		console.log("WIN", type, team, focus.id);

		let f = {
			top: focus.top,
			left: focus.left
		}

		let e = new Event(CONST.GAME_OVER);
		e.extra = {type:type,team:team,focus:f};
		Game.instance.dispatchEvent(e);
		clearInterval(this.loopIntervalId);
	}

	testMode() {
		this._testMode = true;
		this._loopIntervalDelay = 0;
	};

	loop() {
		Game.instance.dispatchEvent(new Event(CONST.LOOP));

		this.users.forEach(user => {
			try {
				if(!user.toonId) return; // user isn't ready yet

				var toon = this.virtual.level.toons[user.toonId];

				user.keys.forEach(key => {
					switch(true) {
						case key == CONST.KEY_UP:
							toon.jump();
							break;
						case key == CONST.KEY_DOWN:
							toon.goDown();
							break;
						case key == CONST.KEY_LEFT:
							toon.goLeft();
							break;
						case key == CONST.KEY_RIGHT:
							toon.goRight();
							break;
						case key == "r":
							toon.mReset();
							break;
					}
				});

				// remove jump key if it's listed (user can't hold)
	 			var xos = user.keys.indexOf(CONST.KEY_UP);
	 			if(xos >= 0) user.keys.splice(xos, 1);

			} catch(e) { 
				console.warn(e);
			};
		});

		Updateable.sendUpdates();
	}

	loadLevel(htmlFile, styleFile) {
		const cheerio = require('cheerio');
		const css = require('css');
		const fs = global.fs;
		var vhtml;
		fs.readFile(htmlFile, 'utf8', (err,data) => {
			if(err) throw err;
			vhtml = cheerio.load(data);

			fs.readFile(styleFile, 'utf8', (err,data) => {
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
				var o = null;
				for(var i = 0; i < c.length; ++i) {
					o = c[i];

					var mclass = o.attribs.class.split(' ');
					// if(o.attribs.is) mclass.push(o.attribs.id);
					var id = o.attribs.id || mclass[0];
					var vrule = genStyleBySelectors(mclass);
					var vobj = null;
					// todo: what's a more dynamic way of doing this? -jkr
					switch(true) {
						case id.indexOf('queen') >= 0:
							vobj = new Queen(id);
							this.virtual.level.toons[id] = vobj;
							break;
						case id.indexOf('worker') >= 0:
							vobj = new Worker(id);
							this.virtual.level.toons[id] = vobj;
							break;
						case id.indexOf('shrine') >= 0:
							if(id.indexOf('speed') >= 0)
								vobj = new ShrineSpeed(id);
							else if(id.indexOf('warrior') >= 0)
								vobj = new ShrineWarrior(id);
							this.virtual.level.shrines.push(vobj);
							break;
						case id.indexOf('berry') >= 0:
							vobj = new Berry(id);
							this.virtual.level.berries.push(vobj);
							break;
						case id.indexOf('goal') >= 0:
							vobj = new Goal(id);
							this.virtual.level.goals.push(vobj);
							break;
						// case id.indexOf('path-point') > -1:
						// 	vobj = new PathPoint(id);
						// 	this.virtual.level.pathPoints.push(vobj);
						// 	break;
						case id == 'snail':
							vobj = new Snail(id);
							this.virtual.level.snail = vobj;
							break;
						case id.indexOf('cage') >= 0:
							vobj = new SnailCage(id);
							this.virtual.level.snailCages.push(vobj);
							break;
						case id.indexOf('ground') > -1:
						case id.indexOf('wall') > -1:
							vobj = new Ground(id);
							this.virtual.level.ground.push(vobj);
							break;
						case id.indexOf('egg') == 0:
							vobj = new Egg(id);
							this.virtual.level.eggs.push(vobj);
							break;
					}

					// strip 'px' and cast obj as number
					var s2n = (str) => {
						if(str.indexOf('px') >= 0) {
							return +(str.replace('px',''))
						}
						return s;
					}

					var flattenJsonCss = function(element, classes) {
						return Object.assign(classes, element); // element overrides by default
					}

					if(vobj) {
						var j = styleToJson(o.attribs.style);
						j = flattenJsonCss(j, vrule.json);
						var r = {};
						r.left = s2n(j.left);
						r.top = s2n(j.top);

						if(j.width)
							r.width = s2n(j.width);
						if(j.height)
							r.height = s2n(j.height);

						vobj.initCSS = r;
					}
				}
			});
		});
	}
}

module.exports =  {
	CONST: 				CONST,
	Event:				Event,
	EventDispatcher:	EventDispatcher,
	Collideable:		Collideable,
	Element:			Element,
	Virtual:			Virtual,
	Ground:				Ground,
	Updateable:			Updateable,
	Egg:				Egg,
	Berry:				Berry,
	Snail:				Snail,
	SnailCage:			SnailCage,
	Shrine:				Shrine,
	ShrineSpeed:		ShrineSpeed,
	ShrineWarrior:		ShrineWarrior,
	Goal:				Goal,
	PathPoint:			PathPoint,
	MoveTask:			MoveTask,
	Toon:				Toon,
	Worker:				Worker,
	Queen:				Queen,
	Game:				Game,
}