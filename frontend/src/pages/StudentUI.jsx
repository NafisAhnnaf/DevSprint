import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Package, ChefHat, Bell, History, Clock, Hash } from "lucide-react";
import api from "../services/api";
import PageWrapper from "../components/common/PageWrapper";
import { SSE } from "sse.js";

const StudentUI = () => {
  const [orderStatus, setOrderStatus] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [pastOrders, setPastOrders] = useState([]); // New state for past orders
  const [isTableLoading, setIsTableLoading] = useState(true);

  // Function to fetch past orders
  const fetchPastOrders = async () => {
    setIsTableLoading(true);
    try {
      const response = await api.get(
        "http://localhost:8005/api/inventory/order/user",
      );
      if (response.data?.payload?.orders) {
        setPastOrders(response.data.payload.orders);
      }
    } catch (error) {
      console.error("Fetch past orders failed:", error);
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchPastOrders();
  }, []);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const session = new SSE("http://localhost:8005/api/notification/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
      });
      session.addEventListener("order-status", (msg) => {
        const data = JSON.parse(msg.data);
        setOrderStatus(data.status);
        // Refresh past orders list when a status update occurs (especially if it becomes READY)
        fetchPastOrders();
      });

      session.stream();
      return () => session.close();
    } catch (error) {
      console.log(error);
    }
  }, []);

  const placeOrder = async () => {
    setLoading(true);
    try {
      const response = await api.post("http://localhost:8005/api/inventory/order");
      if (response.data?.payload?.order.status) {
        setOrderStatus(response.data.payload.order.status);
        fetchPastOrders(); // Refresh table immediately after placing order
      }
    } catch (err) {
      alert(err.response?.data?.message || "Order Failed");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: "PENDING", label: "Order Sent", icon: <Bell size={20} /> },
    { id: "STOCK VERIFIED", label: "Stock Verified", icon: <Package size={20} /> },
    { id: "IN KITCHEN", label: "In Kitchen", icon: <ChefHat size={20} /> },
    { id: "READY", label: "Ready!", icon: <CheckCircle2 size={20} /> },
  ];

  // Helper to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold gradient-text">Iftar Dashboard</h1>
          <p className="text-slate-500 mt-2">IUT Cafeteria Digital Queue</p>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 font-bold text-2xl">🍝</div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Spaghetti Monolith</h3>
              <p className="text-slate-400">Signature Iftar Plate</p>
            </div>
          </div>
          <button
            onClick={placeOrder}
            disabled={loading || (orderStatus && orderStatus !== "READY")}
            className={`px-8 py-4 rounded-2xl font-bold transition-all ${
                (orderStatus && orderStatus !== "READY")
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : (orderStatus && orderStatus !== "READY") ? "In Progress" : "Order Now"}
          </button>
        </div>

        {/* Real-time Status Tracker */}
        {orderStatus && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
            <h4 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-800">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Order Status
            </h4>
            <div className="relative flex justify-between items-center w-full">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2" />
              {steps.map((step, index) => {
                const isCompleted = steps.findIndex((s) => s.id === orderStatus) >= index;
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                    <motion.div
                      animate={{ backgroundColor: isCompleted ? "#4f46e5" : "#f8fafc", scale: isCompleted ? 1.2 : 1 }}
                      className={`p-3 rounded-full border-4 ${isCompleted ? "border-indigo-100 text-white" : "border-white text-slate-300 shadow-sm"}`}
                    >
                      {step.icon}
                    </motion.div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${isCompleted ? "text-indigo-600" : "text-slate-300"}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- PAST ORDERS TABLE --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <History size={18} className="text-indigo-500" />
              Order History
            </h3>
            <span className="text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
              Total: {pastOrders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1"><Hash size={12}/> S/N</div></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1"><Clock size={12}/> Created At</div></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isTableLoading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <Loader2 className="animate-spin inline text-indigo-500" />
                      <p className="text-xs text-slate-400 mt-2">Loading history...</p>
                    </td>
                  </tr>
                ) : pastOrders.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-400 text-sm italic">
                      No past orders found. Place your first order above!
                    </td>
                  </tr>
                ) : (
                  pastOrders.map((order, index) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-slate-500 font-bold">{index + 1}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          order.status === 'READY' ? 'bg-green-100 text-green-600' : 
                          order.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default StudentUI;