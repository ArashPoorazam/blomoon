import { beforeEach, describe, expect, it, vi } from "vitest";
const dns = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: dns }));
import { approvedUrl, resolvePublicAddress } from "./address";
import { isPublicAddress } from "../network/publicAddress";
beforeEach(() => { dns.mockReset(); });
describe("public-only ingestion destinations", () => {
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.1.1.1", "192.0.2.1", "::1", "::", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::", "64:ff9b::7f00:1"])("denies %s", address => expect(isPublicAddress(address)).toBe(false));
  it.each(["https://2130706433/a", "https://127.1/a", "https://0x7f000001/a", "https://[::ffff:127.0.0.1]/a"])("denies alternate IP notation %s", async raw => {
    const url = new URL(raw);
    await expect(resolvePublicAddress(approvedUrl(raw,[url.origin]),new AbortController().signal)).rejects.toMatchObject({code:"unsafe_address"});
  });
  it.each(["http://feeds.example/a", "file:///etc/passwd", "https://u:p@feeds.example/a", "https://feeds.example:8443/a", "https://feeds.example/a#fragment", "https://unapproved.example/a"])("rejects a disallowed URL %s", raw => expect(() => approvedUrl(raw,["https://feeds.example"])).toThrow());
  it("rejects mixed public/private DNS, even if the first answer is public", async () => {
    dns.mockResolvedValue([{address:"1.1.1.1",family:4},{address:"::1",family:6}]);
    await expect(resolvePublicAddress(new URL("https://feeds.example/a"),new AbortController().signal)).rejects.toMatchObject({code:"unsafe_address"});
  });
  it("permits public v4/v6 and cancels stalled DNS", async () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true); expect(isPublicAddress("2606:4700::1111")).toBe(true);
    dns.mockImplementation(() => new Promise(()=>{})); const controller = new AbortController();
    const result = resolvePublicAddress(new URL("https://feeds.example/a"),controller.signal);
    controller.abort(); await expect(result).rejects.toBeDefined();
  });
});
