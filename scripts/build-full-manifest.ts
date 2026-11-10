import fs from 'node:fs';
import path from 'node:path';

export interface SeedItem {
  slug: string;
  title: string;
  description: string;
  category:
    | 'electronics'
    | 'watches'
    | 'art'
    | 'collectibles'
    | 'fashion'
    | 'vehicles'
    | 'furniture'
    | 'books'
    | 'musical'
    | 'appliances'
    | 'sports'
    | 'other';
  condition: 'new' | 'like_new' | 'used_good' | 'used_fair';
  startingPrice: number; // in integer paise
  reservePrice?: number;
  minIncrement: number; // in integer paise
  targetStatus:
    | 'active'
    | 'scheduled'
    | 'completed'
    | 'payment_pending'
    | 'payment_failed'
    | 'unsold'
    | 'cancelled';
  endsInMinutes?: number; // for active items: offset from NOW
  startsInHours?: number; // for scheduled items: offset from NOW
  images: Array<{
    url: string;
    photographer: string;
    sourceUrl: string;
  }>;
}

const items: SeedItem[] = [
  // ==========================================
  // 1. ELECTRONICS (10 items)
  // ==========================================
  {
    slug: 'apple-macbook-pro-m4-max',
    title: 'Apple MacBook Pro M4 Max (16-inch, 64GB, 2TB SSD)',
    description: 'Flagship Apple Silicon laptop in pristine Space Black finish. Battery health 100%, 14 cycles. Includes MagSafe charger and original retail packaging.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 18000000,
    reservePrice: 21000000,
    minIncrement: 200000,
    targetStatus: 'active',
    endsInMinutes: 4, // Live demo: ending in 4 minutes!
    images: [
      { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80', photographer: 'Howard Bouchevereau', sourceUrl: 'https://unsplash.com/photos/silver-macbook-pro-turned-on--rocking-chair' },
      { url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1200&q=80', photographer: 'Tianyi Ma', sourceUrl: 'https://unsplash.com/photos/space-gray-macbook-pro-open' }
    ]
  },
  {
    slug: 'sony-alpha-a1-body',
    title: 'Sony Alpha A1 Mirrorless Camera Body (50.1 MP, 8K 30p)',
    description: 'Professional cinema & still hybrid camera. Shutter count under 1,200. Dual BIONZ XR processors, 30fps blackout-free shooting, pristine full-frame sensor.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 42000000,
    reservePrice: 45000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 35, // Ends in 35 min
    images: [
      { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80', photographer: 'Alexander Andrews', sourceUrl: 'https://unsplash.com/photos/black-dslr-camera' },
      { url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80', photographer: 'Enis Yavuz', sourceUrl: 'https://unsplash.com/photos/camera-lens-close-up' }
    ]
  },
  {
    slug: 'bose-quietcomfort-ultra',
    title: 'Bose QuietComfort Ultra Headphones Limited White Smoke',
    description: 'Brand new, sealed in original box with worldwide manufacturer warranty. World-class spatial audio immersion and active noise cancellation.',
    category: 'electronics',
    condition: 'new',
    startingPrice: 2800000,
    reservePrice: 3200000,
    minIncrement: 50000,
    targetStatus: 'active',
    endsInMinutes: 180, // Ends in 3 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80', photographer: 'C-D-X', sourceUrl: 'https://unsplash.com/photos/headphones-display' },
      { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1200&q=80', photographer: 'Malte Wingen', sourceUrl: 'https://unsplash.com/photos/black-wireless-headphones' }
    ]
  },
  {
    slug: 'nvidia-rtx-5090-fe',
    title: 'Nvidia GeForce RTX 5090 Founders Edition 32GB GDDR7',
    description: 'Next-gen desktop GPU powerhouse. Dual vapor chamber cooling, factory sealed with tamper-proof hologram. Full manufacturer warranty.',
    category: 'electronics',
    condition: 'new',
    startingPrice: 19500000,
    reservePrice: 21500000,
    minIncrement: 200000,
    targetStatus: 'scheduled',
    startsInHours: 12,
    images: [
      { url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=80', photographer: 'Christian Wiediger', sourceUrl: 'https://unsplash.com/photos/computer-hardware-gpu' },
      { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200&q=80', photographer: 'Nana Dua', sourceUrl: 'https://unsplash.com/photos/electronic-components-motherboard' }
    ]
  },
  {
    slug: 'ipad-pro-13-m4-nano',
    title: 'Apple iPad Pro 13-inch M4 (1TB, Nano-texture Glass)',
    description: 'Ultra Retina XDR tandem OLED display with nano-texture glass. Space Black, includes Magic Keyboard and Apple Pencil Pro.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 13500000,
    reservePrice: 15000000,
    minIncrement: 200000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&q=80', photographer: 'Daniel Korpai', sourceUrl: 'https://unsplash.com/photos/ipad-pro-on-desk' }
    ]
  },
  {
    slug: 'leica-q3-digital-compact',
    title: 'Leica Q3 Full-Frame Compact Camera with Summilux 28mm f/1.7',
    description: '60MP BSI CMOS sensor, 8K video recording, tiltable touchscreen, wireless charging grip. Handcrafted in Wetzlar, Germany.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 52000000,
    reservePrice: 56000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80', photographer: 'Enis Yavuz', sourceUrl: 'https://unsplash.com/photos/rangefinder-camera' }
    ]
  },
  {
    slug: 'teenage-engineering-op1-field',
    title: 'Teenage Engineering OP-1 Field Synthesizer & Sampler',
    description: 'Anodized aluminum chassis, 100+ new features, stereo signal chain, Bluetooth MIDI, and 24-hour battery life. Mint condition.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 14500000,
    reservePrice: 16000000,
    minIncrement: 200000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80', photographer: 'Wes Hicks', sourceUrl: 'https://unsplash.com/photos/audio-synthesizer-gear' }
    ]
  },
  {
    slug: 'sony-wh1000xm5-silver',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones (Silver)',
    description: 'Complete retail set with hard carrying case, 3.5mm cable, and flight adapter. Battery holds 100% rated capacity.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 2200000,
    minIncrement: 50000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80', photographer: 'C-D-X', sourceUrl: 'https://unsplash.com/photos/white-wireless-headphones' }
    ]
  },
  {
    slug: 'hasselblad-907x-50c',
    title: 'Hasselblad 907X 50C Medium Format Camera Kit with 45mm Lens',
    description: 'CFV II 50C digital back with tilt screen and 907X camera body. Includes XCD 45mm f/4 P lens. Shutter actuations under 800.',
    category: 'electronics',
    condition: 'like_new',
    startingPrice: 58000000,
    reservePrice: 65000000,
    minIncrement: 1000000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80', photographer: 'Alexander Andrews', sourceUrl: 'https://unsplash.com/photos/medium-format-camera' }
    ]
  },
  {
    slug: 'custom-liquid-gaming-rig',
    title: 'Custom Liquid-Cooled Gaming Rig Intel Core i9 / RTX 4090',
    description: 'Custom hard-tube water cooling with dual EK radiators, 64GB DDR5, 4TB Gen4 NVMe. Withdrawn before commencement.',
    category: 'electronics',
    condition: 'new',
    startingPrice: 32000000,
    minIncrement: 500000,
    targetStatus: 'cancelled',
    images: [
      { url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=80', photographer: 'Christian Wiediger', sourceUrl: 'https://unsplash.com/photos/liquid-cooled-pc' }
    ]
  },

  // ==========================================
  // 2. WATCHES & HOROLOGY (10 items)
  // ==========================================
  {
    slug: 'rolex-submariner-kermit',
    title: 'Rolex Submariner Date "Kermit" 41mm Ref. 126610LV',
    description: 'Cerachrom green bezel with black dial. Full set with box, papers, green tags, and warranty booklet dated October 2024. Factory protective stickers intact.',
    category: 'watches',
    condition: 'new',
    startingPrice: 115000000,
    reservePrice: 125000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 8, // Live demo: ending in 8 minutes!
    images: [
      { url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=1200&q=80', photographer: 'Carlos Esteves', sourceUrl: 'https://unsplash.com/photos/round-silver-colored-chronograph-watch' },
      { url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80', photographer: 'The 5TH', sourceUrl: 'https://unsplash.com/photos/gold-colored-chronograph-watch' }
    ]
  },
  {
    slug: 'cartier-santos-two-tone',
    title: 'Cartier Santos de Cartier Large Model Two-Tone',
    description: 'Stainless steel and 18K yellow gold, manufacture mechanical movement with automatic winding 1847 MC. Includes QuickSwitch steel and leather bracelets.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 65000000,
    reservePrice: 72000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 720, // Ends in 12 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200&q=80', photographer: 'Jaime Spanish', sourceUrl: 'https://unsplash.com/photos/luxury-gold-watch' },
      { url: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=1200&q=80', photographer: 'Alvin Mahmudov', sourceUrl: 'https://unsplash.com/photos/watch-on-wooden-surface' }
    ]
  },
  {
    slug: 'patek-philippe-calatrava-5227r',
    title: 'Patek Philippe Calatrava Ref. 5227R Rose Gold',
    description: 'Officer-style case with hinged dust cover revealing Calibre 324 S C movement. Complete archival extract and lacquered wooden box.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 280000000,
    reservePrice: 310000000,
    minIncrement: 1000000,
    targetStatus: 'scheduled',
    startsInHours: 18,
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80', photographer: 'Giorgio Trovato', sourceUrl: 'https://unsplash.com/photos/luxury-rose-gold-watch' }
    ]
  },
  {
    slug: 'omega-speedmaster-moonwatch-sapphire',
    title: 'Omega Speedmaster Professional Moonwatch Sapphire Sandwich',
    description: 'Co-Axial Master Chronometer Calibre 3861 with sapphire crystal front and exhibition caseback. Complete presentation flight suitcase.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 58000000,
    reservePrice: 63000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=1200&q=80', photographer: 'Anthony Choren', sourceUrl: 'https://unsplash.com/photos/omega-speedmaster-watch' }
    ]
  },
  {
    slug: 'audemars-piguet-royal-oak-offshore',
    title: 'Audemars Piguet Royal Oak Offshore Chronograph 42mm',
    description: 'Mega Tapisserie black dial with ceramic pushers and rubber strap. Reserve unmet during initial auction window.',
    category: 'watches',
    condition: 'used_good',
    startingPrice: 180000000,
    reservePrice: 220000000,
    minIncrement: 1000000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', photographer: 'Sanja Radin', sourceUrl: 'https://unsplash.com/photos/sports-luxury-chronograph' }
    ]
  },
  {
    slug: 'jaeger-lecoultre-reverso-tribute',
    title: 'Jaeger-LeCoultre Reverso Tribute Monoface Small Seconds',
    description: 'Burgundy red sunray dial in stainless steel art deco swivel case. Fagliano collection calfskin strap. Complete set with papers.',
    category: 'watches',
    condition: 'new',
    startingPrice: 72000000,
    reservePrice: 80000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 1440, // 24 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80', photographer: 'The 5TH', sourceUrl: 'https://unsplash.com/photos/classic-rectangular-watch' }
    ]
  },
  {
    slug: 'grand-seiko-snowflake-sbga211',
    title: 'Grand Seiko Heritage "Snowflake" SBGA211 Spring Drive',
    description: 'High-intensity titanium case with dial inspired by the snowfields of Shinsu. Calibre 9R65 Spring Drive with smooth sweeping seconds.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 42000000,
    reservePrice: 46000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=1200&q=80', photographer: 'Carlos Esteves', sourceUrl: 'https://unsplash.com/photos/textured-dial-watch' }
    ]
  },
  {
    slug: 'vintage-hmt-pilot-mechanical',
    title: 'Vintage HMT Pilot 17 Jewels Mechanical Hand-Winding Watch',
    description: 'Rare authentic black dial with luminous Arabic numerals and blue seconds hand. Produced at Bangalore Factory 1 in 1982. Serviced and running ±8s/day.',
    category: 'watches',
    condition: 'used_good',
    startingPrice: 350000, // ₹3,500
    reservePrice: 450000,
    minIncrement: 20000,
    targetStatus: 'active',
    endsInMinutes: 2880, // 2 days
    images: [
      { url: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=1200&q=80', photographer: 'Alvin Mahmudov', sourceUrl: 'https://unsplash.com/photos/vintage-mechanical-watch' }
    ]
  },
  {
    slug: 'tag-heuer-monaco-calibre-11',
    title: 'TAG Heuer Monaco Calibre 11 Steve McQueen Edition',
    description: 'Left-hand crown chronograph with metallic blue dial and red hands. Automatic movement with perforated black racing calfskin strap.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 48000000,
    reservePrice: 53000000,
    minIncrement: 500000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200&q=80', photographer: 'Jaime Spanish', sourceUrl: 'https://unsplash.com/photos/square-racing-chronograph' }
    ]
  },
  {
    slug: 'iwc-portugieser-chronograph',
    title: 'IWC Portugieser Chronograph Ref. IW371605 Blue Dial',
    description: 'In-house 69355 calibre visible through sapphire caseback. Elegant blue dial with applied Arabic numerals and feuille hands on alligator strap.',
    category: 'watches',
    condition: 'like_new',
    startingPrice: 62000000,
    reservePrice: 68000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=1200&q=80', photographer: 'Carlos Esteves', sourceUrl: 'https://unsplash.com/photos/iwc-dress-watch' }
    ]
  },

  // ==========================================
  // 3. FINE ART (9 items)
  // ==========================================
  {
    slug: 'tanjore-painting-krishna',
    title: '19th Century Tanjore Painting — Krishna with Butter Pot',
    description: 'Authentic Thanjavur art with 22-carat gold leaf embellishment and semi-precious Jaipur stones. Encased in reclaimed seasoned teakwood frame.',
    category: 'art',
    condition: 'used_good',
    startingPrice: 7500000,
    reservePrice: 8500000,
    minIncrement: 100000,
    targetStatus: 'active',
    endsInMinutes: 9, // Live demo: ending in 9 minutes!
    images: [
      { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80', photographer: 'European Art Archive', sourceUrl: 'https://unsplash.com/photos/vintage-gold-framed-art' },
      { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=80', photographer: 'Birmingham Museums Trust', sourceUrl: 'https://unsplash.com/photos/traditional-classical-artwork' }
    ]
  },
  {
    slug: 'mf-husain-horses-oil-canvas',
    title: 'Original M.F. Husain Oil on Canvas — Horses Series (1988)',
    description: 'Signed lower right. Includes provenance certificate from Vadehra Art Gallery and Christie’s Mumbai archival dossier.',
    category: 'art',
    condition: 'used_good',
    startingPrice: 450000000,
    reservePrice: 500000000,
    minIncrement: 2500000,
    targetStatus: 'scheduled',
    startsInHours: 24,
    images: [
      { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80', photographer: 'European Art Archive', sourceUrl: 'https://unsplash.com/photos/modern-indian-oil-painting' },
      { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/expressive-horse-artwork' }
    ]
  },
  {
    slug: 'jamini-roy-tempera-santhal',
    title: 'Jamini Roy Tempera on Woven Mat — Santhal Mother & Child',
    description: 'Natural mineral pigments on indigenous handwoven mat. Characteristic sweeping almond eyes and bold Bengali folk lines. Verified provenance.',
    category: 'art',
    condition: 'used_good',
    startingPrice: 18500000,
    reservePrice: 22000000,
    minIncrement: 250000,
    targetStatus: 'active',
    endsInMinutes: 480, // 8 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/folk-art-pigment-painting' }
    ]
  },
  {
    slug: 'raja-ravi-varma-oleograph-1899',
    title: 'Raja Ravi Varma Certified Oleograph — Hamsa Damayanti (1899)',
    description: 'Printed at the Ravi Varma Fine Arts Lithographic Press, Karla-Lonavala. Preserved in period rosewood frame under museum-grade UV conservation glass.',
    category: 'art',
    condition: 'used_good',
    startingPrice: 6500000,
    reservePrice: 7500000,
    minIncrement: 100000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/historical-lithograph-portrait' }
    ]
  },
  {
    slug: 'abanindranath-tagore-wash-painting',
    title: 'Abanindranath Tagore Bengal School Watercolor Wash (1914)',
    description: 'Rare Japanese wash technique on Japanese paper depicting twilight over the Ganges. Signed in Bengali script.',
    category: 'art',
    condition: 'used_good',
    startingPrice: 24000000,
    reservePrice: 28000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80', photographer: 'European Art Archive', sourceUrl: 'https://unsplash.com/photos/bengal-school-watercolor' }
    ]
  },
  {
    slug: 'pichwai-silk-shrinathji-sharat',
    title: 'Pichwai on Handwoven Silk — Shrinathji Sharad Purnima',
    description: 'Nathdwara devotional art painted with natural crushed gemstone colors and pure silver foil on pure silk. 6ft x 4ft grand tapestry.',
    category: 'art',
    condition: 'like_new',
    startingPrice: 8500000,
    reservePrice: 10000000,
    minIncrement: 100000,
    targetStatus: 'active',
    endsInMinutes: 1800, // 30 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/rajasthani-pichwai-textile' }
    ]
  },
  {
    slug: 'ram-kumar-abstract-landscape',
    title: 'Ram Kumar Abstract Landscape Acrylic on Canvas (2004)',
    description: 'Muted ochre and charcoal architectural abstractions of the ghats of Varanasi. Exhibited at Lalit Kala Akademi retrospective.',
    category: 'art',
    condition: 'like_new',
    startingPrice: 95000000,
    reservePrice: 110000000,
    minIncrement: 1000000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80', photographer: 'European Art Archive', sourceUrl: 'https://unsplash.com/photos/abstract-ochre-canvas' }
    ]
  },
  {
    slug: 'anish-kapoor-polished-steel-disc',
    title: 'Anish Kapoor Limited Edition Polished Stainless Steel Concave Disc',
    description: 'Numbered 4/12. Mirror-polished stainless steel capturing inverted perspective. Complete provenance and artist studio stamp.',
    category: 'art',
    condition: 'new',
    startingPrice: 320000000,
    reservePrice: 380000000,
    minIncrement: 2000000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/modern-steel-sculpture' }
    ]
  },
  {
    slug: 'traditional-madhubani-tree-life',
    title: 'Traditional Madhubani Tree of Life Pigment on Handmade Paper',
    description: 'National Award-winning master artisan work from Mithila, Bihar. Intricate natural bamboo-nib line art using herbal extracts.',
    category: 'art',
    condition: 'new',
    startingPrice: 1200000,
    reservePrice: 1500000,
    minIncrement: 25000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/madhubani-folk-art' }
    ]
  },

  // ==========================================
  // 4. RARE COLLECTIBLES (9 items)
  // ==========================================
  {
    slug: 'independence-stamp-cover-1947',
    title: 'Rare 1947 Indian Independence First Day Stamp Cover',
    description: 'Postmarked on 15 August 1947, New Delhi GPO. Features the iconic Ashoka Lion capital 3½ anna stamp. Certified authentic by Philatelic Congress of India.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 3500000,
    reservePrice: 4200000,
    minIncrement: 100000,
    targetStatus: 'active',
    endsInMinutes: 120, // 2 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/vintage-envelope-and-letters' },
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/antique-paper-manuscript' }
    ]
  },
  {
    slug: 'kashmiri-walnut-chinar-chest',
    title: 'Handcrafted Kashmiri Walnut Wood Carved Chinar Chest',
    description: 'Master artisan piece from downtown Srinagar in seasoned walnut wood. Deep relief Chinar leaf carvings across five sides with secret brass locking drawer.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 4200000,
    reservePrice: 4800000,
    minIncrement: 100000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/antique-wooden-furniture' }
    ]
  },
  {
    slug: 'victorian-silver-tea-service-1880',
    title: 'Antique 1880 Victorian Sterling Silver 5-Piece Tea Service',
    description: 'Hallmarked Sheffield 1880 by Martin, Hall & Co. Total weight 3,150 grams of 925 sterling silver with ebony handles and finials.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 9500000,
    reservePrice: 11000000,
    minIncrement: 200000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=80', photographer: 'Tyler Nix', sourceUrl: 'https://unsplash.com/photos/silver-teapot-set' }
    ]
  },
  {
    slug: 'tagore-gitanjali-first-edition-1912',
    title: 'Rare First Edition Rabindranath Tagore Gitanjali (1912)',
    description: 'India Society London limited edition of 750 copies with introduction by W.B. Yeats. Cancelled due to archival ownership dispute.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 12500000,
    minIncrement: 250000,
    targetStatus: 'cancelled',
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/vintage-bound-book' }
    ]
  },
  {
    slug: 'akbar-mughal-silver-rupee-1585',
    title: 'Akbar the Great Mughal Imperial Silver Square Rupee (1585 CE)',
    description: 'Minted at Dar al-Sultanat Lahore during the 30th regnal year. Kalima type with crisp calligraphic legend and full weight 11.4 grams.',
    category: 'collectibles',
    condition: 'like_new',
    startingPrice: 2800000,
    reservePrice: 3200000,
    minIncrement: 50000,
    targetStatus: 'active',
    endsInMinutes: 4200, // 3 days
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/ancient-silver-coin' }
    ]
  },
  {
    slug: 'antique-brass-astrolabe-18th-century',
    title: 'Brass 18th Century Islamic Astrolabe with Engraved Plates',
    description: 'Brass planispheric astrolabe with six latitude plates, pierced rete, and rotating alidade. Inscribed in Naskh script.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 16500000,
    reservePrice: 19000000,
    minIncrement: 250000,
    targetStatus: 'scheduled',
    startsInHours: 36,
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/brass-astronomical-instrument' }
    ]
  },
  {
    slug: 'chola-bronze-temple-bell',
    title: 'Chola Dynasty 12th Century Lost-Wax Cast Temple Bell',
    description: 'Heavy bronze temple bell with Nandi finial and rhythmic Sanskrit slokas around the rim. Resonant acoustic sustain exceeding 45 seconds.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 8800000,
    reservePrice: 10000000,
    minIncrement: 100000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/antique-bronze-artifact' }
    ]
  },
  {
    slug: 'cricket-world-cup-1983-match-ball',
    title: '1983 Lord\'s Cricket World Cup Kapil Dev Signed Match Ball',
    description: 'Official Duke match ball from the historic 1983 Prudential World Cup Final. Signed by captain Kapil Dev with letter of provenance.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 14000000,
    reservePrice: 16500000,
    minIncrement: 200000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=80', photographer: 'Alessandro Bogliari', sourceUrl: 'https://unsplash.com/photos/historic-cricket-ball' }
    ]
  },
  {
    slug: 'brass-marine-sextant-1917',
    title: 'Brass Maritime Marine Sextant by Kelvin & Hughes London (1917)',
    description: 'World War I naval sextant in fitted mahogany sea chest with original calibration certificate from Kew Observatory.',
    category: 'collectibles',
    condition: 'used_good',
    startingPrice: 5500000,
    reservePrice: 6500000,
    minIncrement: 100000,
    targetStatus: 'payment_failed',
    images: [
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80', photographer: 'Birmingham Museums', sourceUrl: 'https://unsplash.com/photos/brass-navigational-sextant' }
    ]
  },

  // ==========================================
  // 5. FASHION & LUXURY (8 items)
  // ==========================================
  {
    slug: 'hermes-birkin-30-gold-togo',
    title: 'Hermès Birkin 30 Gold Togo Leather with Palladium Hardware',
    description: 'Iconic Hermes Birkin in warm Gold Togo leather. Pristine condition with clochette, lock, two keys, rain cover, and felt protector. Includes receipt from Paris flagship.',
    category: 'fashion',
    condition: 'like_new',
    startingPrice: 140000000,
    reservePrice: 160000000,
    minIncrement: 1000000,
    targetStatus: 'active',
    endsInMinutes: 240, // 4 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&q=80', photographer: 'Laura Chouette', sourceUrl: 'https://unsplash.com/photos/brown-leather-luxury-tote' },
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', photographer: 'Sanja Radin', sourceUrl: 'https://unsplash.com/photos/luxury-leather-handbag' }
    ]
  },
  {
    slug: 'chanel-classic-double-flap-caviar',
    title: 'Chanel Classic Medium Double Flap Caviar Leather (Gold Hardware)',
    description: 'Quilted black caviar calfskin with 24K gold-plated chain and CC turnlock. Serial microchip verified with box, dustbag, and cleaning cloth.',
    category: 'fashion',
    condition: 'new',
    startingPrice: 78000000,
    reservePrice: 85000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 1200, // 20 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', photographer: 'Sanja Radin', sourceUrl: 'https://unsplash.com/photos/black-quilted-luxury-bag' }
    ]
  },
  {
    slug: 'banarasi-pure-katan-silk-saree',
    title: 'Royal Banarasi Pure Katan Silk Shikargah Handloom Saree',
    description: 'Woven over 90 days in Varanasi with real gold and silver zari (certified tested). Intricate hunting motif (Shikargah) on midnight crimson silk.',
    category: 'fashion',
    condition: 'new',
    startingPrice: 16500000,
    reservePrice: 19000000,
    minIncrement: 200000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80', photographer: 'Visual Stories', sourceUrl: 'https://unsplash.com/photos/indian-silk-textile' }
    ]
  },
  {
    slug: 'louis-vuitton-keepall-55-eclipse',
    title: 'Louis Vuitton Keepall 55 Bandoulière Monogram Eclipse',
    description: 'Cabin-sized travel duffle in gray and black Monogram Eclipse coated canvas with black leather trim, luggage tag, and padlock.',
    category: 'fashion',
    condition: 'like_new',
    startingPrice: 21000000,
    reservePrice: 24000000,
    minIncrement: 200000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', photographer: 'Sanja Radin', sourceUrl: 'https://unsplash.com/photos/luxury-duffle-bag' }
    ]
  },
  {
    slug: 'sabyasachi-velvet-bridal-lehenga',
    title: 'Sabyasachi Heritage Crimson Velvet Embroidered Bridal Lehenga',
    description: 'Handcrafted zardozi, tilla work, and dabka embroidery on deep crimson velvet. Includes matching double organza dupattas and blouse.',
    category: 'fashion',
    condition: 'like_new',
    startingPrice: 85000000,
    reservePrice: 95000000,
    minIncrement: 1000000,
    targetStatus: 'scheduled',
    startsInHours: 48,
    images: [
      { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80', photographer: 'Visual Stories', sourceUrl: 'https://unsplash.com/photos/luxury-embroidered-couture' }
    ]
  },
  {
    slug: 'gucci-horsebit-1955-shoulder',
    title: 'Gucci 1955 Horsebit Leather Shoulder Bag in Cuir Leather',
    description: 'Structured shoulder bag with iconic horsebit equestrian gold hardware. Microfiber lining with a suede-like finish.',
    category: 'fashion',
    condition: 'like_new',
    startingPrice: 24000000,
    reservePrice: 27000000,
    minIncrement: 200000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&q=80', photographer: 'Laura Chouette', sourceUrl: 'https://unsplash.com/photos/cuir-leather-shoulder-bag' }
    ]
  },
  {
    slug: 'raw-silk-zardozi-royal-achkan',
    title: 'Raw Silk Zardozi Hand-Embroidered Royal Achkan Sherwani',
    description: 'Bespoke hand-tailored ivory raw silk achkan with antique gold zardozi bullion thread and emerald enamelled buttons.',
    category: 'fashion',
    condition: 'new',
    startingPrice: 18000000,
    reservePrice: 21000000,
    minIncrement: 200000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80', photographer: 'Visual Stories', sourceUrl: 'https://unsplash.com/photos/royal-silk-achkan' }
    ]
  },
  {
    slug: 'christian-louboutin-pigalle-100',
    title: 'Christian Louboutin Pigalle 100 Patent Leather Pumps (Size 38)',
    description: 'Iconic red sole stiletto in high-gloss black patent calfskin. 100mm heel. Brand new in box with dustbags and replacement heel taps.',
    category: 'fashion',
    condition: 'new',
    startingPrice: 6500000,
    reservePrice: 7500000,
    minIncrement: 100000,
    targetStatus: 'payment_failed',
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', photographer: 'Sanja Radin', sourceUrl: 'https://unsplash.com/photos/patent-leather-pumps' }
    ]
  },

  // ==========================================
  // 6. VEHICLES & ACCESSORIES (8 items)
  // ==========================================
  {
    slug: 'royal-enfield-amal-carburetor',
    title: 'Vintage Royal Enfield 1968 Brass Carburetor Assembly',
    description: 'Original Amal Monobloc carburetor thoroughly serviced and ultrasound cleaned. Preserved brass float and polished throat for classic Bullet enthusiasts.',
    category: 'vehicles',
    condition: 'used_good',
    startingPrice: 1500000,
    reservePrice: 1800000,
    minIncrement: 50000,
    targetStatus: 'active',
    endsInMinutes: 60, // 1 hour
    images: [
      { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80', photographer: 'Harley Davidson', sourceUrl: 'https://unsplash.com/photos/motorcycle-engine-detail' },
      { url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', photographer: 'Goran Ivos', sourceUrl: 'https://unsplash.com/photos/classic-vintage-motorcycle' }
    ]
  },
  {
    slug: 'vespa-150-sprint-speedometer-1965',
    title: '1965 Vespa 150 Sprint Original Veglia Borletti Speedometer',
    description: 'Clam-shell chrome bezel speedometer made in Italy. Restored with original odometer reading 14,280 km.',
    category: 'vehicles',
    condition: 'used_good',
    startingPrice: 850000,
    reservePrice: 1100000,
    minIncrement: 20000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', photographer: 'Goran Ivos', sourceUrl: 'https://unsplash.com/photos/classic-scooter-gauge' }
    ]
  },
  {
    slug: 'bbs-super-rs-19-wheels',
    title: 'BBS Super RS 19-inch 2-Piece Forged Light Alloy Wheels Set',
    description: 'Staggered 19x8.5 / 19x9.5 5x112 bolt pattern. Diamond silver center with polished spun rim and gold center hex caps.',
    category: 'vehicles',
    condition: 'like_new',
    startingPrice: 38000000,
    reservePrice: 42000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 2160, // 36 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80', photographer: 'Harley Davidson', sourceUrl: 'https://unsplash.com/photos/custom-forged-wheel' }
    ]
  },
  {
    slug: 'brembo-gt-carbon-ceramic-brakes',
    title: 'Brembo GT 6-Piston 380mm Carbon Ceramic Brake Caliper Kit',
    description: 'Monobloc aluminum 6-piston front calipers in racing yellow with cross-drilled carbon ceramic rotors and braided steel lines.',
    category: 'vehicles',
    condition: 'new',
    startingPrice: 65000000,
    reservePrice: 72000000,
    minIncrement: 500000,
    targetStatus: 'scheduled',
    startsInHours: 54,
    images: [
      { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80', photographer: 'Harley Davidson', sourceUrl: 'https://unsplash.com/photos/high-performance-brake-calipers' }
    ]
  },
  {
    slug: 'moto-guzzi-aluminum-fuel-tank',
    title: 'Moto Guzzi V7 Sport 1974 Hand-Beaten Aluminum Fuel Tank',
    description: 'Unpainted polished hand-formed aviation-grade aluminum tank with Monza quick-release cap.',
    category: 'vehicles',
    condition: 'like_new',
    startingPrice: 19500000,
    reservePrice: 22500000,
    minIncrement: 200000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', photographer: 'Goran Ivos', sourceUrl: 'https://unsplash.com/photos/vintage-aluminum-motorcycle-tank' }
    ]
  },
  {
    slug: 'recaro-pole-position-leather',
    title: 'Recaro Pole Position N.G. Leather Bucket Racing Seats (Pair)',
    description: 'FIA approved glass-fiber reinforced plastic shell trimmed in black Perlon velour and Nappa leather. Side mounts included.',
    category: 'vehicles',
    condition: 'new',
    startingPrice: 28000000,
    reservePrice: 32000000,
    minIncrement: 250000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80', photographer: 'Harley Davidson', sourceUrl: 'https://unsplash.com/photos/racing-bucket-seat' }
    ]
  },
  {
    slug: 'yoshimura-r77-titanium-exhaust',
    title: 'Yoshimura R-77 Works Finish Titanium Slip-on Exhaust System',
    description: 'Trapezoidal titanium canister with carbon fiber end cap. Sound tested and dyno tuned for Suzuki Hayabusa Gen 3.',
    category: 'vehicles',
    condition: 'like_new',
    startingPrice: 11000000,
    reservePrice: 13000000,
    minIncrement: 100000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80', photographer: 'Goran Ivos', sourceUrl: 'https://unsplash.com/photos/titanium-exhaust-pipe' }
    ]
  },
  {
    slug: 'akrapovic-gt3-exhaust-carbon',
    title: 'Akrapovič Evolution Titanium Header for Porsche 911 GT3 (992)',
    description: 'Ultra-lightweight titanium alloy system saving 14.2 kg over stock. Includes carbon fiber diffuser and heat shields.',
    category: 'vehicles',
    condition: 'new',
    startingPrice: 75000000,
    reservePrice: 85000000,
    minIncrement: 1000000,
    targetStatus: 'payment_failed',
    images: [
      { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80', photographer: 'Harley Davidson', sourceUrl: 'https://unsplash.com/photos/titanium-valved-exhaust' }
    ]
  },

  // ==========================================
  // 7. HERITAGE FURNITURE (7 items)
  // ==========================================
  {
    slug: 'eames-lounge-chair-palisander',
    title: 'Herman Miller Eames Lounge Chair & Ottoman (Santos Palisander)',
    description: 'Original Herman Miller production in oiled Santos Palisander veneer with black premium MCL leather. Mint condition with certificate of authenticity.',
    category: 'furniture',
    condition: 'like_new',
    startingPrice: 48000000,
    reservePrice: 52000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 480, // 8 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=80', photographer: 'Jean-Philippe Delberghe', sourceUrl: 'https://unsplash.com/photos/mid-century-lounge-chair' },
      { url: 'https://images.unsplash.com/photo-1580481077167-33635673667b?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/modern-interior-furniture' }
    ]
  },
  {
    slug: 'scandinavian-rosewood-credenza-1964',
    title: 'Mid-Century Scandinavian Rosewood Sideboard Credenza (1964)',
    description: 'Designed by Arne Vodder for Sibast. Tambour sliding doors revealing bird’s-eye maple interior drawers. Fully restored with Danish oil.',
    category: 'furniture',
    condition: 'used_good',
    startingPrice: 34000000,
    reservePrice: 38000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/danish-rosewood-credenza' }
    ]
  },
  {
    slug: 'anglo-indian-teak-bureau-1890',
    title: 'Antique Anglo-Indian Teakwood Roll-Top Secretary Bureau (1890)',
    description: 'Carved solid Burma teakwood roll-top desk with pigeonhole organizers and secret coin compartments. Origin: Bombay Presidency.',
    category: 'furniture',
    condition: 'used_good',
    startingPrice: 22000000,
    reservePrice: 26000000,
    minIncrement: 250000,
    targetStatus: 'active',
    endsInMinutes: 3600, // 2.5 days
    images: [
      { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/antique-teak-desk' }
    ]
  },
  {
    slug: 'chesterfield-leather-sofa-cigar',
    title: 'Chesterfield Hand-Tufted Cigar Brown Full-Grain Leather Sofa',
    description: '3-seater deep buttoned sofa in hand-burnished English aniline leather. Solid beech frame with brass studding along rolled arms.',
    category: 'furniture',
    condition: 'like_new',
    startingPrice: 38000000,
    reservePrice: 42000000,
    minIncrement: 500000,
    targetStatus: 'scheduled',
    startsInHours: 60,
    images: [
      { url: 'https://images.unsplash.com/photo-1580481077167-33635673667b?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/chesterfield-leather-sofa' }
    ]
  },
  {
    slug: 'sheesham-farmhouse-dining-table',
    title: 'Solid Reclaimed Sheesham Wood 8-Seater Farmhouse Dining Table',
    description: 'Thick single-slab live edge reclaimed Indian rosewood (Sheesham) with industrial matte black iron trestle base.',
    category: 'furniture',
    condition: 'new',
    startingPrice: 14500000,
    reservePrice: 17000000,
    minIncrement: 200000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80', photographer: 'Daniil Silantev', sourceUrl: 'https://unsplash.com/photos/sheesham-dining-table' }
    ]
  },
  {
    slug: 'art-deco-brass-floor-lamp',
    title: 'Art Deco 1930s Heavy Fluted Brass Architectural Floor Lamp',
    description: 'Solid spun brass standard lamp with stepped skyscraper base and original milk glass torchiere diffuser shade.',
    category: 'furniture',
    condition: 'used_good',
    startingPrice: 8500000,
    reservePrice: 10000000,
    minIncrement: 100000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=80', photographer: 'Jean-Philippe Delberghe', sourceUrl: 'https://unsplash.com/photos/art-deco-brass-lamp' }
    ]
  },
  {
    slug: 'planters-chair-cane-weave',
    title: 'Traditional Planter\'s Chair with Swing-Out Leg Rests and Cane Weave',
    description: 'Colonial Malabar style easy chair in aged seasoned teakwood. Handwoven cane seat and extending armrests for afternoon relaxation.',
    category: 'furniture',
    condition: 'used_good',
    startingPrice: 6500000,
    reservePrice: 7500000,
    minIncrement: 100000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=80', photographer: 'Jean-Philippe Delberghe', sourceUrl: 'https://unsplash.com/photos/colonial-planters-chair' }
    ]
  },

  // ==========================================
  // 8. BOOKS & FIRST EDITIONS (7 items)
  // ==========================================
  {
    slug: 'tolkien-hobbit-first-edition',
    title: 'J.R.R. Tolkien — The Hobbit First UK Edition (1937)',
    description: 'George Allen & Unwin first UK edition with original monochrome illustrations and maps drawn by Tolkien. Preserved in custom clamshell presentation box.',
    category: 'books',
    condition: 'used_good',
    startingPrice: 120000000,
    reservePrice: 140000000,
    minIncrement: 1000000,
    targetStatus: 'active',
    endsInMinutes: 300, // 5 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/vintage-hardcover-book' },
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80', photographer: 'Patrick Tomasso', sourceUrl: 'https://unsplash.com/photos/antique-books-pages' }
    ]
  },
  {
    slug: 'satyajit-ray-signed-feluda-manuscript',
    title: 'Satyajit Ray Signed Manuscript Page from \'Feluda in London\'',
    description: 'Original red-ink calligraphy manuscript sheet drafted by Satyajit Ray with marginal character sketches in black fountain pen.',
    category: 'books',
    condition: 'used_good',
    startingPrice: 35000000,
    reservePrice: 42000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80', photographer: 'Patrick Tomasso', sourceUrl: 'https://unsplash.com/photos/vintage-manuscript-paper' }
    ]
  },
  {
    slug: 'mahatma-gandhi-signed-experiments-truth',
    title: 'Mahatma Gandhi Signed First Edition \'My Experiments with Truth\'',
    description: 'Navajivan Trust 1927 First Edition Volume I inscribed \'M.K. Gandhi\' on front endpaper with Sabarmati Ashram seal.',
    category: 'books',
    condition: 'used_good',
    startingPrice: 95000000,
    reservePrice: 110000000,
    minIncrement: 1000000,
    targetStatus: 'active',
    endsInMinutes: 2800, // ~2 days
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/rare-signed-historical-book' }
    ]
  },
  {
    slug: 'folio-society-divine-comedy-letterpress',
    title: 'Folio Society Hand-Bound Letterpress Edition of The Divine Comedy',
    description: 'Limited to 1,000 copies. Three volumes bound in quarter goatskin with marbled paper sides. Salvador Dalí watercolor plates.',
    category: 'books',
    condition: 'like_new',
    startingPrice: 18000000,
    reservePrice: 21000000,
    minIncrement: 200000,
    targetStatus: 'scheduled',
    startsInHours: 72,
    images: [
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80', photographer: 'Patrick Tomasso', sourceUrl: 'https://unsplash.com/photos/leather-folio-bound-books' }
    ]
  },
  {
    slug: 'ruskin-bond-annotated-omnibus',
    title: 'Ruskin Bond Personally Annotated Dehra Dun First Edition Omnibus',
    description: 'Hardcover compilation containing handwritten margin notes and signature from the author’s Ivy Cottage residence in Landour.',
    category: 'books',
    condition: 'like_new',
    startingPrice: 4500000,
    reservePrice: 5500000,
    minIncrement: 50000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/hardcover-signed-novel' }
    ]
  },
  {
    slug: 'britannica-11th-edition-complete-1910',
    title: 'Encyclopaedia Britannica 11th Edition Complete 29-Volume Set (1910)',
    description: 'The famous scholarly Handy Volume Issue on India paper bound in flexible limp suede lambskin. Complete gilt top edges intact.',
    category: 'books',
    condition: 'used_good',
    startingPrice: 28000000,
    reservePrice: 32000000,
    minIncrement: 500000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80', photographer: 'Patrick Tomasso', sourceUrl: 'https://unsplash.com/photos/leatherbound-encyclopedia-volumes' }
    ]
  },
  {
    slug: 'salman-rushdie-midnights-children-proof',
    title: 'Salman Rushdie Midnight\'s Children Signed First Uncorrected Proof (1981)',
    description: 'Jonathan Cape yellow card covers marked \'Uncorrected Proof\'. Inscribed by Rushdie following Booker Prize victory.',
    category: 'books',
    condition: 'used_good',
    startingPrice: 32000000,
    reservePrice: 38000000,
    minIncrement: 500000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80', photographer: 'Annie Spratt', sourceUrl: 'https://unsplash.com/photos/literary-uncorrected-proof' }
    ]
  },

  // ==========================================
  // 9. MUSICAL INSTRUMENTS (6 items)
  // ==========================================
  {
    slug: 'fender-stratocaster-1962-sunburst',
    title: 'Vintage 1962 Fender Stratocaster 3-Color Sunburst',
    description: 'Pre-CBS golden era Stratocaster with slab rosewood fretboard, original black-bottom pickups, and mint green pickguard. Includes original brown Tolex case.',
    category: 'musical',
    condition: 'used_good',
    startingPrice: 185000000,
    reservePrice: 210000000,
    minIncrement: 1000000,
    targetStatus: 'active',
    endsInMinutes: 600, // 10 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=1200&q=80', photographer: 'David Stewart', sourceUrl: 'https://unsplash.com/photos/sunburst-electric-guitar' },
      { url: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=1200&q=80', photographer: 'Spencer Imbrock', sourceUrl: 'https://unsplash.com/photos/guitar-headstock-close-up' }
    ]
  },
  {
    slug: 'gibson-les-paul-59-murphy-lab',
    title: 'Gibson Custom 1959 Les Paul Standard Murphy Lab Heavy Aged',
    description: 'Historic select figured maple top with ultra-light mahogany back. Custombucker Alnico III unpotted pickups, Brazilian rosewood fretboard.',
    category: 'musical',
    condition: 'like_new',
    startingPrice: 98000000,
    reservePrice: 110000000,
    minIncrement: 1000000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=1200&q=80', photographer: 'David Stewart', sourceUrl: 'https://unsplash.com/photos/flame-maple-les-paul' }
    ]
  },
  {
    slug: 'pandit-ravi-shankar-kanailal-sitar',
    title: 'Pandit Ravi Shankar Style Concert Sitar by Kanailal & Brother (1976)',
    description: 'Handcrafted seasoned Tun wood sitar from legendary Calcutta luthier Kanailal. Double tumba, ornate floral pen-carving, deer horn bridges.',
    category: 'musical',
    condition: 'used_good',
    startingPrice: 45000000,
    reservePrice: 52000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 2400, // 40 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80', photographer: 'Wes Hicks', sourceUrl: 'https://unsplash.com/photos/classical-indian-sitar' }
    ]
  },
  {
    slug: 'yamaha-recording-custom-drums',
    title: 'Yamaha Recording Custom Birch Drum Shell Pack (Real Wood Finish)',
    description: 'Classic 100% North American birch shells with one-piece high-tension lugs and 30-degree bearing edges. 10/12/16/22 config.',
    category: 'musical',
    condition: 'like_new',
    startingPrice: 32000000,
    reservePrice: 36000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1200&q=80', photographer: 'Gabriel Barletta', sourceUrl: 'https://unsplash.com/photos/professional-drum-kit' }
    ]
  },
  {
    slug: 'selmer-mark-vi-tenor-saxophone-1965',
    title: 'Selmer Paris Mark VI 1965 Tenor Saxophone (Original Lacquer)',
    description: 'Serial number 128,xxx with matching neck. 85% original dark honey lacquer with American floral engraving. Superb intonation.',
    category: 'musical',
    condition: 'used_good',
    startingPrice: 110000000,
    reservePrice: 125000000,
    minIncrement: 1000000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1525994886773-080587e161c2?w=1200&q=80', photographer: 'Jens Thekkeveettil', sourceUrl: 'https://unsplash.com/photos/vintage-brass-saxophone' }
    ]
  },
  {
    slug: 'benares-concert-shehnai-flute-set',
    title: 'Master Benares Shehnai & Indian Bamboo Concert Bansuri Flute Set',
    description: 'Rosewood shehnai with silver pirueta bell tuned in D-sharp, paired with master flute maker Harsh Wardhan seasoned Assam bamboo flute.',
    category: 'musical',
    condition: 'new',
    startingPrice: 1800000,
    reservePrice: 2200000,
    minIncrement: 25000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80', photographer: 'Wes Hicks', sourceUrl: 'https://unsplash.com/photos/wooden-woodwind-instrument' }
    ]
  },

  // ==========================================
  // 10. HOME APPLIANCES (6 items)
  // ==========================================
  {
    slug: 'la-marzocco-linea-mini',
    title: 'La Marzocco Linea Mini Commercial Espresso Machine',
    description: 'Handmade in Florence. Dual boilers, integrated brew group, PID temperature controller, and connected IoT machine kit. Finished in matte stainless steel.',
    category: 'appliances',
    condition: 'like_new',
    startingPrice: 38000000,
    reservePrice: 42000000,
    minIncrement: 500000,
    targetStatus: 'active',
    endsInMinutes: 15, // Live demo: ending in 15 minutes!
    images: [
      { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=80', photographer: 'Tyler Nix', sourceUrl: 'https://unsplash.com/photos/espresso-coffee-machine' },
      { url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=1200&q=80', photographer: 'Nate Dumlao', sourceUrl: 'https://unsplash.com/photos/espresso-extraction' }
    ]
  },
  {
    slug: 'sub-zero-undercounter-wine-cellar',
    title: 'Sub-Zero 46-Bottle Undercounter Dual-Zone Wine Refrigerator',
    description: 'Model UW-24. Dual independent temperature zones with roller-glide cherry wood fronted wine racks and UV-resistant glass door.',
    category: 'appliances',
    condition: 'like_new',
    startingPrice: 29000000,
    reservePrice: 33000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=80', photographer: 'Tyler Nix', sourceUrl: 'https://unsplash.com/photos/wine-refrigerator-cellar' }
    ]
  },
  {
    slug: 'dyson-360-vis-nav-robot',
    title: 'Dyson 360 Vis Nav Intelligent Robot Vacuum Cleaner',
    description: '360-degree vision camera with simultaneous localization, 65AW suction power, and full-width brush bar for edge-to-edge cleaning.',
    category: 'appliances',
    condition: 'new',
    startingPrice: 8500000,
    reservePrice: 9500000,
    minIncrement: 100000,
    targetStatus: 'active',
    endsInMinutes: 1400, // ~23 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=80', photographer: 'Onur Binay', sourceUrl: 'https://unsplash.com/photos/smart-home-robot-vacuum' }
    ]
  },
  {
    slug: 'vitamix-a3500-ascent-blender',
    title: 'Vitamix A3500 Ascent Series Brushed Stainless Smart Blender',
    description: 'Commercial-grade 2.2 peak HP motor with touchscreen controls, 5 programmed presets, and wireless Self-Detect container technology.',
    category: 'appliances',
    condition: 'like_new',
    startingPrice: 6200000,
    reservePrice: 7200000,
    minIncrement: 100000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=80', photographer: 'Onur Binay', sourceUrl: 'https://unsplash.com/photos/commercial-kitchen-blender' }
    ]
  },
  {
    slug: 'smeg-50s-retro-fridge-pastel-green',
    title: 'Smeg 50s Retro Style Pastel Green Refrigerator (FAB28)',
    description: 'Iconic rounded curves with chrome handle and interior LED lighting. Energy rating A+++ with 270L capacity.',
    category: 'appliances',
    condition: 'like_new',
    startingPrice: 19000000,
    reservePrice: 22000000,
    minIncrement: 250000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=80', photographer: 'Onur Binay', sourceUrl: 'https://unsplash.com/photos/retro-green-refrigerator' }
    ]
  },
  {
    slug: 'kitchenaid-artisan-stand-mixer-pistachio',
    title: 'KitchenAid Artisan 4.8L Stand Mixer (Pistachio Cast Metal)',
    description: 'Tilt-head planetary action stand mixer with stainless bowl, wire whisk, dough hook, and flex edge beater. Sealed factory box.',
    category: 'appliances',
    condition: 'new',
    startingPrice: 4500000,
    reservePrice: 5200000,
    minIncrement: 50000,
    targetStatus: 'unsold',
    images: [
      { url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=80', photographer: 'Onur Binay', sourceUrl: 'https://unsplash.com/photos/kitchenaid-stand-mixer' }
    ]
  },

  // ==========================================
  // 11. SPORTS & MEMORABILIA (5 items)
  // ==========================================
  {
    slug: 'sachin-tendulkar-signed-bat',
    title: 'Sachin Tendulkar Signed 200th Test Match Commemorative Bat',
    description: 'MRF Genius bat personally signed by the Master Blaster at Wankhede Stadium. Numbered edition 10/200 with BCCI hologram and certificate of authenticity.',
    category: 'sports',
    condition: 'like_new',
    startingPrice: 15000000,
    reservePrice: 18000000,
    minIncrement: 250000,
    targetStatus: 'active',
    endsInMinutes: 90, // 1.5 hours
    images: [
      { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=80', photographer: 'Alessandro Bogliari', sourceUrl: 'https://unsplash.com/photos/cricket-equipment' },
      { url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80', photographer: 'Conor Luddy', sourceUrl: 'https://unsplash.com/photos/cricket-stadium-field' }
    ]
  },
  {
    slug: 'michael-jordan-1998-finals-jersey',
    title: 'Michael Jordan 1998 NBA Finals \'Last Dance\' Game-Worn Replica Signed Jersey',
    description: 'Chicago Bulls red road jersey #23 authenticated by Upper Deck Authenticated (UDA) with hologram and matching certificate.',
    category: 'sports',
    condition: 'like_new',
    startingPrice: 65000000,
    reservePrice: 75000000,
    minIncrement: 1000000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80', photographer: 'Markus Spiske', sourceUrl: 'https://unsplash.com/photos/basketball-jersey-court' }
    ]
  },
  {
    slug: 'pinarello-dogma-f12-tour-de-france',
    title: 'Pinarello Dogma F12 Tour de France Limited Frameset 54cm',
    description: 'Torayca T1100 1K Dream Carbon with nanoalloy technology in special yellow jersey livery. Complete with MOST Talon Ultra integrated handlebar.',
    category: 'sports',
    condition: 'new',
    startingPrice: 72000000,
    reservePrice: 80000000,
    minIncrement: 1000000,
    targetStatus: 'active',
    endsInMinutes: 3200, // ~2.2 days
    images: [
      { url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80', photographer: 'Coen van de Broek', sourceUrl: 'https://unsplash.com/photos/high-end-racing-bicycle' }
    ]
  },
  {
    slug: 'roger-federer-signed-pro-staff',
    title: 'Roger Federer Signed Wilson Pro Staff 97 RF Autograph Racket',
    description: 'Custom matte black 340g tour spec racket personally inscribed and dated by Roger Federer at Basel. Framed in UV display shadowbox.',
    category: 'sports',
    condition: 'like_new',
    startingPrice: 28000000,
    reservePrice: 32000000,
    minIncrement: 500000,
    targetStatus: 'payment_pending',
    images: [
      { url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80', photographer: 'Chuttersnap', sourceUrl: 'https://unsplash.com/photos/tennis-racket-court' }
    ]
  },
  {
    slug: 'lionel-messi-golden-ball-2022',
    title: 'Lionel Messi Signed Official FIFA 2022 World Cup Golden Ball Replica',
    description: 'Commemorative Qatar 2022 World Cup Golden Ball signed in gold marker by Lionel Messi with Beckett Authentication services seal.',
    category: 'sports',
    condition: 'like_new',
    startingPrice: 42000000,
    reservePrice: 48000000,
    minIncrement: 500000,
    targetStatus: 'completed',
    images: [
      { url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80', photographer: 'Fauzan Saari', sourceUrl: 'https://unsplash.com/photos/soccer-world-cup-trophy' }
    ]
  }
];

// Write out to scripts/seed-manifest.json
const outputPath = path.resolve(process.cwd(), 'scripts/seed-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
console.log(`Successfully generated ${items.length} items in ${outputPath}`);
