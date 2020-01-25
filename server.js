"use strict";

// VARIABLE ASSIGNMENTS
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io =  require("socket.io")(server);
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const PORT = (process.env.PORT === "" || process.env.PORT === null || process.env.PORT === undefined)? 7113 : process.env.PORT;
const controller = require("./modules/controller");
const config =  require("./modules/config");

// APPLICATION SETUP
app.use("/", express.static(__dirname + "/public"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({
    secret: "i am a secret",
    resave: true,
    saveUninitialized: true
}));
server.listen(PORT, "0.0.0.0", function() {
    console.log(process.env.NODE_ENV);
    console.log("Server started...");
    console.log(`Server currently running on port ${PORT}`);
});

// DATABASE SETUP AND CONNECTION
// config.connection.connect(function(err) {
//     if (err) {
//         config.log(err);
//     } else {
//         console.log('Connected to mysql server!');
//         console.log("Checking for mysql initialization requirements...");

//         config.connection.query(config.test, function(err){
//             if(err){
//                 try{
//                     config.connection.query(config.create, function(err){
//                         if(err) {
//                             config.log(err);
//                         } else {
//                             console.log("Mysql database is initialized and ready");
//                         }
//                     });
//                 }catch(error){
//                     config.log(err);
//                 }
//             }else{
//                 console.log("Connection to database is successful!");
//             }
//         });
//     }
// });

// APPLICATION ROUTING
app.get("/", controller.dashboard);

// app.post("/auth", controller.auth); // Login handler
// app.post("/register", controller.register); // Sign up/Registration handler
// app.post("/myprofile/update", controller.update); // Profile handler

// For api request and connection
// app.use("/api", require("./router/apiRoute"));

// SOCKET CONNECTION
const playerData = {};

io.on("connection", function(socket) {
    console.log(`User ${socket.id} just came online`);

    socket.on("game", function(data) {
        socket.broadcast.emit("game", data);
        // console.log(data);
    });

    socket.on("player-create", function(data) {
        if (!playerData[`${socket.id}`]) {
            playerData[`${socket.id}`] = {
                socketID: socket.id,
                playerID: data.id
            };
        }

        socket.broadcast.emit("player", data);
        // console.log(data);
    });

    socket.on("player-update", function(data) {
        delete data.data.element;
        delete data.data.elementCamera;
        delete data.data.thrustDampCoefficent;
        delete data.data.thrustMultiplier;

        socket.broadcast.emit("enemy-update", data);
        // console.log(data);
    });

    socket.on("disconnect", function () {
        if (playerData[`${socket.id}`]){
            socket.broadcast.emit("enemy-delete", playerData[`${socket.id}`].playerID);
            console.log(`User ${socket.id} disconnected`);
        }
    });
});