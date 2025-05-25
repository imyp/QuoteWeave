import logo from '/logo.svg';
import { NavLink } from 'react-router';

function NavBar() {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <NavLink to="/" className="btn btn-ghost text-xl">
          <img src={logo} alt="Logo" className="h-6 w-6 mr-1" />
          QuoteWeave
        </NavLink>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><NavLink to="/explore" className={({isActive}) => isActive ? "font-bold" : "" }>Explore</NavLink></li>
          <li><NavLink to="/signup" className={({isActive}) => isActive ? "font-bold" : "" }>Sign up</NavLink></li>
          <li><NavLink to="/login" className={({isActive}) => isActive ? "font-bold" : "" }>Log in</NavLink></li>
        </ul>
      </div>
    </div>
  )
}

export default NavBar;