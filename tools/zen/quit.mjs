import { Marionette } from "./marionette.mjs";
const m = new Marionette(2829);
await m.connect();
await m.send("WebDriver:NewSession", { capabilities: {} });
await m.quit();
console.log("quit sent");
