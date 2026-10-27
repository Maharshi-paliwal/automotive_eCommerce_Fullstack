import { useState, useCallback } from "react"
import { Toaster } from "react-hot-toast"
import {Route, Routes} from "react-router-dom"
import Login from "./pages/Login"
import AppLayout from "./pages/AppLayout"
import Home from "./pages/Home"
import Products from "./pages/Products"
import ProductPage from "./pages/ProductPage"
import FlashDeals from "./pages/FlashDeals"
import Checkout from "./pages/Checkout"
import MyOrders from "./pages/MyOrders"
import Ordertracking from "./pages/Ordertracking"
import Addresses from "./pages/Addresses"
import ProtectedRoutes from "./components/ProtectedRoutes"
import Loader from "./components/Loader"
import SearchResults from "./pages/SearchResults";
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminProducts from "./pages/admin/AdminProducts"
import AdminProductForm from "./pages/admin/AdminProductForm"
import AdminOrders from "./pages/admin/AdminOrders"
import AdminDeliveryPartners from "./pages/admin/AdminDeliveryPartners"
import DeliveryLogin from "./pages/delivery/DeliveryLogin"
import DeliveryLayout from "./pages/delivery/DeliveryLayout"
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard"

const App = () => {
  const [loaderDone, setLoaderDone] = useState(false)
  const handleLoaderComplete = useCallback(() => setLoaderDone(true), [])

  return (
   <>
   {!loaderDone && <Loader onComplete={handleLoaderComplete} />}

   <Toaster position="top-right" toastOptions={{duration:3000, style:{background:"#1B3022", color:"#fff", borderRadius:"12px", fontSize:"14px"}}}/>
   <Routes>
    <Route path="/login" element={<Login/>}/>
    {/* Main part with navbar+footer */}
    <Route path="/" element={<AppLayout/>}>
    <Route index element={<Home/>}/>
    <Route path="/products" element={<Products/>}/>
    <Route path="/products/:id" element={<ProductPage/>}/>
    <Route path="/deals" element={<FlashDeals/>}/>
    <Route element={<ProtectedRoutes/>}>
      <Route path="/checkout" element={<Checkout/>}/>
      <Route path="/orders" element={<MyOrders/>}/>
      <Route path="/orders/:id" element={<Ordertracking/>}/>
      <Route path="/checkout" element={<Checkout/>}/>
      <Route path="/addresses" element={<Addresses/>}/>
      <Route path="/search" element={<SearchResults />} />
    </Route>
    </Route>
    {/* Admin has its own shell so the customer navigation and footer are not duplicated. */}
    <Route path="/admin" element={<AdminLayout/>}>
    <Route index element={<AdminDashboard/>}/>
    <Route path= 'products' element={<AdminProducts/>}/>
    <Route path= 'products/:id/edit' element={<AdminProductForm/>}/>
    <Route path= 'products/new' element={<AdminProductForm/>}/>
    <Route path= 'orders' element={<AdminOrders/>}/>
    <Route path= 'delivery-partners' element={<AdminDeliveryPartners/>}/>
    </Route>

    {/* delivery partner pages  */}
   
{/* Delivery Partner pages */}
<Route path="/delivery/login" element={<DeliveryLogin />} />

<Route path="/delivery" element={<DeliveryLayout />}>
  <Route index element={<DeliveryDashboard />} />
</Route>

   </Routes>
   </>
  )
}

export default App
