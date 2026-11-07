'use client'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist-store'
import { toast } from '@/lib/toast'
import { useCart } from '@/lib/cart-store'

export function ProductCard({ product, index = 0 }) {
  const toggle = useWishlist(s => s.toggle)
  const has = useWishlist(s => s.has)
  const addItem = useCart(s => s.addItem)
  const isFav = has(product.id)

  const onSale = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPct = onSale
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0

  const image = product.images?.[0]?.url
  const image2 = product.images?.[1]?.url
  const hasVariants = product.variants && product.variants.length > 0
  const soldOut = product.isOutOfStock || (product.trackInventory && product.inventoryQty <= 0 && !hasVariants)

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (hasVariants) {
      window.location.href = `/products/${product.slug}`
      return
    }
    addItem({
      productId: product.id,
      variantId: null,
      quantity: 1,
      name: product.name,
      price: product.price,
      image,
      sku: product.sku,
      slug: product.slug
    })
    toast.success('Added to cart', product.name)
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading={index < 4 ? 'eager' : 'lazy'}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
        {image2 && (
          <img
            src={image2}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {soldOut && (
            <span className="bg-background/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Sold out
            </span>
          )}
          {!soldOut && onSale && (
            <span className="bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Save {discountPct}%
            </span>
          )}
          {!soldOut && !onSale && product.featured && (
            <span className="bg-background/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Featured
            </span>
          )}
          {product.mysteryCrate && (
            <span className="bg-background/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Mystery box
            </span>
          )}
          {product.productType === 'downloadable' && (
            <span className="bg-background/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
              Digital
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault()
            toggle(product.id)
            toast.info(isFav ? 'Removed from wishlist' : 'Added to wishlist')
          }}
          className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Toggle wishlist"
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-foreground'}`} />
        </button>

        {/* Quick add */}
        {!soldOut && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-0 left-0 right-0 bg-foreground/95 text-background text-[12px] font-medium tracking-wide py-2.5 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {hasVariants ? 'Choose options' : 'Add to cart'}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.categories?.slice(0, 1).map(pc => (
            <span key={pc.category.id} className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
              {pc.category.name}
            </span>
          ))}
        </div>
        <h3 className="text-[13px] font-medium leading-snug line-clamp-2 group-hover:underline underline-offset-2">{product.name}</h3>
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-[13px] font-semibold">${product.price.toFixed(2)}</span>
          {onSale && (
            <>
              <span className="text-[12px] text-muted-foreground line-through">${product.compareAtPrice.toFixed(2)}</span>
              <span className="text-[10px] text-red-600 font-medium">-{discountPct}%</span>
            </>
          )}
        </div>
        {hasVariants && (
          <p className="text-[11px] text-muted-foreground">
            {product.variants.length} {product.variants.length === 1 ? 'option' : 'options'}
          </p>
        )}
      </div>
    </Link>
  )
}
