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
	TOON_QUEEN:"queen",
	TOON_WORKER:"worker",
	GAME_OVER:"game_over",
	GAME_START:"game_start",
	WIN_ECONOMIC:"win_economic",
	WIN_MILITARY:"win_military",
	WIN_SNAIL:"win_snail",

	// server specific
	KEY_SPACE:" ",
	KEY_UP:"ArrowUp",
	KEY_DOWN:"ArrowDown",
	KEY_LEFT:"ArrowLeft",
	KEY_RIGHT:"ArrowRight",
	ATTACK_DURATION: 100,
	WORKER_SPEED: 2,
	WARRIOR_SPEED: 3,
	SHRINE_STANDING_LIMIT: 1 * 1000 // in milliseconds
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
	}

	initCSS(o) {
		this._initCSS = o;
		Object.assign(this, o);
	}
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

		this.mReset();
	}

	mReset() {}

	loop() {}

	collission(o) {
		console.log('collission', this.id, o.id);
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
			this.toon.lostBerry();
			this.toon = null;

			this.goal = o;
			this.top = o.top + o.height / 4;
			this.left = o.left + o.width / 3;
		}
	}

	used() {
		// for a powerup
		this.top = -100;
		this.left = -100;
	}

	goalCheck() {
		var self = this;
		game.virtual.level.goals.forEach(goal => {
			if(!goal.berry && goal.hitTestBounds(self.boundingBox)) {
				goal.collission(self);
				self.collission(goal);
			}
		});
	}

	loop() {
		super.loop();

		// be carried by the toon
		if(this.toon) {
			this.top = this.toon.top - 5;
			this.left = this.toon.left + this.toon.width/2 - this.width/2;

			this.goalCheck();
		}
	}
}

class KQSnail extends KQVirtual {
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
		o.berry.used();
		o.loseBerry();

		console.log('POWER UP', this.id, o.id)
	}
}
class KQShrineSpeed extends KQShrine {
	constructor(id) {
		super(id);
	}

	powerUp(o) {
		o.gainSpeed();
	}
}
class KQShrineWarrior extends KQShrine {
	constructor(id) {
		super(id);
	}

	powerUp(o) {
		o.gainWarrior();
	}
}

class KQGoal extends KQVirtual {
	constructor(id) {
		super(id);

		this.team = id.match(/goal-(\w{4})-\d+/)[1];
		this.team = "team" + this.team.charAt(0).toUpperCase() + this.team.slice(1);

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
			console.log("GAME OVER", KQ.WIN_ECONOMIC, team);
			game.win(KQ.WIN_ECONOMIC, team);
		}
	}
}

class KQToon extends KQVirtual {
	constructor(id) {
		super(id);

		this.team = id.match(/(^\w{8})/)[0];
	}

	/**
	 * when the character is born / is reborn
	 */
	mReset() {
		super.mReset();

		if(this._initCSS) this.initCSS(this._initCSS); // starts back at html location

		this.accel = 0;
		this.speed = KQ.WORKER_SPEED;
		this.direction = 1;
	}

	attack() {}

	loop() {
		// runs every frame
		this.groundCheck();

		this.roundNumbers();
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

	lostBerry() {
		this.berry = null;
	};

	/**
	 * boolean on whether the user is "grounded"
	 * check for collisions with the ground
	 * remedy collission by moving character
	 */
	groundCheck() {
		// check toons against ground items
		var self = this;
		this.grounded = false;
		game.virtual.level.ground.forEach(gr => {

			// ?? check if ground item is even close to user
			// saves on processing ??

			// grounded check (check right below toon)
			if(gr.hitTest(self.left + self.width/2, self.top + self.height)) {
				self.grounded = true;
			}
			
			// bottom center (ground)
			while(gr.hitTest(self.left + self.width/2, self.top + self.height)) {
				self.top -= 0.1;
				self.accel = 0;
			}

			// top center (ceiling)
			while(gr.hitTest(self.left + self.width/2, self.top)) {
				self.top += 0.1;
				self.accel = 0;
			}

			// right middle (wall)
			while(gr.hitTest(self.left + self.width, self.top + self.height/2)) {
				self.left -= 0.1;
			}

			// left middle (wall)
			while(gr.hitTest(self.left, self.top + self.height/2)) {
				self.left += 0.1;
			}
		});
	}

	jump() {
		this.grounded = false;
		this.accel = -5;
	}
}
class KQWorker extends KQToon {
	constructor(id) {
		super(id);
	}

