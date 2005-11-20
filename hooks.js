// Navigational Sounds extension
//
// Copyright 2005, James Ross, silver@warwickcompsoc.co.uk
//

const nsIWebProgress = Components.interfaces.nsIWebProgress;
const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
const nsIWindowsRegKey = Components.interfaces.nsIWindowsRegKey;
const nsIEnvironment = Components.interfaces.nsIEnvironment;
const nsISound = Components.interfaces.nsISound;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIConsoleService = Components.interfaces.nsIConsoleService;
const nsILocalFile = Components.interfaces.nsILocalFile;
const nsISupports = Components.interfaces.nsISupports;
const nsISupportsWeakReference = Components.interfaces.nsISupportsWeakReference;
const nsIWindowsShellService = Components.interfaces.nsIWindowsShellService;
if (nsIWindowsRegKey) {
	var ROOT_KEY_CURRENT_USER = nsIWindowsRegKey.ROOT_KEY_CURRENT_USER;
	var ROOT_KEY_LOCAL_MACHINE = nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE;
} else {
	ROOT_KEY_CURRENT_USER = nsIWindowsShellService.HKCU;
	ROOT_KEY_LOCAL_MACHINE = nsIWindowsShellService.HKLM;
}


var navsounds = new Object();
navsounds.debug = false;

navsounds.init =
function () {
	try {
		navsounds.con = Components.classes["@mozilla.org/consoleservice;1"].getService(nsIConsoleService);
		navsounds.debugLog("Loading...");
		navsounds.env = Components.classes["@mozilla.org/process/environment;1"].getService(nsIEnvironment);
		navsounds.io = Components.classes["@mozilla.org/network/io-service;1"].getService(nsIIOService);
		navsounds.sound = Components.classes["@mozilla.org/sound;1"].getService(nsISound);
		navsounds.shell = Components.classes["@mozilla.org/browser/shell-service;1"].getService(nsIWindowsShellService);
		
		navsounds.handler = new navsounds.BrowserStatusHandler();
		navsounds.hookedBrowsers = new Array();
		navsounds.updateProgressListeners();
		navsounds.debugLog("Done.");
	} catch(ex) {
		if (("fileName" in ex) || ("filename" in ex)) {
			alert("An error occured initialising Navigational Sounds.\n\n" +
					"Name: " + ex.name + "\n" +
					"Messages: " + ex.message + "\n" +
					"Filename: " + ("fileName" in ex ? ex.fileName : ex.filename) + "\n" +
					"Line: " + ex.lineNumber);
		} else {
			alert("An error occured initialising Navigational Sounds.\n\n" + ex);
		}
		if (navsounds.con) {
			navsounds.log("navsounds.init: ERROR: " + ex);
		}
	}
}

navsounds.debugLog =
function (message) {
	if (navsounds.debug && navsounds.con) {
		navsounds.con.logStringMessage(message);
	}
}

navsounds.log =
function (message) {
	if (navsounds.con) {
		navsounds.con.logStringMessage(message);
	}
}

navsounds.reportError =
function (source, ex) {
	if ((typeof ex == "object") && ex && (("fileName" in ex) || ("filename" in ex))) {
		navsounds.log(source + ": ERROR: " +
				"name: " + ex.name + ", " +
				"messages: " + ex.message + ", " +
				"filename: " + ("fileName" in ex ? ex.fileName : ex.filename) + ", " +
				"line: " + ex.lineNumber);
	} else {
		navsounds.log(source + ": ERROR: " + ex);
	}
}

