import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import MainLayout from './MainLayout.tsx'
import { Landing, Explore, SignUp, LogIn} from "./pages"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout/>} >
          <Route path="/" element={<Landing/>} />
          <Route path="/explore" element={< Explore/>} />
          <Route path="/signup" element={<SignUp/>} />
          <Route path="/login" element={<LogIn/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
