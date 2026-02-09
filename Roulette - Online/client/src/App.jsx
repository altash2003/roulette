import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { MessageSquare, Music, User, Shield, LogOut } from 'lucide-react';

// Detect if we are in production or local
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
const socket = io(API_URL);

// --- AUTH SCREEN ---
const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    try {
      const { data } = await axios.post(`${API_URL}${endpoint}`, form);
      if (isLogin) {
        localStorage.setItem('token', data.token);
        onLogin(data.user, data.token);
      } else {
        setIsLogin(true);
        setError('Account created! Please log in.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Connection failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="panel-glass p-8 w-96 text-center shadow-2xl">
        <h1 className="text-3xl font-black text-amber-500 mb-6 uppercase tracking-widest">{isLogin ? 'Casino Login' : 'Join VIP'}</h1>
        {error && <div className="bg-red-500/20 text-red-200 p-2 mb-4 rounded text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white focus:border-amber-500 outline-none"
            placeholder="Username (Min 5 chars)" value={form.username} onChange={e => setForm({...form, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})} />
          <input className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-white focus:border-amber-500 outline-none"
            type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <button type="submit" className="w-full btn-3d btn-gold py-3 mt-4">{isLogin ? 'Enter Floor' : 'Create Account'}</button>
        </form>
        <p className="mt-6 text-slate-400 text-sm cursor-pointer hover:text-white" onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Need an account?' : 'Already have one?'}</p>
      </div>
    </div>
  );
};

// --- ADMIN PANEL ---
const AdminPanel = ({ token, close }) => {
  const [users, setUsers] = useState([]);
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
    axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data)).catch(() => close());
  }, []);

  const handleCredit = async (userId, type) => {
    if(!amount) return;
    await axios.post(`${API_URL}/api/admin/credit`, { userId, amount, type }, { headers: { Authorization: `Bearer ${token}` } });
    const res = await axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    setUsers(res.data);
    setAmount('');
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-4xl rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-bold text-amber-500">ADMIN CONTROL</h2>
          <button onClick={close} className="text-white text-xl">✕</button>
        </div>
        <div className="flex gap-4 mb-4">
           <input type="number" placeholder="Enter Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="bg-slate-900 p-2 rounded text-white border border-slate-600" />
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-500 uppercase"><tr><th className="p-3">User</th><th className="p-3">Balance</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-3 font-bold text-white">{u.username}</td>
                  <td className="p-3 text-emerald-400">${u.balance}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={()=>handleCredit(u.id, 'deposit')} className="btn-3d btn-green px-3 py-1 text-xs">Add</button>
                    <button onClick={()=>handleCredit(u.id, 'withdraw')} className="btn-3d btn-red px-3 py-1 text-xs">W/D</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    socket.on('message', (m) => setChat(prev => [...prev, m]));
    return () => socket.off('message');
  }, []);

  const sendMsg = (e) => {
    e.preventDefault();
    if(!msg) return;
    socket.emit('message', { user: user.username, text: msg });
    setMsg('');
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); setToken(null); };

  if (!token || !user) return <Auth onLogin={(u, t) => { setUser(u); setToken(t); }} />;

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden">
      {adminOpen && <AdminPanel token={token} close={() => setAdminOpen(false)} />}
      
      {/* SIDEBAR */}
      <div className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 z-10 shadow-xl">
        <div>
          <h1 className="hidden md:block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 mb-8">ROYAL<br/>RAILWAY</h1>
          <div className="panel-glass p-4 rounded-xl mb-6 hidden md:block">
            <p className="text-slate-400 text-xs uppercase font-bold">Balance</p>
            <p className="text-2xl font-mono text-emerald-400">${user.balance?.toFixed(2)}</p>
          </div>
          <div className="space-y-4">
             {user.role === 'admin' && <button onClick={()=>setAdminOpen(true)} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full font-bold"><Shield size={24} /> <span className="hidden md:inline">Admin</span></button>}
             <button className="flex items-center gap-3 text-slate-400 hover:text-amber-400 w-full"><Music size={24} /> <span className="hidden md:inline">Music</span></button>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-3 text-slate-500 hover:text-white"><LogOut size={24} /> <span className="hidden md:inline">Log Out</span></button>
      </div>

      {/* GAME AREA */}
      <div className="flex-1 relative bg-[#15803D] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl aspect-video bg-black/20 rounded-xl border-4 border-amber-600/30 flex items-center justify-center relative">
             <div className="text-center text-white/50">
                <h2 className="text-3xl font-bold">ROULETTE TABLE</h2>
                <p>Embed your Canvas code here</p>
             </div>
          </div>
          <div className="mt-8 flex gap-4">
             <button className="btn-3d btn-gold px-8 py-3 text-xl">SPIN</button>
             <button className="btn-3d btn-red px-6 py-3">CLEAR</button>
             <button className="btn-3d btn-green px-6 py-3">DOUBLE</button>
          </div>
      </div>

      {/* CHAT */}
      <div className={`w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-all ${showChat ? 'mr-0' : '-mr-80 hidden'}`}>
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between">
           <h3 className="font-bold text-slate-200">Live Lounge</h3>
           <MessageSquare size={20} className="text-emerald-500 cursor-pointer" onClick={()=>setShowChat(false)} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {chat.map((m, i) => (
             <div key={i} className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
               <span className="text-amber-500 font-bold text-xs">{m.user}: </span><span className="text-slate-300 text-sm">{m.text}</span>
             </div>
           ))}
        </div>
        <form onSubmit={sendMsg} className="p-3 bg-slate-800 border-t border-slate-700">
          <input value={msg} onChange={e=>setMsg(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" placeholder="Type..." />
        </form>
      </div>
    </div>
  );
}