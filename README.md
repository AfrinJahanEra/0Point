# ZeroPoint - Technical Interview Platform

ZeroPoint is a comprehensive technical interview platform that provides coding challenges, real-time collaboration, and interview management tools.

## Project Structure

- `/Client` - Frontend React application
- `/Server` - Backend Django application

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MongoDB

### Running the Client

1. Navigate to the client directory:
   ```
   cd Client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the backend URL:
   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Running the Server

1. Navigate to the server directory:
   ```
   cd Server
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your configuration:
   ```
   SECRET_KEY=your-secret-key
   MONGO_URI=your-mongodb-uri
   MONGO_DB_NAME=your-db-name
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. Start the development server:
   ```
   python manage.py runserver
   ```

## Features

- Real-time collaborative code editor
- Video conferencing integration
- Coding challenge management
- Automated code execution
- Interview scheduling
- Performance analytics
- Email invitations for interviews
- Real-time code collaboration with WebSocket
- Shared screen for interviewer and candidate
- Concurrent code editing
- Live code execution with output