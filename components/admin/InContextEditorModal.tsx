/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin, EditableContentItem } from '../../context/AdminContext';
import { X, Save, Plus, Trash2, FileSpreadsheet, Eye } from 'lucide-react';

interface TableData {
  headers: string[];
  rows: string[][];
}

export const InContextEditorModal: React.FC = () => {
  const { editorModalState, closeEditorModal } = useAdmin();
  const { isOpen, item, category, pagePath, onSaved } = editorModalState;

  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [contentType, setContentType] = useState<'page' | 'table' | 'auto'>('page');
  const [narrativeContent, setNarrativeContent] = useState('');
  
  // Table visual state
  const [tableHeaders, setTableHeaders] = useState<string[]>(['Scope / Tier', 'Allowance', 'Rights & Terms']);
  const [tableRows, setTableRows] = useState<string[][]>([
    ['Tier 1', 'Standard', 'Terms here']
  ]);

  // Paste modal
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [tsvInput, setTsvInput] = useState('');
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (item) {
      setTitle(item.title || '');
      setSectionId(item.section_id || '');
      const t = (item.type === 'table' || item.type === 'auto') ? item.type : 'page';
      setContentType(t);

      if (t === 'table') {
        try {
          const parsed = JSON.parse(item.content);
          if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
            setTableHeaders(parsed.headers);
            setTableRows(parsed.rows);
          }
        } catch {
          setTableHeaders(['Column 1', 'Column 2']);
          setTableRows([['Value 1', 'Value 2']]);
        }
      } else if (t === 'auto') {
        const jsonStartIndex = item.content.indexOf('{');
        if (jsonStartIndex !== -1) {
          const textPart = item.content.substring(0, jsonStartIndex).trim();
          const jsonPart = item.content.substring(jsonStartIndex).trim();
          setNarrativeContent(textPart);
          try {
            const parsed = JSON.parse(jsonPart);
            if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
              setTableHeaders(parsed.headers);
              setTableRows(parsed.rows);
            }
          } catch {}
        } else {
          setNarrativeContent(item.content);
        }
      } else {
        setNarrativeContent(item.content || '');
      }
    } else {
      // New item defaults
      setTitle('');
      setSectionId('');
      setContentType('page');
      setNarrativeContent('');
      setTableHeaders(['Feature', 'Details']);
      setTableRows([['Item 1', 'Description']]);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  // Table Helpers
  const handleAddColumn = () => {
    setTableHeaders(prev => [...prev, `Col ${prev.length + 1}`]);
    setTableRows(prev => prev.map(row => [...row, '']));
  };

  const handleRemoveColumn = (colIdx: number) => {
    if (tableHeaders.length <= 1) return;
    setTableHeaders(prev => prev.filter((_, i) => i !== colIdx));
    setTableRows(prev => prev.map(row => row.filter((_, i) => i !== colIdx)));
  };

  const handleAddRow = () => {
    const newRow = new Array(tableHeaders.length).fill('');
    setTableRows(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (rowIdx: number) => {
    setTableRows(prev => prev.filter((_, i) => i !== rowIdx));
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    setTableRows(prev => {
      const next = prev.map(r => [...r]);
      next[rIdx][cIdx] = val;
      return next;
    });
  };

  const handleImportTSV = () => {
    if (!tsvInput.trim()) return;
    const lines = tsvInput.trim().split(/\r?\n/).filter(l => l.length > 0);
    if (lines.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (firstRowIsHeader) {
      headers = lines[0].split('\t').map(h => h.trim());
      rows = lines.slice(1).map(l => l.split('\t').map(c => c.trim()));
    } else {
      const firstRowCells = lines[0].split('\t');
      headers = firstRowCells.map((_, i) => `Col ${i + 1}`);
      rows = lines.map(l => l.split('\t').map(c => c.trim()));
    }

    setTableHeaders(headers);
    setTableRows(rows);
    setPasteModalOpen(false);
    setTsvInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title cannot be empty');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let finalContent = '';
      if (contentType === 'table') {
        finalContent = JSON.stringify({ headers: tableHeaders, rows: tableRows });
      } else if (contentType === 'auto') {
        const tableJson = JSON.stringify({ headers: tableHeaders, rows: tableRows });
        finalContent = `${narrativeContent.trim()}\n\n${tableJson}`;
      } else {
        finalContent = narrativeContent.trim();
      }

      const payload: Partial<EditableContentItem> = {
        title: title.trim(),
        section_id: sectionId.trim() || '01',
        category,
        page_path: pagePath,
        type: contentType,
        content: finalContent,
        updated_at: new Date().toISOString()
      };

      if (item?.id) {
        payload.id = item.id;
        payload.sort_order = item.sort_order;
      } else {
        payload.sort_order = 99; // Placed at the end
      }

      const { error } = await supabase
        .from('site_content')
        .upsert(payload);

      if (error) throw error;

      if (onSaved) onSaved();
      closeEditorModal();
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMsg(err.message || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-200 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vintage-paper border border-vintage-ink w-full max-w-3xl shadow-2xl relative text-vintage-ink font-serif animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-vintage-ink/30 px-6 py-4 bg-vintage-ink/5">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-vintage-accent rounded-full animate-pulse" />
            <h3 className="text-xl font-display uppercase tracking-wide">
              {item ? `Edit Section (${sectionId || item.section_id})` : `Add New Section to /${category}`}
            </h3>
          </div>
          <button
            onClick={closeEditorModal}
            className="p-1.5 hover:bg-vintage-ink/10 text-vintage-ink transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-700 text-red-900 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Title & Section ID */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent">
                Section ID
              </label>
              <input
                type="text"
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                placeholder="01"
                className="w-full border border-vintage-ink/30 p-2 text-sm bg-white outline-none focus:border-vintage-ink font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent">
                Section Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Section Headline"
                className="w-full border border-vintage-ink/30 p-2 text-sm bg-white outline-none focus:border-vintage-ink font-display text-base"
                required
              />
            </div>
          </div>

          {/* Content Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent">
              Content Layout Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContentType('page')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  contentType === 'page'
                    ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                    : 'bg-white/60 border-vintage-ink/30 text-vintage-ink/70 hover:bg-white'
                }`}
              >
                Standard Text / HTML
              </button>
              <button
                type="button"
                onClick={() => setContentType('table')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  contentType === 'table'
                    ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                    : 'bg-white/60 border-vintage-ink/30 text-vintage-ink/70 hover:bg-white'
                }`}
              >
                Structured Table
              </button>
              <button
                type="button"
                onClick={() => setContentType('auto')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  contentType === 'auto'
                    ? 'bg-vintage-ink text-vintage-paper border-vintage-ink'
                    : 'bg-white/60 border-vintage-ink/30 text-vintage-ink/70 hover:bg-white'
                }`}
              >
                Combined (Text + Table)
              </button>
            </div>
          </div>

          {/* Narrative Editor (for 'page' or 'auto') */}
          {(contentType === 'page' || contentType === 'auto') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-vintage-accent">
                Narrative Content (HTML / Paragraphs)
              </label>
              <textarea
                value={narrativeContent}
                onChange={e => setNarrativeContent(e.target.value)}
                rows={6}
                placeholder="Enter text or HTML..."
                className="w-full border border-vintage-ink/30 p-3 text-sm bg-white outline-none focus:border-vintage-ink font-serif leading-relaxed"
              />
            </div>
          )}

          {/* Interactive Table Editor (for 'table' or 'auto') */}
          {(contentType === 'table' || contentType === 'auto') && (
            <div className="space-y-3 border border-vintage-ink/30 p-4 bg-white/70">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vintage-ink/20 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-vintage-accent">
                  Interactive Table Editor
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteModalOpen(true)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-vintage-ink/10 hover:bg-vintage-ink hover:text-white transition-colors flex items-center gap-1 border border-vintage-ink/30"
                  >
                    <FileSpreadsheet size={12} /> Paste Spreadsheet
                  </button>
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-vintage-ink/10 hover:bg-vintage-ink hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Col
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-vintage-ink text-vintage-paper hover:bg-vintage-accent transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-vintage-ink/10 border-b border-vintage-ink/30">
                      {tableHeaders.map((header, colIdx) => (
                        <th key={colIdx} className="p-2 border-r border-vintage-ink/20 last:border-r-0">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={header}
                              onChange={e => {
                                const next = [...tableHeaders];
                                next[colIdx] = e.target.value;
                                setTableHeaders(next);
                              }}
                              className="w-full bg-white border border-vintage-ink/20 px-2 py-0.5 text-[11px] font-bold uppercase"
                            />
                            {tableHeaders.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveColumn(colIdx)}
                                className="text-vintage-ink/40 hover:text-red-700"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-vintage-ink/10 hover:bg-vintage-ink/5">
                        {tableHeaders.map((_, colIdx) => (
                          <td key={colIdx} className="p-1.5 border-r border-vintage-ink/20 last:border-r-0">
                            <input
                              type="text"
                              value={row[colIdx] || ''}
                              onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                              className="w-full bg-white/70 border border-transparent hover:border-vintage-ink/30 focus:border-vintage-ink focus:bg-white px-2 py-1 text-xs"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rowIdx)}
                            className="text-vintage-ink/30 hover:text-red-700"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-vintage-ink/20">
            <button
              type="button"
              onClick={closeEditorModal}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest border border-vintage-ink/30 hover:bg-vintage-ink/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 text-xs font-bold uppercase tracking-widest bg-vintage-ink text-vintage-paper hover:bg-vintage-accent transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'Saving...' : 'Save to Website'}
            </button>
          </div>
        </form>

        {/* Nested Spreadsheet Paste Modal */}
        {pasteModalOpen && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6">
            <div className="bg-white border border-vintage-ink p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-vintage-ink/20 pb-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-vintage-ink flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-vintage-accent" />
                  Paste from Google Sheets / Excel
                </h4>
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(false)}
                  className="text-vintage-ink/60 hover:text-black"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                rows={6}
                value={tsvInput}
                onChange={e => setTsvInput(e.target.value)}
                placeholder="Select cells in Excel / Google Sheets, copy (Ctrl+C), and paste here..."
                className="w-full border border-vintage-ink/30 p-3 text-xs font-mono bg-vintage-ink/5 outline-none focus:border-vintage-ink"
              />
              <label className="flex items-center gap-2 text-xs text-vintage-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={firstRowIsHeader}
                  onChange={e => setFirstRowIsHeader(e.target.checked)}
                  className="accent-vintage-ink"
                />
                First row contains column headers
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-vintage-ink/30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportTSV}
                  className="px-5 py-1.5 text-xs font-bold uppercase tracking-wider bg-vintage-ink text-white hover:bg-vintage-accent transition-colors"
                >
                  Apply Table Data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
