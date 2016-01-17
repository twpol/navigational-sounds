//------------------------------------------------------------------------------
// Navigational Sounds extension (http://james-ross.co.uk/projects/navsounds/).
// License: New BSD License (BSD).
//------------------------------------------------------------------------------

function loadEvent() {
	window.removeEventListener("load", setupTestButtons, false);
	setupTestButtons();
	updateTestButtons();
	setInterval(updateTestButtons, 1000);
}

function setupTestButtons() {
	var buttons = document.getElementsByClassName("sound-test");
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener("command", testButtonCommand, false);
	}
}

function testButtonCommand(e) {
	navsounds.playSound(navsounds.getSystemSound(e.originalTarget.getAttribute("sound-app"), e.originalTarget.getAttribute("sound-name")));
}

function updateTestButtons() {
	var buttons = document.getElementsByClassName("sound-test");
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].disabled = navsounds.getSystemSound(buttons[i].getAttribute("sound-app"), buttons[i].getAttribute("sound-name")) == "";
	}
}

window.addEventListener("load", loadEvent, false);
