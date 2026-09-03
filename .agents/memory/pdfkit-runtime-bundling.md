---
name: PDFKit runtime bundling
description: Runtime constraint for PDFKit and its fontkit dependency in the API server build.
---

PDFKit musí zůstat externí závislostí v esbuild výstupu API serveru. Jeho `fontkit` závislost obsahuje runtime CommonJS načítání, které při zabalení do serverového ESM výstupu může hledat `@swc/helpers` z nesprávného umístění a skončit chybou `MODULE_NOT_FOUND`.

**Why:** Přímé načtení PDFKit z adresáře API workflow funguje, ale zabalený serverový modul selhal při inicializaci fontkitu.

**How to apply:** Při změně serverového buildu zachovat `pdfkit` v seznamu externích balíčků a ověřit načtení z adresáře API workflow, nikoli pouze z kořene monorepa.