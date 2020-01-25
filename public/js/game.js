// Socket Connections
let socket = io();
let worker = null;

socket.on("game", function(data){
    console.log(data);
});

socket.on("disconnect", function() {
    if(updateTimer){
        createNotification("You are disconnected, you would be reconnected soon");
        clearInterval(updateTimer);
    }
});

socket.on("reconnect", function() {
    createNotification("You are connected, Enjoy!")
    startDataUpdate();
});

socket.on("player", function(data){
    createNotification(`${data.id} joined the game`);
    enemies[`${data.id}`] = new Enemy(data);
    console.log(enemies);
});

socket.on("enemy-update", function(data) {
    // debugger
    let enemyID = data.id;
    if(!enemies[`${enemyID}`]){
        createNotification(`${data.id} joined the game`);
        enemies[`${data.id}`] = new Enemy(data);
    }

    // console.log({enemyProp: data.data});
    let target = enemies[`${enemyID}`];
    if(target){
        target.props = Object.assign({}, target.props, data.data);
        if(gameState.isPaused === false){
            target.updatePlaneDisplay(target.props.x, target.props.y, target.props.angle);
        }
        
        // console.log(enemies);
    }
});

socket.on("enemy-delete", function(id) {
    console.log("Enemy Delete");
    console.log(id);
    if(enemies[`${id}`]){
        createNotification(`${id} left the game`);
        enemies[`${id}`].destroy();
        delete enemies[`${id}`];
    }
});

// Initialise global variables
let gameClock = null;
let updateTimer = null;
let touchTimer = null;
let gameState = {
    FPS: 100,
    isPaused: false
};
const enemies = {};
let player = null;
let obstacles = [];

const monitor = {player, enemies, gameClock, gameState};
const playData = {
    id: null,
    x: null,
    y: null,
    angle: null,
    thrust: {
        x: null, 
        y: null
    },
    thrustMultiplier: {
        x: null, 
        y: null
    },
    isThrusting : false,
    isAccelerating: false,
    inertia: null,
    mass: null
};

// initialize some elements
const displayID = document.querySelector(".score-board #player-id");
const pauseBtn = document.querySelector(".top-container .pause-btn");
const displayPlane = document.querySelector(".monitor .oriental-plane");
const angleDisplay = document.querySelector(".orientation-display .angle-unit");
const displayCoordX = document.querySelector(".monitor .coords-x");
const displayCoordY = document.querySelector(".monitor .coords-y");
const steering = document.querySelector(".steering");

class Player{
    constructor(camera){
        this.id = `Player_${genHex(8)}`;
        this.skin = ["#ffffff", "#cecece", "#ffffff", "#cecece", "#ffffff", "#8d8d8d", "#ffffff", "#cecece", "#cecece", "#c0c0c0"];
        this.element = null;
        this.elementCamera = null;
        this.x = 20;
        this.y = 40;
        this.angle = 0;
        this.thrust = {x: 0, y: 0};
        this.gravityMultiplier = 0.5;
        this.thrustMultiplier = {x: 0, y: 0};
        this.thrustDampCoefficent = 0.00005;
        
        this.isThrusting = false;
        this.isAccelerating = false;

        this.inertia = 1;
        this.mass = 2000;// 2000kg
        this.force = 0;

        displayID.innerHTML = this.id;
        this.create(this.id, camera);
    }

