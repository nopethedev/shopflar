// Section catalog — the single source of truth for every block the theme
// editor can place on a page. Pure data (no React) so the storefront renderer,
// the editor palette, the MCP server and the API validation all agree.

export type SectionMeta = {
  type: string
  label: string
  group: string
  description: string
  /** lucide icon name, resolved to a component by the editor */
  icon: string
}

export const GROUPS = ['Essentials', 'Products', 'Media', 'Marketing', 'Social proof', 'Support', 'Advanced'] as const

export const SECTION_CATALOG: SectionMeta[] = [
  { type: 'hero', label: 'Hero Banner', group: 'Essentials', icon: 'Layout', description: 'Large image with title, subtitle, and CTA button' },
  { type: 'announcement-bar', label: 'Announcement Bar', group: 'Essentials', icon: 'Megaphone', description: 'Thin bar at the top with a message' },
  { type: 'text', label: 'Text Block', group: 'Essentials', icon: 'Type', description: 'Heading + paragraph of custom text' },
  { type: 'rich-text', label: 'Rich Text', group: 'Essentials', icon: 'AlignLeft', description: 'Long-form text content with HTML formatting' },
  { type: 'features', label: 'Feature Columns', group: 'Essentials', icon: 'ShieldCheck', description: 'Icon + title + text columns — perks, trust badges, USPs' },
  { type: 'spacer', label: 'Spacer / Divider', group: 'Essentials', icon: 'Minus', description: 'Blank space or a thin dividing line between sections' },

  { type: 'product-grid', label: 'Product Grid', group: 'Products', icon: 'Grid3x3', description: 'Show featured, new, or filtered products' },
  { type: 'collection-list', label: 'Collection List', group: 'Products', icon: 'LayoutGrid', description: 'Tiles linking to your categories' },
  { type: 'featured-product', label: 'Featured Product', group: 'Products', icon: 'ShoppingBag', description: 'Spotlight a single product with image, price and buy button' },
  { type: 'discounts', label: 'Discount Codes', group: 'Products', icon: 'Gift', description: 'Show active discount codes customers can copy' },

  { type: 'image', label: 'Image', group: 'Media', icon: 'Image', description: 'Single image with optional link' },
  { type: 'image-text', label: 'Image + Text', group: 'Media', icon: 'Columns', description: 'Side-by-side image and text with CTA' },
  { type: 'promo-tiles', label: 'Promo Tiles', group: 'Media', icon: 'PanelsTopLeft', description: '2–4 image tiles with a headline and link — sales, collections' },
  { type: 'gallery', label: 'Image Gallery', group: 'Media', icon: 'Images', description: 'Responsive grid of photos — lookbooks, UGC, behind the scenes' },
  { type: 'slideshow', label: 'Slideshow', group: 'Media', icon: 'Play', description: 'Auto-rotating slides with captions and CTAs' },
  { type: 'video', label: 'Video', group: 'Media', icon: 'Video', description: 'YouTube/Vimeo embed or self-hosted video' },

  { type: 'countdown', label: 'Countdown Timer', group: 'Marketing', icon: 'Timer', description: 'Urgency timer for sales and launches' },
  { type: 'cta', label: 'CTA Banner', group: 'Marketing', icon: 'Megaphone', description: 'Bold colored banner with a call to action' },
  { type: 'marquee', label: 'Marquee', group: 'Marketing', icon: 'Scroll', description: 'Scrolling text banner for announcements' },
  { type: 'newsletter', label: 'Newsletter Signup', group: 'Marketing', icon: 'Mail', description: 'Email subscribe form with prompt text' },
  { type: 'social-links', label: 'Social Links', group: 'Marketing', icon: 'Share2', description: 'Icon row linking to your social profiles' },

  { type: 'testimonials', label: 'Testimonials', group: 'Social proof', icon: 'MessageSquare', description: 'Customer reviews with star ratings' },
  { type: 'quote', label: 'Pull Quote', group: 'Social proof', icon: 'Quote', description: 'One large quote — press mention or founder statement' },
  { type: 'stats', label: 'Stats / Numbers', group: 'Social proof', icon: 'BarChart3', description: 'Big numbers row — customers, rating, shipping' },
  { type: 'logo-cloud', label: 'Logo Cloud', group: 'Social proof', icon: 'Building2', description: 'Partner or press logos in a row' },

  { type: 'faq', label: 'FAQ', group: 'Support', icon: 'HelpCircle', description: 'Collapsible questions and answers' },
  { type: 'contact', label: 'Contact Form', group: 'Support', icon: 'MessageCircle', description: 'Contact form with your store email' },

  { type: 'custom-html', label: 'Custom HTML', group: 'Advanced', icon: 'Code', description: 'Raw HTML code block' }
]

