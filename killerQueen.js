"use strict";

paper.install(window);

const TEAM = {
	BLUE:"team-blue",
	GOLD:"team-gold"
};
const TOON = {
	STANDING:"stance.png",
	RUNNING:"run.png",
	FLYING:"flying.png",
};
const WIN = {
	CAGE:"win-cage",
	MILITARY:"win-military",
	ECONOMIC:"win-economic"
}

class Level {
	constructor() {
		this.ground = null; // array of svg shapes
	}

	load(path) {
		var self = this;
		paper.project.importSVG(path, function(item) {
			item.sendToBack();

			self.ground = [];

			for(var i in item.children[1].children) {
				var o = item.children[1].children[i];
				self.ground.push(o.toPath());
			}

			KQGame.instance.levelLoaded(self);

			self.reset();
		});
	}

	reset() {
	
	}
}
class LevelTest extends Level {
	constructor() {
		super();

		this.startingLocations = {};
		this.startingLocations[TEAM.BLUE] = {x: 320, y:50};
		this.startingLocations[TEAM.GOLD] = {x: 500, y:50};

		this.load('assets/level-test.svg');
	}

	reset() {
		this.po = new Group();

		this.eggs = [];
		this.snail = null;
		this.snailCages = [];
		this.berries = [];
		this.berryGoals = [];
		this.placeBerryGoals();
		this.placeBerries();
		this.placeEggs();
		this.placeSnail();
	}

	placeSnail() {
		this.snail = new KQSnail({
			x:410,
			y:570
		});
		this.snailCages.push(new KQSnailCage({
			group:this.po,
			teamName:TEAM.BLUE,
			x:50,
			y:565
		}));
		this.snailCages.push(new KQSnailCage({
			group:this.po,
			teamName:TEAM.GOLD,
			x:750,
			y:565
		}));
	}

	placeEggs() {
		var self = this;
		var buildEggStack = function(props) {
			var w = 40;
			var coords = [w*0, w*1, w*2];
			coords.forEach(function(coord) {
				self.eggs.push(new KQEgg({
					group:self.po,
					teamName:props.teamName,
					x:props.x + coord,
					y:props.y
				}));
			});
		}

		buildEggStack({
			teamName:TEAM.BLUE,
			x:280,
			y:78
		});
	}

	placeBerries() {
		var self = this;
		var buildBerryStack = function(props) {
			var w = 9;
			var h = 9;
			var coords = [
				       [w, 0],
			   [w*0.5, h], [w*1.5, h],
			[0, h*2], [w, h*2], [w*2, h*2]];

			coords.forEach(function(coord) {
				self.berries.push(new KQBerry({
					group:self.po,
					x: props.x + coord[0],
					y: props.y + coord[1]
				}));
			})
		}

		var stacks = [
		[150, 337], // blue side
		[150, 456],
		[200, 566],
		[635, 336], // gold side
		[635, 456],
		[585, 566]];
		stacks.forEach(function(stack) {
			buildBerryStack({
				x: stack[0],
				y: stack[1]
			});
		});
		
	}

	placeBerryGoals() {
		var self = this;
		var buildHoneyComb = function(props) {
			var xx = 11;
			var yy = 11;
			var coords = [
			[xx*0, yy*0.5],[xx*0, yy*1.5],
			[xx*1, yy*0],[xx*1, yy*1],[xx*1, yy*2],
			[xx*2, yy*0.5],[xx*2, yy*1.5],
			[xx*3, yy*0],[xx*3, yy*1],[xx*3, yy*2],
			[xx*4, yy*0.5],[xx*4, yy*1.5]];

			coords.forEach(function(coord) {
				self.berryGoals.push(new KQBerryGoal({
					group:self.po,
					teamName:props.teamName,
					x:props.x + coord[0],
					y:props.y + coord[1]
				}));
			});
		}

		buildHoneyComb({
			teamName:TEAM.BLUE,
			x:320,
			y:25
		});
		buildHoneyComb({
			teamName:TEAM.GOLD,
			x:440,
			y:25
		});
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
	}

	levelLoaded(level) {
		this.level = level;

		this.teams = [new KQTeam(TEAM.BLUE), new KQTeam(TEAM.GOLD)];

		new HumanPlayer(this.teams[0].members[0]);
	}

	gameOver(type) {
		console.log(type);
	}
}

