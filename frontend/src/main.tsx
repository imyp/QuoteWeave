import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import './index.css'
import MainLayout from './MainLayout.tsx'
import { Landing, Quotes, SignUp, LogIn, Author, Quote, Collection} from "./pages"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout/>} >
          <Route path="/" element={<Landing/>} />
          <Route path="/quotes" element={<Navigate to="/quotes/page/1"/>} />
          <Route path="/quotes/:quoteId" element={<Quote/>} />
          <Route path="/quotes/page/:pageNumber" element={< Quotes/>} />
          <Route path="/signup" element={<SignUp/>} />
          <Route path="/login" element={<LogIn/>} />
          <Route path="/authors/:authorId" element={<Author/>} />
          <Route path="/collections/:collectionId" element={<Collection/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
