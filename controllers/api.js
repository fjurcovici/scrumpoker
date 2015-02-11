var express = require('express');
var bodyParser = require('body-parser');

var router = express.Router();

// tell the router to always apply body parsing on the request before anything else
// router.use(bodyParser.urlencoded({
// 	extended: true
// }));

// for now, the only parsing we support - and make sure we don't try to parse non-json as json
router.use(bodyParser.json({ type: 'application/*+json' }));

/*
 * Detailed API description: 
 * 
 * 		https://docs.google.com/a/3pillarglobal.com/document/d/1aRRvqdY9PjkxMbWBqCUevedn3xwK8VLG9pj_8Ey3ZT4/edit#heading=h.aikq032kn1kr
 * 
 * Supported operations are CRUD only - no list, for now
 * 
 * URLs are all of the form /session/:id??version=1.0
 * 
 * Version is optional. If no version specified, use latest. Otherwise defer to right version
 * 
 */

// http status codes as consts - just to read them easier
var OK = 200;
var GONE = 410;
var FORBIDDEN = 403
var CREATED = 201;

// for the beginning, in-mem non-persistent map for sessions plus a really simple session id generation mechanism
var sessions = {};
var lastUsedSessionId = 0;

router.use(bodyParser.json());

router.get('/session/:sessionId', function(request, response, next) {
    // return JSON with session and 200 OK, if session exists, 410 GONE and empty body otherwise
	var sessionId = request.params.sessionId;
	if (!sessions[sessionId]) {
		response.writeHead(GONE).json({"reasons": ["No such session exists."]}).send();
	} else {
		var session = sessions[sessionId];
		response.writeHead(OK).set("ETag", session.version).json(session).send();
	}
	next();
});

router.post('/session/', function(request, response, next) {
	console.log("Started processing POST request.");
	var session = request.body;
	console.log(JSON.stringify(request.body));
	// return 403 FORBIDDEN with a message describing the validation error if invalid request
	var messages = __validateCreateSession(session);
	if (messages.length != 0) {
		response.status(FORBIDDEN).json({"reason": messages}).send();
	} else {
		// create a session
		sessions[++lastUsedSessionId] = session;
		session.id = lastUsedSessionId;
		session.version = 0;
		// return empty response with 201 CREATED
		response.status(CREATED).set("ETag", session.version).send();
	}
	console.log("Finished processing POST request.");
	next();
});

function __validateCreateSession(session) {
	var messages = [];
	// validations: id is not in the request, or null, version is missing, null or 0, session name present and not empty, users not null and not empty
	if (session.id) {
		messages.push("Request to create a session must not contain a session id.");
	}
	if (!session.name) {
		messages.push("Cannot create a session without a name.");
	}
	if (!session.users || !Array.isArray(session.users) || session.users.length == 0) {
		messages.push("When creating a session, at least one user must be present in the request.");
	}
	if (session.version && session.version > 0) {
		messages.push("When creating a session, the version has to be missing or set to 0.");
	}
	return messages;
}

router.head('/session/:sessionId', function(request, response, next) {
	var sessionId = request.params.sessionId;
	if (!sessions[sessionId]) {
		// return 401 GONE if session doesn't exist
		response.sendStatus(GONE).json({"reasons": ["No such session exists."]}).send();
	} else {
		// return 200 OK with empty body if session does exist, 410 GONE otherwise
		response.set("ETag", session.version).sendStatus(OK).send();
	}
	next();
});

router.put('/session/:sessionId', function(request, response, next) {
	// validations: version in request and version in store must be equal, session name present and not empty, users not null and not empty
	// return 409 CONFLICT if validation failed
	// increment version, persist session
	// return empty response with 205 RESET CONTENT
});

router.patch('/session/:sessionId', function(request, response, next) {
	// validations: must contain version and session id
	// return 409 CONFLICT if validation failed
	// increment version, load session from store, update it with all keys in request
	// return empty response with 205 RESET CONTENT
});

router.delete('/session/:sessionId', function(request, response, next) {
	// validation: session must exist
	// return 404 NOT FOUND if session doesn't exist, 
	// delete session from storage
	// return empty body 204 NO CONTENT
});

module.exports = router;
