'use client'

/**
 * DataFlowSchematic — pure React/SVG inline diagram.
 * Shows the private loop: Chef → ChefFlow Private AI → Chef.
 * Clear "X" over any path to external servers or third parties.
 *
 * Simplified from the original two-column comparison to focus on
 * what actually happens — a closed loop within ChefFlow.
 */

import { Check, X, Shield, Server } from 'lucide-react'

export function DataFlowSchematic() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-100">Where Does Your Data Go?</h2>
        <p className="text-sm text-stone-500 mt-1">
          Your conversations with Remy stay within ChefFlow. Here&apos;s exactly how.
        </p>
      </div>

      {/* ─── Private Loop Diagram ────────────────────────────── */}
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-950/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-900 flex items-center justify-center">
            <Shield className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">Remy Conversations</h3>
            <p className="text-xs text-emerald-600">Private loop — nothing leaves ChefFlow</p>
          </div>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 400 200"
            className="w-full"
            aria-label="Diagram showing Remy conversations stay within ChefFlow's private infrastructure"
          >
            {/* ChefFlow boundary */}
            <rect
              x="15"
              y="10"
              width="370"
              height="120"
              rx="12"
              fill="#ecfdf5"
              stroke="#6ee7b7"
              strokeWidth="2"
              strokeDasharray="6,3"
            />
            <text
              x="200"
              y="30"
              textAnchor="middle"
              className="fill-emerald-800 text-[11px] font-semibold"
            >
              ChefFlow (everything stays here)
            </text>

            {/* You → box */}
            <rect
              x="30"
              y="48"
              width="110"
              height="44"
              rx="8"
              fill="#d1fae5"
              stroke="#34d399"
              strokeWidth="1.5"
            />
            <text
              x="85"
              y="67"
              textAnchor="middle"
              className="fill-emerald-800 text-[11px] font-semibold"
            >
              You
            </text>
            <text x="85" y="81" textAnchor="middle" className="fill-emerald-600 text-[8px]">
              Browser (your device)
            </text>

            {/* Arrow right */}
            <line
              x1="140"
              y1="66"
              x2="175"
              y2="66"
              stroke="#10b981"
              strokeWidth="2"
              markerEnd="url(#arrowG)"
            />
            <text
              x="157"
              y="60"
              textAnchor="middle"
              className="fill-emerald-700 text-[7px] font-medium"
            >
              request
            </text>

            {/* Arrow left (response) */}
            <line
              x1="175"
              y1="76"
              x2="140"
              y2="76"
              stroke="#10b981"
              strokeWidth="2"
              markerEnd="url(#arrowGL)"
            />
            <text
              x="157"
              y="88"
              textAnchor="middle"
              className="fill-emerald-700 text-[7px] font-medium"
            >
              response
            </text>

            {/* Remy AI box */}
            <rect
              x="175"
              y="48"
              width="120"
              height="44"
              rx="8"
              fill="#d1fae5"
              stroke="#34d399"
              strokeWidth="1.5"
            />
            <text
              x="235"
              y="67"
              textAnchor="middle"
              className="fill-emerald-800 text-[11px] font-semibold"
            >
              Remy (Ollama)
            </text>
            <text x="235" y="81" textAnchor="middle" className="fill-emerald-600 text-[8px]">
              ChefFlow&apos;s private servers
            </text>

            {/* Conversation storage label */}
            <rect
              x="30"
              y="100"
              width="110"
              height="22"
              rx="5"
              fill="#a7f3d0"
              stroke="#34d399"
              strokeWidth="1"
            />
            <text
              x="85"
              y="115"
              textAnchor="middle"
              className="fill-emerald-800 text-[8px] font-bold"
            >
              History stays in browser
            </text>

            {/* No storage label */}
            <rect
              x="175"
              y="100"
              width="120"
              height="22"
              rx="5"
              fill="#a7f3d0"
              stroke="#34d399"
              strokeWidth="1"
            />
            <text
              x="235"
              y="115"
              textAnchor="middle"
              className="fill-emerald-800 text-[8px] font-bold"
            >
              No server-side storage
            </text>

            {/* Blocked paths */}
            <g opacity="0.5">
              {/* Blocked: to "OpenAI" */}
              <rect
                x="315"
                y="38"
                width="70"
                height="28"
                rx="5"
                fill="#fee2e2"
                stroke="#fca5a5"
                strokeWidth="1"
              />
              <text x="350" y="55" textAnchor="middle" className="fill-red-400 text-[8px]">
                OpenAI
              </text>
              <line
                x1="295"
                y1="60"
                x2="315"
                y2="52"
                stroke="#fca5a5"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />
              <circle cx="307" cy="55" r="7" fill="#fecaca" />
              <text
                x="307"
                y="58"
                textAnchor="middle"
                className="fill-red-600 text-[8px] font-bold"
              >
                &#x2717;
              </text>

              {/* Blocked: to "Google" */}
              <rect
                x="315"
                y="74"
                width="70"
                height="28"
                rx="5"
                fill="#fee2e2"
                stroke="#fca5a5"
                strokeWidth="1"
              />
              <text x="350" y="91" textAnchor="middle" className="fill-red-400 text-[8px]">
                Google
              </text>
              <line
                x1="295"
                y1="76"
                x2="315"
                y2="88"
                stroke="#fca5a5"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />
              <circle cx="307" cy="83" r="7" fill="#fecaca" />
              <text
                x="307"
                y="86"
                textAnchor="middle"
                className="fill-red-600 text-[8px] font-bold"
              >
                &#x2717;
              </text>
            </g>

            {/* Summary bullets */}
            <g transform="translate(15, 145)">
              <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
              <text
                x="8"
                y="12"
                textAnchor="middle"
                className="fill-emerald-900 text-[9px] font-bold"
              >
                &#x2713;
              </text>
              <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                AI runs on ChefFlow&apos;s own servers
              </text>
            </g>
            <g transform="translate(15, 165)">
              <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
              <text
                x="8"
                y="12"
                textAnchor="middle"
                className="fill-emerald-900 text-[9px] font-bold"
              >
                &#x2713;
              </text>
              <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                Conversations stored in your browser only
              </text>
            </g>
            <g transform="translate(200, 145)">
              <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
              <text
                x="8"
                y="12"
                textAnchor="middle"
                className="fill-emerald-900 text-[9px] font-bold"
              >
                &#x2713;
              </text>
              <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                Zero data sent to any third-party AI
              </text>
            </g>
            <g transform="translate(200, 165)">
              <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
              <text
                x="8"
                y="12"
                textAnchor="middle"
                className="fill-emerald-900 text-[9px] font-bold"
              >
                &#x2713;
              </text>
              <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                Delete anytime — it&apos;s truly gone
              </text>
            </g>

            {/* Arrow markers */}
            <defs>
              <marker id="arrowG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill="#10b981" />
              </marker>
              <marker id="arrowGL" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                <path d="M8,0 L0,3 L8,6 Z" fill="#10b981" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      {/* ─── What Remy Can & Cannot Do ───────────────────────── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h3 className="font-semibold text-stone-100 mb-4 text-center">
          What Remy Can &amp; Cannot Do
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Remy Can
            </p>
            {[
              'Read your recipes and menus to help you plan',
              'Help draft emails you review first',
              'Suggest prep timelines and workflows',
              'Remember your preferences (if you allow it)',
              'Analyze dietary needs for events',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Remy Cannot
            </p>
            {[
              'Send your conversations to any external AI',
              'Store conversation content on our servers',
              'Make decisions without your approval',
              "Access anything you haven't shared",
              'Operate after you turn it off',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
