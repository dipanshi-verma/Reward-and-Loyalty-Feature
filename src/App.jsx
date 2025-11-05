import React from 'react'
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import LoyaltyProgramApp from './components/LoyaltyProgramApp'
import AppEntry from './AppEntry'
function App() {

  return (
    <>
    <AppEntry/>
      {/* <Routes>
      <Route path='/' element={<LoyaltyProgramApp />} />
      </Routes> */}
    </>
  )
}

export default App
