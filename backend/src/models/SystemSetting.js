import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'COMPANY_CONFIG' },
    companyName: { type: String, required: true, trim: true, default: 'V Bus Holidays' },
    companyAddress: {
      type: String,
      required: true,
      trim: true,
      default: 'Connecting to City • Central Bus Depot, NH-48 Highway, Transport Nagar',
    },
    companyLogoText: { type: String, trim: true, maxlength: 8, default: 'V-BUS' },
    companyPhone: { type: String, trim: true, default: '+91 98765 43210' },
    currencySymbol: { type: String, trim: true, default: '₹' },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
