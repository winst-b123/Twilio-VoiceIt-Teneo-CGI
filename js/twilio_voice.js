"use strict";

const qs = require('querystring');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const TIE = require('@artificialsolutions/tie-api-client');
const dotenv = require('dotenv');
dotenv.config();
const sessionMap = new Map();


const {
    TENEO_ENGINE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_OUTBOUND_NUMBER,
    LANGUAGE_STT,
    LANGUAGE_TTS,
    TWILIO_OUTBOUND_NUMBER_WA
} = process.env;

const postPath = {
    default: '/'
};

const teneoApi = TIE.init(TENEO_ENGINE_URL);
const twilioLanguage = LANGUAGE_STT || 'en-US'; // See: https://www.twilio.com/docs/voice/twiml/gather#languagetags
const twilioVoiceName = LANGUAGE_TTS || 'Polly.Joanna'; // See: https://www.twilio.com/docs/voice/twiml/say/text-speech#amazon-polly

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
var arrears="";
var contractNum="";
var fname="";
var numMissed="";
var daysSince="";
var email="";
var teneoSessionId;
 var TWILIO_MODE = "ivr";
var OUTBOUND_NUMBER = TWILIO_OUTBOUND_NUMBER;

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
                  // Detect if userinput exists
                if (post.CallStatus === 'in-progress' && post.SpeechResult) {
                    userInput = post.SpeechResult;
                    console.log("User said: " + userInput);
                    // Capture confidence score
                    if (post.Confidence) {
                        confidence = post.Confidence;
                    }
                }   
                    
            if(post.From!=TWILIO_OUTBOUND_NUMBER || TWILIO_MODE=="ivr") {
             var mode = req.query["mode"];
                if(mode!==undefined) {
                    TWILIO_MODE = mode;
                }
                console.log("mode: " + TWILIO_MODE);  
                console.log("contractNum: " + contractNum);
            // get message from user
                if(post.Body!==undefined) {
                    userInput = post.Body;
                }
               console.log(`userInput: ${userInput}`);
                if(phone === "") {
                    if("phone" in req.query) {
                        phone = "+" + req.query["phone"].replace(/[^0-9]/g, '');
                    }
                    else {
                        phone = post.From;
                    }
                }
                 if(TWILIO_MODE=="whatsapp") {
                if(!phone.startsWith("whatsapp:")) {
                    phone = "whatsapp:" + phone;
                }
                if(post.From.startsWith("whatsapp:")) {
                  phone = post.From;  
                } 
                }
                console.log("Phone: " + phone);
                
                // get the caller id
                //const callSid = post.CallSid;


                // check if we have stored an engine sessionid for this caller
              
                teneoSessionId = sessionHandler.getSession(phone);
                                
                console.log("session ID retrieved: " + teneoSessionId);
                console.log("mode in inbound: " + TWILIO_MODE);        

                var parameters = {};
                // Detect digit input from the user, add additional if statement to capture timeout
                if(post.Digits !== "timeout" && post.Digits) {
                    parameters["keypress"] = post.Digits;
                }

                // Detect if recording exists from input
                if(post.RecordingSid) {
                    parameters["url"] = post.RecordingUrl;
                }
                var MediaUrl0 = post.MediaUrl0;   
                console.log(`MURL: ${MediaUrl0}`);
                parameters["phone"] = phone;
                if(MediaUrl0===undefined){
                    MediaUrl0="";
                }
  

                var contentToTeneo = {'text': userInput, "parameters": JSON.stringify(parameters), "channel":"twilio-whatsapp", "mediaurl":MediaUrl0, "arrearsContractNum":contractNum
                                         , "arrearsAmt":arrears , "arrearsName":fname , "numMissed":numMissed, "daysSince":daysSince, "contractEmail":email};


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
                 if(TWILIO_MODE=="ivr") {
                    sessionHandler.setSession(phone, teneoSessionId);
                if(twilioAction === postPath.default) {
                    twilioAction = twilioActions.gather_default;
                }

                switch (twilioAction) {

                    // Twilio action to handle voice inputs by end-user, speaking to the end user and then capturing the voice subsequently.
                    case twilioActions.gather_default:
                        var twiml = new VoiceResponse();
                        twiml.gather({
                            input: 'speech dtmf',
                            action: postPath.default,
                            actionOnEmptyResult: false,
                            language: twilioLanguage,
                            timeout: 5,
                            speechTimeout: "auto"
                        }).say({
                            voice: twilioVoiceName,
                            language: twilioLanguage
                        }, teneoResponse.output.text);
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                        break;

                    // Twilio action to handle voice recording by end-user, starts with a beep and records the audio to a audio file.
                    case twilioActions.record_default:
                        var twiml = new VoiceResponse();
                        twiml.say({
                            voice: twilioVoiceName,
                            language: twilioLanguage
                        }, teneoResponse.output.text);
                        twiml.record({
                            action: postPath.default,
                            maxLength: 5,
                            trim: 'do-not-trim'
                        });
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                        break;

                    case twilioActions.hang_up:
                        var twiml = new VoiceResponse();
                        twiml.say({
                            voice: twilioVoiceName,
                            language: twilioLanguage
                        }, teneoResponse.output.text);
                        twiml.hangup();
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                        break;
                }

              
                }
                else {
                    sessionHandler.setSession(phone, teneoSessionId);
                    // return teneo answer to twilio
                    sendTwilioMessage(teneoResponse, res, phone);
                }
                  
                   
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
            console.log("IN HANDLE OUTBOUND !" + TWILIO_MODE);
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
            var mode = req.query["mode"];
                if(mode!==undefined) {
                    TWILIO_MODE = mode;
                    if(mode=="whatsapp") {
                        OUTBOUND_NUMBER = TWILIO_OUTBOUND_NUMBER_WA;   
                    }
                }
                console.log("mode: " + TWILIO_MODE);         
            contractNum = req.query["contractNum"];
                if(contractNum===undefined) {
                    contractNum = "";
                }
                console.log("contractNum: " + contractNum);
            arrears= req.query["arrears"];
                if(arrears===undefined) {
                    arrears = "0.00";
                }
                console.log("arrears: " + arrears);
            fname= req.query["fname"];
                if(fname===undefined) {
                    fname = "";
                }
                console.log("fname: " + fname);
            numMissed = req.query["numMissed"];
                if(numMissed===undefined) {
                    numMissed = "";
                }
                console.log("numMissed: " + numMissed);
             daysSince = req.query["daysSince"];
                if(daysSince===undefined) {
                    daysSince = "";
                }
                console.log("daysSince: " + daysSince);
             email = req.query["email"];
                if(email===undefined) {
                    email = "";
                }
                console.log("email: " + email);
                    var contentToTeneo = {'text': userInput, "parameters": JSON.stringify(parameters), "channel":"twilio-whatsapp", "arrearsContractNum":contractNum
                                         , "arrearsAmt":arrears , "arrearsName":fname , "numMissed":numMissed, "daysSince":daysSince, "contractEmail":email};
                    console.log("Content to Teneo: " + JSON.stringify(contentToTeneo).toString());
                    // Add "_phone" to as key to session to make each session, regardless when using call/sms
                    teneoResponse = await teneoApi.sendInput(teneoSessionId, contentToTeneo);
                     teneoSessionId = teneoResponse.sessionId;
                    console.log("session ID retrieved3: " + teneoSessionId);
                     console.log("Output response 1: " + teneoResponse.output.text);
  
            
          
            // store engine sessionid for this sender
            
               if(TWILIO_MODE=="sms") {
                   sessionHandler.setSession(phone, teneoSessionId);
                // return teneo answer to twilio
                sendTwilioMessage(teneoResponse, res, phone);
                       teneoSessionId = sessionHandler.getSession(phone);
                   console.log("session ID retrieved4: " + teneoSessionId);

               }
            else if(TWILIO_MODE=="ivr") {
                //const callSid = post.CallSid;
                const url = "https://" + req.headers["host"] + "/";
                var twiml = new VoiceResponse();
                        twiml.gather({
                            input: 'speech dtmf',
                            action: postPath.default,
                            actionOnEmptyResult: false,
                            language: twilioLanguage,
                            timeout: 5,
                            speechTimeout: "auto"
                        }).say({
                            voice: twilioVoiceName,
                            language: twilioLanguage
                        }, teneoResponse.output.text);
                console.log("URL: " + url);
                client.calls
                .create({
                    url: url,
                    twiml: twiml.toString(), 
                    to: phone,
                    from: TWILIO_OUTBOUND_NUMBER
                })
                .then(call =>
                   // console.log(JSON.stringify(call)); 
                   sessionHandler.setSession(phone, teneoSessionId)   
                );
                teneoSessionId = sessionHandler.getSession(phone);

            }
            else {
                sessionHandler.setSession("whatsapp:"+phone, teneoSessionId);
                // return teneo answer to twilio
                sendTwilioMessage(teneoResponse, res, "whatsapp:"+phone);
                       teneoSessionId = sessionHandler.getSession("whatsapp:"+phone);
                console.log("session ID retrieved4: " + teneoSessionId);
            }
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
