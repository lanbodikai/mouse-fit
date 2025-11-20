import React from 'react'
import ReactDOM from 'react-dom/client'
import Navbar from './components/Navbar'
import Carousel from './components/Carousel'
import './index.css'

const NAVBAR_DESKTOP_HEIGHT = 80
const NAVBAR_MOBILE_HEIGHT = 80

// 1. Inject Navbar
const navRoot = document.getElementById('nav-react')
if (navRoot) {
  ReactDOM.createRoot(navRoot).render(
    <React.StrictMode>
      <Navbar />
    </React.StrictMode>
  )

  if (!document.body.classList.contains('nav-offset-disabled')) {
    const spacerId = 'nav-offset-spacer'

    const ensureNavSpacer = () => {
      const navElement = navRoot.querySelector('.navbar')
      const fallbackHeight =
        window.innerWidth <= 768 ? NAVBAR_MOBILE_HEIGHT : NAVBAR_DESKTOP_HEIGHT
      const spacerHeight = navElement?.offsetHeight ?? fallbackHeight

      let spacer = document.getElementById(spacerId)
      if (!spacer) {
        spacer = document.createElement('div')
        spacer.id = spacerId
        spacer.setAttribute('aria-hidden', 'true')
        spacer.style.width = '100%'
        spacer.style.flex = '0 0 auto'
        navRoot.insertAdjacentElement('afterend', spacer)
      }

      spacer.style.height = `${spacerHeight}px`
    }

    ensureNavSpacer()
    requestAnimationFrame(ensureNavSpacer)
    window.addEventListener('resize', ensureNavSpacer)
  }
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
