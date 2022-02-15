"use strict";

const qs = require('querystring');
const TIE = require('@artificialsolutions/tie-api-client');
const dotenv = require('dotenv');
dotenv.config();

const {
    TENEO_ENGINE_URL,
    API_KEY,
} = process.env;


const teneoApi = TIE.init(TENEO_ENGINE_URL);
const apiKey = API_KEY || 'Not set';

/**
 * Variables used to keep track of current state.
 */
var teneoResponse = null;

console.log("TENEO_ENGINE_URL: " + TENEO_ENGINE_URL);

class twilio_voice {

    // handle incoming twilio message
    handleInboundCalls() {
        
        return async (req, res) => {

            let body = '';

            req.on('data', function (data) {
                console.log(data.toString());
                body += data;
            });

            req.on('end', async function () {

                var teneoSessionId;
                var userInput;
                var passedSessionId;
                var channelParam;
                var callerLongitude;
                var callerLatitude;
                var channel;
            
                var post = qs.parse(body);

                if(body !== undefined 
                    && body != "" 
                    && body != "{}" 
                    && post.From === undefined) {

                    var parsed = JSON.parse(body);
                    userInput = parsed.text;
                    channelParam = parsed.channel;
                    var params = parsed.parameters;

                    if(params !== undefined) 
                    {
                        passedSessionId = params["session"];
                        callerLatitude = params["latitude"];
                        callerLongitude = params["longitude"];
                    }
                }
                
                if(userInput===undefined) {
                    userInput = "";
                }
                
                console.log("userInput: " + userInput);  

                if(userInput != "hi") {
                                
                    if(passedSessionId === undefined || passedSessionId === null || passedSessionId == "") {

                        teneoSessionId = ""
                    }
                    else {

                        teneoSessionId = passedSessionId; 
                    }                             

                    if(channel == "geoloc") {

                        TWILIO_MODE = "none";
                    }

                    if(channelParam == "geoloc") {

                        channel = "geoloc";
                    }         
                                    
                    console.log("session ID retrieved: " + teneoSessionId);
                    console.log("mode in inbound: " + TWILIO_MODE);        

                    var parameters = {};
    
                    if(channel == "geoloc") {

                        contentToTeneo = {'text': userInput, "parameters": JSON.stringify(parameters), "channel":channel, "latitude":callerLatitude, "longitude":callerLongitude, 'apiKey': apiKey};
                    }

                    console.log("Content to Teneo INBOUND: " + JSON.stringify(contentToTeneo).toString());
                                    
                    teneoResponse = await teneoApi.sendInput(teneoSessionId, contentToTeneo);

                    teneoSessionId = teneoResponse.sessionId;
                    console.log("session after call: " + teneoSessionId);              
                }      
                
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end();                                           
            });                
        }
    }   
}

module.exports = twilio_voice;
