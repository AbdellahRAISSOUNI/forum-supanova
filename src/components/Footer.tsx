"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 text-sm text-slate-600">
          <span className="text-slate-500">© {new Date().getFullYear()} Forum des Entreprises</span>

          <Link
            href="https://ma.linkedin.com/in/abdellah-raissouni-1419432a8"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2"
          >
            <span className="transition-all duration-300 group-hover:text-[#0a66c2] group-hover:underline underline-offset-4">
              Made by Abdellah Raissouni and Rime &lt;3
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-0 h-4 text-slate-400 opacity-0 translate-x-1 group-hover:w-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out group-hover:text-[#0a66c2]"
              aria-hidden="true"
            >
              <path d="M20.447 20.452H17.21V14.98c0-1.305-.027-2.983-1.818-2.983-1.82 0-2.099 1.42-2.099 2.888v5.567H10.06V9h3.111v1.561h.043c.433-.82 1.492-1.685 3.07-1.685 3.283 0 3.888 2.161 3.888 4.972v6.604zM5.337 7.433a1.808 1.808 0 110-3.616 1.808 1.808 0 010 3.616zM6.762 20.452H3.911V9h2.851v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}


