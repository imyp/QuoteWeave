import { NavLink } from "react-router";

/**Log in page for QuoteWeave */
function LogIn() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Log In</h1>
      <p className="text-lg mb-8">Please enter your credentials to log in.</p>

      <form >
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">

          <label className="label">Username</label>
          <input type="text" name="username" className="input" placeholder="QuoteAuthor" />

          <label className="label">Password</label>
          <input type="password" name="password" className="input" placeholder="••••••••" />

          <input type="submit" className="btn btn-neutral mt-4" value="Log in"/>
        </fieldset>
      </form>
      <p className="mt-4 text-sm text-gray-500">Don't have an account? <NavLink to="/signup" className="link link-info">Sign up</NavLink></p>
    </div>
  );
}

export default LogIn;