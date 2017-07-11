/**
 * VOICEOVER: teams during game, all during intermission
 * MENU: model KQ arcade??
 */


process.on('uncaughtException', e => console.warn(e.stack));
process.on('warning', e => console.warn(e.stack));

const http = require('http');
const fs = require('fs');
const port = 3000;
const app = http.createServer(function(req, res) {
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

	// server specific
	KEY_SPACE:" ",
	KEY_UP:"ArrowUp",
	KEY_DOWN:"ArrowDown",
	KEY_LEFT:"ArrowLeft",
	KEY_RIGHT:"ArrowRight",
	ATTACK_DURATION: 100,
	WORKER_SPEED: 2,
	WARRIOR_SPEED: 3,
	SHRINE_STANDING_LIMIT: 1 * 1000, // in milliseconds
	SNAIL_SPEED: 0.1,
	GAME_START_DELAY: 0, // 3 seconds
	GAME_RESET: "game_reset",
	BERRY_TOON_OFFSET: {
		top: 16,
		left: 7
	},
	ELEMENT_OFFSCREEN_OFFSET: {
		top: -100,
		left: -100
	}
}

class KQEvent {
	constructor(type, callback, owner, priority) {
		if(callback === undefined) throw Error("undefined callback!", this);
		if(priority === undefined) priority = 0;
		if(owner === undefined) owner = null;

		this.owner = owner;
		this.type = type;
		this.callback = callback;
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

	static dispatchEvent(type) {
		KQEvent._listeners.forEach(l => {
			if(l.type == type) l.callback();
		});
	}
	
	static addEventListener(l) {
		if(!KQEvent._listeners) KQEvent._listeners = [];

		KQEvent._listeners.push(l);
		KQEvent.prioritize();
	}
	static hasEventListener(type, owner) {
		for(var i in KQEvent._listeners) {
			var l = KQEvent._listeners[i];

			if(l.type == type && l.owner == owner) return l;
		}

		return null;
	}
	static removeEventListener(type) {
		var list = KQEvent._listeners;
		for(var i in list) {
			var l = list[i];
			if(l.type == type)
				return KQEvent._listeners.splice(i, 1);
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

		KQEvent.addEventListener(new KQEvent(KQ.GAME_START, () => {
			this.mReset();
		}, this));
	}

	initCSS(o) {
		this._initCSS = o;
		Object.assign(this, o);
	}

	mReset() {}
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
		this.left = 0; // from css
		this.top = 0; // from css
		this.width = 0; // from css
		this.height = 0; // from css
	}

	loop() {}

	collission(o) {
		// console.log("COLLISSION", this.id, o.id);
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

class KQEgg extends KQVirtual {
	constructor(id) {
		super(id);

		var e = KQEvent.hasEventListener(KQ.GAME_START, this);
		e.priority = 1000;
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

class KQBerry extends KQVirtual {
	constructor(id) {
		super(id);

		this.toon = null;
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQWorker) {
			this.toon = o;
		}

		if(o instanceof KQGoal) {
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
			this.top = this.toon.top + KQ.BERRY_TOON_OFFSET.top;
			this.left = this.toon.left + this.toon.width/2 - this.width/2 - KQ.BERRY_TOON_OFFSET.left * this.toon.direction;

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

class KQSnail extends KQVirtual {
	constructor(id) {
		super(id);

		this.speed = KQ.SNAIL_SPEED;
	}

	collission(o) {
		if(o instanceof KQWorker) {
			this.toon = o;
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
		this.toon = null;
	}

	goLeft() {
		if(this.toon && this.toon.team == KQ.TEAM_BLUE) {
			this.direction = KQ.DIRECTION_LEFT;
			this.left += this.speed * this.direction;
		}
	}

	goRight() {
		if(this.toon && this.toon.team == KQ.TEAM_GOLD) {
			this.direction = KQ.DIRECTION_RIGHT;
			this.left += this.speed * this.direction;
		}
	}
}

class KQSnailCage extends KQVirtual {
	constructor(id) {
		super(id);
	}
}

class KQShrine extends KQVirtual {
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

class KQToon extends KQVirtual {
	constructor(id) {
		super(id);

		this.reset_delay = 3 * 1000;
	}

	/**
	 * check if this toon is facing another toon 
	 */
	facing(enemy) {
		if(this.direction < 0 && enemy.left < this.left) return true;
		if(this.direction > 0 && enemy.left > this.left) return true;
		
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

	/**
	 * when the character is born / is reborn
	 */
	mReset() {
		console.log("RESET", this.id);

		this.aiCheck();

		this.invulnerable = true;
		setTimeout(() => {
			this.invulnerable = false;
		}, this.reset_delay);
		super.mReset();

		if(this._initCSS) this.initCSS(this._initCSS); // starts back at html location

		this.accel = 0;
		this.speed = KQ.WORKER_SPEED;
		this.direction = KQ.DIRECTION_RIGHT;
	}

	attacked() {
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
		// runs every frame
		this.groundCheck();

		this.roundNumbers();

		if(this.isAIPlayer) this.AILoop();
	}

	AILoop() {
		// var dirFunc;
		// var dirTimer;
		// var tDir = () => {
		// 	dirTimer = setTimeout(() => {
		// 		dirFunc = this.goRight;
		// 		if(Math.random() > 0.5) dirFunc = this.goLeft;
		// 		dirTimer = null;
		// 	}, Math.random() * 10000 + 1000);
		// }
		// if(!dirTimer) tDir();
		// if(dirFunc) this.goRight();

		// var jumpTimer;
		// var tJump = () => {
		// 	jumpTimer = setTimeout(() => {
		// 		this.jump();
		// 		tJump();
		// 		jumpTimer = null;
		// 	}, Math.random() * 1000 + 1000);
		// }
		// if(!jumpTimer) tJump();
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
	}
}
class KQWorker extends KQToon {
	constructor(id) {
		super(id);
	}

	jump() {
		if(this.grounded || this.warrior) {
			super.jump();
		}
	}

	loop() {
		super.loop();

		this.berryCheck();
		this.snailCheck();
		this.toonCheck();
		this.shrineCheck();
		this.standingCheck();
	}

	attacked() {
		super.attacked();
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQBerry) {
			// this.berry = o; // wtf crash
			this.berry = true;
		}

		if(o instanceof KQSnail) {
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
				if(snail.hitTestBounds(this.boundingBox)) {
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
		if(this.snail) game.virtual.level.snail.goLeft();
		else super.goLeft();
	}
	goRight() {
		if(this.snail) game.virtual.level.snail.goRight();
		else super.goRight();
	}
	goDown() {
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

		// respawn at egg
		var eggs = KQEgg.eggsForTeam(this.team);
		var egg = eggs[0];
		console.log("RESPAWN AT EGG", egg.id, egg.hatched);

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

	/**
	 * collisson checked only during queen attacks
	 */
	collission(o) {
		super.collission(o);

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
		KQEvent.dispatchEvent(KQ.GAME_OVER);
		clearInterval(game.timer);
	}
};
game.loop = () => {
	KQEvent.dispatchEvent(KQ.LOOP);

	game.users.forEach(user => {
		try {
			if(!user.toonId) return; // user isn't ready yet

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
					case key == KQ.KEY_SPACE:
						toon.attack();
						break;
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

			// check off level (repeat)
			if(toon.left + toon.width/2 < 0) toon.left = game.virtual.level.width - toon.width/2;
			if(toon.left + toon.width/2 > game.virtual.level.width) toon.left = 0;

			// disable space key if it's listed
			var xoss = [KQ.KEY_UP, KQ.KEY_SPACE];
			xoss.forEach(k => {
				var xos = user.keys.indexOf(k);
				if(xos >= 0) user.keys.splice(xos, 1);
			});

		} catch(e) { 
			console.warn(e);
		};
	});

	// loop on all
	// todo: move this to the KQ.LOOP event for the KQVirtual class
	var keys = Object.keys(game.virtual.level.toons);
	keys.forEach(key => {
		var toon = game.virtual.level.toons[key];
		
		// implement gravity
		toon.accel += game.props.gravity_rate;
		if(toon.accel > game.props.gravity_max) toon.accel = game.props.gravity_max;
		toon.top += toon.accel;
	});

	io.sockets.emit(KQ.VIRTUAL_UPDATE, game.virtual);
}
KQEvent.addEventListener(new KQEvent(KQ.GAME_START, () => {
	game.gameInProgress = true;
	game.timer = setInterval(game.loop, 1000 / 60);
	io.sockets.emit(KQ.GAME_START, null);
}));
KQEvent.addEventListener(new KQEvent(KQ.GAME_OVER, () => {
	KQEvent.dispatchEvent(KQ.GAME_RESET);
	io.sockets.emit(KQ.GAME_OVER);
}))
KQEvent.addEventListener(new KQEvent(KQ.GAME_COUNTDOWN, () => {
	game.countdownTimer = setTimeout(() => {
		var diff = Date.now() - game.countDownStartTime;
		diff = Math.round(diff / 1000);

		io.sockets.emit(KQ.GAME_COUNTDOWN, {time:KQ.GAME_START_DELAY - diff});

		if(diff >= KQ.GAME_START_DELAY) {
			KQEvent.dispatchEvent(KQ.GAME_START);
		} else {
			KQEvent.dispatchEvent(KQ.GAME_COUNTDOWN);
		}
	}, 1000);
}));
KQEvent.addEventListener(new KQEvent(KQ.GAME_RESET, () => {
	console.log("GAME RESET !!");
	game.gameInProgress = false;
	clearInterval(game.timer);
	game.timer = null;
}));
KQEvent.addEventListener(new KQEvent(KQ.MENU_UPDATE, () => {
	io.sockets.emit(KQ.MENU_UPDATE, {
		users: game.users,
		gameInProgress: game.gameInProgress,
	});
}))

// parse index.html for level data
const cheerio = require('cheerio');
const css = require('css');
var vhtml;
fs.readFile('index.html', 'utf8', (err,data) => {
	if(err) throw err;
	vhtml = cheerio.load(data);

	fs.readFile('style.css', 'utf8', (err,data) => {
		if(err) throw err;
		vcss = css.parse(data);

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

				// Object.assign(vobj, o);
				vobj.initCSS(o);
			}
		}

		// console.log(game.virtual)
	});
});

io.sockets.on("connection", socket => {
	var user = {};
	user.id = Date.now();
	user.keys = [];
	socket.user = user;
	game.users.push(user);
	console.log('connected', user);

	KQEvent.dispatchEvent(KQ.MENU_UPDATE);

	socket.on(KQ.CHARACTER_SELECT, data => {
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

		KQEvent.dispatchEvent(KQ.MENU_UPDATE);
	});

	socket.on(KQ.USER_READY, data => {
		user.ready = data.ready;

		if(user.ready) {
			var gameReady = true;
			if(game.users.forEach(u => {
				if(!u.toonId || !u.ready) gameReady = false;
			}));

			if(gameReady) {
				game.countDownStartTime = Date.now();
				KQEvent.dispatchEvent(KQ.GAME_COUNTDOWN);
			}
		}
	})

	socket.on(KQ.KEY_UPDATE, data => {
		user.keys = data;
	});

	socket.on('disconnect', data => {
		// socket.broadcast.emit(COMMAND.GOODBYE, user);
		// clearInterval(loop_id);
		user.toonId = undefined;
		for(var i in game.users) {
			var o = game.users[i];
			if(o.id == user.id) game.users.splice(i, 1);
		};

		if(game.users.length)
			KQEvent.dispatchEvent(KQ.MENU_UPDATE);
		else 
			KQEvent.dispatchEvent(KQ.GAME_RESET);
	});
});

console.log('server started');

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});





