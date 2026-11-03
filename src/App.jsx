import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function primaryImage(product) {
  return product.images?.find((image) => image.isPrimary)?.url || product.imageUrl || product.images?.[0]?.url || '';
}

function App() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  async function refreshCatalog() {
    setLoading(true);
    try {
      const [categoryResponse, productResponse] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/products`),
      ]);
      setCategories(categoryResponse.data?.data || []);
      setProducts(productResponse.data?.data || []);
      setCatalogError('');
    } catch (error) {
      setCatalogError(error.response?.data?.message || 'The catalog is temporarily unavailable.');
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshCatalog, 0);
    const refreshVisibleCatalog = () => { if (document.visibilityState === 'visible') refreshCatalog(); };
    window.addEventListener('focus', refreshVisibleCatalog);
    const intervalId = window.setInterval(refreshVisibleCatalog, 60000);
    return () => { window.clearTimeout(initialRefresh); window.removeEventListener('focus', refreshVisibleCatalog); window.clearInterval(intervalId); };
  }, []);

  function addToCart(product, options = {}) {
    setCart((current) => {
      const key = `${product._id}-${options.size || ''}-${options.color || ''}`;
      const found = current.find((item) => item.key === key);
      return found
        ? current.map((item) => item.key === key ? { ...item, quantity: item.quantity + Number(options.quantity || 1) } : item)
        : [...current, { key, productId: product._id, product, size: options.size || '', color: options.color || '', quantity: Number(options.quantity || 1) }];
    });
  }

  return <div className="website-shell">
    <SiteNavigation categories={categories} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
    {catalogError && <div className="container pt-3"><div className="alert alert-warning" role="alert">{catalogError}<button className="btn btn-sm btn-outline-dark ms-3" onClick={refreshCatalog}>Retry</button></div></div>}
    <Routes>
      <Route path="/" element={<HomePage categories={categories} products={products} loading={loading} addToCart={addToCart} />} />
      <Route path="/products" element={<ShopPage categories={categories} products={products} loading={loading} addToCart={addToCart} />} />
      <Route path="/product/:slug" element={<ProductDetailPage products={products} addToCart={addToCart} />} />
      <Route path="/products/:slug" element={<ProductDetailPage products={products} addToCart={addToCart} />} />
      <Route path="/category/:slug" element={<CategoryPage categories={categories} products={products} loading={loading} addToCart={addToCart} />} />
      <Route path="/cart" element={<CheckoutPage cart={cart} setCart={setCart} />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
    </Routes>
    <footer className="site-footer"><div className="container py-4 text-center">© 2026 Zellow Wholesale Footwear</div></footer>
  </div>;
}

function SiteNavigation({ categories, cartCount }) {
  const [open, setOpen] = useState(false);
  const parents = categories.filter((category) => !category.parentId);
  return <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-4"><div className="container">
    <Link to="/" className="navbar-brand brand-mark">ZELLOW</Link>
    <button className="navbar-toggler" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation"><span className="navbar-toggler-icon" /></button>
    <div className={`navbar-collapse ${open ? 'show' : 'collapse'}`}><div className="navbar-nav ms-auto gap-3 align-items-lg-center">
      <NavLink to="/" end className="nav-link">Home</NavLink>
      <NavLink to="/products" className="nav-link">Shop</NavLink>
      {parents.map((category) => {
        const children = categories.filter((item) => String(item.parentId) === String(category._id));
        return <div className="nav-category" key={category._id}><Link className="nav-link" to={`/category/${category.slug}`}>{category.name}</Link>{children.length > 0 && <div className="nav-subcategories">{children.map((child) => <Link key={child._id} to={`/category/${child.slug}`}>{child.name}</Link>)}</div>}</div>;
      })}
      <NavLink to="/about" className="nav-link">About</NavLink><NavLink to="/contact" className="nav-link">Contact</NavLink><Link to="/cart" className="btn btn-dark btn-sm">Enquiry cart ({cartCount})</Link>
    </div></div>
  </div></nav>;
}

function HomePage({ categories, products, loading, addToCart }) {
  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const newArrivals = products.filter((product) => product.isNewArrival).slice(0, 4);
  const bestSellers = products.filter((product) => product.isBestSeller).slice(0, 4);
  const parentCategories = categories.filter((category) => !category.parentId);
  return <>
    <section className="hero-section"><div className="container hero-content"><div><p className="badge">Wholesale footwear specialists</p><h1>Footwear collections made for growing retailers.</h1><p className="lead">Browse the live wholesale catalog, build an enquiry, and confirm availability with our team.</p><div className="cta-row"><Link to="/products" className="btn btn-warning btn-lg">Explore collection</Link><Link to="/cart" className="btn btn-outline-dark btn-lg">Review enquiry</Link></div></div><div className="hero-card"><div className="shoe-box" /><div className="mini-card"><span>Current collection</span><strong>{products.length} active products</strong><small>New stock added by our team</small></div></div></div></section>
    <section className="container py-5"><div className="section-title"><h2>Shop by collection</h2></div><div className="row g-4">{parentCategories.map((category) => <div className="col-md-6 col-lg-3" key={category._id}><Link className="category-card d-block text-decoration-none" to={`/category/${category.slug}`}><div className="category-thumb">{category.image?.url && <img src={category.image.url} alt="" />}</div><h4>{category.name}</h4></Link></div>)}</div></section>
    <ProductSection title="Featured products" products={featured} loading={loading} addToCart={addToCart} />
    <ProductSection title="New arrivals" products={newArrivals} loading={loading} addToCart={addToCart} />
    <ProductSection title="Best sellers" products={bestSellers} loading={loading} addToCart={addToCart} />
  </>;
}

function ProductSection({ title, products, loading, addToCart }) {
  return <section className="container py-5"><div className="section-title"><h2>{title}</h2><Link to="/products">View all</Link></div>{loading ? <p>Loading collection…</p> : products.length ? <div className="row g-4">{products.map((product) => <div className="col-md-6 col-lg-3" key={product._id}><ProductCard product={product} addToCart={addToCart} /></div>)}</div> : <p className="text-muted">No products in this collection yet.</p>}</section>;
}

function ProductCard({ product, addToCart }) {
  const image = primaryImage(product);
  return <article className="product-card"><Link to={`/product/${product.slug}`} className="product-image">{image ? <img src={image} alt={product.name} loading="lazy" /> : <span className="image-placeholder">ZELLOW</span>}</Link>
    {(product.isNewArrival || product.isBestSeller || product.isFeatured) && <span className="product-tag">{product.isNewArrival ? 'New arrival' : product.isBestSeller ? 'Best seller' : 'Featured'}</span>}
    <h4>{product.name}</h4><p>{product.sku} · {product.category}</p><div className="price-row"><strong>₹{product.price}</strong><Link to={`/product/${product.slug}`} className="btn btn-sm btn-outline-dark">View</Link></div>
    {product.sizes?.length || product.colors?.length
      ? <Link to={`/product/${product.slug}`} className="btn btn-sm btn-warning mt-2 w-100">Choose options</Link>
      : <button type="button" className="btn btn-sm btn-warning mt-2 w-100" onClick={() => addToCart(product)}>Add to enquiry</button>}
  </article>;
}

function ShopPage({ categories, products, loading, addToCart }) {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); const [sort, setSort] = useState('newest'); const [minPrice, setMinPrice] = useState(''); const [maxPrice, setMaxPrice] = useState(''); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [page, setPage] = useState(1);
  const sizes = [...new Set(products.flatMap((product) => product.sizes || []))].sort();
  const colors = [...new Set(products.flatMap((product) => product.colors || []))].sort();
  const filtered = useMemo(() => products.filter((product) => (!search || `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())) && (!category || String(product.categoryId) === category || product.category === categories.find((item) => item._id === category)?.name) && (!minPrice || product.price >= Number(minPrice)) && (!maxPrice || product.price <= Number(maxPrice)) && (!size || product.sizes?.includes(size)) && (!color || product.colors?.includes(color))).sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : new Date(b.createdAt) - new Date(a.createdAt)), [products, categories, search, category, sort, minPrice, maxPrice, size, color]);
  const pageSize = 20; const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)); const currentPage = Math.min(page, pageCount); const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <main className="container py-5"><div className="section-title"><h2>Wholesale footwear</h2></div><div className="row g-2 mb-4"><div className="col-md-3"><input className="form-control" placeholder="Search products or SKU" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="col-md-2"><select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div><div className="col-md-1"><input className="form-control" type="number" min="0" placeholder="Min ₹" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></div><div className="col-md-1"><input className="form-control" type="number" min="0" placeholder="Max ₹" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></div><div className="col-md-2"><select className="form-select" value={size} onChange={(event) => setSize(event.target.value)}><option value="">All sizes</option>{sizes.map((item) => <option key={item}>{item}</option>)}</select></div><div className="col-md-2"><select className="form-select" value={color} onChange={(event) => setColor(event.target.value)}><option value="">All colours</option>{colors.map((item) => <option key={item}>{item}</option>)}</select></div><div className="col-md-1"><select className="form-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="newest">New</option><option value="price-low">₹↑</option><option value="price-high">₹↓</option></select></div></div>{loading ? <p>Loading products…</p> : filtered.length ? <><div className="row g-4">{pageItems.map((product) => <div className="col-md-6 col-lg-3" key={product._id}><ProductCard product={product} addToCart={addToCart} /></div>)}</div><div className="d-flex justify-content-between align-items-center mt-4"><span>{filtered.length} products · Page {currentPage} of {pageCount}</span><div className="d-flex gap-2"><button className="btn btn-outline-dark btn-sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button className="btn btn-outline-dark btn-sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></div></> : <p>No published products match your filters.</p>}</main>;
}

