# LALA Portfolio CMS Roadmap

| Stage | Scope |
| --- | --- |
| 7.1 | Supabase foundation, database schema, administrator authentication, and admin design system |
| 7.2 | [Works management](cms-stage-7-2.md), drafts, archive, ordering, and homepage Featured settings |
| 7.3 | [Private media library](cms-stage-7-3.md), image and video upload, cover picker, and reference-safe deletion |
| 7.4 | [Visual case study block editor](cms-stage-7-4.md), 16 basic blocks, nested composition, reference-safe drafts and private preview |
| 7.5 | Visual settings, drag ordering, undo/redo, and autosave |
| 7.6 | Advanced layout and interaction blocks |
| 7.7 | Gravity project detail pages and project themes |
| 7.8 | Live preview, draft and publication workflows, and Gravity Home and Work data integration |
| 7.9 | Security, responsive behavior, performance, and end-to-end acceptance |
| 8 | About administration |

Gravity Edition is the first site. Standalone Home and Settings administration is deferred.

Every CMS Stage, including Stage 8, must complete the [CMS security acceptance checklist](cms-security-checklist.md) before release. Record the role checks, tested environment, and outstanding verification in the Stage report.

## Block editor

The basic block catalog is Heading, Rich Text, Image, Image Gallery, Columns, Image + Text, Video / GIF, Quote, Metrics, Figma Prototype, Link / Button, Divider, Spacer, Color Palette, Typography, and Before / After.

The advanced catalog is Parallax Image, Horizontal Scroll Gallery, Sticky Storytelling, Bento Gallery, Scroll Reveal, Full-bleed Color Section, Device Mockup, and Interactive Hotspot. Shared behavior such as scroll reveal can be expressed as an animation setting on other blocks.

## Gravity project details

Use a shared Block Renderer for public project detail pages and admin preview. Extend the existing Gravity editorial layout with Raleway, monospaced labels, large headings, generous whitespace, royal blue, soft colors and gradients, and restrained microinteractions. Reuse the public header and footer.

Allow each project to select a background and theme color. Support full-bleed project heroes, parallax, horizontal scrolling, sticky storytelling, Bento galleries, scroll reveal, and custom image and text layouts. The editorial experience should reflect each project’s visual direction.
