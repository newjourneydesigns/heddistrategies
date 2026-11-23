// Loads blog articles for the build.
// Articles are Markdown files in content/posts/, edited through Pages CMS.
// An article shows on the site when "draft" is off and its date is today or earlier.
import { readdir, readFile } from "node:fs/promises";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const POSTS_DIR = new URL("../../content/posts/", import.meta.url);
const TOPIC_COLORS = { nonprofit: "#734141", public: "#2b3a49", systems: "#5d7b5f", approach: "#ae5f32" };
const TIME_ZONE = "America/Chicago";

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pad2 = (n) => String(n).padStart(2, "0");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD
const dayString = (d) => (!d ? "" : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
const dateLabel = (day) => day
  ? new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).toUpperCase()
  : "[DATE]";

// Markdown renderer that gives every section heading an id, so the "In this article" links work.
function render(markdown) {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  const toc = [];
  md.core.ruler.push("heading_ids", (state) => {
    state.tokens.forEach((token, i) => {
      if (token.type !== "heading_open" || token.tag !== "h2") return;
      const text = state.tokens[i + 1].children.filter((c) => c.type === "text" || c.type === "code_inline").map((c) => c.content).join("");
      let id = slugify(text) || "section";
      while (toc.some((t) => t.id === id)) id += "-2";
      token.attrSet("id", id);
      toc.push({ id, num: pad2(toc.length + 1), text });
    });
  });
  return { html: md.render(markdown || ""), toc };
}

export default async function () {
  const topics = JSON.parse(await readFile(new URL("./topics.json", import.meta.url), "utf8"));
  const topicById = Object.fromEntries(topics.map((t) => [t.id, t]));
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  const now = today();

  let posts = [];
  for (const file of files) {
    const { data, content } = matter(await readFile(new URL(file, POSTS_DIR), "utf8"));
    const day = dayString(data.date);
    if (data.draft || (day && day > now)) continue;
    const topic = topicById[data.topic] || { id: data.topic || "general", label: "Insights", icon: "article" };
    const { html, toc } = render(content);
    const takeaways = (data.takeaways || []).filter(Boolean);
    if (takeaways.length) toc.push({ id: "takeaways", num: pad2(toc.length + 1), text: "Key takeaways" });
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    posts.push({
      slug: file.replace(/\.md$/, ""),
      title: data.title || "Untitled",
      summary: data.summary || "",
      topic: topic.id, topicLabel: topic.label, topicIcon: topic.icon,
      color: data.color || TOPIC_COLORS[topic.id] || "#2b3a49",
      featured: Boolean(data.featured),
      author_name: data.author || "Heddi Strategies",
      author_bio: data.author_bio || "",
      image_url: data.image || "", image_alt: data.image_alt || "",
      meta_title: data.meta_title || "", meta_description: data.meta_description || "",
      day, dateLabel: dateLabel(day),
      readTime: Math.max(1, Math.round(words / 220)),
      html, toc, takeaways,
    });
  }

  posts.sort((a, b) => (b.day || "").localeCompare(a.day || "") || a.title.localeCompare(b.title));
  for (const post of posts) {
    const others = posts.filter((o) => o.slug !== post.slug);
    post.related = [...others.filter((o) => o.topic === post.topic), ...others.filter((o) => o.topic !== post.topic)].slice(0, 3);
  }
  const featured = posts.find((p) => p.featured) || posts[0] || null;
  const archive = posts.filter((p) => p !== featured);
  const used = new Set(archive.map((p) => p.topic));
  return { posts, featured, archive, topics: topics.filter((t) => used.has(t.id)) };
}
