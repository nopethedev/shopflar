'use client'
import { useState, useMemo } from 'react'
import { useCart } from '@/lib/cart-store'
import { useWishlist } from '@/lib/wishlist-store'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Minus, Plus, ShoppingBag, Heart, Truck, RotateCcw, ShieldCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReviewForm } from './review-form'

export function ProductDetail({ product, settings }) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [adding, setAdding] = useState(false)
  const addItem = useCart(s => s.addItem)
  const setOpen = useCart(s => s.setOpen)
  const toggleWish = useWishlist(s => s.toggle)
  const isFav = useWishlist(s => s.has(product.id))
  const router = useRouter()

  const onSale = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPct = onSale ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0

  // Variant options extraction
  const variantOptions = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return {}
    const opts = {}
    product.variants.forEach(v => {
      let parsed = {}
      try { parsed = JSON.parse(v.options) } catch {}
      Object.entries(parsed).forEach(([k, val]) => {
        if (!opts[k]) opts[k] = new Set()
        opts[k].add(val)
      })
    })
    const out = {}
    Object.entries(opts).forEach(([k, set]) => {
      out[k] = [...set]
    })
    return out
  }, [product])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null
    if (Object.keys(variantOptions).length === 0) return product.variants[0]
    return product.variants.find(v => {
      let parsed = {}
      try { parsed = JSON.parse(v.options) } catch {}
      return Object.entries(variantOptions).every(([k, values]) => {
        // If user hasn't picked this option, just check first available
        const selected = selectedOptions[k]
        if (!selected) return values.includes(parsed[k])
        return parsed[k] === selected
      })
    })
  }, [product, selectedOptions, variantOptions])

  const variantStock = selectedVariant?.inventoryQty ?? product.inventoryQty
  const isOutOfStock = product.isOutOfStock || (selectedVariant && variantStock <= 0)
  const displayPrice = selectedVariant?.price != null ? selectedVariant.price : product.price

  const handleAddToCart = async (buyNow = false) => {
    // Check that all required options are selected
    const requiredOpts = Object.keys(variantOptions)
    const missing = requiredOpts.filter(k => !selectedOptions[k])
    if (missing.length > 0) {
      toast.error('Please select', `Choose: ${missing.join(', ')}`)
      return
    }
    setAdding(true)
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      name: product.name,
      price: displayPrice,
      image: product.images?.[0]?.url,
      sku: selectedVariant?.sku || product.sku,
      variantName: selectedVariant?.name,
      slug: product.slug
    })
    setTimeout(() => {
      setAdding(false)
      if (buyNow) {
        router.push('/checkout')
      } else {
        setOpen(true)
        toast.success('Added to cart', product.name)
      }
    }, 200)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Image gallery */}
      <div className="lg:sticky lg:top-24 self-start">
        <div className="grid gap-3">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {product.images?.[selectedImage]?.url ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].altText || product.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`aspect-square rounded-md overflow-hidden bg-muted border-2 transition-colors ${
                    selectedImage === i ? 'border-foreground' : 'border-transparent hover:border-border'
                  }`}
                >
                  <img src={img.url} alt={img.altText || product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {product.categories?.map(pc => (
            <Link
              key={pc.category.id}
              href={`/categories/${pc.category.slug}`}
              className="text-xs uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground"
            >
              {pc.category.name}
            </Link>
          ))}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          {product.name}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl font-semibold">${displayPrice.toFixed(2)}</span>
          {onSale && (
            <>
              <span className="text-base text-muted-foreground line-through">${product.compareAtPrice.toFixed(2)}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Save {discountPct}%
              </span>
            </>
          )}
        </div>

        {product.shortDescription && (
          <p className="mt-5 text-muted-foreground leading-relaxed">{product.shortDescription}</p>
        )}

        {/* Variant selectors */}
        {Object.keys(variantOptions).length > 0 && (
          <div className="mt-6 space-y-5">
            {Object.entries(variantOptions).map(([optName, values]) => (
              <div key={optName}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">{optName}</label>
                  {selectedOptions[optName] && (
                    <span className="text-xs text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedOptions[optName]}</span></span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {values.map(val => (
                    <button
                      key={val}
                      onClick={() => setSelectedOptions(s => ({ ...s, [optName]: val }))}
                      className={`px-3 h-9 min-w-[44px] text-sm rounded-md border transition-colors ${
                        selectedOptions[optName] === val
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stock status */}
        <div className="mt-6">
          {isOutOfStock ? (
            <span className="text-sm text-rose-600 font-medium">● Out of stock</span>
          ) : variantStock <= (product.lowStockThreshold || 5) ? (
            <span className="text-sm text-orange-600 font-medium">● Only {variantStock} left in stock</span>
          ) : (
            <span className="text-sm text-emerald-600 font-medium">● In stock</span>
          )}
        </div>

        {/* Quantity & Add to cart */}
        <div className="mt-6 flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-border h-11">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 h-full hover:bg-muted" aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="px-3 h-full hover:bg-muted" aria-label="Increase">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1 h-11"
            disabled={isOutOfStock || adding}
            onClick={() => handleAddToCart(false)}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {isOutOfStock ? 'Sold Out' : adding ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-3"
            onClick={() => toggleWish(product.id)}
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </Button>
        </div>

        {!isOutOfStock && (
          <Button
            size="lg"
            variant="secondary"
            className="mt-3 w-full h-11"
            disabled={adding}
            onClick={() => handleAddToCart(true)}
          >
            Buy It Now
          </Button>
        )}

        {/* Trust */}
        <div className="mt-8 border-t border-border pt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>Free shipping on orders over $75 — ships in 1-2 business days</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span>30-day hassle-free returns</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span>Secure checkout — your data is always protected</span>
          </div>
        </div>

        {/* SKU */}
        {product.sku && (
          <p className="mt-6 text-xs text-muted-foreground">SKU: {selectedVariant?.sku || product.sku}</p>
        )}

        {/* Description */}
        {product.description && (
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              Description
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed [&_p]:mb-4" dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}

        {/* EU Compliance Info */}
        {(product.fibreComposition || product.countryOfOrigin || product.careInstructions || product.safetyWarnings || product.warrantyInfo) && (
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              Product Details
            </h2>
            <dl className="space-y-2 text-sm">
              {product.fibreComposition && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Fibre composition:</dt>
                  <dd className="text-muted-foreground">{product.fibreComposition}</dd>
                </div>
              )}
              {product.countryOfOrigin && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Country of origin:</dt>
                  <dd className="text-muted-foreground">{product.countryOfOrigin}</dd>
                </div>
              )}
              {product.manufacturerName && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Manufacturer:</dt>
                  <dd className="text-muted-foreground">{product.manufacturerName}{product.manufacturerAddress ? `, ${product.manufacturerAddress}` : ''}</dd>
                </div>
              )}
              {product.careInstructions && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Care instructions:</dt>
                  <dd className="text-muted-foreground">{product.careInstructions}</dd>
                </div>
              )}
              {product.safetyWarnings && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Safety warnings:</dt>
                  <dd className="text-muted-foreground whitespace-pre-line">{product.safetyWarnings}</dd>
                </div>
              )}
              {product.warrantyInfo && (
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground shrink-0 w-40">Warranty:</dt>
                  <dd className="text-muted-foreground">{product.warrantyInfo}</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-muted-foreground mt-3">
              Responsible person for product safety (EU GPSR): see our <Link href="/impressum" className="hover:underline">Impressum</Link>.
            </p>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-10 border-t border-border pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              Customer Reviews
            </h2>
            <ReviewForm productId={product.id} />
          </div>
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-4">
              {product.reviews.map(r => (
                <div key={r.id} className="border-b border-border/60 pb-4 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`Rating: ${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < r.rating ? 'text-amber-500' : 'text-muted'}`} aria-hidden="true">★</span>
                      ))}
                    </div>
                    <span className="text-sm font-medium">{r.authorName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="text-sm font-medium mt-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Be the first to review this product.</p>
          )}
        </div>
      </div>
    </div>
  )
}
