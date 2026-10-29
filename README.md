# ss-library

Attribute-based solutions for Webflow by [Samvrit Studio](https://samvritstudio.com).

Add a script tag, add a few attributes in the Designer, and the feature works. No custom code to write or maintain.

- **One script per feature.** Load only what a page uses, nothing else.
- **Attributes, not code.** Everything is set with `ss-` attributes in Webflow's element settings.
- **Built from real client work.** A script only goes in the library if it needs JavaScript and saves real time on projects.
- **Plain, commented JavaScript.** Open the source and read exactly what it does.

### Scripts

| Script            | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| [ss-toc](#ss-toc) | Table of contents from page headings, with active link highlighting and smooth scroll |

### How to load a script

Every script uses the same URL pattern. Paste it before `</body>` in the page or template's custom code:

```html
<!-- Replace NAME with the script name, e.g. ss-toc -->
<script
  defer
  src="https://cdn.jsdelivr.net/gh/samvrit-studio/ss-library@1/src/NAME.min.js"
></script>
```

`@1` always serves the latest `1.x` version, so sites get fixes automatically. To lock a site to an exact version, use the full version instead, e.g. `@1.0.1`.

### Watch

Each script gets a short walkthrough on YouTube: [@samvritstudio](https://www.youtube.com/@samvritstudio).

### License

MIT. Free to use on personal and client projects.

---

## ss-toc

Builds a table of contents from the headings on a page. It works on CMS templates, so every blog post gets its own TOC automatically, and on static pages too.

- One flat link template: no nested wrappers to build
- Never restructures your layout; it only adds ids to headings
- Highlights the link for the section being read, with an adjustable trigger point
- Smooth-scrolls to headings, with an offset for sticky navbars
- Hides the TOC when there are no headings
- Exclude headings, run several TOCs on one page, and optionally keep the URL clean

### Install

Paste before `</body>` in the page or template's custom code:

```html
<!-- ss-toc: table of contents from page headings -->
<script
  defer
  src="https://cdn.jsdelivr.net/gh/samvrit-studio/ss-library@1/src/ss-toc.min.js"
></script>
```

### Setup

| Element                                               | Attribute          | Required |
| ----------------------------------------------------- | ------------------ | -------- |
| Element containing the headings (usually a Rich Text) | `ss-toc="content"` | Yes      |
| Div that holds the links                              | `ss-toc="list"`    | Yes      |
| One styled Link Block inside the list                 | `ss-toc="link"`    | Yes      |
| A second Link Block for H3s, e.g. indented            | `ss-toc="link-h3"` | No       |
| Outer TOC block (title + list)                        | `ss-toc="wrapper"` | No       |

The `link` and `link-h3` elements are templates. Style them however you like; the script copies them once per heading and then removes the originals. The template can be the link itself or a wrapper that contains a link.

`content` can be a Rich Text, a plain div of headings on a static page, or a wrapper around several Rich Texts. All headings inside it are collected in page order.

```html
<!-- Optional wrapper: hidden together with its title when there are no headings -->
<div ss-toc="wrapper">
  <div>On this page</div>

  <!-- Settings can go on the list or on the content element -->
  <div ss-toc="list" ss-toc-offset="80" ss-toc-headings="h2,h3">
    <!-- Template for H2 links -->
    <a href="#" class="toc_link" ss-toc="link">Link</a>
    <!-- Optional template for H3 links -->
    <a href="#" class="toc_link is-sub" ss-toc="link-h3">Sub link</a>
  </div>
</div>

<!-- The CMS Rich Text field -->
<div class="w-richtext" ss-toc="content">…</div>
```

### Settings

Add these to the `list` or `content` element.

| Attribute                 | Default | What it does                                                                                                                       |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ss-toc-offset="80"`      | `0`     | Space in px left above a heading after scrolling. Set it to your sticky navbar's height.                                           |
| `ss-toc-headings="h2,h3"` | `h2`    | Which headings to include. Any levels, any starting level.                                                                         |
| `ss-toc-trigger="30"`     | `30`    | How far down the screen (in %) a heading must reach before its link becomes active. Lower switches later, higher switches earlier. |
| `ss-toc-hash="false"`     | `true`  | Stops clicks from adding `#heading-id` to the address bar.                                                                         |

### Excluding headings

There are two ways, depending on where the heading lives:

- **Inside Rich Text:** type `[ss-toc-omit]` at the start of the heading text in the CMS, for example `[ss-toc-omit] Related posts`. The script removes the marker from the page and leaves that heading out of the TOC.
- **On static pages:** add the `ss-toc-omit` attribute to the heading, or to any element inside the content to skip every heading within it.

```html
<!-- Everything in this block stays out of the TOC -->
<div ss-toc-omit>
  <h2>Subscribe to our newsletter</h2>
</div>
```

### Multiple TOCs on one page

Give each TOC's `content`, `list` and (optional) `wrapper` the same `ss-toc-instance` value:

```html
<!-- First TOC -->
<div ss-toc="list" ss-toc-instance="guide">
  <a href="#" ss-toc="link">Link</a>
</div>
<div ss-toc="content" ss-toc-instance="guide">…</div>

<!-- Second TOC, with its own settings -->
<div ss-toc="list" ss-toc-instance="faq" ss-toc-hash="false">
  <a href="#" ss-toc="link">Link</a>
</div>
<div ss-toc="content" ss-toc-instance="faq">…</div>
```

A list without an instance pairs with the content that has none, so single-TOC pages need no instance at all. Each instance has its own settings and is hidden on its own when it has no headings.

### Styling

- **Active link:** the script adds `is-active` to the current link. In Webflow, add `is-active` as a combo class on your link and style it.
- **Heading level:** each generated link has `ss-toc-level="h2"`, `"h3"` and so on, which you can target in custom CSS if you don't use a separate H3 template:

```css
/* Indent H3 links when only one template is used */
[ss-toc-level="h3"] {
  padding-left: 1rem;
}
```

### Notes

- **Clicking a link** highlights that link right away and keeps it active until the scroll finishes, so links in between don't flash.
- **Ids:** existing heading ids are kept. Duplicate headings get unique ids (`overview`, `overview-2`), and accented or non-English text still produces clean ids.
- **Shared links** like `/blog/post#pricing` open at the right heading, with the offset applied.
- **Empty headings** that the Rich Text editor sometimes leaves behind are skipped.
- **Reduced motion:** visitors with "reduce motion" turned on get an instant jump instead of a smooth scroll.
- **Hidden headings** (inactive tabs, closed accordions) can't be measured while hidden. Wrap only the visible content, or omit them.
- **Sticky sidebar not sticking?** A parent element probably has `overflow: hidden`. That's a CSS issue, not the script.
- **Navbar height differs by breakpoint?** Use the larger value for `ss-toc-offset`.
