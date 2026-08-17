import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { useVendorStore } from '../store/VendorStore';
import { uploadVendorImage } from '../api/vendorApi';

export function ProfilePage() {
  const { logout, vendorId } = useAuth();
  const { vendor, saveVendor } = useVendorStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState('');
  const [cover, setCover] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setName(vendor.vendor_name ?? '');
    setDescription(vendor.vendor_description ?? '');
    setStreet(vendor.vendor_address?.street ?? '');
    setZipcode(vendor.vendor_address?.zipcode ?? '');
    setCity(vendor.vendor_address?.city ?? '');
    setLogo(vendor.vendor_logo ?? '');
    setCover(vendor.vendor_cover_image ?? '');
  }, [vendor]);

  async function onFile(kind: 'logo' | 'cover', file: File | undefined) {
    if (!file || !vendorId) return;
    try {
      const url = await uploadVendorImage(vendorId, file, 'branding');
      if (kind === 'logo') setLogo(url);
      else setCover(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !street.trim() || !zipcode.trim() || !city.trim()) {
      toast.error('Name and address are required');
      return;
    }
    setBusy(true);
    try {
      await saveVendor({
        ...vendor,
        vendor_name: name.trim(),
        vendor_description: description.trim(),
        vendor_logo: logo,
        vendor_cover_image: cover,
        vendor_address: {
          street: street.trim(),
          zipcode: zipcode.trim(),
          city: city.trim(),
          country: 'Deutschland',
        },
      });
      toast.success('Profile saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Profile</h1>
      <p className="text-sm text-muted">Shop details shown to customers</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="grid gap-1 text-sm">
          Shop name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 min-h-24"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Street
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Postal code
            <input
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="grid gap-1 text-sm">
            City
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        </div>
        <p className="text-sm text-muted">Country: Deutschland</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Logo
            <input type="file" accept="image/*" onChange={(e) => void onFile('logo', e.target.files?.[0])} />
            {logo && <img src={logo} alt="" className="h-24 w-24 rounded-xl object-cover" />}
          </label>
          <label className="grid gap-2 text-sm">
            Cover
            <input type="file" accept="image/*" onChange={(e) => void onFile('cover', e.target.files?.[0])} />
            {cover && <img src={cover} alt="" className="h-24 w-full rounded-xl object-cover" />}
          </label>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-xl border border-slate-200 px-5 py-2.5"
          >
            Log out
          </button>
        </div>
      </form>
    </div>
  );
}
