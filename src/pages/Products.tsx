import { useMemo, useState } from 'react';
import { formatEuro } from '../domain/price';
import { useVendorStore } from '../store/VendorStore';
import { ProductForm } from '../components/ProductForm';
import { StockModal } from '../components/StockModal';
import type { Product } from '../types';

export function ProductsPage() {
  const { categories, saveProduct } = useVendorStore();
  const [catId, setCatId] = useState(categories[0]?.cat_id ?? '');
  const selected = categories.find((c) => c.cat_id === catId) ?? categories[0];
  const products = selected?.products ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [stock, setStock] = useState<Product | null>(null);

  const empty = categories.length === 0;
  const categoryTabs = useMemo(() => categories, [categories]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Products</h1>
          <p className="text-sm text-muted">Catalog, stock and prices</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Add product
        </button>
      </div>
      {empty ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-sm text-muted">
          No categories yet. Add a product and create a category to get started.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {categoryTabs.map((category) => (
              <button
                key={category.cat_id}
                type="button"
                onClick={() => setCatId(category.cat_id)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selected?.cat_id === category.cat_id
                    ? 'bg-brand text-white'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {category.cat_name}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const low = product.product_qty < 5;
              return (
                <article
                  key={product.product_id}
                  className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100"
                >
                  <div className="flex gap-3">
                    {product.product_image ? (
                      <img
                        src={product.product_image}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-page" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-ink truncate">{product.product_name}</h3>
                      <p className="text-sm text-muted line-clamp-2">{product.product_description}</p>
                      <p className="mt-1 text-sm font-medium text-brand">
                        {formatEuro(product.product_price)} / {product.product_is_per_kg ? 'KG' : 'Piece'}
                      </p>
                      <p className={`text-sm ${low ? 'text-danger font-semibold' : 'text-muted'}`}>
                        Stock: {product.product_qty}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <label className="text-sm text-muted flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(product.product_status ?? 'active') === 'active'}
                        onChange={() =>
                          void saveProduct({
                            ...product,
                            product_status:
                              (product.product_status ?? 'active') === 'active'
                                ? 'inactive'
                                : 'active',
                          })
                        }
                      />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStock(product)}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                      >
                        Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(product);
                          setFormOpen(true);
                        }}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {formOpen && (
        <ProductForm
          categories={categories}
          product={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
      {stock && <StockModal product={stock} onClose={() => setStock(null)} />}
    </div>
  );
}
