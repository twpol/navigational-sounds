//------------------------------------------------------------------------------
// Navigational Sounds extension (http://twpol.dyndns.org/projects/navsounds/).
// License: New BSD License (BSD).
//------------------------------------------------------------------------------
//
// Sound events:                Registry keys:
//   Start Navigation:            Explorer\Navigating
//   Complete Navigation:         Explorer\ActivatingDocument
//   Blocked Pop-up Window:       Explorer\BlockedPopup
//   Information Bar:             Explorer\SecurityBand
//   Feed Discovered:             Explorer\FeedDiscovered
//   Search Provider Discovered:  Explorer\SearchProviderDiscovered
//   Complete Download:           .Default\SystemAsterisk


var navsounds = new Object();
navsounds.debug = true;
navsounds.debugDepth = "";
navsounds.debugLastFn = "";
navsounds.id = "{d84a846d-f7cb-4187-a408-b171020e8940}";

navsounds.ROOT_KEY_CURRENT_USER = Components.interfaces.nsIWindowsRegKey.ROOT_KEY_CURRENT_USER;
navsounds.ROOT_KEY_LOCAL_MACHINE = Components.interfaces.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE;
// nsIDownloadManager [Firefox 3-25]
navsounds.DOWNLOAD_FINISHED = Components.interfaces.nsIDownloadManager.DOWNLOAD_FINISHED;

