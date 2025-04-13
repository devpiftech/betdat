import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ErrorBoundary } from './components/monitoring/ErrorBoundary';
import { Header } from './components/layout/Header';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { GameHistory } from './components/history/GameHistory';
import { CurrencyStore } from './components/store/CurrencyStore';
import { GamesPage } from './components/games/GamesPage';
import { GameLobby } from './components/games/GameLobby';
import { useStore } from './store/useStore';

// Import slot machines
import { CyberCowboy } from './components/games/slots/CyberCowboy';
import { GoldRush } from './components/games/slots/GoldRush';
import { AlienSaloon } from './components/games/slots/AlienSaloon';
import { SteamPunk } from './components/games/slots/SteamPunk';
import { QuantumBounty } from './components/games/slots/QuantumBounty';

// Import table games
import { Blackjack } from './components/games/Blackjack';
import { PokerRoom } from './components/games/poker/PokerRoom';
import { Roulette } from './components/games/Roulette';
import { USRoulette } from './components/games/USRoulette';
import { Craps } from './components/games/Craps';
import { Baccarat } from './components/games/Baccarat';
import { Sic } from './components/games/Sic';

// Import instant win games
import { ScratchCard } from './components/games/ScratchCard';
import { CoinFlip } from './components/games/CoinFlip';
import { Keno } from './components/games/Keno';

// Import special events
import { Raffle } from './components/games/Raffle';
import { HorseRacing } from './components/games/HorseRacing';

// Import other components
import { ProfilePage } from './components/profile/ProfilePage';
import { TournamentList } from './components/tournaments/TournamentList';
import { TournamentDetail } from './components/tournaments/TournamentDetail';
import { Leaderboard } from './components/social/Leaderboard';
import { Chat } from './components/social/Chat';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminRoute } from './components/admin/AdminRoute';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Public Route component - redirects to dashboard if already authenticated
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useStore();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Header />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } />
                <Route path="/signup" element={
                  <PublicRoute>
                    <SignUpPage />
                  </PublicRoute>
                } />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/history" element={
                  <ProtectedRoute>
                    <GameHistory />
                  </ProtectedRoute>
                } />
                <Route path="/store" element={
                  <ProtectedRoute>
                    <CurrencyStore />
                  </ProtectedRoute>
                } />
                <Route path="/games" element={
                  <ProtectedRoute>
                    <GamesPage />
                  </ProtectedRoute>
                } />
                <Route path="/lobby" element={
                  <ProtectedRoute>
                    <GameLobby />
                  </ProtectedRoute>
                } />
                
                {/* Slot machine routes */}
                <Route path="/slots/cyber-cowboy" element={
                  <ProtectedRoute>
                    <CyberCowboy />
                  </ProtectedRoute>
                } />
                <Route path="/slots/gold-rush" element={
                  <ProtectedRoute>
                    <GoldRush />
                  </ProtectedRoute>
                } />
                <Route path="/slots/alien-saloon" element={
                  <ProtectedRoute>
                    <AlienSaloon />
                  </ProtectedRoute>
                } />
                <Route path="/slots/steampunk" element={
                  <ProtectedRoute>
                    <SteamPunk />
                  </ProtectedRoute>
                } />
                <Route path="/slots/quantum-bounty" element={
                  <ProtectedRoute>
                    <QuantumBounty />
                  </ProtectedRoute>
                } />
                
                {/* Table game routes */}
                <Route path="/blackjack" element={
                  <ProtectedRoute>
                    <Blackjack />
                  </ProtectedRoute>
                } />
                <Route path="/poker" element={
                  <ProtectedRoute>
                    <PokerRoom />
                  </ProtectedRoute>
                } />
                <Route path="/roulette" element={
                  <ProtectedRoute>
                    <Roulette />
                  </ProtectedRoute>
                } />
                <Route path="/us-roulette" element={
                  <ProtectedRoute>
                    <USRoulette />
                  </ProtectedRoute>
                } />
                <Route path="/craps" element={
                  <ProtectedRoute>
                    <Craps />
                  </ProtectedRoute>
                } />
                <Route path="/baccarat" element={
                  <ProtectedRoute>
                    <Baccarat />
                  </ProtectedRoute>
                } />
                <Route path="/sic-bo" element={
                  <ProtectedRoute>
                    <Sic />
                  </ProtectedRoute>
                } />
                
                {/* Instant win routes */}
                <Route path="/scratch-card" element={
                  <ProtectedRoute>
                    <ScratchCard />
                  </ProtectedRoute>
                } />
                <Route path="/coin-flip" element={
                  <ProtectedRoute>
                    <CoinFlip />
                  </ProtectedRoute>
                } />
                <Route path="/keno" element={
                  <ProtectedRoute>
                    <Keno />
                  </ProtectedRoute>
                } />
                
                {/* Special event routes */}
                <Route path="/raffle" element={
                  <ProtectedRoute>
                    <Raffle />
                  </ProtectedRoute>
                } />
                <Route path="/horse-racing" element={
                  <ProtectedRoute>
                    <HorseRacing />
                  </ProtectedRoute>
                } />
                
                {/* Other routes */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments" element={
                  <ProtectedRoute>
                    <TournamentList />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/:id" element={
                  <ProtectedRoute>
                    <TournamentDetail />
                  </ProtectedRoute>
                } />
                <Route path="/leaderboard" element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />

                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Chat />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;