/**
 * ss-toc — Table of contents built from page headings
 * Part of ss-library by Samvrit Studio · MIT License
 * https://github.com/samvrit-studio/ss-library
 *
 * CDN:
 *   <script defer src="https://cdn.jsdelivr.net/gh/samvrit-studio/ss-library@1/src/ss-toc.min.js"></script>
 *
 * ATTRIBUTES
 *   ss-toc="content"        → element holding the headings (usually a Rich Text, any element works)
 *   ss-toc="list"           → the wrapper the TOC links are added to
 *   ss-toc="link"           → template link (cloned once per heading, then removed)
 *   ss-toc="link-h3"        → optional template used for H3s (e.g. indented style)
 *   ss-toc="wrapper"        → optional; this element is hidden when there are no headings
 *                             (if not set, the list itself is hidden)
 *
 * SETTINGS (put on the content or the list element)
 *   ss-toc-offset="80"      → px gap above headings when scrolling (sticky navbar height). Default 0
 *   ss-toc-headings="h2,h3" → which headings to include. Default "h2"
 *   ss-toc-trigger="30"     → how far down the screen (in %, below the offset) a heading must
 *                             reach to become active. Default 30
 *   ss-toc-hash="false"     → don't add #heading-id to the URL on click. Default true
 *
 * EXCLUDING HEADINGS
 *   [ss-toc-omit]           → type this at the start of a heading's text (works inside Rich Text);
 *                             the marker is removed from the page and the heading is skipped
 *   ss-toc-omit             → attribute on a heading, or on any element inside the content
 *                             to skip every heading within it
 *
 * MULTIPLE TOCs ON ONE PAGE
 *   ss-toc-instance="blog"  → put the same value on a content, its list and (optionally) its wrapper.
 *                             Lists without an instance pair with the content without one.
 *
 * OUTPUT
 *   - Headings without an id get one from their text (existing ids are kept)
 *   - Each generated link gets ss-toc-level="h2" / "h3" for styling
 *   - The link for the section currently in view gets the class "is-active"
 */
