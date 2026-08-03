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
      // Attempt to resolve garage_id from the garage_assigned text at creation time.
      // This ensures new bookings are immediately settlement-ready without needing
      // the finalize API's fallback lookup.
      let garageId: string | null = null;
      if (lead.garageAssigned) {
        const { data: garageMatch } = await supabase
          .from('garages')
          .select('id')
          .ilike('name', lead.garageAssigned.trim())
          .maybeSingle();
        if (garageMatch) garageId = garageMatch.id;
      }

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
        garage_id: garageId,
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
      // 1. Resolve garage_id from garage_assigned text (keeps it in sync if garage changes on reschedule)
      let garageId: string | null = null;
      if (updatedLead.garageAssigned) {
        const { data: garageMatch } = await supabase
          .from('garages')
          .select('id')
          .ilike('name', updatedLead.garageAssigned.trim())
          .maybeSingle();
        if (garageMatch) garageId = garageMatch.id;
      }

      // 2. Update the main lead (including garage_id)
      const dbLead = { ...mapLeadToDb(updatedLead), garage_id: garageId };
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

// Settlement and Billing Data Access Layer
import { calculateSettlement } from '../../shared/settlementCalculator';

const BILLING_KEY = 'mechhelp_crm_billing';
const LINE_ITEMS_KEY = 'mechhelp_crm_line_items';
const SETTLEMENTS_KEY = 'mechhelp_crm_settlements';

export const MOCK_GARAGES = [
  { id: 'g1', name: 'Umar Automobiles' },
  { id: 'g2', name: 'V.S Car Care' },
  { id: 'g3', name: 'Shree Govind Automobile' },
  { id: 'g4', name: 'Sarkar Garage' },
  { id: 'g5', name: 'The Engine Room' },
  { id: 'g6', name: 'Car Hub' },
  { id: 'g7', name: 'D & G Auto Care' },
  { id: 'g8', name: 'B.S Autopoint' },
  { id: 'g9', name: 'The Mechanic' },
  { id: 'g10', name: 'Car Way Motors' },
  { id: 'g11', name: 'Good Luck Automobile' },
  { id: 'g12', name: 'New Friends Automobiles and Auto Electrics' },
  { id: 'g13', name: 'S-Drive Auto Care' },
  { id: 'g14', name: 'Shivaji Motors' },
  { id: 'g15', name: 'Fulsunge Automobiles' },
  { id: 'g16', name: 'Moving Wheels Car Garage' },
  { id: 'g17', name: 'Taj Automobiles' },
  { id: 'g18', name: 'Rathi Autoworks' }
];

