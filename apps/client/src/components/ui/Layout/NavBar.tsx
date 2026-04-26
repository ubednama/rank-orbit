"use client";

import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState } from "react";
import { ModeToggle } from "../../mode-toggle";
import Logo from "../Logo";
import { Menu, X, LogIn, LogOut, User } from "lucide-react";
import { useUserContext } from "@/providers/UserContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, logout } = useUserContext();

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuVariants: Variants = {
    closed: { opacity: 0, x: "100%", transition: { type: "spring", stiffness: 300, damping: 30 } },
    open: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 border-b border-gray-200/50 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-xl supports-backdrop-filter:bg-white/40 dark:supports-backdrop-filter:bg-black/20"
    >
      <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group z-50">
          <Logo className="w-9 h-9 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500">
            Rank Orbit
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/#features"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            API Docs
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />

          {!isLoading && user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:block">
                Hey, {user.firstName}
              </span>
              <button
                onClick={logout}
                className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center space-x-2 shadow-md shadow-indigo-500/30 ring-1 ring-indigo-700/30 hover:shadow-lg hover:shadow-indigo-500/40"
            >
              <span>Login</span>
              <LogIn className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center space-x-4 md:hidden">
          <ModeToggle />
          <button onClick={toggleMenu} className="text-gray-900 dark:text-white p-2 z-50">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed inset-0 top-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl z-40 md:hidden flex flex-col p-6 space-y-6 border-t border-gray-200 dark:border-white/10"
          >
            <Link
              href="/#features"
              onClick={toggleMenu}
              className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-500"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              onClick={toggleMenu}
              className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-500"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              onClick={toggleMenu}
              className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-500"
            >
              API Docs
            </Link>
            <hr className="border-gray-200 dark:border-white/10" />

            {!isLoading && user ? (
              <>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-5 h-5" />
                  <span>{user.fullName || user.firstName}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-lg font-medium text-red-500 hover:text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 transition-colors"
              >
                <span>Login / Sign Up</span>
                <LogIn className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
