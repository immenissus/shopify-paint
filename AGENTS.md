# AGENTS.md — shopify-paint

Guide for AI agents / developers working on this repository. Read this before
making changes.

## What this is

A **Shopify Online Store 2.0 (OS 2.0) theme** for an apparel/print store
(`shopify-paint`, remote: `https://github.com/immenissus/shopify-paint.git`,
branch `main`). It is a heavily-customized **Dawn** derivative — many sections
retain Dawn's structure/schema while adding lots of bespoke custom sections,
apps, and an anti-piracy licensing hack.

Stack: Shopify Liquid + JSON templates, CSS/JS in `assets/`, no build step, no
node build tooling (there is no `package.json`).

## Directory layout (OS 2.0)

| Path                   | Purpose                                                        |
|------------------------|----------------------------------------------------------------|
| `layout/`              | `theme.liquid` (all page layouts), `password.liquid`           |
| `sections/`            | Reusable page "sections" (`.liquid` template + `{% schema %}`) and section groups (`header-group.json`, `footer-group.json`). |
| `snippets/`            | Partial templates (`{% render 'name' %}` / `{% include 'name' %}`). |
| `templates/`           | OS 2.0 JSON templates (`index.json`, `product.json`, ...) and `.liquid` ones (`gift_card.liquid`, `page.replo.*.liquid`). |
| `templates/customers/` | Customer-account templates (`login.json`, `account.json`, ...). |
| `config/`              | `settings_schema.json` (theme-inputs), `settings_data.json` (current values), `markets.json`. |
| `locales/`             | Localization strings; `en.default.json`. |
| `assets/`              | CSS/JS/images (~100 files). |

## How a page renders (mental model)

1. Shopify picks a template file from `templates/` by the route (home →
   `index.json`, product → `product.json`, page handle `about-us` →
   `page.about-us.json`, 404 → `404.json`).
2. The template JSON lists `sections`, each referencing a section in
   `sections/<type>.liquid` by its `"type"` value. `sections` in the JSON body
   are rendered via `{{ content_for_layout }}` in `layout/theme.liquid`.
3. Global sections are injected with `{% sections 'header-group' %}` and
   `{% sections 'footer-group' %}` (these read `sections/header-group.json`
   and `sections/footer-group.json`). `{% section 'promo-popup' %}` /
   `{% section 'scroll-to-top-btn' %}` / `{% section 'global-music-player' %}`
   are hard-coded in the layout.

**Rule: every section/block type named in any `.json` template must resolve to a
real file in `sections/` (for section types) or a block `type` defined in that
section's `{% schema %}` (for block types).** A missing/invalid one breaks that
page.

## IMPORTANT — multi-market (context) templates

Multiple `templates/product.context.*.json`, `templates/product.*.json`, and
`page.about-us.json`, `page.contact.json`, `page.faq.json` exist. Adding a
product template often means adding a **`.context.<market>.json`** and a
**`.water-painting-books.context.<market>.json`** variant too so every market
(see `config/markets.json`: `us`, `united-kingdom`, `canada`, `australia`)
resolves a template. Always check which markets/products reference a section
before editing its `{% schema %}`.

## `{% schema %}` validation is critical

Each section `.liquid` ends with a `{% schema %} ... {% endschema %}` block
containing **strict JSON**. It must parse with `JSON.parse` (no trailing
commas, no unquoted keys).

**History:** every page was returning a 404 after an update because 11 section
schemas had invalid JSON from trailing commas (`collage`, `comparison-table`,
`featured-collection`, `featured-product`, `icons-with-content`, `main-product`,
`newsletter`, `page`, `results`, `rich-text`, `video`). Fixing the trailing
commas restored the store. When these sections are referenced by nearly every
template (`main-product` on products, `newsletter` on most pages, …), a single
invalid schema makes all those pages fall back to the 404 page/theme error.

**Always re-validate after touching a schema.** Quick audit (run from repo
root):

