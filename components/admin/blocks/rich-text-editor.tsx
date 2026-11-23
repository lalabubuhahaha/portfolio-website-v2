"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { safeLink, textColors, type RichNode } from "@/lib/cms/blocks";
import { Button } from "../ui/button";

export default function RichTextEditor({ doc, onChange, disabled }: { doc: RichNode; onChange: (doc: RichNode) => void; disabled?: boolean }) {
  const localDocuments = useRef(new WeakSet<RichNode>());
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false, codeBlock: false, horizontalRule: false,
        link: { openOnClick: false, linkOnPaste: false, autolink: false, isAllowedUri: (url) => safeLink.safeParse(url).success },
      }),
      TextAlign.configure({ types: ["paragraph"], alignments: ["left", "center", "right"] }),
      TextStyle,
      Color,
    ],
    content: doc,
    editorProps: { attributes: { class: "cms-rich-copy min-h-32 p-3 outline-none", "aria-label": "Rich text content" } },
    onUpdate: ({ editor }) => {
      const document = editor.getJSON() as RichNode;
      localDocuments.current.add(document);
      onChange(document);
    },
  });

  useEffect(() => {
    if (editor && !localDocuments.current.has(doc) && JSON.stringify(editor.getJSON()) !== JSON.stringify(doc))
      editor.commands.setContent(doc, { emitUpdate: false });
  }, [editor, doc]);

  const selectedColor = useEditorState({
    editor,
    selector: ({ editor }) => editor?.getAttributes("textStyle").color as string | undefined,
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  if (!editor) return null;
  const actions = [
    ["Bold", () => editor.chain().focus().toggleBold().run()],
    ["Italic", () => editor.chain().focus().toggleItalic().run()],
    ["Underline", () => editor.chain().focus().toggleUnderline().run()],
    ["Strike", () => editor.chain().focus().toggleStrike().run()],
    ["Code", () => editor.chain().focus().toggleCode().run()],
    ["Bullet list", () => editor.chain().focus().toggleBulletList().run()],
    ["Numbered list", () => editor.chain().focus().toggleOrderedList().run()],
    ["Blockquote", () => editor.chain().focus().toggleBlockquote().run()],
    ["Align left", () => editor.chain().focus().setTextAlign("left").run()],
    ["Center", () => editor.chain().focus().setTextAlign("center").run()],
    ["Align right", () => editor.chain().focus().setTextAlign("right").run()],
    ["Link", () => {
      const href = window.prompt("Enter a link URL", editor.getAttributes("link").href ?? "");
      if (href === null) return;
      if (href === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else if (safeLink.safeParse(href).success) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      else window.alert("Use an HTTP or HTTPS link without credentials.");
    }],
  ] as const;
  return (
    <div className="rounded-md ring-1 ring-cms-border">
      <div role="group" aria-label="Rich text formatting" className="flex flex-wrap gap-1 border-b border-cms-border bg-cms-background p-2">
        {actions.map(([name, run]) => <Button key={name} type="button" variant="ghost" className="h-8 px-2 text-xs" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}>{name}</Button>)}
        <div role="group" aria-label="Text color" className="flex flex-wrap items-center gap-1 border-l border-cms-border pl-2">
          <span className="text-xs font-medium">Text color</span>
          {["", ...textColors].map((color, index) => (
            <Button
              key={color}
              type="button"
              variant="ghost"
              className="size-9 px-0"
              disabled={disabled}
              aria-label={["Default text color", "Ink", "Slate", "Blue", "Rose", "Green"][index]}
              aria-pressed={(selectedColor ?? "") === color}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const chain = editor.chain().focus();
                if (color) chain.setColor(color).run();
                else chain.unsetColor().run();
              }}
            >
              {color
                ? <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: color }} />
                : <span aria-hidden>A</span>}
            </Button>
          ))}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
