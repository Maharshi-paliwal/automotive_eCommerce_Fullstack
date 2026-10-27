import { NavLink, Outlet } from "react-router-dom";
import { PlusIcon, PackageSearchIcon, ShoppingBagIcon, LogOutIcon, BarChart3Icon, ShieldIcon, Truck } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function AdminLayout() {

    const AdminLinkData = [
        { to: "/admin", label: "Dashboard", icon: BarChart3Icon },
        { to: "/admin/products/new", label: "Add Product", icon: PlusIcon },
        { to: "/admin/products", label: "Products", icon: PackageSearchIcon },
        { to: "/admin/orders", label: "Orders", icon: ShoppingBagIcon },
        { to: "/admin/delivery-partners", label: "Delivery Partners", icon: Truck },
        { to: "/", label: "Exit", icon: LogOutIcon },
    ]

    return (
        <div className="admin-shell">
            <Navbar />
            <div className="mx-auto flex max-w-[1480px] flex-col items-start gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:gap-4 lg:px-6">
                {/* Admin Sidebar */}
                <aside className="workspace-surface h-fit w-full shrink-0 p-2.5 lg:sticky lg:top-4 lg:self-start lg:w-52">
                    <div className="mb-2 border-b border-app-border px-2 pb-2.5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-app-blue">
                            <ShieldIcon className="size-5 text-app-amber-dark" /> Admin Panel
                        </h2>
                    </div>
                    <nav className="flex flex-row gap-1.5 overflow-x-auto no-scrollbar lg:flex-col">

                        {AdminLinkData.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={true}
                                className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${isActive
                                    ? "bg-app-blue text-white shadow-sm"
                                    : "text-app-text-light hover:bg-app-amber/10 hover:text-app-blue"
                                    }`}
                            >
                                <link.icon className="size-4" /> {link.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="admin-workspace min-w-0 flex-1 pb-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
