import sax from "sax";
import sanitizeHtml from "sanitize-html";
import { INGESTION_LIMITS as limits, type XmlNode } from "./contracts";
import { IngestionError } from "./errors";

/** Safe display HTML, no links/images/attributes or active content. Never render raw XML fields. */
export function sanitizeDisplayHtml(value: string) {
  if (value.length > limits.textLength) throw new IngestionError("xml_limit");
  return sanitizeHtml(value, { allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li"], allowedAttributes: {}, nonTextTags: ["script", "style", "textarea", "option", "iframe", "object", "svg", "math"], nestingLimit: 16 });
}

/** Strict UTF-8 XML only; DTDs, custom entities, processing instructions and XInclude are rejected. */
export function parseXml(bytes: Buffer): XmlNode {
  if (bytes.length > limits.decodedBytes) throw new IngestionError("too_large");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new IngestionError("encoding"); }
  const encoding = text.match(/^\s*<\?xml\s[^?]*encoding\s*=\s*["']([^"']+)/i)?.[1];
  if (encoding && !/^utf-?8$/i.test(encoding)) throw new IngestionError("encoding");
  const options: sax.SAXOptions & { strictEntities: boolean } = { strictEntities: true, xmlns: false, trim: false };
  const parser = sax.parser(true, options);
  const stack: XmlNode[] = [];
  let root: XmlNode | null = null, count = 0;
  parser.onerror = () => { throw new IngestionError("invalid_xml"); };
  parser.ondoctype = () => { throw new IngestionError("invalid_xml"); };
  parser.onprocessinginstruction = item => { if (item.name !== "xml") throw new IngestionError("invalid_xml"); };
  parser.onopentag = tag => {
    if (++count > limits.nodes || stack.length >= limits.depth || Object.keys(tag.attributes).length > limits.attributes) throw new IngestionError("xml_limit");
    const attributes = Object.create(null) as Record<string, string>;
    for (const [key, value] of Object.entries(tag.attributes)) {
      if (key.length > 256 || typeof value !== "string" || value.length > limits.textLength) throw new IngestionError("xml_limit");
      if (value === "http://www.w3.org/2001/XInclude") throw new IngestionError("invalid_xml");
      attributes[key] = value;
    }
    if (tag.name.length > 256) throw new IngestionError("xml_limit");
    const node: XmlNode = { name: tag.name, attributes, text: "", children: [] };
    if (stack.length) stack.at(-1)!.children.push(node);
    else if (root) throw new IngestionError("invalid_xml");
    else root = node;
    stack.push(node);
  };
  const append = (value: string) => {
    const node = stack.at(-1);
    if (!node) { if (value.trim()) throw new IngestionError("invalid_xml"); return; }
    if (node.text.length + value.length > limits.textLength) throw new IngestionError("xml_limit");
    node.text += value;
  };
  parser.ontext = append;
  parser.oncdata = append;
  parser.onclosetag = () => { stack.pop(); };
  try {
    for (let offset = 0; offset < text.length; offset += 4096) parser.write(text.slice(offset, offset + 4096));
    parser.close();
  } catch (error) { if (error instanceof IngestionError) throw error; throw new IngestionError("invalid_xml"); }
  if (!root || stack.length) throw new IngestionError("invalid_xml");
  return root;
}
