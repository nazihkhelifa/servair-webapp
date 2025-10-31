'use client'

import VerticalSidebar from '../../components/VerticalSidebar'

export default function SearchPlaceholder() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="search" />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Global Search Coming Soon</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            A unified search across trucks, drivers, assignments, and locations is on the roadmap. Check back soon for updates.
          </p>
        </div>
      </main>
    </div>
  )
}