    create(id, camera){
        document.querySelector(".life.bar .value").style.width = "100%";

        let plane = create("DIV");
        let planeHead = create("DIV");
        let planeBody = create("DIV");
            let planeTail = create("DIV");
            let planeCockpit = create("DIV");
            let planeWings = create("DIV");
            let wingFire = create("DIV");
        let planeExhaust = create("DIV");
        let tailFire = create("DIV");

        plane.setAttribute("id", id);

        plane.classList.add("plane");
        planeHead.classList.add("plane-head");
        planeBody.classList.add("plane-body");
        planeTail.classList.add("plane-tail");
        planeCockpit.classList.add("plane-cockpit");
        planeWings.classList.add("plane-wings");
        wingFire.classList.add("fire", "wing-fire");
        planeExhaust.classList.add("plane-exhaust");
        tailFire.classList.add("fire", "tail-fire");
        
        planeBody = joinComponent(planeBody, planeTail, planeCockpit, planeWings, wingFire);
        plane = joinComponent(plane, planeHead, planeBody, planeExhaust, tailFire);

        document.body.appendChild(plane);

        this.element = document.querySelector(`#${id}`);
        this.elementCamera = camera;
        let cameraBound = this.elementCamera.getBoundingClientRect();
        let planeBound = this.element.getBoundingClientRect();

        // calculate the x, y coordinates in pixels
        this.x = (cameraBound.x + (cameraBound.width/2)) - (planeBound.width/2);
        this.y = (cameraBound.y + (cameraBound.height/2)) - (planeBound.height/2);

        // convert to percentage
        this.x = (this.x/window.outerWidth) * 100;
        this.y = (this.y/window.outerHeight) * 100;

        console.log({x: this.x, y: this.y});

        console.log("Player created");
        this.turnOnEngine(false);
    }

    calculateCameraPosition(){
        let x, y, plane = this.element.getBoundingClientRect(), camera = this.elementCamera.getBoundingClientRect();
        let planeX = plane.x, planeY = plane.y;
        
        x = (camera.width/2) - (plane.width/2);
        y = (camera.height/2) - (plane.height/2);

        // Convert to percentage
        x = (x / window.outerWidth) * 100;
        y = (y / window.outerHeight) * 100;

        return {x, y};
    }

    turnOnEngine(state){
        let tailflame = this.element.childNodes[3];
        let wingflame = this.element.childNodes[1].childNodes[3];

        if(state === true){
            tailflame.style.opacity = 1;
            wingflame.style.opacity = 1;

        }else{
            tailflame.style.opacity = 0;
            wingflame.style.opacity = 0;
        }
    }

    keyHandler(keyCode){
        // console.log(keyCode);
        switch (keyCode) {
            
            case 37: // Left
                this.setThrust({x: -1.5, y: 0});
                break;

            case "38": // Up (mobile)
                this.isThrusting = true;
                this.setThrust({x: 0, y: -1}); 
                break;

            case 38: // up
                this.isThrusting = true;
                this.setThrust({x: 0, y: -1});
                break;

            case 39: // Right
                this.isAccelerating = true;
                this.setThrust({x: 1, y: 0});
                break;

            case "40": // Down (mobile)
                this.isThrusting = false;
                this.setThrust({x: 0, y: 1.5});
                break;

            case 40: // down
                this.setThrust({x: 0, y: 2});
                break;
            
            case 49:
                this.setSkin(0);
                break;

            case 50:
                this.setSkin(1);
                break;

            case 51:
                this.setSkin(2);
                break;

            default:
                break;
        }
    }

    getPos(){
        return {x : this.x, y : this.y};
    }

    thrustControl(xThrust, yThrust){

        // console.log({force: this.mass * resultant(this.thrust.x, this.thrust.y)}); // F = m * a
        const calculateDXY = function(dx, dy, angleOfPlane) {
            // debugger;
            let angleOfThrust = 0;
            let magnitude = 0;

            if(dx === 0){ // Vertical control key was pressed
                magnitude = dy; // Thrust acts in the opposite direction to lift
                angleOfThrust = angleOfPlane - 90;

            }else if (dy === 0) { // Horizontal control key was pressed
                magnitude = dx;
                angleOfThrust = angleOfPlane;
                
            }else{
                magnitude = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));
                angleOfThrust = angleOfPlane - 45;
            }


            let newX = magnitude * Math.cos(angleOfThrust * (Math.PI/180));
            let newY = magnitude * Math.sin(angleOfThrust * (Math.PI/180));

