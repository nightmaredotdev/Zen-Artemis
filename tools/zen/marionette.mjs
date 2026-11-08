// Minimal Marionette client (Node.js built-ins only).
// Used to drive the isolated Artemis test profile; never the real profile.

import net from "node:net";

export class Marionette {
  constructor(port = 2829, host = "127.0.0.1") {
    this.port = port;
    this.host = host;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
  }

  connect(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
      const attempt = () => {
        const socket = net.connect(this.port, this.host);
        let greeted = false;
        socket.on("data", (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          for (const msg of this.#drain()) {
            if (!greeted) {
              greeted = true;
              this.socket = socket;
              resolve(msg);
              continue;
            }
            const [, id, error, result] = msg;
            const p = this.pending.get(id);
            if (!p) continue;
            this.pending.delete(id);
            if (error) p.reject(new Error(`${error.error}: ${error.message}`));
            else p.resolve(result);
          }
        });
        socket.on("error", () => {
          socket.destroy();
          if (greeted) return;
          if (Date.now() > deadline) reject(new Error("Marionette connection timed out"));
          else setTimeout(attempt, 500);
        });
      };
      attempt();
    });
  }

  *#drain() {
    for (;;) {
      const colon = this.buffer.indexOf(":");
      if (colon < 0) return;
      const len = Number(this.buffer.subarray(0, colon).toString());
      if (this.buffer.length < colon + 1 + len) return;
      const body = this.buffer.subarray(colon + 1, colon + 1 + len).toString("utf8");
      this.buffer = this.buffer.subarray(colon + 1 + len);
      yield JSON.parse(body);
    }
  }

  send(command, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify([0, id, command, params]);
    const data = `${Buffer.byteLength(payload)}:${payload}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.write(data);
    });
  }

  async start() {
    await this.connect();
    await this.send("WebDriver:NewSession", { capabilities: {} });
    await this.send("Marionette:SetContext", { value: "chrome" });
  }

  /** Runs `script` (a function body) in the current context; awaits promises. */
  async run(script, args = []) {
    const res = await this.send("WebDriver:ExecuteScript", { script, args, sandbox: "system" });
    return res?.value;
  }

  async screenshot() {
    const res = await this.send("WebDriver:TakeScreenshot", { full: false, hash: false });
    return Buffer.from(res.value, "base64");
  }

  async quit() {
    try {
      await this.send("Marionette:Quit", { flags: ["eForceQuit"] });
    } catch {
      /* connection closes on quit */
    }
    this.socket?.destroy();
  }

  close() {
    this.socket?.destroy();
  }
}
