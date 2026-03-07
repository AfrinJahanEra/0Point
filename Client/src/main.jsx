import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ContestProvider } from './context/ContestContext'


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ContestProvider>
      <App />
    </ContestProvider>
  </React.StrictMode>
)