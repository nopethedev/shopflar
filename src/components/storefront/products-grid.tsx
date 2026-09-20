'use client'
import { useState, useEffect, useMemo } from 'react'
import { ProductCard } from './product-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, X } from 'lucide-react'

const PER_PAGE = 12

export function ProductsGrid({ searchParams, categories }) {
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState(searchParams.sort || 'newest')
  const [priceRange, setPriceRange] = useState([0, 300])
  const [selectedCats, setSelectedCats] = useState(
    searchParams.category ? [searchParams.category] : []
  )
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.sale === 'true')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.featured === 'true') params.set('featured', 'true')
    if (searchParams.new === 'true') params.set('new', 'true')
    if (searchParams.sale === 'true' || onSaleOnly) params.set('sale', 'true')
    if (inStockOnly) params.set('inStock', 'true')
    params.set('minPrice', String(priceRange[0]))
    params.set('maxPrice', String(priceRange[1]))
    if (selectedCats.length) params.set('categories', selectedCats.join(','))
    params.set('sort', sort)
    params.set('page', String(page))
    params.set('limit', String(PER_PAGE))

    fetch(`/api/products?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || [])
        setTotal(d.total || 0)
      })
      .catch(() => {
        setProducts([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [searchParams.search, searchParams.featured, searchParams.new, searchParams.sale, onSaleOnly, inStockOnly, priceRange, selectedCats, sort, page])

  const totalPages = Math.ceil(total / PER_PAGE)

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-semibold mb-3">Categories</h3>
        <div className="space-y-2">
          {categories.map(c => (
            <label key={c.id} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={selectedCats.includes(c.id)}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedCats([...selectedCats, c.id])
                  else setSelectedCats(selectedCats.filter(x => x !== c.id))
                }}
              />
              <span className="text-sm">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="px-2">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={300}
            step={5}
            className="my-3"
          />
          <div className="flex items-center justify-between text-sm">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}{priceRange[1] >= 300 ? '+' : ''}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">Availability</h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox checked={onSaleOnly} onCheckedChange={setOnSaleOnly} />
          <span className="text-sm">On sale</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox checked={inStockOnly} onCheckedChange={setInStockOnly} />
          <span className="text-sm">In stock only</span>
        </label>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedCats([])
          setPriceRange([0, 300])
          setOnSaleOnly(false)
          setInStockOnly(false)
        }}
      >
        Clear all filters
      </Button>
    </div>
  )

  return (
    <div className="flex gap-8">
      {/* Desktop filters */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-24">
          {filterPanel}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-8">
                  {filterPanel}
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="name">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const n = i + 1
              return (
                <Button
                  key={n}
                  variant={page === n ? 'default' : 'outline'}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
