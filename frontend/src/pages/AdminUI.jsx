import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, BarChart3, Flame, Bomb, X, PackagePlus, CheckCircle2, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import api from "../services/api";
import PageWrapper from "../components/common/PageWrapper";

const AdminUI = () => {
  const [isChaosEnabled, setIsChaosEnabled] = useState(false);
  
  // --- Updated Modal States ---
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Amount, 2: Date
  const [stockAmount, setStockAmount] = useState("");
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuccess, setShowSuccess] = useState(false);

  const [services, setServices] = useState([
    { name: "Gateway Service", endpoint: "http://localhost:5001/health", status: "loading", port: 5001 },
    { name: "Identity Provider", endpoint: "http://localhost:5001/api/identity/health", status: "loading", port: 5002 },
    { name: "Inventory Service", endpoint: "http://localhost:5001/api/inventory/health", status: "loading", port: 5003 },
    { name: "Kitchen Service", endpoint: "http://localhost:5001/api/kitchen/health", status: "loading", port: 5004 },
    { name: "Notification Hub", endpoint: "http://localhost:5001/api/notification/health", status: "loading", port: 5005 },
  ]);

  const toggleChaosMode = async () => {
    const willEnable = !isChaosEnabled;
    setIsChaosEnabled(willEnable);
  
    try {
      if (willEnable) {
        // Ensure the path includes /api if your Gateway routes it that way
        await api.post("/api/chaos/load-test", { action: "start" });
      } else {
        await api.post("/api/chaos/load-test", { action: "stop" });
      }
    } catch (err) {
      console.error("Chaos control failed", err);
      setIsChaosEnabled(!willEnable); // This is what's flipping it back!
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      const updatedServices = await Promise.all(
        services.map(async (service) => {
          try {
            const res = await api.get(service.endpoint);
            return { ...service, status: res.status === 200 ? "healthy" : "unhealthy" };
          } catch (err) {
            return { ...service, status: "unhealthy" };
          }
        }),
      );
      setServices(updatedServices);
    };
    const interval = setInterval(checkHealth, 5000);
    checkHealth();
    return () => clearInterval(interval);
  }, []);

  const triggerChaos = async (serviceName) => {
    try { await api.post("/chaos/kill", { service: serviceName }); } 
    catch (err) { console.error("Chaos command failed", err); }
  };

  // Reset Modal
  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setTimeout(() => {
      setModalStep(1);
      setStockAmount("");
      setShowSuccess(false);
    }, 300);
  };

  // Stock Submit Handler
  const handleStockSubmit = (e) => {
    e.preventDefault();
    console.log(`Final Submission - Amount: ${stockAmount}, Date: ${stockDate}`);
    setShowSuccess(true);
    
    setTimeout(() => {
      closeStockModal();
    }, 2000);
  };

  return (
    <PageWrapper>
      <div className="space-y-8 px-10 relative">
        
        {/* --- MULTI-STEP STOCK DIALOG --- */}
        <AnimatePresence>
          {isStockModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeStockModal}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-100"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <PackagePlus size={18} className="text-indigo-600" />
                    Stock Increment Dialog
                  </h3>
                  <button onClick={closeStockModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-8">
                  <AnimatePresence mode="wait">
                    {showSuccess ? (
                      <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-4 space-y-3">
                        <CheckCircle2 size={48} className="text-green-500" />
                        <p className="text-green-600 font-bold text-center">Stock Updated Successfully!<br/><span className="text-xs font-normal text-slate-400">Date: {stockDate}</span></p>
                      </motion.div>
                    ) : modalStep === 1 ? (
                      <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Step 1: Quantity</label>
                          <input 
                            type="number" autoFocus value={stockAmount}
                            onChange={(e) => setStockAmount(e.target.value)}
                            placeholder="Enter amount..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                          />
                        </div>
                        <button 
                          disabled={!stockAmount}
                          onClick={() => setModalStep(2)}
                          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                          Next <ChevronRight size={18} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Step 2: Effective Date</label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="date" value={stockDate}
                              onChange={(e) => setStockDate(e.target.value)}
                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setModalStep(1)} className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50">Back</button>
                            <button onClick={handleStockSubmit} className="flex-[2] py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100">Submit Stock</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- CHAOS TOGGLE SECTION --- */}
        <div className="bg-slate-900 rounded-4xl p-6 shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden relative">
          <AnimatePresence>
            {isChaosEnabled && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />}
          </AnimatePresence>
          <div className="flex items-center gap-4 z-10">
            <div className={`p-3 rounded-2xl ${isChaosEnabled ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
               {isChaosEnabled ? <Bomb size={24} /> : <Flame size={24} />}
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight ${isChaosEnabled ? 'text-red-500' : 'text-white'}`}>CHAOS ENGINE v1.0</h2>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">System Instability Simulation</p>
            </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isChaosEnabled ? 'text-slate-500' : 'text-indigo-400'}`}>Safe Mode</span>
            <button onClick={toggleChaosMode} className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${isChaosEnabled ? "bg-red-600" : "bg-slate-700"}`}>
              <motion.div layout transition={{ type: "spring", stiffness: 700, damping: 30 }} className="w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: isChaosEnabled ? 32 : 0 }} />
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isChaosEnabled ? 'text-red-500' : 'text-slate-500'}`}>Chaos Active</span>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold gradient-text">System Oversight</h1>
            <p className="text-slate-500">Real-time Infrastructure Monitoring</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-full text-indigo-600 text-sm font-bold flex items-center gap-2">
            <Activity size={16} className="animate-pulse" /> Live Cluster Data
          </div>
        </div>

        {/* Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {services.map((service) => (
            <motion.div key={service.name} whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className={`w-3 h-3 rounded-full mb-4 ${service.status === "healthy" ? "bg-green-500" : service.status === "unhealthy" ? "bg-red-500" : "bg-slate-300"}`} />
              <h3 className="font-bold text-slate-800 text-sm">{service.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Port: {service.port}</p>
              <div className="flex flex-col gap-2 mt-4">
                <button onClick={() => triggerChaos(service.name)} className="w-full py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors">Kill Service</button>
                {service.name === "Inventory Service" && (
                  <button onClick={() => setIsStockModalOpen(true)} className="w-full py-2 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1">
                    <PackagePlus size={14} /> Add Stock
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold flex items-center gap-2 mb-6 text-slate-800"><BarChart3 size={18} className="text-indigo-500" /> Live Latency</h3>
                <iframe src="http://localhost:3000/d-solo/ad5nwzc/iut-cafe?orgId=1&from=now-15m&to=now&refresh=5s&timezone=browser&panelId=1&__feature.dashboardSceneSolo=true" width="100%" height="400" frameBorder="0" className="w-full h-64 rounded-xl border-0" title="Grafana Metrics" />
            </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-6"><BarChart3 size={18} className="text-indigo-500" /> Order Throughput</h3>
            <iframe src="http://localhost:3000/d-solo/adfthmb/iut-cafeteria-oversight?orgId=1&from=now-15m&to=now&refresh=5s&timezone=browser&refresh=auto&panelId=1&__feature.dashboardSceneSolo=true" width="450" height="200" frameBorder="0" className="w-full h-64 rounded-xl border-0" title="Throughput Metrics" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AdminUI;