
$(function () {
  const speakerDevices = document.getElementById("speaker-devices");
  const ringtoneDevices = document.getElementById("ringtone-devices");
  const outputVolumeBar = document.getElementById("output-volume");
  const inputVolumeBar = document.getElementById("input-volume");
  const volumeIndicators = document.getElementById("volume-indicators");
  const callButton = document.getElementById("button-call");
  const outgoingCallHangupButton = document.getElementById("button-hangup-outgoing");
  const callControlsDiv = document.getElementById("call-controls");
  const audioSelectionDiv = document.getElementById("output-selection");
  const getAudioDevicesButton = document.getElementById("get-devices");
  const logDiv = document.getElementById("log");
  const incomingCallDiv = document.getElementById("incoming-call");
  const processButton = document.getElementById("processButton");
  const processButton2 = document.getElementById("processButton2");
  const incomingCallHangupButton = document.getElementById(
    "button-hangup-incoming"
  );
  const incomingCallAcceptButton = document.getElementById(
    "button-accept-incoming"
  );
  const incomingCallRejectButton = document.getElementById(
    "button-reject-incoming"
  );
  const phoneNumberInput = document.getElementById("phone-number");
  const incomingPhoneNumberEl = document.getElementById("incoming-number");
  const startupButton = document.getElementById("startup-button");

  let device;
  let token;

  // Event Listeners

  callButton.onclick = (e) => {
    e.preventDefault();
    const btnText = callButton.querySelector(".btn-text");
    const loader = callButton.querySelector("#loader");
    btnText.style.display = "none";
    loader.style.display = "block";
    makeOutgoingCall();
  };
  if(processButton) {processButton.onclick = (e) => {
    e.preventDefault();
    const btnText = processButton.querySelector(".btn-text");
    const loader = processButton.querySelector("#loader");
    btnText.style.display = "none";
    loader.style.display = "block";
    setTimeout(() => {
      btnText.style.display = "block";
      // btnText.textContent = "Process";
      loader.style.display = "none";
      window.location.href = "call-options-2";
    }, 1000);;
  }}
  if(processButton2) {processButton2.onclick = (e) => {
    e.preventDefault();
    const btnText = processButton2.querySelector(".btn-text");
    const loader = processButton2.querySelector("#loader");
    btnText.style.display = "none";
    loader.style.display = "block";
    setTimeout(() => {
      btnText.style.display = "block";
      // btnText.textContent = "Process";
      loader.style.display = "none";
      window.location.href = "call-options-22";
    }, 1000);;
  }}
  // getAudioDevicesButton.onclick = getAudioDevices;
  // speakerDevices.addEventListener("change", updateOutputDevice);
  // ringtoneDevices.addEventListener("change", updateRingtoneDevice);


  // SETUP STEP 1:
  // Browser client should be started after a user gesture
  // to avoid errors in the browser console re: AudioContext
  // startupButton.addEventListener("click", startupClient);
  window.onload = startupClient();

  // SETUP STEP 2: Request an Access Token
  async function startupClient() {
    console.log("Requesting Access Token...");

    try {
      const data = await $.getJSON("/token");
      console.log("Got a token.");
      console.log(data.token);
      token = data.token;
      // setClientNameUI(data.identity);
      intitializeDevice();
    } catch (err) {
      console.log(err);
      console.log("An error occurred. See your browser console for more information.");
    }
  }

  // SETUP STEP 3:
  // Instantiate a new Twilio.Device
  function intitializeDevice() {
    // logDiv.classList.remove("hide");
    console.log("Initializing device");
    console.log(token);
    device = new Twilio.Device(token, {
      logLevel:1,
      // Set Opus as our preferred codec. Opus generally performs better, requiring less bandwidth and
      // providing better audio quality in restrained network conditions.
      codecPreferences: ["opus", "pcmu"],
    });

    addDeviceListeners(device);

    // Device must be registered in order to receive incoming calls
    device.register();
  }

  // SETUP STEP 4:
  // Listen for Twilio.Device states
  function addDeviceListeners(device) {
    device.on("registered", function () {
      console.log("Twilio.Device Ready to make and receive calls!");
      // callControlsDiv.classList.remove("hide");
    });

    device.on("error", function (error) {
      // log("Twilio.Device Error: " + error.message);
      console.log("Twilio.Device Error: " + error.message)
    });

    device.on("incoming", handleIncomingCall);

    // device.audio.on("deviceChange", updateAllAudioDevices.bind(device));

    // Show audio selection UI if it is supported by the browser.
    if (device.audio.isOutputSelectionSupported) {
      // audioSelectionDiv.classList.remove("hide");
    }
  }

  // MAKE AN OUTGOING CALL

  async function makeOutgoingCall() {
    var params = {
      // get the phone number to call from the DOM
      To: +15204418664,
    };

    if (device) {
      console.log(`Attempting to call ${params.To} ...`);

      // Twilio.Device.connect() returns a Call object
      const call = await device.connect({ params });

      // add listeners to the Call
      // "accepted" means the call has finished connecting and the state is now "open"
      call.on("accept", updateUIAcceptedOutgoingCall);
      call.on("disconnect", updateUIDisconnectedOutgoingCall);
      call.on("cancel", updateUIDisconnectedOutgoingCall);

      outgoingCallHangupButton.onclick = () => {
        console.log("Hanging up ...");
        call.disconnect();
      };

    } else {
      console.log("Unable to make call.");
    }
  }

  function updateUIAcceptedOutgoingCall(call) {
    const outgoingCallHangupBtnText = outgoingCallHangupButton.querySelector(".btn-text");
    const outgoingCallHangupBtnLoader = outgoingCallHangupButton.querySelector("#loader");

    console.log("Call in progress ...");
    callButton.disabled = true;
    callButton.classList.add("hidden")
    outgoingCallHangupButton.classList.remove("hidden");
    volumeIndicators.classList.remove("hidden");
    outgoingCallHangupBtnText.style.display = "none";
    outgoingCallHangupBtnLoader.style.display = "block";
    setTimeout(() => {
      outgoingCallHangupBtnText.style.display = "block";
      // btnText.textContent = "Process";
      outgoingCallHangupBtnLoader.style.display = "none";
    }, 1000);
    // bindVolumeIndicators(call);
  }

  function updateUIDisconnectedOutgoingCall() {
    console.log("Call disconnected.");
    const processBtnText = processBtn.querySelector(".btn-text");
    const processBtnLoader = processBtn.querySelector("#loader");
    callButton.disabled = false;
    outgoingCallHangupButton.classList.add("hidden");
    callButton.classList.add("hidden")
    if(processButton) {processButton.classList.remove("hidden")}
    if(processButton2) {processButton2.classList.remove("hidden")}
    volumeIndicators.classList.add("hidden");
    processBtnText.style.display = "none";
    processBtnLoader.style.display = "block";
    setTimeout(() => {
      processBtnText.style.display = "block";
      // btnText.textContent = "Process";
      processBtnLoader.style.display = "none";
    }, 1000);
  }

  // HANDLE INCOMING CALL

  function handleIncomingCall(call) {
    console.log(`Incoming call from ${call.parameters.From}`);

    //show incoming call div and incoming phone number
    incomingCallDiv.classList.remove("hide");
    incomingPhoneNumberEl.innerHTML = call.parameters.From;

    //add event listeners for Accept, Reject, and Hangup buttons
    incomingCallAcceptButton.onclick = () => {
      acceptIncomingCall(call);
    };

    incomingCallRejectButton.onclick = () => {
      rejectIncomingCall(call);
    };

    incomingCallHangupButton.onclick = () => {
      hangupIncomingCall(call);
    };

    // add event listener to call object
    call.on("cancel", handleDisconnectedIncomingCall);
    call.on("disconnect", handleDisconnectedIncomingCall);
    call.on("reject", handleDisconnectedIncomingCall);
  }

  // ACCEPT INCOMING CALL

  function acceptIncomingCall(call) {
    call.accept();

    //update UI
    console.log("Accepted incoming call.");
    incomingCallAcceptButton.classList.add("hide");
    incomingCallRejectButton.classList.add("hide");
    incomingCallHangupButton.classList.remove("hide");
  }

  // REJECT INCOMING CALL

  function rejectIncomingCall(call) {
    call.reject();
    console.log("Rejected incoming call");
    resetIncomingCallUI();
  }

  // HANG UP INCOMING CALL

  function hangupIncomingCall(call) {
    call.disconnect();
    console.log("Hanging up incoming call");
    resetIncomingCallUI();
  }

  // HANDLE CANCELLED INCOMING CALL

  function handleDisconnectedIncomingCall() {
    console.log("Incoming call ended.");
    resetIncomingCallUI();
  }

  // MISC USER INTERFACE

  // Activity log
  function log(message) {
    logDiv.innerHTML += `<p class="log-entry">&gt;&nbsp; ${message} </p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  function setClientNameUI(clientName) {
    var div = document.getElementById("client-name");
    div.innerHTML = `Your client name: <strong>${clientName}</strong>`;
  }

  function resetIncomingCallUI() {
    incomingPhoneNumberEl.innerHTML = "";
    incomingCallAcceptButton.classList.remove("hide");
    incomingCallRejectButton.classList.remove("hide");
    incomingCallHangupButton.classList.add("hide");
    incomingCallDiv.classList.add("hide");
  }

  // AUDIO CONTROLS

  async function getAudioDevices() {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    updateAllAudioDevices.bind(device);
  }

  // function updateAllAudioDevices() {
  //   if (device) {
  //     updateDevices(speakerDevices, device.audio.speakerDevices.get());
  //     updateDevices(ringtoneDevices, device.audio.ringtoneDevices.get());
  //   }
  // }

  function updateOutputDevice() {
    const selectedDevices = Array.from(speakerDevices.children)
      .filter((node) => node.selected)
      .map((node) => node.getAttribute("data-id"));

    device.audio.speakerDevices.set(selectedDevices);
  }

  function updateRingtoneDevice() {
    const selectedDevices = Array.from(ringtoneDevices.children)
      .filter((node) => node.selected)
      .map((node) => node.getAttribute("data-id"));

    device.audio.ringtoneDevices.set(selectedDevices);
  }

  function bindVolumeIndicators(call) {
    call.on("volume", function (inputVolume, outputVolume) {
      var inputColor = "red";
      if (inputVolume < 0.5) {
        inputColor = "green";
      } else if (inputVolume < 0.75) {
        inputColor = "yellow";
      }

      inputVolumeBar.style.width = Math.floor(inputVolume * 300) + "px";
      inputVolumeBar.style.background = inputColor;

      var outputColor = "red";
      if (outputVolume < 0.5) {
        outputColor = "green";
      } else if (outputVolume < 0.75) {
        outputColor = "yellow";
      }

      outputVolumeBar.style.width = Math.floor(outputVolume * 300) + "px";
      outputVolumeBar.style.background = outputColor;
    });
  }
});
