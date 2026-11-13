import { describe, expect, it } from "vitest";
import { parseXml, sanitizeDisplayHtml } from "./xml";
const parse = (text: string) => parseXml(Buffer.from(text));
describe("bounded publisher XML", () => {
  it("parses RSS, namespaces, basic entities and CDATA without interpreting HTML", () => {
    const root = parse('<?xml version="1.0" encoding="UTF-8"?><rss><channel><title>A &amp; B</title><description><![CDATA[<p>Hello</p>]]></description></channel></rss>');
    expect(root.children[0].children.map(node => node.text)).toEqual(["A & B", "<p>Hello</p>"]);
    expect(parse('<feed xmlns="http://www.w3.org/2005/Atom"><title>سلام</title></feed>').name).toBe("feed");
  });
  it.each([
    '<!DOCTYPE rss SYSTEM "file:///etc/passwd"><rss/>',
    '<!DOCTYPE rss [<!ENTITY x "expansion">]><rss>&x;</rss>',
    '<rss>&unknown;</rss>', '<rss><item></rss>', '<rss/>junk', '<rss/><rss/>',
    '<?xml-stylesheet href="https://private.example"?><rss/>',
    '<rss xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="file:///etc/passwd"/></rss>',
  ])("rejects hostile or malformed XML (%#)", input => { expect(() => parse(input)).toThrow("invalid_xml"); });
  it("bounds depth, nodes, attributes, text and byte size", () => {
    for (const input of ['<a>'.repeat(33)+'</a>'.repeat(33), '<rss>'+ '<i/>'.repeat(50000)+'</rss>', '<rss>'+ 'a'.repeat(65537)+'</rss>', '<rss '+Array.from({length:33},(_,i)=>`a${i}="x"`).join(' ')+'/>']) {
      expect(() => parse(input)).toThrow("xml_limit");
    }
    expect(() => parseXml(Buffer.alloc(4*1024*1024+1))).toThrow("too_large");
  });
  it("rejects non-UTF8 declarations and invalid bytes", () => {
    expect(() => parse('<?xml version="1.0" encoding="UTF-16"?><rss/>')).toThrow("encoding");
    expect(() => parseXml(Buffer.from([255,254,0,0]))).toThrow("encoding");
  });
  it("keeps prototype-looking attributes as inert data", () => {
    expect(parse('<rss __proto__="data" constructor="safe"/>').attributes.constructor).toBe("safe");
    expect({}.toString).toBe(Object.prototype.toString);
  });
  it("sanitizes display HTML, removing active content, URLs and attributes", () => {
    const clean = sanitizeDisplayHtml('<p onclick="x()">Hello <strong>world</strong><script>alert(1)</script><img src=x onerror=x()><a href="javascript:x()">link</a><iframe src=x>bad</iframe></p>');
    expect(clean).toBe('<p>Hello <strong>world</strong>link</p>');
    expect(() => sanitizeDisplayHtml('x'.repeat(65537))).toThrow("xml_limit");
  });
});
