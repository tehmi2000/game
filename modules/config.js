/**
 * This file contains the configuration of the app including connection functions to database and access keys
 */
const model = function(){

    const fs = require("fs");
    const mysql = require("mysql");
    const mongodb = require("mongodb").MongoClient;
    const ObjectID = require("mongodb").ObjectId;


    const query_create = "CREATE TABLE users (id INT(100) NOT NULL AUTO_INCREMENT PRIMARY KEY, uID VARCHAR(100) NOT NULL, username VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, firstname VARCHAR(255) NOT NULL, lastname VARCHAR(255) NOT NULL, telcode VARCHAR(255) NOT NULL, phone VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, address VARCHAR(255) NOT NULL, profile_picture VARCHAR(255) NOT NULL) ENGINE=InnoDB  DEFAULT CHARSET=utf8";
    const query_test = "SELECT * FROM users";

    // LOCALHOST CONNECTION
    const conn = mysql.createConnection({
        host: 'localhost',
        user: 'tehmi2000',
        password: '<password>',
        database: "game_db"
    });

    const log = function(err) {
        let content = `${(new Date).toUTCString()}: ${JSON.stringify(err)}` + "\n";
        fs.appendFile("./error_log.txt", content, function(err) {
            if(err){
                console.log(err);
            }
        });
        // throw err;
        console.error(err);
    };

    return {
        log,
        ObjectID,
        connection: conn,

        MONGO_CLIENT: mongodb,
        MONGO_URL: "mongodb://localhost:27017",
        mOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        },
        
        create: query_create,
        test: query_test
    };
};

module.exports = model();