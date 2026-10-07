'use client'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist-store'
import { toast } from '@/lib/toast'
import { useCart } from '@/lib/cart-store'
import { useState } from 'react'

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

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (product.variants && product.variants.length > 0) {
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
      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden zoom-image card-lift">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading={index < 4 ? 'eager' : 'lazy'}
            className="absolute inset-0 h-full w-full object-cover"
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
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.mysteryCrate && (
            <span className="bg-purple-600 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
              🎁 Mystery
            </span>
          )}
          {product.productType === 'downloadable' && (
            <span className="bg-blue-600 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              Digital
            </span>
          )}
          {product.productType === 'code' && (
            <span className="bg-emerald-600 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              License
            </span>
          )}
          {onSale && (
            <span className="bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              -{discountPct}%
            </span>
          )}
          {product.featured && !onSale && (
            <span className="bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              Featured
            </span>
          )}
          {product.isOutOfStock && (
            <span className="bg-rose-600 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              Sold Out
            </span>
          )}
          {product.inventoryQty > 0 && product.inventoryQty <= (product.lowStockThreshold || 5) && !product.isOutOfStock && (
            <span className="bg-orange-500 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded">
              Low Stock
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
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/85 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
          aria-label="Toggle wishlist"
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-foreground'}`} />
        </button>

        {/* Quick add */}
        {!product.isOutOfStock && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 left-3 right-3 bg-foreground text-background text-sm font-medium py-2.5 rounded-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.variants && product.variants.length > 0 ? 'Select Options' : 'Quick Add'}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.categories?.slice(0, 1).map(pc => (
            <span key={pc.category.id} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {pc.category.name}
            </span>
          ))}
        </div>
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">${product.price.toFixed(2)}</span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">${product.compareAtPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