            return {newX, newY};
        };

        let resultantThrust = Math.round(resultant(this.thrust.x, this.thrust.y)); // Z = SQRT(X^2 + Y^2)
        // If plane has thrust then...
        if(resultantThrust > 0){
            this.turnOnEngine(true);
            this.inertia = 1;
            // debugger
            let xDistance = xThrust / 100; // Convert x-component of thrust to distance
            let yDistance = yThrust / 100; // Convert y-component of thrust to distance

            // Calculate the change in position based on the current thrust and angle of plane
            let {newX, newY} = calculateDXY(xDistance, yDistance, this.angle);
            // Display the position of plane using new coordinates...
            this.setPos(newX, newY);

            // then, pass the current thrust to setThrust function for increment or decrement.
            this.setThrust({x : xThrust, y : yThrust});
            this.inertia = 0;
        }else{
            this.turnOnEngine(false);
        }
    }

    setThrust(thrust){
        // Boundary limits are 0 <= thrustMultiplier.x <= 1
        let oldThrust = {
            x: this.thrust.x,
            y: this.thrust.y
        };

        const MAX_THRUST = 150;
        const MIN_THRUST = 0;

        // Player is not thrusting horizontally, reduce horizontal thrust...
        if(this.isAccelerating === false){
            // thrustMultiplier is reduced
            if(this.thrustMultiplier.x > 0){
                // reduce multiplier by 0.00005
                this.thrustMultiplier.x -=  this.thrustDampCoefficent;
            }else{
                this.thrustMultiplier.x = 0;
            }

            // Reduce horizontal thrust by 1 if player is braking else by...
            this.thrust.x -= (thrust.x < 0)? 2 : 1 - this.thrustMultiplier.x;
        // Else If player is thrusting horizontally, increase the horizontal thrust
        }else{
            // increase multiplier
            this.thrustMultiplier.x += this.thrustDampCoefficent * 100;

            if(this.thrustMultiplier.x >= 1){
                this.thrustMultiplier.x =  1;
            }

            // increase thrust
            this.thrust.x += 5;
        }


        // Player is thrusting vertically, increase vertical thrust...
        if(this.isThrusting === true){
            // debugger
            this.angle += (thrust.y > 0)? 0.4 : -1.25;
            // increase multiplier
            this.thrustMultiplier.y += this.thrustDampCoefficent * 1000;

            if(this.thrustMultiplier.y >= 1){
                this.thrustMultiplier.y =  1;
            }

            // increase thrust
            this.thrust.y += 2.5;

        }else{

            this.thrustMultiplier.y = (this.thrustMultiplier.y > 0)? this.thrustMultiplier.y - this.thrustDampCoefficent : 0;

            this.thrust.y -= (thrust.y > 0)? 2 : 1 - this.thrustMultiplier.x;
        }

        // Keep x-thrust in boundary
        if(this.thrust.x > MAX_THRUST){
            this.thrust.x = MAX_THRUST;
        }else if(this.thrust.x < MIN_THRUST){
            this.thrust.x = MIN_THRUST;
        }

        // Keep y-thrust in boundary
        if(this.thrust.y > MAX_THRUST){
            this.thrust.y = MAX_THRUST;
        }else if(this.thrust.y < MIN_THRUST){
            this.thrust.y = MIN_THRUST;
        }

        this.force = this.mass * resultant(this.thrust.x - oldThrust.x, this.thrust.y - oldThrust.y);
        // console.log(this.force);
        document.querySelector(".speed-display .speed").innerHTML = Math.round(Math.sqrt(Math.pow(this.thrust.x, 2) + Math.pow(this.thrust.y, 2)));
    }

    setPos(x, y){
        // debugger

        if(x === 0){ 
            this.angle += (y > 0)? 0.15 : -0.4;
        }

        if(y === 0){
            // this.angle += (x > 0)? 0.15 : -0.4;
        }

        this.oldX = this.x;
        this.oldY = this.y;
        let cameraBound = this.elementCamera.getBoundingClientRect();
        let relCamPos = this.calculateCameraPosition();

        if((cameraBound.x + x) >= 0){
            this.x += x;
        }else{
            this.x = 1 + relCamPos.x; // Camera is plane is at the center of camera
        }

        if((cameraBound.y + y) >= 0){
            this.y += y;
        }else{
            this.y = 1 + relCamPos.y; // Camera is plane is at the center of camera
        }

        this.updatePlaneDisplay();

    }

    // For mobile devices
    rotatePlane(angle){
        this.angle += 0.1 * angle;
        this.element.style.transform = `rotateZ(${this.angle}deg)`;
        displayPlane.style.transform = `rotateZ(${this.angle}deg)`;
        angleDisplay.innerHTML = `${Math.round(this.angle)}&deg;`;
        steering.style.transform = `rotateZ(${angle}deg)`;
    }

    setSkin(number, flip){
        flip = flip || false
        const set = function(array, observer) {
            /**
             * 0,1 = head
             * 2, 3, 4 = body
             * 5 = wings
             * 6 = cockpit
             * 7 = exhaust
             * 8, 9 = tail
            */

            parts.head.style.backgroundImage = `linear-gradient(${array[0]}, ${array[1]})`;
            parts.body.style.backgroundImage = `linear-gradient(${array[2]}, ${array[3]})`;
            parts.body.style.backgroundColor = `${array[4]}`;
            parts.wings.style.backgroundColor = `${array[5]}`;
            parts.cockpit.style.borderColor = `${array[6]}`;

            if(flip === true){
                parts.exhaust.style.borderRightColor = `${array[7]}`;
                parts.tail.style.borderBottomColor = `${array[8]}`;
                parts.tail.style.borderRightColor = `${array[9]}`;
                
            }else{
                parts.exhaust.style.borderLeftColor = `${array[7]}`;
                parts.tail.style.borderBottomColor = `${array[8]}`;
                parts.tail.style.borderLeftColor = `${array[9]}`;

            }

            observer.skin = array;
        }
        
        const parts = {
            head: this.element.childNodes[0],
            body: this.element.childNodes[1],
            cockpit: this.element.childNodes[1].childNodes[1],
            exhaust: this.element.childNodes[2],
            tail: this.element.childNodes[1].childNodes[0],
            wings: this.element.childNodes[1].childNodes[2]
        };

        const skins = {
            0: function() {
                // White plane
                set(["#ffffff", "#cecece", "#ffffff", "#cecece", "#ffffff", "#8d8d8d", "#ffffff", "#cecece", "#cecece", "#c0c0c0"], this);
            },
            1: function() {
                // Red plane
                set(["#c90505", "#970303", "#c90505", "#970303", "#a50404", "#740303", "#c90505", "#830101", "#c40404", "#970303"], this);
            },
            2: function() {
                // Blue
                set(["#0505c9", "#030397", "#0505c9", "#030397", "#0404a5", "#030374", "#0505c9", "#010183", "#0404c4", "#030397"], this);
            },

        };

        skins[number]();
    }

    updatePlaneDisplay(x, y, angle){
        x = x || this.x;
        y = y || this.y;
        angle = angle || this.angle;
        let cameraPosition = this.calculateCameraPosition();
        let timeEase = (this.inertia === 1)? Power2.easeIn : Power0.easeNone;

        TweenMax.to(`#${this.element.id}`, 0.2, {
            top : `${this.y}%`, 
            left : `${this.x}%`,
            ease: timeEase
        });

        TweenMax.to(`#${this.elementCamera.id}`, 0.2, {
            top : `${this.y - cameraPosition.y}%`,
            left : `${this.x - cameraPosition.x}%`
        });

        displayCoordY.innerHTML = `y : ${Math.round(this.y)}`;
        displayCoordX.innerHTML = `x : ${Math.round(this.x)}`;

        this.element.style.transform = `rotateZ(${this.angle}deg)`;
        displayPlane.style.transform = `rotateZ(${this.angle}deg)`;
        angleDisplay.innerHTML = `${Math.round(this.angle)}&deg;`;

        let cameraBound = this.elementCamera.getBoundingClientRect();
        let dx, dy, exceedBoundX, exceedBoundY;
        if(cameraBound.y + cameraBound.height >= document.documentElement.clientHeight - 100){
            // console.log("scrolling...");
            dy = ((this.y)/100) * (window.outerHeight);
            exceedBoundY = true;
        }else{
            dy = this.y;
            exceedBoundY = false;
        }

        if(cameraBound.x + cameraBound.width >= document.documentElement.clientWidth - 100){
            dx = ((this.x)/100) * (window.outerWidth);
            exceedBoundX = true;
        }else{
            dx = this.x
            exceedBoundX = false;
        };

        if(exceedBoundX || exceedBoundY === true){
            window.scrollTo(dx, dy);
        }
        
    }

    gravityAction(){
        // Check if player is thrusting...
        if(this.isThrusting === true){
            // Apply constant gravity; remove all increment and dont increase it...
            this.gravityMultiplier = 0.5;
        }else{
            // Since player is not thrusting, tilt the plane down
            this.angle += 0.2 * this.gravityMultiplier;

        }

        // If plane is vertically straight, stop tilting the plane
        if(this.angle >= 90){
            this.angle = 90;
        }

        // Do not affect the x-component of plane...
        this.x += 0;
        // Drag the plane down by adding to the y-component every tick
        this.y += 0.2 * this.gravityMultiplier;

        this.thrustMultiplier.y = (this.thrustMultiplier.y > 0)? this.thrustMultiplier.y - (0.01 * this.gravityMultiplier) : 0;

        // update screen with the coordinates
        this.updatePlaneDisplay();

        // Increase gravity...
        if(this.gravityMultiplier < 3){
            this.gravityMultiplier += 0.09;
        }

    }

    collisionAction(){
        let observer = this;
        let searchRadius = 150;
        let planeX = this.element.getBoundingClientRect().left;
        let planeY = this.element.getBoundingClientRect().top;
        let planeWidth = this.element.getBoundingClientRect().width;
        let planeHeight = this.element.getBoundingClientRect().height;

        let value = {
            obstaclesInRadius: obstacles.filter((item) => {
                let resultantdistance = Math.round(resultant(item.x - planeX, item.y - planeY)); // Z = SQRT(X^2 + Y^2)
                return resultantdistance <= searchRadius;
            }),
            collided: false
        };

        // console.log(overlap(this.element, value[`obstaclesInRadius`]));

        value["collided"] = (function() {

            return value.obstaclesInRadius.some(function(obstacle) {
                let inter;
                if (observer.angle > 35 && observer.angle < 95){
                    inter = planeWidth;
                    planeWidth = planeHeight;
                    planeHeight = inter;
                    planeX = planeX - planeWidth;

                }else if(observer.angle < -35 && observer.angle > -95){

                    inter = planeWidth;
                    planeWidth = planeHeight;
                    planeHeight = inter;
                    planeY = planeY - planeHeight;

                }else{

                }

                let xIntersection = (obstacle.x < planeX + planeWidth && obstacle.x + obstacle.width > planeX);
                let yIntersection = (obstacle.y < planeY + planeHeight && obstacle.y + obstacle.height > planeY);
                
                let overlap = xIntersection && yIntersection;
                if(overlap === true){
                    document.querySelector(`#${obstacle.element}`).style.border = "1px solid red";
                }else{
                    document.querySelector(`#${obstacle.element}`).style.border = "none";
                }

                return overlap;
            });
        }());

        return value;
    }

    motionAction(){

        // Get the planes thrust in the x-direction and y-direction
        let {x, y} = this.thrust;
        this.thrustControl(x, y);
    }
};