navsounds.getRegKey =
function (root, path, value, ignoreError) {
	try {
		navsounds.debugLog("getRegKey(" + root + ", " + path + ", " + value + ")");
		
		var type = -1;
		var data = "";
		if ("@mozilla.org/windows-registry-key;1" in Components.classes) {
			// Create a key object to do the work.
			var key = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(nsIWindowsRegKey);
			
			// Open for reading only, and get the value before closing it.
			key.open(root, path, nsIWindowsRegKey.ACCESS_READ);
			if (key.hasValue(value)) {
				type = key.getValueType(value);
				data = key.readStringValue(value);
			}
			key.close();
		} else {
			// Try old Firefox 1.0 method.
			data = navsounds.shell.getRegistryEntry(root, path, value);
			type = (/%/.test(data) ? 2 : 1);
		}
		
		if (type == 2) {
			// REG_EXPAND_SZ
			var ary;
			while ((ary = data.match(/(.*)%(.*?)%(.*)/))) {
				data = ary[1] + navsounds.env.get(ary[2]) + ary[3];
			}
			
		}
		navsounds.debugLog("  Data: " + data);
		
		return data;
	} catch(ex) {
		if (!ignoreError || navsounds.debug) {
			navsounds.reportError("navsounds.getRegKey", ex);
		}
	}
	return "";
}

navsounds.getSystemSound =
function (app, name, ignoreError) {
	try {
		navsounds.debugLog("getSystemSound(" + app + ", " + name + ")");
		// Extract correct key to read...
		var loc = "AppEvents\\Schemes\\Apps\\" + app + "\\" + name + "\\.Current";
		var file = navsounds.getRegKey(ROOT_KEY_CURRENT_USER, loc, "", ignoreError);
		if (!file) {
			if (navsounds.debug) {
				navsounds.reportError("navsounds.getSystemSound", "reading sound event " + app + "\\" + name + " failed. No value was returned.");
			}
			return "";
		}
		navsounds.debugLog("  Value: " + file);
		
		return file;
	} catch(ex) {
		navsounds.reportError("navsounds.getSystemSound", ex);
	}
	return "";
}

