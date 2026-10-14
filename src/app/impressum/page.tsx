import { db } from '@/lib/db'
import { getStoreSettings, getBusinessDetails } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function ImpressumPage() {
  const [settings, categories, business] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    getBusinessDetails()
  ])

  const storeName = business.businessName || settings.storeName

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Impressum
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Legal notice required under §5 DDG (Digitale-Dienste-Gesetz) / German Telemedia Act.
        </p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          {/* Service provider */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Angaben gemäß § 5 DDG</h2>
            <p className="text-foreground">
              {business.legalName || storeName}
              {business.legalForm && `, ${business.legalForm}`}
            </p>
            {business.addressLine1 && <p>{business.addressLine1}</p>}
            {business.addressLine2 && <p>{business.addressLine2}</p>}
            {(business.city || business.postalCode) && (
              <p>{business.postalCode} {business.city}</p>
            )}
            {business.country && <p>{business.country}</p>}
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Kontakt / Contact</h2>
            {business.phone && <p>Telefon: {business.phone}</p>}
            {business.email && <p>E-Mail: <a href={`mailto:${business.email}`} className="text-foreground hover:underline">{business.email}</a></p>}
            {business.website && <p>Website: <a href={business.website} className="text-foreground hover:underline">{business.website}</a></p>}
          </section>

          {/* VAT */}
          {business.vatNumber && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Umsatzsteuer-ID</h2>
              <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:</p>
              <p className="text-foreground font-mono">{business.vatNumber}</p>
            </section>
          )}

          {/* Registration */}
          {business.registrationNumber && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Registereintrag / Commercial Register</h2>
              <p>Registergericht: {business.state || business.country || '—'}</p>
              <p>Registernummer: {business.registrationNumber}</p>
            </section>
          )}

          {/* Representatives */}
          {business.representatives && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Vertreten durch / Represented by</h2>
              <p className="whitespace-pre-line">{business.representatives}</p>
            </section>
          )}

          {/* Share capital (if applicable) */}
          {business.shareCapital && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Haftkapital / Share Capital</h2>
              <p>{business.shareCapital}</p>
            </section>
          )}

          {/* Supervising authority */}
          {business.supervisingAuthority && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Aufsichtsbehörde / Supervisory Authority</h2>
              <p>{business.supervisingAuthority}</p>
            </section>
          )}

          {/* Responsible Person (GPSR) */}
          {business.responsiblePersonName && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Verantwortliche Person für Produktsicherheit (GPSR)</h2>
              <p className="text-foreground font-medium">{business.responsiblePersonName}</p>
              {business.responsiblePersonAddress && (
                <p className="whitespace-pre-line">{business.responsiblePersonAddress}</p>
              )}
              {business.responsiblePersonEmail && (
                <p>E-Mail: <a href={`mailto:${business.responsiblePersonEmail}`} className="text-foreground hover:underline">{business.responsiblePersonEmail}</a></p>
              )}
              {business.responsiblePersonPhone && (
                <p>Telefon: {business.responsiblePersonPhone}</p>
              )}
              <p className="text-xs mt-2 italic">
                Gemäß EU-Verordnung über die allgemeine Produktsicherheitsverordnung (GPSR) vom 13. Dezember 2024.
              </p>
            </section>
          )}

          {/* Packaging (LUCID) */}
          {business.lucidNumber && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">Verpackungsregister / Packaging Registration (LUCID)</h2>
              <p>Registriernummer: <span className="font-mono">{business.lucidNumber}</span></p>
              <p className="text-xs mt-1">
                Registriert gemäß § 9 VerpackG beim Stiftung Zentrale Stelle Verpackungsregister (LUCID).
              </p>
            </section>
          )}

          {/* OSS/IOSS */}
          {business.ossNumber && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">OSS-Nummer (One Stop Shop)</h2>
              <p className="font-mono">{business.ossNumber}</p>
            </section>
          )}
          {business.iosNumber && (
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-2">IOSS-Nummer (Import One Stop Shop)</h2>
              <p className="font-mono">{business.iosNumber}</p>
            </section>
          )}

          {/* EU Dispute Resolution */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">EU-Streitschlichtung / EU Dispute Resolution</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p className="mt-2">
              Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            <p className="mt-2 text-sm">
              The European Commission provides a platform for online dispute resolution (ODR):{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
              . We are not obliged or willing to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>

          {/* Consumer rights */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Verbraucherstreitbeilegung / Consumer Dispute Resolution</h2>
            <p>
              Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            <p className="mt-2 text-sm">
              We are neither obliged nor willing to participate in dispute settlement proceedings before a consumer arbitration body.
            </p>
          </section>

          {/* Liability for content */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Haftung für Inhalte / Liability for Content</h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
              Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen
              zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p className="mt-2 text-sm">
              As a service provider, we are responsible for our own content on these pages in accordance with § 7(1) DDG. However,
              pursuant to §§ 8 to 10 DDG, we are not obligated to monitor transmitted or stored third-party information.
            </p>
          </section>

          {/* Liability for links */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Haftung für Links / Liability for Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
              fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
              der Seiten verantwortlich.
            </p>
          </section>

          {/* Copyright */}
          <section>
            <h2 className="text-foreground text-xl font-semibold mb-2">Urheberrecht / Copyright</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
              Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
              jeweiligen Autors bzw. Erstellers.
            </p>
          </section>

          {/* Empty state warning */}
          {!business.businessName && !business.addressLine1 && !business.vatNumber && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <strong>⚠️ No business details configured.</strong> Please fill in your business information in Admin → Business Details to comply with
              German law (DDG §5 / Impressum requirement). Non-compliance can result in fines up to €50,000.
            </div>
          )}
        </div>
      </div>
    </StorefrontLayout>
  )
}
