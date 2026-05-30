import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import QueueMonitor from './pages/QueueMonitor';
import WorkerMonitor from './pages/WorkerMonitor';
import Events from './pages/Events';
import RetryMonitor from './pages/RetryMonitor';
import DLQMonitor from './pages/DLQMonitor';
import RateLimiting from './pages/RateLimiting';
import Cache from './pages/Cache';
import Metrics from './pages/Metrics';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/queue" element={<QueueMonitor />} />
            <Route path="/workers" element={<WorkerMonitor />} />
            <Route path="/events" element={<Events />} />
            <Route path="/retries" element={<RetryMonitor />} />
            <Route path="/dlq" element={<DLQMonitor />} />
            <Route path="/rate-limiting" element={<RateLimiting />} />
            <Route path="/cache" element={<Cache />} />
            <Route path="/metrics" element={<Metrics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
