'use client'

import { useState } from 'react'
import {
  Check,
  Copy,
  Code2,
  Globe,
  Palette,
  Monitor,
  Smartphone,
  ExternalLink,
} from '@/components/ui/icons'

interface Props {
  chefId: string
}

type EmbedMode = 'inline' | 'popup'
type ThemeMode = 'light' | 'dark'

const PRESET_COLORS = [
  { hex: '#e88f47', label: 'Terracotta' },
  { hex: '#2563eb', label: 'Blue' },
  { hex: '#16a34a', label: 'Green' },
  { hex: '#dc2626', label: 'Red' },
  { hex: '#9333ea', label: 'Purple' },
  { hex: '#0891b2', label: 'Teal' },
  { hex: '#ca8a04', label: 'Gold' },
  { hex: '#1c1917', label: 'Black' },
]

function getWidgetOrigin() {
  if (typeof window !== 'undefined') {
    // In production, use the real domain
    if (window.location.hostname === 'localhost') {
      return `http://localhost:${window.location.port || '3100'}`
    }
    return window.location.origin
  }
  return 'https://app.cheflowhq.com'
}

export function EmbedCodePanel({ chefId }: Props) {
  const [mode, setMode] = useState<EmbedMode>('inline')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [accent, setAccent] = useState('#e88f47')
  const [customColor, setCustomColor] = useState('')
  const [buttonText, setButtonText] = useState('Book a Private Chef')
  const [copied, setCopied] = useState(false)
  const [activeGuide, setActiveGuide] = useState<string | null>(null)

  const origin = getWidgetOrigin()

  const embedCode =
    mode === 'inline'
      ? `<script\n  src="${origin}/embed/chefflow-widget.js"\n  data-chef-id="${chefId}"\n  data-accent="${accent}"\n  data-theme="${theme}"\n  data-mode="inline"\n></script>`
      : `<script\n  src="${origin}/embed/chefflow-widget.js"\n  data-chef-id="${chefId}"\n  data-accent="${accent}"\n  data-theme="${theme}"\n  data-mode="popup"\n  data-button-text="${buttonText}"\n></script>`

  const iframeDirectCode = `<iframe\n  src="${origin}/embed/inquiry/${chefId}?accent=${encodeURIComponent(accent)}&theme=${theme}"\n  style="width:100%;min-height:900px;border:none;border-radius:16px;"\n  title="Book a Private Chef"\n  loading="lazy"\n></iframe>`

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── How It Works ── */}
      <div className="rounded-xl border border-brand-700 bg-brand-950/40 p-5">
        <h2 className="text-lg font-semibold text-brand-200 mb-2">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-3">
            <div className="flex-none w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-brand-400 font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-stone-100">Copy your code</p>
              <p className="text-stone-500">Customize the look, then copy the snippet below.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-none w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-brand-400 font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-stone-100">Paste on your site</p>
              <p className="text-stone-500">Add it to your Wix, Squarespace, or WordPress page.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-none w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-brand-400 font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-stone-100">Leads flow in</p>
              <p className="text-stone-500">
                Submissions appear in your ChefFlow inquiry pipeline.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Widget Configuration ── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-5">
        <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
          <Palette className="h-5 w-5 text-stone-300" />
          Customize Your Widget
        </h2>

        {/* Mode */}
        <div>
          <label className="text-sm font-medium text-stone-300 block mb-2">Display Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('inline')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === 'inline'
                  ? 'border-brand-400 bg-brand-950 ring-1 ring-brand-400'
                  : 'border-stone-700 hover:border-stone-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="h-4 w-4" />
                <span className="font-medium text-sm">Inline</span>
              </div>
              <p className="text-xs text-stone-500">Form embeds directly in your page content.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('popup')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === 'popup'
                  ? 'border-brand-400 bg-brand-950 ring-1 ring-brand-400'
                  : 'border-stone-700 hover:border-stone-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium text-sm">Popup</span>
              </div>
              <p className="text-xs text-stone-500">
                Floating button opens form in a modal overlay.
              </p>
            </button>
          </div>
        </div>

        {/* Theme */}
        <div>
          <label className="text-sm font-medium text-stone-300 block mb-2">Theme</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-brand-400 bg-brand-950 ring-1 ring-brand-400'
                  : 'border-stone-700 hover:border-stone-600'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-brand-400 bg-brand-950 ring-1 ring-brand-400'
                  : 'border-stone-700 hover:border-stone-600'
              }`}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-sm font-medium text-stone-300 block mb-2">Accent Color</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setAccent(c.hex)
                  setCustomColor('')
                }}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  accent === c.hex
                    ? 'border-stone-900 scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Custom hex (e.g. #ff6b35)"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value)
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  setAccent(e.target.value)
                }
              }}
              className="px-3 py-1.5 border border-stone-700 rounded-lg text-sm w-44"
            />
            <div
              className="w-6 h-6 rounded-full border border-stone-600"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>

        {/* Button Text (popup only) */}
        {mode === 'popup' && (
          <div>
            <label className="text-sm font-medium text-stone-300 block mb-2">Button Text</label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              maxLength={40}
              className="px-3 py-2 border border-stone-700 rounded-lg text-sm w-full max-w-xs"
            />
          </div>
        )}
      </div>

      {/* ── Embed Code ── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-stone-300" />
            Your Embed Code
          </h2>
          <button
            onClick={() => handleCopy(embedCode)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <pre className="bg-stone-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed font-mono">
          {embedCode}
        </pre>

        <p className="text-xs text-stone-500">
          Paste this code on any page of your website where you want the booking form to appear.
        </p>

        {/* Alternative: Direct iframe */}
        <details className="border border-stone-700 rounded-lg">
          <summary className="px-4 py-2.5 text-sm font-medium text-stone-300 cursor-pointer hover:bg-stone-800">
            Alternative: Direct iframe embed (for platforms that block external scripts)
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-stone-500">
              Some website builders block external JavaScript. If the script method doesn&apos;t
              work, use this iframe instead:
            </p>
            <pre className="bg-stone-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto leading-relaxed font-mono">
              {iframeDirectCode}
            </pre>
            <button
              onClick={() => handleCopy(iframeDirectCode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-600 text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy iframe Code
            </button>
          </div>
        </details>
      </div>

      {/* ── Preview ── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
          <Globe className="h-5 w-5 text-stone-300" />
          Live Preview
        </h2>
        <div
          className="rounded-xl overflow-hidden border border-stone-700"
          style={{ backgroundColor: theme === 'dark' ? '#1c1917' : '#f5f5f4' }}
        >
          <iframe
            src={`/embed/inquiry/${chefId}?accent=${encodeURIComponent(accent)}&theme=${theme}`}
            style={{ width: '100%', minHeight: '900px', border: 'none', display: 'block' }}
            title="Widget Preview"
          />
        </div>
      </div>

      {/* ── Platform-Specific Guides ── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Setup Guides by Platform</h2>
        <p className="text-sm text-stone-500">
          Click your website platform for step-by-step instructions.
        </p>

        {/* Wix */}
        <PlatformGuide
          name="Wix"
          isOpen={activeGuide === 'wix'}
          onToggle={() => setActiveGuide(activeGuide === 'wix' ? null : 'wix')}
          steps={[
            'Log into your Wix dashboard and open the page editor for the page where you want the booking form.',
            'Click the "+" (Add Elements) button in the left sidebar.',
            'Select "Embed Code" > "Embed HTML".',
            'A code box will appear on your page. Click "Enter Code" on the box.',
            'Switch to the "Code" tab (not "Website Address").',
            'Paste your ChefFlow embed code (copied above) into the code box.',
            'Click "Update" to apply.',
            'Resize the embed box by dragging its corners — make it at least 600px wide and 900px tall.',
            'Click "Publish" in the top right to make the changes live.',
            'Test by visiting your published page and submitting a test inquiry.',
          ]}
          tips={[
            'If the form appears cut off, increase the height of the embed box.',
            'The embed box can be placed anywhere on your page — header, body, or a dedicated "Book Now" section.',
            'For the popup button mode, place the code on your homepage so the button appears site-wide.',
            'You only need to add the code once — it loads dynamically, so updates from ChefFlow appear automatically.',
          ]}
        />

        {/* Squarespace */}
        <PlatformGuide
          name="Squarespace"
          isOpen={activeGuide === 'squarespace'}
          onToggle={() => setActiveGuide(activeGuide === 'squarespace' ? null : 'squarespace')}
          steps={[
            'Log into your Squarespace site and navigate to the page where you want the form.',
            'Click "Edit" on the page.',
            'Click the "+" to add a new block.',
            'Select "Code" from the block options (under "More" if not visible).',
            'In the code block settings, make sure "Display Source" is OFF.',
            'Paste your ChefFlow embed code into the code block.',
            'Click outside the code block to apply, then click "Save" in the top left.',
            'Preview your page to verify the form appears correctly.',
            'For the popup mode: Go to Settings > Advanced > Code Injection > Footer, and paste the code there for site-wide coverage.',
          ]}
          tips={[
            'Squarespace code blocks work on all plan levels (Basic and above).',
            'If using "Code Injection" (popup mode), the floating button will appear on every page.',
            'The inline form adapts to the width of its container — use a full-width section for best results.',
          ]}
        />

        {/* WordPress */}
        <PlatformGuide
          name="WordPress"
          isOpen={activeGuide === 'wordpress'}
          onToggle={() => setActiveGuide(activeGuide === 'wordpress' ? null : 'wordpress')}
          steps={[
            'Log into your WordPress admin dashboard.',
            'Navigate to the page where you want the booking form (Pages > Edit).',
            'If using the Block Editor (Gutenberg): Click "+" to add a block, search for "Custom HTML", and add it.',
            'Paste your ChefFlow embed code into the HTML block.',
            'Click "Preview" to verify, then "Update" to publish.',
            'If using the Classic Editor: Switch to "Text" mode (not "Visual"), paste the code where you want it, then switch back to "Visual" to verify.',
            'For site-wide popup button: Go to Appearance > Theme Editor > footer.php and paste the code just before the closing </body> tag. Or use a plugin like "Insert Headers and Footers" to add it safely.',
          ]}
          tips={[
            'If your theme has a page builder (Elementor, Divi, etc.), look for an "HTML" or "Code" widget to paste the embed code.',
            "The script is lightweight (~4KB) and loads asynchronously — it won't slow down your page.",
            'WordPress.com free plans may block external scripts. You need a Business plan or self-hosted WordPress for custom HTML.',
          ]}
        />

        {/* Custom HTML / Other */}
        <PlatformGuide
          name="Custom Website / HTML"
          isOpen={activeGuide === 'html'}
          onToggle={() => setActiveGuide(activeGuide === 'html' ? null : 'html')}
          steps={[
            'Open the HTML file for the page where you want the booking form.',
            'For inline mode: Paste the embed code where you want the form to appear in the <body> section.',
            'For popup mode: Paste the embed code just before the closing </body> tag — the floating button will appear automatically.',
            'Save and deploy your changes.',
            'If your site uses a build system (React, Next.js, etc.), add the script tag to your component or layout template.',
          ]}
          tips={[
            'The widget is self-contained — it creates its own iframe and styles. No CSS conflicts with your site.',
            'For React/Next.js apps, use a useEffect hook to dynamically add the script tag.',
            'The widget fires postMessage events you can listen for: "chefflow-inquiry-submitted" and "chefflow-widget-loaded".',
          ]}
        />

        {/* GoDaddy */}
        <PlatformGuide
          name="GoDaddy Website Builder"
          isOpen={activeGuide === 'godaddy'}
          onToggle={() => setActiveGuide(activeGuide === 'godaddy' ? null : 'godaddy')}
          steps={[
            'Log into your GoDaddy account and open the Website Builder.',
            'Navigate to the page where you want the form.',
            'Click "Add Section" and select "HTML" or "Embed" section type.',
            'Paste your ChefFlow embed code into the HTML field.',
            'Click "Done" and preview the page.',
            'Publish your site to make changes live.',
          ]}
          tips={[
            "GoDaddy's builder may strip some script attributes. If the script method doesn't work, try the iframe alternative code instead.",
            'Use the iframe method for maximum compatibility with GoDaddy.',
          ]}
        />

        {/* Shopify */}
        <PlatformGuide
          name="Shopify"
          isOpen={activeGuide === 'shopify'}
          onToggle={() => setActiveGuide(activeGuide === 'shopify' ? null : 'shopify')}
          steps={[
            'In your Shopify admin, go to Online Store > Pages.',
            'Create a new page or edit an existing one.',
            'In the content editor, click the "<>" (HTML) button to switch to HTML mode.',
            'Paste the iframe alternative code (not the script — Shopify blocks external scripts in page content).',
            'Save the page.',
            'For site-wide popup: Go to Online Store > Themes > Actions > Edit Code > theme.liquid, and paste the script code before </body>.',
          ]}
          tips={[
            'Shopify page content blocks external scripts for security. Use the iframe method for inline forms.',
            'For the popup button, the theme.liquid approach ensures it appears on every page.',
          ]}
        />
      </div>

      {/* ── Troubleshooting ── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Troubleshooting</h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-stone-100">The form doesn&apos;t appear on my page</p>
            <p className="text-stone-500 mt-0.5">
              Try the iframe alternative code. Some platforms block external JavaScript but allow
              iframes. Also check that you&apos;ve published the page after adding the code.
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-100">The form is cut off or too short</p>
            <p className="text-stone-500 mt-0.5">
              Increase the height of the embed container. The form needs at least 900px of height.
              On Wix, drag the embed box corners to make it taller.
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-100">
              I submitted a test but it didn&apos;t appear in ChefFlow
            </p>
            <p className="text-stone-500 mt-0.5">
              Check your Inquiries page in ChefFlow — new submissions appear with channel
              &quot;website&quot; and status &quot;new.&quot; Make sure you used a real email
              address (the form validates email format).
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-100">The colors don&apos;t match my website</p>
            <p className="text-stone-500 mt-0.5">
              Use the accent color picker above to match your brand color. Enter your exact hex code
              for a perfect match. The widget will use this color for buttons and highlights.
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-100">
              The popup button overlaps with something on my site
            </p>
            <p className="text-stone-500 mt-0.5">
              The button is positioned at the bottom-right corner. If it overlaps with a chat widget
              or other element, try using inline mode instead.
            </p>
          </div>
        </div>
      </div>

      {/* ── What Happens After ── */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-950/40 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-emerald-900">
          What Happens When Someone Submits
        </h2>
        <ol className="text-sm text-emerald-800 space-y-2 list-decimal list-inside">
          <li>
            The visitor fills out the form on <strong>your website</strong> — they never leave your
            site.
          </li>
          <li>
            ChefFlow creates a <strong>new client record</strong> (or matches an existing one by
            email).
          </li>
          <li>
            A <strong>new inquiry</strong> appears in your pipeline with status &quot;New&quot; and
            channel &quot;Website.&quot;
          </li>
          <li>
            A <strong>draft event</strong> is automatically created with the submitted details.
          </li>
          <li>
            The client receives a <strong>confirmation email</strong> acknowledging their inquiry.
          </li>
          <li>
            Remy runs <strong>AI lead scoring</strong> in the background to prioritize hot leads.
          </li>
          <li>
            You review and respond from your ChefFlow dashboard — the full pipeline takes over.
          </li>
        </ol>
      </div>
    </div>
  )
}

// ── Platform Guide Component ──
function PlatformGuide({
  name,
  isOpen,
  onToggle,
  steps,
  tips,
}: {
  name: string
  isOpen: boolean
  onToggle: () => void
  steps: string[]
  tips?: string[]
}) {
  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-stone-800 transition-colors"
      >
        <span className="font-medium text-sm text-stone-100">{name}</span>
        <span className="text-stone-300 text-lg">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-stone-800">
          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-3 mb-2">
            Step-by-Step
          </h4>
          <ol className="text-sm text-stone-300 space-y-2 list-decimal list-inside">
            {steps.map((step, i) => (
              <li key={i} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>

          {tips && tips.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-4 mb-2">
                Tips
              </h4>
              <ul className="text-sm text-stone-300 space-y-1.5 list-disc list-inside">
                {tips.map((tip, i) => (
                  <li key={i} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
