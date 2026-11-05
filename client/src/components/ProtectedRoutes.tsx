import {Navigate, Outlet} from "react-router-dom"
const ProtectedRoutes = () => {
  return localStorage.getItem("token") ? <Outlet/> : <Navigate to="/login" replace />
}

export default ProtectedRoutes
