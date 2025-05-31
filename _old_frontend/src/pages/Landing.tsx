import { NavLink } from "react-router"
function Landing() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Welcome to QuoteWeave</h1>
      <p className="text-lg mb-8">Create and share your favorite quotes with the world.</p>
      <div className="flex space-x-4">
        <a href="/signup" className="btn btn-primary">Sign Up</a>
        <a href="/quotes" className="btn btn-secondary">Explore Quotes</a>
      </div>
      <p className="mt-8 text-sm text-gray-500">Already have an account? <NavLink to="/login" className="link link-info">Log in</NavLink></p>
    </div>
  )
}

export default Landing
