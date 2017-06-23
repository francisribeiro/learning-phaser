var game = new Phaser.Game(960, 600, Phaser.AUTO, null, {
    init: init,
    preload: preload,
    create: create,
    update: update
});

var hero;
var keys;
var sfx;
var coinPickupCount;

function init() {
    // Forbid the anti-aliasing for pixel art
    game.renderer.renderSession.roundPixels = true;

    // keys from keyboard
    keys = game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.SPACEBAR
    });

    // Enable Jump
    keys.up.onDown.add(function () {
        let didJump = hero.jump();
        if (didJump)
            sfx.jump.play();
    }, this);

    coinPickupCount = 0;
}

function preload() {
    // Game size and resize
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;

    ////////////////////////////////////////////////////////////////
    // Loading sprites

    // Backgound
    game.load.image('background', 'images/background.png');

    // Platforms
    game.load.image('ground', 'images/ground.png');
    game.load.image('grass:8x1', 'images/grass_8x1.png');
    game.load.image('grass:6x1', 'images/grass_6x1.png');
    game.load.image('grass:4x1', 'images/grass_4x1.png');
    game.load.image('grass:2x1', 'images/grass_2x1.png');
    game.load.image('grass:1x1', 'images/grass_1x1.png')

    // Hero
    game.load.spritesheet('hero', 'images/hero.png', 36, 42);

    // Coin
    game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    game.load.audio('sfx:coin', 'audio/coin.wav');

    //Spiders
    game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    game.load.image('invisible-wall', 'images/invisible_wall.png');
    game.load.audio('sfx:stomp', 'audio/stomp.wav');

    ////////////////////////////////////////////////////////////////

    // Loading level
    game.load.json('level:1', 'data/level01.json');


    // Loading levels
    game.load.audio('sfx:jump', 'audio/jump.wav');

    //scoreboard
    game.load.image('icon:coin', 'images/coin_icon.png');
    game.load.image('font:numbers', 'images/numbers.png');

}

function create() {
    // Loading backgound
    game.add.image(0, 0, 'background');

    // Loading level
    _loadLevel(game.cache.getJSON('level:1'));

    // Create sound entities
    sfx = {
        jump: game.add.audio('sfx:jump'),
        coin: game.add.audio('sfx:coin'),
        stomp: game.add.audio('sfx:stomp')
    };

    _createHud();

}

function update() {
    _handleCollisions();
    _handleInput();
    coinFont.text = `x${coinPickupCount}`;
}

////////////////////////////////////////////////////////////////
// Build the level
function _loadLevel(data) {
    // Create all the groups/layers that we need
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    // Spawn platforms
    data.platforms.forEach(_spawnPlatform);

    // Spawn hero and enemies
    _spawnCharacters({
        hero: data.hero,
        spiders: data.spiders
    });

    // Spawn important objects
    data.coins.forEach(_spawnCoin);

    // Enable gravity
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
}

// Spawn the level platforms
function _spawnPlatform(platform) {
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
}

// Hero
function Hero(game, x, y) {
    // Call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');
    this.anchor.set(0.5, 0.5);

    // Enable physics
    game.physics.enable(this);

    //Collision with the World
    this.body.collideWorldBounds = true;

    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
}

// Inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;
Hero.prototype.move = function (direction) {
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    }
    else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
}
Hero.prototype.jump = function () {
    const JUMP_SPEED = 600;
    let canJump = this.body.touching.down;

    if (canJump)
        this.body.velocity.y = -JUMP_SPEED;

    return canJump;
}

// Spawn the characters
function _spawnCharacters(data) {
    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    hero = new Hero(game, data.hero.x, data.hero.y);
    game.add.existing(hero);
}

// Handle the user input
function _handleInput() {
    if (this.keys.left.isDown) // Move hero left
        this.hero.move(-1);
    else if (this.keys.right.isDown) // Move hero right
        this.hero.move(1);
    else
        this.hero.move(0);
}

function _handleCollisions() {
    game.physics.arcade.collide(this.spiders, this.platforms);
    game.physics.arcade.collide(this.spiders, this.enemyWalls);
    game.physics.arcade.collide(this.hero, this.platforms);
    game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this);
    game.physics.arcade.collide(this.spiders, this.platforms);
    game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
}

function _spawnCoin(coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);
    game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play('rotate');
};

function _onHeroVsCoin(hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    coinPickupCount++;
};

function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');

    // physic properties
    game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

function _spawnEnemyWall(x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    // physic properties
    game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

Spider.prototype.update = function () {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    } else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};

function _onHeroVsEnemy(hero, enemy) {
    if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
        hero.bounce();
        enemy.die();
        this.sfx.stomp.play();
    }
    else { // game over -> restart the game
        this.sfx.stomp.play();
        this.game.state.restart();

    }
}

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};

Spider.prototype.die = function () {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

function _createHud() {
    const NUMBERS_STR = '0123456789X ';
    coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);
    let coinIcon = this.game.make.image(0, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.position.set(10, 10);
    this.hud.add(coinScoreImg);
}

Hero.prototype._getAnimationName = function () {
    let name = 'stop'; // default animation

    // jumping
    if (this.body.velocity.y < 0) {
        name = 'jump';
    }
    // falling
    else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
        name = 'fall';
    }
    else if (this.body.velocity.x !== 0 && this.body.touching.down) {
        name = 'run';
    }

    return name;
};

Hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
    }
};