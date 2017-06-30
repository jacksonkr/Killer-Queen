"use strict";

paper.install(window);

class Level {
	constructor() {
		this.ground = null; // array of svg shapes
	}

	static get active() {
		return Level._active;
	}
	static set active(o) {
		Level._active = o;
	}

	load(path) {
		var self = this;
		paper.project.importSVG(path, function(item) {
			item.sendToBack();

			self.ground = [];

			// item.children[1].children.forEach(function(o) {
			for(var i in item.children[1].children) {
				var o = item.children[1].children[i];
				self.ground.push(o.toPath());
			}
			//);

			if(!Level.active) Level.active = self;
		})
	}
}
class LevelOne extends Level {
	constructor() {
		super();

		this.load('levels/test.svg');
	}
}

class KQGame {
	constructor(canvas) {
		KQGame.instance = this;
		
		this.gravity_accel = 0.15;
		this.gravity_max = 4.0;
		this.canvas = canvas;
		paper.setup(canvas);
		paper.view.draw();

		this.level = new LevelOne();

		this.teams = [new KQTeam()];//, new KQTeam()];

		new HumanPlayer(this.teams[0].members[0]);
	}
}

class KQTeam {
	constructor() {
		this.members = [];
		// this.members.push(new KQQueen());
		this.members.push(new KQWorker());
		// this.members.push(new KQWorker());
		// this.members.push(new KQWorker());
		// this.members.push(new KQWorker());
	}
}

class KQToon {
	constructor(team) {
		this.speed = 1;
		this.accel = 0;


		var w = 10;
		this.po = new Group(new Path.Circle({ // po paper object - this is the boundary 
			o:this,
			radius: w,
			fillColor: 'red'
		}));
		
		var k = 5; // boundary width / height
		var rk = w - k; // hard to explain, has do do with boundray positions
		var p = 0.1; // speed at which character adjusts after overlapping w a boundary
		this.po.addChild(new Path.Rectangle({ // top
			boundary:true,
			pushp:[0, p],
			point:[-k, -rk],
			size:[k*2, -k],
		}));
		this.po.addChild(new Path.Rectangle({ // right
			boundary:true,
			pushp:[-p, 0],
			point:[rk, -k],
			size:[k, k*2],
		}));
		this.po.addChild(new Path.Rectangle({ // bottom
			boundary:true,
			pushp:[0, -p],
			point:[-k, rk],
			size:[k*2, k],
		}));
		this.po.addChild(new Path.Rectangle({ // left
			boundary:true,
			pushp:[p, 0],
			point:[-k-rk, -k],
			size:[k, k*2],
		}));

		var self = this;
		this.po.onFrame = function(event) {
			self.onFrame(event);
		};
	}

	get x() {
		return this.po.position.x;
	}
	set x(val) {
		this.po.position.x = val;
	}

	get y() {
		return this.po.position.y;
	}
	set y(val) {
		this.po.position.y = val;
	}

	jump() {
		this.grounded = false;
		this.accel = -5;// KQGame.instance.gravity_max * -1.25;
	}

	attack() {

	}

	onFrame(event) {
		this.grounded = false;

		// enact gravity on character
		this.accel += KQGame.instance.gravity_accel;
		if(this.accel > KQGame.instance.gravity_max) this.accel = KQGame.instance.gravity_max;
		this.po.position.y += this.accel;

		// check if the character is hitting a wall / ground and adjust
		var self = this;
		if(Level.active) {
			Level.active.ground.forEach(function(g) {
				self.barrierCheck(g);
			});
		}

		// character fell off the screen
		if(this.po.position.y > KQGame.instance.canvas.height) this.po.position.y = 0;
	}

	/**
	 * checks character against barrier and adjusts as necessary
	 * @param p is the path to checked against (ground / wall)
	 */
	barrierCheck(p) {
		// if another player, get moving velocities

		// check if attacking for kill
		
		// check ground/wall collision with player
		var self = this;
		var adjusted = false; // was the character moved during the check?
		var c = this.po.children;
		for(var i in c) {
			var o = c[i];
			if(o.boundary) { // ground / walls
				var intersections = [];
				do {
					intersections = o.getIntersections(p);
					if(intersections.length) {
						adjusted = true;
						var px = o.pushp[0];
						var py = o.pushp[1];

						if(Math.abs(py) > 0)
							this.accel = 0 - KQGame.instance.gravity_accel;
						
						this.po.position.x += px;
						this.po.position.y += py;
					}
				}
				while(intersections.length);
			}
		}

		// is character touching ground?

		// ground left
		var g = new Point(this.po.position.x-5, this.po.position.y + 11);
		var ht = p.hitTest(g);
		if(ht) this.grounded = true;

		// ground right
		g = new Point(this.po.position.x+5, this.po.position.y + 11);
		ht = p.hitTest(g);
		if(ht) this.grounded = true;

		return adjusted;
	}
}
class KQWorker extends KQToon {
	constructor() {
		super();

		this.speed = 1.5;
	}

	jump() {
		if(this.grounded)
			super.jump();
	}
}
class KQWarrior extends KQToon {
	constructor() {
		super();

		this.speed = 2;
	}
}
class KQQueen extends KQWarrior {
	constructor() {
		super();

		this.po.strokeColor = 'black';
		// this.po.strokeWidth = 2;
	}
}

class Player {

}
class AIPlayer extends Player {

}
class HumanPlayer extends Player {
	constructor(toon) {
		super();

		this.toon = toon;
		this.arrowUp = false; // if arrowUp is currently being used
		this.keysDown = [];

		var self = this;
		window.addEventListener("keydown", function(event) {
			self.onKeyDown(event);
		});
		window.addEventListener("keyup", function(event) {
			self.onKeyUp(event);
		});
		paper.view.onFrame = function() {
			self.onFrame();
		}
	}

	onKeyDown(event) {
		this.keysDown.push(event.key);
		this.keysDown = [...new Set(this.keysDown)]; // keep values unique
	}

	onKeyUp(event) {
		var i = this.keysDown.indexOf(event.key);
		if(i >= 0) {
			this.keysDown.splice(i, 1);
		}
	}

	onFrame(event) {
		var self = this;
		var kd = function(str) {
			if(self.keysDown.indexOf(str) >= 0) return true;
			return false;
		}
		var ku = function(str) {
			if(self.keysDown.indexOf(str) < 0) return true;
			return false;
		}

		if(kd("ArrowUp")) {
			if(this.arrowUp == false) {
				this.arrowUp = true;
				this.toon.jump();
			}
		}
		if(kd(" ")) {
			this.toon.attack();
		}
		if(kd("ArrowDown")) {
			this.toon.y += this.toon.speed;
		}
		if(kd("ArrowLeft")) {
			this.toon.x -= this.toon.speed;
		}
		if(kd("ArrowRight")) {
			this.toon.x += this.toon.speed;
		}

		if(ku("ArrowUp")) {
			this.arrowUp = false;
		}

		// this.onKeyUp({key:" "});
	}
}

window.onload = function() {
	var canvas = document.getElementById("killer-queen");
	new KQGame(canvas);
}