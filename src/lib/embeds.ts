// Builds the list of third-party embeds (analytics, pixels, chat, custom
// code) for the storefront. IDs are validated against strict patterns before
// they are ever placed into an inline script, so a typo (or a hostile value)
// in the admin cannot break out of the snippet.
import { db } from '@/lib/db'
import { getAllAppStates, isAppReady } from '@/lib/apps'
import { APP_BY_SLUG } from '@/lib/app-catalog'

export type EmbedScript = { src?: string; inline?: string; attrs?: Record<string, string> }
export type Embed = {
  id: string
  /** essential embeds always load; analytics/marketing wait for cookie consent */
  category: 'essential' | 'analytics' | 'marketing'
  scripts: EmbedScript[]
  /** raw HTML (custom code only) */
  html?: { head?: string; body?: string }
  /** floating WhatsApp button */
  whatsapp?: { url: string; position: 'left' | 'right' }
}

const ID = {
  ga4: /^G-[A-Z0-9]{4,20}$/i,
  gtm: /^GTM-[A-Z0-9]{3,12}$/i,
  meta: /^\d{5,20}$/,
  tiktok: /^[A-Z0-9]{8,30}$/i,
  domain: /^[a-z0-9.-]{3,100}$/i,
  slug: /^[A-Za-z0-9_-]{4,64}$/,
  phone: /^\d{6,16}$/
}

const httpsUrl = (v: string) => {
  try { const u = new URL(v); return u.protocol === 'https:' ? u.toString() : null } catch { return null }
}

export async function getStorefrontEmbeds(): Promise<Embed[]> {
  const embeds: Embed[] = []

  // Existing Admin → Tracking settings (GA4 / Meta Pixel / GTM)
  try {
    const rows = await db.storeSetting.findMany({ where: { key: { startsWith: 'tracking_' } } })
    const t = Object.fromEntries(rows.map(r => [r.key, (r.value || '').trim()]))
    if (t.tracking_ga4_id && ID.ga4.test(t.tracking_ga4_id)) {
      const g = t.tracking_ga4_id
      embeds.push({ id: 'ga4', category: 'analytics', scripts: [
        { src: `https://www.googletagmanager.com/gtag/js?id=${g}`, attrs: { async: '' } },
        { inline: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${g}',{anonymize_ip:true});` }
      ] })
    }
    if (t.tracking_gtm_id && ID.gtm.test(t.tracking_gtm_id)) {
      const g = t.tracking_gtm_id
      embeds.push({ id: 'gtm', category: 'analytics', scripts: [{
        inline: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${g}');`
      }] })
    }
    if (t.tracking_meta_pixel_id && ID.meta.test(t.tracking_meta_pixel_id)) {
      const p = t.tracking_meta_pixel_id
      embeds.push({ id: 'meta-pixel', category: 'marketing', scripts: [{
        inline: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${p}');fbq('track','PageView');`
      }] })
    }
  } catch { /* settings table unavailable */ }

  // App Library apps
  const states = await getAllAppStates()
  const ready = (slug: string) => {
    const s = states.get(slug)
    return s && isAppReady(APP_BY_SLUG[slug], s) ? s.config : null
  }

  let c: Record<string, any> | null
  if ((c = ready('tiktok-pixel')) && ID.tiktok.test(c.pixelId)) {
    embeds.push({ id: 'tiktok-pixel', category: 'marketing', scripts: [{
      inline: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${c.pixelId}');ttq.page()}(window,document,'ttq');`
    }] })
  }
  if ((c = ready('plausible')) && ID.domain.test(c.domain)) {
    const src = (c.scriptUrl && httpsUrl(c.scriptUrl)) || 'https://plausible.io/js/script.js'
    embeds.push({ id: 'plausible', category: 'essential', scripts: [{ src, attrs: { defer: '', 'data-domain': c.domain } }] })
  }
  if ((c = ready('umami')) && ID.slug.test(c.websiteId) && httpsUrl(c.scriptUrl)) {
    embeds.push({ id: 'umami', category: 'essential', scripts: [{ src: httpsUrl(c.scriptUrl)!, attrs: { defer: '', 'data-website-id': c.websiteId } }] })
  }
  if ((c = ready('crisp-chat')) && ID.slug.test(c.websiteId)) {
    embeds.push({ id: 'crisp', category: 'essential', scripts: [{
      inline: `window.$crisp=[];window.CRISP_WEBSITE_ID="${c.websiteId}";(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s)})();`
    }] })
  }
  if ((c = ready('tawk-to')) && ID.slug.test(c.propertyId) && ID.slug.test(c.widgetId)) {
    embeds.push({ id: 'tawk', category: 'essential', scripts: [{
      src: `https://embed.tawk.to/${c.propertyId}/${c.widgetId}`, attrs: { async: '', crossorigin: '*' }
    }] })
  }
  if ((c = ready('whatsapp-chat')) && ID.phone.test(String(c.phone).replace(/\D/g, ''))) {
    const phone = String(c.phone).replace(/\D/g, '')
    const text = c.message ? `?text=${encodeURIComponent(String(c.message).slice(0, 300))}` : ''
    embeds.push({ id: 'whatsapp', category: 'essential', scripts: [], whatsapp: { url: `https://wa.me/${phone}${text}`, position: c.position === 'left' ? 'left' : 'right' } })
  }
  if ((c = ready('custom-code')) && (c.head || c.body)) {
    embeds.push({ id: 'custom-code', category: 'essential', scripts: [], html: { head: c.head || '', body: c.body || '' } })
  }
  return embeds
}
