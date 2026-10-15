// All pages and who can open them.
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';

import Profile from './pages/guest/Profile.jsx';
import BrowseRooms from './pages/guest/BrowseRooms.jsx';
import BookRoom from './pages/guest/BookRoom.jsx';
import MyBookings from './pages/guest/MyBookings.jsx';
import BookHall from './pages/guest/BookHall.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ManageBookings from './pages/admin/ManageBookings.jsx';
import Extensions from './pages/admin/Extensions.jsx';
import HallBookings from './pages/admin/HallBookings.jsx';
import InternationalBooking from './pages/admin/InternationalBooking.jsx';
import ManageRooms from './pages/admin/ManageRooms.jsx';
import RoomBlocks from './pages/admin/RoomBlocks.jsx';
import Rates from './pages/admin/Rates.jsx';
import Payments from './pages/admin/Payments.jsx';

import CheckInOut from './pages/incharge/CheckInOut.jsx';
import ManageUsers from './pages/superadmin/ManageUsers.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Any signed-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/rooms" element={<BrowseRooms />} />
          <Route path="/book/:roomId" element={<BookRoom />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/hall" element={<BookHall />} />
        </Route>

        <Route element={<ProtectedRoute roles={['Admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/bookings" element={<ManageBookings />} />
          <Route path="/admin/extensions" element={<Extensions />} />
          <Route path="/admin/halls" element={<HallBookings />} />
          <Route path="/admin/international" element={<InternationalBooking />} />
          <Route path="/admin/rooms" element={<ManageRooms />} />
          <Route path="/admin/blocks" element={<RoomBlocks />} />
          <Route path="/admin/rates" element={<Rates />} />
          <Route path="/admin/payments" element={<Payments />} />
        </Route>

        <Route element={<ProtectedRoute roles={['Incharge', 'Admin']} />}>
          <Route path="/incharge" element={<CheckInOut />} />
        </Route>

        <Route element={<ProtectedRoute roles={['Super Admin']} />}>
          <Route path="/superadmin/users" element={<ManageUsers />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
