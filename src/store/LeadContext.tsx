import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Lead, SujalCallListItem } from '../types';
import { LeadService, CallListService, migrateLocalDataToSupabase } from '../utils/dataLayer';
import { supabase } from '../lib/supabase';

interface LeadContextType {
  leads: Lead[];
  sujalList: SujalCallListItem[];
  addLead: (lead: Omit<Lead, 'id' | 'createdDate' | 'bookingHistory' | 'activityHistory'>) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addSujalItem: (item: Omit<SujalCallListItem, 'id' | 'dateAdded'>) => Promise<void>;
  updateSujalItem: (item: SujalCallListItem) => Promise<void>;
  deleteSujalItem: (id: string) => Promise<void>;
  isLoading: boolean;
  isMigrating: boolean;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

const useSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const LeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sujalList, setSujalList] = useState<SujalCallListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      await CallListService.rolloverPendingItems();
      const [fetchedLeads, fetchedCallList] = await Promise.all([
        LeadService.getLeads(),
        CallListService.getItems()
      ]);
      setLeads(fetchedLeads);
      setSujalList(fetchedCallList);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      if (useSupabase) {
        const hasLocalData = localStorage.getItem('mechhelp_crm_leads');
        if (hasLocalData) {
          setIsMigrating(true);
          try {
            await migrateLocalDataToSupabase();
          } catch (e) {
            console.error("Migration failed", e);
          }
          setIsMigrating(false);
        }
      }
      
      await fetchAllData();
      
      if (useSupabase) {
        const channel = supabase
          .channel(`schema-db-changes-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'call_list_items' }, () => fetchAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_history' }, () => fetchAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_history' }, () => fetchAllData())
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    initialize();
  }, [fetchAllData]);

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdDate' | 'bookingHistory' | 'activityHistory'>) => {
    try {
      const newLead = await LeadService.addLead(leadData);
      setLeads(prev => [newLead, ...prev]);
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead.');
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    try {
      const savedLead = await LeadService.updateLead(updatedLead);
      setLeads(prev => prev.map(l => (l.id === savedLead.id ? savedLead : l)));
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead.');
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await LeadService.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead.');
    }
  };

  const addSujalItem = async (itemData: Omit<SujalCallListItem, 'id' | 'dateAdded'>) => {
    try {
      const newItem = await CallListService.addItem(itemData);
      setSujalList(prev => [newItem, ...prev]);
    } catch (error) {
      console.error('Error adding call list item:', error);
      alert('Failed to add item to call list.');
    }
  };

  const updateSujalItem = async (updatedItem: SujalCallListItem) => {
    try {
      const savedItem = await CallListService.updateItem(updatedItem);
      setSujalList(prev => prev.map(i => (i.id === savedItem.id ? savedItem : i)));
    } catch (error) {
      console.error('Error updating call list item:', error);
      alert('Failed to update call list item.');
    }
  };

  const deleteSujalItem = async (id: string) => {
    try {
      await CallListService.deleteItem(id);
      setSujalList(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting call list item:', error);
      alert('Failed to delete call list item.');
    }
  };

  return (
    <LeadContext.Provider value={{ leads, sujalList, addLead, updateLead, deleteLead, addSujalItem, updateSujalItem, deleteSujalItem, isLoading, isMigrating }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeadContext = () => {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeadContext must be used within a LeadProvider');
  }
  return context;
};
