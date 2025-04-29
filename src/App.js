// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import PanelLateral from './views/PanelLateral';
import './App.css';

// Componente para redireccionar si no hay autenticación
const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    // Redirigir a login si no hay autenticación
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta de login accesible sin autenticación */}
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas que requieren autenticación */}
        <Route path="/PanelLateral" element={
          <PrivateRoute>
            <PanelLateral />
          </PrivateRoute>
        } />
        
        {/* Redirigir a login por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Redirigir cualquier otra ruta desconocida al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;