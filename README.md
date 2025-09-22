# Nabha Rural Healthcare Telemedicine Platform

A comprehensive telemedicine platform designed to address healthcare challenges in rural Punjab, specifically serving Nabha and its surrounding 173 villages.

## Problem Statement

Nabha Civil Hospital operates at less than 50% staff capacity with only 11 doctors for 23 sanctioned posts. Patients from 173 villages face:
- Long travel distances for healthcare
- Unavailable specialists and medicine shortages
- Financial strain from missed work days
- Poor road conditions hindering access

## Solution Features

- **Multilingual Telemedicine**: Video consultations in Punjabi, Hindi, and English
- **Offline Digital Records**: Health records accessible in low-connectivity areas
- **Medicine Availability Tracker**: Real-time pharmacy inventory updates
- **AI Symptom Checker**: Low-bandwidth optimized preliminary diagnosis
- **Scalable Platform**: Designed for expansion across rural India

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Static hosting ready

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nabha-healthcare-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Deployment to Vercel

This project is optimized for Vercel deployment:

1. **Automatic Deployment**: Connect your GitHub repository to Vercel for automatic deployments
2. **Manual Deployment**: Use Vercel CLI
   ```bash
   npm install -g vercel
   vercel --prod
   ```
3. **Build Configuration**: The project includes `vercel.json` for proper SPA routing
4. **Environment Variables**: No additional environment variables needed for basic functionality

## Project Structure

```
src/
├── components/
│   ├── Header.tsx          # Navigation header with mobile menu
│   ├── Hero.tsx            # Landing section with key metrics
│   ├── ProblemStatement.tsx # Healthcare challenges overview
│   ├── Solution.tsx        # Platform features showcase
│   ├── Impact.tsx          # Expected outcomes and benefits
│   ├── Footer.tsx          # Contact info and links
│   ├── auth/               # Authentication components
│   ├── dashboards/         # Role-based dashboards
│   └── modals/             # Prescription and view modals
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
├── services/
│   ├── authService.ts      # User authentication logic
│   └── prescriptionService.ts # Prescription management
├── types/
│   ├── auth.ts             # Authentication type definitions
│   └── prescription.ts     # Prescription type definitions
├── App.tsx                 # Main application component
├── main.tsx               # Application entry point
└── index.css              # Global styles and Tailwind imports
```

## New Features Added

### Prescription Management System
- **Doctor Features**:
  - Complete appointments with prescription creation
  - Add multiple medicines with dosage, frequency, and instructions
  - View all created prescriptions
  - Set follow-up dates and additional notes

- **Patient Features**:
  - View all prescriptions with detailed medicine information
  - Access complete health records
  - Track medicine reminders based on prescriptions
  - Print prescriptions for offline use

### Enhanced Dashboards
- **Real-time Data**: Dashboards now show actual appointment and prescription data
- **Interactive Elements**: Complete appointments, view prescriptions, manage health records
- **Status Tracking**: Track appointment status from scheduled to completed
- **Medicine Management**: Automatic medicine tracking from prescriptions

### Vercel Deployment Ready
- **SPA Routing**: Proper client-side routing configuration
- **Security Headers**: Added security headers for production
- **Build Optimization**: TypeScript compilation and Vite build process
- **Static Asset Handling**: Optimized for static hosting

## Key Statistics

- **173 villages** served by Nabha Civil Hospital
- **52% doctor shortage** (11 out of 23 sanctioned posts)
- **31% internet access** in rural Punjab households
- **31% CAGR** telemedicine growth in India (2020-2025)

## Expected Impact

- 75% reduction in travel time for healthcare
- ₹1,200 average monthly savings per family
- 50,000+ rural residents with improved access
- 40% improvement in early diagnosis

## Contributing

This platform is designed to be scalable and adaptable for other rural regions in India. Contributions are welcome to enhance features, improve accessibility, and expand language support.

## License

This project is developed for social impact and rural healthcare improvement.

## Contact

For more information about implementing this solution:
- **Location**: Nabha, Patiala District, Punjab, India
- **Focus**: Rural healthcare technology solutions
- **Deployment**: Ready for Vercel, Netlify, or any static hosting platform

---

*Made with ❤️ for rural healthcare transformation*