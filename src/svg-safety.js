// IDs only exist on detached SVG nodes until they have been namespaced.
// HTML IDs are removed; external paint servers and SVG links are never retained.
let svgSequence = 0;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
function scopeSvgReferences(fragment) {
  for (const node of fragment.querySelectorAll("[id]")) {
    if (node.namespaceURI !== SVG_NAMESPACE) node.removeAttribute("id");
  }
  for (const svg of fragment.querySelectorAll("svg")) {
    if (svg.parentElement?.closest("svg")) continue;
    const prefix = "md-svg-" + ++svgSequence + "-";
    const mapping = new Map();
    const nodes = [svg, ...svg.querySelectorAll("*")];
    let counter = 0;
    for (const node of nodes) {
      if (!node.hasAttribute("id")) continue;
      const old = node.getAttribute("id");
      const next = prefix + ++counter;
      if (!mapping.has(old)) mapping.set(old, next);
      node.setAttribute("id", next);
    }
    for (const node of nodes) {
      node.removeAttribute("style");
      for (const attr of [...node.attributes]) {
        if (attr.localName === "href") {
          const key = attr.value.startsWith("#") ? attr.value.slice(1) : "";
          if (mapping.has(key))
            node.setAttribute(attr.name, "#" + mapping.get(key));
          else node.removeAttribute(attr.name);
          continue;
        }
        if (/url\s*\(/i.test(attr.value)) {
          const rewritten = attr.value.replace(
            /url\s*\(\s*['"]?#([^'"\s)]+)['"]?\s*\)/gi,
            (_, id) =>
              mapping.has(id) ? "url(#" + mapping.get(id) + ")" : "none",
          );
          if (/url\s*\((?!#md-svg-)/i.test(rewritten))
            node.removeAttribute(attr.name);
          else node.setAttribute(attr.name, rewritten);
        }
      }
    }
  }
  return fragment;
}
