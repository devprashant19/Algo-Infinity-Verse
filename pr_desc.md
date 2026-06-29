# Pull Request Descriptions

---

**Branch:** `fix/mangled-markdown-links`

 (replace with issue number for Bug 1)

---

**Branch:** `fix/missing-ai-features`

### Description
This PR fixes console 404 errors encountered on several AI Feature pages (Algorithm Evolution, Algorithm Racing, WebGPU Neural Network) which attempted to load non-existent scripts and stylesheets. 

### Changes Made
- Created placeholder `.js` and `.css` files for `evolution-simulator`, `algo-racing`, and `webgpu-nn`.
- Avoided structural changes to the HTML layout while allowing the pages to load without errors.

### Issue Addressed
Fixes # (replace with issue numbers for Bugs 2, 3, 4)

---

**Branch:** `fix/global-script-paths`

### Description
This PR resolves 404 errors caused by nested HTML pages attempting to load global scripts and stylesheets using invalid relative paths (such as `src="script.js"` instead of `src="/script.js"`).

### Changes Made
- Updated local asset references in `interview-panic-mode.html`, `huffman-engine.html`, `sjf-visualizer.html`, `dsa-glossary.html`, `build-google-from-scratch.html`, and `sdlc_advisor.html`.
- Standardized the paths by prepending a forward slash (`/`) or correcting the relative traversal, allowing the global scripts to execute successfully.

### Issue Addressed
Fixes # (replace with issue number for Bug 5)