class KQTeam {
	constructor(name) {
		this.teamName = name;

		this.members = [];
		// this.members.push(new KQQueen(this));
		// this.members.push(new KQWorker(this));
		// this.members.push(new KQWorker(this));
		// this.members.push(new KQWorker(this));
		this.members.push(new KQWorker(this));
	}
}

class KQItem {
	constructor() {
		this.po = new Group();

		var self = this;
		this.po.onFrame = function(event) {
			self.onFrame(event);
		};
		
		this.accel = 0;

		var w = 10; // radius todo: needs to be split to width height
		
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
	}

	set resource(str) {
		this._resource = new Raster(str)
	}
	get resource() {
		return this._resource;
	}

	onFrame() {}

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

class KQEgg extends KQItem {
	constructor(props) {
		super();

		this.teamName = props.teamName;

		this.resource = "assets/queen-egg.png";
		props.group.addChild(this.resource);
		this.resource.sendToBack();

		this.resource.position.x = props.x;
		this.resource.position.y = props.y;
	}
}

class Shrine extends KQItem {
	constructor() {
		super();
	}
}
class ShrineWarrior extends Shrine {
	constructor() {
		super();
	}
}
class ShrineSpeed extends Shrine {
	constructor() {
		super();
	}
}

class KQSnail extends KQItem {
	constructor(props) {
		super();

		this.teamName = props.teamName;

		this.speed = 10.1;

		this.resource = "assets/snail.png";
		this.po.addChild(this.resource);
		this.resource.sendToBack();

		this.po.position.x = props.x;
		this.po.position.y = props.y;
	}

	get rider() {
		return this._rider;
	}
	set rider(toon) {
		this._rider = toon;
		toon.snail = this;
	}

	jump() {
		// jump off
		this._rider.po.position.x += 40;
		this._rider.snail = null;
		this._rider = null;
	}

	onFrame() {
		super.onFrame();

		// check for cage collisson
		var self = this;
		KQGame.instance.level.snailCages.forEach(function(cage) {
			if(cage.teamName == self.teamName) {
				if(cage.po.hitTest(cage.po.position)) {
					KQGame.instance.gameOver(WIN.SNAIL);
				}
			}
		});
	}
}

class KQSnailCage extends KQItem {
	constructor(props) {
		super();

		this.teamName = props.teamName;

		this.resource = "assets/snail-cage.png";
		props.group.addChild(this.resource);
		this.resource.sendToBack();

		if(this.teamName == TEAM.BLUE) // flip horizontal
			this.resource.scale(-1, 1)

		this.resource.position.x = props.x;
		this.resource.position.y = props.y;
	}
}

class KQBerryGoal extends KQItem {
	constructor(props) {
		super();

		this._berry = null;
		this.teamName = props.teamName;

		this.resource = "assets/berry-goal.png";
		props.group.addChild(this.resource);

		this.resource.position.x = props.x;
		this.resource.position.y = props.y;
	}

	set berry(o) {
		o.rescued(this);
		this._berry = o;
	}
	get berry() {
		return this._berry;
	}
}

class KQBerry extends KQItem {
	constructor(props) { // to parent po group (for the level)
		super();

		this.stacked = true; // stacked by default
		this.free();
		this.captor = null;

		this.resource = "assets/berry.png";
		props.group.addChild(this.resource);

		this.resource.position.x = props.x;
		this.resource.position.y = props.y;
	}

	taken(captor) {
		this.captor = captor;
		this.active = false;
		this.stacked = false;
	}

	free() {
		this.active = true;
	}

	rescued(goal) {
		this.captor = null;
		this.active = false;

		this.resource.position.x = goal.resource.position.x;
		this.resource.position.y = goal.resource.position.y;
	}

	onFrame() {
		if(this.captor) {// someone is carrying this berry
			this.resource.position.x = this.captor.po.position.x;
			this.resource.position.y = this.captor.po.position.y - 15;
		}
	}
}

class KQToon extends KQItem {
	constructor(team) {
		super();

		this.speed = 1;

		this.resource = TOON.STANDING;
		this.po.addChild(this.resource);
	}

	jump() {
		this.grounded = false;
		this.accel = -5;// KQGame.instance.gravity_max * -1.25;
	}

	attack() {

	}

