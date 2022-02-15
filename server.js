"use strict";
/**
 * Primary endpoint path for the Twilio application to redirect.
 * All Twilio actions will redirect to the original Twilio endpoint.
 * @type {{default: string}}
 */
const postPath = {
  default: '/'
};

/**
 * Constants
 */
const http = require('http');
const path = require('path');
const express = require('express');
const twilio_voice = require(path.resolve('js', 'twilio_voice.js'));

/**
 * Initialise variables using environment parameters
 */
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000;

// initialize an Express application
const app = express();
app.use(express.json());
const router = express.Router();

// Tell express to use this router with /api before.
app.use(postPath.default, router);

// twilio message comes in
const twilio_voice_instance = new twilio_voice();

router.all(postPath.default, twilio_voice_instance.handleInboundCalls());

// start the express application
http.createServer(app).listen(port, () => {
  console.log(`Listening on port: ${port}`);
});
