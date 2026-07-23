import type { CarBrandModel, Garage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const GARAGES: Garage[] = [
  'Umar Automobiles', 'V.S Car Care', 'Shree Govind Automobile', 'Sarkar Garage',
  'The Engine Room', 'Car Hub', 'D & G Auto Care', 'B.S Autopoint', 'The Mechanic',
  'Car Way Motors', 'Good Luck Automobile', 'New Friends Automobiles and Auto Electrics',
  'S Drive Auto Care', 'Taj Automobile'
].map(name => ({ id: uuidv4(), name }));

export const CAR_BRANDS: CarBrandModel[] = [
  { brand: 'Maruti Suzuki', models: ['Swift', 'Baleno', 'WagonR', 'Alto K10', 'Dzire', 'Ertiga', 'Brezza', 'Celerio', 'Fronx', 'Grand Vitara', 'S-Presso', 'Ignis', 'XL6', 'Eeco', 'Ciaz', 'Other'] },
  { brand: 'Hyundai', models: ['Grand i10 Nios', 'i20', 'Creta', 'Venue', 'Verna', 'Aura', 'Exter', 'Alcazar', 'Tucson', 'Ioniq 5', 'Other'] },
  { brand: 'Tata', models: ['Nexon', 'Punch', 'Altroz', 'Tiago', 'Harrier', 'Safari', 'Tigor', 'Tiago EV', 'Nexon EV', 'Curvv', 'Other'] },
  { brand: 'Mahindra', models: ['XUV300', 'XUV700', 'Scorpio-N', 'Scorpio Classic', 'Thar', 'Thar Roxx', 'Bolero', 'Bolero Neo', 'XUV400', 'Marazzo', 'Other'] },
  { brand: 'Honda', models: ['City', 'Amaze', 'Elevate', 'WR-V', 'City Hybrid', 'Other'] },
  { brand: 'Toyota', models: ['Innova Crysta', 'Innova Hycross', 'Fortuner', 'Glanza', 'Urban Cruiser', 'Hyryder', 'Camry', 'Legender', 'Other'] },
  { brand: 'Kia', models: ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival', 'Other'] },
  { brand: 'Volkswagen', models: ['Polo', 'Vento', 'Taigun', 'Virtus', 'Other'] },
  { brand: 'Skoda', models: ['Rapid', 'Kushaq', 'Slavia', 'Superb', 'Kodiaq', 'Other'] },
  { brand: 'Renault', models: ['Kwid', 'Triber', 'Kiger', 'Other'] },
  { brand: 'Nissan', models: ['Magnite', 'X-Trail', 'Other'] },
  { brand: 'MG', models: ['Hector', 'Astor', 'Comet', 'ZS EV', 'Gloster', 'Other'] },
  { brand: 'Citroen', models: ['C3', 'C3 Aircross', 'eC3', 'Basalt', 'Other'] },
  { brand: 'Jeep', models: ['Compass', 'Meridian', 'Wrangler', 'Other'] },
  { brand: 'Isuzu', models: ['D-Max', 'V-Cross', 'MU-X', 'Other'] },
  { brand: 'Force Motors', models: ['Gurkha', 'Traveller', 'Other'] },
  { brand: 'Datsun', models: ['redi-GO', 'GO', 'GO+', 'Other'] },
  { brand: 'BYD', models: ['Atto 3', 'Seal', 'e6', 'Other'] },
  { brand: 'Mercedes-Benz', models: ['C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'S-Class', 'Other'] },
  { brand: 'BMW', models: ['3 Series', '5 Series', 'X1', 'X3', 'X5', 'X7', 'Other'] },
  { brand: 'Audi', models: ['A4', 'A6', 'Q3', 'Q5', 'Q7', 'Other'] },
  { brand: 'Volvo', models: ['XC40', 'XC60', 'XC90', 'Other'] },
  { brand: 'Land Rover', models: ['Discovery Sport', 'Range Rover Evoque', 'Range Rover Velar', 'Other'] },
  { brand: 'Other', models: ['Other'] }
];

export const PREMIUM_MODELS = [
  'C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'S-Class',
  '3 Series', '5 Series', 'X1', 'X3', 'X5', 'X7',
  'A4', 'A6', 'Q3', 'Q5', 'Q7',
  'XC40', 'XC60', 'XC90',
  'Discovery Sport', 'Range Rover Evoque', 'Range Rover Velar'
];
