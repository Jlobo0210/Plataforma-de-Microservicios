
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './pages/App.jsx'
import Dashboard from './pages/Dashboard.jsx'
export default function Main() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
      </Routes>
    </BrowserRouter>
  )
}