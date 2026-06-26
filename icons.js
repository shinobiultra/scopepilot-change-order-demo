(function () {
  const icons = {
    "arrow-right": ['<path d="M5 12h14"/>', '<path d="M12 5l7 7-7 7"/>'],
    calendar: ['<path d="M8 2v4"/>', '<path d="M16 2v4"/>', '<rect width="18" height="18" x="3" y="4" rx="2"/>', '<path d="M3 10h18"/>'],
    check: ['<path d="M20 6L9 17l-5-5"/>'],
    copy: ['<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>', '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'],
    "credit-card": ['<rect width="20" height="14" x="2" y="5" rx="2"/>', '<path d="M2 10h20"/>'],
    download: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<path d="M7 10l5 5 5-5"/>', '<path d="M12 15V3"/>'],
    "external-link": ['<path d="M15 3h6v6"/>', '<path d="M10 14L21 3"/>', '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'],
    "file-plus-2": ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>', '<path d="M14 2v6h6"/>', '<path d="M12 18v-6"/>', '<path d="M9 15h6"/>'],
    plus: ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
    printer: ['<path d="M6 9V2h12v7"/>', '<path d="M6 18H4c-1.1 0-2-.9-2-2v-5c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2h-2"/>', '<path d="M6 14h12v8H6z"/>'],
    save: ['<path d="M19 21H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h11l5 5v11c0 1.1-.9 2-2 2z"/>', '<path d="M17 21v-8H7v8"/>', '<path d="M7 3v5h8"/>'],
    "trash-2": ['<path d="M3 6h18"/>', '<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', '<path d="M19 6l-1 14c0 1-1 2-2 2H8c-1 0-2-1-2-2L5 6"/>', '<path d="M10 11v6"/>', '<path d="M14 11v6"/>'],
    upload: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<path d="M17 8l-5-5-5 5"/>', '<path d="M12 3v12"/>']
  };

  function createIcon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = icons[name].join("");
    return svg;
  }

  window.lucide = {
    createIcons() {
      document.querySelectorAll("[data-lucide]").forEach((node) => {
        const name = node.getAttribute("data-lucide");
        if (!icons[name]) return;
        node.replaceWith(createIcon(name));
      });
    }
  };
})();
