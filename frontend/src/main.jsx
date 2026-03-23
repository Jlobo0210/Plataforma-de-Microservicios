
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './pages/App.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ServiceDetail from './pages/ServiceDetail.jsx'
export default function Main() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/service/:id" element={<ServiceDetail />} />
      </Routes>
    </BrowserRouter>
  )
}