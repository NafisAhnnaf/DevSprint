import { Link, useNavigate } from "react-router-dom";
import { Loader2, LayoutDashboard, Utensils } from "lucide-react"; // Added icons for flair
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const [loading, setLoading] = useState(false);
  const { logout, token } = useAuth(); 
  const navigate = useNavigate();

  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
      logout();
      navigate("/");
      setLoading(false);
    }, 800); // Small delay for smooth UX
  };

  return (
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-xl font-black gradient-text tracking-tighter"
        >
          IUT CAFETERIA <span className="text-slate-300">|</span> 2026
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
          {/* --- ALWAYS VISIBLE / PROTECTED LINKS --- */}
          <Link
            to="/student"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
          >
            <Utensils size={16} />
            Order
          </Link>
          
          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all active:scale-95"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <div className="h-6 w-[1px] bg-slate-200 mx-2" /> {/* Divider */}

          {/* --- AUTH CONDITIONAL VIEW --- */}
          {token ? (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-5 py-2 rounded-2xl transition-all bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600 hover:scale-105 active:scale-95 flex items-center justify-center min-w-[100px]"
            >
              {loading ? <Loader2 className="animate-spin size-4" /> : "Logout"}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hover:text-indigo-600 transition-colors px-4"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-2xl transition-all bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;