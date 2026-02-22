'use client'

/**
 * DataFlowSchematic — pure React/SVG inline diagram.
 * Shows side-by-side: "How OTHER apps work" vs "How ChefFlow works".
 * No external images, no links — everything renders right on screen.
 */

import { Shield, Cloud, Server, Lock, Eye, EyeOff, X, Check } from 'lucide-react'

export function DataFlowSchematic() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-900">Where Does Your Data Go?</h2>
        <p className="text-sm text-stone-500 mt-1">
          See exactly how ChefFlow handles your data compared to other AI services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ─── LEFT: Other AI Apps (the bad way) ─────────────────────── */}
        <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <Cloud className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Other AI Apps</h3>
              <p className="text-xs text-red-600">Your data gets sent to third parties</p>
            </div>
          </div>

          {/* Schematic */}
          <div className="relative">
            <svg
              viewBox="0 0 280 220"
              className="w-full"
              aria-label="Diagram showing how other AI apps send your data to remote servers"
            >
              {/* You (the user) */}
              <rect
                x="10"
                y="10"
                width="120"
                height="50"
                rx="8"
                fill="#fef2f2"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              <text
                x="70"
                y="30"
                textAnchor="middle"
                className="fill-red-800 text-[11px] font-semibold"
              >
                You
              </text>
              <text x="70" y="45" textAnchor="middle" className="fill-red-500 text-[9px]">
                Client names, budgets...
              </text>

              {/* Arrow going UP to cloud */}
              <line
                x1="70"
                y1="60"
                x2="70"
                y2="90"
                stroke="#ef4444"
                strokeWidth="2"
                markerEnd="url(#arrowRed)"
              />
              <text x="105" y="80" className="fill-red-600 text-[8px] font-medium">
                SENT TO
              </text>

              {/* Cloud Server */}
              <rect
                x="10"
                y="90"
                width="120"
                height="50"
                rx="8"
                fill="#fee2e2"
                stroke="#f87171"
                strokeWidth="1.5"
              />
              <text
                x="70"
                y="110"
                textAnchor="middle"
                className="fill-red-800 text-[11px] font-semibold"
              >
                Their Servers
              </text>
              <text x="70" y="125" textAnchor="middle" className="fill-red-500 text-[9px]">
                OpenAI, Google, etc.
              </text>

              {/* Arrow to third parties */}
              <line
                x1="130"
                y1="115"
                x2="160"
                y2="115"
                stroke="#ef4444"
                strokeWidth="2"
                markerEnd="url(#arrowRed)"
              />

              {/* Third parties box */}
              <rect
                x="160"
                y="90"
                width="110"
                height="50"
                rx="8"
                fill="#fee2e2"
                stroke="#f87171"
                strokeWidth="1.5"
              />
              <text
                x="215"
                y="110"
                textAnchor="middle"
                className="fill-red-800 text-[10px] font-semibold"
              >
                Third Parties
              </text>
              <text x="215" y="125" textAnchor="middle" className="fill-red-500 text-[9px]">
                Training, ads, leaks
              </text>

              {/* Warning items */}
              <g transform="translate(10, 155)">
                <circle cx="8" cy="8" r="8" fill="#fca5a5" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-red-800 text-[10px] font-bold"
                >
                  !
                </text>
                <text x="22" y="12" className="fill-red-700 text-[9px]">
                  Data stored on remote servers
                </text>
              </g>
              <g transform="translate(10, 175)">
                <circle cx="8" cy="8" r="8" fill="#fca5a5" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-red-800 text-[10px] font-bold"
                >
                  !
                </text>
                <text x="22" y="12" className="fill-red-700 text-[9px]">
                  May be used to train their AI
                </text>
              </g>
              <g transform="translate(10, 195)">
                <circle cx="8" cy="8" r="8" fill="#fca5a5" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-red-800 text-[10px] font-bold"
                >
                  !
                </text>
                <text x="22" y="12" className="fill-red-700 text-[9px]">
                  You can&apos;t truly delete it
                </text>
              </g>

              {/* Arrow marker */}
              <defs>
                <marker
                  id="arrowRed"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L8,3 L0,6 Z" fill="#ef4444" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* ─── RIGHT: ChefFlow (the safe way) ────────────────────────── */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">ChefFlow + Remy</h3>
              <p className="text-xs text-emerald-600">Your data never leaves ChefFlow</p>
            </div>
          </div>

          {/* Schematic */}
          <div className="relative">
            <svg
              viewBox="0 0 280 220"
              className="w-full"
              aria-label="Diagram showing how ChefFlow keeps all data private"
            >
              {/* ChefFlow — big encompassing box */}
              <rect
                x="10"
                y="10"
                width="260"
                height="130"
                rx="10"
                fill="#ecfdf5"
                stroke="#6ee7b7"
                strokeWidth="2"
                strokeDasharray="6,3"
              />
              <text
                x="140"
                y="30"
                textAnchor="middle"
                className="fill-emerald-800 text-[11px] font-semibold"
              >
                ChefFlow (everything stays here)
              </text>

              {/* Your Data box */}
              <rect
                x="25"
                y="42"
                width="105"
                height="40"
                rx="6"
                fill="#d1fae5"
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <text
                x="77"
                y="58"
                textAnchor="middle"
                className="fill-emerald-800 text-[10px] font-semibold"
              >
                Your Data
              </text>
              <text x="77" y="72" textAnchor="middle" className="fill-emerald-600 text-[8px]">
                Clients, menus, finances
              </text>

              {/* Arrow between them */}
              <line
                x1="130"
                y1="62"
                x2="150"
                y2="62"
                stroke="#10b981"
                strokeWidth="2"
                markerEnd="url(#arrowGreen)"
              />
              <path
                d="M150,62 L130,62"
                stroke="#10b981"
                strokeWidth="2"
                markerEnd="url(#arrowGreenR)"
              />

              {/* Remy AI box */}
              <rect
                x="150"
                y="42"
                width="105"
                height="40"
                rx="6"
                fill="#d1fae5"
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <text
                x="202"
                y="58"
                textAnchor="middle"
                className="fill-emerald-800 text-[10px] font-semibold"
              >
                Remy (Private AI)
              </text>
              <text x="202" y="72" textAnchor="middle" className="fill-emerald-600 text-[8px]">
                ChefFlow&apos;s own servers
              </text>

              {/* Lock icon area */}
              <rect
                x="100"
                y="92"
                width="80"
                height="35"
                rx="6"
                fill="#a7f3d0"
                stroke="#34d399"
                strokeWidth="1"
              />
              <text
                x="140"
                y="108"
                textAnchor="middle"
                className="fill-emerald-800 text-[9px] font-bold"
              >
                No Third-Party
              </text>
              <text x="140" y="120" textAnchor="middle" className="fill-emerald-700 text-[8px]">
                AI Services Used
              </text>

              {/* Success items */}
              <g transform="translate(10, 155)">
                <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-emerald-900 text-[10px] font-bold"
                >
                  &#x2713;
                </text>
                <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                  AI runs on ChefFlow&apos;s own servers
                </text>
              </g>
              <g transform="translate(10, 175)">
                <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-emerald-900 text-[10px] font-bold"
                >
                  &#x2713;
                </text>
                <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                  Zero data sent to any company
                </text>
              </g>
              <g transform="translate(10, 195)">
                <circle cx="8" cy="8" r="8" fill="#6ee7b7" />
                <text
                  x="8"
                  y="12"
                  textAnchor="middle"
                  className="fill-emerald-900 text-[10px] font-bold"
                >
                  &#x2713;
                </text>
                <text x="22" y="12" className="fill-emerald-800 text-[9px]">
                  Delete anytime — it&apos;s truly gone
                </text>
              </g>

              {/* Arrow markers */}
              <defs>
                <marker
                  id="arrowGreen"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L8,3 L0,6 Z" fill="#10b981" />
                </marker>
                <marker
                  id="arrowGreenR"
                  markerWidth="8"
                  markerHeight="6"
                  refX="0"
                  refY="3"
                  orient="auto"
                >
                  <path d="M8,0 L0,3 L8,6 Z" fill="#10b981" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* ─── Bottom: What Remy CAN and CANNOT see ─────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="font-semibold text-stone-900 mb-4 text-center">
          What Remy Can &amp; Cannot Do
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Remy Can
            </p>
            {[
              'Read your recipes and menus (locally)',
              'Help draft emails you review first',
              'Suggest prep timelines',
              'Remember your preferences (if you allow it)',
              'Analyze dietary needs for events',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Remy Cannot
            </p>
            {[
              'Send your data to any external server',
              'Share data with other companies',
              'Make decisions without your approval',
              "Access anything you haven't shared",
              'Operate after you turn it off',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
