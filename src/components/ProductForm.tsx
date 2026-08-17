import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { Category, Product } from '../types';
import { capitalizeFirstLetter } from '../domain/text';
import { parseQty } from '../domain/stock';
import { hasDuplicateCategoryName, MAX_CATEGORIES } from '../domain/orders';
import { uploadVendorImage } from '../api/vendorApi';
import { useAuth } from '../auth/AuthContext';
import { useVendorStore } from '../store/VendorStore';

interface Props {
  categories: Category[];
  product?: Product;
  onClose: () => void;
}

export function ProductForm({ categories, product, onClose }: Props) {
  const { vendorId } = useAuth();
  const { addProduct, saveProduct, addCategory } = useVendorStore();
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.product_name ?? '');
  const [description, setDescription] = useState(product?.product_description ?? '');
  const [price, setPrice] = useState(product ? String(product.product_price) : '');
  const [qty, setQty] = useState(product ? String(product.product_qty) : '0');
  const [perKg, setPerKg] = useState(product?.product_is_per_kg ?? true);
  const [active, setActive] = useState((product?.product_status ?? 'active') === 'active');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.cat_id ?? '');
  const [imageUrl, setImageUrl] = useState(product?.product_image ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file || !vendorId) return;
    try {
      const url = await uploadVendorImage(vendorId, file, 'products');
      setImageUrl(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed');
    }
  }

  async function createCat() {
    const trimmed = capitalizeFirstLetter(newCategory.trim());
    if (!trimmed) return;
    if (categories.length >= MAX_CATEGORIES) {
      toast.error('Maximum 5 categories');
      return;
    }
    if (hasDuplicateCategoryName(trimmed, categories)) {
      toast.error('Category name already exists');
      return;
    }
    try {
      await addCategory(trimmed);
      setNewCategory('');
      toast.success('Category created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create category');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedPrice = parseQty(price, 0);
    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required');
      return;
    }
    if (!(parsedPrice > 0)) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (!categoryId) {
      toast.error('Select a category');
      return;
    }
    const stock = Math.max(0, parseQty(qty, 0));
    setBusy(true);
    try {
      if (isEdit && product) {
        await saveProduct({
          ...product,
          product_name: capitalizeFirstLetter(name.trim()),
          product_description: capitalizeFirstLetter(description.trim()),
          product_price: parsedPrice,
          product_qty: stock,
          product_image: imageUrl || product.product_image,
          product_status: active ? 'active' : 'inactive',
          product_is_per_kg: perKg,
        });
        toast.success('Product updated');
      } else {
        await addProduct(categoryId, {
          product_name: capitalizeFirstLetter(name.trim()),
          product_description: capitalizeFirstLetter(description.trim()),
          product_price: parsedPrice,
          product_qty: stock,
          product_image: imageUrl || undefined,
          product_status: active ? 'active' : 'inactive',
          product_is_per_kg: perKg,
        });
        toast.success('Product added');
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-ink">{isEdit ? 'Edit product' : 'Add product'}</h2>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 min-h-24"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              Price (€)
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Stock
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          {!isEdit && (
            <label className="grid gap-1 text-sm">
              Category
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c.cat_id} value={c.cat_id}>
                    {c.cat_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!isEdit && (
            <div className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void createCat()}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                Add category
              </button>
            </div>
          )}
          <fieldset className="text-sm">
            <legend className="mb-2">Sold as</legend>
            <label className="mr-4">
              <input
                type="radio"
                checked={perKg}
                onChange={() => setPerKg(true)}
                className="mr-1"
              />
              Per kg
            </label>
            <label>
              <input
                type="radio"
                checked={!perKg}
                onChange={() => setPerKg(false)}
                className="mr-1"
              />
              Per piece
            </label>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
          <label className="grid gap-1 text-sm">
            Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          {imageUrl && (
            <img src={imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
          )}
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-2.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
