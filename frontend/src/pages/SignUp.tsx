import { createUser } from "../query";
import { NavLink } from "react-router";

async function create(data: FormData) {
    const username = data.get("username");
    const email = data.get("email");
    const password = data.get("password");
    if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
        throw new Error("Invalid input");
    }
    const request = {
        username: username,
        email: email,
        password: password,
    };
    const response = await createUser(request);
    console.log(response);
}


function SignUp() {
    return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Sign Up</h1>
      <p className="text-lg mb-8">Create your account to start sharing quotes.</p>
      <form action={create}>
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">

          <label className="label">Username</label>
          <input type="text" name="username" className="input" placeholder="QuoteAuthor" />

          <label className="label">Email</label>
          <input type="text" name="email" className="input" placeholder="user@example.com" />

          <label className="label">Password</label>
          <input type="password" name="password" className="input" placeholder="••••••••" />

          <input type="submit" className="btn btn-neutral mt-4" value="Create"/>
        </fieldset>
      </form>
      <p className="mt-4 text-sm text-gray-500">Already have an account? <NavLink to="/login" className="link link-info">Log in</NavLink></p>
    </div>
    )
}
export default SignUp