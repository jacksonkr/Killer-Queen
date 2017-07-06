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
	KEY_UPDATE:"key_update",
	VIRTUAL_UPDATE:"virtual_update",
	CHARACTER_SELECT:"character_select",
	TEAM_BLUE:"teamBlue",
	TOON_QUEEN:"queen",
	TOON_WORKER:"worker",

	// server specific
	KEY_SPACE:" ",
	KEY_UP:"ArrowUp",
	KEY_DOWN:"ArrowDown",
	KEY_LEFT:"ArrowLeft",
	KEY_RIGHT:"ArrowRight",
}

class KQGround {
	constructor(x, y, w, h) {
		this.left = x;
		this.top = y;
		this.width = w;
		this.height = h;
	}

	hitTest(x, y) {
		if(x >= this.left 
		&& x <= this.left + this.width
		&& y >= this.top
		&& y <= this.top + this.height)
			return true;

		return false;
	}
}

class KQToon {
	constructor(id) {
		// this.team = team;
		this.id = id;
		this.left = 0; // from css
		this.top = 0; // from css
		this.width = 0; // from css
		this.height = 0; // from css
		this.accel = 0;
		this.speed = 1;
		this.direction = 1;
	}
}
class KQWorker extends KQToon {
	constructor(id) {
		super(id);
	}
}
class KQQueen extends KQToon {
	constructor(id) {
		super(id);

		this.speed = 3;
	}
}

var game = {
	props: {
		gravity_max: 4,
		gravity_rate: 0.15,
	},
	users: [],
	virtual: {
		level: {
			width: 800,
			height: 600,
			elements:[],
			ground:[]
		}
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
					game.virtual.level[id] = vobj;
					break;
				case id.indexOf('worker') >= 0:
					vobj = new KQWorker(id);
					game.virtual.level[id] = vobj;
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
				vobj.left = s2n(j.left);
				vobj.top = s2n(j.top);

				if(j.width)
					vobj.width = s2n(j.width);
				if(j.height)
					vobj.height = s2n(j.height);
			}
			
			// game.virtual.level[id] = vobj;
		}

		// console.log(game.virtual)
	});
});


const gameTimer = setInterval(() => {
	game.users.forEach(user => {
		try {
			if(!user.team) return; // user isn't ready yet

			var toon = game.virtual.level[user.toonId];

			// check toon against ground
			game.virtual.level.ground.forEach(gr => {
				
				// bottom center (ground)
				while(gr.hitTest(toon.left + toon.width/2, toon.top + toon.height)) {
					toon.top -= 0.1;
					toon.accel = 0;
				}

				// top center (ceiling)
				while(gr.hitTest(toon.left + toon.width/2, toon.top)) {
					toon.top += 0.1;
					toon.accel = 0;
				}

				// right middle (wall)
				while(gr.hitTest(toon.left + toon.width, toon.top + toon.height/2)) {
					toon.left -= 0.1;
				}

				// left middle (wall)
				while(gr.hitTest(toon.left, toon.top + toon.height/2)) {
					toon.left += 0.1;
				}
			});

			user.keys.forEach(key => {
				switch(true) {
					case key == KQ.KEY_SPACE:
					    toon.accel = -5;
						// toon.top -= toon.speed;
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
			var xos = user.keys.indexOf(KQ.KEY_SPACE);
			if(xos >= 0) user.keys.splice(xos, 1);

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
		// { team: 'team-blue', toon: 'toon-queen' }
		user.team = data.team;
		user.toon = data.toon;
		user.toonId = data.team + '-' + data.toon;
	});

	socket.on(KQ.KEY_UPDATE, data => {
		user.keys = data;
	});

	socket.on('disconnect', data => {
		// socket.broadcast.emit(COMMAND.GOODBYE, user);
		// clearInterval(loop_id);
		game.users = game.users.filter(o => o.id == user.id);
	});
});

console.log('server started');

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});





