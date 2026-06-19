import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import api from "../services/api";
import signupAnimation from "../assets/login-animation.json"; // Reusing your animation
import PageWrapper from "../components/common/PageWrapper";

const Signup = () => {
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post(
        "http://localhost:8005/api/identity/auth/register",
        {
          studentId: formData.studentId,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        },
      );
      console.log(res.status);
      // Redirect to login after successful registration
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row-reverse items-center justify-center min-h-[80vh] gap-12">
        {/* Lottie Decoration */}
        <div className="w-full max-w-md">
          <Lottie animationData={signupAnimation} loop={true} />
        </div>

        {/* Signup Form */}
        <motion.div
          className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Create Account
          </h1>
          <p className="text-slate-500 mb-6">
            Join the Iftar management system.
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                name="name"
                type="text"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Student ID
              </label>
              <input
                name="studentId"
                type="text"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                name="email"
                type="email"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                name="password"
                type="password"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <input
                name="confirmPassword"
                type="password"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-indigo-600 font-bold hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default Signup;
