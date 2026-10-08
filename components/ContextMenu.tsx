import React, { useState, useEffect, useRef } from 'react';
import { Copy, Scissors, ClipboardPaste, CheckSquare, ArrowLeft, ArrowRight, RotateCw, Search } from 'lucide-react';

interface MenuData {
  x: number;
  y: number;
  isInput: boolean;
  hasSelection: boolean;
  selectedText: string;
  targetElement: HTMLElement | null;
}

export const ContextMenu: React.FC = () => {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Prevent browser default context menu (anti-inspect / view source)
      e.preventDefault();

      const target = e.target as HTMLElement;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;

      let selectedText = window.getSelection()?.toString() || '';
      if (!selectedText && isInput && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        if (start !== end) {
          selectedText = target.value.substring(start, end);
        }
      }

      const hasSelection = selectedText.trim().length > 0;

      // Position calculations so menu stays within viewport
      const menuWidth = 220;
      const menuHeight = hasSelection ? 270 : 220;
      const x = Math.min(window.innerWidth - menuWidth - 10, Math.max(10, e.clientX));
      const y = Math.min(window.innerHeight - menuHeight - 10, Math.max(10, e.clientY));

      setMenu({
        x,
        y,
        isInput,
        hasSelection,
        selectedText: selectedText.trim(),
        targetElement: target,
      });
    };

    const handleDismiss = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null);
      }
    };

    const handleScroll = () => {
      setMenu(null);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousedown', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!menu) return null;

  const closeMenu = () => setMenu(null);

  const handleCopy = () => {
    if (menu.selectedText) {
      navigator.clipboard.writeText(menu.selectedText);
    }
    closeMenu();
  };

  const handleCut = () => {
    if (menu.isInput && menu.targetElement && ('value' in menu.targetElement)) {
      const el = menu.targetElement as HTMLInputElement | HTMLTextAreaElement;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const val = el.value;
      const cutText = val.substring(start, end);
      if (cutText) {
        navigator.clipboard.writeText(cutText);
        el.value = val.substring(0, start) + val.substring(end);
        el.selectionStart = el.selectionEnd = start;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    closeMenu();
  };

  const handlePaste = async () => {
    if (menu.isInput && menu.targetElement && ('value' in menu.targetElement)) {
      const el = menu.targetElement as HTMLInputElement | HTMLTextAreaElement;
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const val = el.value;
          el.value = val.substring(0, start) + text + val.substring(end);
          el.selectionStart = el.selectionEnd = start + text.length;
          el.focus();
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch {
        // Fallback if browser permission is blocked
      }
    }
    closeMenu();
  };

  const handleSelectAll = () => {
    if (menu.isInput && menu.targetElement && typeof (menu.targetElement as any).select === 'function') {
      (menu.targetElement as any).select();
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.body);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    closeMenu();
  };

  const handleSearch = () => {
    if (menu.selectedText) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(menu.selectedText)}`, '_blank', 'noopener,noreferrer');
    }
    closeMenu();
  };

  const handleBack = () => {
    window.history.back();
    closeMenu();
  };

  const handleForward = () => {
    window.history.forward();
    closeMenu();
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[999999] bg-vintage-paper border border-vintage-ink shadow-2xl p-1.5 min-w-[210px] text-[9px] uppercase tracking-[0.18em] font-bold text-vintage-ink select-none rounded-[2px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search if selection */}
      {menu.hasSelection && (
        <>
          <button
            type="button"
            onClick={handleSearch}
            className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
          >
            <span className="flex items-center gap-2 truncate max-w-[130px]">
              <Search size={11} className="shrink-0 stroke-[1.5]" />
              <span className="truncate">Search "{menu.selectedText}"</span>
            </span>
            <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Web</span>
          </button>
          <div className="border-b border-vintage-ink/20 my-1" />
        </>
      )}

      {/* Cut (only in input with selection) */}
      {menu.isInput && (
        <button
          type="button"
          disabled={!menu.hasSelection}
          onClick={handleCut}
          className={`w-full px-2.5 py-1.5 rounded-[2px] flex items-center justify-between transition-colors text-left group ${
            menu.hasSelection
              ? 'hover:bg-vintage-ink hover:text-vintage-paper cursor-pointer'
              : 'opacity-35 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-2">
            <Scissors size={11} className="stroke-[1.5]" />
            <span>Cut</span>
          </span>
          <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Ctrl+X</span>
        </button>
      )}

      {/* Copy */}
      <button
        type="button"
        disabled={!menu.hasSelection}
        onClick={handleCopy}
        className={`w-full px-2.5 py-1.5 rounded-[2px] flex items-center justify-between transition-colors text-left group ${
          menu.hasSelection
            ? 'hover:bg-vintage-ink hover:text-vintage-paper cursor-pointer'
            : 'opacity-35 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2">
          <Copy size={11} className="stroke-[1.5]" />
          <span>Copy</span>
        </span>
        <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Ctrl+C</span>
      </button>

      {/* Paste (only in input) */}
      {menu.isInput && (
        <button
          type="button"
          onClick={handlePaste}
          className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
        >
          <span className="flex items-center gap-2">
            <ClipboardPaste size={11} className="stroke-[1.5]" />
            <span>Paste</span>
          </span>
          <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Ctrl+V</span>
        </button>
      )}

      {/* Select All */}
      <button
        type="button"
        onClick={handleSelectAll}
        className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
      >
        <span className="flex items-center gap-2">
          <CheckSquare size={11} className="stroke-[1.5]" />
          <span>Select All</span>
        </span>
        <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Ctrl+A</span>
      </button>

      <div className="border-b border-vintage-ink/20 my-1" />

      {/* Navigation: Back, Forward, Reload */}
      <button
        type="button"
        onClick={handleBack}
        className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
      >
        <span className="flex items-center gap-2">
          <ArrowLeft size={11} className="stroke-[1.5]" />
          <span>Back</span>
        </span>
        <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Alt+←</span>
      </button>

      <button
        type="button"
        onClick={handleForward}
        className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
      >
        <span className="flex items-center gap-2">
          <ArrowRight size={11} className="stroke-[1.5]" />
          <span>Forward</span>
        </span>
        <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Alt+→</span>
      </button>

      <button
        type="button"
        onClick={handleReload}
        className="w-full px-2.5 py-1.5 hover:bg-vintage-ink hover:text-vintage-paper rounded-[2px] flex items-center justify-between transition-colors cursor-pointer text-left group"
      >
        <span className="flex items-center gap-2">
          <RotateCw size={11} className="stroke-[1.5]" />
          <span>Reload</span>
        </span>
        <span className="text-[8px] tracking-widest text-vintage-accent group-hover:text-vintage-paper/80 font-mono">Ctrl+R</span>
      </button>
    </div>
  );
};

export default ContextMenu;
