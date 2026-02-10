// client/src/App.jsx (Partial - Replace the Auth Component part)

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { User, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// ... (Keep your API_URL config here) ...
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

// --- NEW AUTH COMPONENT ---
const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Basic Client Validation
    if (form.username.length < 5) {
        setError("Username must be at least 5 characters.");
        setLoading(false);
        return;
    }

    const endpoint = isLogin ? '/api/login' : '/api/signup';

    try {
      console.log(`Sending request to: ${API_URL}${endpoint}`); // Debug
      const { data } = await axios.post(`${API_URL}${endpoint}`, form);

      if (isLogin) {
        localStorage.setItem('token', data.token);
        onLogin(data.user, data.token);
      } else {
        setSuccess('Account created successfully! Logging you in...');
        // Auto-login after signup
        setTimeout(async () => {
             try {
                const loginRes = await axios.post(`${API_URL}/api/login`, form);
                localStorage.setItem('token', loginRes.data.token);
                onLogin(loginRes.data.user, loginRes.data.token);
             } catch(err) {
                setIsLogin(true);
                setLoading(false);
             }
        }, 1500);
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.response?.data?.error || 'Connection failed. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0F172A]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-[#0F172A] to-black opacity-80"></div>
      
      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-slate-900/60">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#F59E0B] to-[#D97706] tracking-wider uppercase drop-shadow-sm">
            {isLogin ? 'Welcome Back' : 'VIP Access'}
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            {isLogin ? 'Enter the high roller room' : 'Create your secure account'}
          </p>
        </div>

        {/* Messages */}
        {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                <AlertCircle size={16} /> {error}
            </div>
        )}
        {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-200 text-sm">
                <CheckCircle2 size={16} /> {success}
            </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-5">
          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-[#F59E0B] transition-colors" size={20} />
            <input 
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 pl-10 pr-4 py-3 rounded-xl focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] outline-none transition-all placeholder:text-slate-600"
              placeholder="Username" 
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-[#F59E0B] transition-colors" size={20} />
            <input 
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 pl-10 pr-4 py-3 rounded-xl focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] outline-none transition-all placeholder:text-slate-600"
              type="password" 
              placeholder="Password" 
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-3d btn-gold py-4 text-slate-900 font-bold text-lg tracking-widest shadow-lg hover:shadow-amber-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'ENTER CASINO' : 'JOIN NOW')}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            {isLogin ? "Don't have a seat?" : "Already a member?"}
            <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} 
                className="ml-2 text-[#F59E0B] hover:text-amber-300 font-bold transition-colors underline decoration-dotted underline-offset-4"
            >
              {isLogin ? 'Register' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
