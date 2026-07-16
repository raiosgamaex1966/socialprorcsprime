import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Link, Undo, Redo, Code, Quote,
} from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ToolbarButton = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt("Digite a URL:");
    if (url) exec("createLink", url);
  };

  const iconSize = "w-4 h-4";

  return (
    <div className={`border border-input rounded-lg overflow-hidden bg-background ${className || ""}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-input bg-muted/30">
        <ToolbarButton onClick={() => exec("undo")} title="Desfazer"><Undo className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("redo")} title="Refazer"><Redo className={iconSize} /></ToolbarButton>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <ToolbarButton onClick={() => exec("formatBlock", "h1")} title="Título 1"><Heading1 className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "h2")} title="Título 2"><Heading2 className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "h3")} title="Título 3"><Heading3 className={iconSize} /></ToolbarButton>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <ToolbarButton onClick={() => exec("bold")} title="Negrito"><Bold className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Itálico"><Italic className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Sublinhado"><Underline className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("strikeThrough")} title="Tachado"><Code className={iconSize} /></ToolbarButton>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Lista com Marcadores"><List className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Lista Numerada"><ListOrdered className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "blockquote")} title="Citação"><Quote className={iconSize} /></ToolbarButton>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <ToolbarButton onClick={() => exec("justifyLeft")} title="Alinhar à Esquerda"><AlignLeft className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyCenter")} title="Centralizar"><AlignCenter className={iconSize} /></ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyRight")} title="Alinhar à Direita"><AlignRight className={iconSize} /></ToolbarButton>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <ToolbarButton onClick={insertLink} title="Inserir Link"><Link className={iconSize} /></ToolbarButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        data-placeholder={placeholder || "Comece a escrever..."}
        className="min-h-[300px] max-h-[500px] overflow-y-auto p-4 text-sm text-foreground focus:outline-none prose prose-sm max-w-none dark:prose-invert [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
      />
    </div>
  );
};

export default RichTextEditor;