	jump() {
		if(this.grounded) {
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
		game.virtual.level.shrines.forEach(shrine => {

		});
	}

	collission(o) {
		super.collission(o);

		if(o instanceof KQBerry) {
			// this.berry = o; // wtf crash
			this.berry = true;
		}

		if(o instanceof KQSnail) {

		}

		if(o instanceof KQToon) {
			// bump
		}
	}

	gainSpeed() {
		this.speed = KQ.WARRIOR_SPEED;
	}

	gainWarrior() {
		this.warrior = true;
	}

	attacked() {
		this.mReset();
	}

	mReset() {
		super.mReset();

		this.standingStartTime = 0;
		this.standingTime = 0;
		this.warrior = false;
	}

	berryCheck() {
		if(!this.berry) { // make sure toon doesn't already have a berry
			var self = this;
			
			var arr = game.virtual.level.berries;
			for(var i in arr) {
				var berry = arr[i];

				// todo: check for berry distance from user before processing

				if(!berry.goal && self.hitTestBounds(berry.boundingBox)) {
					self.collission(berry);
					berry.collission(self);
					return;
				}
			}
		}
	}

	snailCheck() {

	}
}
class KQQueen extends KQToon {
	constructor(id) {
		super(id);

		this.speed = 3;
	}

	attack() {
		this.attack = Date.now();
		var self = this;
		setTimeout(() => {
			self.attack = null;
		}, KQ.ATTACK_DURATION);
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
			KQQueen.judge(this, o, winner => {
				if(winner) game.win(KQ.WIN_MILITARY, winner.team);
			});
		}
	}
}

var game = {
	props: {
		gravity_max: 4,
		gravity_rate: 0.2,
	},
	users: [],
	virtual: {
		level: {
			width: 800,
			height: 600,
			toons:{},
			shrines:[],
			goals:[],
			berries:[],
			ground:[]
		}
	},
	win:(type,team) => {
		io.sockets.emit(KQ.GAME_OVER, {type:type, team:team});
	}
};

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
			rule.declarations.forEach(dec => {
				// console.log(dec)
				if(dec.property)
					rule.json[dec.property] = dec.value
			});
		});

		// genStyleBySelectors(['.queen', 'blue']).json)
		var genStyleBySelectors = function(selectors) {
			if(!selectors.length) selectors = [selectors];

			var ret = {};
			vcss.stylesheet.rules.forEach(rule => { // class rules
				selectors.forEach((sel) => { // class names
					if(rule.selectors[0].indexOf(sel) >= 0) { // class properties
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

					break;
				case id == 'ground':
					vobj = new KQGround();
					game.virtual.level.ground.push(vobj);
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


const gameTimer = setInterval(() => {
	game.users.forEach(user => {
		try {
			if(!user.toonId) return; // user isn't ready yet

			var looped = [];
			looped.push.apply(looped, game.virtual.level.berries);
			looped.push.apply(looped, game.virtual.level.goals);
			// looped.push.apply(looped, [game.virtual.level.snail]);
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
						toon.top += toon.speed;
						break;
					case key == KQ.KEY_LEFT:
						toon.left -= toon.speed;
						toon.direction = -1;
						break;
					case key == KQ.KEY_RIGHT:
						toon.left += toon.speed;
						toon.direction = 1;
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

			// implement gravity
			toon.accel += game.props.gravity_rate;
			if(toon.accel > game.props.gravity_max) toon.accel = game.props.gravity_max;
			toon.top += toon.accel;

		} catch(e) { 
			console.warn(e);
		};
	});

	io.sockets.emit(KQ.VIRTUAL_UPDATE, game.virtual);
}, 1000 / 60); // 60 frames per second

io.sockets.on("connection", socket => {
	var user = {};
	user.id = Date.now();
	user.keys = [];
	socket.user = user;
	game.users.push(user);
	console.log('connected', user);

	// socket.emit(COMMAND.ME, user);
	// socket.broadcast.emit(COMMAND.HELLO, user); // let everyone else know I connected

// 	/**
// 	 * User user
// 	 * obj {coords:[x, y], drawing:boolean}
// 	 */
// 	socket.on(COMMAND.MOVE, function(obj) {
// 		obj.user = socket.user;
// 		draw_queue[COMMAND.MOVE] = obj;
// 	});
// 	socket.on(COMMAND.MOUSEDOWN, function(obj) {
// 		obj.user = socket.user;
// 		socket.broadcast.emit(COMMAND.MOUSEDOWN, obj);
// 	})

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

		user.toonId = data.toonId;
		socket.emit(KQ.CHARACTER_SELECT, null);

		// var ready = true;
		// if(game.users.forEach(u => {
		// 	if(!u.toon) ready = false;
		// }));
		// if(ready) socket.emit(KQ.GAME_START, null);
	});

	socket.on(KQ.KEY_UPDATE, data => {
		user.keys = data;
	});

	socket.on('disconnect', data => {
		// socket.broadcast.emit(COMMAND.GOODBYE, user);
		// clearInterval(loop_id);
		user.toonId = undefined;
		game.users = game.users.filter(o => o.id == user.id);
	});
});

console.log('server started');

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});





