// Current Date function
function displayFormattedDate(elementId) {
	const dateElement = document.getElementById(elementId);

	if (dateElement) {
		const currentDate = new Date();
		const options = { weekday: "long", month: "long", day: "numeric" };
		const formattedDate = currentDate.toLocaleDateString("en-US", options);
		dateElement.innerHTML = formattedDate;
	}
}

// Current Time function
function displayFormattedTime(elementId) {
	const timeElement = document.getElementById(elementId);

	if (timeElement) {
		const currentTime = new Date();

		const formattedTime = currentTime.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});

		timeElement.innerHTML = formattedTime;
	}
}

// Function to update time in real-time
function updateTime() {
	displayFormattedTime("timeDisplay");
}

window.addEventListener("DOMContentLoaded", () => {
	// Animate on Scroll
	AOS.init({
		once: true,
	});

	// Display current date
	displayFormattedDate("currentDate");

	// Display current Time
	displayFormattedTime("currentTime");

	// Update the time every second
	setInterval(updateTime, 1000);

	// Team Sliders
	const teamSliders = document.querySelectorAll(".team-slider-container");

	if (teamSliders) {
		teamSliders.forEach((teamSlider) => {
			const slider = tns({
				container: teamSlider.querySelector(".team-slider"),
				items: 1,
				gutter: 30,
				autoHeight: false,
				controls: true,
				mouseDrag: true,
				swipeAngle: false,
				navPosition: "bottom",
				navContainer: teamSlider.querySelector(".slider-navs"),
				prevButton: teamSlider.querySelector(".slider-prev"),
				nextButton: teamSlider.querySelector(".slider-next"),
			});
		});
	}

	/* draggable */
	const moveable = new Moveable(document.body, {
		target: document.querySelector("#call-notes-modal"),
		container: document.body,
		draggable: true,
		checkInput: true,
		dragFcousedInput: false,
	});

	moveable.on("drag", ({ target, left, top }) => {
		target.style.left = `${left}px`;
		target.style.top = `${top}px`;
	});

	// Check if any tab-content elements are present before proceeding
	const tabContents = document.querySelectorAll(".tab-content");
	if (tabContents.length > 0) {
		const group = document.querySelector(".tab");
		const buttons = document.querySelectorAll(".tab button");
		let firstTimeClick = true;

		// Animate button repositioning
		function reorderButtons() {
			// Get the initial state
			const state = Flip.getState(".tab, .tab button");

			// Hide the heading
			document.getElementById("scriptsHeading").style.display = "none";

			// toggle the flex direction
			group.classList.toggle("reorder");

			Flip.from(state, {
				absolute: true,
				duration: 0.5,
				stagger: 0.1,
				ease: "power1.inOut",
			});
		}

		// Function to animate GSAP typing
		function animateTyping(selectedTab) {
			const typingElements = selectedTab.querySelectorAll(".typing-anim");
			typingElements.forEach((element) => {
				let typeSplit = new SplitType(element, {
					types: "lines, words, chars",
					tagName: "span",
				});

				let chars = element.querySelectorAll(".char");

				gsap.from(chars, {
					opacity: 0,
					duration: 0.1,
					ease: "none",
					stagger: 0.01,
					onComplete: function () {
						typeSplit.revert();
					},
				});
			});
		}

		// Function to open a tab
		function openTab(tabId) {
			// Remove "active" class from all buttons
			const buttons = document.querySelectorAll(".tab button");
			buttons.forEach((button) => {
				button.classList.remove("active");
			});

			// Add "active" class to the selected tab button
			const selectedButton = document.querySelector(`.tab button[data-tab="${tabId}"]`);
			if (selectedButton) {
				selectedButton.classList.add("active");
			}

			// Hide all tabs
			const tabs = document.querySelectorAll(".tab-content");
			tabs.forEach((tab) => tab.classList.remove("active"));

			// Show the selected tab
			const selectedTab = document.getElementById(tabId);
			if (selectedTab) {
				selectedTab.classList.add("active");

				// Trigger GSAP typing animation
				animateTyping(selectedTab);
			}
		}

		buttons.forEach((button) => {
			button.addEventListener("click", function () {
				if (firstTimeClick) {
					reorderButtons();
					setTimeout(() => {
						openTab(this.getAttribute("data-tab"));
					}, 1000);
				} else {
					openTab(this.getAttribute("data-tab"));
				}

				firstTimeClick = false;
			});
		});
	}
});
