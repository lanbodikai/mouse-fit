import React from 'react'
import Navbar from './components/Navbar'
import Carousel from './components/Carousel'

// Replace these URLs with images from your "beautiful picture" theme later
const sliderData = [
  { title: "Gaming Mice", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80" },
  { title: "Keyboards", image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80" },
  { title: "Headsets", image: "https://images.unsplash.com/photo-1612287230217-969869806074?auto=format&fit=crop&w=600&q=80" },
  { title: "Monitors", image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=600&q=80" },
  { title: "Setup Wars", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80" }
];

function App() {
  return (
    <div className="App">
      <Navbar />

      <main style={{ paddingTop: '120px', textAlign: 'center', minHeight: '100vh' }}>
        
        <div style={{ marginBottom: '60px', padding: '0 20px' }}>
          {/* Large Hero Text */}
          <h1 style={{ 
             fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
             fontWeight: '800', 
             marginBottom: '16px',
             textShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}>
            FIND YOUR <span style={{ color: 'var(--primary-color)', textShadow: '0 0 20px var(--primary-color)' }}>PERFECT FIT</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            The ultimate database for gaming mice dimensions and shapes.
          </p>
        </div>

        {/* The 3D Carousel */}
        <section id="carousel-container" style={{ position: 'relative', zIndex: 10 }}>
          <Carousel slides={sliderData} />
        </section>

      </main>
    </div>
  )
}

export default App