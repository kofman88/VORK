import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import BottomNav from "./components/layout/BottomNav";
import { ProfileSkeleton } from "./components/ui/Skeleton";

const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const GigDetail = lazy(() => import("./pages/GigDetail"));
const CreateGig = lazy(() => import("./pages/CreateGig"));
const EditGig = lazy(() => import("./pages/EditGig"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const ChatList = lazy(() => import("./pages/ChatList"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const FreelancerProfile = lazy(() => import("./pages/FreelancerProfile"));
const MyGigs = lazy(() => import("./pages/MyGigs"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Category = lazy(() => import("./pages/Category"));
const Notifications = lazy(() => import("./pages/Notifications"));

function PageLoader() {
  return <ProfileSkeleton />;
}

export default function Router() {
  return (
    <div className="page-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/gig/:id" element={<GigDetail />} />
          <Route path="/gig/create" element={<CreateGig />} />
          <Route path="/gig/:id/edit" element={<EditGig />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/chats" element={<ChatList />} />
          <Route path="/chats/:userId" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<FreelancerProfile />} />
          <Route path="/my-gigs" element={<MyGigs />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  );
}