	set resource(str) {
		super.resource = this.resourceBase + str;
	}
	get resource() {
		return super.resource;
	}

	onFrame(event) {
		this.grounded = false;

		// enact gravity on character
		this.accel += KQGame.instance.gravity_accel;
		if(this.accel > KQGame.instance.gravity_max) this.accel = KQGame.instance.gravity_max;
		this.po.position.y += this.accel;

		// check if the character is hitting a wall / ground and adjust
		var self = this;
		if(KQGame.instance.level) {
			KQGame.instance.level.ground.forEach(function(g) {
				self.barrierCheck(g);
			});
		}

		// character moved off the screen
		if(this.po.position.y > KQGame.instance.canvas.height) this.po.position.y = 0;
		if(this.po.position.y < 0) this.po.position.y = KQGame.instance.canvas.height;
		if(this.po.position.x > KQGame.instance.canvas.width) this.po.position.x = 0;
		if(this.po.position.x < 0) this.po.position.x = KQGame.instance.canvas.width;
	}
}
class KQTeamMember extends KQToon {
	constructor(team) {
		super();

		this.team = team;

		this.appearAtStart();
	}

	appearAtStart() {
		var sl = KQGame.instance.level.startingLocations[this.team.teamName];
		this.po.position.x = sl.x;
		this.po.position.y = sl.y;
	}
}
class KQWorker extends KQTeamMember {
	constructor(team) {
		super(team);

		this.berry = null; // currently carrying a berry

		this.speed = 1.5;
	}

	get resourceBase() {
		return "assets/worker-"
	}

	get snail() {
		return this._snail;
	}
	set snail(o) {
		this._snail = o;
	}

	jump() {
		if(this.grounded)
			super.jump();
	}

	takeBerry(berry) {
		this.berry = berry;
		berry.taken(this);
	}

	onFrame() {
		super.onFrame();

		// check for berry collisions
		var self = this;
		KQGame.instance.level.berries.forEach(function(berry) {
			var ht = self.po.hitTest(berry.resource.position);
			if(ht && !self.berry && berry.active && !berry.captor) self.takeBerry(berry);
		});

		// check for berry goal collision
		KQGame.instance.level.berryGoals.forEach(function(goal) {
			var ht = self.po.hitTest(goal.resource.position);
			if(ht && self.berry && !goal.berry && goal.teamName == self.team.teamName) {
				goal.berry = self.berry;
				self.berry = null;
			}
		});

		// check for snail collision
		var snail = KQGame.instance.level.snail;
		var ht = self.po.hitTest(snail.resource.position);
		if(ht && !snail.rider) snail.rider = self;

		if(this.snail) {
			this.po.position.x = this.snail.po.position.x;
			this.po.position.y = this.snail.po.position.y - 10;
		}
	}
}
class KQWarrior extends KQTeamMember {
	constructor(team) {
		super(team);

		this.speed = 2;
	}

	get resourceBase() {
		return "assets/warrior-";
	}
}
class KQQueen extends KQWarrior {
	constructor(team) {
		super(team);

		// this.po.strokeColor = 'black';
		// this.po.strokeWidth = 2;
	}

	// set resource(str) {
	// 	super.resource = str;
	// 	this._resource.position.y -= 5; // for queen
	// }
	get resourceBase() {
		return "assets/queen-";
	}
	jump() {
		super.jump();
	}
}

class Player {
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

		var t = this.toon;
		if(t.snail) t = this.toon.snail;

		if(kd("ArrowUp")) {
			if(this.arrowUp == false) {
				this.arrowUp = true;
				t.jump();
			}
		}
		if(kd(" ")) {
			t.attack();
		}
		if(kd("ArrowDown")) {
			if(!(t instanceof KQWorker))
				t.po.position.y += t.speed;
		}
		if(kd("ArrowLeft")) {
			// this.toon.po.scaling = new Point(-1, 1);
			t.po.position.x -= t.speed;
		}
		if(kd("ArrowRight")) {
			// this.toon.po.scaling = new Point(1, 1);
			t.po.position.x += t.speed;
		}

		if(ku("ArrowUp")) {
			this.arrowUp = false;
		}

		// this.onKeyUp({key:" "});
	}
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
}

window.onload = function() {
	var canvas = document.getElementById("killer-queen");
	new KQGame(canvas);
	new LevelTest();
}