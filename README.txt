SKID VISUAL SCIENCE | V6 real work in the mosaic
=====================================================

Open index.html in a browser. Internet is optional: D3 is loaded from a CDN,
but the pixel grid still works if the CDN is blocked.

WHAT'S NEW
- Your original V5 iris-to-wave animation is unchanged: each tile has ONE iris RGB
  value and uses it in both its starting and final positions.
- 15 of your real pieces are installed as discovery spots across the mosaic.
- Hover on a marked square: a compact, cropped image on a white background.
- Click the expanded preview: a large viewer shows the ENTIRE image without cropping.
- Zoom using +, -, your mouse wheel, or the controls. Drag to pan when zoomed.
- PDF originals are included: a high-resolution page render appears in the viewer,
  and OPEN ORIGINAL PDF gives access to the real PDF file.
- MP4s play in the full viewer with standard video controls.
- Arrow keys or the viewer buttons browse all 15 visuals. Escape closes the viewer.
- On touchscreens: first tap opens preview, second tap opens viewer.
- A tiny animated-graph motif in one pixel hints at the interactive area.
- Three featured cards below the hero are UNCHANGED demonstration placeholders.

TO CHANGE YOUR VISUALS
1. Put your SVG, PNG, JPG, MP4 or exported PDF images into visuals/.
2. Edit visuals.js. Each item lists id, title, category, preview, full and original.
3. The small, deliberately cropped hover images live in visuals/previews/.
   Their filenames match each work's id. They are 652 x 376 WebP images.
   To choose a better focal detail, replace that preview WebP, NOT the full asset.
4. For a new project, add another record to visuals.js. The pixel-selection
   system will automatically create an interactive tile for it.

Media terms
- `preview` is the fast cropped hover image.
- `full` is the full-size image (or MP4) displayed in the overlay.
- `original` is the original file opened by the viewer's final action.
- `type` is `image`, `video` or `pdf`. PDF viewer uses a pre-rendered full PNG.

NOTE ABOUT LARGE VISUALS
Original files are preserved for fidelity. Images use contain in the full viewer,
so no text or edges are cropped. You can zoom beyond 100% for details. Videos and
PDFs are in the ZIP, and the derived PDF preview images are included too.

VISUAL OWNERSHIP
All included portfolio pieces are the examples supplied by the website owner.
The scientific demonstrations in the 3 lower featured cards remain placeholders.
