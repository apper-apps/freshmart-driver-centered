import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Category from "@/components/pages/Category";
import { productService } from "@/services/api/productService";

const BulkPriceManager = () => {
  const navigate = useNavigate();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState({ min: '', max: '' });
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [editingPrices, setEditingPrices] = useState({});
  const [updatingIds, setUpdatingIds] = useState(new Set());
  
  // Bulk update state
  const [bulkUpdateStrategy, setBulkUpdateStrategy] = useState('percentage');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [bulkMinPrice, setBulkMinPrice] = useState('1');
  const [bulkMaxPrice, setBulkMaxPrice] = useState('100000');
  const [bulkApplyTo, setBulkApplyTo] = useState('basePrice');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  // Categories for filtering
  const categories = ["Groceries", "Meat", "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages"];

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll('admin');
      const productsArray = Array.isArray(data) ? data : [];
      setProducts(productsArray);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
      toast.error('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products based on all criteria
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product) return false;
      
      // Search filter
      const matchesSearch = !searchTerm || 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      // Price range filter
      const price = parseFloat(product.price) || 0;
      const matchesPriceRange = (!priceRangeFilter.min || price >= parseFloat(priceRangeFilter.min)) &&
                                (!priceRangeFilter.max || price <= parseFloat(priceRangeFilter.max));
      
      // Low stock filter
      const matchesLowStock = !lowStockFilter || product.stock <= (product.minStock || 5);
      
      return matchesSearch && matchesCategory && matchesPriceRange && matchesLowStock;
    });
  }, [products, searchTerm, categoryFilter, priceRangeFilter, lowStockFilter]);

  // Handle individual price changes
  const handlePriceChange = (productId, field, value) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // Calculate margin percentage
  const calculateMargin = (basePrice, costPrice) => {
    const base = parseFloat(basePrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    
    if (cost <= 0 || base <= cost) return 0;
    
    return ((base - cost) / cost) * 100;
  };

  // Get current price values for a product
  const getCurrentPrices = (product) => {
    const editingData = editingPrices[product.id] || {};
    return {
      basePrice: editingData.basePrice !== undefined ? editingData.basePrice : (product.price || 0),
      costPrice: editingData.costPrice !== undefined ? editingData.costPrice : (product.purchasePrice || 0)
    };
  };

  // Handle apply price update for individual row
  const handleApplyPriceUpdate = async (product) => {
    const editingData = editingPrices[product.id];
    if (!editingData) {
      toast.warning('No changes to apply');
      return;
    }

    try {
      setUpdatingIds(prev => new Set(prev).add(product.id));

      const updateData = {};
      if (editingData.basePrice !== undefined) {
        updateData.price = parseFloat(editingData.basePrice);
      }
      if (editingData.costPrice !== undefined) {
        updateData.purchasePrice = parseFloat(editingData.costPrice);
      }

      // Validation
      if (updateData.price <= 0) {
        toast.error('Base price must be greater than 0');
        return;
      }

      if (updateData.price < 1) {
        toast.error('Price cannot be less than Rs. 1');
        return;
      }

      if (updateData.price > 100000) {
        toast.error('Price cannot exceed Rs. 100,000');
        return;
      }

      if (updateData.purchasePrice && updateData.price <= updateData.purchasePrice) {
        toast.error('Base price must be greater than cost price');
        return;
      }

      await productService.update(product.id, updateData);

      // Update local product data
      setProducts(prev => prev.map(p => 
        p.id === product.id 
          ? { ...p, ...updateData }
          : p
      ));

      // Clear editing data for this product
      setEditingPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[product.id];
        return newPrices;
      });

      toast.success(`✅ Updated prices for ${product.name}`);

    } catch (error) {
      console.error('Error updating product prices:', error);
      toast.error(`Failed to update ${product.name}: ${error.message}`);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  // Handle revert changes
  const handleRevertChanges = (productId) => {
    setEditingPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[productId];
      return newPrices;
    });
    toast.info('Changes reverted');
  };

  // Generate bulk update preview
  const generateBulkPreview = () => {
    if (!bulkUpdateValue && bulkUpdateStrategy !== 'range') {
      toast.error('Please enter a value for the bulk update');
      return;
    }

    if (bulkUpdateStrategy === 'range' && (!bulkMinPrice || !bulkMaxPrice)) {
      toast.error('Please enter both minimum and maximum prices');
      return;
    }

    if (bulkUpdateStrategy === 'range') {
      const minPrice = parseFloat(bulkMinPrice);
      const maxPrice = parseFloat(bulkMaxPrice);
      if (minPrice >= maxPrice) {
        toast.error('Maximum price must be greater than minimum price');
        return;
      }
    }

    let targetProducts = selectedProducts.size > 0 
      ? filteredProducts.filter(p => selectedProducts.has(p.id))
      : filteredProducts;

    if (targetProducts.length === 0) {
      toast.error('No products selected for bulk update');
      return;
    }

    const previews = targetProducts.map(product => {
      let newPrice = product.price;
      
      switch (bulkUpdateStrategy) {
        case 'percentage':
          const percentage = parseFloat(bulkUpdateValue) || 0;
          newPrice = product.price * (1 + percentage / 100);
          break;
        case 'fixed':
          const fixedAmount = parseFloat(bulkUpdateValue) || 0;
          newPrice = product.price + fixedAmount;
          break;
        case 'range':
          const minPrice = parseFloat(bulkMinPrice) || 0;
          const maxPrice = parseFloat(bulkMaxPrice) || product.price;
          newPrice = Math.min(Math.max(product.price, minPrice), maxPrice);
          break;
      }

      // Apply price guards
      newPrice = Math.max(1, Math.min(newPrice, 100000));
      newPrice = Math.round(newPrice * 100) / 100;

      return {
        ...product,
        newPrice,
        priceChange: Math.round((newPrice - product.price) * 100) / 100
      };
    });

    setBulkPreview(previews);
    setShowBulkPreview(true);
    toast.success(`Preview generated for ${previews.length} products`);
  };

  // Apply bulk update
  const applyBulkUpdate = async () => {
    if (bulkPreview.length === 0) {
      toast.error('Please generate a preview first');
      return;
    }

    const confirmMessage = `Are you sure you want to update ${bulkPreview.length} products?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      let successCount = 0;
      const errors = [];

      for (const product of bulkPreview) {
        try {
          const updateData = { price: product.newPrice };
          await productService.update(product.id, updateData);
          successCount++;
        } catch (error) {
          errors.push({ productId: product.id, error: error.message });
        }
      }

      // Update local product data
      setProducts(prev => prev.map(p => {
        const updatedProduct = bulkPreview.find(bp => bp.id === p.id);
        return updatedProduct ? { ...p, price: updatedProduct.newPrice } : p;
      }));

      // Clear bulk preview
      setBulkPreview([]);
      setShowBulkPreview(false);
      setSelectedProducts(new Set());

      if (errors.length === 0) {
        toast.success(`✅ Successfully updated ${successCount} products`);
      } else {
        toast.warning(`Updated ${successCount} products with ${errors.length} errors`);
      }

    } catch (error) {
      console.error('Error applying bulk update:', error);
      toast.error('Failed to apply bulk update');
    }
  };

  // Handle select all products
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Handle individual product selection
  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Error message={error} onRetry={loadProducts} />;
  }

  return (
    <div className="max-w-full mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Price Manager</h1>
          <p className="text-gray-600">Search, filter, and update product prices efficiently with comprehensive tools</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Badge variant="info" className="text-sm">
            {filteredProducts.length} products
          </Badge>
          <Button
            variant="outline"
            icon="ArrowLeft"
            onClick={() => navigate('/admin/products')}
          >
            Back to Products
          </Button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Bulk Update Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <div className="flex items-center space-x-2 mb-4">
              <ApperIcon name="Settings" size={20} className="text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">Bulk Update Tools</h3>
            </div>

            {/* Update Strategy */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900">1. Update Strategy</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="strategy"
                    value="percentage"
                    checked={bulkUpdateStrategy === 'percentage'}
                    onChange={(e) => setBulkUpdateStrategy(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Percentage: +/- %</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="strategy"
                    value="fixed"
                    checked={bulkUpdateStrategy === 'fixed'}
                    onChange={(e) => setBulkUpdateStrategy(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Fixed: +/- Rs.</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="strategy"
                    value="range"
                    checked={bulkUpdateStrategy === 'range'}
                    onChange={(e) => setBulkUpdateStrategy(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Range: Min-Max Rs.</span>
                </label>
              </div>
            </div>

            {/* Strategy Inputs */}
            <div className="space-y-4 mb-6">
              {bulkUpdateStrategy === 'percentage' && (
                <Input
                  label="Percentage Change (%)"
                  type="number"
                  step="0.1"
                  value={bulkUpdateValue}
                  onChange={(e) => setBulkUpdateValue(e.target.value)}
                  placeholder="e.g., 10 for 10% increase, -5 for 5% decrease"
                />
              )}
              
              {bulkUpdateStrategy === 'fixed' && (
                <Input
                  label="Fixed Amount (Rs.)"
                  type="number"
                  step="0.01"
                  value={bulkUpdateValue}
                  onChange={(e) => setBulkUpdateValue(e.target.value)}
                  placeholder="e.g., 50 to add Rs. 50, -25 to subtract Rs. 25"
                />
              )}

              {bulkUpdateStrategy === 'range' && (
                <div className="space-y-3">
                  <Input
                    label="Minimum Price (Rs.)"
                    type="number"
                    step="0.01"
                    min="1"
                    max="100000"
                    value={bulkMinPrice}
                    onChange={(e) => setBulkMinPrice(e.target.value)}
                  />
                  <Input
                    label="Maximum Price (Rs.)"
                    type="number"
                    step="0.01"
                    min="1"
                    max="100000"
                    value={bulkMaxPrice}
                    onChange={(e) => setBulkMaxPrice(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Apply To */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900">2. Apply To</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="applyTo"
                    value="basePrice"
                    checked={bulkApplyTo === 'basePrice'}
                    onChange={(e) => setBulkApplyTo(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Base Price ☑️</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="applyTo"
                    value="selected"
                    checked={bulkApplyTo === 'selected'}
                    onChange={(e) => setBulkApplyTo(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Selected Rows ({selectedProducts.size})</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="applyTo"
                    value="filtered"
                    checked={bulkApplyTo === 'filtered'}
                    onChange={(e) => setBulkApplyTo(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Filtered Products ({filteredProducts.length})</span>
                </label>
              </div>
            </div>

            {/* Price Guards */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <ApperIcon name="Shield" size={16} className="text-yellow-600" />
                <span>Price Guards</span>
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• Min: Rs. 1 (enforced)</div>
                <div>• Max: Rs. 100,000 (enforced)</div>
                <div>• Auto-validation enabled</div>
              </div>
            </div>

            {/* Preview & Apply Buttons */}
            <div className="space-y-3">
              <Button
                variant="secondary"
                icon="Eye"
                onClick={generateBulkPreview}
                className="w-full"
              >
                Preview Changes
              </Button>
              
              {showBulkPreview && bulkPreview.length > 0 && (
                <Button
                  variant="primary"
                  icon="Check"
                  onClick={applyBulkUpdate}
                  className="w-full"
                >
                  Apply to {bulkPreview.length} Products
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Content - Search, Filter & Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ApperIcon name="Search" size={20} className="text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <Input
                label="Search Products"
                placeholder="Name, SKU, or Category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="Search"
              />

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRangeFilter.min}
                    onChange={(e) => setPriceRangeFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="input-field text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRangeFilter.max}
                    onChange={(e) => setPriceRangeFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
              </label>
              
              {(searchTerm || categoryFilter !== 'all' || priceRangeFilter.min || priceRangeFilter.max || lowStockFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="X"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setPriceRangeFilter({ min: '', max: '' });
                    setLowStockFilter(false);
                  }}
                  className="text-gray-500"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Product List View</h3>
                <div className="flex items-center space-x-4">
                  <Badge variant="info" className="text-sm">
                    {selectedProducts.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-primary"
                  >
                    {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-6">
                  <Empty 
                    title="No products found"
                    description={searchTerm ? `No products match "${searchTerm}"` : "No products available"}
                  />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Existing Prices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Prices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const currentPrices = getCurrentPrices(product);
                      const currentMargin = calculateMargin(currentPrices.basePrice, currentPrices.costPrice);
                      const hasChanges = editingPrices[product.id];
                      const isUpdating = updatingIds.has(product.id);
                      const isSelected = selectedProducts.has(product.id);

                      return (
                        <tr 
                          key={product.id} 
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleProductSelect(product.id)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>

                          {/* Product Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0">
                                <img
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={product.imageUrl || "/api/placeholder/60/60"}
                                  alt={product.name || "Product"}
                                  onError={(e) => {
                                    e.target.src = "/api/placeholder/60/60";
                                  }}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name || "Unnamed Product"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.category || "No Category"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Existing Prices Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-600">Base:</span>
                                <span className="ml-2 font-medium">Rs. {product.price || 0}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Cost:</span>
                                <span className="ml-2 font-medium">Rs. {product.purchasePrice || 0}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Margin:</span>
                                <Badge 
                                  variant={
                                    calculateMargin(product.price, product.purchasePrice) > 20 ? "success" : 
                                    calculateMargin(product.price, product.purchasePrice) > 10 ? "warning" : "error"
                                  }
                                  className="ml-2 text-xs"
                                >
                                  {calculateMargin(product.price, product.purchasePrice).toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </td>

                          {/* New Prices Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-3">
                              <div className="relative">
                                <Input
                                  label="Base Price"
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  max="100000"
                                  value={currentPrices.basePrice}
                                  onChange={(e) => handlePriceChange(product.id, 'basePrice', e.target.value)}
                                  className="w-32 text-sm"
                                  placeholder="0.00"
                                />
                                {hasChanges && editingPrices[product.id]?.basePrice !== undefined && (
                                  <div className="absolute -top-1 -right-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                              <div className="relative">
                                <Input
                                  label="Cost Price"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={currentPrices.costPrice}
                                  onChange={(e) => handlePriceChange(product.id, 'costPrice', e.target.value)}
                                  className="w-32 text-sm"
                                  placeholder="0.00"
                                />
                                {hasChanges && editingPrices[product.id]?.costPrice !== undefined && (
                                  <div className="absolute -top-1 -right-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Margin:</span>
                                <Badge 
                                  variant={
                                    currentMargin > 20 ? "success" : 
                                    currentMargin > 10 ? "warning" : "error"
                                  }
                                  className="ml-2 text-xs"
                                >
                                  {currentMargin.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </td>

                          {/* Status Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasChanges ? (
                              <Badge variant="warning" className="text-xs">
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-xs">
                                Updated
                              </Badge>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-2">
                              <Button
                                variant="primary"
                                size="sm"
                                icon="Check"
                                onClick={() => handleApplyPriceUpdate(product)}
                                disabled={!hasChanges || isUpdating}
                                loading={isUpdating}
                                className="w-full"
                              >
                                Apply
                              </Button>
                              {hasChanges && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon="RotateCcw"
                                  onClick={() => handleRevertChanges(product.id)}
                                  className="w-full text-gray-600 hover:text-gray-800"
                                >
                                  Revert
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

{/* Bulk Preview */}
          {/* Enhanced Bulk Preview with Change Highlighting */}
          {showBulkPreview && bulkPreview.length > 0 && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <ApperIcon name="Eye" size={16} />
                  <span>Bulk Update Preview: {bulkPreview.length} products</span>
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="success" className="text-xs">Green = Price ↑</Badge>
                    <Badge variant="error" className="text-xs">Red = Price ↓</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="X"
                    onClick={() => {
                      setBulkPreview([]);
                      setShowBulkPreview(false);
                    }}
                    className="text-gray-500"
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                <div className="bg-white rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delta Badge</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkPreview.slice(0, 10).map((product) => {
                        const priceChange = (product.priceChange || 0);
                        const originalPrice = product.price || 0;
                        const changePercentage = originalPrice > 0 ? ((priceChange / originalPrice) * 100) : 0;
                        const isIncrease = priceChange >= 0;
                        
                        return (
                          <tr 
                            key={product.id} 
                            className={`hover:bg-gray-50 transition-colors ${
                              isIncrease ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={product.imageUrl || "/api/placeholder/32/32"}
                                  alt={product.name || "Product"}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    e.target.src = "/api/placeholder/32/32";
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{product.name || "Unnamed Product"}</p>
                                  <p className="text-xs text-gray-500">{product.category || "No Category"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-900">Rs. {originalPrice}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${
                                isIncrease ? 'text-green-700' : 'text-red-700'
                              }`}>
                                Rs. {product.newPrice || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <ApperIcon 
                                  name={isIncrease ? "TrendingUp" : "TrendingDown"} 
                                  size={12} 
                                  className={isIncrease ? "text-green-600" : "text-red-600"}
                                />
                                <Badge 
                                  variant={isIncrease ? "success" : "error"} 
                                  className="text-xs font-bold"
                                >
                                  {isIncrease ? '+' : ''}Rs.{Math.abs(priceChange).toFixed(2)} ({Math.abs(changePercentage).toFixed(1)}%)
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {bulkPreview.length > 10 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-500 text-center">
                        ... and {bulkPreview.length - 10} more products
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkPriceManager;