let canvas
let players
const mid = {}
const PADDING = 10
const pressed_keys = new Set()

let GAME_STATE = 'waiting'
let death_frame = 0

function setup () {
    canvas = createCanvas(windowWidth, windowHeight)
    mid.width = (width) / 2
    mid.height = (height) / 2
    noStroke()
    players = new PlayerManager()
    pixelDensity(1)
}

function draw () {
    fill(200)
    if (GAME_STATE === 'waiting') {
        players.draw()
        if (pressed_keys.has(' ')) {
            GAME_STATE = 'playing'
        }
    } else if (GAME_STATE === 'over') {
        players.draw()
        if (pressed_keys.has(' ')) GAME_STATE = 'reset'
    } else if (GAME_STATE === 'playing') {
        players.update()
    } else if (GAME_STATE === 'reset') {
        console.log('reseting')
        background(0)
        players.reset()
        GAME_STATE = 'waiting'
    }
    loadPixels()
}

function keyPressed () {
    pressed_keys.add(key)
    players.lastPress(key)
    players.onKeyPress(key)
}

function keyReleased () {
    pressed_keys.delete(key)
}

function getPixelAt (position) {
    let { x, y } = position
    x = Math.floor(x)
    y = Math.floor(y)
    const pixel_array =  [pixels[(x + y * width) * 4], pixels[(x + y * width) * 4 + 1], pixels[(x + y * width) * 4 + 2]]
    return pixel_array
}

function isSameArray (arr1, arr2) {
    let is_same = true
    arr1.forEach((element, index) => {
        if (Math.floor(element) !== Math.floor(arr2[index])) {
            is_same = false
        }
    })
    return is_same
}

class PlayerManager {
    constructor () {
        this.players = []
        this.last_color = 0
        this.color_list = [
            color(200,0,0),
            color(0,200,0),
            color(0,0,200)
        ]
        this.spacing = PADDING * 2
        this.positions = new Array(Math.floor(width / this.spacing)).fill(0).map((position, index) => {
            return { x: index * this.spacing, y: mid.height, taken: false }
        })
        this.taken_controls = new Set()
    }

    reset () {
        this.players.forEach(player => {
            const { controls, id, color } = player
            player.death_color = undefined
            player = new Player({ controls, id, color })
        })
    }

    addPlayer (args) {
        this.players.push(new Player(args))
    }

    update () {
        this.players.forEach(player => player.update())
    }

    draw () {
        this.players.forEach(player => player.draw())
    }

    lastPress (key) {
        this.players.forEach(player => player.lastPress(key))
    }

    onKeyPress (key) {
        if (this.taken_controls.has(key) || key.length > 1 || key === ' ') return
        this.taken_controls.add(key)
        
        const last_player = this.players[this.players.length - 1]
        if (last_player !== undefined && last_player.controls.right === 0) {
            last_player.controls.right = key
            return
        }

        let p_color
        if (this.last_color > this.color_list.length) {
            p_color = color(Math.random() * 255, Math.random() * 255, Math.random() * 255)
        } else {
            p_color = this.color_list[this.last_color++]
        }
        let rand_pos = Math.floor(Math.random() * this.positions.length)
        while (this.positions[rand_pos].taken)
            rand_pos = Math.floor(Math.random() * this.positions.length)
        const { x, y } = this.positions[rand_pos]
        let position = createVector(x, y)
        this.positions[rand_pos].taken = true
        this.addPlayer({ id: rand_pos, color: p_color, position, controls: { left: key, right: 0 } })
    }
}

class Entity {
    constructor(args){
        this.id = args.id;
        this.position = args.position ?? createVector(0, 0)
    }
}
class Player extends Entity {
    rotation = PI;
    controls;
    constructor(args){
        super(args);
        this.rotation_speed = args.rotation_speed ?? PI / 30;
        this.controls = args.controls ?? {
            left: 0,
            right: 0
        };
        this.speed = createVector(0, -1)
        this.speed.mult(args.scalar ?? 1.2)
        this.color = args.color ?? color(200, 100, 100)

        this.shape_multi = 2.5
    }
    update() {
        const { right , left  } = this.controls;
    
        if (pressed_keys.has(this.controls.left) || pressed_keys.has(this.controls.right)) {
            const rot_orientation = this.latest_press === this.controls.left ? -1 : 1;
            this.rotate(rot_orientation);
        }

        this.position.add(this.speed)

        if (this.position.x > width - PADDING) this.position.x = PADDING
        if (this.position.x < PADDING) this.position.x = width - PADDING
        
        if (this.position.y > height - PADDING) this.position.y = PADDING
        if (this.position.y < PADDING) this.position.y = height - PADDING

        let ahead_position = createVector(this.position.x, this.position.y)
        ahead_position.add(this.speed.x * (this.shape_multi * 1.5), this.speed.y * (this.shape_multi * 1.5))

        const pixel_levels = getPixelAt(ahead_position)
        const { levels } = color(0, 0, 0)

        if (!isSameArray(pixel_levels, levels) && frameCount > 15) {
            GAME_STATE = 'over'
            this.death_color = color(255)
            death_frame = frameCount
        }

        this.draw();
    }
    draw() {
        const { x , y  } = this.position;
        push();
        fill(this.death_color ?? this.color);
        translate(x, y);
        rotate(this.rotation);
        
        const sm = this.shape_multi

        triangle(-.5 * sm, -sm, -1.5 * sm, -sm, -.5 * sm, 1.5 * sm)
        triangle( .5 * sm, -sm,  1.5 * sm, -sm,  .5 * sm, 1.5 * sm)

        pop();
    }
    rotate(rot_orientation) {
        const rotation_delta = this.rotation_speed * rot_orientation
        this.speed.rotate(rotation_delta)
        this.rotation += rotation_delta
    }
    lastPress (key) {
        if (key === this.controls.left || key === this.controls.right) this.latest_press = key
    }
}
