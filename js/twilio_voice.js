"use strict";

const qs = require('querystring');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const TIE = require('@artificialsolutions/tie-api-client');
const dotenv = require('dotenv');
dotenv.config();
const sessionMap = new Map();


const {
    TENEO_ENGINE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_OUTBOUND_NUMBER
} = process.env;

const postPath = {
    default: '/'
};

const teneoApi = TIE.init(TENEO_ENGINE_URL);

let twilioActions = {
    gather_default: '/gather_default',
    record_default: '/record_default',
    outbound_call: '/outbound_call',
    hang_up: '/hang_up'
};
let twilioAction = postPath.default;

/**
 * Variables used to keep track of current state.
 */
var teneoResponse = null;
var confidence = "";
var phone = "";
var flow = "";
var teneoSessionId;

// Initiates the biometric authentication solution
var userInput = "Authentication";

console.log("TENEO_ENGINE_URL: " + TENEO_ENGINE_URL);

function _stringify (o)
{
  const decircularise = () =>
  {
    const seen = new WeakSet();
    return (key,val) => 
    {
      if( typeof val === "object" && val !== null )
      {
        if( seen.has(val) ) return;
        seen.add(val);
      }
      return val;
    };
  };
  
  return JSON.stringify( o, decircularise() );
}
    // compose and send message
function sendTwilioMessage(teneoResponse, res, triggerFrom) {
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var mediaUrl="";
// Detect if Teneo solution have provided a Twilio action as output parameter
if(Object.keys(teneoResponse.output.parameters).length !== 0) {
   if(Object.keys(teneoResponse.output.parameters).includes("MediaUrl")) {
      mediaUrl = teneoResponse.output.parameters["MediaUrl"];
      console.log("Media URL: " + mediaUrl);
       if( mediaUrl!==undefined && mediaUrl!==null && mediaUrl!="") { 
            mediaUrl = " (" + mediaUrl + ")";   
       }
       else {
          mediaUrl="";   
       }
   }
}
if(triggerFrom!==undefined && triggerFrom!==null && triggerFrom!="") {
    console.log('trying to send outbound message: ${teneoResponse.output.text}');
    console.log(`to: ${triggerFrom}`)
    console.log(`from: ${TWILIO_OUTBOUND_NUMBER}`)
client.messages
      .create({
         from: TWILIO_OUTBOUND_NUMBER,
         body:  teneoResponse.output.text + "" + mediaUrl,
         to: triggerFrom
       })
      .then(message => console.log(message.sid));
}
 else {
     console.log('replying to inbound message: ${teneoResponse.output.text}');
  const message = teneoResponse;
  const twiml = new MessagingResponse();

  twiml.message(message);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
   console.log(`twim1: ${twiml.toString()}`);
 }
}

class twilio_voice {

    // handle incoming twilio message
    handleInboundCalls() {
const sessionHandler = this.SessionHandler();
        

        return async (req, res) => {

            let body = '';

            req.on('data', function (data) {
                body += data;
            });

            req.on('end', async function () {
                // parse the body
                
                if(userInput!="hi") {
                var post = qs.parse(body);
                console.log("post: " );
                console.log(_stringify(post));
                  var from = post.From;
                 console.log(`from: ${from}`);
            if(post.From!=TWILIO_OUTBOUND_NUMBER) {
            // get message from user
               userInput = post.Body;
               console.log(`userInput: ${userInput}`);
                if(phone === "") {
                    if("phone" in req.query) {
                        phone = "+" + req.query["phone"].replace(/[^0-9]/g, '');
                    }
                    else {
                        phone = post.From;
                    }
                }
                if(!phone.startsWith("whatsapp:")) {
                    phone = "whatsapp:" + phone;
                }
                if(post.From.startsWith("whatsapp:")) {
                  phone = post.From;  
                } 
                console.log("Phone: " + phone);
                
                // get the caller id
                //const callSid = post.CallSid;


                // check if we have stored an engine sessionid for this caller
                teneoSessionId = sessionHandler.getSession(phone);
                
                console.log("session ID retrieved: " + teneoSessionId);

                var parameters = {};
                var MediaUrl0 = post.MediaUrl0;   
                console.log(`MURL: ${MediaUrl0}`)
                parameters["phone"] = phone;

                var contentToTeneo = {'text': userInput, "parameters": JSON.stringify(parameters), "channel":"twilio-whatsapp", "mediaurl":MediaUrl0};


                console.log("Content to Teneo INBOUND: " + JSON.stringify(contentToTeneo).toString());
                
                
                // Add "_phone" to as key to session to make each session, regardless when using call/sms
                    teneoResponse = await teneoApi.sendInput(teneoSessionId, contentToTeneo);
                teneoSessionId = teneoResponse.sessionId;

                // Detect if Teneo solution have provided a Twilio action as output parameter
                if(Object.keys(teneoResponse.output.parameters).length !== 0) {
                    if(Object.keys(teneoResponse.output.parameters).includes("twilioAction")) {
                        twilioAction = teneoResponse.output.parameters["twilioAction"];
                    }
                }
               
                console.log("Output response 3: " + teneoResponse.output.text);

                // store engine sessionid for this sender
                sessionHandler.setSession(phone, teneoSessionId);

                // return teneo answer to twilio
                sendTwilioMessage(teneoResponse, res, phone);
                   
                } 
                }
                else {
                userInput="";
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end();
                }
            });
        }
    }

    handleOutboundCalls() {
  const sessionHandler = this.SessionHandler();
        return async (req, res) => {
            console.log("IN HANDLE OUTBOUND WHATSAPP!");
            const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
            phone = "+" + req.query["phone"].replace(/[^0-9]/g, '');  
            //phone = "+" + req.url.replace("/outbound_call", "").replace(/[^0-9]/g, '');
            console.log("Phone: " + phone);
            // check if we have stored an engine sessionid for this caller
             teneoSessionId = sessionHandler.getSession("whatsapp:"+phone);
            console.log("session ID retrieved2: " + teneoSessionId);
            userInput = req.query["userInput"];   
            if(userInput===undefined || userInput===null || userInput=="") {
              userInput="Hi";
            }
             console.log("userInput: " + userInput);
            const url = "https://" + req.headers["host"] + "/";
            console.log("URL: " + url);
            
                    var parameters = {};
                    parameters["phone"] = phone;
                    var contentToTeneo = {'text': userInput, "parameters": JSON.stringify(parameters), "channel":"twilio-whatsapp"};
                    console.log("Content to Teneo: " + JSON.stringify(contentToTeneo).toString());
                    // Add "_phone" to as key to session to make each session, regardless when using call/sms
                    teneoResponse = await teneoApi.sendInput(teneoSessionId, contentToTeneo);
                     teneoSessionId = teneoResponse.sessionId;
                    console.log("session ID retrieved3: " + teneoSessionId);
                     console.log("Output response 1: " + teneoResponse.output.text);
  
            
          
            // store engine sessionid for this sender
                sessionHandler.setSession("whatsapp:"+phone, teneoSessionId);
            


                // return teneo answer to twilio
                sendTwilioMessage(teneoResponse, res, "whatsapp:"+phone);
                       teneoSessionId = sessionHandler.getSession("whatsapp:"+phone);
            console.log("session ID retrieved4: " + teneoSessionId);
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end();
        }
    }
    
SessionHandler() {
      

        return {
            getSession: (userId) => {
                if (sessionMap.size > 0) {
                    return sessionMap.get(userId);
                }
                else {
                    return "";
                }
            },
            setSession: (userId, sessionId) => {
                sessionMap.set(userId, sessionId)
            }
        };
    }
    
}

module.exports = twilio_voice;