try {
	// Components.utils.import [Firefox 3+]
	// resource://gre/modules/Downloads.jsm [Firefox 26+]
	Components.utils.import("resource://gre/modules/Downloads.jsm");
} catch(ex) {
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
	navsounds.debugLogEnter("init()");
	try {
		window.removeEventListener("load", navsounds.init, false);
		// Firefox 4.0 made this data async.
		if (typeof Application.getExtensions == "function") {
			Application.getExtensions(function(extensions){
				navsounds.initComplete(extensions);
			});
		} else {
			navsounds.initComplete(Application.extensions);
		}
	} catch(ex) {
		navsounds.reportError("navsounds.init", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.initComplete =
function _navsounds_initComplete(extensions) {
	navsounds.debugLogEnter("initComplete(" + extensions + ")");
	try {
		navsounds.prefs = extensions.get(navsounds.id).prefs;
		navsounds.env   = navsounds.getService("@mozilla.org/process/environment;1", "nsIEnvironment");
		navsounds.io    = navsounds.getService("@mozilla.org/network/io-service;1", "nsIIOService");
		// Downloads [Firefox 26+]
		// @mozilla.org/download-manager;1 [Firefox 3-25]
		navsounds.dlm   = typeof Downloads != 'undefined' ? Downloads : navsounds.getService("@mozilla.org/download-manager;1", "nsIDownloadManager");
		navsounds.sound = navsounds.getService("@mozilla.org/sound;1", "nsISound");
		if (typeof getBrowser == "function") {
			navsounds.bsHandler = new navsounds.BrowserStatusHandler();
			navsounds.dlmHandler = new navsounds.DownloadManagerListener();
			navsounds.blockedPopup = false;
			var tabBrowser = getBrowser();
			tabBrowser.addProgressListener(navsounds.bsHandler);
			tabBrowser.addEventListener("DOMContentLoaded", navsounds.browserDOMContentLoaded, true);
			tabBrowser.addEventListener("DOMPopupBlocked", navsounds.browserDOMPopupBlocked, true);
			tabBrowser.addEventListener("AlertActive", navsounds.browserAlertActive, true);
			tabBrowser.addEventListener("TabSelect", navsounds.browserTabSelect, true);
			tabBrowser.addEventListener("pageshow", navsounds.browserPageShow, true);
			if (navsounds.dlm.getList) {
				navsounds.dlm.getList(navsounds.dlm.ALL).then(function _navsounds_initComplete_getList(list) {
					list.addView(navsounds.dlmHandler);
				}).then(null, Components.utils.reportError);
			} else {
				navsounds.dlm.addListener(navsounds.dlmHandler);
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.initComplete", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.log =
function _navsounds_log(message) {
	if (navsounds.debugLastFn) {
		Application.console.log(navsounds.debugLastFn);
		navsounds.debugLastFn = "";
	}
	Application.console.log(navsounds.debugDepth + message);
}

navsounds.debugLog =
function _navsounds_debugLog(message) {
	if (navsounds.debug) {
		navsounds.log(message);
	}
}

navsounds.debugLogEnter =
function _navsounds_debugLogEnter(name) {
	if (navsounds.debug) {
		if (navsounds.debugLastFn) {
			Application.console.log(navsounds.debugLastFn);
		}
		navsounds.debugLastFn = navsounds.debugDepth + name + " {";
		navsounds.debugDepth += "  ";
	}
}

navsounds.debugLogLeave =
function _navsounds_debugLogLeave(value) {
	if (navsounds.debug) {
		if (navsounds.debugDepth.length >= 2) {
			navsounds.debugDepth = navsounds.debugDepth.substr(2);
		}
		if (navsounds.debugLastFn) {
			Application.console.log(navsounds.debugLastFn + "}" + (typeof value == "undefined" ? "" : " = " + value));
			navsounds.debugLastFn = "";
		} else {
			navsounds.log("}" + (typeof value == "undefined" ? "" : " = " + value));
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
		// Create a key object to do the work.
		var key = navsounds.newObject("@mozilla.org/windows-registry-key;1", "nsIWindowsRegKey");
		var type = -1;
		
		// Open for reading only, and get the value before closing it.
		key.open(root, path, Components.interfaces.nsIWindowsRegKey.ACCESS_READ);
		if (key.hasValue(value)) {
			type = key.getValueType(value);
			data = key.readStringValue(value);
		}
		key.close();
		
		if (type == 2) {
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
	navsounds.debugLogLeave(data);
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
	navsounds.debugLogLeave(file);
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
			fileurl = "file:///" + filepath.replace(/\\/g, "/");
			uri = navsounds.io.newURI(fileurl, "UTF-8", null);
			navsounds.debugLog("Absolute path -> " + uri.spec);
		} else {
			// Relative? Oh boy!
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
					navsounds.debugLogLeave((tryFile.exists() ? "true" : "false"));
				}
				
				while (!uri && (paths.length > 0)) {
					tryFolder(paths.shift());
				}
			}
			if (uri) {
				navsounds.debugLog("Relative path -> " + uri.spec);
			}
		}
		if (uri) {
			navsounds.sound.play(uri);
		} else {
			navsounds.log("navsounds.playSound: couldn't find sound file specified: '" + filepath + "'.");
		}
	} catch(ex) {
		navsounds.reportError("navsounds.playSound", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.getBrowserTab =
function _navsounds_getBrowserTab(document) {
	navsounds.debugLogEnter("getBrowserTab(" + document + ")");
	try {
		var rv = null;
		if (document.defaultView.top != document.defaultView) {
			document = document.defaultView.top.document;
		}
		var url = document.location.href;
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
	navsounds.debugLogLeave(rv + " <" + url + ">");
	return rv;
}


navsounds.BrowserStatusHandler =
function _navsounds_bsh() {
}

navsounds.BrowserStatusHandler.prototype.QueryInterface =
function _navsounds_bsh_QueryInterface(iid) {
	if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
			iid.equals(Components.interfaces.nsISupportsWeakReference) ||
			iid.equals(Components.interfaces.nsISupports)) {
		return this;
	}
	throw Components.results.NS_NOINTERFACE;
}

navsounds.BrowserStatusHandler.prototype.onStateChange =
function _navsounds_bsh_onStateChange(webProgress, request, stateFlags, status) {
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
			navsounds.debugLog("request.name = " + request.name);
		}
		// We're not interested unless it is network (start/end of window's activity)
		// and we're especially not interested in about:blank and wyciwyg: URIs.
		if (!(stateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK) ||
				/^about:blank$|^wyciwyg:/.test(request.name)) {
			navsounds.debugLogLeave();
			return;
		}
		if (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_START) {
			var tab = navsounds.getBrowserTab(webProgress.DOMWindow.document);
			if (tab && !tab._navsounds_loading) {
				tab._navsounds_loading = true;
				if (navsounds.prefs.getValue("event.navigation-start", null)) {
					navsounds.playSound(navsounds.getSystemSound("Explorer", "Navigating"));
				}
			}
		} else if (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
			var tab = navsounds.getBrowserTab(webProgress.DOMWindow.document);
			if (tab && tab._navsounds_loading) {
				tab._navsounds_loading = false;
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.BrowserStatusHandler.onStateChange", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.BrowserStatusHandler.prototype.onStatusChange =
navsounds.BrowserStatusHandler.prototype.onLocationChange =
navsounds.BrowserStatusHandler.prototype.onProgressChange =
navsounds.BrowserStatusHandler.prototype.onSecurityChange =
function _navsounds_bsh_noop() {
}

navsounds.DownloadManagerListener =
function _navsounds_dlm() {
}

// onDownloadChanged [Downloads]
navsounds.DownloadManagerListener.prototype.onDownloadChanged =
function _navsounds_dlm_onDownloadChanged(download) {
	navsounds.debugLogEnter("onDownloadChanged(" + download.succeeded + ")");
	try {
		if (download.succeeded) {
			if (navsounds.prefs.getValue("event.download-complete", null)) {
				navsounds.dlm.getList(navsounds.dlm.ALL).then(function _navsounds_dlm_onDownloadChanged_getList(list) {
					return list.getAll();
				}).then(function _navsounds_dlm_onDownloadChanged_getAll(list) {
					var running = 0;
					for (var i = 0; i < list.length; i++) {
						if (!list[i].stopped) {
							running++;
						}
					}
					if (!navsounds.prefs.getValue("event.download-complete.only-last", null) || running == 0) {
						navsounds.playSound(navsounds.getSystemSound(".Default", "SystemAsterisk"));
					}
				}).then(null, Components.utils.reportError);
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.DownloadManagerListener.onDownloadChanged", ex);
	}
	navsounds.debugLogLeave();
}

// onDownloadStateChange [nsIDownloadManager]
navsounds.DownloadManagerListener.prototype.onDownloadStateChange =
function _navsounds_dlm_onDownloadStateChange(oldState, download) {
	navsounds.debugLogEnter("onDownloadStateChange(" + oldState + " => " + download.state + ")");
	try {
		if (download.state == navsounds.DOWNLOAD_FINISHED) {
			if (navsounds.prefs.getValue("event.download-complete", null)) {
				if (navsounds.prefs.getValue("event.download-complete.only-last", null)) {
					if (navsounds.dlm.activeDownloadCount > 0) {
						navsounds.debugLogLeave();
						return;
					}
				}
				navsounds.playSound(navsounds.getSystemSound(".Default", "SystemAsterisk"));
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.DownloadManagerListener.onDownloadStateChange", ex);
	}
	navsounds.debugLogLeave();
}

// onStateChange [nsIDownloadManager]
navsounds.DownloadManagerListener.prototype.onStateChange =
// onProgressChange [nsIDownloadManager]
navsounds.DownloadManagerListener.prototype.onProgressChange =
// onSecurityChange [nsIDownloadManager]
navsounds.DownloadManagerListener.prototype.onSecurityChange =
function _navsounds_dlm_noop() {
}

navsounds.browserDOMContentLoaded =
function _navsounds_browserDOMContentLoaded(e) {
	navsounds.debugLogEnter("browserDOMContentLoaded()");
	try {
		// DOM content loaded: activating document.
		var tab = navsounds.getBrowserTab(e.target);
		if (tab && tab._navsounds_loading) {
			tab._navsounds_loading = false;
			if (navsounds.prefs.getValue("event.navigation-complete", null)) {
				navsounds.playSound(navsounds.getSystemSound("Explorer", "ActivatingDocument"));
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserDOMContentLoaded", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.browserDOMPopupBlocked =
function _navsounds_browserDOMPopupBlocked(e) {
	navsounds.debugLogEnter("browserDOMPopupBlocked()");
	try {
		// This prevents the information bar sound being played at the same time
		// as the popup blocked sound.
		navsounds.blockedPopup = true;
		setTimeout(function() { navsounds.blockedPopup = false }, 0);
		// Popup was blocked.
		if (navsounds.prefs.getValue("event.block-popup", null)) {
			navsounds.playSound(navsounds.getSystemSound("Explorer", "BlockedPopup"));
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserDOMPopupBlocked", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.browserAlertActive =
function _navsounds_browserAlertActive(e) {
	navsounds.debugLogEnter("browserAlertActive()");
	try {
		if (e.target && (e.target.localName == "tabbrowser")) {
			// Information Bar appeared.
			if (!navsounds.blockedPopup) {
				if (navsounds.prefs.getValue("event.information-bar", null)) {
					navsounds.playSound(navsounds.getSystemSound("Explorer", "SecurityBand"));
				}
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserAlertActive", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.browserTabSelect =
function _navsounds_browserTabSelect(e) {
	navsounds.debugLogEnter("browserTabSelect()");
	try {
		// Changed tab: re-notify for search providers.
		var tabBrowser = getBrowser();
		if (navsounds.prefs.getValue("event.discover-search-provider", null)) {
			if (tabBrowser.selectedBrowser.engines && tabBrowser.selectedBrowser.engines.length > 0) {
				navsounds.playSound(navsounds.getSystemSound("Explorer", "SearchProviderDiscovered"));
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserTabSelect", ex);
	}
	navsounds.debugLogLeave();
}

navsounds.browserPageShow =
function _navsounds_browserPageShow(e) {
	navsounds.debugLogEnter("browserPageShow()");
	try {
		// Page show: only if active tab, notify feeds and search providers.
		if (e.originalTarget == content.document) {
			var tabBrowser = getBrowser();
			if (navsounds.prefs.getValue("event.discover-feed", null)) {
				if (tabBrowser.selectedBrowser.feeds && tabBrowser.selectedBrowser.feeds.length > 0) {
					navsounds.playSound(navsounds.getSystemSound("Explorer", "FeedDiscovered"));
				}
			}
			if (navsounds.prefs.getValue("event.discover-search-provider", null)) {
				if (tabBrowser.selectedBrowser.engines && tabBrowser.selectedBrowser.engines.length > 0) {
					navsounds.playSound(navsounds.getSystemSound("Explorer", "SearchProviderDiscovered"));
				}
			}
		}
	} catch(ex) {
		navsounds.reportError("navsounds.browserPageShow", ex);
	}
	navsounds.debugLogLeave();
}


window.addEventListener("load", navsounds.init, false);
