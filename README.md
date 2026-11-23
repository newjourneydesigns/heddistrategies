# heddistrategies

The Heddi Strategies website and Insights blog. Hosted on Netlify at https://heddistrategies.com.

## How it works

- Pages are written in `src/` and built into a plain, fast website by Eleventy.
- Blog articles are Markdown files in `content/posts/`.
- The Insights blog and its menu link appear on their own once at least one article is published. With no published articles, the blog stays hidden.
- Newsletter signups go to Resend (https://resend.com). The signup form appears on the site once `RESEND_API_KEY` is set in Netlify and the site is redeployed. Newsletters are written and sent from Resend, under Broadcasts.
- Editors write articles in Pages CMS (https://app.pagescms.org), a free, open source CMS. Saving there commits to this repo, and Netlify rebuilds the site in about a minute.
- The contact form is delivered by Web3Forms.

## Where things live

| What | Where |
| --- | --- |
| Page content (Home, About, FAQ, Contact, Privacy) | `src/*.njk` |
| Blog index and article template | `src/insights/` |
| Header, footer, page shell | `src/_includes/base.njk` |
| Articles | `content/posts/*.md` |
| FAQ questions | `src/_data/faq.json` |
| Topics, site details | `src/_data/topics.json`, `src/_data/site.json` |
| Styles and scripts | `src/assets/css/site.css`, `src/assets/js/site.js` |
| Images uploaded in the CMS | `src/assets/uploads/` |
| What editors see in the CMS | `.pages.yml` |
| Build, redirects, headers | `netlify.toml` |

## Writing an article

1. Sign in at https://app.pagescms.org and open this site.
2. Open Articles, then Add an entry.
3. Fill in the title, summary, topic and publish date, then write the article.
4. Save. The article is live in about a minute.

Good to know:

- Draft on = the article stays off the site.
- A future publish date = the article goes live that morning (needs the daily rebuild below).
- Heading 2 starts a numbered section and adds it to "In this article".
- A quote becomes the dark pull quote. Put the person's name on its own line under the quote.

## Run it on your computer

```
npm install
npm run dev
```

Then open http://localhost:8080.

## Branches

- `main` is the live site. Netlify deploys it automatically.
- Do work on a branch, open a pull request, check the Netlify preview link, then merge.

## Daily rebuild for scheduled articles

`netlify/functions/daily-rebuild.mjs` rebuilds the site each morning. To turn it on:

1. In Netlify, go to Project configuration > Build & deploy > Build hooks and add a hook for `main`.
2. Copy the hook URL.
3. In Project configuration > Environment variables, add `BUILD_HOOK_URL` with that URL.
