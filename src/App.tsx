import { useState } from 'react'
import TitleBar from '@/components/TitleBar'
import Sidebar from '@/components/Sidebar'
import MainContent from '@/components/MainContent'

export default function App() {
  const [activeSection, setActiveSection] = useState('chat')

  return (
    <div className="flex flex-col h-screen w-screen bg-deep-black overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <MainContent activeSection={activeSection} />
      </div>
    </div>
  )
}
