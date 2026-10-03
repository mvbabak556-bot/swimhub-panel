# Estakhrjo Offline CV Translation

This directory contains the Persian-to-English Mozilla Firefox Translations model used only in the browser to translate member-entered CV text locally.

- Engine: Bergamot Translator WebAssembly, sourced from Mozilla's `translate` project.
- Model: Mozilla Firefox Translations Persian-to-English `fa-en`, release model registry dated 2026-09-28.
- License: Mozilla Public License 2.0; see `../licenses/MPL-2.0.txt`.
- Source model registry: `https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/db/models.json`.

No text is sent to a translation API or server by the code in this application. The model is shipped with the site and is run in a dedicated Web Worker in the visitor's browser.
