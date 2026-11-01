// Carrier tracking links — turns carrier + tracking number into a clickable
// tracking URL. Covers the carriers Printify/commonfulfilment providers use,
// plus the big national posts. Unknown carriers fall back to a Google search.

const CARRIER_URLS = [
  { match: ['usps'], name: 'USPS', url: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  { match: ['ups'], name: 'UPS', url: n => `https://www.ups.com/track?tracknum=${n}` },
  { match: ['fedex', 'federal express'], name: 'FedEx', url: n => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { match: ['dhl express', 'dhl-express', 'dhlexpress'], name: 'DHL Express', url: n => `https://www.dhl.com/track?tracking-id=${n}` },
  { match: ['dhl ecommerce', 'dhl-ecommerce'], name: 'DHL eCommerce', url: n => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}&submit=1` },
  { match: ['dhl'], name: 'DHL', url: n => `https://www.dhl.com/track?tracking-id=${n}` },
  { match: ['royal mail', 'royalmail'], name: 'Royal Mail', url: n => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  { match: ['evri', 'hermes'], name: 'Evri', url: n => `https://www.evri.com/track/${n}` },
  { match: ['canada post', 'canadapost'], name: 'Canada Post', url: n => `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${n}` },
  { match: ['australia post', 'auspost'], name: 'Australia Post', url: n => `https://auspost.com.au/mypost/track/#/details/${n}` },
  { match: ['deutsche post'], name: 'Deutsche Post', url: n => `https://www.deutschepost.de/sendung/simpleTracking.html?form.sendungsnummer=${n}` },
  { match: ['colissimo', 'la poste'], name: 'Colissimo', url: n => `https://www.colissimo.fr/fr/pages/suivre-colis?colispartNumber=${n}` },
  { match: ['chronopost'], name: 'Chronopost', url: n => `https://www.chronopost.fr/tracking-inline/clic2Track?deliveryNumber=${n}` },
  { match: ['postnl'], name: 'PostNL', url: n => `https://www.postnl.nl/track-en-trace/?b=${n}` },
  { match: ['gls'], name: 'GLS', url: n => `https://gls-group.com/en/parcel-tracking/?match=${n}` },
  { match: ['dpd'], name: 'DPD', url: n => `https://www.dpd.com/tracking/${n}` },
  { match: ['correos'], name: 'Correos', url: n => `https://www.correos.es/es/en/herramientas/localizador/consulta?codigo=${n}` },
  { match: ['poste italiane', 'posteitaliane'], name: 'Poste Italiane', url: n => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${n}` },
  { match: ['postnord'], name: 'PostNord', url: n => `https://www.postnord.com/en/track-and-trace/?shipmentNumber=${n}` },
  { match: ['bpost', 'belgian post'], name: 'bpost', url: n => `https://www.bpost.be/site/en/residential/parcel-tracking/?trackNumber=${n}` },
  { match: ['postnord', 'sweden post'], name: 'PostNord', url: n => `https://www.postnord.com/en/track-and-trace/?shipmentNumber=${n}` },
  { match: ['purolator'], name: 'Purolator', url: n => `https://www.purolator.com/en/shipping/tracker?pin=${n}` },
  { match: ['japan post', 'japanpost'], name: 'Japan Post', url: n => `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${n}` },
  { match: ['sf express', 'sfexpress'], name: 'SF Express', url: n => `https://www.sf-express.com/global/en/dynamic-function/waybill/#search/bill-number/${n}` },
  { match: ['aramex'], name: 'Aramex', url: n => `https://www.aramex.com/track/results?ShipmentNumber=${n}` },
  { match: ['china post', 'chinapost'], name: 'China Post', url: n => `https://parcelsapp.com/en/tracking/${n}` },
  { match: ['yanwen'], name: 'Yanwen', url: n => `https://parcelsapp.com/en/tracking/${n}` },
  { match: ['4px'], name: '4PX', url: n => `https://parcelsapp.com/en/tracking/${n}` },
  { match: ['yun express', 'yunexpress'], name: 'Yun Express', url: n => `https://parcelsapp.com/en/tracking/${n}` },
  { match: ['cainiao'], name: 'Cainiao', url: n => `https://global.cainiao.com/global/detail?mailNos=${n}` },
  { match: ['india post', 'indiapost'], name: 'India Post', url: n => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx` },
  { match: ['new zealand post', 'nz post'], name: 'NZ Post', url: n => `https://www.nzpost.co.nz/tools/tracking?tn=${n}` },
  { match: ['singpost', 'singapore post'], name: 'SingPost', url: n => `https://www.singpost.com/track-articles` },
  { match: ['israel post'], name: 'Israel Post', url: n => `https://www.israelpost.co.il/itemtrace.nsf/mainread?openform&itemcode=${n}` },
  { match: ['bluedart', 'blue dart'], name: 'Blue Dart', url: n => `https://www.bluedart.com/track${n}` },
  { match: ['parcelforce'], name: 'Parcelforce', url: n => `https://www.parcelforce.com/track-trace?trackNumber=${n}` },
  { match: ['yodel'], name: 'Yodel', url: n => `https://www.yodel.co.uk/track/${n}` },
  { match: ['whistl'], name: 'Whistl', url: n => `https://whistl.co.uk/track?number=${n}` },
  { match: ['seur'], name: 'SEUR', url: n => `https://www.seur.com/es-se/segurguio?trackingCode=${n}` },
  { match: ['tnt'], name: 'TNT', url: n => `https://www.tnt.com/express/en_gc/site/shipping-tools/track.html?searchType=con&cons=${n}` },
  { match: ['starshipit'], name: 'StarShipIT', url: n => `https://tracking.starshipit.com/?n=${n}` }
]

export function carrierNames() {
  const seen = new Set()
  const names = []
  for (const c of CARRIER_URLS) {
    if (!seen.has(c.name)) { seen.add(c.name); names.push(c.name) }
  }
  return names
}

// Normalize a carrier string ("DHL Express (US)", "dhl_ecommerce") to a match key
export function resolveCarrierUrl(carrier, trackingNumber) {
  const n = String(trackingNumber || '').trim()
  if (!n) return null
  const c = String(carrier || '').toLowerCase().replace(/[_\s]+/g, ' ').trim()
  if (c) {
    for (const entry of CARRIER_URLS) {
      if (entry.match.some(m => c === m || c.includes(m))) return entry.url(n)
    }
  }
  // Carrier unknown — number-format heuristics for the big three
  if (/^1Z[0-9A-Z]{6,}$/i.test(n)) return CARRIER_URLS.find(e => e.name === 'UPS').url(n)
  if (/^\d{20,22}$/.test(n)) return CARRIER_URLS.find(e => e.name === 'FedEx').url(n)
  if (/^94\d{18,20}$/.test(n)) return CARRIER_URLS.find(e => e.name === 'USPS').url(n)
  // Fallback: Google search for "<carrier> <number>"
  return `https://www.google.com/search?q=${encodeURIComponent(`track ${carrier || 'package'} ${n}`)}`
}