(() => {
  'use strict';

  // Class added to the link of the section currently being read
  const ACTIVE_CLASS = 'is-active';

  // How long scrolling must be idle (ms) before a click-scroll counts as finished
  const SCROLL_IDLE_MS = 150;

  // Text marker an editor can type at the start of a Rich Text heading to leave it out
  const OMIT_MARKER = '[ss-toc-omit]';

  // Respect users who've asked their OS for less motion (same for every instance)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Turn heading text into a URL-safe id.
   * Uses Unicode classes so non-Latin text (e.g. Hebrew, Hindi) still produces a readable id.
   */
  const slugify = (text) =>
    text
      .toLowerCase()
      .normalize('NFKD') // split letters from their accents ("é" → "e" + accent)
      .replace(/\p{M}/gu, '') // drop the accent / vowel marks
      .replace(/[^\p{L}\p{N}]+/gu, '-') // anything that's not a letter or number becomes "-"
      .replace(/^-+|-+$/g, ''); // trim leading / trailing dashes

  /**
   * Make sure an id isn't already used on the page.
   * Two headings both called "Overview" become "overview" and "overview-2".
   */
  const uniqueId = (base) => {
    const root = base || 'section'; // fallback if the heading had no usable characters
    let id = root;
    let n = 2;
    while (document.getElementById(id)) id = `${root}-${n++}`;
    return id;
  };

  /**
   * Remove the [ss-toc-omit] marker from a heading's visible text.
   * Edits the text node directly so any bold/italic/link markup in the heading survives.
   * Returns true if the marker was found.
   */
  const stripOmitMarker = (heading) => {
    if (!heading.textContent.includes(OMIT_MARKER)) return false;

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.includes(OMIT_MARKER)) {
        // Drop the marker plus any space right after it
        node.nodeValue = node.nodeValue.replace(OMIT_MARKER, '').replace(/^\s+/, '');
        return true;
      }
    }
    return false;
  };

  /**
   * Find the content element that belongs to a list.
   * Same ss-toc-instance value → paired. No instance → the content without one.
   */
  const findPartner = (role, instance) =>
    // Compare values directly instead of building a selector, so any instance name
    // (spaces, quotes, etc.) works without escaping. getAttribute returns null when absent.
    Array.from(document.querySelectorAll(`[ss-toc="${role}"]`)).find(
      (el) => el.getAttribute('ss-toc-instance') === instance
    ) || null;

  /**
   * Build and run one TOC (one list + its content).
   */
  const setup = (list) => {
    // Guard against the script being included twice
    if (list.hasAttribute('ss-toc-ready')) return;
    list.setAttribute('ss-toc-ready', '');

    const instance = list.getAttribute('ss-toc-instance');
    const content = findPartner('content', instance);
    // Name the instance in warnings so it's clear which TOC has the problem
    const label = instance ? `[ss-toc:${instance}]` : '[ss-toc]';

    if (!content) {
      console.warn(`${label} No matching ss-toc="content" element found for this list.`);
      return;
    }

    const linkTpl = list.querySelector('[ss-toc="link"]');
    const linkH3Tpl = list.querySelector('[ss-toc="link-h3"]');

    if (!linkTpl) {
      console.warn(`${label} No ss-toc="link" template found inside ss-toc="list".`);
      return;
    }

    // Read a setting from the content element first, then the list, else use the default
    const read = (name, fallback) =>
      content.getAttribute(name) ?? list.getAttribute(name) ?? fallback;

    // Offset in px (e.g. sticky navbar height); invalid values fall back to 0
    const offset = parseInt(read('ss-toc-offset', '0'), 10) || 0;

    // Trigger position as a 0–1 ratio; kept between 0% and 100%, invalid values fall back to 30%
    const triggerPct = parseFloat(read('ss-toc-trigger', '30'));
    const triggerRatio = Number.isFinite(triggerPct)
      ? Math.min(Math.max(triggerPct, 0), 100) / 100
      : 0.3;

    // Only "false" turns URL updates off; anything else keeps the default (on)
    const updateHash = read('ss-toc-hash', 'true').trim().toLowerCase() !== 'false';

    // Only allow real heading tags (h1–h6) so a typo can't break the selector
    const selector =
      read('ss-toc-headings', 'h2')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => /^h[1-6]$/.test(tag))
        .join(',') || 'h2';

    // Remember where each template sits, then take the templates out of the page
    const linkParent = linkTpl.parentElement;
    const h3Parent = linkH3Tpl ? linkH3Tpl.parentElement : null;
    linkTpl.remove();
    if (linkH3Tpl) linkH3Tpl.remove();

    // Strip the omit marker from EVERY heading in the content (not just the selected levels),
    // so it never shows on the live page. Remember which headings had it.
    const markedOmit = new Set(
      Array.from(content.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(stripOmitMarker)
    );

    // A heading is skipped if it had the text marker, or it (or a parent inside the content)
    // has the ss-toc-omit attribute
    const isOmitted = (heading) => {
      if (markedOmit.has(heading)) return true;
      const omitEl = heading.closest('[ss-toc-omit]');
      return !!omitEl && content.contains(omitEl);
    };

    // Collect headings, skipping omitted and empty ones
    // (Webflow Rich Text sometimes leaves blank headings behind)
    const headings = Array.from(content.querySelectorAll(selector)).filter(
      (h) => h.textContent.trim() && !isOmitted(h)
    );

    // No headings → hide the whole TOC block (or just the list) and stop.
    // The wrapper is either an ancestor of the list, or found by instance.
    if (!headings.length) {
      const wrapper =
        list.closest('[ss-toc="wrapper"]') || findPartner('wrapper', instance) || list;
      wrapper.style.display = 'none';
      return;
    }

    // Build one TOC link per heading
    const items = headings.map((heading) => {
      const level = heading.tagName.toLowerCase();
      const text = heading.textContent.trim();

      // Keep ids the client already set; generate one otherwise
      if (!heading.id) heading.id = uniqueId(slugify(text));

      // Makes native jumps (e.g. a shared #link opened in a new tab) respect the offset too
      heading.style.scrollMarginTop = `${offset}px`;

      // H3s use the H3 template when one exists, otherwise the normal template
      const useH3Tpl = level === 'h3' && linkH3Tpl;
      const item = (useH3Tpl ? linkH3Tpl : linkTpl).cloneNode(true);
      const parent = useH3Tpl ? h3Parent : linkParent;

      // Mark the clone so it's no longer treated as a template, and expose its level for CSS
      item.setAttribute('ss-toc', 'item');
      item.setAttribute('ss-toc-level', level);

      // The template can be the link itself, or a wrapper (e.g. a list item) holding a link
      const anchor = item.matches('a') ? item : item.querySelector('a') || item;
      anchor.setAttribute('href', `#${heading.id}`);
      anchor.textContent = text;

      parent.appendChild(item);
      return { heading, item, anchor };
    });

    // Scroll so the heading sits `offset` px below the top of the viewport
    const scrollToHeading = (heading, smooth) => {
      const top = heading.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    };

    // ---- Active state ----

    let current = null; // the item that's currently active
    let ticking = false; // throttles scroll work to one run per animation frame
    let clickLock = false; // true while a TOC click is scrolling the page
    let unlockTimer = null;

    // Move the is-active class to one item (or clear it when entry is null)
    const setActive = (entry) => {
      if (entry === current) return; // nothing changed, skip DOM work

      if (current) {
        current.item.classList.remove(ACTIVE_CLASS);
        current.anchor.classList.remove(ACTIVE_CLASS);
      }
      if (entry) {
        // Class goes on both, so it works whether the template is a link or a wrapper
        entry.item.classList.add(ACTIVE_CLASS);
        entry.anchor.classList.add(ACTIVE_CLASS);
      }
      current = entry;
    };

    // (Re)start the countdown that ends the click lock.
    // Every scroll event during a click-scroll restarts it, so the lock lifts
    // only once the page has stopped moving for SCROLL_IDLE_MS.
    const armUnlock = () => {
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => {
        clickLock = false;
      }, SCROLL_IDLE_MS);
    };

    items.forEach((entry) => {
      entry.anchor.addEventListener('click', (event) => {
        event.preventDefault();
        // Stop Webflow's built-in anchor smooth scroll from also firing (it ignores our offset)
        event.stopPropagation();

        // Highlight the clicked link right away, and stop scroll tracking from
        // lighting up every link the page passes on the way there
        setActive(entry);
        clickLock = true;
        armUnlock();

        scrollToHeading(entry.heading, true);

        // Update the URL so the section can be shared, without adding a history entry per click.
        // Skipped when ss-toc-hash="false".
        if (updateHash) history.replaceState(null, '', `#${entry.heading.id}`);
      });
    });

    // Work out which section the reader is in, based on scroll position
    const updateActive = () => {
      ticking = false;

      // Trigger line: offset + a share of the visible area below it (default 30%).
      // A heading counts as "reached" once its top crosses this line.
      const line = offset + (window.innerHeight - offset) * triggerRatio;
      let active = null;

      // The active section is the last heading that has crossed the line
      for (const entry of items) {
        if (entry.heading.getBoundingClientRect().top <= line) active = entry;
        else break;
      }

      // At the very bottom the last heading may never reach the line, so activate it there
      const atBottom =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) active = items[items.length - 1];

      setActive(active);
    };

    const onScroll = () => {
      // During a click-scroll keep the clicked link active; just extend the lock
      if (clickLock) {
        armUnlock();
        return;
      }
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActive);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();

    // ---- Opening a page with a #hash ----
    // The ids didn't exist when the browser tried to jump, so jump now.
    // Wait for full load so images above the heading don't shift it afterwards.
    const target = items.find(
      ({ heading }) => `#${heading.id}` === decodeURIComponent(window.location.hash)
    );
    if (target) {
      const jump = () => scrollToHeading(target.heading, false);
      if (document.readyState === 'complete') jump();
      else window.addEventListener('load', jump, { once: true });
    }
  };

  // Set up every TOC list on the page (one per instance)
  const init = () => {
    document.querySelectorAll('[ss-toc="list"]').forEach(setup);
  };

  // Run once the DOM is ready (works with or without `defer`)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
