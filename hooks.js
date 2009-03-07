// Navigational Sounds extension
//
// Copyright 2005, 2006, 2009, James Ross, silver@warwickcompsoc.co.uk
//

var navsounds = new Object();
navsounds.debug = false;
navsounds.debugDepth = "";
navsounds.debugLastFn = "";

if (typeof Components.interfaces.nsIWindowsRegKey != "undefined") {
	navsounds.ROOT_KEY_CURRENT_USER = Components.interfaces.nsIWindowsRegKey.ROOT_KEY_CURRENT_USER;
	navsounds.ROOT_KEY_LOCAL_MACHINE = Components.interfaces.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE;
} else {
	navsounds.ROOT_KEY_CURRENT_USER = Components.interfaces.nsIWindowsShellService.HKCU;
	navsounds.ROOT_KEY_LOCAL_MACHINE = Components.interfaces.nsIWindowsShellService.HKLM;
}

navsounds.newObject =
function _navsounds_newObject(contractID, iface) {
	navsounds.debugLogEnter("newObject(" + contractID + ", " + iface + ")");
	try {
		var rv;
		var cls = Components.classes[contractID];
		if (cls) {
			switch (typeof iface) {
				case "undefined":
					rv = cls.createInstance();
					break;
				case "string":
					rv = cls.createInstance(Components.interfaces[iface]);
					break;
				case "object":
					rv = cls.createInstance(iface);
					break;
				default:
					rv = null;
					break;
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.newObject", ex);
	}
	navsounds.debugLogLeave(rv);
	return rv;
}

navsounds.getService =
function _navsounds_getService(contractID, iface) {
	navsounds.debugLogEnter("getService(" + contractID + ", " + iface + ")");
	try {
		var rv;
		var cls = Components.classes[contractID];
		if (cls) {
			switch (typeof iface) {
				case "undefined":
					rv = cls.getService();
					break;
				case "string":
					rv = cls.getService(Components.interfaces[iface]);
					break;
				case "object":
					rv = cls.getService(iface);
					break;
				default:
					rv = null;
					break;
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.getService", ex);
	}
	navsounds.debugLogLeave(rv);
	return rv;
}

navsounds.init =
function _navsounds_init() {
	try {
		window.removeEventListener("load", navsounds.init, false);
		navsounds.con   = navsounds.getService("@mozilla.org/consoleservice;1", "nsIConsoleService");
		navsounds.debugLogEnter("navsounds.init");
		navsounds.env   = navsounds.getService("@mozilla.org/process/environment;1", "nsIEnvironment");
		navsounds.io    = navsounds.getService("@mozilla.org/network/io-service;1", "nsIIOService");
		navsounds.sound = navsounds.getService("@mozilla.org/sound;1", "nsISound");
		navsounds.shell = navsounds.getService("@mozilla.org/browser/shell-service;1", "nsIWindowsShellService");
		navsounds.initEvents();
	} catch(ex) {
		if (navsounds.con) {
			navsounds.reportError("navsounds.initEvents", ex);
		} else {
			alert("Navigational Sounds failed to initialise the console service: " + ex);
		}
	}
	navsounds.debugLogLeave("");
}

navsounds.initEvents =
function _navsounds_initEvents() {
	navsounds.debugLogEnter("initEvents()");
	try {
		navsounds.handler = new navsounds.BrowserStatusHandler();
		navsounds.blockedPopup = false;
		getBrowser().addProgressListener(navsounds.handler, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		getBrowser().addEventListener("DOMContentLoaded", navsounds.browserDOMContentLoaded, true);
		getBrowser().addEventListener("DOMPopupBlocked", navsounds.browserDOMPopupBlocked, true);
		getBrowser().addEventListener("AlertActive", navsounds.browserAlertEvent, true);
	} catch(ex) {
		navsounds.reportError("navsounds.initEvents", ex);
	}
	navsounds.debugLogLeave("");
}

navsounds.log =
function _navsounds_log(message) {
	if (navsounds.con) {
		if (navsounds.debugLastFn) {
			navsounds.con.logStringMessage(navsounds.debugLastFn);
			navsounds.debugLastFn = "";
		}
		navsounds.con.logStringMessage(navsounds.debugDepth + message);
	}
}

navsounds.debugLog =
function _navsounds_debugLog(message) {
	if (navsounds.debug && navsounds.con) {
		navsounds.log(message);
	}
}

navsounds.debugLogEnter =
function _navsounds_debugLogEnter(message) {
	if (navsounds.debug && navsounds.con) {
		if (navsounds.debugLastFn) {
			navsounds.con.logStringMessage(navsounds.debugLastFn);
		}
		navsounds.debugLastFn = navsounds.debugDepth + message + " {";
		navsounds.debugDepth += "  ";
	}
}

navsounds.debugLogLeave =
function _navsounds_debugLogLeave(message) {
	if (navsounds.debug && navsounds.con) {
		if (navsounds.debugDepth.length >= 2) {
			navsounds.debugDepth = navsounds.debugDepth.substr(2);
		}
		if (navsounds.debugLastFn) {
			navsounds.con.logStringMessage(navsounds.debugLastFn + "} " + message);
			navsounds.debugLastFn = "";
		} else {
			navsounds.log("} " + message);
		}
	}
}

navsounds.reportError =
function _navsounds_reportError(source, ex) {
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
function _navsounds_getRegKey(root, path, value, ignoreError) {
	var data = "";
	navsounds.debugLogEnter("getRegKey(0x" + Number(root).toString(16) + ", " + path + ", " + value + ")");
	try {
		
		var type = -1;
		if ("@mozilla.org/windows-registry-key;1" in Components.classes) {
			// Create a key object to do the work.
			var key = navsounds.newObject("@mozilla.org/windows-registry-key;1", "nsIWindowsRegKey");
			
			// Open for reading only, and get the value before closing it.
			key.open(root, path, Components.interfaces.nsIWindowsRegKey.ACCESS_READ);
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
			//navsounds.debugLog("Raw value = " + data);
			// REG_EXPAND_SZ
			var ary;
			while ((ary = data.match(/(.*)%(.*?)%(.*)/))) {
				data = ary[1] + navsounds.env.get(ary[2]) + ary[3];
			}
			
		}
	} catch(ex) {
		data = "";
		if (!ignoreError || navsounds.debug) {
			navsounds.reportError("navsounds.getRegKey", ex);
		}
	}
	navsounds.debugLogLeave((data ? "= " + data : ""));
	return data;
}

navsounds.getSystemSound =
function _navsounds_getSystemSound(app, name, ignoreError) {
	var file = "";
	navsounds.debugLogEnter("getSystemSound(" + app + ", " + name + ")");
	try {
		// Extract correct key to read...
		var loc = "AppEvents\\Schemes\\Apps\\" + app + "\\" + name + "\\.Current";
		file = navsounds.getRegKey(navsounds.ROOT_KEY_CURRENT_USER, loc, "", ignoreError);
	} catch(ex) {
		file = "";
		navsounds.reportError("navsounds.getSystemSound", ex);
	}
	navsounds.debugLogLeave((file ? "= " + file : ""));
	return file;
}

navsounds.playSound =
function _navsounds_playSound(filepath) {
	if (!filepath) {
		return;
	}
	navsounds.debugLogEnter("playSound(" + filepath + ")");
	try {
		var uri, fileurl;
		if ((filepath.substr(0, 2) == "\\\\") || (filepath.substr(1, 1) == ":")) {
			// UNC or local path, it seems - just turn into a URL.
			navsounds.debugLog("Path type = UNC or local absolute");
			fileurl = "file:///" + filepath.replace(/\\/g, "/");
			uri = navsounds.io.newURI(fileurl, "UTF-8", null);
		} else {
			// Relative? Oh boy!
			navsounds.debugLog("Path type = Relative");
			// Try looking for it as a .Default scheme entry.
			var redirectedPath = navsounds.getSystemSound(".Default", filepath, true);
			if (!redirectedPath) {
				// Get the media folder (for our search path).
				var mediaPath = navsounds.getRegKey(navsounds.ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPath");
				if (!mediaPath) {
					mediaPath = navsounds.getRegKey(navsounds.ROOT_KEY_LOCAL_MACHINE, "Software\\Microsoft\\Windows\\CurrentVersion", "MediaPathUnexpanded");
				}
				// Construct a list of paths to search.
				var paths = new Array();
				paths.push(navsounds.env.get("SYSTEMROOT") + "\\");
				paths.push(navsounds.env.get("SYSTEMROOT") + "\\system32\\");
				if (mediaPath) {
					paths.push(mediaPath + "\\");
				}
				
				function tryFolder(path) {
					navsounds.debugLogEnter("tryFolder(" + path + ")");
					var tryFile = navsounds.newObject("@mozilla.org/file/local;1", "nsILocalFile");
					tryFile.initWithPath(path + filepath);
					if (tryFile.exists()) {
						fileurl = "file:///" + path.replace(/\\/g, "/") + filepath.replace(/\\/g, "/");
						uri = navsounds.io.newURI(fileurl, "UTF-8", null);;
					}
					navsounds.debugLogLeave((tryFile.exists() ? "true":"false"));
				}
				
				while (!uri && (paths.length > 0)) {
					tryFolder(paths.shift());
				}
			}
		}
		if (uri) {
			navsounds.debugLog("URI = " + uri.spec);
			navsounds.sound.play(uri);
		} else {
			navsounds.log("navsounds.playSound: couldn't find sound file specified: '" + filepath + "'.");
		}
	} catch(ex) {
		navsounds.reportError("navsounds.playSound", ex);
	}
	navsounds.debugLogLeave("");
}

navsounds.getBrowserTab =
function _navsounds_getBrowserTab(document) {
	navsounds.debugLogEnter("getBrowserTab(" + document + ")");
	try {
		var rv = null;
		var tabBrowser = getBrowser();
		for (var i = 0; i < tabBrowser.browsers.length; i++) {
			if (tabBrowser.browsers[i].contentDocument == document) {
				rv = tabBrowser.browsers[i];
				break;
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.getBrowserTab", ex);
	}
	navsounds.debugLogLeave(rv);
	return rv;
}


navsounds.BrowserStatusHandler =
function () {
}

navsounds.BrowserStatusHandler.prototype.QueryInterface =
function (iid) {
	if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
			iid.equals(Components.interfaces.nsISupportsWeakReference) ||
			iid.equals(Components.interfaces.nsISupports)) {
		return this;
	}
	throw Components.results.NS_NOINTERFACE;
}

navsounds.BrowserStatusHandler.prototype.onStateChange =
function (webProgress, request, stateFlags, status) {
	navsounds.debugLogEnter("onStateChange(" + webProgress + ", " + request + ", 0x" + Number(stateFlags).toString(16) + ", 0x" + Number(status).toString(16) + ")");
	try {
		if (navsounds.debug) {
			var flags = new Array();
			var flagNames = [
					"STATE_START", "STATE_STOP",
					"STATE_REDIRECTING", "STATE_TRANSFERING", "STATE_NEGOTIATING",
					"STATE_IS_REQUEST", "STATE_IS_DOCUMENT", "STATE_IS_NETWORK", "STATE_IS_WINDOW"
				];
			for (var i = 0; i < flagNames.length; i++) {
				if ((stateFlags & Components.interfaces.nsIWebProgressListener[flagNames[i]]) != 0) {
					flags.push(flagNames[i].substr(6));
				}
			}
			navsounds.debugLog("stateFlags = " + flags.join(", "));
		}
		
		if (!(stateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK)) {
			navsounds.debugLogLeave("");
			return;
		}
		if (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_START) {
			var tab = navsounds.getBrowserTab(webProgress.document);
			if (tab && !tab.loading) {
				tab.loading = true;
				navsounds.playSound(navsounds.getSystemSound("Explorer", "Navigating"));
			}
		} else if (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
			var tab = navsounds.getBrowserTab(webProgress.document);
			if (tab && tab.loading) {
				tab.loading = false;
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.BrowserStatusHandler.onStateChange", ex);
	}
	navsounds.debugLogLeave("");
}

navsounds.BrowserStatusHandler.prototype.onStatusChange =
navsounds.BrowserStatusHandler.prototype.onLocationChange =
navsounds.BrowserStatusHandler.prototype.onProgressChange =
navsounds.BrowserStatusHandler.prototype.onSecurityChange =
function()
{}

navsounds.browserDOMContentLoaded =
function (e) {
	try {
		var tab = navsounds.getBrowserTab(e.target);
		if (tab && tab.loading) {
			tab.loading = false;
			navsounds.playSound(navsounds.getSystemSound("Explorer", "ActivatingDocument"));
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserDOMContentLoaded", ex);
	}
}

navsounds.browserDOMPopupBlocked =
function (e) {
	try {
		// This prevents the information bar sound being played at the same time
		// as the popup blocked sound.
		navsounds.blockedPopup = true;
		setTimeout(function() { navsounds.blockedPopup = false }, 0);
		// Popup was blocked.
		navsounds.playSound(navsounds.getSystemSound("Explorer", "BlockedPopup"));
	} catch(ex) {
		navsounds.reportError("navsounds.browserDOMPopupBlocked", ex);
	}
}

navsounds.browserAlertEvent =
function (e) {
	try {
		// Information Bar appeared.
		if (!navsounds.blockedPopup) {
			navsounds.playSound(navsounds.getSystemSound("Explorer", "SecurityBand"));
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserAlertEvent", ex);
	}
}


window.addEventListener("load", navsounds.init, false);
