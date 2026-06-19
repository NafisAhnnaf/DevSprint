import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import StudentUI from './pages/StudentUI';
import AdminUI from './pages/AdminUI';
import Navbar from './components/common/Navbar';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Signup from './pages/Signup'; // Add this

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} /> {/* Add this line */}
          <Route path="/student" element={<StudentUI />} />
          <Route path="/admin" element={<AdminUI />} />
          {/* ... rest of your code */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <Navbar />
//         <Routes>
//           <Route path="/" element={<Login />} />
//           <Route path="/student" element={
//             <StudentUI /> 
//           } />
//           <Route path="/admin" element={
//              <AdminUI /> 
//           } />
//           {/* <Route path="/admin" element={
//             <ProtectedRoute> <AdminUI /> </ProtectedRoute>
//           } /> */}
//         </Routes>
//       </Router>
//     </AuthProvider>
//   );
// }

export default App;