# SAMARTH App: Neurological Assessment Platform

## Overview
SAMARTH is a comprehensive neurological assessment web platform designed to monitor and evaluate symptoms of various neurological conditions including Bell's Palsy, Amyotrophic Lateral Sclerosis (ALS), and Parkinson's Disease. The platform utilizes computer vision, machine learning, signal processing techniques, and AI analysis to assess neuromotor function through various specialized tests.

## Screenshots

Below are snapshots from the SAMARTH App:

### Dashboard
![{CADE1FBC-7A63-4695-9823-C1E377D53CA2}](https://github.com/user-attachments/assets/c85ca45b-f970-456b-9b5c-19b7048a1a6f)

*Main dashboard showing available assessments, recent activities, and user statistics*

### Assessment Tests
![{095E06A6-D17B-4E40-9231-DBE5FF26E8BE}](https://github.com/user-attachments/assets/7d7fa6da-cbed-41f7-b85b-037a593be725)


### Facial Symmetry Assessment
![{BB6D9554-DE27-4701-87D3-8141405384CF}](https://github.com/user-attachments/assets/6e18d2b5-b3f5-4f26-9c26-6f7b984921f1)
![{DB790AB3-8C3F-4040-85A0-B9BC190161D2}](https://github.com/user-attachments/assets/46236cb1-f1f9-4170-ade1-af038b8a2156)

*Real-time facial landmark detection and symmetry analysis*

### Eye Movement Analysis
![{3BC6480D-BC34-4CFC-AC73-453B3A503D99}](https://github.com/user-attachments/assets/f172ea6e-87e6-4bdd-9b57-e0d5224f3e0e)

*Eye tracking visualization showing movement patterns and metrics*

### Tremor Analysis
![{D1DC8793-A894-4CE8-B9C1-EAD6A5D20B9E}](https://github.com/user-attachments/assets/3ea0d0f3-469f-46ca-8dbe-96c114ba00cb)
![{EDFEAA42-C09B-47E9-A5D1-1A397035B967}](https://github.com/user-attachments/assets/0c1a59b7-df57-4ab3-9d5a-4d41709160bd)
*Hand tremor frequency and amplitude visualization with FFT analysis*

### Finger Tap Test
![Uploading {9D6D3903-0B48-405B-9D7C-3BD679B1722A}.png…]()


### Gait Analysis
![{D720F301-E2E8-4263-BF32-20A814B90477}](https://github.com/user-attachments/assets/f0503e1d-6ef5-4563-abcb-fdf213a7da9a)



### Analytics Dashboard
![{6B030F41-B318-42DC-B23F-0281623D8A05}](https://github.com/user-attachments/assets/c9eec1fc-04fa-40bd-b9bc-0e20cb851ef3)


*Comprehensive visualization of assessment results and progress over time*

### Assessment Report
![{98792714-E466-4878-9EFA-020A9A7E9A40}](https://github.com/user-attachments/assets/566998c9-3f18-4f1f-8189-4eb1f5548179)
![{D848FA46-97DD-4778-89DA-71DA1E84B249}](https://github.com/user-attachments/assets/af1c719f-cb15-4bbf-8290-22d807543b26)
![{D399F85F-16D4-4945-890D-A7932F461691}](https://github.com/user-attachments/assets/c8b86a88-4dde-4b59-8766-54fc148aa447)


*Sample assessment report with AI-powered insights*

### Therapy Page
![{04C1DA46-4BB4-4763-B82D-CD4D29461D8C}](https://github.com/user-attachments/assets/69b04e97-2bdd-493d-8acc-8a923ecb3afb)




## Tech Stack

### Frontend
- **Framework**: React.js 19.x with Vite
- **UI Library**: Material UI 5.x with Emotion styling
- **State Management**: React Context API (AuthContext)
- **Routing**: React Router 6.x
- **Data Visualization**: Chart.js with React-Chartjs-2
- **HTTP Client**: Axios
- **PDF Export**: jsPDF with jspdf-autotable
- **Animation**: Framer Motion
- **PWA Support**: Vite PWA Plugin

### Backend
- **Server**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **AI Integration**: Google Generative AI API (Gemini 2.0)
- **File Handling**: Multer
- **PDF Generation**: PDFKit

### Machine Learning
- **Core Libraries**: TensorFlow.js
- **Vision Models**:
  - Face landmarks detection
  - Hand pose detection
  - Pose detection
- **Backend Processing**: 
  - Python with FastAPI
  - OpenCV
  - MediaPipe
  - NumPy, SciPy
  - Librosa for audio processing

### DevOps
- **Version Control**: Git
- **Linting**: ESLint
- **Bundling**: Vite
- **Development Server**: Nodemon (backend)

## Features

### 1. Facial Symmetry Analysis
- Detects facial landmarks using MediaPipe Face Mesh
- Calculates symmetry metrics for eyes, mouth, jawline, and eyebrows
- Assesses neurological indicators for conditions like Bell's Palsy

### 2. Eye Movement Assessment
- Tracks eye movement velocity and patterns
- Measures Eye Aspect Ratio (EAR) to detect blinks
- Identifies saccades, fixations, and abnormal eye movements like nystagmus

### 3. Speech Pattern Analysis
- Analyzes voice recordings for pitch variations, rhythm, and tonal quality
- Detects monotonic speech patterns
- Identifies neurological speech impairments

### 4. Tremor Assessment
- Tracks hand movements to detect tremor frequency and amplitude
- Uses Fast Fourier Transform (FFT) for frequency analysis
- Classifies tremor types (resting, postural, action/intention)

### 5. Finger Tapping Test
- Measures speed, rhythm, and accuracy of alternating finger taps
- Analyzes motor neuron efficiency and fine motor control
- Provides metrics related to bradykinesia and coordination

### 6. Gait Analysis
- Evaluates walking patterns and stability
- Measures stride length, cadence, and symmetry
- Detects abnormalities indicative of neurological conditions

### 7. AI-Powered Analysis
- Comprehensive analysis of assessment results
- Trend identification across multiple assessments
- Personalized recommendations based on assessment history



## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/samarth-web.git
   cd samarth-web
   ```
   
2. Install frontend dependencies:
   ```sh
   npm install
   ```
   
3. Install backend dependencies:
   ```sh
   cd backend
   npm install
   ```

4. Install ML service dependencies (if using the Python service):
   ```sh
   cd ml_service
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   - Create `.env` file in the backend directory
   - Required variables include `MONGODB_URI`, `JWT_SECRET`, `PORT`
   - For the frontend, create `.env` with `VITE_API_URL`

6. Run the application:
   ```sh
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from root directory)
   npm run dev
   ```

## Usage
- Register an account or log in with existing credentials
- Complete various neurological assessments from the dashboard
- View historical assessment results and track progress over time
- Get AI-powered analysis and insights on the Analytics page
- Export assessment reports as PDFs for medical professionals

## Deployment
The application can be deployed using various methods:
- Frontend: Vercel, Netlify, or similar static hosting
- Backend: Render, Railway, Heroku, or any Node.js hosting service
- Database: MongoDB Atlas for cloud-hosted database

## Contributions
Contributions are welcome! Please submit a pull request or open an issue to suggest improvements.

## License
This project is licensed under the MIT License.

## Acknowledgments
- Research from URMC Rochester, Stanford Medicine, JAMA, and other sources
- TensorFlow.js, MediaPipe, OpenCV, and Librosa for providing powerful tools for analysis
- Google's Gemini API for AI-powered assessment analysis

---
*Developed by INSTANT IDEATORS*
