import type { Lead, SujalCallListItem } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const LEADS_KEY = 'mechhelp_crm_leads';
const CALL_LIST_KEY = 'mechhelp_crm_call_list';

const useSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to map DB row to Lead interface
const mapDbToLead = (row: any): Lead => ({
  id: row.id,
  customerName: row.customer_name,
  leadSource: row.lead_source,
  identifier: row.identifier,
  carBrand: row.car_brand,
  carModel: row.car_model,
  priority: row.priority,
  leadType: row.lead_type,
  bookingType: row.booking_type,
  garageAssigned: row.garage_assigned,
  bookingDateTime: row.booking_date_time,
  garageNotified: row.garage_notified,
  nextFollowUpDate: row.next_follow_up_date,
  lastContactedDate: row.last_contacted_date,
  isVip: row.is_vip,
  whatsappBroadcast: row.whatsapp_broadcast,
  notes: row.notes || '',
  createdDate: row.created_date,
  bookingHistory: (row.booking_history || []).map((h: any) => ({
    previousDate: h.previous_date,
    previousTime: h.previous_time,
    previousGarage: h.previous_garage,
    newDate: h.new_date,
    newTime: h.new_time,
    newGarage: h.new_garage,
    reason: h.reason,
    remarks: h.remarks,
    rescheduledBy: h.rescheduled_by,
    rescheduledOn: h.rescheduled_on
  })),
  activityHistory: (row.activity_history || []).map((a: any) => ({
    id: a.id,
    timestamp: a.timestamp,
    outcome: a.outcome,
    notes: a.notes
  }))
});

// Helper to map Lead interface to DB row
const mapLeadToDb = (lead: Lead) => ({
  id: lead.id,
  customer_name: lead.customerName,
  lead_source: lead.leadSource,
  identifier: lead.identifier,
  car_brand: lead.carBrand,
  car_model: lead.carModel,
  priority: lead.priority,
  lead_type: lead.leadType,
  booking_type: lead.bookingType,
  garage_assigned: lead.garageAssigned,
  booking_date_time: lead.bookingDateTime,
  garage_notified: lead.garageNotified,
  next_follow_up_date: lead.nextFollowUpDate,
  last_contacted_date: lead.lastContactedDate,
  is_vip: lead.isVip,
  whatsapp_broadcast: lead.whatsappBroadcast,
  notes: lead.notes,
  created_date: lead.createdDate
});

// Helper to map Call List DB row to SujalCallListItem
const mapCallListToDb = (item: SujalCallListItem) => ({
  id: item.id,
  sales_iq_tag: item.salesIqTag,
  priority: item.priority,
  status: item.status,
  linked_lead_id: item.linkedLeadId,
  date_added: item.dateAdded
});

const mapDbToCallList = (row: any): SujalCallListItem => ({
  id: row.id,
  salesIqTag: row.sales_iq_tag,
  priority: row.priority,
  status: row.status,
  linkedLeadId: row.linked_lead_id,
  dateAdded: row.date_added
});

