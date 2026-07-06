import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { Overview } from './pages/Overview';
import { QuoteRequests } from './pages/QuoteRequests';
import { Agenda } from './pages/Agenda';
import { ServicePackages } from './pages/ServicePackages';
import { CocktailMenu } from './pages/CocktailMenu';
import { Availability } from './pages/Availability';
import { BlockedDates } from './pages/BlockedDates';
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
        <Route path="/quotes" element={<QuoteRequests />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/packages" element={<ServicePackages />} />
        <Route path="/cocktails" element={<CocktailMenu />} />
        <Route path="/openingstijden" element={<Availability />} />
        <Route path="/blocked-dates" element={<BlockedDates />} />
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
