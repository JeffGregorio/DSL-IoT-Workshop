include("statemachine");

inlets = 1;
outlets = 2;

verbose = 7;

var dir_sm = '/sm';
if (jsarguments.length > 1)
	dir_sm = jsarguments[1];

var sm = StateMachine(dir_sm);
var initialized = false;

function init() {
	sm.init();
	initialized = true;
}

function reset() {
	sm.reset();
}

function conditions() {
	sm.post_conditions();
}

function anything() {
	// Make sure the state machine has been initialized
	if (!initialized) {
		error("Ignoring \'" + messagename + "\'. Initialize first\n");
		return;
	}
	// Delegate OSC handling to the state machine
	sm.handle_osc(messagename, arguments);
}

// ======================
// State Update Callbacks
// ======================

function update_idle(key, idx, val, unique) {
	post("*****************\n");
	post("key = " + key + "\n");
	post("idx = " + idx + "\n");
	post("val = " + val + "\n");
	post("unique = " + unique + "\n");	
	post("*****************\n");
}
