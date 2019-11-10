/* ------------------------------------------------------------------------
 * audioctrl.js
 *
 * Front-end interface for controlling sfplay~ instances using a 
 * standardized OSC message protocol. 
 *
 * Use with a sub-folder of audio clips, numbered 1, ..., N
 * 
 * -------- Jeff Gregorio, 2019 -------------------------------------------
 *
 * Usage: 
 *	[js audioctrl.js [assetfolder]]
 *
 *
 * Example:
 *  [js assetctrl.js /assets/audio]
 *
 * Responds to OSC messages conforming to:
 * 	/[assetfolder] [clip #] [start/stop] [one-shot/loop]	
 *
 * Examples:
 *
 * Play clip 3 (one shot):
 * 	/assets/audio 3					
 * 	/assets/audio 3 1
 *	/assets/audio 3 1 0
 *	
 * Play clip 3 (loop):
 *	/assets/audio 3 1 1
 *
 * Stop clip 3 (if it's playing):
 * 	/assets/audio 3 0
 * 
 * Stop current clip:
 * 	/assets/audio 0
 *
 * Note: assetfolder may contain subdirectories of assets, in which 
 *  	 case OSC paths should specify subdirectory names, and each 
 * 		 subdirectory is assigned to a specific outlet for controlling
 * 		 its own dedicated [sfplay~] instance.
 */

include("assetctrl");

inlets = 1;
outlets = 0;

// Make a 2-D asset path dictionary keyed by relative directory and cue number
var asset_dir = jsarguments.slice(1);
var file_dict = get_asset_dict(asset_dir);
// post_asset_dict(file_dict);

// Create dictionaries of AssetControllers and outlet numbers keyed by
// relative asset directory
var ac_dict = {};
var outlet_dict = {};
for (key in file_dict) {
	ac_dict[key] = AudioController(			// Callbacks:
						ctlout_gain,		// - Gain
						ctlout_loop,		// - Loop
						ctlout_start,		// - Start
						ctlout_pause,		// - Pause
						ctlout_resume,		// - Resume
						ctlout_stop,		// - Stop
						ctlout_eof);		// - Send formatted EOF
	outlet_dict[key] = outlets;
	setoutletassist(outlet_dict[key], key);		// Display the key over each outlet
	setoutletassist(outlet_dict[key]+1, key + ' gain');
	outlets += 2;
}

// Add an outlet dict entry for end of file messages
setoutletassist(outlets, 'EOF');
outlet_dict['EOF'] = outlets;
outlets++;

// RegExp to test for valid messages and messages directed to a specific asset
// controller
var re_valid = new RegExp('^' + asset_dir);	
var re_global = new RegExp('^' + asset_dir + '$'); 

// Main OSC message handler
function anything() {

	// Handle messages that start with the asset directory
	if (!re_valid.test(messagename))
		return;

	// Ignore OSC if path doesn't match asset directory or subdirectory
	if (!(file_dict.hasOwnProperty(messagename) || re_global.test(messagename)))
		return;
	
	// If the asset controller doesn't handle the message
	if (!(ac_dict.hasOwnProperty(messagename) &&
		  ac_dict[messagename].handle_osc(messagename, arguments))) {

		// Handle globals
		switch (arguments[0]) {
			case 0:
			case 'advance':
				advance();
				break;
			case -1:
			case 'stop':
				stop();
				break;
			case 'pause':
				pause();
				break;
			case 'resume':
				resume();
				break;
			case 'gain':
				if (arguments.length > 1)
					gain(arguments[1]);
			default:
				break;
		}
	}
}

// Initialization:
// ---------------
function loadbang() {
	ctlout_preload(file_dict);
}

function init() {
	ctlout_preload(file_dict);
}

// EOF Handling:
// -------------
// Treat bang as EOF for outlet 0
function bang() {
	ac_dict[Object.keys(ac_dict)[0]].eof_in();
}

// Treat integers as EOF for outlet N-1, and -1 as EOF for all
function msg_int(value) {
	if (value == -1) {
		for (var key in ac_dict)
			ac_dict[key].eof_in();
	}
	else if (value > -1 && value < Object.keys(ac_dict).length) {
		key = Object.keys(ac_dict)[value];
		ac_dict[key].eof_in();
	}
}

// Global commands:
// ----------------
// Handle stop
function stop() {
	for (var key in ac_dict)
		ac_dict[key].stop();
}

// Handle advance (stop and send EOF)
function advance() {
	for (var key in ac_dict)
		ac_dict[key].advance();
}

// Handle pause
function pause() {
	for (var key in ac_dict)
		ctlout_pause(key);
}

// Handle resume
function resume() {
	for (var key in ac_dict)
		ctlout_resume(key);
}

// Handle gain
function gain(value) {
	for (var key in ac_dict)
		ctlout_gain(key, value);
}

// Audio control output handlers:
// ------------------------------
// Set the gain of a player's live.gain~ slider in dB
function ctlout_gain(key, value) {
	outlet(outlet_dict[key]+1, value);
}

// Set loop mode (same message for audio and video players)
function ctlout_loop(key, do_loop) {
	outlet(outlet_dict[key], 'loop', do_loop);
}

// Start clip 
function ctlout_start(key, clipnum) {
	outlet(outlet_dict[key], Number(clipnum) + 1);
}

// Pause clip
function ctlout_pause(key) {
	outlet(outlet_dict[key], 'pause');
}

// Resume clip
function ctlout_resume(key) {
	outlet(outlet_dict[key], 'resume');
}

// Stop clip 
function ctlout_stop(key) {
	outlet(outlet_dict[key], 0);
}

// Sends an OSC message to the state machine, flagging this clip as played
function ctlout_eof(key, clipnum) {
	outlet(outlet_dict['EOF'], key, clipnum, 1);
}

// Preload audio clips in the specified assets path. Each clip is set to its 
// number + 1, since sfplay~ plays whatever file is currently loaded on cue 1
function ctlout_preload(dict) {	
	for (var dname in dict) {
		if (dict.hasOwnProperty(dname)) {
			outlet(outlet_dict[dname], 'clear');
			for (var cue_num in dict[dname]) {
				if (dict[dname].hasOwnProperty(cue_num)) {
					sfplay_cue = Number(cue_num)+1;
					outlet(outlet_dict[dname], 'preload', sfplay_cue, dict[dname][cue_num], 0);
				}
			}
		}
	}
}


