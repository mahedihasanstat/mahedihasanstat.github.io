(function () {
  const pages = [
    { title: "Home", url: "index.html" },
    { title: "Research", url: "research.html" },
    { title: "Teaching", url: "teaching.html" },
    { title: "Open Resources", url: "resources.html" }
  ];

  const input = document.getElementById("site-search-input");
  const results = document.getElementById("site-search-results");

  if (!input || !results) {
    return;
  }

  let indexPromise;

  function searchUrl(url, query) {
    return `${pagePath(url)}?search=${encodeURIComponent(query)}`;
  }

  function pagePath(url) {
    const currentPath = window.location.pathname;
    return currentPath.substring(0, currentPath.lastIndexOf("/") + 1) + url;
  }

  function cleanText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, nav, footer").forEach((element) => element.remove());
    return doc.body.textContent.replace(/\s+/g, " ").trim();
  }

  function buildIndex() {
    if (!indexPromise) {
      indexPromise = Promise.all(
        pages.map((page) =>
          fetch(page.url)
            .then((response) => response.text())
            .then((html) => ({
              title: page.title,
              url: pagePath(page.url),
              text: cleanText(html)
            }))
            .catch(() => ({
              title: page.title,
              url: pagePath(page.url),
              text: ""
            }))
        )
      );
    }

    return indexPromise;
  }

  function snippet(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return text.slice(0, 150);
    }

    const start = Math.max(0, matchIndex - 55);
    const end = Math.min(text.length, matchIndex + query.length + 95);
    const prefix = start > 0 ? "... " : "";
    const suffix = end < text.length ? " ..." : "";

    return prefix + text.slice(start, end) + suffix;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function removeHighlights() {
    document.querySelectorAll("mark.search-highlight").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
  }

  function highlightInPage(query) {
    removeHighlights();

    const terms = [...new Set(query.toLowerCase().split(/\s+/).filter((term) => term.length >= 2))];

    if (!terms.length) {
      return;
    }

    const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;

        if (
          !parent ||
          parent.closest("script, style, nav, footer, mark.search-highlight") ||
          !pattern.test(node.nodeValue)
        ) {
          pattern.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }

        pattern.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let node = walker.nextNode();

    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }

    nodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      const parts = textNode.nodeValue.split(pattern);

      parts.forEach((part) => {
        if (part && pattern.test(part)) {
          const mark = document.createElement("mark");
          mark.className = "search-highlight";
          mark.textContent = part;
          fragment.appendChild(mark);
        } else if (part) {
          fragment.appendChild(document.createTextNode(part));
        }

        pattern.lastIndex = 0;
      });

      textNode.replaceWith(fragment);
    });
  }

  function render(matches, query) {
    if (!query) {
      results.innerHTML = "";
      results.classList.remove("is-visible");
      return;
    }

    if (!matches.length) {
      results.innerHTML = "<div>No matches found.</div>";
      results.classList.add("is-visible");
      return;
    }

    results.innerHTML = matches
      .slice(0, 6)
      .map(
        (match) =>
          `<a href="${searchUrl(match.url.split("/").pop(), query)}"><strong>${escapeHtml(match.title)}</strong><span>${escapeHtml(snippet(match.text, query))}</span></a>`
      )
      .join("");
    results.classList.add("is-visible");
  }

  input.addEventListener("input", () => {
    const query = input.value.trim();

    if (query.length < 2) {
      render([], "");
      removeHighlights();
      return;
    }

    highlightInPage(query);

    buildIndex().then((siteIndex) => {
      const words = query.toLowerCase().split(/\s+/);
      const matches = siteIndex
        .map((page) => {
          const lowerText = page.text.toLowerCase();
          const score = words.reduce((total, word) => total + (lowerText.includes(word) ? 1 : 0), 0);
          return { ...page, score };
        })
        .filter((page) => page.score > 0)
        .sort((a, b) => b.score - a.score);

      render(matches, query);
    });
  });

  input.addEventListener("keydown", (event) => {
    const firstResult = results.querySelector("a");

    if (event.key === "Enter" && firstResult) {
      event.preventDefault();
      window.location.href = firstResult.href;
    }

    if (event.key === "Escape") {
      input.value = "";
      render([], "");
      removeHighlights();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-search")) {
      results.classList.remove("is-visible");
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2 && results.innerHTML) {
      results.classList.add("is-visible");
    }
  });

  const initialQuery = new URLSearchParams(window.location.search).get("search");

  if (initialQuery) {
    input.value = initialQuery;
    highlightInPage(initialQuery);
    buildIndex().then((siteIndex) => {
      const words = initialQuery.toLowerCase().split(/\s+/);
      const matches = siteIndex
        .map((page) => {
          const lowerText = page.text.toLowerCase();
          const score = words.reduce((total, word) => total + (lowerText.includes(word) ? 1 : 0), 0);
          return { ...page, score };
        })
        .filter((page) => page.score > 0)
        .sort((a, b) => b.score - a.score);

      render(matches, initialQuery);
    });
  }
})();
