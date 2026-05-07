import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { WaxCraft } from './pages/WaxCraft'

export type RegionId = 'dansai' | 'huangping' | 'anshun' | 'zhijin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/craft/:regionId" element={<WaxCraft />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