```bash
node -e '
const fs=require("fs"),path=require("path");
let bad=0,tot=0;
for(const f of fs.readdirSync("sections")){
  if(!f.endsWith(".liquid"))continue; tot++;
  const m=fs.readFileSync(path.join("sections",f),"utf8")
    .match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  if(!m){console.log(f,"NO SCHEMA");bad++;continue;}
  try{JSON.parse(m[1]);}catch(e){console.log(f,"INVALID:",e.message.slice(0,60));bad++;}
}
console.log(bad?bad+" invalid":tot+" sections OK");
'
```

Small sections such as `cart-drawer.liquid`, `main-404.liquid`,
`pickup-availability.liquid`, `predictive-search.liquid` deliberately have
**no** `{% schema %}` — that is expected, not an error.

## Apps + third-party code (don't remove unless you know the app is uninstalled)

- **Replo** (landing page builder): `snippets/replo-head.liquid`,
  `snippets/reploChunk.*.liquid`, `templates/page.replo.*.liquid`, and
  `{% render 'replo-head' %}` in `layout/theme.liquid`. Replo blocks show up as
  `shopify://apps/...` block types in template JSON (normalized app embeds —
  these are `@app`-style and legitimately not in local schemas; do not treat as
  errors).
- **Kaching Bundles**, **Afterpay on-site messaging**, **LAI Product Reviews**
  (app-embed blocks in product templates).
- **Bucks** currency widget: `snippets/bucks-cc.liquid` rendered in
  `layout/theme.liquid`.
- **Google Tag Manager** (GTM-TJ59W8NM) in `layout/theme.liquid`.
- Various upsell/cart snippets (`cart-primary-upsell.liquid`,
  `cart-secondary-upsell.liquid`, `quantity-breaks.liquid`, `new-upsell.liquid`).
- Product options/sizing: `sizing-chart.liquid.liquid`, `kiwiSizing.liquid`,
  `custom-product-field.liquid`.

## Licensing / anti-piracy hack (DO NOT "fix" this as a bug)

`layout/theme.liquid` contains:

```liquid
{% if settings.icon_size.size == blank or settings.icon_size.size < 196 %}main{visibility:hidden !important;}{% endif %}
```

`settings.icon_size` is actually an **"Authentication token"** text setting
(`config/settings_schema.json`), used as a paid-theme license key. If the token
is blank (or fewer than 196 chars) `main{visibility:hidden}` is rendered and
site content is invisible. With a valid token set in `settings_data.json`, the
rule is skipped. Do not delete or outort this.

## Editing conventions

- Match existing style (1-line JSON templates are common; Liquid uses `-`
  whitespace control, e.g. `{%-` / `-%}`).
- Do not introduce trailing commas anywhere in JSON.
- Keep `t-sections.all.*` translation keys referenced in schemas consistent
  with `locales/en.default.json`.
- Reuse existing sections/snippets instead of duplicating code.

## Valid command/tooling

- **Shopify Theme Check**: `shopify theme check` (recommended; also catches
  broken schemas and missing snippet references).
- **Local preview / deploy**: `shopify theme dev` / `shopify theme push`
  (requires Shopify CLI auth). The local `checkfluid.js` script parses a few
  home sections with `liquidjs`; it needs `npm install liquidjs` first and
  covers only 3 files.
- **Quick JSON sanity**: use `node -e` snippets similar to the one above;
  never rely on `grep`/`cat` for validation.

## Git history

- `9b102e4 Initial commit` (2026-08-01)
- `1063e34 first commit` (2026-08-03)

Remote: `origin https://github.com/immenissus/shopify-paint.git`, branch `main`.

## Common failure symptom → cause

| Symptom | Likely cause |
|---------|--------------|
| Every page → 404 / theme error | A section schema referenced by all templates has invalid JSON (trailing comma) or a referenced section/snippet file is missing. |
| Page content invisible but layout present | `settings.icon_size` (auth token) blank/too short. |
| One template won't load in editor | `Template error`/missing section; check that block `type`s exist in that section's `{% schema %}`. |
| `shopify://apps/...` block warnings | Normal app embeds — ignore. |