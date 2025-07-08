import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Badge from '@/components/atoms/Badge';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import Empty from '@/components/ui/Empty';
import { productService } from '@/services/api/productService';

const BulkPriceUpdate = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [editingPrices, setEditingPrices] = useState({});

  // Debounce search term with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return products;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    return products.filter(product => {
      if (!product) return false;
      
      return (
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower))
      );
    });
  }, [products, debouncedSearchTerm]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  // Handle price input changes
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

      toast.success(`Updated prices for ${product.name}`);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Price Update Interface</h1>
          <p className="text-gray-600">Search and update product prices efficiently</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Badge variant="info" className="text-sm">
            {filteredProducts.length} products
          </Badge>
          <Button
            variant="outline"
            icon="ArrowLeft"
            onClick={() => window.history.back()}
          >
            Back to Products
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="max-w-2xl">
          <Input
            label="Search Products"
            placeholder="Search products by name, SKU, or category"
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            icon="Search"
            showClearButton={true}
            className="text-lg"
          />
          {debouncedSearchTerm && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
              <ApperIcon name="Filter" size={14} />
              <span>Filtering by: "{debouncedSearchTerm}"</span>
              <span className="text-blue-600">({filteredProducts.length} results)</span>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Product Price Management</h2>
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
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Existing Prices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Prices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Update Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const currentPrices = getCurrentPrices(product);
                  const currentMargin = calculateMargin(currentPrices.basePrice, currentPrices.costPrice);
                  const hasChanges = editingPrices[product.id];
                  const isUpdating = updatingIds.has(product.id);

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {/* Product Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-15 w-15 flex-shrink-0">
                            <img
                              className="h-15 w-15 rounded-lg object-cover"
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
                              SKU: {product.sku || product.barcode || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Existing Prices Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-gray-600">Base Price:</span>
                            <span className="ml-2 font-medium">Rs. {product.price || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Cost Price:</span>
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
                          <div>
                            <Input
                              label="Base Price (New)"
                              type="number"
                              step="0.01"
                              min="1"
                              value={currentPrices.basePrice}
                              onChange={(e) => handlePriceChange(product.id, 'basePrice', e.target.value)}
                              className="w-32 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Input
                              label="Cost Price (New)"
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentPrices.costPrice}
                              onChange={(e) => handlePriceChange(product.id, 'costPrice', e.target.value)}
                              className="w-32 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Margin (New):</span>
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

                      {/* Update Action Column */}
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
                            {isUpdating ? 'Applying...' : 'Apply'}
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
    </div>
  );
};

export default BulkPriceUpdate;