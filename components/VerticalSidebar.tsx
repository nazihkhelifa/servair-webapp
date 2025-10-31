'use client'

import Link from 'next/link'
import { FiHome, FiMapPin, FiTruck, FiClipboard, FiUser, FiAirplay } from 'react-icons/fi'
import { MdMenu } from 'react-icons/md'

interface VerticalSidebarProps {
  activePage?: 'home' | 'map' | 'trucks' | 'tasks' | 'drivers' | 'flights'
}

export default function VerticalSidebar({ activePage = 'home' }: VerticalSidebarProps) {
  return (
    <aside className="w-16 flex flex-col items-center py-4" style={{ backgroundColor: '#F5F5F5' }}>
      {/* Logo */}
      <div className="mb-8 flex-shrink-0">
        <img 
          src="/servair map.png" 
          alt="Servair" 
          className="w-12 h-12 object-contain"
        />
      </div>

      {/* Navigation Icons - Centered */}
      <nav className="flex flex-col space-y-4 flex-1 justify-center">
        <Link 
          href="/" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'home' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Dashboard"
        >
          <FiHome className="w-7 h-7 text-gray-800" />
        </Link>

        <Link 
          href="/map" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'map' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Map View"
        >
          <FiMapPin className="w-7 h-7 text-gray-800" />
        </Link>

        <Link 
          href="/trucks" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'trucks' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Trucks"
        >
          <FiTruck className="w-7 h-7 text-gray-800" />
        </Link>

        <Link 
          href="/drivers" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'drivers' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Drivers"
        >
          <FiUser className="w-7 h-7 text-gray-800" />
        </Link>

        <Link 
          href="/tasks" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'tasks' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Tasks"
        >
          <FiClipboard className="w-7 h-7 text-gray-800" />
        </Link>

        <Link 
          href="/flights" 
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activePage === 'flights' ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
          title="Flights"
        >
          <FiAirplay className="w-7 h-7 text-gray-800" />
        </Link>

        <button className="w-12 h-12 flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors" title="More">
          <MdMenu className="w-7 h-7 text-gray-800" />
        </button>
      </nav>
    </aside>
  )
}
