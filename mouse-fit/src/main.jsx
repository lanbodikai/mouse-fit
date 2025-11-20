import React from 'react'
import ReactDOM from 'react-dom/client'
import Navbar from './components/Navbar'
import Carousel from './components/Carousel'
import './index.css'

// 1. Inject Navbar
const navRoot = document.getElementById('nav-react')
if (navRoot) {
  ReactDOM.createRoot(navRoot).render(
    <React.StrictMode>
      <Navbar />
    </React.StrictMode>
  )
}

// 2. Inject Carousel
const projectRoot = document.getElementById('projects-react')
if (projectRoot) {
  ReactDOM.createRoot(projectRoot).render(
    <React.StrictMode>
      <Carousel />
    </React.StrictMode>
  )
}