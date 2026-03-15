'use client'

import { ReactNode } from 'react'

interface PrintLayoutProps {
  title: string
  children: ReactNode
  showDate?: boolean
}

export function PrintLayout({ title, children, showDate = true }: PrintLayoutProps) {
  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide everything except print content */
          body > *:not(#print-root) {
            display: none !important;
          }
          #print-root {
            position: static !important;
          }
          .print-hide {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 16px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div
        id="print-root"
        style={{
          backgroundColor: 'white',
          color: '#111',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
          lineHeight: '1.5',
          maxWidth: '8.5in',
          margin: '0 auto',
          padding: '24px',
          minHeight: '100vh',
        }}
      >
        {/* Print button bar */}
        <div
          className="print-hide"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            Back
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 24px',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#111827',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Print
          </button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: '0 0 4px 0',
              color: '#111',
            }}
          >
            {title}
          </h1>
          {showDate && (
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0,
              }}
            >
              Printed {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </>
  )
}