class Enemy{
    constructor(props){
        this.props = props;
        this.create(props);
    }

    create(props){

        let plane = create("DIV");
        let planeHead = create("DIV");
        let planeBody = create("DIV");
            let planeTail = create("DIV");
            let planeCockpit = create("DIV");
            let planeWings = create("DIV");
            let wingFire = create("DIV");
        let planeExhaust = create("DIV");
        let tailFire = create("DIV");

        plane.setAttribute("id", props.id);

        plane.classList.add("plane", "flip-plane");
        planeHead.classList.add("plane-head");
        planeBody.classList.add("plane-body");
        planeTail.classList.add("plane-tail");
        planeCockpit.classList.add("plane-cockpit");
        planeWings.classList.add("plane-wings");
        wingFire.classList.add("fire", "wing-fire");
        planeExhaust.classList.add("plane-exhaust");
        tailFire.classList.add("fire", "tail-fire");
        
        planeBody = joinComponent(planeBody, planeTail, planeCockpit, planeWings, wingFire);
        plane = joinComponent(plane, planeHead, planeBody, planeExhaust, tailFire);

        document.querySelector(".receiver-port").appendChild(plane);

        this.props.element = document.querySelector(`#${props.id}`);
        console.log("Enemy created");
        // this.turnOnEngine(false);
    }

