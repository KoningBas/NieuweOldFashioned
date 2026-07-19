import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { Overview } from './pages/Overview';
import { Requests } from './pages/Requests';
import { RequestDetail } from './pages/RequestDetail';
import { Agenda } from './pages/Agenda';
import { PackingLists } from './pages/PackingLists';
import { Invoices } from './pages/Invoices';
import { PrintDocument } from './pages/PrintDocument';
import { ServicePackages } from './pages/ServicePackages';
import { CocktailMenu } from './pages/CocktailMenu';
import { Availability } from './pages/Availability';
import { ServiceSettings } from './pages/ServiceSettings';

function Gate() {
  const { status, signOut } = useAuth();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-muted">Laden...</div>;
  }
  if (status === 'signed-out') {
    return <Login />;
  }
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-6">
        <p className="text-muted max-w-md">Je bent ingelogd, maar je bent niet geautoriseerd als beheerder.</p>
        <button onClick={() => signOut()} className="rounded-full px-6 py-3 border border-white/20 text-white hover:border-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">Uitloggen</button>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/aanvragen" element={<Requests />} />
        <Route path="/aanvragen/:id" element={<RequestDetail />} />
        {/* Old bookmarks keep working */}
        <Route path="/quotes" element={<Navigate to="/aanvragen" replace />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/paklijsten" element={<PackingLists />} />
        <Route path="/facturen" element={<Invoices />} />
        <Route path="/print/offerte/:id" element={<PrintDocument kind="quote" />} />
        <Route path="/print/factuur/:id" element={<PrintDocument kind="invoice" />} />
        <Route path="/packages" element={<ServicePackages />} />
        <Route path="/cocktails" element={<CocktailMenu />} />
        <Route path="/openingstijden" element={<Availability />} />
        {/* Blocking dates now happens inside the agenda */}
        <Route path="/blocked-dates" element={<Navigate to="/agenda" replace />} />
        <Route path="/settings" element={<ServiceSettings />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
