//------------------------------------------------------------------------------
// Navigational Sounds extension (http://james-ross.co.uk/projects/navsounds/).
// License: New BSD License (BSD).
//------------------------------------------------------------------------------

function loadEvent() {
	window.removeEventListener("load", loadEvent, false);
	setup();
	update();
	setInterval(update, 1000);
}

function setup() {
	var windowsVersion = navsounds.getRegKey(navsounds.ROOT_KEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", "CurrentVersion");
	var explorer = document.getElementsByClassName("explorer");
	for (var i = 0; i < explorer.length; i++) {
		explorer[i].value = explorer[i].value.replace('{{explorer}}', windowsVersion >= 6.3 ? 'File Explorer' : 'Windows Explorer');
	}
	var controlPanels = document.getElementsByClassName("open-control-panel");
	for (var i = 0; i < controlPanels.length; i++) {
		controlPanels[i].addEventListener("click", controlPanelClick, false);
	}
	var buttons = document.getElementsByClassName("sound-test");
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener("command", testButtonCommand, false);
	}
}

function controlPanelClick(e) {
	var rundll = navsounds.env.get("SYSTEMROOT") + "\\system32\\rundll32.exe";
	var file = navsounds.newObject("@mozilla.org/file/local;1", "nsILocalFile");
	file.initWithPath(rundll);
	var process = navsounds.newObject("@mozilla.org/process/util;1", "nsIProcess");
	process.init(file);
	process.run(false, ["shell32.dll,Control_RunDLL", "mmsys.cpl,,sounds"], 2);
}

function testButtonCommand(e) {
	navsounds.playSound(navsounds.getSystemSound(e.originalTarget.getAttribute("sound-app"), e.originalTarget.getAttribute("sound-name")));
}

function update() {
	var buttons = document.getElementsByClassName("sound-test");
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].disabled = navsounds.getSystemSound(buttons[i].getAttribute("sound-app"), buttons[i].getAttribute("sound-name")) == "";
	}
}

window.addEventListener("load", loadEvent, false);
