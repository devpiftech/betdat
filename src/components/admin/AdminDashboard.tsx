import { useState } from 'react';
import { Shield, Users, AlertTriangle, Settings, Dices } from 'lucide-react';
import { Button } from '../ui/Button';
import { GameAnalytics } from '../analytics/GameAnalytics';
import { GameManagement } from './GameManagement';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left 
                  ${activeTab === 'overview' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Shield className="h-5 w-5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left 
                  ${activeTab === 'games' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Dices className="h-5 w-5" />
                <span>Game Management</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left 
                  ${activeTab === 'users' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left 
                  ${activeTab === 'reports' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <AlertTriangle className="h-5 w-5" />
                <span>Reports</span>
              </button>
            </nav>
          </div>

          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <GameAnalytics />
              </div>
            )}
            {activeTab === 'games' && <GameManagement />}
            {/* Add other tab content components */}
          </div>
        </div>
      </div>
    </div>
  );
};