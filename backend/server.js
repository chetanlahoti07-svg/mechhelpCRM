import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Force Node to use Google DNS for the MongoDB SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Database Connection ---
// We will connect to MongoDB here once the connection string is provided
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('No MONGODB_URI found. Running in memory/disconnected mode for now.');
}

// --- Mongoose Schema & Model ---
const leadSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  identifier: { type: String, required: true }, // phone, email, etc.
  leadSource: { type: String, required: true },
  carBrand: { type: String, required: true },
  carModel: { type: String, required: true },
  leadType: { type: String, required: true }, // Fresh Lead, Booked, Rescheduled, etc.
  
  // Follow Up
  lastContactedDate: { type: String, required: true },
  nextFollowUpDate: { type: String, required: true },
  
  // Bookings
  bookingDateTime: { type: String }, // Optional
  bookingType: { type: String },
  garageAssigned: { type: String },
  garageNotified: { type: Boolean, default: false },
  bookingHistory: [{
    previousDate: String,
    previousTime: String,
    previousGarage: String,
    newDate: String,
    newTime: String,
    newGarage: String,
    reason: String,
    remarks: String,
    rescheduledBy: String,
    rescheduledOn: String
  }],
  
  // VIP
  isVip: { type: Boolean, default: false }
}, { timestamps: true });

// Convert _id to id in JSON responses
leadSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

const Lead = mongoose.model('Lead', leadSchema);

// --- API Routes ---

// Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Create a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const newLead = new Lead(req.body);
    const savedLead = await newLead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lead', details: error });
  }
});

// Update a lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedLead) return res.status(404).json({ error: 'Lead not found' });
    res.json(updatedLead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead', details: error });
  }
});

// Delete a lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const deletedLead = await Lead.findByIdAndDelete(req.params.id);
    if (!deletedLead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead', details: error });
  }
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
});

export default app;
