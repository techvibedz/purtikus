import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Palette, Bell, Shield, Key, Info, Eye, EyeOff, Check, ExternalLink, Languages, Download, RefreshCw } from 'lucide-react'
import { useApiKey } from '@/hooks/useApiKey'

const LANG_OPTIONS = [
  { value: 'auto', label: 'Auto-detect', desc: 'AI detects your language automatically' },
  { value: 'en', label: 'English', desc: 'Always respond in English' },
  { value: 'ar', label: 'العربية (MSA)', desc: 'Modern Standard Arabic' },
  { value: 'dz', label: 'دارجة جزائرية', desc: 'Algerian Darija dialect' },
]

const otherSections = [
  { name: 'Profile', desc: 'Name, avatar, and preferences', icon: <User size={20} /> },
  { name: 'Appearance', desc: 'Theme, colors, and layout', icon: <Palette size={20} /> },
  { name: 'Notifications', desc: 'Alerts and sound settings', icon: <Bell size={20} /> },
  { name: 'Privacy', desc: 'Data and conversation privacy', icon: <Shield size={20} /> },
  { name: 'About', desc: 'Version and license info', icon: <Info size={20} /> },
]

export default function SettingsView() {
  const { apiKey, setApiKey, hasKey } = useApiKey()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('purtikus-lang') || 'auto')
  const [updateStatus, setUpdateStatus] = useState<'idle'|'checking'|'available'|'downloading'|'ready'|'none'|'error'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    const u = window.electron?.updater
    if (!u) return
    u.onAvailable((d) => { setUpdateVersion(d.version); setUpdateStatus('available') })
    u.onNotAvailable(() => setUpdateStatus('none'))
    u.onProgress((d) => { setUpdateProgress(Math.round(d.percent)); setUpdateStatus('downloading') })
    u.onDownloaded((d) => { setUpdateVersion(d.version); setUpdateStatus('ready') })
    u.onError((d) => { setUpdateError(d.message); setUpdateStatus('error') })
  }, [])

  const checkUpdate = async () => {
    setUpdateStatus('checking')
    const r = await window.electron?.updater?.check()
    if (r && !r.available && !r.error) setUpdateStatus('none')
    if (r?.error) { setUpdateError(r.error); setUpdateStatus('error') }
  }

  const downloadUpdate = async () => {
    setUpdateStatus('downloading'); setUpdateProgress(0)
    await window.electron?.updater?.download()
  }

  useEffect(() => {
    localStorage.setItem('purtikus-lang', lang)
  }, [lang])

  const handleSave = () => {
    setApiKey(keyInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold neon-text-blue mb-2">Settings</h1>
      <p className="text-white/40 text-sm mb-8">Configure Purtikus</p>

      <div className="space-y-6 max-w-2xl">
        {/* API Keys section */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-white/90 font-semibold text-sm">Gemini API Key</h3>
              <p className="text-white/30 text-xs">Required for voice chat with Gemini 2.5 Flash</p>
            </div>
            {hasKey && (
              <span className="ml-auto text-xs text-emerald-400/70 flex items-center gap-1">
                <Check size={12} /> Configured
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-primary/40 transition-colors font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={keyInput === apiKey}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                keyInput !== apiKey
                  ? 'bg-gradient-to-r from-accent to-primary text-white shadow-neon-violet'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {saved ? 'Saved!' : 'Save'}
            </motion.button>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent/60 hover:text-accent flex items-center gap-1 transition-colors"
          >
            Get a free API key from Google AI Studio
            <ExternalLink size={10} />
          </a>
        </motion.div>

        {/* Language Preference section */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Languages size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-white/90 font-semibold text-sm">Language Preference</h3>
              <p className="text-white/30 text-xs">Choose how Purtikus responds to you</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {LANG_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLang(opt.value)}
                className={`text-left px-3 py-3 rounded-lg border transition-all ${
                  lang === opt.value
                    ? 'border-primary/40 bg-primary/10 shadow-neon-violet'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-medium ${lang === opt.value ? 'text-white/90' : 'text-white/60'}`}>
                    {opt.label}
                  </span>
                  {lang === opt.value && <Check size={12} className="text-primary" />}
                </div>
                <p className="text-[10px] text-white/30">{opt.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Updates section */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Download size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white/90 font-semibold text-sm">Updates</h3>
              <p className="text-white/30 text-xs">Current version: v{__APP_VERSION__}</p>
            </div>
          </div>

          {updateStatus === 'idle' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={checkUpdate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-all">
              <RefreshCw size={14} /> Check for updates
            </motion.button>
          )}
          {updateStatus === 'checking' && (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <RefreshCw size={14} className="animate-spin" /> Checking...
            </div>
          )}
          {updateStatus === 'none' && (
            <p className="text-emerald-400/60 text-sm flex items-center gap-1">
              <Check size={14} /> You're up to date!
            </p>
          )}
          {updateStatus === 'available' && (
            <div>
              <p className="text-white/60 text-sm mb-2">Version <strong className="text-white/90">{updateVersion}</strong> is available</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={downloadUpdate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-primary text-white text-sm shadow-neon-violet">
                <Download size={14} /> Download update
              </motion.button>
            </div>
          )}
          {updateStatus === 'downloading' && (
            <div>
              <p className="text-white/50 text-xs mb-2">Downloading... {updateProgress}%</p>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-300" style={{ width: `${updateProgress}%` }} />
              </div>
            </div>
          )}
          {updateStatus === 'ready' && (
            <div>
              <p className="text-emerald-400/70 text-sm mb-2">Version {updateVersion} downloaded!</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => window.electron?.updater?.install()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">
                Restart & Install
              </motion.button>
            </div>
          )}
          {updateStatus === 'error' && (
            <div>
              <p className="text-red-400/60 text-xs mb-2">{updateError}</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={checkUpdate}
                className="text-white/40 text-xs hover:text-white/60">Try again</motion.button>
            </div>
          )}
        </motion.div>

        {/* Other settings sections */}
        <div className="space-y-2">
          {otherSections.map((section, i) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (i + 2) * 0.06 }}
              whileHover={{ x: 4 }}
              className="glass rounded-lg px-5 py-4 flex items-center gap-4 cursor-pointer group hover:shadow-neon-blue/10 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <span className="text-white/40 group-hover:text-accent transition-colors">
                  {section.icon}
                </span>
              </div>
              <div>
                <h3 className="text-white/80 font-medium text-sm">{section.name}</h3>
                <p className="text-white/30 text-xs">{section.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
