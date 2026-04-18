import { Link } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="bg-slate-950 border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-lg text-white hover:text-blue-400 transition-colors">
            Feature Flags
          </Link>
          <div className="flex gap-4">
            <Link 
              to="/" 
              className="text-slate-400 hover:text-white transition-colors"
            >
              Flags
            </Link>
            <Link 
              to="/graph" 
              className="text-slate-400 hover:text-white transition-colors"
            >
              Graph
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
