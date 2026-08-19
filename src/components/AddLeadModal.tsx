import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Lead, LeadSource, LeadType, BookingType, Priority, CarBrandModel } from '../types';
import { CAR_BRANDS, PREMIUM_MODELS } from '../data/seed';
import { useLeadContext } from '../store/LeadContext';
import './AddLeadModal.css';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Lead>;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, initialData }) => {
  const { addLead, updateLead, getGarageList } = useLeadContext();
  const isEditing = !!initialData?.id;

  const [leadSource, setLeadSource] = useState<LeadSource>(initialData?.leadSource || 'SalesIQ');
  const [identifier, setIdentifier] = useState(initialData?.identifier || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [carBrand, setCarBrand] = useState(initialData?.carBrand || '');
  const [carModel, setCarModel] = useState(initialData?.carModel || '');
  const [numberPlate, setNumberPlate] = useState(initialData?.numberPlate || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'Medium');
  const [leadType, setLeadType] = useState<LeadType>(initialData?.leadType || 'Fresh Lead');
  const [retargetTimeSlot, setRetargetTimeSlot] = useState<'morning' | 'evening' | null>(initialData?.retargetTimeSlot || null);
  
  const [bookingType, setBookingType] = useState<BookingType | undefined>(initialData?.bookingType);
  const [garageAssigned, setGarageAssigned] = useState(initialData?.garageAssigned || '');
  const [bookingDateTime, setBookingDateTime] = useState(initialData?.bookingDateTime ? initialData.bookingDateTime.split('T')[0] : '');

  const [garageList, setGarageList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      getGarageList()
        .then(list => setGarageList(list))
        .catch(err => console.error('Failed to load garages in AddLeadModal:', err));
    }
  }, [isOpen]);

  
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    initialData?.nextFollowUpDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isVip, setIsVip] = useState(initialData?.isVip || false);
  const [whatsappBroadcast, setWhatsappBroadcast] = useState(initialData?.whatsappBroadcast || false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [localCarBrands, setLocalCarBrands] = useState<CarBrandModel[]>(() => {
    const saved = localStorage.getItem('mechhelp_custom_car_brands');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return CAR_BRANDS;
      }
    }
    return CAR_BRANDS;
  });

  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');

  // Auto-VIP logic
  useEffect(() => {
    const actualModel = carModel === 'custom_model' ? customModel : carModel;
    if (actualModel && PREMIUM_MODELS.includes(actualModel) && !isEditing) {
      setIsVip(true);
    }
  }, [carModel, customModel, isEditing]);

  // Reset form when opening in Create mode, or populate when opening in Edit mode
  useEffect(() => {
    if (isOpen) {
      if (!initialData?.id) {
        // Create mode: Reset all fields to defaults
        setLeadSource('SalesIQ');
        setIdentifier('');
        setCustomerName('');
        setCarBrand('');
        setCarModel('');
        setNumberPlate('');
        setPriority('Medium');
        setLeadType('Fresh Lead');
        setRetargetTimeSlot(null);
        setBookingType(undefined);
        setGarageAssigned('');
        setBookingDateTime('');
        setNextFollowUpDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setIsVip(false);
        setWhatsappBroadcast(false);
        setCustomBrand('');
        setCustomModel('');
        setErrors({});
      } else {
        // Edit mode: Populate from initialData
        setLeadSource(initialData.leadSource || 'SalesIQ');
        setIdentifier(initialData.identifier || '');
        setCustomerName(initialData.customerName || '');
        setCarBrand(initialData.carBrand || '');
        setCarModel(initialData.carModel || '');
        setNumberPlate(initialData.numberPlate || '');
        setPriority(initialData.priority || 'Medium');
        setLeadType(initialData.leadType || 'Fresh Lead');
        setRetargetTimeSlot(initialData.retargetTimeSlot || null);
        setBookingType(initialData.bookingType);
        setGarageAssigned(initialData.garageAssigned || '');
        setBookingDateTime(initialData.bookingDateTime ? initialData.bookingDateTime.split('T')[0] : '');
        setNextFollowUpDate(initialData.nextFollowUpDate || new Date().toISOString().split('T')[0]);
        setNotes(initialData.notes || '');
        setIsVip(initialData.isVip || false);
        setWhatsappBroadcast(initialData.whatsappBroadcast || false);
        setCustomBrand('');
        setCustomModel('');
        setErrors({});
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors: Record<string, string> = {};

    if (leadSource === 'SalesIQ' && !identifier.trim()) {
      newErrors.identifier = "SalesIQ Tag is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(`field-${firstErrorKey}`);
      if (errorElement) {
        const formGroup = errorElement.closest('.form-group') || errorElement;
        const modalBody = document.querySelector('.modal-body');
        
        if (modalBody) {
          const elementRect = formGroup.getBoundingClientRect();
          const bodyRect = modalBody.getBoundingClientRect();
          
          const targetScrollTop = modalBody.scrollTop + (elementRect.top - bodyRect.top) - 20;
          
          modalBody.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        } else {
          formGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        errorElement.focus({ preventScroll: true });
      }
      return;
    }

    const finalCarBrand = carBrand === 'custom_brand' ? customBrand.trim() : carBrand;
    const finalCarModel = carModel === 'custom_model' ? customModel.trim() : carModel;

    if (carBrand === 'custom_brand' || carModel === 'custom_model') {
      const updatedBrands = [...localCarBrands];
      const brandIndex = updatedBrands.findIndex(b => b.brand === finalCarBrand);
      
      if (brandIndex >= 0) {
        if (carModel === 'custom_model' && !updatedBrands[brandIndex].models.includes(finalCarModel)) {
          updatedBrands[brandIndex].models.push(finalCarModel);
        }
      } else {
        updatedBrands.push({
          brand: finalCarBrand,
          models: [finalCarModel]
        });
      }
      
      setLocalCarBrands(updatedBrands);
      localStorage.setItem('mechhelp_custom_car_brands', JSON.stringify(updatedBrands));
    }

    const lead: Lead = {
      id: isEditing ? initialData!.id! : uuidv4(),
      customerName,
      leadSource,
      identifier,
      carBrand: finalCarBrand,
      carModel: finalCarModel,
      priority,
      leadType,
      bookingType: leadType === 'Booked' ? bookingType : undefined,
      garageAssigned: leadType === 'Booked' ? garageAssigned : undefined,
      bookingDateTime: leadType === 'Booked' ? bookingDateTime : undefined,
      garageNotified: isEditing ? !!initialData?.garageNotified : false,
      nextFollowUpDate,
      lastContactedDate: isEditing ? initialData!.lastContactedDate! : new Date().toISOString(),
      isVip,
      whatsappBroadcast,
      retargetTimeSlot: leadType === 'Retarget' ? retargetTimeSlot : null,
      detailsSharedAt: leadType === 'Details Shared'
        ? (isEditing && initialData?.leadType === 'Details Shared' && initialData?.detailsSharedAt
            ? initialData.detailsSharedAt
            : new Date().toISOString())
        : null,
      numberPlate: numberPlate.trim() || undefined,
      notes,
      createdDate: isEditing ? initialData!.createdDate! : new Date().toISOString(),
    };

    if (isEditing) {
      updateLead(lead);
    } else {
      addLead(lead);
    }
    onClose();
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content surface-panel animate-fade-in">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form-wrapper" noValidate>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input 
                  id="field-customerName"
                  type="text" 
                  className={`form-input ${errors.customerName ? 'is-invalid' : ''}`} 
                  value={customerName} 
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors(prev => ({...prev, customerName: ''}));
                  }} 
                />
                {errors.customerName && <div className="invalid-feedback">{errors.customerName}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select 
                  className="form-select" 
                  value={leadSource} 
                  onChange={e => {
                    setLeadSource(e.target.value as LeadSource);
                    setIdentifier('');
                    if (errors.identifier) setErrors(prev => ({...prev, identifier: ''}));
                  }}
                >
                  <option value="SalesIQ">SalesIQ</option>
                  <option value="Direct Call">Direct Call</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {leadSource === 'SalesIQ' ? 'SalesIQ Tag (Required)' : 'Last 4 Digits of Phone'}
              </label>
              <input 
                id="field-identifier"
                type="text" 
                className={`form-input ${errors.identifier ? 'is-invalid' : ''}`} 
                maxLength={leadSource === 'SalesIQ' ? 50 : 4}
                value={identifier} 
                onChange={e => {
                  const val = e.target.value;
                  if (leadSource !== 'SalesIQ' && !/^\d{0,4}$/.test(val)) return;
                  setIdentifier(val);
                  if (errors.identifier) setErrors(prev => ({...prev, identifier: ''}));
                }} 
              />
              {errors.identifier && <div className="invalid-feedback">{errors.identifier}</div>}
              {leadSource !== 'SalesIQ' && !errors.identifier && <small className="text-muted text-xs mt-1">Do not enter full phone numbers. Privacy rule enforced.</small>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Car Brand</label>
                <select 
                  id="field-carBrand"
                  className={`form-select ${errors.carBrand ? 'is-invalid' : ''}`} 
                  value={carBrand} 
                  onChange={e => { 
                    setCarBrand(e.target.value); 
                    setCarModel(''); 
                    if (errors.carBrand) setErrors(prev => ({...prev, carBrand: ''}));
                  }}
                >
                  <option value="">Select Brand...</option>
                  {localCarBrands.filter(b => b.brand !== 'Other').map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
                  <option value="custom_brand">➕ Type Brand Manually</option>
                </select>
                {carBrand === 'custom_brand' && (
                  <input
                    type="text"
                    className="form-input mt-2"
                    placeholder="Enter custom brand..."
                    value={customBrand}
                    onChange={e => setCustomBrand(e.target.value)}
                  />
                )}
                {errors.carBrand && <div className="invalid-feedback">{errors.carBrand}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Car Model</label>
                <select 
                  id="field-carModel"
                  className={`form-select ${errors.carModel ? 'is-invalid' : ''}`} 
                  value={carModel} 
                  onChange={e => {
                    setCarModel(e.target.value);
                    if (errors.carModel) setErrors(prev => ({...prev, carModel: ''}));
                  }} 
                  disabled={!carBrand || carBrand === 'custom_brand'}
                >
                  <option value="">Select Model...</option>
                  {carBrand && carBrand !== 'custom_brand' && (
                    <>
                      {localCarBrands.find(b => b.brand === carBrand)?.models.filter(m => m !== 'Other').map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </>
                  )}
                  <option value="custom_model">➕ Type Model Manually</option>
                </select>
                {(carModel === 'custom_model' || carBrand === 'custom_brand') && (
                  <input
                    type="text"
                    className="form-input mt-2"
                    placeholder="Enter custom model..."
                    value={customModel}
                    onChange={e => setCustomModel(e.target.value)}
                  />
                )}
                {errors.carModel && <div className="invalid-feedback">{errors.carModel}</div>}
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Number Plate</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MH12AB1234"
                value={numberPlate}
                onChange={e => setNumberPlate(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead Type / Stage</label>
                <select className="form-select" value={leadType} onChange={e => {
                  const newType = e.target.value as LeadType;
                  setLeadType(newType);
                  if (newType !== 'Retarget') setRetargetTimeSlot(null);
                }}>
                  {['Fresh Lead', 'Call Not Received', 'Details Shared', 'Retarget', 'Booked', 'Completed', 'Lost'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {leadType === 'Retarget' && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Slot:</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${retargetTimeSlot === 'morning' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '16px' }}
                      onClick={() => setRetargetTimeSlot(retargetTimeSlot === 'morning' ? null : 'morning')}
                    >
                      ☀️ Morning
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${retargetTimeSlot === 'evening' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '16px' }}
                      onClick={() => setRetargetTimeSlot(retargetTimeSlot === 'evening' ? null : 'evening')}
                    >
                      🌙 Evening
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Next Follow-up Date</label>
              <input 
                id="field-nextFollowUpDate"
                type="date" 
                className={`form-input ${errors.nextFollowUpDate ? 'is-invalid' : ''}`} 
                value={nextFollowUpDate} 
                onChange={e => {
                  setNextFollowUpDate(e.target.value);
                  if (errors.nextFollowUpDate) setErrors(prev => ({...prev, nextFollowUpDate: ''}));
                }} 
              />
              {errors.nextFollowUpDate && <div className="invalid-feedback">{errors.nextFollowUpDate}</div>}
            </div>

            {leadType === 'Booked' && (
              <div className="booking-section p-4 rounded-md bg-opacity-10 bg-accent-glow mb-4 border border-accent-glow">
                <h4 className="mb-3 text-sm font-semibold text-accent-primary">Booking Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Booking Type</label>
                    <select 
                      id="field-bookingType"
                      className={`form-select ${errors.bookingType ? 'is-invalid' : ''}`} 
                      value={bookingType || ''} 
                      onChange={e => {
                        setBookingType(e.target.value as BookingType);
                        if (errors.bookingType) setErrors(prev => ({...prev, bookingType: ''}));
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Garage Visit">Garage Visit</option>
                    </select>
                    {errors.bookingType && <div className="invalid-feedback">{errors.bookingType}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Garage Assigned</label>
                    <select 
                      id="field-garageAssigned"
                      className={`form-select ${errors.garageAssigned ? 'is-invalid' : ''}`} 
                      value={garageAssigned} 
                      onChange={e => {
                        setGarageAssigned(e.target.value);
                        if (errors.garageAssigned) setErrors(prev => ({...prev, garageAssigned: ''}));
                      }}
                    >
                      <option value="">Select Garage...</option>
                      {garageAssigned && !garageList.some(g => g.name === garageAssigned) && (
                        <option value={garageAssigned}>{garageAssigned} (Archived)</option>
                      )}
                      {garageList.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                    {errors.garageAssigned && <div className="invalid-feedback">{errors.garageAssigned}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Booking Date</label>
                  <input 
                    id="field-bookingDateTime"
                    type="date" 
                    className={`form-input ${errors.bookingDateTime ? 'is-invalid' : ''}`} 
                    value={bookingDateTime} 
                    onChange={e => {
                      setBookingDateTime(e.target.value);
                      if (errors.bookingDateTime) setErrors(prev => ({...prev, bookingDateTime: ''}));
                    }} 
                  />
                  {errors.bookingDateTime && <div className="invalid-feedback">{errors.bookingDateTime}</div>}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
            </div>

            <div className="form-row flags-row">
              <label className="flag-label">
                <input type="checkbox" className="form-checkbox" checked={isVip} onChange={e => setIsVip(e.target.checked)} />
                VIP / Premium Customer
              </label>
              <label className="flag-label">
                <input type="checkbox" className="form-checkbox" checked={whatsappBroadcast} onChange={e => setWhatsappBroadcast(e.target.checked)} />
                Add to WhatsApp Broadcast
              </label>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Lead'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
