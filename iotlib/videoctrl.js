/* ------------------------------------------------------------------------
 * videoctrl.js
 *
 * Front-end interface for controlling jit.qt.movie instances using a 
 * standardized OSC message protocol.
 *
 * Use with a directory of video clips, numbered 1, ..., N. The provided
 * directory may contain sub-directories of video clips.
 * 
 * -------- Jeff Gregorio, 2019 -------------------------------------------
 *
 * Usage: 
 *	[js videoctrl.js /[assetfolder]]
 *
 * Example:
 *	[js videoctrl.js /video]
 *
 * Example messages:
 *
 * Play scene 2 (one shot):
 * 	/video/scenes 2					
 * 	/video/scenes 2 0
 *	
 * Play instruction 3 (loop):
 *	/video/instruction 3 1
 *
 * Advance current clip (stop and send EOF):
 * 	/video 0
 *  /video advance
 *
 * Stop current clip:
 * 	/video -1
 *  /video stop
 * 
 * Pause current clip:
 * 	/video pause
 *
 * Resume current clip:
 * 	/video resume
 */

include("assetctrl");

inlets = 1;
outlets = 2;

// Make a 2-D asset path dictionary keyed by relative directory and cue number
var asset_dir = jsarguments.slice(1);
var file_dict = get_asset_dict(asset_dir);
// post_asset_dict(file_dict);

// Create asset controller instance
ac = VideoController(		// Callbacks:
		ctlout_loop,		// - Loop
		ctlout_start,		// - Start
		ctlout_pause, 		// - Pause
		ctlout_resume, 		// - Resume
		ctlout_stop,		// - Stop
		ctlout_eof);		// - EOF

setoutletassist(0, "to jit.movie instance");
setoutletassist(1, "EOF");

// RegExp to test for valid messages (those starting with a slash, followed
// by the asset directory name) and globals (addressed to every outlet)
var re_valid = new RegExp('^' + asset_dir);	
var re_global = new RegExp('^' + asset_dir + '$'); 

// Main message handler
function anything() {

	// Handle messages that start with the asset directory
	if (!re_valid.test(messagename))
		return;

	// Ignore OSC if path doesn't match asset directory or subdirectory
	if (!(file_dict.hasOwnProperty(messagename) || re_global.test(messagename)))
		return;
	
	// If the asset controller doesn't handle the message
	if (!ac.handle_osc(messagename, arguments)) { 

		switch (arguments[0]) {
			case 'advance':
				advance();
				break;
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
					ctlout_gain(arguments[1]);
			default:
				break;
		}
	}
}

// EOF Handling:
// -------------
function bang() {
	ac.eof_in();
}

// Global commands:
// ----------------
// Handle stop 
function stop() {
	ac.stop();
}

// Handle advance (stop and send EOF)
function advance() {
	ac.advance();
}

// Handle pause
function pause() {
	ctlout_pause();
}

// Handle resume
function resume() {
	ctlout_resume();
}

// Video control output handlers:
// ------------------------------
function ctlout_gain(value) {
	outlet(0, 'vol', Math.pow(10, value/20));
}

// Set loop mode 
function ctlout_loop(do_loop) {
	outlet(0, 'loop', do_loop);
}

// Start clip
function ctlout_start(key, clipnum) {
	outlet(0, 'read', file_dict[key][clipnum]);
}

// Pause clip
function ctlout_pause() {
	outlet(0, 'stop');
}

// Resume clip
function ctlout_resume() {
	outlet(0, 'start');
}

// Stop clip
function ctlout_stop() {
	outlet(0, 'dispose');
}

// Sends an OSC message to the state machine, flagging this clip as played
function ctlout_eof(key, clipnum) {
	outlet(1, key, clipnum, 1);
}