export const SettlementService = {
  async finalizeBilling(
    bookingId: string,
    lineItems: any[],
    paidTo: 'garage' | 'mechhelp'
  ): Promise<any> {
    if (useSupabase) {
      // 1. Fetch the lead to get garage details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, garage_id, garage_assigned, customer_name')
        .eq('id', bookingId)
        .maybeSingle();

      if (leadError) throw leadError;
      if (!lead) throw new Error('Booking not found.');

      // 2. Resolve garage_id — fallback to name lookup if null
      let resolvedGarageId: string | null = lead.garage_id ?? null;

      if (!resolvedGarageId && lead.garage_assigned) {
        const { data: garageByName, error: gnErr } = await supabase
          .from('garages')
          .select('id')
          .ilike('name', lead.garage_assigned.trim())
          .maybeSingle();
        if (gnErr) throw gnErr;
        if (garageByName) {
          resolvedGarageId = garageByName.id;
          // Patch garage_id back for future calls
          await supabase.from('leads').update({ garage_id: resolvedGarageId }).eq('id', bookingId);
        }
      }

      if (!resolvedGarageId) {
        const name = lead.garage_assigned || '(none)';
        throw new Error(`Booking garage "${name}" could not be matched to a known garage. Please check the garage name or re-assign the booking before completing it.`);
      }

      // 3. Prevent double billing
      const { data: existingBilling, error: billCheckErr } = await supabase
        .from('booking_billing')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (billCheckErr) throw billCheckErr;
      if (existingBilling) throw new Error('Billing is already finalized for this booking.');

      // 4. Compute totals
      const calcResult = calculateSettlement(
        lineItems.map(item => ({
          name: item.name,
          amount: Number(item.amount) || 0,
          splitEnabled: !!item.splitEnabled,
          mechhelpPct: Number(item.mechhelpPct) ?? 20,
          garagePct: Number(item.garagePct) ?? 80,
        })),
        paidTo
      );

      // 5. Create booking_billing
      const { data: billing, error: billingErr } = await supabase
        .from('booking_billing')
        .insert({
          booking_id: bookingId,
          lead_id: bookingId,
          garage_id: resolvedGarageId,
          total_amount: calcResult.totalAmount,
          paid_to: paidTo,
          status: 'finalized',
        })
        .select('*')
        .single();
      if (billingErr) throw billingErr;

      // 6. Create billing_line_items
      if (lineItems.length > 0) {
        const { error: liErr } = await supabase.from('billing_line_items').insert(
          lineItems.map(item => ({
            billing_id: billing.id,
            name: item.name,
            amount: Number(item.amount) || 0,
            split_enabled: !!item.splitEnabled,
            mechhelp_pct: Number(item.mechhelpPct) ?? 20,
            garage_pct: Number(item.garagePct) ?? 80,
          }))
        );
        if (liErr) throw liErr;
      }

      // 7. Create garage_settlements row if total > 0 (skip ₹0 / free-service bookings)
      if (calcResult.totalAmount > 0) {
        const { error: settlErr } = await supabase.from('garage_settlements').insert({
          garage_id: resolvedGarageId,
          billing_id: billing.id,
          lead_id: bookingId,
          net_amount: calcResult.netAmount,
          settled: false,
        });
        if (settlErr) throw settlErr;
      }

      // 8. Mark lead as Completed
      const { error: updateErr } = await supabase
        .from('leads')
        .update({ lead_type: 'Completed' })
        .eq('id', bookingId);
      if (updateErr) throw updateErr;

      return { success: true, billing, calculations: calcResult };

    } else {
      await delay();
      
      // Get lead details
      const leads = await LeadService.getLeads();
      const leadIndex = leads.findIndex(l => l.id === bookingId);
      if (leadIndex === -1) throw new Error('Booking not found');
      
      const lead = leads[leadIndex];
      const garageName = lead.garageAssigned || '';

      // Match mock garage
      const matchedGarage = MOCK_GARAGES.find(
        g => g.name.toLowerCase().trim() === garageName.toLowerCase().trim()
      ) || MOCK_GARAGES[0];

      // Prevent double billing
      const billingsData = localStorage.getItem(BILLING_KEY);
      const billings: any[] = billingsData ? JSON.parse(billingsData) : [];
      if (billings.some(b => b.bookingId === bookingId)) {
        throw new Error('Billing is already finalized for this booking.');
      }

      // Calculate totals
      const calcResult = calculateSettlement(
        lineItems.map(item => ({
          name: item.name,
          amount: Number(item.amount) || 0,
          splitEnabled: !!item.splitEnabled,
          mechhelpPct: Number(item.mechhelpPct) ?? 20,
          garagePct: Number(item.garagePct) ?? 80,
        })),
        paidTo
      );

      // Create booking billing
      const billingId = uuidv4();
      const newBilling = {
        id: billingId,
        bookingId,
        leadId: bookingId,
        garageId: matchedGarage.id,
        totalAmount: calcResult.totalAmount,
        paidTo,
        status: 'finalized' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create line items
      const lineItemsData = localStorage.getItem(LINE_ITEMS_KEY);
      const existingLineItems: any[] = lineItemsData ? JSON.parse(lineItemsData) : [];
      const newLineItems = lineItems.map(item => ({
        id: uuidv4(),
        billingId,
        name: item.name,
        amount: Number(item.amount) || 0,
        splitEnabled: !!item.splitEnabled,
        mechhelpPct: Number(item.mechhelpPct) ?? 20,
        garagePct: Number(item.garagePct) ?? 80,
        createdAt: new Date().toISOString()
      }));

      // Create garage settlement
      const settlementsData = localStorage.getItem(SETTLEMENTS_KEY);
      const settlements: any[] = settlementsData ? JSON.parse(settlementsData) : [];

      if (calcResult.totalAmount > 0) {
        const newSettlement = {
          id: uuidv4(),
          garageId: matchedGarage.id,
          billingId,
          leadId: bookingId,
          netAmount: calcResult.netAmount,
          settled: false,
          createdAt: new Date().toISOString()
        };
        settlements.unshift(newSettlement);
        localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
      }

      // Save billing & line items
      billings.unshift(newBilling);
      localStorage.setItem(BILLING_KEY, JSON.stringify(billings));
      localStorage.setItem(LINE_ITEMS_KEY, JSON.stringify([...newLineItems, ...existingLineItems]));

      // Update Lead Status to Completed
      lead.leadType = 'Completed';
      lead.garageAssigned = matchedGarage.name;
      leads[leadIndex] = lead;
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));

      return {
        success: true,
        billing: newBilling,
        calculations: calcResult
      };
    }
  },

  async getGaragesWithBalances(): Promise<any[]> {
    if (useSupabase) {
      // Fetch all garages
      const { data: garages, error: garagesErr } = await supabase
        .from('garages')
        .select('id, name')
        .order('name', { ascending: true });
      if (garagesErr) throw garagesErr;

      // Fetch all unsettled settlements to compute balances
      const { data: unsettled, error: settlErr } = await supabase
        .from('garage_settlements')
        .select('garage_id, net_amount')
        .eq('settled', false);
      if (settlErr) throw settlErr;

      const balancesMap = new Map<string, number>();
      (unsettled || []).forEach((row: any) => {
        const current = balancesMap.get(row.garage_id) || 0;
        balancesMap.set(row.garage_id, current + Number(row.net_amount));
      });

      return (garages || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        balance: Math.round((balancesMap.get(g.id) || 0) * 100) / 100,
      }));

    } else {
      await delay();

      const settlementsData = localStorage.getItem(SETTLEMENTS_KEY);
      const settlements: any[] = settlementsData ? JSON.parse(settlementsData) : [];

      // Calculate balances
      const balancesMap = new Map<string, number>();
      settlements.forEach(s => {
        if (!s.settled) {
          const current = balancesMap.get(s.garageId) || 0;
          balancesMap.set(s.garageId, current + Number(s.netAmount));
        }
      });

      return MOCK_GARAGES.map(g => ({
        id: g.id,
        name: g.name,
        balance: Math.round((balancesMap.get(g.id) || 0) * 100) / 100
      }));
    }
  },

  async getGarageSettlements(garageId: string): Promise<any> {
    if (useSupabase) {
      // Confirm garage exists
      const { data: garage, error: garageErr } = await supabase
        .from('garages')
        .select('id, name')
        .eq('id', garageId)
        .maybeSingle();
      if (garageErr) throw garageErr;
      if (!garage) throw new Error('Garage not found');

      // Fetch settlements with joined lead and billing details
      const { data: settlements, error: settlErr } = await supabase
        .from('garage_settlements')
        .select(`
          id,
          net_amount,
          settled,
          settled_at,
          created_at,
          leads (
            id,
            customer_name,
            booking_date_time,
            car_brand,
            car_model
          ),
          booking_billing (
            id,
            total_amount,
            paid_to,
            status,
            billing_line_items (
              id,
              name,
              amount,
              split_enabled,
              mechhelp_pct,
              garage_pct
            )
          )
        `)
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });
      if (settlErr) throw settlErr;

      let balance = 0;
      const formattedSettlements = (settlements || []).map((row: any) => {
        const isSettled = !!row.settled;
        const netAmount = Number(row.net_amount) || 0;
        if (!isSettled) balance += netAmount;

        return {
          id: row.id,
          netAmount,
          settled: isSettled,
          settledAt: row.settled_at,
          createdAt: row.created_at,
          customerName: row.leads?.customer_name || 'Unknown Customer',
          bookingDate: row.leads?.booking_date_time || row.created_at,
          carBrand: row.leads?.car_brand || '',
          carModel: row.leads?.car_model || '',
          billing: row.booking_billing ? {
            id: row.booking_billing.id,
            totalAmount: Number(row.booking_billing.total_amount),
            paidTo: row.booking_billing.paid_to,
            status: row.booking_billing.status,
            lineItems: (row.booking_billing.billing_line_items || []).map((item: any) => ({
              id: item.id,
              name: item.name,
              amount: Number(item.amount),
              splitEnabled: !!item.split_enabled,
              mechhelpPct: Number(item.mechhelp_pct),
              garagePct: Number(item.garage_pct)
            }))
          } : null
        };
      });

      return {
        garage,
        balance: Math.round(balance * 100) / 100,
        settlements: formattedSettlements
      };

    } else {
      await delay();

      // Find mock garage name
      const garage = MOCK_GARAGES.find(g => g.id === garageId);
      if (!garage) throw new Error('Garage not found');

      // Fetch local database structures
      const settlementsData = localStorage.getItem(SETTLEMENTS_KEY);
      const settlements: any[] = settlementsData ? JSON.parse(settlementsData) : [];

      const billingsData = localStorage.getItem(BILLING_KEY);
      const billings: any[] = billingsData ? JSON.parse(billingsData) : [];

      const lineItemsData = localStorage.getItem(LINE_ITEMS_KEY);
      const lineItems: any[] = lineItemsData ? JSON.parse(lineItemsData) : [];

      const leads = await LeadService.getLeads();

      const garageSettlements = settlements
        .filter(s => s.garageId === garageId)
        .map(s => {
          const billing = billings.find(b => b.id === s.billingId);
          const lead = leads.find(l => l.id === s.leadId);
          const billingLineItems = lineItems.filter(li => li.billingId === s.billingId);

          return {
            id: s.id,
            netAmount: Number(s.netAmount),
            settled: !!s.settled,
            settledAt: s.settledAt,
            createdAt: s.createdAt,
            customerName: lead?.customerName || 'Unknown Customer',
            bookingDate: lead?.bookingDateTime || s.createdAt,
            carBrand: lead?.carBrand || '',
            carModel: lead?.carModel || '',
            billing: billing ? {
              id: billing.id,
              totalAmount: Number(billing.totalAmount),
              paidTo: billing.paidTo,
              status: billing.status,
              lineItems: billingLineItems.map(li => ({
                id: li.id,
                name: li.name,
                amount: Number(li.amount),
                splitEnabled: !!li.splitEnabled,
                mechhelpPct: Number(li.mechhelpPct),
                garagePct: Number(li.garagePct)
              }))
            } : null
          };
        });

      // Compute balance
      const balance = garageSettlements
        .filter(s => !s.settled)
        .reduce((sum, s) => sum + s.netAmount, 0);

      return {
        garage,
        balance: Math.round(balance * 100) / 100,
        settlements: garageSettlements
      };
    }
  },

  async settleGarage(garageId: string): Promise<any> {
    if (useSupabase) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('garage_settlements')
        .update({ settled: true, settled_at: now })
        .eq('garage_id', garageId)
        .eq('settled', false)
        .select('*');
      if (error) throw error;

      return { success: true, count: data?.length || 0 };

    } else {
      await delay();

      const settlementsData = localStorage.getItem(SETTLEMENTS_KEY);
      const settlements: any[] = settlementsData ? JSON.parse(settlementsData) : [];

      let count = 0;
      const updatedSettlements = settlements.map(s => {
        if (s.garageId === garageId && !s.settled) {
          count++;
          return {
            ...s,
            settled: true,
            settledAt: new Date().toISOString()
          };
        }
        return s;
      });

      localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(updatedSettlements));

      return {
        success: true,
        count
      };
    }
  }
};

