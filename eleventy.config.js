import { readFileSync } from "node:fs";

// Site build settings. Pages live in src/, the finished site is written to _site/.
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Tiny, safe inline formatter: **bold**, *italic*, [text](https://link)
function inline(text) {
  let out = esc(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|mailto:[^\s)]+)\)/g,
    (_, label, href) => `<a href="${href}">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

export default function (eleventyConfig) {
  // The blog stays off the site until "blogEnabled" is set to true in src/_data/site.json.
  const site = JSON.parse(readFileSync(new URL("./src/_data/site.json", import.meta.url), "utf8"));
  if (!site.blogEnabled) eleventyConfig.ignores.add("src/insights/**");

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addFilter("inline", inline);
  // Headline formatter: a phrase wrapped in *asterisks* becomes the accent-colored italic.
  eleventyConfig.addFilter("headline", (text, color) =>
    esc(text).replace(/\*([^*]+)\*/g, `<em style="color: ${color || "#f0c4a4"}">$1</em>`));
  eleventyConfig.addFilter("plain", (text) => String(text || "").replace(/\*/g, ""));
  eleventyConfig.addFilter("dateLabel", (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US",
      { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" }).toUpperCase();
  });
  eleventyConfig.addFilter("isoDate", (iso) => (iso ? new Date(iso).toISOString() : ""));
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("absUrl", (path, base) => new URL(path, base).toString());

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
