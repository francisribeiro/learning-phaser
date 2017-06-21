var game = new Phaser.Game(960, 600, Phaser.AUTO, null, {
    init: init,
    preload: preload,
    create: create,
    update: update
});

var hero;
var keys;
var sfx;

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
    game.load.image('hero', 'images/hero_stopped.png');

    // Coin
    game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    game.load.audio('sfx:coin', 'audio/coin.wav');

    ////////////////////////////////////////////////////////////////

    // Loading level
    game.load.json('level:1', 'data/level01.json');


    // Loading levels
    game.load.audio('sfx:jump', 'audio/jump.wav');
}

function create() {
    // Loading backgound
    game.add.image(0, 0, 'background');

    // Loading level
    _loadLevel(game.cache.getJSON('level:1'));

    // Create sound entities
    sfx = {
        jump: game.add.audio('sfx:jump'),
        coin: game.add.audio('sfx:coin')
    };
}

function update() {
    _handleCollisions();
    _handleInput();
}

////////////////////////////////////////////////////////////////
// Build the level
function _loadLevel(data) {
    // Create all the groups/layers that we need
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();

    // Spawn platforms
    data.platforms.forEach(_spawnPlatform);

    // Spawn hero and enemies
    _spawnCharacters({
        hero: data.hero
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
}

// Inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;
Hero.prototype.move = function (direction) {
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
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
    game.physics.arcade.collide(this.hero, this.platforms);
    game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this);
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
};