    destroy(){
        console.log(this.props.id);
        if(document.querySelector(`#${this.props.id}`)){
            document.querySelector(`#${this.props.id}`).parentNode.removeChild(document.querySelector(`#${this.props.id}`));
        }else{
            console.log(`Couldnt find plane #${this.props.id}`);
        }
    }

    getPos(){
        return {
            x: this.props.x,
            y: this.props.y
        };
    }

    setPos(x, y){
        this.props.y = y;
        this.props.x = x;
    }

    // For mobile devices
    rotatePlane(angle){

        this.props.angle += 0.07 * angle;
        this.props.element.style.transform = `rotateZ(${this.angle}deg)`;
    }

    updatePlaneDisplay(x, y, angle){
        // debugger
        x = x || this.props.x;
        y = y || this.props.y;
        angle = angle || this.props.angle;
        let timeEase = (this.props.inertia === 1)? Power2.easeIn : Power0.easeNone;

        TweenMax.to(`#${this.props.element.id}`, 0.2, {
            top : `${this.props.y}%`, 
            left : `${this.props.x}%`,
            ease: timeEase
        });

        this.props.element.style.transform = `rotateZ(${angle}deg)`;
    }

    setSkin(number, flip){
        flip = flip || false
        const set = function(array) {
            /**
             * 0,1 = head
             * 2, 3 = body
             * 4 = wings
             * 5 = cockpit
             * 6 = exhaust
             * 7, 8 = tail
            */

            parts.head.style.backgroundImage = `linear-gradient(${array[0]}, ${array[1]})`;
            parts.body.style.backgroundImage = `linear-gradient(${array[2]}, ${array[3]})`;
            parts.wings.style.backgroundColor = `${array[4]}`;
            parts.cockpit.style.borderColor = `${array[5]}`;

            if(flip === true){
                parts.exhaust.style.borderRightColor = `${array[6]}`;
                parts.tail.style.borderBottomColor = `${array[7]}`;
                parts.tail.style.borderRightColor = `${array[8]}`;
                
            }else{
                parts.exhaust.style.borderLeftColor = `${array[6]}`;
                parts.tail.style.borderBottomColor = `${array[7]}`;
                parts.tail.style.borderLeftColor = `${array[8]}`;

            }
        }
        
        const parts = {
            head: this.element.childNodes[0],
            body: this.element.childNodes[1],
            cockpit: this.element.childNodes[1].childNodes[1],
            exhaust: this.element.childNodes[2],
            tail: this.element.childNodes[1].childNodes[0],
            wings: this.element.childNodes[1].childNodes[2]
        };

        const skins = {
            0: function() {
                // White plane
                set(this.props.skin);
            },
            1: function() {
                // Red plane
                set(this.props.skin);
            },
            2: function() {
                // Blue
                set(this.props.skin);
            }

        };

        skins[number]();
        this.skin = number;
    }

};

