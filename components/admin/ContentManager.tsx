/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  FileText, 
  Info, 
  Eye, 
  Monitor, 
  Smartphone, 
  Table as TableIcon, 
  Code, 
  FileSpreadsheet, 
  Columns, 
  Rows, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface ContentItem {
  id?: string;
  title: string;
  content: string;
  page_path: string;
  section_id: string;
  category: string;
  sort_order: number;
  type: string;
  updated_at?: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface SpecialFooterData {
  italic_text: string;
  body_text: string;
  location: string;
}

// Transform HTML helper to match live site styling exactly
const transformHTMLContent = (html: string): React.ReactNode => {
  if (!html) return null;
  const transformed = html
    .replace(/text-black/g, 'text-vintage-ink')
    .replace(/text-gray-\d+/g, 'text-vintage-ink')
    .replace(/text-gray-600/g, 'text-vintage-ink')
    .replace(/text-gray-400/g, 'text-vintage-ink')
    .replace(/text-vintage-ink\/\d+/g, 'text-vintage-ink')
    .replace(/opacity-\d+/g, '')
    .replace(/text-opacity-\d+/g, '')
    .replace(/text-\d+xl/g, 'text-lg md:text-xl')
    .replace(/class="([^"]*)"/g, (_, classes) => {
      const classList = classes
        .split(/\s+/)
        .filter((cls: string) => !cls.startsWith('mb-') && !cls.startsWith('mt-'))
        .join(' ');
      return `class="${classList}"`;
    });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: transformed }}
      className="space-y-6 [&_p]:text-base [&_p]:md:text-lg [&_p]:leading-relaxed [&_p]:text-vintage-ink [&_p.italic]:text-vintage-ink [&_em]:text-vintage-ink [&_i]:text-vintage-ink [&_span]:text-vintage-ink [&_div]:flex [&_div]:gap-6 [&_div]:items-start [&_span]:font-bold"
    />
  );
};

