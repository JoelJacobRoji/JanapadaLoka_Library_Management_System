import React from 'react';
import './App.css';
import CirculationLayout from './layouts/CirculationLayout';
import CirculationPortal from './pages/CirculationPortal';

export default function App() {
  return (
    <CirculationLayout>
      <CirculationPortal />
    </CirculationLayout>
  );
}