function CategoryPage({ categories, products, loading, addToCart }) {
  const { slug } = useParams(); const category = categories.find((item) => item.slug === slug);
  const selectedIds = category ? [String(category._id), ...categories.filter((item) => String(item.parentId) === String(category._id)).map((item) => String(item._id))] : [];
  const filtered = products.filter((product) => selectedIds.includes(String(product.categoryId)) || (category && product.category === category.name));
  return <main className="container py-5"><div className="section-title"><div><p className="eyebrow">Collection</p><h2>{category?.name || 'Category not found'}</h2></div></div>{category?.description && <p className="lead">{category.description}</p>}{loading ? <p>Loading products…</p> : filtered.length ? <div className="row g-4">{filtered.map((product) => <div className="col-md-6 col-lg-3" key={product._id}><ProductCard product={product} addToCart={addToCart} /></div>)}</div> : <p>No published products are available in this category.</p>}</main>;
}

function ProductDetailPage({ products, addToCart }) {
  const { slug } = useParams(); const [product, setProduct] = useState(() => products.find((item) => item.slug === slug) || null); const [imageSelection, setImageSelection] = useState({ productId: '', index: 0 }); const [quantity, setQuantity] = useState(1); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    axios.get(`${API_URL}/products/slug/${encodeURIComponent(slug)}`).then(({ data }) => { if (mounted) setProduct(data.data); }).catch(() => { if (mounted) setProduct(products.find((item) => item.slug === slug) || null); });
    return () => { mounted = false; };
  }, [slug, products]);
  if (!product) return <main className="container py-5"><h2>Product not found</h2></main>;
  const images = [...(product.images || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (!images.some((item) => item.isPrimary) && product.imageUrl) images.unshift({ url: product.imageUrl, isPrimary: true });
  const primaryIndex = Math.max(0, images.findIndex((image) => image.isPrimary));
  const imageIndex = imageSelection.productId === product._id ? imageSelection.index : primaryIndex;
  const selectedImage = images[imageIndex]?.url || primaryImage(product);
  const related = products.filter((item) => item._id !== product._id && (item.categoryId === product.categoryId || item.category === product.category)).slice(0, 4);
  function add() { if (product.sizes?.length && !size) return setError('Choose a size.'); if (product.colors?.length && !color) return setError('Choose a colour.'); if (quantity < product.minimumOrderQuantity) return setError(`Minimum order is ${product.minimumOrderQuantity}.`); setError(''); addToCart(product, { size, color, quantity }); }
  return <main className="container py-5"><div className="row g-5"><div className="col-lg-6"><div className="detail-image">{selectedImage && <img src={selectedImage} alt={product.name} />}</div><div className="detail-thumbnails">{images.map((image, index) => <button key={`${image.publicId}-${index}`} onClick={() => setImageSelection({ productId: product._id, index })} className={index === imageIndex ? 'selected' : ''}><img src={image.url} alt={`${product.name} view ${index + 1}`} /></button>)}</div></div><div className="col-lg-6"><p className="badge">{product.category}</p><h2>{product.name}</h2><p className="lead">SKU: {product.sku}</p><h3>₹{product.price} / pair</h3><p>{product.description}</p><p>Available stock: {product.stock}</p><div className="row g-3">{product.sizes?.length > 0 && <div className="col-sm-6"><label className="form-label">Size</label><select className="form-select" value={size} onChange={(event) => setSize(event.target.value)}><option value="">Choose size</option>{product.sizes.map((value) => <option key={value}>{value}</option>)}</select></div>}{product.colors?.length > 0 && <div className="col-sm-6"><label className="form-label">Colour</label><select className="form-select" value={color} onChange={(event) => setColor(event.target.value)}><option value="">Choose colour</option>{product.colors.map((value) => <option key={value}>{value}</option>)}</select></div>}<div className="col-sm-4"><label className="form-label">Quantity</label><input className="form-control" type="number" min={product.minimumOrderQuantity || 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div></div>{error && <div className="alert alert-warning mt-3">{error}</div>}<button className="btn btn-warning mt-3" onClick={add}>Add to enquiry</button></div></div>{related.length > 0 && <section className="py-5"><div className="section-title"><h2>Related products</h2></div><div className="row g-4">{related.map((item) => <div key={item._id} className="col-md-6 col-lg-3"><ProductCard product={item} addToCart={addToCart} /></div>)}</div></section>}</main>;
}

function CheckoutPage({ cart, setCart }) {
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', whatsappNumber: '', email: '', address: '', city: '', district: '', state: '', pinCode: '', notes: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  function setQuantity(key, quantity) { setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(item.product.minimumOrderQuantity || 1, Number(quantity) || 1) } : item)); }
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { const { data } = await axios.post(`${API_URL}/orders`, { customer: form, additionalNotes: form.notes, items: cart.map((item) => ({ productId: item.productId, size: item.size, color: item.color, quantity: item.quantity })) }); setCart([]); window.location.assign(`https://wa.me/${data.whatsapp.number}?text=${data.whatsapp.message}`); } catch (requestError) { setError(requestError.response?.data?.message || 'Could not create your enquiry. Please review the details and try again.'); } finally { setBusy(false); } }
  if (!cart.length) return <main className="container py-5"><h2>Your enquiry cart is empty</h2><Link to="/products" className="btn btn-warning mt-3">Browse products</Link></main>;
  return <main className="container py-5"><div className="section-title"><h2>Enquiry checkout</h2></div><div className="row g-5"><div className="col-lg-6"><div className="table-responsive"><table className="table"><thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Estimate</th></tr></thead><tbody>{cart.map((item) => <tr key={item.key}><td>{item.product.name}<small className="d-block text-muted">{item.product.sku}</small></td><td>{[item.size, item.color].filter(Boolean).join(' / ') || '—'}</td><td><input className="form-control form-control-sm quantity-input" type="number" min={item.product.minimumOrderQuantity || 1} value={item.quantity} onChange={(event) => setQuantity(item.key, event.target.value)} /></td><td>₹{item.product.price * item.quantity}</td></tr>)}</tbody></table><h4>Estimated total: ₹{total.toLocaleString('en-IN')}</h4></div></div><div className="col-lg-6"><form onSubmit={submit} className="row g-3">{[['name', 'Customer name'], ['shopName', 'Shop name'], ['mobile', 'Mobile number'], ['whatsappNumber', 'WhatsApp number'], ['email', 'Email'], ['address', 'Street address'], ['city', 'City'], ['district', 'District'], ['state', 'State'], ['pinCode', 'PIN code']].map(([key, label]) => <div key={key} className={['address'].includes(key) ? 'col-12' : 'col-md-6'}><label className="form-label">{label}</label><input className="form-control" type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={['name', 'mobile'].includes(key)} /></div>)}<div className="col-12"><label className="form-label">Additional notes</label><textarea className="form-control" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>{error && <div className="col-12"><div className="alert alert-danger">{error}</div></div>}<div className="col-12"><button className="btn btn-warning" disabled={busy}>{busy ? 'Saving enquiry…' : 'Save enquiry and continue to WhatsApp'}</button></div></form></div></div></main>;
}

function AboutPage() { return <main className="container py-5"><h2>About Zellow</h2><p className="lead">We help retailers source premium wholesale footwear with a reliable enquiry and ordering process.</p></main>; }
function ContactPage() { return <main className="container py-5"><h2>Contact us</h2><p>Email: sales@zellow.com</p><p>Phone: +91 90000 00000</p></main>; }

export default App;