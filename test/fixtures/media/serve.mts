import { startMediaFixture } from "./server.mjs";
const fixture = await startMediaFixture();
console.log(`Synthetic media fixture: ${fixture.origin}`);
const timer = setInterval(() => fixture.advance(), 2000);
async function stop() {
  clearInterval(timer);
  await fixture.close();
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
