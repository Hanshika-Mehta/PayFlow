import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, User, DollarSign, CheckCircle2, Loader2, Copy, Check } from 'lucide-react';
import { paymentApi } from '../services/api';
import type { PaymentCreateResponse } from '../types/payment';

export default function CreatePayment() {
  const [userId, setUserId] = useState('user_123');
  const [amount, setAmount] = useState('500');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isReplay, setIsReplay] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setIsReplay(false);

    try {
      const response = await paymentApi.createPayment({
        user_id: userId,
        amount: parseFloat(amount),
      }, idempotencyKey || undefined); // Pass idempotency key if provided
      
      // Check if this was a cached response (replay)
      // The backend sends X-Idempotency-Replay header
      setIsReplay(false); // We'll detect this from response headers if available
      
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/50">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Create Payment</h1>
          <p className="text-slate-400 text-lg">Process payments asynchronously with our distributed system</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
        >
          <div className="p-8 sm:p-10">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User ID Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                  <User className="w-4 h-4 text-blue-400" />
                  User ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter user ID"
                  required
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Idempotency Key Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Idempotency Key <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    className="flex-1 px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., test-key-123"
                  />
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(`test-${Date.now()}`)}
                    className="px-4 py-3.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Generate
                  </button>
                </div>
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-xs text-purple-300 font-medium mb-1">
                    🔒 How to test idempotency:
                  </p>
                  <ol className="text-xs text-slate-400 space-y-1 ml-4 list-decimal">
                    <li>Enter a key (e.g., "test-key-123") or click Generate</li>
                    <li>Click "Create Payment" - note the payment ID</li>
                    <li>Click "Create Payment" again with the SAME key</li>
                    <li>You'll get the SAME payment ID (cached response)</li>
                  </ol>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Create Payment
                  </>
                )}
              </motion.button>
            </form>

            {/* Success Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-green-400">
                        Payment Created Successfully!
                      </h3>
                      {idempotencyKey && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold border border-purple-500/30">
                          🔒 Idempotent
                        </span>
                      )}
                    </div>
                    
                    {/* Payment ID */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-1">Payment ID</p>
                          <code className="text-sm text-blue-400 font-mono break-all">
                            {result.payment_id}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(result.payment_id)}
                          className="ml-3 p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <p className="text-xs font-medium text-slate-400">Status</p>
                        <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-500/30">
                          {result.status}
                        </span>
                      </div>
                    </div>

                    {idempotencyKey && (
                      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs text-purple-300 font-medium mb-1">
                          🔒 Idempotency Key Used: <code className="text-purple-200">{idempotencyKey}</code>
                        </p>
                        <p className="text-xs text-slate-400">
                          If you submit again with the same key, you'll get this exact payment ID back (cached response).
                        </p>
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                      💡 Payment is being processed asynchronously by our worker service.
                      Check the status in a few seconds to see the result.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-1">Error</h3>
                    <p className="text-sm text-slate-300">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            How it works
          </h3>
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Payment is created with <span className="text-yellow-400 font-semibold">PENDING</span> status</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Event is published to <span className="text-red-400 font-semibold">Redis</span> queue</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Worker picks up the event asynchronously</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Payment is processed (2-3 seconds simulation)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <span>Status updates to <span className="text-green-400 font-semibold">SUCCESS</span> or <span className="text-red-400 font-semibold">FAILED</span></span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}

// Made with Bob