// Exact live replica of LicenseTable component
const LiveLicenseTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="w-full border border-vintage-ink mb-6 overflow-hidden bg-vintage-paper/10">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-vintage-ink bg-vintage-ink/5">
            {headers.map((h, i) => (
              <th
                key={i}
                className="p-3 border-r border-vintage-ink last:border-0 font-bold text-xs uppercase tracking-wider text-vintage-ink whitespace-nowrap"
              >
                {h || `COL ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-vintage-ink/30 last:border-0 hover:bg-vintage-ink/5 transition-colors">
              {headers.map((_, j) => (
                <td
                  key={j}
                  className="p-3 border-r border-vintage-ink/30 last:border-0 text-sm text-vintage-ink leading-relaxed"
                >
                  {row[j] !== undefined && row[j] !== '' ? row[j] : <span className="opacity-20 italic">—</span>}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={Math.max(1, headers.length)} className="p-6 text-center text-xs italic text-vintage-ink/40">
                No table rows yet. Add rows or paste spreadsheet data above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const ContentManager = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState('faq');

  const categories = ['faq', 'license', 'policy', 'canvas', 'contact', 'affiliate'];

  const [formData, setFormData] = useState<ContentItem>({
    title: '',
    content: '',
    page_path: '/faq',
    section_id: '',
    category: 'faq',
    type: 'page',
    sort_order: 0
  });

  // Visual Editor State
  const [editorMode, setEditorMode] = useState<'visual' | 'raw'>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  // Table visual state
  const [tableHeaders, setTableHeaders] = useState<string[]>(['Scope / Tier', 'Allowance', 'Rights & Terms']);
  const [tableRows, setTableRows] = useState<string[][]>([
    ['Desktop Commercial', '1–5 Users', 'Logos, Print, Packaging, Social Media'],
    ['Webfont License', 'Up to 50k Views/Mo', 'Domain embedding via @font-face'],
    ['Broadcast / App', '1 Title / App', 'Worldwide perpetual embedding']
  ]);

  // Narrative state for 'auto' type
  const [narrativeText, setNarrativeText] = useState<string>('');

  // Special footer state
  const [footerData, setFooterData] = useState<SpecialFooterData>({
    italic_text: '',
    body_text: '',
    location: ''
  });

  // Spreadsheet Paste Modal state
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [tsvInput, setTsvInput] = useState('');
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);

  const generateSectionId = (category: string, index: number) => {
    const displayIndex = index + 1;
    if (category === 'faq') return `Q${displayIndex}`;
    if (category === 'canvas') return `CV${displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`}`;
    if (category === 'contact') return `CT${displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`}`;
    if (category === 'affiliate') return `AF${displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`}`;
    return displayIndex < 10 ? `0${displayIndex}` : `${displayIndex}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(draggedItemIndex, 1)[0];
    newItems.splice(index, 0, draggedItem);

    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx,
      section_id: generateSectionId(currentCategory, idx),
      updated_at: new Date().toISOString()
    }));

    setItems(updatedItems);
    setDraggedItemIndex(null);

    try {
      const { error } = await supabase.from('site_content').upsert(updatedItems);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync sequence:", err);
      alert("SEQUENCE SYNC FAILED. PLEASE REFRESH.");
    }
  };

  useEffect(() => {
    fetchContent();
  }, [currentCategory]);

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_content')
      .select('*')
      .eq('category', currentCategory)
      .order('sort_order', { ascending: true });
    
    if (data) setItems(data);
    setLoading(false);
  };

  // Synchronize visual state whenever formData changes
  const loadItemIntoForm = (item: ContentItem) => {
    setFormData(item);
    setIsEditing(true);

    if (item.type === 'table') {
      try {
        const parsed = JSON.parse(item.content);
        if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
          setTableHeaders(parsed.headers);
          setTableRows(parsed.rows);
          setEditorMode('visual');
        } else {
          setEditorMode('raw');
        }
      } catch (e) {
        setEditorMode('raw');
      }
    } else if (item.type === 'auto') {
      const jsonStartIndex = item.content.indexOf('{');
      if (jsonStartIndex !== -1) {
        const textPart = item.content.substring(0, jsonStartIndex).trim();
        const jsonPart = item.content.substring(jsonStartIndex).trim();
        setNarrativeText(textPart);
        try {
          const parsed = JSON.parse(jsonPart);
          if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
            setTableHeaders(parsed.headers);
            setTableRows(parsed.rows);
            setEditorMode('visual');
          } else {
            setEditorMode('raw');
          }
        } catch (e) {
          setEditorMode('raw');
        }
      } else {
        setNarrativeText(item.content);
        setEditorMode('visual');
      }
    } else if (item.type === 'special_footer') {
      try {
        const parsed = JSON.parse(item.content);
        setFooterData({
          italic_text: parsed.italic_text || '',
          body_text: parsed.body_text || '',
          location: parsed.location || parsed.location_info || ''
        });
        setEditorMode('visual');
      } catch (e) {
        setEditorMode('raw');
      }
    } else {
      setEditorMode('raw');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compile visual state into serialized formData.content string
  const syncVisualToContent = (
    type: string,
    headers: string[],
    rows: string[][],
    narrative: string,
    footer: SpecialFooterData
  ) => {
    if (type === 'table') {
      return JSON.stringify({ headers, rows }, null, 2);
    }
    if (type === 'auto') {
      const jsonStr = JSON.stringify({ headers, rows }, null, 2);
      return narrative.trim() ? `${narrative.trim()}\n\n${jsonStr}` : jsonStr;
    }
    if (type === 'special_footer') {
      return JSON.stringify(footer, null, 2);
    }
    return formData.content;
  };

  // Handle table header update
  const handleHeaderChange = (index: number, val: string) => {
    const updated = [...tableHeaders];
    updated[index] = val;
    setTableHeaders(updated);
    const serialized = syncVisualToContent(formData.type, updated, tableRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Add column to table
  const handleAddColumn = () => {
    const newHeaders = [...tableHeaders, `COL ${tableHeaders.length + 1}`];
    const newRows = tableRows.map(row => [...row, '']);
    setTableHeaders(newHeaders);
    setTableRows(newRows);
    const serialized = syncVisualToContent(formData.type, newHeaders, newRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Remove column from table
  const handleRemoveColumn = (colIdx: number) => {
    if (tableHeaders.length <= 1) {
      alert("Table must have at least one column.");
      return;
    }
    const newHeaders = tableHeaders.filter((_, idx) => idx !== colIdx);
    const newRows = tableRows.map(row => row.filter((_, idx) => idx !== colIdx));
    setTableHeaders(newHeaders);
    setTableRows(newRows);
    const serialized = syncVisualToContent(formData.type, newHeaders, newRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Handle cell edit
  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const newRows = tableRows.map((row, rI) => {
      if (rI !== rowIdx) return row;
      const newRow = [...row];
      newRow[colIdx] = val;
      return newRow;
    });
    setTableRows(newRows);
    const serialized = syncVisualToContent(formData.type, tableHeaders, newRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Add row
  const handleAddRow = () => {
    const newRow = new Array(tableHeaders.length).fill('');
    const newRows = [...tableRows, newRow];
    setTableRows(newRows);
    const serialized = syncVisualToContent(formData.type, tableHeaders, newRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Remove row
  const handleRemoveRow = (rowIdx: number) => {
    const newRows = tableRows.filter((_, idx) => idx !== rowIdx);
    setTableRows(newRows);
    const serialized = syncVisualToContent(formData.type, tableHeaders, newRows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Handle narrative text edit for 'auto'
  const handleNarrativeChange = (val: string) => {
    setNarrativeText(val);
    const serialized = syncVisualToContent(formData.type, tableHeaders, tableRows, val, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Handle special footer fields
  const handleFooterChange = (field: keyof SpecialFooterData, val: string) => {
    const updated = { ...footerData, [field]: val };
    setFooterData(updated);
    const serialized = syncVisualToContent(formData.type, tableHeaders, tableRows, narrativeText, updated);
    setFormData(prev => ({ ...prev, content: serialized }));
  };

  // Process TSV spreadsheet paste
  const handleImportTSV = () => {
    if (!tsvInput.trim()) {
      alert("Please paste text from your spreadsheet first.");
      return;
    }

    const lines = tsvInput.trim().split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (firstRowIsHeader) {
      headers = lines[0].split('\t').map(h => h.trim());
      rows = lines.slice(1).map(line => line.split('\t').map(c => c.trim()));
    } else {
      const firstRowCells = lines[0].split('\t');
      headers = firstRowCells.map((_, i) => `Col ${i + 1}`);
      rows = lines.map(line => line.split('\t').map(c => c.trim()));
    }

    // Normalize rows to match header length
    const maxCols = Math.max(headers.length, ...rows.map(r => r.length));
    while (headers.length < maxCols) {
      headers.push(`Col ${headers.length + 1}`);
    }
    rows = rows.map(r => {
      const fullRow = [...r];
      while (fullRow.length < headers.length) fullRow.push('');
      return fullRow;
    });

    setTableHeaders(headers);
    setTableRows(rows);
    const serialized = syncVisualToContent(formData.type, headers, rows, narrativeText, footerData);
    setFormData(prev => ({ ...prev, content: serialized }));
    setPasteModalOpen(false);
    setTsvInput('');
  };

  // Switch between Visual & Raw Mode
  const toggleEditorMode = (mode: 'visual' | 'raw') => {
    if (mode === 'visual') {
      // Try to parse raw content back into visual states
      if (formData.type === 'table') {
        try {
          const parsed = JSON.parse(formData.content);
          if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
            setTableHeaders(parsed.headers);
            setTableRows(parsed.rows);
            setEditorMode('visual');
            return;
          }
        } catch (e) {
          alert("Cannot switch to Visual Editor: JSON syntax is invalid. Please fix errors first.");
          return;
        }
      } else if (formData.type === 'auto') {
        const jsonStartIndex = formData.content.indexOf('{');
        if (jsonStartIndex !== -1) {
          const textPart = formData.content.substring(0, jsonStartIndex).trim();
          const jsonPart = formData.content.substring(jsonStartIndex).trim();
          try {
            const parsed = JSON.parse(jsonPart);
            if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
              setNarrativeText(textPart);
              setTableHeaders(parsed.headers);
              setTableRows(parsed.rows);
              setEditorMode('visual');
              return;
            }
          } catch (e) {
            alert("Cannot switch to Visual Editor: Table JSON is invalid. Please fix errors first.");
            return;
          }
        }
      } else if (formData.type === 'special_footer') {
        try {
          const parsed = JSON.parse(formData.content);
          setFooterData({
            italic_text: parsed.italic_text || '',
            body_text: parsed.body_text || '',
            location: parsed.location || parsed.location_info || ''
          });
          setEditorMode('visual');
          return;
        } catch (e) {
          alert("Cannot switch to Visual Editor: Footer JSON is invalid. Please fix errors first.");
          return;
        }
      }
    }
    setEditorMode(mode);
  };

  // When changing display type, reformat / seed appropriate structures
  const handleTypeChange = (newType: string) => {
    setFormData(prev => {
      let newContent = prev.content;
      if (newType === 'table') {
        newContent = JSON.stringify({ headers: tableHeaders, rows: tableRows }, null, 2);
      } else if (newType === 'auto') {
        const jsonStr = JSON.stringify({ headers: tableHeaders, rows: tableRows }, null, 2);
        newContent = narrativeText.trim() ? `${narrativeText.trim()}\n\n${jsonStr}` : jsonStr;
      } else if (newType === 'special_footer') {
        newContent = JSON.stringify(footerData, null, 2);
      }
      return { ...prev, type: newType, content: newContent };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      await supabase
        .from('site_content')
        .update({ 
          ...formData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', formData.id);
    } else {
      await supabase.from('site_content').insert([formData]);
    }
    resetForm();
    fetchContent();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Discard this content record permanently?')) {
      await supabase.from('site_content').delete().eq('id', id);
      fetchContent();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      page_path: `/${currentCategory}`,
      section_id: '',
      category: currentCategory,
      type: 'page',
      sort_order: items.length
    });
    setNarrativeText('');
    setTableHeaders(['Scope / Tier', 'Allowance', 'Rights & Terms']);
    setTableRows([
      ['Desktop Commercial', '1–5 Users', 'Logos, Print, Packaging, Social Media'],
      ['Webfont License', 'Up to 50k Views/Mo', 'Domain embedding via @font-face']
    ]);
    setFooterData({ italic_text: '', body_text: '', location: '' });
    setEditorMode('visual');
    setIsEditing(false);
  };

  // Compute parsed data for real-time live preview
  const livePreviewData = useMemo(() => {
    if (formData.type === 'table') {
      try {
        const parsed: TableData = JSON.parse(formData.content);
        return { type: 'table', table: parsed };
      } catch {
        return { type: 'table', table: { headers: tableHeaders, rows: tableRows } };
      }
    }
    if (formData.type === 'auto') {
      const jsonStartIndex = formData.content.indexOf('{');
      if (jsonStartIndex !== -1) {
        const textPart = formData.content.substring(0, jsonStartIndex).trim();
        const jsonPart = formData.content.substring(jsonStartIndex).trim();
        try {
          const parsedTable: TableData = JSON.parse(jsonPart);
          return { type: 'auto', text: textPart, table: parsedTable };
        } catch {
          return { type: 'auto', text: textPart, table: { headers: tableHeaders, rows: tableRows } };
        }
      }
      return { type: 'auto', text: formData.content, table: { headers: tableHeaders, rows: tableRows } };
    }
    if (formData.type === 'special_footer') {
      try {
        const parsed = JSON.parse(formData.content);
        return { type: 'special_footer', footer: parsed };
      } catch {
        return { type: 'special_footer', footer: footerData };
      }
    }
    return { type: formData.type, content: formData.content };
  }, [formData.content, formData.type, tableHeaders, tableRows, footerData]);

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-6">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink mb-6">Site Content Studio</h2>
        <p className="text-[11px] font-bold tracking-[0.2em] text-vintage-accent uppercase mb-6 italic">
          Visual content builder, structured tables & live website simulation
        </p>
        
        {/* CATEGORIES - Clear Active High-Contrast Tabs */}
        <div className="flex flex-wrap gap-2 bg-vintage-ink/5 border border-vintage-ink/20 p-1.5 w-fit">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCurrentCategory(cat);
                setFormData(prev => ({ ...prev, category: cat, page_path: `/${cat}` }));
              }}
              className={`px-5 py-2.5 font-bold text-[10px] uppercase tracking-[0.25em] transition-all duration-300 relative ${
                currentCategory === cat 
                  ? 'bg-vintage-ink text-vintage-background shadow-md' 
                  : 'text-vintage-ink/50 hover:text-vintage-ink hover:bg-vintage-ink/10'
              }`}
            >
              {currentCategory === cat && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-vintage-accent mr-2 align-middle" />
              )}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* TOP-TO-BOTTOM ARCHITECTURE: 
          1. FORM & VISUAL BUILDER (ATAS) 
          2. LIVE PREVIEW (BAWAH) 
          3. CONTENT LIST & REORDERING (PALING BAWAH) */}

      {/* 1. ENTRY FORM & VISUAL BUILDER */}
      <div className="vintage-card bg-white/60 shadow-lg border border-vintage-ink/20">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Top Form Header with Visual Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-vintage-ink/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-vintage-ink text-vintage-paper rounded-none">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-vintage-ink">
                  {isEditing ? 'Refine Existing Content Record' : 'Draft New Content Entry'}
                </h3>
                <span className="text-[10px] text-vintage-accent font-serif italic">
                  Category: {currentCategory.toUpperCase()} &bull; Path: {formData.page_path}
                </span>
              </div>
            </div>

            {/* Visual Builder vs Raw Code Switcher (for structured types) */}
            {(formData.type === 'table' || formData.type === 'auto' || formData.type === 'special_footer') && (
              <div className="flex items-center gap-1 bg-vintage-ink/5 p-1 border border-vintage-ink/15">
                <button
                  type="button"
                  onClick={() => toggleEditorMode('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                    editorMode === 'visual'
                      ? 'bg-vintage-ink text-vintage-paper shadow-sm'
                      : 'text-vintage-ink/60 hover:text-vintage-ink hover:bg-vintage-ink/10'
                  }`}
                >
                  <TableIcon size={12} /> Visual Builder
                </button>
                <button
                  type="button"
                  onClick={() => toggleEditorMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                    editorMode === 'raw'
                      ? 'bg-vintage-ink text-vintage-paper shadow-sm'
                      : 'text-vintage-ink/60 hover:text-vintage-ink hover:bg-vintage-ink/10'
                  }`}
                >
                  <Code size={12} /> Raw JSON
                </button>
              </div>
            )}
          </div>

          {/* Primary Metadata Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent flex items-center gap-1.5">
                <span>Entry Title</span>
                <span className="text-vintage-ink/40 font-normal italic font-serif">(Shown in card headline)</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Standard Commercial License..." 
                className="w-full border-b border-vintage-ink/20 py-3 bg-transparent outline-none font-display text-xl focus:border-vintage-ink transition-colors placeholder:text-vintage-ink/40"
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Display Type</label>
                <select 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none cursor-pointer"
                  value={formData.type}
                  onChange={e => handleTypeChange(e.target.value)}
                >
                  <option value="page">Page (Narrative)</option>
                  <option value="auto">Auto (Text + Table)</option>
                  <option value="table">Table (Comparison)</option>
                  <option value="special_footer">Special Footer (Closing)</option>
                  <option value="insight_summary">Insight Summary</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Section ID</label>
                <input 
                  type="text" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none"
                  value={formData.section_id} 
                  onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                  placeholder="01 or Q01"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">Sort Order</label>
                <input 
                  type="number" 
                  className="w-full border-b border-vintage-ink/20 py-3 bg-transparent font-bold uppercase text-[10px] outline-none"
                  value={formData.sort_order} 
                  onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC EDITOR AREA BASED ON DISPLAY TYPE & MODE */}

          {/* 1. VISUAL TABLE BUILDER (For 'table' or 'auto' in visual mode) */}
          {editorMode === 'visual' && (formData.type === 'table' || formData.type === 'auto') && (
            <div className="space-y-6 pt-2">
              {/* Optional narrative introductory text for 'auto' */}
              {formData.type === 'auto' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                      Introductory Narrative (HTML Permitted)
                    </label>
                    <span className="text-[9px] text-vintage-ink/50 font-serif italic">
                      Appears directly above the comparison table
                    </span>
                  </div>
                  <textarea 
                    placeholder="Provide explanatory context, licensing rules, or intro remarks before the table..." 
                    className="w-full h-24 border border-vintage-ink/15 p-4 bg-vintage-paper/20 outline-none focus:border-vintage-ink font-serif text-base italic transition-all placeholder:text-vintage-ink/40"
                    value={narrativeText} 
                    onChange={e => handleNarrativeChange(e.target.value)}
                  />
                </div>
              )}

              {/* Table Grid Controls Bar */}
              <div className="border border-vintage-ink/20 bg-vintage-paper/30 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vintage-ink/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-vintage-ink text-vintage-paper">
                      <TableIcon size={14} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-vintage-ink">
                        Visual Table Grid
                      </h4>
                      <p className="text-[9px] text-vintage-ink/50 font-serif italic">
                        {tableHeaders.length} Columns &bull; {tableRows.length} Rows &bull; Auto-syncs to JSON
                      </p>
                    </div>
                  </div>

                  {/* Actions: Add Col, Add Row, Paste Spreadsheet */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteModalOpen(true)}
                      className="px-3 py-1.5 bg-vintage-ink/10 hover:bg-vintage-ink hover:text-vintage-paper text-vintage-ink text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-vintage-ink/20"
                      title="Paste cells copied from Excel or Google Sheets"
                    >
                      <FileSpreadsheet size={12} /> Paste Spreadsheet Data
                    </button>
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="px-3 py-1.5 bg-vintage-ink/5 hover:bg-vintage-ink/10 text-vintage-ink text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 border border-vintage-ink/15"
                    >
                      <Plus size={12} /> Add Column
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3 py-1.5 bg-vintage-ink text-vintage-paper hover:bg-vintage-accent text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                {/* Interactive Table Grid Editor */}
                <div className="overflow-x-auto border border-vintage-ink/20 bg-white/70 shadow-inner">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-vintage-ink/10 border-b border-vintage-ink/30">
                        <th className="p-2.5 w-10 text-center text-[9px] font-mono text-vintage-ink/40 border-r border-vintage-ink/20">
                          #
                        </th>
                        {tableHeaders.map((header, colIdx) => (
                          <th key={colIdx} className="p-2 border-r border-vintage-ink/20 last:border-r-0">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={header}
                                onChange={e => handleHeaderChange(colIdx, e.target.value)}
                                placeholder={`Header ${colIdx + 1}`}
                                className="w-full bg-white/80 border border-vintage-ink/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-vintage-ink outline-none focus:border-vintage-ink focus:bg-white"
                              />
                              {tableHeaders.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColumn(colIdx)}
                                  className="text-vintage-ink/40 hover:text-red-700 p-1 transition-colors"
                                  title="Delete column"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 w-12 text-center text-[9px] font-bold text-vintage-ink/40">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, rowIdx) => (
                        <tr 
                          key={rowIdx} 
                          className="border-b border-vintage-ink/15 hover:bg-vintage-paper/20 transition-colors"
                        >
                          <td className="p-2.5 text-center text-[10px] font-mono font-bold text-vintage-ink/30 border-r border-vintage-ink/20 bg-vintage-ink/3">
                            {rowIdx + 1}
                          </td>
                          {tableHeaders.map((_, colIdx) => (
                            <td key={colIdx} className="p-2 border-r border-vintage-ink/20 last:border-r-0">
                              <textarea
                                rows={1}
                                value={row[colIdx] || ''}
                                onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                                placeholder="Enter value..."
                                className="w-full bg-transparent border border-transparent hover:border-vintage-ink/20 focus:border-vintage-ink focus:bg-white px-2 py-1.5 text-xs text-vintage-ink outline-none transition-all resize-y min-h-[34px]"
                              />
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIdx)}
                              className="text-vintage-ink/30 hover:text-red-700 p-1.5 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[10px] text-vintage-ink/50 italic font-serif">
                  <span>* Click cell to edit content. All changes update live preview below automatically.</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-vintage-accent hover:underline font-sans not-italic font-bold uppercase tracking-wider text-[9px]"
                  >
                    + Add New Row Below
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. VISUAL SPECIAL FOOTER BUILDER */}
          {editorMode === 'visual' && formData.type === 'special_footer' && (
            <div className="p-6 border border-vintage-ink/20 bg-vintage-paper/30 space-y-6">
              <div className="flex items-center gap-2 border-b border-vintage-ink/10 pb-3">
                <Sparkles size={16} className="text-vintage-accent" />
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-vintage-ink">
                  Special Closing Statement Builder
                </h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                    Italic Highlight Statement
                  </label>
                  <input
                    type="text"
                    value={footerData.italic_text}
                    onChange={e => handleFooterChange('italic_text', e.target.value)}
                    placeholder="e.g. Crafted in Yogyakarta for the discerning typographer."
                    className="w-full border-b border-vintage-ink/20 py-2.5 bg-transparent font-display text-lg italic outline-none focus:border-vintage-ink"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                    Body Narrative Statement
                  </label>
                  <textarea
                    rows={3}
                    value={footerData.body_text}
                    onChange={e => handleFooterChange('body_text', e.target.value)}
                    placeholder="Write the full closing manifesto or founding philosophy..."
                    className="w-full border border-vintage-ink/15 p-4 bg-white/70 outline-none focus:border-vintage-ink font-serif text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                    Location & Vintage Year Badge
                  </label>
                  <input
                    type="text"
                    value={footerData.location}
                    onChange={e => handleFooterChange('location', e.target.value)}
                    placeholder="e.g. Yogyakarta, Indonesia — Est. 2024"
                    className="w-full border-b border-vintage-ink/20 py-2 bg-transparent text-xs font-bold uppercase tracking-[0.2em] outline-none focus:border-vintage-ink"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. STANDARD NARRATIVE / RAW JSON TEXTAREA (For 'page', 'insight_summary', or Raw Mode) */}
          {(editorMode === 'raw' || (formData.type !== 'table' && formData.type !== 'auto' && formData.type !== 'special_footer')) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold uppercase tracking-widest text-vintage-accent">
                  {editorMode === 'raw' ? 'Raw JSON Content Payload' : 'Narrative Content (HTML Permitted)'}
                </label>
                {editorMode === 'raw' && (
                  <span className="text-[9px] font-mono text-vintage-accent">
                    Direct Code Mode Active
                  </span>
                )}
              </div>
              <textarea 
                placeholder={editorMode === 'raw' ? '{"headers": [...], "rows": [...]}' : 'Detailed content using standard HTML markers...'} 
                className={`w-full h-44 border border-vintage-ink/20 p-5 bg-vintage-paper/20 outline-none focus:border-vintage-ink transition-all placeholder:text-vintage-ink/40 ${
                  editorMode === 'raw' ? 'font-mono text-xs leading-relaxed' : 'font-serif text-lg italic'
                }`}
                value={formData.content} 
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-vintage-ink/10">
            <button type="submit" className="vintage-btn btn-reverse px-8 py-3.5 text-[10px]">
              <Save size={14} className="mr-2 inline" /> {isEditing ? 'Commit Update to Database' : 'Publish to Archive'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                onClick={resetForm} 
                className="vintage-btn px-8 py-3.5 text-[10px] border-vintage-ink/20"
              >
                <X size={14} className="mr-2 inline" /> Discard Changes
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. REAL-TIME LIVE PREVIEW (STACKED VERTICALLY: ATAS-BAWAH) */}
      <div className="border border-vintage-ink/25 bg-vintage-paper/20 shadow-sm overflow-hidden">
        {/* Preview Control Toolbar */}
        <div className="bg-vintage-ink/5 border-b border-vintage-ink/20 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-vintage-accent text-vintage-paper">
              <Eye size={14} />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-vintage-ink flex items-center gap-2">
                Live Website Simulation
                <span className="text-[8px] bg-vintage-ink text-vintage-paper px-2 py-0.5 font-mono">
                  {currentCategory.toUpperCase()} PREVIEW
                </span>
              </h4>
              <p className="text-[9px] text-vintage-ink/50 font-serif italic">
                Exact replica of public storefront styling & responsive behavior
              </p>
            </div>
          </div>

          {/* Responsive Viewport Switcher */}
          <div className="flex items-center gap-1 bg-white/70 border border-vintage-ink/20 p-1">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                previewDevice === 'desktop'
                  ? 'bg-vintage-ink text-vintage-paper shadow-sm'
                  : 'text-vintage-ink/60 hover:text-vintage-ink'
              }`}
            >
              <Monitor size={12} /> Desktop (100%)
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                previewDevice === 'mobile'
                  ? 'bg-vintage-ink text-vintage-paper shadow-sm'
                  : 'text-vintage-ink/60 hover:text-vintage-ink'
              }`}
            >
              <Smartphone size={12} /> Mobile View
            </button>
          </div>
        </div>

        {/* Live Render Surface (Mirroring LicenseCard / FaqCard / About Section) */}
        <div className="p-6 md:p-12 bg-vintage-background/80 flex justify-center min-h-[260px] overflow-x-auto">
          <div className={`transition-all duration-300 w-full ${previewDevice === 'mobile' ? 'max-w-md border-x border-vintage-ink/20 px-4 py-6 bg-vintage-background shadow-2xl' : 'max-w-4xl'}`}>
            {/* Card Shell */}
            <div className="w-full">
              {/* Header Title with Section Number */}
              <div className="mb-4">
                <h3 className="text-2xl md:text-5xl font-display leading-tight tracking-tight mb-4 text-vintage-ink">
                  <span className="opacity-40 mr-3 md:mr-6">
                    {formData.section_id || '01'}
                  </span>
                  {formData.title || 'Draft Content Title'}
                </h3>
              </div>

              {/* Exact HR Divider */}
              <hr className="w-full border-vintage-ink/30 mb-6 md:mb-8" />

              {/* Body Content Simulation */}
              <div className="space-y-6 text-base md:text-lg leading-relaxed text-vintage-ink">
                {/* 1. TABLE ONLY */}
                {livePreviewData.type === 'table' && livePreviewData.table && (
                  <LiveLicenseTable 
                    headers={livePreviewData.table.headers || []} 
                    rows={livePreviewData.table.rows || []} 
                  />
                )}

                {/* 2. AUTO (Narrative Text + Table) */}
                {livePreviewData.type === 'auto' && (
                  <div className="space-y-6">
                    {livePreviewData.text && (
                      livePreviewData.text.includes('<') ? (
                        transformHTMLContent(livePreviewData.text)
                      ) : (
                        <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap font-serif">
                          {livePreviewData.text}
                        </p>
                      )
                    )}
                    {livePreviewData.table && (
                      <LiveLicenseTable 
                        headers={livePreviewData.table.headers || []} 
                        rows={livePreviewData.table.rows || []} 
                      />
                    )}
                  </div>
                )}

                {/* 3. SPECIAL FOOTER */}
                {livePreviewData.type === 'special_footer' && livePreviewData.footer && (
                  <div className="mt-8 w-full border border-vintage-ink bg-vintage-ink text-vintage-paper p-8 md:p-12 relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                      {livePreviewData.footer.italic_text && (
                        <h3 className="text-3xl md:text-5xl font-display tracking-tight uppercase italic leading-tight text-vintage-paper">
                          {livePreviewData.footer.italic_text}
                        </h3>
                      )}
                      {livePreviewData.footer.body_text && (
                        <p className="text-sm md:text-base normal-case text-vintage-paper/90 font-serif leading-relaxed max-w-2xl">
                          {livePreviewData.footer.body_text}
                        </p>
                      )}
                      {livePreviewData.footer.location && (
                        <div className="pt-4 border-t border-vintage-paper/20">
                          <p className="text-xs font-bold uppercase tracking-[0.3em] text-vintage-accent">
                            {livePreviewData.footer.location}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. STANDARD PAGE OR INSIGHT SUMMARY */}
                {(livePreviewData.type === 'page' || livePreviewData.type === 'insight_summary') && (
                  livePreviewData.content?.includes('<') ? (
                    transformHTMLContent(livePreviewData.content)
                  ) : (
                    <div className="space-y-4">
                      {(livePreviewData.content || 'Content text will render here...').split('\n').map((paragraph, i) => (
                        paragraph.trim() && (
                          <p key={i} className="text-base md:text-lg leading-relaxed">
                            {paragraph.trim()}
                          </p>
                        )
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ARCHIVE LIST WITH DRAG AND DROP SEQUENCING (PRESERVED) */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between border-b border-vintage-ink/10 pb-3 mb-6">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-vintage-ink">
              Content Hierarchy &amp; Sequencing <span className="text-vintage-accent ml-2">[{currentCategory.toUpperCase()}]</span>
            </h3>
            <p className="text-[9px] text-vintage-ink/50 font-serif italic mt-0.5">
              Drag entries up or down to reorder live layout sequencing on the public storefront
            </p>
          </div>
          <span className="text-[9px] font-bold tracking-widest text-vintage-ink/40 uppercase">
            {items.length} {items.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center italic opacity-40 font-serif">Loading content...</div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`vintage-card p-6 flex justify-between items-center group cursor-move transition-all hover:border-vintage-accent ${
                  draggedItemIndex === index ? 'opacity-30 border-dashed bg-vintage-paper' : 'bg-white/60'
                }`}
              >
                <div className="flex items-center gap-8">
                  {/* Order indicator */}
                  <span className="font-display text-4xl text-vintage-ink/40 italic">#{item.sort_order}</span>
                  <div>
                    <h4 className="font-display text-2xl text-vintage-ink leading-none">{item.title}</h4>
                    <p className="text-[9px] font-bold text-vintage-accent mt-2 uppercase tracking-widest flex items-center gap-2">
                      <span>ID: {item.section_id}</span>
                      <span className="opacity-30">|</span>
                      <span>PATH: {item.page_path}</span>
                      <span className="opacity-30">|</span>
                      <span className="px-1.5 py-0.5 bg-vintage-ink/10 text-vintage-ink">TYPE: {item.type}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => loadItemIntoForm(item)} 
                    className="text-[10px] font-bold uppercase tracking-widest hover:text-vintage-accent transition-colors flex items-center gap-2 bg-vintage-ink/5 hover:bg-vintage-ink/15 px-3 py-1.5 border border-vintage-ink/15"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id!)} 
                    className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 hover:text-red-600 transition-colors flex items-center gap-2 bg-red-50 hover:bg-red-100 px-3 py-1.5 border border-red-200"
                  >
                    <Trash2 size={14} /> Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SPREADSHEET PASTE MODAL */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vintage-ink/60 backdrop-blur-xs p-4">
          <div className="vintage-card bg-vintage-paper max-w-xl w-full p-6 shadow-2xl border border-vintage-ink space-y-4">
            <div className="flex items-center justify-between border-b border-vintage-ink/20 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-vintage-accent" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-vintage-ink">
                  Import Spreadsheet Cells (TSV)
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setPasteModalOpen(false)}
                className="text-vintage-ink/50 hover:text-vintage-ink p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-vintage-ink/70 font-serif italic leading-relaxed">
              Copy a range of cells directly from Google Sheets or Microsoft Excel (<kbd className="font-mono text-[9px] bg-white px-1.5 py-0.5 border">Ctrl+C</kbd>), then paste them below. The table grid will auto-populate with your columns and rows!
            </p>

            <textarea
              rows={8}
              value={tsvInput}
              onChange={e => setTsvInput(e.target.value)}
              placeholder="Paste tab-separated cells here...&#10;Desktop License	1-5 Users	Standard Rights&#10;Webfont License	50k Views	CSS Embedding"
              className="w-full border border-vintage-ink/25 p-3 font-mono text-xs bg-white outline-none focus:border-vintage-ink"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="firstRowIsHeader"
                checked={firstRowIsHeader}
                onChange={e => setFirstRowIsHeader(e.target.checked)}
                className="cursor-pointer accent-vintage-ink"
              />
              <label htmlFor="firstRowIsHeader" className="text-[10px] font-bold uppercase tracking-wider text-vintage-ink cursor-pointer">
                First row contains column headers
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-vintage-ink/15">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="vintage-btn px-6 py-2.5 text-[9px] border-vintage-ink/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportTSV}
                className="vintage-btn btn-reverse px-6 py-2.5 text-[9px]"
              >
                Parse &amp; Populate Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManager;