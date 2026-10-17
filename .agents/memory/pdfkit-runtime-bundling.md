---
name: PDFKit runtime bundling
description: Runtime constraint for PDFKit and its fontkit dependency in the API server build.
---

PDFKit musí zůstat externí závislostí v esbuild výstupu API serveru. Jeho `fontkit` závislost obsahuje runtime CommonJS načítání, které při zabalení do serverového ESM výstupu může hledat `@swc/helpers` z nesprávného umístění a skončit chybou `MODULE_NOT_FOUND`.

**Why:** Přímé načtení PDFKit z adresáře API workflow funguje, ale zabalený serverový modul selhal při inicializaci fontkitu.

**How to apply:** Při změně serverového buildu zachovat `pdfkit` v seznamu externích balíčků a ověřit načtení z adresáře API workflow, nikoli pouze z kořene monorepa.

PDF email generation must not rely only on host-installed font files. Netlify functions can lack system fonts, and PDFKit's built-in Helvetica AFM lookup can fail when the function bundler does not package `data/*.afm`. Ship the Unicode TTF files with the function and declare them under Netlify `included_files`; pass the regular font to the PDFDocument constructor to avoid eager Helvetica initialization.

**Why:** The Netlify runtime did not have a portable guarantee of the DejaVu system-font paths, while PDFKit eagerly loads Helvetica in its constructor unless an explicit font is provided.

**How to apply:** Keep the font assets in the Netlify function bundle, resolve them from packaged paths with system paths only as fallbacks, and always supply the regular font in PDFDocument options.