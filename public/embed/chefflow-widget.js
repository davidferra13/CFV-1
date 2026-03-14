/**
 * ChefFlow Embeddable Inquiry Widget
 * Version 1.0.0
 *
 * Drop this script onto any website to embed a ChefFlow booking form.
 *
 * USAGE:
 * <script
 *   src="https://app.cheflowhq.com/embed/chefflow-widget.js"
 *   data-chef-id="YOUR_CHEF_ID"
 *   data-accent="#e88f47"
 *   data-theme="light"
 *   data-mode="inline"
 * ></script>
 *
 * OPTIONS:
 *   data-chef-id  (required) — Your ChefFlow chef ID
 *   data-accent   (optional) — Accent color hex, default #e88f47
 *   data-theme    (optional) — "light" or "dark", default "light"
 *   data-mode     (optional) — "inline" (embeds in page) or "popup" (floating button), default "inline"
 *   data-button-text (optional) — Text for the popup button, default "Book a Private Chef"
 *   data-source   (optional) — UTM source attribution (e.g., "homepage", "blog-post")
 *   data-medium   (optional) — UTM medium (e.g., "embed-widget")
 *   data-campaign  (optional) — UTM campaign name
 *
 * EVENTS (postMessage):
 *   chefflow-inquiry-submitted — Fired when a form is successfully submitted
 *   chefflow-widget-loaded     — Fired when the widget iframe has loaded
 *   chefflow-widget-resize     — Fired with { height } when iframe content changes size
 */

