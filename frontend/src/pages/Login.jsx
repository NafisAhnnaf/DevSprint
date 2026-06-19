import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

import api from "../services/api";
import loginAnimation from "../assets/login-animation.json";
import PageWrapper from "../components/common/PageWrapper";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Points to Identity Provider (via Gateway)
      const response = await api.post(
        "http://localhost:8005/api/identity/auth/login",
        { studentId, password },
      );

      // Store token for the Bearer handshake
      const newToken = response.data?.payload?.token;
      localStorage.setItem("token", newToken);
      setToken(newToken); // 🔴 THIS IS REQUIRED
      navigate("/student");
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many attempts. Please wait 1 minute.");
      } else {
        setError("Invalid Student ID or Password");
      }
    } finally {
      setLoading(false);
    }

    //TO BYPASS Login

    //     e.preventDefault();
    //   // TEMPORARY BYPASS: No backend needed
    //   localStorage.setItem('token', 'mock_token_123');
    //   navigate('/student');
  };

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row items-center justify-center min-h-[80vh] gap-12">
        {/* Lottie Decoration */}
        <div className="w-full max-w-md">
          <Lottie animationData={loginAnimation} loop={true} />
        </div>

        {/* Login Form */}
        <motion.div
          className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md"
          whileHover={{ y: -5 }}
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Welcome, Engineer
          </h1>
          <p className="text-slate-500 mb-6">
            Enter your IUT credentials to order Iftar.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Student ID
              </label>
              <input
                type="text"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm font-medium"
              >
                {error}
              </motion.p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default Login;
