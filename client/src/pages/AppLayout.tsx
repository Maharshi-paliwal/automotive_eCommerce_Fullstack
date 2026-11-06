import { Outlet, useLocation } from "react-router-dom"
import Banner from "../components/Banner"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import CartSidebar from "../components/CartSidebar"
import ChatWidget from "../components/chat/ChatWidget"
const AppLayout = () => {
  const { pathname } = useLocation()
  const showChat = !["/checkout", "/orders", "/addresses"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  return (
   <>
  <Banner/>
    <Navbar/>
   <main className="min-h-screen">
    <Outlet/>
   </main>
   <Footer/>
   <CartSidebar/>
   {showChat && <ChatWidget/>}
   </>
  )
}

export default AppLayout