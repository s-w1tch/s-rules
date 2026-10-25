(async function () {
  "use strict";

  const stateKey = "pc-capture.previous-state";
  const captureNode = "PC-Capture";
  const modes = ["filter", "all_proxy", "all_direct"];
  let outcome;

  function report(status, message) {
    const escaped = message.replace(/[&<>]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;"
    })[character]);
    outcome = { title: "PC Capture: " + status, htmlMessage: "<p>" + escaped + "</p>" };
  }

  async function send(action, content) {
    const message = content === undefined ? { action } : { action, content };
    const result = await $configuration.sendMessage(message);
    if (result.error) {
      throw new Error(String(result.error));
    }
    return result.ret;
  }

  async function restore(state) {
    await send("set_running_mode", { running_mode: state.mode });
    await send("set_policy_state", { proxy: state.proxy });
  }

  try {
    const saved = $prefs.valueForKey(stateKey);
    if (saved) {
      const state = JSON.parse(saved);
      if (!modes.includes(state.mode) || typeof state.proxy !== "string" || !state.proxy) {
        throw new Error("Invalid saved state; restore the QX mode and proxy manually.");
      }
      await restore(state);
      $prefs.removeValueForKey(stateKey);
      report("OFF", "Previous mode and proxy restored.");
      return;
    }

    const description = await send("get_server_description", captureNode);
    if (!description || !description[captureNode]) {
      throw new Error("PC-Capture node is missing. Update the QX configuration first.");
    }
    const running = await send("get_running_mode");
    const mode = typeof running === "string" ? running : running && running.running_mode;
    const policies = await send("get_policy_state");
    const proxy = policies && policies.proxy && policies.proxy[1];
    if (!modes.includes(mode)) {
      throw new Error("Cannot read QX running mode. API result: " + JSON.stringify(running));
    }
    if (typeof proxy !== "string" || !proxy) {
      throw new Error(
        "Cannot read the built-in proxy selection. Mode: " + mode +
        ". Proxy state: " + JSON.stringify(policies && policies.proxy) +
        ". Available policy names: " + Object.keys(policies || {}).join(", ")
      );
    }
    if (proxy === captureNode) {
      throw new Error(
        "PC-Capture is already selected, but no previous state was saved. " +
        "Select your usual node for the built-in proxy, return to your usual mode, and retry."
      );
    }
    const state = { mode, proxy };
    if (!$prefs.setValueForKey(JSON.stringify(state), stateKey)) {
      throw new Error("Could not save the previous QX state.");
    }
    try {
      await send("set_policy_state", { proxy: captureNode });
      await send("set_running_mode", { running_mode: "all_proxy" });
    } catch (error) {
      await restore(state);
      $prefs.removeValueForKey(stateKey);
      throw error;
    }
    report("ON", "TCP traffic uses the PC. Tap again to restore.");
  } catch (error) {
    report("Failed", error.message || String(error));
  } finally {
    $done(outcome);
  }
})();