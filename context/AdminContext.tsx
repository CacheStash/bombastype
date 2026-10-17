/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EditableContentItem {
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

interface EditorModalState {
  isOpen: boolean;
  item: EditableContentItem | null;
  category: string;
  pagePath: string;
  onSaved?: () => void;
}

interface AdminContextType {
  isAdmin: boolean;
  isLiveEditMode: boolean;
  toggleLiveEditMode: () => void;
  setLiveEditMode: (val: boolean) => void;
  openEditorModal: (
    item: EditableContentItem | null,
    category: string,
    pagePath: string,
    onSaved?: () => void
  ) => void;
  closeEditorModal: () => void;
  editorModalState: EditorModalState;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLiveEditMode, setIsLiveEditMode] = useState(() => {
    try {
      return sessionStorage.getItem('admin_live_edit_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [editorModalState, setEditorModalState] = useState<EditorModalState>({
    isOpen: false,
    item: null,
    category: '',
    pagePath: ''
  });

  useEffect(() => {
    const checkAdmin = async (user: any) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('fontadmin')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdmin(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleLiveEditMode = () => {
    setIsLiveEditMode(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('admin_live_edit_mode', String(next));
      } catch {}
      return next;
    });
  };

  const setLiveEditMode = (val: boolean) => {
    setIsLiveEditMode(val);
    try {
      sessionStorage.setItem('admin_live_edit_mode', String(val));
    } catch {}
  };

  const openEditorModal = (
    item: EditableContentItem | null,
    category: string,
    pagePath: string,
    onSaved?: () => void
  ) => {
    setEditorModalState({
      isOpen: true,
      item,
      category,
      pagePath,
      onSaved
    });
  };

  const closeEditorModal = () => {
    setEditorModalState(prev => ({
      ...prev,
      isOpen: false,
      item: null
    }));
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isLiveEditMode,
        toggleLiveEditMode,
        setLiveEditMode,
        openEditorModal,
        closeEditorModal,
        editorModalState
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
