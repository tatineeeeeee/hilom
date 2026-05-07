import { test } from "@playwright/test";

test.describe("chat", () => {
  test.skip("patient and doctor exchange messages in real time", async () => {
    // Two browser contexts. Confirmed appointment unlocks the chat. Patient
    // sends a message, doctor sees it without a refresh (Socket.io). Doctor
    // replies, patient sees it. Reload the page → message history loads.
    //
    // Watch for socket-timing flakes: use page.waitForFunction with a 3s
    // budget and a clear failure message.
  });
});
