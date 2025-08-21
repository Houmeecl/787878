
import React, { useState } from 'react';
import PosTerminalPage from './pages/PosTerminalPage';
import CertifierDashboardPage from './pages/CertifierDashboardPage';
import { AppMode } from './types';
import { Wifi, UserCheck } from 'lucide-react';


const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.POS);

  const toggleMode = () => {
    setMode(prevMode => prevMode === AppMode.POS ? AppMode.CERTIFIER : AppMode.POS);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-700">
              <path fillRule="evenodd" d="M12.5 4.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM10.875 6a.75.75 0 00-1.5 0v5.84l-2.22-2.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 10-1.06-1.06l-2.22 2.22V6z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-800">Vecino<span className="text-blue-600">Xpress</span></h1>
          </div>
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
          >
            {mode === AppMode.POS ? <UserCheck className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            Switch to {mode === AppMode.POS ? 'Certifier' : 'POS'} View
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        {mode === AppMode.POS ? <PosTerminalPage /> : <CertifierDashboardPage />}
      </main>
      <footer className="text-center py-4 text-slate-500 text-sm">
        <p>&copy; 2025 VecinoXpress - Soluciones Notariales Digitales. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
