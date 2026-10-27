import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { heroSectionData } from "../assets/assets";
import { useCartStore } from "../zustand/UseCartStore";
import {
  ArrowUpRightIcon,
  BikeIcon,
  ChevronDownIcon,
  LogOutIcon,
  MapPinIcon,
  MenuIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon,
  Warehouse,
  XIcon,
} from "lucide-react";

const Navbar = () => {
  const user: any = {
    name: "abcd",
    email: "email@gmail.com",
    isAdmin: true,
  };

  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0)
  );

  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);

  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const query = searchQuery.trim();

  if (query) {
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setMobileMenuOpen(false);
  }
};

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-app-border bg-white">
      {/* Main navbar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
       <div>
         <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex shrink-0 items-center gap-2 text-[22px] font-medium"
        >
          <img
            src={heroSectionData.logo}
            alt="TorqueNest logo"
            className="size-[25px] object-contain"
          />

          <span className="font-semibold text-app-blue">
            TorqueNest
          </span>
        </Link>
       </div>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
          <Link to="/" className="transition-colors hover:text-app-amber">
            Home
          </Link>

          <Link
            to="/products"
            className="transition-colors hover:text-app-amber"
          >
            Products
          </Link>

          <Link
            to="/deals"
            className="text-app-amber transition-colors hover:text-app-amber-dark"
          >
            Deals
          </Link>
        </div>

        {/* Desktop search */}
        <form
          onSubmit={handleSearch}
          className="hidden max-w-sm flex-1 text-sm sm:flex"
        >
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search for auto parts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-sky-50 py-2 pl-10 pr-4 ring-1 ring-app-amber/15 transition focus:outline-none focus:ring-2 focus:ring-app-blue-light/30"
            />

            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          </div>
        </form>

        {/* Right-side actions */}
        <div className="ml-1 flex shrink-0 items-center gap-1 sm:gap-2">

          {/* Cart */}
          <button
            type="button"
            aria-label={`Open shopping cart, ${cartCount} items`}
            className="relative rounded-xl p-2 transition-colors hover:bg-app-cream"
            onClick={() => setIsCartOpen(true)}
          >
            <Warehouse className="size-5 text-zinc-900" />

            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-app-amber px-1 text-[10px] font-semibold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative">
            {user ? (
              <>
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-app-cream"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-red-800 text-sm font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>

                  <ChevronDownIcon className="size-3 text-zinc-600" />
                </button>

                {userMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close account menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setUserMenuOpen(false)}
                    />

                    <div className="absolute right-0 z-50 mt-2.5 w-56 rounded-xl border border-app-border bg-white py-2 shadow-xl">
                      <div className="border-b border-app-border px-4 py-3">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {user.name}
                        </p>

                        <p className="truncate text-xs text-zinc-500">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        to="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="dropdown-link"
                      >
                        <BikeIcon size={16} />
                        My Orders
                      </Link>

                      <Link
                        to="/addresses"
                        onClick={() => setUserMenuOpen(false)}
                        className="dropdown-link"
                      >
                        <MapPinIcon size={16} />
                        Addresses
                      </Link>

                      {user.isAdmin && (
                        <Link
                          to="/admin/products"
                          onClick={() => setUserMenuOpen(false)}
                          className="dropdown-link"
                        >
                          <ShieldIcon
                            size={16}
                            className="text-app-amber-dark"
                          />
                          <span className="text-app-amber-dark">
                            Admin Panel
                          </span>
                        </Link>
                      )}

                      <div className="border-t border-app-border pt-1">
                        <button
                          type="button"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-app-error transition-colors hover:bg-red-50"
                        >
                          <LogOutIcon size={16} />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="hidden items-center gap-2 rounded-xl bg-app-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-blue-light md:flex"
              >
                <UserIcon size={16} />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger — independent of login state */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-app-blue transition-colors hover:bg-app-cream md:hidden"
          >
            {mobileMenuOpen ? (
              <XIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileMenuOpen && (
        <div className="border-t border-app-border bg-white shadow-lg md:hidden">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">

            {/* Mobile search */}
            <form onSubmit={handleSearch} className="sm:hidden">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for auto parts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-sky-50 py-3 pl-10 pr-4 text-sm ring-1 ring-app-amber/15 focus:outline-none focus:ring-2 focus:ring-app-blue-light/30"
                />

                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </form>

            {/* Navigation links */}
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-app-blue transition-colors hover:bg-app-cream"
            >
              Home
              <ChevronDownIcon className="size-4 -rotate-90 text-zinc-400" />
            </Link>

            <Link
              to="/products"
              onClick={closeMobileMenu}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-app-blue transition-colors hover:bg-app-cream"
            >
              Products
              <ChevronDownIcon className="size-4 -rotate-90 text-zinc-400" />
            </Link>

            <Link
              to="/deals"
              onClick={closeMobileMenu}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-app-amber transition-colors hover:bg-app-cream"
            >
              <span className="flex items-center gap-2">
                <ArrowUpRightIcon className="size-4" />
                Deals
              </span>
              <ChevronDownIcon className="size-4 -rotate-90 text-zinc-400" />
            </Link>

            {/* Account shortcuts */}
            {user && (
              <div className="space-y-1 border-t border-app-border pt-3">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  My Account
                </p>

                <Link
                  to="/orders"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-700 hover:bg-app-cream"
                >
                  <BikeIcon className="size-4" />
                  My Orders
                </Link>

                <Link
                  to="/addresses"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-700 hover:bg-app-cream"
                >
                  <MapPinIcon className="size-4" />
                  Addresses
                </Link>

                {user.isAdmin && (
                  <Link
                    to="/admin/products"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-app-amber-dark hover:bg-app-cream"
                  >
                    <ShieldIcon className="size-4" />
                    Admin Panel
                  </Link>
                )}
              </div>
            )}

            {!user && (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-app-blue hover:bg-app-cream"
              >
                <UserIcon className="size-4" />
                Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(true);
                closeMobileMenu();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-app-border px-3 py-3 text-sm font-medium text-app-blue hover:bg-app-cream"
            >
              <Warehouse className="size-4" />
              Shopping Cart
              {cartCount > 0 && (
                <span className="ml-auto rounded-full bg-app-amber px-2 py-0.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