export const LeadService = {
  async getLeads(): Promise<Lead[]> {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          booking_history(*),
          activity_history(*)
        `)
        .order('created_date', { ascending: false });
        
      if (error) throw error;
      return (data || []).map(mapDbToLead);
    } else {
      await delay();
      const data = localStorage.getItem(LEADS_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  async addLead(lead: Omit<Lead, 'id' | 'createdDate' | 'bookingHistory' | 'activityHistory'>): Promise<Lead> {
    const newLeadId = uuidv4();
    const createdDate = new Date().toISOString();
    
    if (useSupabase) {
      const dbLead = {
        id: newLeadId,
        user_id: null, // No auth needed
        customer_name: lead.customerName,
        lead_source: lead.leadSource,
        identifier: lead.identifier,
        car_brand: lead.carBrand,
        car_model: lead.carModel,
        priority: lead.priority,
        lead_type: lead.leadType,
        booking_type: lead.bookingType,
        garage_assigned: lead.garageAssigned,
        booking_date_time: lead.bookingDateTime,
        garage_notified: lead.garageNotified,
        next_follow_up_date: lead.nextFollowUpDate,
        last_contacted_date: lead.lastContactedDate,
        is_vip: lead.isVip,
        whatsapp_broadcast: lead.whatsappBroadcast,
        notes: lead.notes,
        created_date: createdDate
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([dbLead])
        .select(`
          *,
          booking_history(*),
          activity_history(*)
        `)
        .single();
        
      if (error) throw error;
      return mapDbToLead(data);
    } else {
      await delay();
      const leads = await this.getLeads();
      const newLead = {
        ...lead,
        id: newLeadId,
        createdDate,
        bookingHistory: [],
        activityHistory: []
      } as Lead;
      leads.unshift(newLead);
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      return newLead;
    }
  },

  async updateLead(updatedLead: Lead): Promise<Lead> {
    if (useSupabase) {
      // 1. Update the main lead
      const dbLead = mapLeadToDb(updatedLead);
      const { error: leadError } = await supabase
        .from('leads')
        .update(dbLead)
        .eq('id', updatedLead.id);
        
      if (leadError) throw leadError;

      // 2. Sync Booking History (delete old and re-insert or use upsert)
      // For simplicity, we can delete all existing and re-insert the current array.
      const { error: deleteBookingError } = await supabase
        .from('booking_history')
        .delete()
        .eq('lead_id', updatedLead.id);
      if (deleteBookingError) throw deleteBookingError;

      if (updatedLead.bookingHistory && updatedLead.bookingHistory.length > 0) {
        const bookingInserts = updatedLead.bookingHistory.map(h => ({
          lead_id: updatedLead.id,
          previous_date: h.previousDate,
          previous_time: h.previousTime,
          previous_garage: h.previousGarage,
          new_date: h.newDate,
          new_time: h.newTime,
          new_garage: h.newGarage,
          reason: h.reason,
          remarks: h.remarks,
          rescheduled_by: h.rescheduledBy,
          rescheduled_on: h.rescheduledOn
        }));
        const { error: insertBookingError } = await supabase
          .from('booking_history')
          .insert(bookingInserts);
        if (insertBookingError) throw insertBookingError;
      }

      // 3. Sync Activity History
      const { error: deleteActivityError } = await supabase
        .from('activity_history')
        .delete()
        .eq('lead_id', updatedLead.id);
      if (deleteActivityError) throw deleteActivityError;

      if (updatedLead.activityHistory && updatedLead.activityHistory.length > 0) {
        const activityInserts = updatedLead.activityHistory.map(a => ({
          id: a.id || uuidv4(),
          lead_id: updatedLead.id,
          timestamp: a.timestamp,
          outcome: a.outcome,
          notes: a.notes
        }));
        const { error: insertActivityError } = await supabase
          .from('activity_history')
          .insert(activityInserts);
        if (insertActivityError) throw insertActivityError;
      }

      // 4. Fetch the fully updated lead to return
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select(`
          *,
          booking_history(*),
          activity_history(*)
        `)
        .eq('id', updatedLead.id)
        .single();
        
      if (fetchError) throw fetchError;
      return mapDbToLead(data);

    } else {
      await delay();
      const leads = await this.getLeads();
      const index = leads.findIndex(l => l.id === updatedLead.id);
      if (index === -1) throw new Error('Lead not found');
      leads[index] = updatedLead;
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      return updatedLead;
    }
  },

  async deleteLead(id: string): Promise<void> {
    if (useSupabase) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } else {
      await delay();
      const leads = await this.getLeads();
      const filteredLeads = leads.filter(l => l.id !== id);
      localStorage.setItem(LEADS_KEY, JSON.stringify(filteredLeads));
    }
  }
};

export const CallListService = {
  async getItems(): Promise<SujalCallListItem[]> {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('call_list_items')
        .select('*')
        .order('date_added', { ascending: false });
        
      if (error) throw error;
      return (data || []).map(mapDbToCallList);
    } else {
      await delay();
      const data = localStorage.getItem(CALL_LIST_KEY);
      return data ? JSON.parse(data) : [];
    }
  },

  async addItem(item: Omit<SujalCallListItem, 'id' | 'dateAdded'>): Promise<SujalCallListItem> {
    const newItem = {
      ...item,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
    };
    
    if (useSupabase) {
      const { data, error } = await supabase
        .from('call_list_items')
        .insert([mapCallListToDb(newItem)])
        .select()
        .single();
        
      if (error) throw error;
      return mapDbToCallList(data);
    } else {
      await delay();
      const items = await this.getItems();
      items.unshift(newItem);
      localStorage.setItem(CALL_LIST_KEY, JSON.stringify(items));
      return newItem;
    }
  },

  async updateItem(updatedItem: SujalCallListItem): Promise<SujalCallListItem> {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('call_list_items')
        .update(mapCallListToDb(updatedItem))
        .eq('id', updatedItem.id)
        .select()
        .single();
        
      if (error) throw error;
      return mapDbToCallList(data);
    } else {
      await delay();
      const items = await this.getItems();
      const index = items.findIndex(i => i.id === updatedItem.id);
      if (index === -1) throw new Error('Item not found');
      items[index] = updatedItem;
      localStorage.setItem(CALL_LIST_KEY, JSON.stringify(items));
      return updatedItem;
    }
  },
  
  async deleteItem(id: string): Promise<void> {
    if (useSupabase) {
      const { error } = await supabase
        .from('call_list_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } else {
      await delay();
      const items = await this.getItems();
      const filteredItems = items.filter(i => i.id !== id);
      localStorage.setItem(CALL_LIST_KEY, JSON.stringify(filteredItems));
    }
  },

  async rolloverPendingItems(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = localStorage.getItem('lastLoginDate');
    
    if (lastLogin !== today) {
      const items = await this.getItems();
      const itemsToUpdate = items.filter(item => item.status === 'Call Not Received');
      
      if (itemsToUpdate.length > 0) {
        if (useSupabase) {
          await Promise.all(itemsToUpdate.map(item => 
            supabase.from('call_list_items').update({ status: 'Pending' }).eq('id', item.id)
          ));
        } else {
          const updatedItems = items.map(item => {
            if (item.status === 'Call Not Received') {
              return { ...item, status: 'Pending' as const };
            }
            return item;
          });
          localStorage.setItem(CALL_LIST_KEY, JSON.stringify(updatedItems));
        }
      }
      localStorage.setItem('lastLoginDate', today);
    }
  }
};

export const migrateLocalDataToSupabase = async () => {
  if (!useSupabase) return;
  
  const leadsData = localStorage.getItem(LEADS_KEY);
  const callListData = localStorage.getItem(CALL_LIST_KEY);
  
  if (!leadsData && !callListData) return;

  try {
    if (leadsData) {
      const leads: Lead[] = JSON.parse(leadsData);
      
      for (const lead of leads) {
        // We will insert each lead individually to ensure associated history logic works
        // Using upsert logic is safer
        const dbLead = {
          ...mapLeadToDb(lead),
          user_id: null // No auth needed
        };
        
        const { error } = await supabase.from('leads').upsert(dbLead);
        if (error) console.error('Failed to migrate lead:', error);
        
        if (lead.bookingHistory && lead.bookingHistory.length > 0) {
          const bookingInserts = lead.bookingHistory.map(h => ({
            lead_id: lead.id,
            previous_date: h.previousDate,
            previous_time: h.previousTime,
            previous_garage: h.previousGarage,
            new_date: h.newDate,
            new_time: h.newTime,
            new_garage: h.newGarage,
            reason: h.reason,
            remarks: h.remarks,
            rescheduled_by: h.rescheduledBy,
            rescheduled_on: h.rescheduledOn
          }));
          await supabase.from('booking_history').upsert(bookingInserts);
        }
        
        if (lead.activityHistory && lead.activityHistory.length > 0) {
          const activityInserts = lead.activityHistory.map(a => ({
            id: a.id || uuidv4(),
            lead_id: lead.id,
            timestamp: a.timestamp,
            outcome: a.outcome,
            notes: a.notes
          }));
          await supabase.from('activity_history').upsert(activityInserts);
        }
      }
      
      // Rename key so it doesn't run again
      localStorage.setItem(`${LEADS_KEY}_migrated`, leadsData);
      localStorage.removeItem(LEADS_KEY);
    }
    
    if (callListData) {
      const items: SujalCallListItem[] = JSON.parse(callListData);
      const dbItems = items.map(mapCallListToDb);
      
      const { error } = await supabase.from('call_list_items').upsert(dbItems);
      if (error) console.error('Failed to migrate call list:', error);
      else {
        localStorage.setItem(`${CALL_LIST_KEY}_migrated`, callListData);
        localStorage.removeItem(CALL_LIST_KEY);
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};
