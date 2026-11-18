import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { BackBar } from '../components/Layout';
import { fetchProducts } from '../lib/api';

export function CategoriesPage() {
  const { categories } = useStore();
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <BackBar label="Back" fallbackTo="/" />
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
          All Product Categories
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-600">
          Browse every electronics and appliance category available at SUCRE ELECTRONICS.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-950 hover:shadow-md transition-all flex flex-col"
          >
            <div className="aspect-[16/10] bg-zinc-100 overflow-hidden">
              {cat.image_url && (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-950 group-hover:text-[#B88D00] transition-colors">
                  {cat.name}
                </h2>
                <p className="text-sm text-zinc-600 mt-1.5 line-clamp-2">{cat.description}</p>
              </div>
              <p className="mt-4 text-xs font-semibold text-zinc-950 tabular-nums">
                {cat.product_count ?? 0} available products →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ShopPage({ mode = 'shop' }: { mode?: 'shop' | 'category' | 'search' }) {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useStore();

  const initialQuery = searchParams.get('q') || '';
  const filterParam = searchParams.get('filter') || '';

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(slug || searchParams.get('category') || 'all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === 'category' && slug) {
      setSelectedCategory(slug);
    } else if (mode === 'shop') {
      setSelectedCategory(searchParams.get('category') || 'all');
    }
  }, [slug, mode, searchParams]);

  useEffect(() => {
    setQueryInput(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetchProducts({
      category: selectedCategory,
      search: queryInput,
      featured: filterParam === 'featured',
      bestSeller: filterParam === 'best_seller',
      newArrival: filterParam === 'new_arrival',
      specialDeal: filterParam === 'special_deal',
      sort: sortBy,
    })
      .then((list) => setProducts(list))
      .finally(() => setLoading(false));
  }, [selectedCategory, queryInput, filterParam, sortBy]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand));
    return Array.from(set).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (selectedBrand === 'all') return products;
    return products.filter((p) => p.brand === selectedBrand);
  }, [products, selectedBrand]);

  const pageTitle =
    mode === 'search'
      ? queryInput
        ? `Search results for "${queryInput}"`
        : 'Search Products'
      : activeCategoryObj
      ? activeCategoryObj.name
      : filterParam === 'featured'
      ? 'Featured Electronics'
      : filterParam === 'best_seller'
      ? 'Best Selling Appliances'
      : filterParam === 'new_arrival'
      ? 'New Arrivals'
      : filterParam === 'special_deal'
      ? 'Special Deals & Discounts'
      : 'All Electronics & Home Appliances';

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (queryInput.trim()) next.set('q', queryInput.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <BackBar label="Back" fallbackTo="/" />

      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-zinc-950">{pageTitle}</h1>
        {activeCategoryObj && (
          <p className="mt-1.5 text-sm sm:text-base text-zinc-600">{activeCategoryObj.description}</p>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchForm} className="relative flex-1">
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search by product name, brand, or keyword..."
              className="w-full h-11 pl-4 pr-11 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              aria-label="Filter by brand"
              className="h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm flex-1 sm:flex-none min-w-[140px]"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort products"
              className="h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm flex-1 sm:flex-none min-w-[165px]"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Interactive Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500 shrink-0 mr-1" />
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#09090B] text-[#F5C518]'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.slug);
                setSelectedBrand('all');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-[#09090B] text-[#F5C518]'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs font-medium text-zinc-500 mb-4 tabular-nums">
        Showing {visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center space-y-3">
          <h2 className="font-display text-xl font-bold text-zinc-950">No matching products found</h2>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
            Try clearing your search keywords or selecting another category. You can also message our
            Warri showroom on WhatsApp for special appliance requests.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setQueryInput('');
                setSelectedCategory('all');
                setSelectedBrand('all');
                setSearchParams(new URLSearchParams());
              }}
              className="px-5 py-2.5 rounded-lg bg-[#09090B] text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
