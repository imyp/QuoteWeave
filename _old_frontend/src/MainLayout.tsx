import { Outlet } from "react-router";
import NavBar from "./NavBar";

function MainLayout(){
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export default MainLayout;