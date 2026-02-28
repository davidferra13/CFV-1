# Printer Market Research for Food Service Operations

> Comprehensive research on all printer types used in restaurants, commercial kitchens,
> catering operations, and food service. Conducted February 2026.

---

## Table of Contents

1. [Thermal Receipt/Ticket Printers (POS)](#1-thermal-receiptticket-printers-pos)
2. [Kitchen Display/Ticket Printers (KDS)](#2-kitchen-displayticket-printers-kds)
3. [Impact/Dot Matrix Printers](#3-impactdot-matrix-printers)
4. [Label Printers](#4-label-printers)
5. [Standard Inkjet/Laser Printers](#5-standard-inkjetlaser-printers)
6. [Mobile/Portable Printers](#6-mobileportable-printers)
7. [Wide-Format Printers](#7-wide-format-printers)
8. [Paper Sizes & Character Columns Reference](#8-paper-sizes--character-columns-reference)
9. [Print Protocols & Command Languages](#9-print-protocols--command-languages)
10. [Browser & Web Printing Technologies](#10-browser--web-printing-technologies)
11. [JavaScript Libraries & SDKs](#11-javascript-libraries--sdks)
12. [Cloud & Bridge Printing Solutions](#12-cloud--bridge-printing-solutions)
13. [How Major POS Platforms Handle Printing](#13-how-major-pos-platforms-handle-printing)
14. [CSS @media print for Thermal Printers](#14-css-media-print-for-thermal-printers)
15. [Recommendations for ChefFlow](#15-recommendations-for-chefflow)

---

## 1. Thermal Receipt/Ticket Printers (POS)

The dominant printer type in food service. Uses heat to print on thermal paper -- no ink, no toner, no ribbons. Fast, quiet, and low-maintenance.

### Top Brands & Models

#### Epson (Market Leader)

| Model         | Resolution | Speed    | Paper Width | Columns (Font A/B)               | Connectivity                              | Price Range |
| ------------- | ---------- | -------- | ----------- | -------------------------------- | ----------------------------------------- | ----------- |
| **TM-T88VII** | 180 dpi    | 500 mm/s | 58mm / 80mm | 42/48/56 (80mm), 30/36/40 (58mm) | USB, Ethernet, WiFi (opt), NFC            | $350-450    |
| **TM-T88VI**  | 180 dpi    | 350 mm/s | 58mm / 80mm | 42/48/56 (80mm)                  | USB, Ethernet, WiFi, Bluetooth (opt), NFC | $300-400    |
| **TM-T20III** | 203 dpi    | 250 mm/s | 58mm / 80mm | 48 (80mm)                        | USB, Ethernet, Serial                     | $150-250    |
| **TM-m30III** | 203 dpi    | 300 mm/s | 58mm / 80mm | 48 (80mm)                        | USB-A/B/C, Ethernet, WiFi, Bluetooth      | $350-450    |
| **TM-m50II**  | 203 dpi    | 500 mm/s | 80mm        | 48 (80mm)                        | USB, Ethernet, WiFi, Bluetooth            | $400-500    |

- **ePOS SDK for JavaScript** -- Epson's official web printing SDK. Connects directly from browser to printer via HTTP/HTTPS. No driver installation needed on client devices. Supports Chrome, Edge, Firefox.
- **Protocol:** ESC/POS (Epson's own standard, now industry-wide)
- **Key feature:** TM-m30III can charge tablets at 18W via USB-C while providing wired network at 20 Mbps through the same cable.
- **Auto-cutter:** All models have auto-cutter (1.5M+ cut lifespan on TM-T88 series)

#### Star Micronics

| Model           | Resolution | Speed    | Paper Width      | Columns     | Connectivity                              | Price Range |
| --------------- | ---------- | -------- | ---------------- | ----------- | ----------------------------------------- | ----------- |
| **TSP143IV**    | 203 dpi    | 250 mm/s | 80mm (3.15")     | 48 (Font A) | USB-C, Ethernet, WiFi, AOA, CloudPRNT     | $300-400    |
| **TSP143IV SK** | 203 dpi    | 250 mm/s | 80mm (linerless) | 48          | USB-C, Ethernet, WiFi                     | $350-450    |
| **mC-Print3**   | 203 dpi    | 400 mm/s | 80mm             | 48          | USB, Ethernet, WiFi, Bluetooth, CloudPRNT | $350-500    |

- **Protocols:** StarPRNT (native), ESC/POS emulation mode (switchable via DIP switch or config utility)
- **CloudPRNT** -- Star's cloud printing protocol. Printer polls a server endpoint for print jobs via HTTP/REST. Supports remote printing without VPN.
- **CloudPRNT Next** -- Uses MQTT protocol for faster, push-based communication.
- **WebPRNT** -- HTTP-based printing SDK. Send XML or use JS library to print from web apps to Star printers on the local network.
- **StarIO.Online** -- REST API service for managing CloudPRNT/CloudPRNT Next printers remotely.
- **IP22 splash-proof** rating on mC-Print3 -- designed for kitchen environments.
- **ESC/POS expansion (Jan 2026):** Star expanded ESC/POS emulation to TSP100IV series including SK (linerless) models, and added LAN-based ESC/POS emulation for SP742 impact printers.

#### Bixolon

| Model              | Resolution | Speed    | Paper Width | Connectivity          | Price Range |
| ------------------ | ---------- | -------- | ----------- | --------------------- | ----------- |
| **SRP-350plusIII** | 180 dpi    | 300 mm/s | 80mm        | USB, Ethernet, Serial | $200-300    |
| **SRP-Q302**       | 203 dpi    | 220 mm/s | 80mm (3")   | USB, Ethernet, WiFi   | $300-400    |

- **Protocol:** ESC/POS compatible
- Cube-style form factor on SRP-Q302 (similar to Star mC-Print3)

### Thermal Receipt Paper Specifications

| Paper Width        | Common Names  | Print Width | Dots/Line | Font A Columns | Font B Columns |
| ------------------ | ------------- | ----------- | --------- | -------------- | -------------- |
| **80mm** (3 1/8")  | Standard POS  | 72mm        | 576 dots  | **48** chars   | **64** chars   |
| **58mm** (2 1/4")  | Narrow/Mobile | 48mm        | 384 dots  | **32** chars   | **42** chars   |
| **112mm** (4 3/8") | Wide receipt  | 104mm       | 832 dots  | 69 chars       | 92 chars       |

**Font dimensions:**

- Font A: 12x24 dots (1.5x3.0mm) -- default, readable, headers
- Font B: 9x17 dots (1.1x2.1mm) -- smaller, for dense item lists

---

## 2. Kitchen Display/Ticket Printers (KDS)

KDS systems are replacing paper ticket printers in many kitchens. They display orders on screens with bump bars or touchscreens. However, many operations use KDS + a backup printer, or printers exclusively.

### KDS Hardware Providers

| Provider                       | Screen Size      | Interface              | Key Features                                                                                 |
| ------------------------------ | ---------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| **Epson TrueOrder KDS**        | Various          | Bump bar + touchscreen | Compatible with multiple POS systems, supports traditional bump bars and modern touchscreens |
| **Oracle Express Station 400** | Various          | Touchscreen + bump bar | Purpose-built for heat, humidity, grease; long-life embedded components                      |
| **PAR KDS**                    | Industrial-grade | Programmable bump bar  | Multiple mounting options, industrial-grade screens                                          |
| **SkyTab KDS**                 | 22" touchscreen  | Touch + bump bar       | Customizable interface, large display                                                        |
| **Square KDS**                 | iPad/tablet      | Touch                  | Part of Square for Restaurants ecosystem                                                     |
| **Toast KDS**                  | Proprietary      | Touch + bump bar       | Deeply integrated with Toast POS                                                             |

### Bump Bar Specifications

- Stainless steel dome disk switches -- rated for 3M+ cycles
- Designed for grease, moisture, and heavy-duty kitchen use
- Programmable buttons for order routing, priority, and bumping

### When KDS Still Needs Printers

- **Expo printing** -- final ticket for the pass/window
- **Backup/redundancy** -- if KDS goes down, orders must still flow
- **Guest receipts** -- always printed, not displayed
- **Prep labels** -- date labels, allergen labels (separate label printers)

---

## 3. Impact/Dot Matrix Printers

Used in kitchens where thermal paper would discolor from heat lamps, steam, and grease. Impact printers use ink ribbons and bond paper -- prints remain legible even when exposed to heat and moisture.

### Top Models

#### Epson TM-U220 (Industry Standard Kitchen Printer)

| Spec             | Value                                           |
| ---------------- | ----------------------------------------------- |
| **Technology**   | 9-pin serial impact dot matrix                  |
| **Resolution**   | 180 dpi                                         |
| **Speed**        | 4.7 lps (40 col) / 6.0 lps (30 col)             |
| **Columns**      | 40 (at 16 cpi) / 30 (at 16 cpi)                 |
| **Paper Width**  | 76mm (3") bond paper                            |
| **Colors**       | Two-color (black/red) with ERC-38 ribbon        |
| **Ribbon Life**  | 3M chars (black) / 1.5M black + 750K red (dual) |
| **Connectivity** | USB, Serial, Ethernet, mPOS-friendly            |
| **Auto-cutter**  | Yes (TM-U220B model)                            |
| **Price**        | $250-350                                        |

#### Star Micronics SP700/SP742

| Spec             | Value                                           |
| ---------------- | ----------------------------------------------- |
| **Technology**   | 9-pin impact dot matrix                         |
| **Speed**        | 4.7-8.9 lps                                     |
| **Columns**      | 42                                              |
| **Paper Width**  | 76mm (3") bond paper                            |
| **Colors**       | Two-color                                       |
| **Connectivity** | Ethernet, USB, WiFi/WLAN, Bluetooth, CloudPRNT  |
| **Key Feature**  | Clamshell design for quick paper/ribbon loading |
| **ESC/POS**      | LAN-based ESC/POS emulation added Jan 2026      |
| **Price**        | $300-450                                        |

#### Partner Tech DM-300

| Spec            | Value                                              |
| --------------- | -------------------------------------------------- |
| **Technology**  | 9-pin serial impact dot matrix                     |
| **Key Feature** | Prints remain legible despite heat, grease, stains |
| **Use Case**    | Kitchen order printing                             |

### Why Impact Printers Persist in Kitchens

1. **Heat resistance** -- thermal paper turns black under heat lamps. Bond paper does not.
2. **Grease resistance** -- thermal paper smudges when touched with greasy hands. Bond paper holds up.
3. **Moisture resistance** -- steam and humidity don't affect impact-printed bond paper.
4. **Two-color printing** -- red for exceptions/modifications, black for standard items.
5. **Audible print sound** -- kitchen staff can HEAR when an order comes in (important in noisy kitchens).
6. **Carbon copies** -- some models support multi-part forms for duplicate tickets.

### Drawbacks

- Louder than thermal
- Slower than thermal
- Ribbon replacement required
- Lower resolution
- No graphics/images (text and basic characters only)

---

## 4. Label Printers

Used for food safety labels (date/time, prep date, discard date), allergen warnings, ingredient lists, menu labels, and food packaging.

### Food Service Label Printers

#### Brother

| Model          | Resolution  | Max Width   | Speed          | Connectivity                   | Price    | Key Feature                                |
| -------------- | ----------- | ----------- | -------------- | ------------------------------ | -------- | ------------------------------------------ |
| **QL-820NWB**  | 300x600 dpi | 62mm (2.4") | 110 labels/min | WiFi, Ethernet, Bluetooth, USB | $250-350 | Red+black printing for allergen highlights |
| **QL-1110NWB** | 300 dpi     | 102mm (4")  | 69 labels/min  | WiFi, Ethernet, Bluetooth, USB | $300-400 | Wide labels for shipping/packaging         |
| **QL-810W**    | 300x600 dpi | 62mm        | 110 labels/min | WiFi, USB                      | $150-250 | Budget wireless option                     |

- **Food-specific feature:** Built-in date/time for "best before" freshness labels
- **Direct thermal** -- no ink, toner, or ribbons
- **Die-cut and continuous labels** supported
- **P-touch Editor** software for label design

#### DYMO

| Model                     | Resolution | Max Width    | Speed         | Connectivity  | Price    | Key Feature                |
| ------------------------- | ---------- | ------------ | ------------- | ------------- | -------- | -------------------------- |
| **LabelWriter 550**       | 300 dpi    | 62mm (2.3")  | 62 labels/min | USB           | $100-150 | Affordable, compact        |
| **LabelWriter 550 Turbo** | 300 dpi    | 62mm         | 71 labels/min | USB, Ethernet | $150-200 | Faster + network           |
| **LabelWriter 4XL**       | 300 dpi    | 108mm (4.1") | 53 labels/min | USB           | $200-300 | 4x6" shipping/large labels |
| **LabelWriter 5XL**       | 300 dpi    | 108mm (4.1") | 53 labels/min | USB, Ethernet | $250-350 | Latest wide-format         |

- **Direct thermal** -- no ink
- Best for small/medium food operations
- Proprietary label rolls (higher per-label cost)
- Compatible with third-party labels from Houselabels, Betckey, etc.

#### Zebra

| Model      | Resolution     | Max Width     | Speed    | Connectivity                                               | Languages | Price    |
| ---------- | -------------- | ------------- | -------- | ---------------------------------------------------------- | --------- | -------- |
| **ZD421**  | 203 or 300 dpi | 108mm (4.27") | 152 mm/s | USB, USB Host, Ethernet (opt), WiFi+BT (opt), Serial (opt) | ZPL, EPL  | $350-500 |
| **ZD620**  | 203 or 300 dpi | 108mm         | 203 mm/s | USB, Ethernet, Serial, USB Host, BLE                       | ZPL, EPL  | $500-700 |
| **GK420d** | 203 dpi        | 108mm (4.09") | 127 mm/s | USB, Serial, Ethernet                                      | ZPL, EPL  | $300-450 |

- **ZPL (Zebra Programming Language)** -- industry standard for label commands
- **Industrial-grade** -- built for high-volume, harsh environments
- **Browser Print** -- Zebra's official JS-based printing from browser (requires client-side app install)
- **SendFileToPrinter API** -- cloud-based REST API for label printing
- Zebra printers have an **HTTP POST endpoint** for direct ZPL submission without drivers

#### Rollo

| Model              | Resolution | Max Width    | Speed    | Connectivity | Price    |
| ------------------ | ---------- | ------------ | -------- | ------------ | -------- |
| **Rollo USB**      | 203 dpi    | 108mm (4.1") | 150 mm/s | USB          | $150-250 |
| **Rollo Wireless** | 203 dpi    | 108mm (4.1") | 150 mm/s | WiFi         | $200-300 |

- Supports label widths from 40mm (1.57") to 104mm (4.1")
- Popular for small food businesses doing food packaging labels
- Direct thermal, no ink

#### DateCodeGenie (Food-Service Specific)

| Model       | Printer Width  | Key Feature                         | Price     |
| ----------- | -------------- | ----------------------------------- | --------- |
| **DCG X2**  | 2" (single)    | Stainless steel housing             | $500-800  |
| **DCG X22** | 2" + 2" (dual) | Two printers, different label types | $800-1200 |
| **DCG X23** | 2" + 3" (dual) | 2" and 3" labels simultaneously     | $900-1300 |

- **Purpose-built for food prep labeling**
- Automated prep date, MRD (Made/Ready/Discard), ingredient, allergen, and dietary labels
- Drag-and-drop label builder
- Stainless steel housing for kitchen environments
- Saves ~117 hours/year compared to handwritten labels (50 labels/day)
- **Thermal printing** inside rugged kitchen housing

### Label Sizes for Food Service

| Use Case          | Common Label Size   | Typical Printer              |
| ----------------- | ------------------- | ---------------------------- |
| Prep/date labels  | 1" x 2" (25x51mm)   | Brother QL, DYMO 550         |
| Allergen warnings | 1" x 3" (25x76mm)   | Brother QL, DYMO 550         |
| Container labels  | 2" x 3" (51x76mm)   | Brother QL-820NWB            |
| Ingredient lists  | 2" x 4" (51x102mm)  | Brother QL-1110NWB           |
| Food packaging    | 4" x 6" (102x152mm) | Zebra ZD421, DYMO 5XL, Rollo |
| Catering labels   | 2" x 2" (51x51mm)   | Brother QL, DateCodeGenie    |

---

## 5. Standard Inkjet/Laser Printers

For menus, invoices, contracts, shopping lists, recipes, and general office printing. Many private chefs work from home and use a standard home office printer.

### Top Models for Chef Home Office Use

#### Laser (Recommended for Document-Heavy Use)

| Model                         | Type            | Resolution    | Speed  | Connectivity             | Price    |
| ----------------------------- | --------------- | ------------- | ------ | ------------------------ | -------- |
| **Brother HL-L2390DW**        | Mono Laser      | 2400x600 dpi  | 36 ppm | WiFi, USB, Ethernet      | $150-200 |
| **HP LaserJet Pro M404dn**    | Mono Laser      | 1200x1200 dpi | 40 ppm | USB, Ethernet            | $200-300 |
| **Brother HL-L8245CDW**       | Color Laser     | 2400x600 dpi  | 31 ppm | WiFi, USB, Ethernet, NFC | $350-450 |
| **Canon imageCLASS MF753Cdw** | Color Laser MFP | 1200x1200 dpi | 35 ppm | WiFi, USB, Ethernet      | $400-500 |

#### Inkjet (Better for Color Menus/Photos)

| Model                     | Type                | Resolution    | Speed  | Connectivity             | Price    |
| ------------------------- | ------------------- | ------------- | ------ | ------------------------ | -------- |
| **Canon PIXMA G620**      | Color Inkjet (tank) | 4800x1200 dpi | 12 ppm | WiFi, USB                | $200-280 |
| **Epson EcoTank ET-4850** | Color Inkjet (tank) | 4800x1200 dpi | 15 ppm | WiFi, USB, Ethernet      | $350-450 |
| **Brother MFC-J5945DW**   | Color Inkjet MFP    | 4800x1200 dpi | 22 ppm | WiFi, USB, Ethernet, NFC | $300-400 |

### Standard Paper Sizes

| Size               | Dimensions             | Use Case                            |
| ------------------ | ---------------------- | ----------------------------------- |
| **Letter**         | 8.5" x 11" (216x279mm) | Menus, invoices, contracts, recipes |
| **Legal**          | 8.5" x 14" (216x356mm) | Contracts, longer documents         |
| **Tabloid/Ledger** | 11" x 17" (279x432mm)  | Large menus, planning sheets        |
| **A4**             | 210 x 297mm            | International standard              |
| **A5**             | 148 x 210mm            | Half-page menus, cards              |

### Printing Protocols for Standard Printers

| Protocol                             | Description                                                                                           | Browser Support         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| **IPP (Internet Printing Protocol)** | Modern standard. Basis of AirPrint, Mopria, IPP Everywhere. Supported by 98%+ of printers sold today. | Yes -- `window.print()` |
| **AirPrint**                         | Apple's implementation of IPP. Uses Bonjour (mDNS) for discovery + IPP over HTTPS.                    | iOS/macOS native        |
| **Mopria**                           | Android printing standard. Uses IPP Everywhere. 23,000+ supported printers.                           | Android native          |
| **IPP Everywhere**                   | Driverless printing standard. No vendor-specific drivers needed.                                      | All modern OS           |
| **Google Cloud Print**               | **DISCONTINUED Dec 2020.** Replaced by IPP Everywhere, Mopria, and vendor cloud solutions.            | N/A                     |

### Key Insight for Web Apps

Standard printers are fully supported by `window.print()` and `@media print` CSS. The browser handles all protocol negotiation (IPP/AirPrint/Mopria). The chef selects their printer from the OS print dialog.

---

## 6. Mobile/Portable Printers

For catering events, food trucks, pop-up dinners, and tableside service. Battery-powered, compact, and wireless.

### Top Models

| Model                       | Resolution | Speed    | Paper Width | Battery Life | Connectivity                     | Price    |
| --------------------------- | ---------- | -------- | ----------- | ------------ | -------------------------------- | -------- |
| **Star Micronics SM-S230i** | 203 dpi    | 80 mm/s  | 58mm / 80mm | 10+ hours    | Bluetooth, WiFi                  | $300-400 |
| **Epson TM-P80**            | 203 dpi    | 100 mm/s | 80mm        | 8+ hours     | Bluetooth, WiFi, NFC, ePOS-Print | $350-450 |
| **Bixolon SPP-R200III**     | 203 dpi    | 100 mm/s | 58mm        | 8+ hours     | Bluetooth, WiFi, USB             | $250-350 |
| **Bixolon SPP-R210**        | 203 dpi    | 100 mm/s | 58mm        | 8+ hours     | Bluetooth                        | $200-300 |

### Key Features for Food Service Mobile

- **Battery-powered** -- no outlet needed at catering sites
- **Bluetooth** -- pairs with phone/tablet POS
- **Water/dust resistant** -- IP ratings for outdoor use (Bixolon SPP-R210)
- **Thermal printing** -- no ink to worry about in the field
- **Compact** -- fits in an apron or clip to belt
- **ESC/POS compatible** -- same command set as desktop thermal printers
- **NFC pairing** (Epson TM-P80) -- tap phone to pair

---

## 7. Wide-Format Printers

For restaurant menu boards, signage, promotional posters, event banners, and catering displays. These are NOT typically owned by individual chefs -- they send to print shops. But some high-volume operations own them.

### In-House Models (For Restaurants That Print Frequently)

| Model                            | Max Width | Resolution    | Technology                 | Price Range   |
| -------------------------------- | --------- | ------------- | -------------------------- | ------------- |
| **Canon imagePROGRAF PRO-4600**  | 44"       | 2400x1200 dpi | 12-color LUCIA PRO pigment | $3,000-5,000  |
| **Canon imagePROGRAF PRO-6000S** | 60"       | 2400x1200 dpi | 8-color LUCIA PRO          | $5,000-8,000  |
| **Epson SureColor P9570**        | 44"       | 2400x1200 dpi | UltraChrome PRO12 pigment  | $4,000-6,000  |
| **Epson SureColor P20000**       | 64"       | 2400x1200 dpi | UltraChrome Pro 9-color    | $8,000-12,000 |
| **HP Latex 630**                 | 64"       | 1200x1200 dpi | Latex (eco-solvent)        | $7,000-10,000 |

### Print Shop Services (More Practical for Most Chefs)

| Service          | Common Products                    | Price Range        |
| ---------------- | ---------------------------------- | ------------------ |
| **FedEx Office** | Menu boards, posters, banners      | $15-100+ per piece |
| **VistaPrint**   | Custom menu boards, table signs    | $10-80+ per piece  |
| **MegaPrint**    | Full-color poster-size menu boards | $20-150+ per piece |

### Materials

| Material             | Use Case            | Durability                   |
| -------------------- | ------------------- | ---------------------------- |
| Foam board (mounted) | Indoor menu boards  | Indoor only, 6-12 months     |
| PVC plastic          | Outdoor menu boards | Weather-resistant, 1-3 years |
| Vinyl banner         | Event banners       | Outdoor-rated                |
| Poster paper         | Temporary signage   | Indoor, disposable           |
| Canvas               | High-end display    | Indoor, long-lasting         |

---

## 8. Paper Sizes & Character Columns Reference

### Thermal Receipt Paper (Complete Reference)

| Paper Width | Metric | Print Width | Dots/Line (203 dpi) | Dots/Line (180 dpi) | Font A Cols | Font B Cols |
| ----------- | ------ | ----------- | ------------------- | ------------------- | ----------- | ----------- |
| 58mm        | 2 1/4" | 48mm        | 384                 | 360                 | **32**      | **42**      |
| 80mm        | 3 1/8" | 72mm        | 576                 | 540                 | **48**      | **64**      |
| 112mm       | 4 3/8" | 104mm       | 832                 | 780                 | 69          | 92          |

### Impact Printer Paper

| Paper Width | Print Width | Columns (Standard) |
| ----------- | ----------- | ------------------ |
| 76mm (3")   | 69.5mm      | **40-42** columns  |

### Label Sizes (Common in Food Service)

| Width        | Common Uses                           |
| ------------ | ------------------------------------- |
| 1" (25mm)    | Small date dots                       |
| 2" (51mm)    | Prep labels, date labels              |
| 2.25" (57mm) | Standard food labels, allergen labels |
| 3" (76mm)    | Wide prep labels                      |
| 4" (102mm)   | Packaging labels, nutrition facts     |

---

## 9. Print Protocols & Command Languages

### ESC/POS (Epson Standard Code for POS)

- **Creator:** Epson
- **Status:** De facto industry standard. Supported by virtually all POS thermal printers.
- **How it works:** Byte sequences sent as raw data to the printer. Commands control text formatting, alignment, barcode generation, image printing, paper cutting, and cash drawer kick.
- **Key commands:**
  - `ESC @` -- Initialize printer
  - `ESC a n` -- Alignment (0=left, 1=center, 2=right)
  - `ESC !` -- Select print mode (bold, double-height, double-width)
  - `GS V` -- Cut paper
  - `GS ( k` -- Print QR code
  - `ESC p` -- Kick cash drawer
- **Supported by:** Epson, Star (emulation mode), Bixolon, Citizen, Custom, Rongta, Xprinter, and most Chinese-manufactured thermal printers.

### StarPRNT / Star Line Mode

- **Creator:** Star Micronics
- **Status:** Star's proprietary protocol. Slightly different command set from ESC/POS.
- **Differences from ESC/POS:**
  - Different character sizes (smaller in StarPRNT mode, matching in ESC/POS emulation)
  - Different command bytes for some operations
  - Star printers can switch between StarPRNT and ESC/POS modes via DIP switch, button combo, or configuration utility
- **Recommendation:** Use ESC/POS emulation mode for maximum compatibility across brands.

### ZPL (Zebra Programming Language)

- **Creator:** Zebra Technologies
- **Use case:** Label printers (Zebra, SATO, Datamax, Intermec, Godex)
- **How it works:** Text-based commands wrapped in `^XA` (start) and `^XZ` (end) delimiters
- **Key commands:**
  - `^XA` -- Start format
  - `^FO` -- Field origin (position)
  - `^FD` -- Field data (text content)
  - `^BC` -- Barcode
  - `^XZ` -- End format
- **Browser printing:** Zebra printers with Ethernet have HTTP POST endpoint for direct ZPL submission. Also supported via Zebra Browser Print (client app + JS library).

### EPL (Eltron Programming Language)

- **Creator:** Eltron (acquired by Zebra)
- **Status:** Legacy, still supported on many Zebra printers alongside ZPL
- **Simpler than ZPL** but less capable

### IPP (Internet Printing Protocol)

- **Status:** Modern standard for standard printers. Basis of AirPrint, Mopria, IPP Everywhere.
- **Supported by:** 98%+ of printers sold today
- **Microsoft requirement (2026+):** Windows prefers IPP for all printing
- **How it works:** HTTP-based protocol (port 631). Client sends print job via HTTP POST to printer's IPP endpoint.
- **For web apps:** Handled transparently by `window.print()` -- the browser/OS negotiates IPP with the printer.

---

## 10. Browser & Web Printing Technologies

### WebUSB API

| Aspect              | Detail                                                               |
| ------------------- | -------------------------------------------------------------------- |
| **What it does**    | Direct USB device access from browser JavaScript                     |
| **Browser support** | Chrome, Edge, Opera (Chromium-based) -- **~76% of browsers**         |
| **NOT supported**   | Safari, Firefox                                                      |
| **Requirements**    | HTTPS, user gesture (click), vendor/product ID                       |
| **Use case**        | Direct ESC/POS command sending to USB-connected thermal printers     |
| **Pros**            | No driver install, no middleware, works from web app                 |
| **Cons**            | No Safari/Firefox, user must grant permission each session, USB only |

### Web Serial API

| Aspect              | Detail                                                  |
| ------------------- | ------------------------------------------------------- |
| **What it does**    | Read/write to serial devices from browser JavaScript    |
| **Browser support** | Chrome, Edge (experimental)                             |
| **NOT supported**   | Safari, Firefox                                         |
| **Requirements**    | HTTPS, user permission prompt                           |
| **Use case**        | Printers with serial/COM port or USB-to-Serial adapters |
| **Pros**            | Works with serial printers, no middleware               |
| **Cons**            | Limited browser support, experimental                   |

### WebHID API

| Aspect              | Detail                                                   |
| ------------------- | -------------------------------------------------------- |
| **What it does**    | Access HID (Human Interface Device) devices from browser |
| **Browser support** | Chrome, Edge                                             |
| **Use case**        | Some Star Micronics printers expose HID interface        |
| **Status**          | Fallback option, less commonly used for printers         |

### window.print() + CSS @media print

| Aspect              | Detail                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **What it does**    | Opens OS print dialog, prints rendered HTML                                                                          |
| **Browser support** | ALL browsers, ALL platforms                                                                                          |
| **Use case**        | Standard printers (inkjet/laser), some thermal printers via OS driver                                                |
| **Pros**            | Universal, no special APIs, works everywhere                                                                         |
| **Cons**            | Shows print dialog (not silent), limited control over thermal printer specifics, renders as raster (not raw ESC/POS) |

### Browser Compatibility Summary

| Technology     | Chrome | Edge | Firefox | Safari | iOS Safari |
| -------------- | ------ | ---- | ------- | ------ | ---------- |
| WebUSB         | Yes    | Yes  | No      | No     | No         |
| Web Serial     | Yes    | Yes  | No      | No     | No         |
| WebHID         | Yes    | Yes  | No      | No     | No         |
| window.print() | Yes    | Yes  | Yes     | Yes    | Yes        |
| Epson ePOS SDK | Yes    | Yes  | Yes     | No     | No         |
| Star WebPRNT   | Yes    | Yes  | Yes     | Yes    | Yes        |

---

## 11. JavaScript Libraries & SDKs

### First-Party (Vendor) SDKs

#### Epson ePOS SDK for JavaScript

- **What:** Official Epson library for browser-to-printer communication
- **Protocol:** HTTP/HTTPS to printer's embedded web server
- **Supported printers:** TM-T88VI/VII, TM-m30III, TM-m50II, and other ePOS-enabled models
- **No driver needed** on client device
- **Methods:** `addText()`, `addFeedLine()`, `addCut()`, `addBarcode()`, `addImage()`
- **Connection:** `new window.epson.ePOSDevice()` -> connect to printer IP/port
- **Browser support:** Chrome, Edge, Firefox
- **Docs:** [Epson ePOS SDK Reference](https://download4.epson.biz/sec_pubs/pos/reference_en/technology/epson_epos_sdk.html)

#### Star Micronics WebPRNT

- **What:** HTTP-based printing from web applications
- **Protocol:** XML or JSON over HTTP to printer's embedded web server
- **Includes:** JavaScript library for easy integration
- **Connection:** HTTP requests to printer's IP address
- **Browser support:** All browsers (uses standard HTTP)
- **Docs:** [Star WebPRNT SDK](https://starmicronics.com/webprnt-web-based-pos-sdk-http-printing/)

#### Star Micronics CloudPRNT / CloudPRNT Next

- **What:** Cloud/remote printing -- printer polls server for jobs (CloudPRNT) or uses MQTT push (CloudPRNT Next)
- **Protocol:** REST API (HTTP) for CloudPRNT; MQTT for CloudPRNT Next
- **Use case:** Remote printing without VPN, multi-location operations
- **API:** [StarIO.Online REST API](https://docs.starprinter.online/webapi/index.html)

#### Zebra Browser Print

- **What:** Client-side application + JavaScript library for browser-to-Zebra-printer communication
- **Requires:** Browser Print client software installed on PC
- **Protocol:** ZPL commands via local bridge
- **Alternative:** Direct HTTP POST to printer's IP for ZPL-enabled printers

### Third-Party Libraries

#### @point-of-sale/receipt-printer-encoder (ReceiptPrinterEncoder)

- **npm:** `@point-of-sale/receipt-printer-encoder`
- **What:** Encode text, images, barcodes to ESC/POS, StarLine, or StarPRNT command buffers
- **Use with:** WebUSB, Web Serial, WebBluetooth, or network sockets
- **Formerly:** EscPosEncoder, StarPrntEncoder, ThermalPrinterEncoder (consolidated)
- **Author:** Niels Leenheer (MIT license)
- **GitHub:** [NielsLeenheer/ReceiptPrinterEncoder](https://github.com/NielsLeenheer/ReceiptPrinterEncoder)
- **Ecosystem packages:**
  - `@point-of-sale/webserial-receipt-printer` -- Web Serial transport
  - `@point-of-sale/network-receipt-printer` -- Network transport
  - `@point-of-sale/system-receipt-printer` -- OS driver transport

#### WebUSBReceiptPrinter

- **npm/GitHub:** [NielsLeenheer/WebUSBReceiptPrinter](https://github.com/NielsLeenheer/WebUSBReceiptPrinter)
- **What:** Print to USB receipt printers using WebUSB API
- **Same author** as ReceiptPrinterEncoder

#### react-thermal-printer

- **npm:** `react-thermal-printer`
- **What:** React components for thermal printing (`<Printer>`, `<Text>`, `<Line>`, `<Cut>`, `<Row>`, `<Br>`)
- **Supported printers:** Epson, Star
- **Output:** ESC/POS buffer from React component tree
- **GitHub:** [seokju-na/react-thermal-printer](https://github.com/seokju-na/react-thermal-printer)

#### @thermal-print/react

- **npm:** `@thermal-print/react`
- **What:** React components for thermal printing + HTML/PDF conversion
- **Can output:** ESC/POS buffer OR browser-printable HTML/PDF
- **Options:** `paperWidth`, `cut` settings

#### node-thermal-printer

- **npm:** `node-thermal-printer`
- **What:** Node.js library for controlling Epson and Star thermal printers
- **Transports:** USB, Network, Serial
- **Use case:** Server-side printing from Next.js server actions

#### escpos-xml

- **npm/GitHub:** [ingoncalves/escpos-xml](https://github.com/ingoncalves/escpos-xml)
- **What:** XML template engine for ESC/POS commands
- **Use case:** Template-based receipt generation

#### zpl-js

- **npm/GitHub:** [tomoeste/zpl-js](https://github.com/tomoeste/zpl-js)
- **What:** TypeScript/JavaScript library for generating ZPL label commands
- **Use case:** Programmatic label generation for Zebra printers

---

## 12. Cloud & Bridge Printing Solutions

These solutions bridge the gap between web apps and local printers, especially when WebUSB/Web Serial are not available (Safari, Firefox) or when silent printing (no print dialog) is required.

### QZ Tray

| Aspect              | Detail                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **What**            | Open-source cross-browser, cross-platform bridge between web app and local printers               |
| **How**             | Java app runs locally. Web app communicates via WebSocket. QZ Tray sends raw commands to printer. |
| **Supports**        | Raw ESC/POS, ZPL, EPL, CPCL, and standard OS printing                                             |
| **Silent printing** | Yes -- no print dialog                                                                            |
| **Platforms**       | Windows, macOS, Linux                                                                             |
| **License**         | Open source (LGPL), commercial license available                                                  |
| **Price**           | Free (self-signed), $5/device/year (signed certificate)                                           |
| **Website**         | [qz.io](https://qz.io/)                                                                           |
| **Key advantage**   | Works in ALL browsers including Safari and Firefox                                                |
| **Used by**         | Odoo POS, many web-based POS systems                                                              |

### PrintNode

| Aspect               | Detail                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **What**             | Cloud printing service with REST API                                                                                     |
| **How**              | Client app on printer machine connects to PrintNode cloud. Web app sends jobs via REST API. PrintNode routes to printer. |
| **Supports**         | All OS-installed printers, receipt printers, label printers                                                              |
| **Silent printing**  | Yes                                                                                                                      |
| **Receipt printers** | Great support, including cash drawer kick                                                                                |
| **API**              | RESTful HTTP API                                                                                                         |
| **Price**            | From $10/month for 250 prints                                                                                            |
| **Website**          | [printnode.com](https://www.printnode.com/)                                                                              |
| **Key advantage**    | True cloud printing -- print from anywhere to any printer                                                                |

### Webapp Hardware Bridge (WHB)

| Aspect       | Detail                                                            |
| ------------ | ----------------------------------------------------------------- |
| **What**     | Java bridge between web app and hardware (printers, serial ports) |
| **How**      | Local Java app accepts WebSocket requests from browser            |
| **Supports** | Raw ESC/POS, standard printing                                    |
| **License**  | Open source                                                       |

### Print Setu

| Aspect       | Detail                                        |
| ------------ | --------------------------------------------- |
| **What**     | Browser-to-USB printer bridge without drivers |
| **How**      | Local service accepts HTTP requests           |
| **Use case** | POS printing from web apps                    |

### Comparison

| Feature              | QZ Tray    | PrintNode    | WebUSB (no middleware) | Epson ePOS SDK | Star WebPRNT  |
| -------------------- | ---------- | ------------ | ---------------------- | -------------- | ------------- |
| **Browser support**  | All        | All          | Chromium only          | Chrome/Edge/FF | All           |
| **Requires install** | Yes (Java) | Yes (client) | No                     | No             | No            |
| **Silent print**     | Yes        | Yes          | Yes                    | Yes            | Yes           |
| **Raw ESC/POS**      | Yes        | Yes          | Yes                    | Yes (via SDK)  | Yes (via SDK) |
| **Cloud/remote**     | No (local) | Yes          | No                     | No             | Via CloudPRNT |
| **Cost**             | Free/cheap | $10+/mo      | Free                   | Free           | Free          |
| **Printer brands**   | All        | All          | Epson/Star/compatible  | Epson only     | Star only     |

---

## 13. How Major POS Platforms Handle Printing

### Square

- **Supported printers:** 50+ models from Star Micronics and Epson
- **Connection types:** USB (most common), Ethernet, Bluetooth
- **Architecture:** Native app on iPad/Android communicates directly with printer via local network or USB. Web dashboard uses standard browser printing.
- **Kitchen printing:** Routes orders to designated kitchen printers by station
- **KDS:** Square KDS on separate iPad replaces kitchen printer

### Toast

- **Supported printers:** Epson TM-T88V/VI, Star SP700/TSP100, and proprietary Toast printers
- **Architecture:** Toast terminal (proprietary Android hardware) communicates directly with printers over Ethernet LAN
- **Kitchen setup:** Printers added via Toast Web dashboard or POS device (recommended: via POS device)
- **KDS:** Toast-branded kitchen display screens with bump bars

### Clover

- **Supported printers:** Star TSP100/SP700, Epson TM-T88, and Clover-branded printers
- **Architecture:** Clover Station/Mini/Flex hardware communicates with printers via Ethernet/USB
- **Kitchen screens:** Fast kitchen display screens integrated with Clover POS

### Common Pattern

All major POS platforms follow the same architecture:

1. **Native app or proprietary hardware** as the POS terminal
2. **Direct LAN/USB communication** to printers (no cloud relay for printing)
3. **ESC/POS protocol** (either native or emulation mode) for receipt/kitchen printers
4. **Vendor SDKs** (Star SDK, Epson SDK) wrapped in the native app
5. **Web dashboards** use standard `window.print()` for reports/exports -- NOT for receipt printing

### Key Insight for Web-First Apps Like ChefFlow

Web-first POS systems (no native app) face a fundamental challenge: browsers cannot silently send raw ESC/POS commands to printers without either:

1. **WebUSB/Web Serial** (Chromium only, user must grant permission)
2. **Vendor SDK** (Epson ePOS SDK, Star WebPRNT -- printer must have network interface)
3. **Bridge software** (QZ Tray, PrintNode -- requires install on client machine)
4. **`window.print()` + CSS** (universal but shows dialog, limited control, rasterized output)

---

## 14. CSS @media print for Thermal Printers

### The Approach

Use standard `window.print()` with carefully crafted `@media print` CSS. The printer must be installed as an OS printer (via driver or IPP). This works for ALL browsers on ALL platforms.

### Key CSS for Thermal Receipt Printing

```css
@media print {
  /* Hide everything except the receipt */
  body * {
    visibility: hidden;
  }
  .receipt,
  .receipt * {
    visibility: visible;
  }
  .receipt {
    position: absolute;
    left: 0;
    top: 0;
  }

  /* Set page size to match thermal paper */
  @page {
    size: 80mm auto; /* width fixed, height auto */
    margin: 0; /* thermal printers handle margins */
  }

  /* Thermal-friendly typography */
  .receipt {
    width: 72mm; /* print area of 80mm paper */
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.2;
    color: #000;
    background: #fff;
  }

  /* Remove backgrounds and colors */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: transparent !important;
    color: #000 !important;
    box-shadow: none !important;
  }

  /* Hide non-receipt elements */
  nav,
  header,
  footer,
  .sidebar,
  .no-print {
    display: none !important;
  }
}
```

### Width Reference for CSS

| Paper Width | CSS Width (print area)     | Why                  |
| ----------- | -------------------------- | -------------------- |
| 80mm        | `72mm` or `302px` at 96dpi | 4mm margin each side |
| 58mm        | `48mm` or `200px` at 96dpi | 5mm margin each side |

### Limitations of CSS @media print for Thermal

1. **Print dialog always shows** -- cannot be suppressed in browser
2. **No raw ESC/POS commands** -- cannot control barcode printing, QR codes natively, cash drawer, paper cut
3. **Rasterized output** -- browser converts HTML to image, which is larger/slower than raw text commands
4. **Margin/size inconsistency** -- different browsers handle `@page size` differently
5. **No silent printing** -- user must click "Print" every time
6. **Driver required** -- thermal printer must be installed as OS printer

### When CSS @media print IS Appropriate

- Printing from Safari or Firefox (no WebUSB)
- One-off prints where print dialog is acceptable (invoices, contracts, menus)
- Standard printer output (Letter/A4 pages)
- Fallback when no bridge software is installed

---

## 15. Recommendations for ChefFlow

### Printing Use Cases in ChefFlow

| Use Case                     | Printer Type           | Paper          | Best Approach                       |
| ---------------------------- | ---------------------- | -------------- | ----------------------------------- |
| **Client invoices**          | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |
| **Contracts**                | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |
| **Menus**                    | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |
| **Shopping lists**           | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |
| **Recipes**                  | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |
| **Event day-of timeline**    | Standard or thermal    | Letter or 80mm | CSS or ESC/POS                      |
| **Kitchen tickets**          | Thermal receipt (80mm) | 80mm           | ESC/POS via vendor SDK or bridge    |
| **Prep labels**              | Label printer          | 2" labels      | ZPL (Zebra) or vendor SDK           |
| **Packing lists**            | Standard or thermal    | Letter or 80mm | CSS (standard) or ESC/POS (thermal) |
| **Service execution sheets** | Standard inkjet/laser  | Letter/A4      | `window.print()` + CSS @media print |

### Recommended Architecture (Tiered)

#### Tier 1: CSS @media print (Ship First -- Zero Dependencies)

For standard document printing (invoices, contracts, menus, recipes, shopping lists):

- Use `window.print()` with well-crafted `@media print` CSS
- Works in ALL browsers, ALL platforms, ALL printers
- No library dependencies, no client install
- User sees print dialog (acceptable for these use cases)

#### Tier 2: Vendor SDK Integration (For Thermal Receipt Printing)

For chefs with Epson or Star thermal printers:

- **Epson:** Use Epson ePOS SDK for JavaScript (HTTP to printer, no install)
- **Star:** Use Star WebPRNT (HTTP to printer, no install)
- Requires printer to be on the same network
- Silent printing (no dialog)
- Full ESC/POS control (barcodes, QR codes, auto-cut)

#### Tier 3: Bridge Software (For Advanced/Universal Thermal Printing)

For maximum compatibility across printer brands:

- **QZ Tray** (open source, all browsers, all printers, silent printing)
- Requires one-time install on the chef's machine
- Supports raw ESC/POS, ZPL, and standard printing
- Works in Safari, Firefox, Chrome, Edge

#### Libraries to Consider

| Library                                  | Use Case                               | Install |
| ---------------------------------------- | -------------------------------------- | ------- |
| `@point-of-sale/receipt-printer-encoder` | Encode ESC/POS/StarPRNT commands       | npm     |
| `react-thermal-printer`                  | React components for receipt layout    | npm     |
| `@thermal-print/react`                   | React + ESC/POS or HTML/PDF output     | npm     |
| `zpl-js`                                 | Generate ZPL for Zebra label printers  | npm     |
| `node-thermal-printer`                   | Server-side printing (Next.js actions) | npm     |

### Print Page Component Pattern

For ChefFlow's existing print pages (e.g., clipboard/print, invoice print):

```tsx
// Dual-mode print component
export function PrintableDocument({ data }) {
  return (
    <>
      {/* Screen view with print button */}
      <div className="no-print">
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      {/* Print view -- only this renders when printing */}
      <div className="print-only">{/* Document content here */}</div>
    </>
  )
}
```

---

## Sources

### Thermal Receipt Printers

- [Star Micronics Thermal POS Printers](https://starmicronics.com/thermal-pos-receipt-printers/)
- [Best Receipt Printers 2025](https://thebarcode.com/best-pos-receipt-printers-wireless-thermal-printers/)
- [Star Micronics ESC/POS Expansion (2026)](https://starmicronics.com/blog/star-micronics-expands-esc-pos-printer-compatibility-across-thermal-and-impact-printing-solutions/)
- [Epson TM-T88VII Specification Sheet](https://mediaserver.goepson.com/ImConvServlet/imconv/edc075a40df761787c961db3b54d13161167aa31/original?assetDescr=OmniLink_TM-T88VII_Specification_Sheet_CPD-61180.pdf)
- [Epson TM-m30III Specifications](https://download4.epson.biz/sec_pubs/bs/html/m001464/en/chap07_1.html)
- [Star TSP143IV Product Page](https://starmicronics.com/product/tsp143iv-thermal-receipt-printer/)

### Kitchen Display Systems

- [Oracle KDS](https://www.oracle.com/food-beverage/restaurant-pos-systems/kds-kitchen-display-systems/)
- [Epson TrueOrder KDS](<https://epson.com/Accessories/POS-Accessories/TrueOrder-Kitchen-Display-System-(KDS)/p/SW-KDS175L>)
- [Square KDS](https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system)
- [Best KDS 2025](https://loman.ai/blog/best-kitchen-display-systems-order-routing)

### Impact/Dot Matrix Printers

- [Epson TM-U220 Product Page](https://epson.com/For-Work/POS-System-Devices/POS-Printers/TM-U220-Receipt-Kitchen-Printer/p/C31C514653)
- [Star SP742 Product Page](https://starmicronics.com/product/sp742-impact-printer-kitchen-restaurant-orders-tickets/)
- [Partner Tech DM-300](https://shop.liven.love/products/partner-tech-dm-300-dot-matrix-kitchen-printer)

### Label Printers

- [Best Label Printer for Food Packaging 2026](https://toptopmfg.com/blog/best-label-printer-for-food-packaging/)
- [Zebra Food & Beverage Labels](https://www.zebra.com/us/en/industry/hospitality/labels.html)
- [Brother Food Labeling](https://brothermobilesolutions.com/applications/food-labeling/)
- [Brother QL-820NWB](https://www.brother-usa.com/products/ql820nwb)
- [Brother QL-1110NWB](https://www.brother-usa.com/products/ql1110nwb)
- [DateCodeGenie](https://www.ncco.com/date-code-genie/)
- [DYMO LabelWriter 550](https://www.dymo.com/label-makers-printers/labelwriter-label-printers/dymo-labelwriter-550-label-printer/SP_1373971.html)
- [Zebra ZD421/ZD620 Specs](https://docs.zebra.com/us/en/printers/desktop/zd421-and-zd621-desktop-printers-user-guide/c-zd620-420-media/r-zd421-zd621-ug-general-media-and-print-specifications.html)
- [Rollo Printer](https://www.rollo.com/product/rollo-wireless-printer/)

### Mobile/Portable Printers

- [Best Mobile Printers for Food Trucks 2025](https://www.szzcs.com/News/the-best-mobile-receipt-printers-for-food-trucks-in-2025-efficient-and-portable-pos-printing-solutions.html)
- [Best POS Printer for Food Trucks 2026](https://www.hprt.com/featured-articles/best-food-truck-pos-printer-guide.html)
- [Bixolon SPP-R200III](https://www.bixolon.com/product_view.php?idx=138)

### Wide-Format Printers

- [Best Large Format Printers 2025](https://www.techradar.com/best/best-large-format-printers)
- [Epson Professional Imaging](https://epson.com/pro-imaging-large-format-printers)
- [Canon imagePROGRAF](https://plotterpro.com/2025s-top-5-canon-printers-professional-posters-graphics/)

### Protocols & Web Printing

- [ESC/POS Web Printing Without Drivers](https://whizz-tech.com/support/printers/escpos-web-printing-without-drivers-test-page/)
- [WebUSB API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
- [Web Serial API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [WebUSB Browser Support (Can I Use)](https://caniuse.com/webusb)
- [Epson ePOS SDK for JavaScript](https://download4.epson.biz/sec_pubs/pos/reference_en/technology/epson_epos_sdk.html)
- [Star WebPRNT SDK](https://starmicronics.com/webprnt-web-based-pos-sdk-http-printing/)
- [Star CloudPRNT Protocol](https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/about.html)
- [StarIO.Online API](https://docs.starprinter.online/webapi/index.html)
- [Zebra Printing from JavaScript](https://developer.zebra.com/content/printing-javascript)

### Cloud/Bridge Solutions

- [QZ Tray](https://qz.io/)
- [PrintNode](https://www.printnode.com/en/use-cases)
- [Google Cloud Print Alternatives 2025](https://whizz-tech.com/support/printers/google-cloud-print-alternatives-2025/)
- [IPP Everywhere](https://www.pwg.org/ipp/everywhere.html)

### CSS Print

- [CSS Print Receipt Example](https://parzibyte.me/blog/en/2019/10/10/print-receipt-thermal-printer-javascript-css-html/)
- [Print From Web Page to POS Printer](https://medium.com/@dmitrysikorsky/how-to-print-from-a-web-page-to-a-pos-printer-8d5b39fc975b)
- [Paper CSS Receipt Example](https://github.com/cognitom/paper-css/blob/master/examples/receipt.html)

### Libraries

- [ReceiptPrinterEncoder (npm)](https://www.npmjs.com/package/@point-of-sale/receipt-printer-encoder)
- [WebUSBReceiptPrinter](https://github.com/NielsLeenheer/WebUSBReceiptPrinter)
- [react-thermal-printer](https://github.com/seokju-na/react-thermal-printer)
- [@thermal-print/react](https://www.npmjs.com/package/@thermal-print/react)
- [node-thermal-printer](https://www.npmjs.com/package/node-thermal-printer)
- [escpos-xml](https://github.com/ingoncalves/escpos-xml)
- [zpl-js](https://github.com/tomoeste/zpl-js)
- [Epson ePOS SDK React Integration](https://github.com/rubenruvalcabac/epson-epos-sdk-react)
- [Silent Print WebSocket Service](https://github.com/Premod1/printer-service)
