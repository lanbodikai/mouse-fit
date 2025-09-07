import { createRoot } from 'react-dom/client'
import React from 'react'
import Projects from './projects/Projects.jsx'

const el = document.getElementById('projects-react')
if (el) {
  createRoot(el).render(<Projects />)
}