navsounds.playSound =
function (filepath) {
	if (!filepath) {
		return;
	}
	try {
		navsounds.debugLog("playSound(" + filepath + ")");
		var uri, fileurl;
		if ((filepath.substr(0, 2) == "\\\\") || (filepath.substr(1, 1) == ":")) {
			// UNC or local path, it seems - just turn into a URL.
			navsounds.debugLog("  UNC or local absolute path");
			fileurl = "file:///" + filepath.replace(/\\/g, "/");
			uri = navsounds.io.newURI(fileurl, "UTF-8", null);
		} else {
			// Relative? Oh boy!
			navsounds.debugLog("  Relative path");
			// Try looking for it as a .Default scheme entry.
			var redirectedPath = navsounds.getSystemSound(".Default", filepath, true);
			if (!redirectedPath) {
				// Get the media folder (for our search path).
				var mediaPath = navsounds.getRegKey(ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPath");
				if (!mediaPath) {
					mediaPath = navsounds.getRegKey(ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPathUnexpanded");
				}
				// Construct a list of paths to search.
				var paths = new Array();
				paths.push(navsounds.env.get("SYSTEMROOT") + "\\");
				paths.push(navsounds.env.get("SYSTEMROOT") + "\\system32\\");
				if (mediaPath) {
					paths.push(mediaPath + "\\");
				}
				
				function tryFolder(path) {
					navsounds.debugLog("  tryFolder(" + path + ")");
					var tryFile = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
					tryFile.initWithPath(path + filepath);
					if (tryFile.exists()) {
						fileurl = "file:///" + path.replace(/\\/g, "/") + filepath.replace(/\\/g, "/");
						uri = navsounds.io.newURI(fileurl, "UTF-8", null);;
					}
				}
				
				while (!uri && (paths.length > 0)) {
					tryFolder(paths.shift());
				}
			}
		}
		if (uri) {
			navsounds.debugLog("  Final URI: " + uri.spec);
			navsounds.sound.play(uri);
		} else {
			navsounds.log("navsounds.playSound: couldn't find sound file specified: '" + filepath + "'.");
		}
	} catch(ex) {
		navsounds.reportError("navsounds.playSound", ex);
	}
}

navsounds.updateProgressListeners =
function () {
	try {
		var hookedBrowsers = navsounds.hookedBrowsers;
		
		// First, fetch list of browsers.
		var liveBrowserList = getBrowser().browsers;
		// Clone so we don't baf the tabbrowser.
		var browserList = new Array();
		for (var i = 0; i < liveBrowserList.length; i++) {
			browserList.push(liveBrowserList[i]);
		}
		
		var changed = false;
		// check all of our hooked browsers still exist!
		for (var i = 0; i < hookedBrowsers.length; i++) {
			var found = false;
			for (var j = 0; j < browserList.length; j++) {
				if (hookedBrowsers[i].browser == browserList[j]) {
					browserList.splice(j, 1);
					found = true;
					break;
				}
			}
			if (!found) {
				try {
					navsounds.debugLog("Browser is dead (" + hookedBrowsers[i].browser.lastURI.spec + ").");
				} catch(ex) {
					navsounds.debugLog("Browser is dead.");
				}
				hookedBrowsers[i].dead = true;
				try {
					hookedBrowsers[i].webProgress.removeProgressListener(navsounds.handler);
				} catch(ex) {
					// An error (NS_ERROR_FAILURE) always seems to occur. We do this
					// for completeness.
					//navsounds.reportError("navsounds.updateProgressListeners", ex);
				}
				hookedBrowsers[i].webProgress = null;
				changed = true;
			}
		}
		for (var i = hookedBrowsers.length - 1; i >= 0; i--) {
			if (hookedBrowsers[i].dead) {
				hookedBrowsers.splice(i, 1);
			}
		}
		
		for (var i = 0; i < browserList.length; i++) {
			try {
				navsounds.debugLog("New browser found (" + browserList[i].currentURI.spec + ").");
			} catch(ex) {
				navsounds.debugLog("New browser found.");
				navsounds.reportError("navsounds.updateProgressListeners", ex);
			}
			var item = { browser: browserList[i],
			             webProgress: browserList[i].webProgress,
			             dead: false };
			hookedBrowsers.push(item);
			browserList[i].webProgress.addProgressListener(navsounds.handler, nsIWebProgress.NOTIFY_ALL);
			changed = true;
		}
		if (changed) {
			navsounds.debugLog("Currently monitoring " + hookedBrowsers.length + " browsers.");
		}
		
	} catch(ex) {
		navsounds.reportError("navsounds.updateProgressListeners", ex);
	}
	setTimeout(navsounds.updateProgressListeners, 1000);
}


navsounds.BrowserStatusHandler =
function () {
}

navsounds.BrowserStatusHandler.prototype.QueryInterface =
function (iid) {
	if (iid.equals(nsIWebProgressListener) ||
			iid.equals(nsISupportsWeakReference) ||
			iid.equals(nsISupports)) {
		return this;
	}
	throw Components.results.NS_NOINTERFACE;
}

navsounds.BrowserStatusHandler.prototype.onStateChange =
function (webProgress, request, stateFlags, status) {
	try {
		if (!(stateFlags & nsIWebProgressListener.STATE_IS_NETWORK)) {
			return;
		}
		if (stateFlags & nsIWebProgressListener.STATE_START) {
			// Request started.
			navsounds.playSound(navsounds.getSystemSound("Explorer", "Navigating"));
		} else if (stateFlags & nsIWebProgressListener.STATE_STOP) {
			if (request) {
				// Request ended.
				navsounds.playSound(navsounds.getSystemSound("Explorer", "ActivatingDocument"));
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.BrowserStatusHandler.onStateChange", ex);
	}
}

navsounds.BrowserStatusHandler.prototype.onStatusChange =
navsounds.BrowserStatusHandler.prototype.onLocationChange =
navsounds.BrowserStatusHandler.prototype.onProgressChange =
navsounds.BrowserStatusHandler.prototype.onSecurityChange =
function()
{}


setTimeout(navsounds.init, 0);