export const SECTION_TYPES = SECTION_CATALOG.map(s => s.type)

export const SECTION_LABELS: Record<string, string> = Object.fromEntries(SECTION_CATALOG.map(s => [s.type, s.label]))

export function isSectionType(type: string) {
  return SECTION_TYPES.includes(type)
}

export const FEATURE_ICONS = ['truck', 'shield', 'refresh', 'heart', 'star', 'sparkles', 'gift', 'clock', 'leaf', 'award', 'headphones', 'credit-card'] as const
export const SOCIAL_PLATFORMS = ['instagram', 'x', 'facebook', 'youtube', 'tiktok', 'linkedin', 'github', 'twitch', 'discord', 'email', 'website'] as const

// ============================================================
// Default configs for every section type
// ============================================================
export function defaultConfig(type: string): Record<string, any> {
  const defaults: Record<string, any> = {
    hero: { title: 'New Season Drop', subtitle: 'Add your subtitle here', buttonText: 'Shop Now', buttonUrl: '/products', image: '', overlay: 'dark', overlayOpacity: 40, height: '60vh', heightMobile: '48vh', titleSize: 'large', contentPosition: 'middle-left' },
    'announcement-bar': { text: 'Free shipping on all orders over $50!', bg: '#1a1a1a', color: '#ffffff' },
    'product-grid': { title: 'Products', source: 'featured', limit: 8, categoryId: '', columnsDesktop: 4, columnsMobile: 2, buttonText: '', buttonUrl: '/products' },
    'image-text': { title: 'Section Title', body: '<p>Add your text here.</p>', image: '', buttonText: 'Learn More', buttonUrl: '/products', layout: 'image-left' },
    marquee: { text: '🔥 Sale now on • Free shipping over $75 • New arrivals weekly 🔥', speed: 'normal', bg: '#1a1a1a', color: '#ffffff' },
    text: { title: 'Section Title', body: 'Add your text here. HTML is supported.', align: 'center' },
    image: { url: '', alt: '', link: '' },
    'rich-text': { title: '', content: '<p>Your rich text content here. HTML supported.</p>' },
    testimonials: { title: 'What Our Customers Say', items: [{ author: 'Jane D.', role: 'Verified Buyer', rating: 5, text: 'Amazing quality and fast shipping!' }, { author: 'John S.', role: 'Verified Buyer', rating: 5, text: "Best purchase I've made this year." }] },
    faq: { title: 'Frequently Asked Questions', items: [{ question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days.' }, { question: 'What is your return policy?', answer: 'We accept returns within 30 days of delivery.' }] },
    newsletter: { title: 'Get 10% off your first order', subtitle: 'Subscribe to our newsletter' },
    discounts: { title: 'Active Discount Codes' },
    video: { title: '', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    slideshow: { autoplay: true, interval: 5, overlay: 'dark', overlayOpacity: 40, height: '70vh', heightMobile: '50vh', contentPosition: 'middle-left', slides: [
      { image: '', eyebrow: 'New in', title: 'First slide headline', subtitle: 'Describe the collection in one line.', buttonText: 'Shop now', buttonUrl: '/products' },
      { image: '', eyebrow: 'Bestsellers', title: 'Second slide headline', subtitle: 'Your bestsellers, back in stock.', buttonText: 'Browse', buttonUrl: '/products' }
    ] },
    countdown: { eyebrow: 'Limited time', title: 'Sale ends soon', endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), buttonText: 'Shop the sale', buttonUrl: '/products', bg: '#1a1a1a', color: '#ffffff' },
    cta: { eyebrow: 'Limited time', title: 'Get 20% off everything', subtitle: 'Use code HELLO20 at checkout — this week only.', buttonText: 'Shop now', buttonUrl: '/products', bg: '#1a1a1a', color: '#ffffff' },
    stats: { items: [{ value: '10k+', label: 'Happy customers' }, { value: '4.9★', label: 'Average rating' }, { value: '48h', label: 'Fast shipping' }, { value: '30d', label: 'Easy returns' }] },
    'logo-cloud': { title: 'As seen in', items: [{ name: 'VOGUE', link: '' }, { name: 'GQ', link: '' }, { name: 'HYPEBEAST', link: '' }, { name: 'ESQUIRE', link: '' }] },
    contact: { title: 'Get in touch', subtitle: 'Questions about an order, sizing, or returns? Send us a message.', email: '' },
    'custom-html': { html: '<div>\n  <p>Your custom HTML here.</p>\n</div>' },
    // ---- new blocks ----
    features: { title: '', columns: 4, align: 'center', items: [
      { icon: 'truck', title: 'Free shipping', text: 'On all orders over $75' },
      { icon: 'refresh', title: '30-day returns', text: 'Changed your mind? No problem.' },
      { icon: 'shield', title: 'Secure checkout', text: 'Encrypted and protected' },
      { icon: 'sparkles', title: 'Quality first', text: 'Made to last' }
    ] },
    spacer: { height: 48, divider: false },
    'collection-list': { title: 'Shop by category', limit: 6, columnsDesktop: 3, columnsMobile: 2, aspect: 'portrait', showCount: false },
    'featured-product': { title: '', productSlug: '', layout: 'image-left', buttonText: 'View product', showDescription: true },
    'promo-tiles': { title: '', columns: 2, height: 'medium', tiles: [
      { image: '', title: 'Summer sale', subtitle: 'Up to 40% off', buttonText: 'Shop now', buttonUrl: '/products?sale=true' },
      { image: '', title: 'New arrivals', subtitle: 'Fresh this week', buttonText: 'Discover', buttonUrl: '/products?new=true' }
    ] },
    gallery: { title: '', columnsDesktop: 4, columnsMobile: 2, gap: 'md', aspect: 'square', rounded: true, images: [
      { image: '', alt: '', link: '' }, { image: '', alt: '', link: '' }, { image: '', alt: '', link: '' }, { image: '', alt: '', link: '' }
    ] },
    quote: { text: 'The best thing we have ever bought for our home. Beautiful, durable, and arrived in two days.', author: 'Alex Morgan', role: 'Verified customer', image: '' },
    'social-links': { title: 'Follow along', align: 'center', items: [
      { platform: 'instagram', url: 'https://instagram.com/' },
      { platform: 'x', url: 'https://x.com/' },
      { platform: 'youtube', url: 'https://youtube.com/' }
    ] }
  }
  return JSON.parse(JSON.stringify(defaults[type] || {}))
}

// ============================================================
// Starter templates — one click fills a page
// ============================================================
export const TEMPLATES = [
  { id: 'starter', name: 'Starter Store', desc: 'Hero → products → story → reviews → newsletter', sections: ['hero', 'features', 'product-grid', 'image-text', 'testimonials', 'newsletter'] },
  { id: 'launch', name: 'Product Launch', desc: 'Urgency-focused launch page', sections: ['announcement-bar', 'countdown', 'slideshow', 'product-grid', 'cta', 'newsletter'] },
  { id: 'editorial', name: 'Editorial Brand', desc: 'Magazine-style brand page', sections: ['marquee', 'hero', 'rich-text', 'image-text', 'stats', 'faq', 'contact'] },
  { id: 'catalog', name: 'Catalog Showcase', desc: 'Browse by category, promos and best sellers', sections: ['hero', 'collection-list', 'promo-tiles', 'product-grid', 'features', 'social-links'] },
  { id: 'spotlight', name: 'Single-Product Spotlight', desc: 'One hero product, proof, FAQ', sections: ['announcement-bar', 'featured-product', 'features', 'quote', 'testimonials', 'faq', 'cta'] },
  { id: 'lookbook', name: 'Lookbook', desc: 'Image-led story with a gallery', sections: ['hero', 'gallery', 'quote', 'image-text', 'logo-cloud', 'newsletter'] }
]