;(function () {
  'use strict'

  // Find the script tag that loaded this file
  var scripts = document.querySelectorAll('script[data-chef-id]')
  var currentScript = scripts[scripts.length - 1]

  if (!currentScript) {
    console.error('[ChefFlow Widget] Missing data-chef-id attribute on script tag.')
    return
  }

  var chefId = currentScript.getAttribute('data-chef-id')
  var accent = currentScript.getAttribute('data-accent') || '#e88f47'
  var theme = currentScript.getAttribute('data-theme') || 'light'
  var mode = currentScript.getAttribute('data-mode') || 'inline'
  var buttonText = currentScript.getAttribute('data-button-text') || 'Book a Private Chef'
  var utmSource = currentScript.getAttribute('data-source') || ''
  var utmMedium = currentScript.getAttribute('data-medium') || 'embed-widget'
  var utmCampaign = currentScript.getAttribute('data-campaign') || ''

  if (!chefId) {
    console.error('[ChefFlow Widget] data-chef-id is required.')
    return
  }

  // Determine the ChefFlow origin from the script src
  var scriptSrc = currentScript.getAttribute('src') || ''
  var origin = 'https://app.cheflowhq.com' // default production
  try {
    var url = new URL(scriptSrc, window.location.href)
    origin = url.origin
  } catch (e) {
    // Fall back to default
  }

  var iframeSrc =
    origin +
    '/embed/inquiry/' +
    encodeURIComponent(chefId) +
    '?accent=' +
    encodeURIComponent(accent) +
    '&theme=' +
    encodeURIComponent(theme) +
    (utmSource ? '&utm_source=' + encodeURIComponent(utmSource) : '') +
    (utmMedium ? '&utm_medium=' + encodeURIComponent(utmMedium) : '') +
    (utmCampaign ? '&utm_campaign=' + encodeURIComponent(utmCampaign) : '')

  // ── Inline mode: embed form directly in the page ──
  if (mode === 'inline') {
    var container = document.createElement('div')
    container.className = 'chefflow-widget-container'
    container.style.cssText = 'width:100%;max-width:600px;margin:0 auto;'

    var iframe = document.createElement('iframe')
    iframe.src = iframeSrc
    iframe.style.cssText =
      'width:100%;border:none;min-height:900px;border-radius:16px;display:block;'
    iframe.setAttribute('title', 'Book a Private Chef')
    iframe.setAttribute('loading', 'lazy')
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope'
    )

    container.appendChild(iframe)
    currentScript.parentNode.insertBefore(container, currentScript.nextSibling)

    // Auto-resize iframe based on content height
    // Only trust messages from the ChefFlow origin
    window.addEventListener('message', function (event) {
      if (event.origin !== origin) return
      if (event.data && event.data.type === 'chefflow-widget-resize') {
        var h = parseInt(event.data.height, 10)
        if (h > 0 && h < 10000) iframe.style.height = h + 'px'
      }
      if (event.data && event.data.type === 'chefflow-inquiry-submitted') {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })

    iframe.addEventListener('load', function () {
      window.postMessage({ type: 'chefflow-widget-loaded' }, window.location.origin)
    })

    return
  }

  // ── Popup mode: floating button + modal overlay ──
  if (mode === 'popup') {
    // Create floating button
    var btn = document.createElement('button')
    btn.textContent = buttonText
    btn.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999;' +
      'padding:14px 24px;border-radius:50px;border:none;' +
      'background-color:' +
      accent +
      ';color:#fff;' +
      'font-size:15px;font-weight:600;cursor:pointer;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.2);' +
      'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'transition:transform 0.15s,box-shadow 0.15s;'

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'scale(1.05)'
      btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'
    })
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'scale(1)'
      btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
    })

    // Create overlay
    var overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:100000;' +
      'background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);' +
      'display:none;align-items:center;justify-content:center;' +
      'padding:16px;'

    // Create modal container
    var modal = document.createElement('div')
    modal.style.cssText =
      'background:' +
      (theme === 'dark' ? '#1c1917' : '#fff') +
      ';' +
      'border-radius:20px;width:100%;max-width:600px;max-height:90vh;' +
      'overflow-y:auto;position:relative;box-shadow:0 24px 48px rgba(0,0,0,0.2);'

    // Close button
    var closeBtn = document.createElement('button')
    closeBtn.innerHTML = '&times;'
    closeBtn.style.cssText =
      'position:absolute;top:12px;right:16px;z-index:10;' +
      'background:none;border:none;font-size:28px;cursor:pointer;' +
      'color:' +
      (theme === 'dark' ? '#a8a29e' : '#78716c') +
      ';' +
      'width:40px;height:40px;display:flex;align-items:center;justify-content:center;' +
      'border-radius:50%;transition:background 0.15s;'
    closeBtn.addEventListener('mouseenter', function () {
      closeBtn.style.background = theme === 'dark' ? '#44403c' : '#f5f5f4'
    })
    closeBtn.addEventListener('mouseleave', function () {
      closeBtn.style.background = 'none'
    })

    // Iframe inside modal
    var popupIframe = document.createElement('iframe')
    popupIframe.src = iframeSrc
    popupIframe.style.cssText =
      'width:100%;border:none;min-height:850px;border-radius:20px;display:block;'
    popupIframe.setAttribute('title', 'Book a Private Chef')

    modal.appendChild(closeBtn)
    modal.appendChild(popupIframe)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    document.body.appendChild(btn)

    function openModal() {
      overlay.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }

    function closeModal() {
      overlay.style.display = 'none'
      document.body.style.overflow = ''
    }

    btn.addEventListener('click', openModal)
    closeBtn.addEventListener('click', closeModal)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal()
    })

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') {
        closeModal()
      }
    })

    // Listen for resize and submission events (only from ChefFlow origin)
    window.addEventListener('message', function (event) {
      if (event.origin !== origin) return
      if (event.data && event.data.type === 'chefflow-widget-resize') {
        var h = parseInt(event.data.height, 10)
        if (h > 0 && h < 10000) popupIframe.style.height = h + 'px'
      }
      if (event.data && event.data.type === 'chefflow-inquiry-submitted') {
        // Optionally close modal after short delay
      }
    })

    return
  }

  console.error('[ChefFlow Widget] Invalid data-mode: "' + mode + '". Use "inline" or "popup".')
})()
