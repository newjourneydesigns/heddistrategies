import { readFileSync, readdirSync } from "node:fs";
import matter from "gray-matter";

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
  // The blog shows up on its own once at least one article is published
  // (draft off, and a publish date of today or earlier).
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const postsDir = new URL("./content/posts/", import.meta.url);
  const blogLive = readdirSync(postsDir).filter((f) => f.endsWith(".md")).some((f) => {
    const { data } = matter(readFileSync(new URL(f, postsDir), "utf8"));
    const day = !data.date ? "" : data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date).slice(0, 10);
    return !data.draft && !(day && day > today);
  });
  if (!blogLive) eleventyConfig.ignores.add("src/insights/**");
  eleventyConfig.addGlobalData("blogLive", blogLive);

  // The newsletter signup shows once the Resend key has been added in Netlify.
  eleventyConfig.addGlobalData("newsletterLive", Boolean(process.env.RESEND_API_KEY));

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
