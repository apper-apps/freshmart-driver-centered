import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "@/hooks/useCart";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Cart from "@/components/pages/Cart";
import { productService } from "@/services/api/productService";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, isLoading: cartLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getById(parseInt(productId));
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    toast.success(`${quantity} x ${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

const getPriceChange = () => {
    if (product?.previousPrice && product.previousPrice !== product.price) {
      const change = ((product.price - product.previousPrice) / product.previousPrice) * 100;
      return change;
    }
    return null;
  };

  const getActiveDeal = () => {
    if (!product?.dealType || !product?.dealValue) return null;
    
    if (product.dealType === 'BOGO') {
      return {
        type: 'BOGO',
        title: 'Buy 1 Get 1 FREE',
        description: 'Add 2 items to get one absolutely free!',
        icon: 'Gift',
        color: 'success',
        minQuantity: 2
      };
    } else if (product.dealType === 'Bundle') {
      const [buyQty, payQty] = product.dealValue.split('for').map(x => parseInt(x.trim()));
      return {
        type: 'Bundle',
        title: `${product.dealValue} Deal`,
        description: `Buy ${buyQty} items, pay for only ${payQty}!`,
        icon: 'Package',
        color: 'primary',
        minQuantity: buyQty,
        saveCount: buyQty - payQty
      };
    }
    
    return null;
  };

  const calculateDealSavings = (qty) => {
    const deal = getActiveDeal();
    if (!deal || qty < deal.minQuantity) return 0;
    
    if (deal.type === 'BOGO' && qty >= 2) {
      const freeItems = Math.floor(qty / 2);
      return freeItems * product.price;
    } else if (deal.type === 'Bundle' && qty >= deal.minQuantity) {
      const bundleSets = Math.floor(qty / deal.minQuantity);
      const freeItems = bundleSets * deal.saveCount;
      return freeItems * product.price;
    }
    
    return 0;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadProduct} type="not-found" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message="Product not found" onRetry={() => navigate('/category/All')} type="not-found" />
      </div>
    );
  }

const priceChange = getPriceChange();
const activeDeal = getActiveDeal();

// Calculate dynamic image dimensions with aspect ratio enforcement for 1:1 framing
  const calculateImageDimensions = () => {
    // Get viewport width for responsive sizing
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    
    // Base size calculation with responsive scaling
    let baseSize = 600;
    
    // Responsive adjustments for mobile-first design
    if (viewportWidth < 640) {
      // Mobile: 400-500px with padding consideration
      baseSize = Math.max(400, Math.min(viewportWidth - 32, 500)); 
    } else if (viewportWidth < 1024) {
      // Tablet: 500-700px for comfortable viewing
      baseSize = Math.max(500, Math.min(viewportWidth * 0.4, 700)); 
    } else {
      // Desktop: 600-1200px for detailed product viewing
      baseSize = Math.max(600, Math.min(viewportWidth * 0.3, 1200)); 
    }
    
    // Enforce platform constraints (400x400px to 1200x1200px) for consistent framing
    const constrainedSize = Math.max(400, Math.min(baseSize, 1200));
    
    // Ensure perfect 1:1 aspect ratio for consistent product display
    return {
      width: constrainedSize,
      height: constrainedSize,
      aspectRatio: '1 / 1'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ApperIcon name="ArrowLeft" size={20} />
          <span>Back</span>
        </button>
      </nav>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image with Enhanced 1:1 Frame Display */}
        <div className="space-y-4">
          <div className="relative">
            <div 
              className="mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative shadow-lg"
              style={{
                width: `${calculateImageDimensions().width}px`,
                height: `${calculateImageDimensions().height}px`,
                aspectRatio: calculateImageDimensions().aspectRatio
              }}
            >
              {/* Enhanced Progressive Image Loading with WebP Support */}
              <picture className="block w-full h-full">
                <source
                  srcSet={`${product.imageUrl}&fm=webp&w=${calculateImageDimensions().width}&h=${calculateImageDimensions().height}&fit=crop&crop=center 1x, ${product.imageUrl}&fm=webp&w=${calculateImageDimensions().width * 2}&h=${calculateImageDimensions().height * 2}&fit=crop&crop=center&dpr=2 2x`}
                  type="image/webp"
                />
                <img
                  src={`${product.imageUrl}&w=${calculateImageDimensions().width}&h=${calculateImageDimensions().height}&fit=crop&crop=center`}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105 image-loaded"
                  style={{ 
                    backgroundColor: '#f3f4f6',
                    aspectRatio: '1 / 1'
                  }}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/api/placeholder/600/600";
                  }}
                />
              </picture>
              
              {/* Frame Compatibility Indicator */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-md">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">1:1 Frame</span>
                </div>
              </div>
</div>
</div>
            
            {/* Stock Status Badges */}
            {product.stock <= 10 && product.stock > 0 && (
              <Badge 
                variant="warning" 
                className="absolute top-4 left-4"
              >
                Low Stock
              </Badge>
            )}
            
            {product.stock === 0 && (
              <Badge 
                variant="danger" 
                className="absolute top-4 left-4"
              >
                Out of Stock
              </Badge>
            )}
)}
            
            {/* Multiple Badge Elements - Wrapped in Fragment */}
            <>
              {/* Price Change Badge */}
              {priceChange && (
                <Badge 
                  variant={priceChange > 0 ? 'danger' : 'sale'} 
                  className="absolute top-4 right-4 text-sm font-bold shadow-lg"
                >
                  {priceChange > 0 ? 'PRICE UP' : 'SALE'} {Math.abs(priceChange).toFixed(1)}% OFF
                </Badge>
              )}
              
              {/* Auto-Generated Offer Badge */}
              {product.discountValue && product.discountValue > 0 && (
                <Badge 
                  variant="promotional" 
                  className="absolute top-4 left-4 text-sm font-bold"
                >
                  {product.discountType === 'Percentage' 
                    ? `${product.discountValue}% OFF` 
                    : `Rs. ${product.discountValue} OFF`
                  }
                </Badge>
              )}

              {/* Special Deal Badge */}
              {activeDeal && (
                <Badge 
                  variant={activeDeal.color} 
                  className="absolute bottom-4 left-4 text-sm font-bold animate-pulse shadow-lg"
                >
                  <ApperIcon name={activeDeal.icon} size={14} className="mr-1" />
                  {activeDeal.title}
                </Badge>
              )}
            </>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <Badge variant="primary" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
          </div>
{/* Enhanced Price Section with History Tracking */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-4xl font-bold gradient-text">
                  Rs. {product.price.toLocaleString()}
                </span>
                <Badge variant="success" className="text-xs font-bold animate-pulse">
                  <ApperIcon name="Radio" size={12} className="mr-1" />
                  LIVE
                </Badge>
                <span className="text-lg text-gray-500">
                  /{product.unit}
                </span>
              </div>
              <PriceHistoryButton product={product} />
            </div>
            
            {/* Last Updated Timestamp */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <ApperIcon name="Clock" size={14} />
              <span>Last Updated: {new Date(product.lastUpdated || Date.now()).toLocaleDateString()} at {new Date(product.lastUpdated || Date.now()).toLocaleTimeString()}</span>
            </div>
            
            {product.previousPrice && product.previousPrice !== product.price && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Badge variant="strikethrough" className="text-base px-3 py-1 line-through">
                    Rs. {product.previousPrice.toLocaleString()}
                  </Badge>
                  <Badge 
                    variant={priceChange > 0 ? 'danger' : 'sale'} 
                    className="text-sm font-bold animate-pulse"
                  >
                    {priceChange > 0 ? 'PRICE UP!' : `SAVE ${Math.abs(priceChange).toFixed(1)}%`}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${priceChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {priceChange > 0 ? 'Price increased' : 'You save'} Rs. {Math.abs(product.price - product.previousPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

            {/* Enhanced Discount Section with Offer Dropdown */}
            <DiscountSection 
              product={product} 
              quantity={quantity} 
              onDiscountChange={(discount) => {
                // Handle discount selection logic
                console.log('Selected discount:', discount);
              }}
            />

            {/* Special Deal Information */}
            {activeDeal && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <ApperIcon name={activeDeal.icon} size={20} className="text-green-600" />
                  <h4 className="font-semibold text-green-800">{activeDeal.title}</h4>
                </div>
                <p className="text-sm text-green-700">{activeDeal.description}</p>
                
                {quantity >= activeDeal.minQuantity && (
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Your Deal Savings:</span>
                      <span className="text-lg font-bold text-green-600">
                        Rs. {calculateDealSavings(quantity).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {activeDeal.type === 'BOGO' 
                        ? `You get ${Math.floor(quantity / 2)} free item${Math.floor(quantity / 2) > 1 ? 's' : ''}!`
                        : `You save on ${Math.floor(quantity / activeDeal.minQuantity) * activeDeal.saveCount} item${Math.floor(quantity / activeDeal.minQuantity) * activeDeal.saveCount > 1 ? 's' : ''}!`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Benefits & Quality */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <ApperIcon name="Star" size={20} className="text-green-600" />
              <span>Why Choose This Product</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product Benefits */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Leaf" size={16} className="text-green-600" />
                  <Badge variant="success">Farm Fresh</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Sourced directly from local farms, ensuring maximum freshness and nutritional value
                </p>
              </div>
              
              {/* Usage Suggestions */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="ChefHat" size={16} className="text-blue-600" />
                  <Badge variant="primary">Perfect for Biryani</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Ideal texture and aroma for traditional dishes, curries, and festive cooking
                </p>
              </div>
              
              {/* Quality Badge */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ApperIcon name="Award" size={16} className="text-purple-600" />
                  <Badge variant="warning">Premium Quality</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Carefully selected and quality tested to meet the highest standards
                </p>
              </div>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <ApperIcon name="Package" size={20} className="text-gray-500" />
            <span className="text-gray-700">
              {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
            </span>
          </div>
          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Minus" size={16} />
                </button>
                
                <span className="text-xl font-semibold min-w-[3rem] text-center">
                  {quantity}
                </span>
                
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="Plus" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {product.stock > 0 ? (
              <>
                <Button
                  variant="primary"
                  size="large"
                  icon="ShoppingCart"
                  onClick={handleAddToCart}
                  loading={cartLoading}
                  className="w-full"
                >
Add to Cart - Rs. {((product.price * quantity) - calculateDealSavings(quantity)).toLocaleString()}
                  {calculateDealSavings(quantity) > 0 && (
                    <span className="text-xs block text-green-600 font-normal">
                      Save Rs. {calculateDealSavings(quantity).toLocaleString()} with {activeDeal?.title}!
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  icon="Zap"
                  onClick={handleBuyNow}
                  loading={cartLoading}
                  className="w-full"
                >
                  Buy Now
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="large"
                disabled
                className="w-full"
              >
                Out of Stock
              </Button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <ApperIcon name="Truck" size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Fast Delivery</p>
                <p className="text-sm text-gray-600">Same day delivery</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ApperIcon name="Shield" size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quality Assured</p>
                <p className="text-sm text-gray-600">Fresh guarantee</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <ApperIcon name="CreditCard" size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Secure Payment</p>
                <p className="text-sm text-gray-600">Multiple options</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <ApperIcon name="RotateCcw" size={20} className="text-orange-600" />
              </div>
<div>
                <p className="font-medium text-gray-900">Easy Returns</p>
                <p className="text-sm text-gray-600">Hassle-free policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// Enhanced Discount Section Component with Offer Dropdown
const DiscountSection = ({ product, quantity, onDiscountChange }) => {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [showOfferDropdown, setShowOfferDropdown] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);

  // Smart offer recommendations based on product and context
  const generateSmartOffers = () => {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isRamadan = now.getMonth() === 2 || now.getMonth() === 3; // Approximate
    const isEid = now.getMonth() === 4 && now.getDate() <= 15; // Approximate
    
    const baseOffers = [
      {
        id: 'percentage_10',
        type: 'percentage',
        value: 10,
        title: '10% OFF',
        description: 'Save 10% on this item',
        icon: 'Percent',
        color: 'sale',
        conditions: { minQuantity: 1 }
      },
      {
        id: 'percentage_15',
        type: 'percentage',
        value: 15,
        title: '15% OFF',
        description: 'Great savings on quality products',
        icon: 'Tag',
        color: 'promotional',
        conditions: { minQuantity: 2 }
      },
      {
        id: 'percentage_20',
        type: 'percentage',
        value: 20,
        title: '20% OFF',
        description: 'Maximum savings opportunity',
        icon: 'Gift',
        color: 'featured',
        conditions: { minQuantity: 3 }
      },
      {
        id: 'fixed_50',
        type: 'fixed',
        value: 50,
        title: 'Rs. 50 OFF',
        description: 'Instant discount of Rs. 50',
        icon: 'DollarSign',
        color: 'success',
        conditions: { minAmount: 500 }
      },
      {
        id: 'fixed_100',
        type: 'fixed',
        value: 100,
        title: 'Rs. 100 OFF',
        description: 'Big savings on your purchase',
        icon: 'Award',
        color: 'warning',
        conditions: { minAmount: 1000 }
      }
    ];

    // Category-specific offers
    const categoryOffers = {
      'Groceries': [
        {
          id: 'bulk_grocery',
          type: 'percentage',
          value: 12,
          title: 'Bulk Grocery Deal',
          description: '12% off on bulk grocery items',
          icon: 'ShoppingCart',
          color: 'info',
          conditions: { minQuantity: 5 }
        }
      ],
      'Fruits': [
        {
          id: 'fresh_fruit',
          type: 'percentage',
          value: 8,
          title: 'Fresh Fruit Special',
          description: 'Farm fresh discount',
          icon: 'Apple',
          color: 'success',
          conditions: { minQuantity: 2 }
        }
      ],
      'Vegetables': [
        {
          id: 'veggie_pack',
          type: 'percentage',
          value: 15,
          title: 'Veggie Pack Deal',
          description: 'Healthy choices, great prices',
          icon: 'Leaf',
          color: 'success',
          conditions: { minQuantity: 3 }
        }
      ]
    };

    // Seasonal offers
    const seasonalOffers = [];
    
    if (isRamadan) {
      seasonalOffers.push({
        id: 'ramadan_special',
        type: 'percentage',
        value: 25,
        title: 'Ramadan Special',
        description: 'Blessed month special discount',
        icon: 'Star',
        color: 'featured',
        seasonal: true,
        conditions: { minQuantity: 1 }
      });
    }

    if (isEid) {
      seasonalOffers.push({
        id: 'eid_celebration',
        type: 'percentage',
        value: 30,
        title: 'Eid Celebration',
        description: 'Celebrate with amazing savings',
        icon: 'Gift',
        color: 'promotional',
        seasonal: true,
        conditions: { minQuantity: 1 }
      });
    }

    if (isWeekend) {
      seasonalOffers.push({
        id: 'weekend_special',
        type: 'percentage',
        value: 18,
        title: 'Weekend Special',
        description: 'Weekend savings for families',
        icon: 'Calendar',
        color: 'warning',
        conditions: { minQuantity: 2 }
      });
    }

    // Combine all offers
    const allOffers = [
      ...baseOffers,
      ...(categoryOffers[product.category] || []),
      ...seasonalOffers
    ];

    // Filter offers based on current quantity and cart value
    const cartValue = product.price * quantity;
    return allOffers.filter(offer => {
      const { minQuantity = 1, minAmount = 0 } = offer.conditions;
      return quantity >= minQuantity && cartValue >= minAmount;
    });
  };

  // Calculate discount amount
  const calculateDiscount = (offer) => {
    if (!offer) return 0;
    
    const totalPrice = product.price * quantity;
    
    if (offer.type === 'percentage') {
      return (totalPrice * offer.value) / 100;
    } else if (offer.type === 'fixed') {
      return Math.min(offer.value, totalPrice);
    }
    
    return 0;
  };

  // Calculate final price after discount
  const calculateFinalPrice = (offer) => {
    const discount = calculateDiscount(offer);
    return (product.price * quantity) - discount;
  };

  // Initialize offers on component mount
  useEffect(() => {
    const offers = generateSmartOffers();
    setAvailableOffers(offers);
    
    // Auto-select best seasonal offer if available
    const seasonalOffer = offers.find(offer => offer.seasonal);
    if (seasonalOffer && !selectedOffer) {
      setSelectedOffer(seasonalOffer);
      onDiscountChange && onDiscountChange(seasonalOffer);
    }
  }, [product, quantity]);

  const handleOfferSelect = (offer) => {
    setSelectedOffer(offer);
    setShowOfferDropdown(false);
    onDiscountChange && onDiscountChange(offer);
    
    // Add to applied discounts if not already applied
    if (!appliedDiscounts.find(d => d.id === offer.id)) {
      setAppliedDiscounts(prev => [...prev, offer]);
    }
  };

  const removeOffer = (offerId) => {
    setAppliedDiscounts(prev => prev.filter(d => d.id !== offerId));
    if (selectedOffer?.id === offerId) {
      setSelectedOffer(null);
      onDiscountChange && onDiscountChange(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offer Selection Dropdown */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ApperIcon name="Tag" size={20} className="text-orange-600" />
            <h4 className="font-medium text-gray-900">Available Offers</h4>
            {availableOffers.length > 0 && (
              <Badge variant="promotional" className="text-xs">
                {availableOffers.length} offers
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowOfferDropdown(!showOfferDropdown)}
            className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-800 transition-colors"
          >
            <span>Browse Offers</span>
            <ApperIcon 
              name={showOfferDropdown ? "ChevronUp" : "ChevronDown"} 
              size={16} 
            />
          </button>
        </div>

        {/* Offer Dropdown */}
        {showOfferDropdown && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableOffers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => handleOfferSelect(offer)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedOffer?.id === offer.id
                    ? 'border-orange-500 bg-orange-100'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-orange-100">
                      <ApperIcon name={offer.icon} size={16} className="text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{offer.title}</span>
                        {offer.seasonal && (
                          <Badge variant="featured" className="text-xs">Limited Time</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{offer.description}</p>
                      <p className="text-xs text-gray-500">
                        Min quantity: {offer.conditions.minQuantity || 1}
                        {offer.conditions.minAmount && ` • Min amount: Rs. ${offer.conditions.minAmount}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      Save Rs. {calculateDiscount(offer).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Final: Rs. {calculateFinalPrice(offer).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {availableOffers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <ApperIcon name="Tag" size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No offers available for current selection</p>
                <p className="text-sm">Try adding more items to unlock deals</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Offer Display */}
        {selectedOffer && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant={selectedOffer.color} className="text-sm font-bold">
                  {selectedOffer.title}
                </Badge>
                {selectedOffer.seasonal && (
                  <Badge variant="warning" className="text-xs animate-pulse">
                    Limited Time
                  </Badge>
                )}
              </div>
              <button
                onClick={() => removeOffer(selectedOffer.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <ApperIcon name="X" size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original:</span>
                <span className="ml-2 line-through text-gray-500">
                  Rs. {(product.price * quantity).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Discount:</span>
                <span className="ml-2 font-medium text-red-600">
                  -Rs. {calculateDiscount(selectedOffer).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Final Price:</span>
                <span className="ml-2 font-bold text-green-600">
                  Rs. {calculateFinalPrice(selectedOffer).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offer Stack Display */}
      {appliedDiscounts.length > 1 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-3">
            <ApperIcon name="Layers" size={16} className="text-purple-600" />
            <span className="font-medium text-gray-900">Offer Stack</span>
            <Badge variant="featured" className="text-xs">Multiple Discounts</Badge>
          </div>
          <div className="space-y-2">
            {appliedDiscounts.map((discount, index) => (
              <div key={discount.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{discount.title}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 font-medium">
                    -Rs. {calculateDiscount(discount).toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeOffer(discount.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <ApperIcon name="X" size={12} />
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-purple-200">
              <div className="flex items-center justify-between font-bold">
                <span>Total Savings:</span>
                <span className="text-green-600">
                  -Rs. {appliedDiscounts.reduce((total, discount) => 
                    total + calculateDiscount(discount), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowOfferDropdown(!showOfferDropdown)}
          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
        >
          <ApperIcon name="Search" size={12} className="inline mr-1" />
          Browse All Offers
        </button>
        
        {availableOffers.some(offer => offer.seasonal) && (
          <button
            onClick={() => {
              const seasonalOffer = availableOffers.find(offer => offer.seasonal);
              if (seasonalOffer) handleOfferSelect(seasonalOffer);
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors animate-pulse"
          >
            <ApperIcon name="Star" size={12} className="inline mr-1" />
            Apply Seasonal Deal
          </button>
        )}
        
        {selectedOffer && (
          <button
            onClick={() => {
              setSelectedOffer(null);
              setAppliedDiscounts([]);
              onDiscountChange && onDiscountChange(null);
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            <ApperIcon name="RotateCcw" size={12} className="inline mr-1" />
Clear Offers
          </button>
        )}
      </div>
    </div>
  );
};

// Price History Button Component
const PriceHistoryButton = ({ product }) => {
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <ApperIcon name="TrendingUp" size={16} />
        <span>Price History</span>
      </button>
      
      {showHistory && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Price:</span>
              <span className="font-medium">Rs. {product.price.toLocaleString()}</span>
            </div>
            {product.previousPrice && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Previous Price:</span>
                <span className="font-medium">Rs. {product.previousPrice.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(product.lastUpdated || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;