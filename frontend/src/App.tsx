import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, CreditCard, BarChart3, Workflow, Zap } from 'lucide-react';
import CreatePayment from './components/CreatePayment';

const queryClient = new QueryClient();

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: CreditCard, label: 'Create Payment' },
    { path: '/architecture', icon: Workflow, label: 'Architecture' },
    { path: '/metrics', icon: BarChart3, label: 'Metrics' },
    { path: '/monitor', icon: Activity, label: 'Monitor' },
  ];

  return (
    <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                PayFlow
              </h1>
              <p className="text-xs text-slate-400 font-medium">Control Tower</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : ''}`} />
                    <span className="text-sm font-semibold relative z-10 hidden sm:inline">
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function ComingSoon({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            scale: [1, 1.1, 1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="relative inline-block mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-50"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30">
            <Icon className="w-12 h-12 text-blue-400" />
          </div>
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">{title}</h2>
        <p className="text-slate-400 text-lg mb-6">This feature is coming soon...</p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Under Development</span>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<CreatePayment />} />
          <Route path="/architecture" element={<ComingSoon title="Architecture Diagram" icon={Workflow} />} />
          <Route path="/metrics" element={<ComingSoon title="System Metrics" icon={BarChart3} />} />
          <Route path="/monitor" element={<ComingSoon title="Real-time Monitor" icon={Activity} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;

// Made with Bob
