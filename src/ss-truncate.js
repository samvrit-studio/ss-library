/*!
 * ss-truncate v1.0.0
 * Part of ss-library by Samvrit Studio — https://github.com/samvrit-studio/ss-library
 * License: MIT
 *
 * Truncates text to a set number of lines and adds "…" at the end.
 *
 * USAGE (Webflow → select a text element → Settings → Custom attributes):
 *   ss-truncate="3"                    → 3 lines on every screen size
 *   ss-truncate-tablet="2"             → 2 lines at 991px and below
 *   ss-truncate-mobile-landscape="2"   → 2 lines at 767px and below
 *   ss-truncate-mobile="1"             → 1 line at 479px and below
 *   Use "none" (or "0") at any breakpoint to show the full text there.
 *
 * HOW IT WORKS:
 *   The script injects one small <style> tag with CSS rules that match the
 *   attribute values directly (e.g. [ss-truncate="3"]). Because it's pure
 *   CSS after that, elements added later — CMS "load more", Finsweet lists,
 *   tabs, modals — are truncated automatically with no extra JavaScript.
 */
(function () {
  "use strict";

  // Stop here if the script was already added to the page (e.g. pasted twice),
  // so the styles aren't injected two times.
  if (window.ssTruncateLoaded) return;
  window.ssTruncateLoaded = true;

  // Highest line count we generate CSS for. 20 covers real-world needs
  // while keeping the injected CSS tiny.
  var MAX_LINES = 20;

  // Webflow's default breakpoints, in the order they must appear in the CSS.
  // Later rules win, so smaller screens override larger ones.
  var BREAKPOINTS = [
    { attr: "ss-truncate", media: null }, // all screen sizes
    { attr: "ss-truncate-tablet", media: "(max-width: 991px)" },
    { attr: "ss-truncate-mobile-landscape", media: "(max-width: 767px)" },
    { attr: "ss-truncate-mobile", media: "(max-width: 479px)" },
  ];

  /**
   * Builds the CSS rules for one attribute.
   * Example output for "ss-truncate":
   *   [ss-truncate="1"]{-webkit-line-clamp:1;line-clamp:1}
   *   [ss-truncate="2"]{-webkit-line-clamp:2;line-clamp:2} ...
   */
  function rulesFor(attr) {
    var css = "";

    // One rule per supported line count.
    for (var i = 1; i <= MAX_LINES; i++) {
      css += "[" + attr + '="' + i + '"]{-webkit-line-clamp:' + i + ";line-clamp:" + i + "}";
    }

    // "none" and "0" switch truncation off, showing the full text.
    css +=
      "[" + attr + '="none"],[' + attr + '="0"]{-webkit-line-clamp:none;line-clamp:none}';

    return css;
  }

  // Base styles every truncated element needs. -webkit-box + line-clamp is
  // the standard, widely supported way to clamp text to N lines with "…".
  var selectorAll = BREAKPOINTS.map(function (bp) {
    return "[" + bp.attr + "]";
  }).join(",");

  var css =
    selectorAll +
    "{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}";

  // Add the line-count rules for each breakpoint, wrapping the smaller
  // breakpoints in their media queries.
  BREAKPOINTS.forEach(function (bp) {
    var rules = rulesFor(bp.attr);
    css += bp.media ? "@media " + bp.media + "{" + rules + "}" : rules;
  });

  // Inject the styles into the page <head> once.
  var style = document.createElement("style");
  style.setAttribute("data-ss-library", "truncate");
  style.textContent = css;
  document.head.appendChild(style);

  /**
   * Warns in the browser console about values the CSS can't handle
   * (e.g. ss-truncate="three" or "50"), so typos are easy to spot.
   */
  function checkValues() {
    BREAKPOINTS.forEach(function (bp) {
      document.querySelectorAll("[" + bp.attr + "]").forEach(function (el) {
        var value = el.getAttribute(bp.attr).trim();
        var n = Number(value);
        var valid =
          value === "none" || (Number.isInteger(n) && n >= 0 && n <= MAX_LINES);

        if (!valid) {
          console.warn(
            "[ss-truncate] Invalid value \"" + value + "\" on " + bp.attr +
              ". Use a whole number from 1 to " + MAX_LINES + ', or "none".',
            el
          );
        }
      });
    });
  }

  // Check values once the page HTML has finished loading.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkValues);
  } else {
    checkValues();
  }
})();
