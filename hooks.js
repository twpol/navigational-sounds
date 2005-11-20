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
} else {
	ROOT_KEY_CURRENT_USER = nsIWindowsShellService.HKCU;
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
		//var browser = getBrowser();
		//browser.addProgressListener(handler, nsIWebProgress.NOTIFY_ALL);
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

navsounds.getRegKey =
function (root, path, value) {
	try {
		navsounds.debugLog("getRegKey(" + root + ", " + path + ", " + value);
		
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
		navsounds.log("navsounds.getRegKey: ERROR: " + ex);
	}
	return "";
}

navsounds.getSystemSound =
function (app, name) {
	try {
		navsounds.debugLog("getSystemSound(" + app + ", " + name + ")");
		// Extract correct key to read...
		var loc = "AppEvents\\Schemes\\Apps\\" + app + "\\" + name + "\\.Current";
		var file = navsounds.getRegKey(ROOT_KEY_CURRENT_USER, loc, "");
		if (!file) {
			navsounds.debugLog("navsounds.getSystemSound: ERROR: reading sound event " + app + "\\" + name + " failed. No value was returned.");
			return "";
		}
		navsounds.debugLog("  Value: " + file);
		
		return file;
	} catch(ex) {
		navsounds.log("navsounds.getSystemSound: ERROR: " + ex);
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
			navsounds.debugLog("  UNC or local absolute path");
			fileurl = "file:///" + filepath.replace(/\\/g, "/");
			uri = navsounds.io.newURI(fileurl, "UTF-8", null);
		} else {
			// Relative? Oh boy!
			navsounds.debugLog("  Relative path");
			var redirectedPath = navsounds.getSystemSound(".Default", filepath);
			if (!redirectedPath) {
				var mediaPath = navsounds.getRegKey(nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPath");
				if (!mediaPath) {
					mediaPath = navsounds.getRegKey(nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPathUnexpanded");
				}
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
		navsounds.log("navsounds.playSound: ERROR: " + ex);
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
				navsounds.debugLog("Browser is dead (" + hookedBrowsers[i].browser.lastURI.spec + ").");
				hookedBrowsers[i].dead = true;
				try {
					hookedBrowsers[i].webProgress.removeProgressListener(navsounds.handler);
				} catch(ex) {}
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
			navsounds.debugLog("New browser found (" + browserList[i].currentURI.spec + ").");
			hookedBrowsers.push({ browser: browserList[i], webProgress: browserList[i].webProgress, dead: false });
			browserList[i].webProgress.addProgressListener(navsounds.handler, nsIWebProgress.NOTIFY_ALL);
			changed = true;
		}
		if (changed) {
			navsounds.debugLog("Currently monitoring " + hookedBrowsers.length + " browsers.");
		}
		
	} catch(ex) {
		navsounds.log("navsounds.updateProgressListeners: ERROR: " + ex);
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
}

navsounds.BrowserStatusHandler.prototype.onStatusChange =
navsounds.BrowserStatusHandler.prototype.onLocationChange =
navsounds.BrowserStatusHandler.prototype.onProgressChange =
navsounds.BrowserStatusHandler.prototype.onSecurityChange =
function()
{}


setTimeout(navsounds.init, 0);