const createNotification = function(input) {
    let id = genHex(5);
    let span = createComponent("SPAN", input);
    span.setAttribute("id", `${id}`);
    setTimeout(() => {
        document.querySelector(`#${id}`).parentNode.removeChild(document.querySelector(`#${id}`));
    }, 5000);
    document.querySelector("[data-notification]").appendChild(span);
    document.querySelector("[data-notification]").scrollTop = document.querySelector("[data-notification]").scrollHeight;
};

const resultant = function(x, y) {
    let z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    return z;
}

const startClock = function(tick) {
    return setInterval(function(){
        updateScreen();
    }, tick);
};

const pauseGame = function(evt) {
    if(gameState.isPaused === true){
        gameClock = startClock(gameState.FPS);
        gameState.isPaused = false;
        pauseBtn.style.borderColor = "rgb(81, 116, 192)";
    }else{
        clearInterval(gameClock);
        gameState.isPaused = true;
        pauseBtn.style.borderColor = "red";
    }
};

const updateScreen = function() {
    player.gravityAction();
    player.motionAction();
    player.collisionAction();
};

const addListeners = function() {

    document.documentElement.addEventListener("touchstart", function(evt) {
        // evt.preventDefault();
        clearInterval(touchTimer);
        touchTimer = setInterval(() => {
            player.keyHandler("38");
        }, 100);
    });

    document.documentElement.addEventListener("touchmove", function(evt) {
        // evt.preventDefault();
        const joystick = document.querySelector(".joystick");
        let pos = evt.changedTouches[0];
        joystick.style.opacity = "1";
        joystick.style.top = `${pos.pageY - 25}px`;
        joystick.style.left = `${pos.pageX - 25}px`;
        // console.log(evt.changedTouches[0].pageX);
    });

    document.documentElement.addEventListener("touchend", function(evt) {
        // evt.preventDefault();
        document.querySelector(".joystick").style.opacity = "0";
        clearInterval(touchTimer);
        
        touchTimer = setInterval(() => {
            if(player.thrust.x <= 0){
                clearInterval(touchTimer);
            }else{
                player.keyHandler("40");
            }
        }, 500);
    });
    
    window.addEventListener("keydown", function(evt) {
        // console.log(evt);
        switch (evt.keyCode) {
            case 32: //space -- pause
                pauseGame();
                break;
        
            default:
                if(gameState.isPaused === false){
                    evt.preventDefault();
                    player.keyHandler(evt.keyCode);
                }
                break;
        }
    });

    window.addEventListener("keyup", function(evt) {
        // console.log(evt);
        switch (evt.keyCode) {
            case 38: // up
                player.isThrusting = false;
                break;

            case 39: // Right
                player.isAccelerating = false;
                break;

            default:
                break;
        }
    });

    window.addEventListener("deviceorientation", function(evt) {
        if(evt.beta && gameState.isPaused === false){
            player.rotatePlane(evt.beta);
        }
    }, true);

    pauseBtn.addEventListener("click", pauseGame);
};

const startDataUpdate = function() {
    updateTimer = setInterval(() => {
        let data = Object.assign({}, playData, player);
        socket.emit("player-update", {
            id: player.id,
            data: data
        });
        // console.log(data)
    }, 500);
};

const generateObstacles = function() {
    const id = `obstacle_`+genHex(5);
    // Monitors obstacle creation state
    let complete = false;
    // Choose a random size of obstacle in pixels
    const OBJECT_SIZE = {
        width: (function(){
            let tenPercent = window.outerWidth * 0.07;
            return (Math.random()*tenPercent) + tenPercent
        }()), // From 100px to 199px
        height: (function(){
            let tenPercent = window.outerHeight * 0.1;
            return (Math.random()*tenPercent) + tenPercent
        }()) // From 100px to 199px
    };

    const OBSTACLE_POS = {
        x: (function() {
            if(obstacles.length > 0){
                let lastElement = obstacles[obstacles.length - 1];
                return lastElement.x + window.outerWidth * 0.15;
            }else{
                return window.outerWidth * 0.1;
            }
        }()),

        y: (function() {
            if(obstacles.length > 0){
                let lastElement = obstacles[obstacles.length - 1];
                return lastElement.y + 10;
            }else{
                return window.outerHeight * 0.5;
            }
        }())
    };

    const OBSTACLE_COLOR = "#4d1102";
    let OBSTACLE_BODY = create("DIV");

    OBSTACLE_BODY.classList.add("obstacles");

    OBSTACLE_BODY.style.top = `${OBSTACLE_POS.y}px`;
    OBSTACLE_BODY.style.left = `${OBSTACLE_POS.x}px`;
    OBSTACLE_BODY.style.width = `${OBJECT_SIZE.width}px`;
    OBSTACLE_BODY.style.height = `auto`;
    OBSTACLE_BODY.style.border = `1px solid transparent`;

    OBSTACLE_BODY.setAttribute("id", id);

    document.body.appendChild(OBSTACLE_BODY);

    OBSTACLE_BODY = document.querySelector(`#${id}`);
    while(complete === false){
        let widthComplete = false, heightComplete = false;

        let particleBody = create("SPAN");
        let particleWidth = Math.round((Math.random()*(window.outerHeight * 0.03)) + 5); // From 5px to 20px
        let particleHeight = window.outerHeight * 0.025;
        let radius1 = Math.round(Math.random()*100), radius2 = Math.round(Math.random()*100);
        let radius3 = Math.round(Math.random()*100), radius4 = Math.round(Math.random()*100);

        particleBody.style.width = `${particleWidth}px`;
        particleBody.style.height = `${particleHeight}px`;
        // particleBody.style.border = `1px solid ${OBSTACLE_COLOR}`;
        particleBody.style.marginTop = `${Math.round(Math.random() * 5) - 8}px`;
        particleBody.style.marginLeft = `${Math.round(Math.random() * 5) - 5}px`;
        particleBody.style.border = `1px solid #4a0900`
        particleBody.style.borderRadius = `${radius1}% ${radius2}% ${radius3}% ${radius4}%`;
        OBSTACLE_BODY.appendChild(particleBody);

        // 
        if(OBSTACLE_BODY.getBoundingClientRect().width >= OBJECT_SIZE.width){
            widthComplete = true;
        }

        // 
        if(OBSTACLE_BODY.getBoundingClientRect().height >= OBJECT_SIZE.height){
            heightComplete = true;
        }

        complete = widthComplete && heightComplete;
    }

    obstacles.push({
        x : OBSTACLE_BODY.getBoundingClientRect().left,
        y : OBSTACLE_BODY.getBoundingClientRect().top,
        width : OBSTACLE_BODY.getBoundingClientRect().width,
        height : OBSTACLE_BODY.getBoundingClientRect().height,
        element: OBSTACLE_BODY.id
    });
}

const startGame = function(){
    // debugger
    
    console.time("obstacle-generate");
    for(let i = 0; i < 8; i++){
        // console.log(i);
        generateObstacles();
    }
    console.timeEnd("obstacle-generate");

    // Create a new Player(camera);
    player = new Player(document.querySelector(".plane-camera"));
    player.setSkin(0);

    addListeners();
    pauseGame();
    window.scrollTo(0, 0); // Set focus
    
    let dataPlayer = Object.assign({}, playData, player);
    socket.emit("player-create", dataPlayer);
    // startDataUpdate();
};

document.addEventListener("DOMContentLoaded", function() {
    console.time("start-game");
    worker = new Worker("/js/workers/collisionWorker.js");
    worker.onerror = (evt) => {
        console.error(evt);
        worker.terminate();
    };
    
    startGame();
    console.timeEnd("start-game");
});