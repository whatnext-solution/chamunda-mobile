import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  Percent,
  Package,
  Search,
  Filter,
  Eye,
  EyeOff,
  ShoppingBag,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOffersWithProducts } from '@/hooks/useOfferProducts';
import { useProducts } from '@/hooks/useProducts';
import { ProductImage } from '@/components/ui/StandardizedImage';
import { toast } from 'sonner';

interface OfferFormData {
  title: string;
  description: string;
  banner_url: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  selected_products: string[];
  // FOMO fields
  offer_type: 'regular' | 'flash_sale' | 'limited_stock' | 'countdown' | 'bundle';
  max_quantity: number | null;
  flash_sale_duration: number | null;
  urgency_message: string;
  show_countdown: boolean;
  show_stock_warning: boolean;
  stock_warning_threshold: number;
  priority_level: number;
  auto_expire: boolean;
}

const defaultFormData: OfferFormData = {
  title: '',
  description: '',
  banner_url: '',
  discount_percentage: 0,
  start_date: '',
  end_date: '',
  is_active: true,
  selected_products: [],
  // FOMO defaults
  offer_type: 'regular',
  max_quantity: null,
  flash_sale_duration: null,
  urgency_message: '',
  show_countdown: false,
  show_stock_warning: false,
  stock_warning_threshold: 10,
  priority_level: 1,
  auto_expire: false
};

export default function OfferManagement() {
  const { data: offersWithProducts, refetch: refetchOffers } = useOffersWithProducts();
  const { data: allProducts } = useProducts();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterOfferType, setFilterOfferType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter products based on search
  const filteredProducts = allProducts?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter offers based on active status and offer type
  const filteredOffers = offersWithProducts?.filter(offer => {
    const matchesStatus = showInactive ? true : offer.is_active;
    const matchesType = filterOfferType === 'all' || offer.offer_type === filterOfferType;
    return matchesStatus && matchesType;
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const paginatedOffers = filteredOffers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [showInactive, filterOfferType]);

  const handleInputChange = (field: keyof OfferFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductSelection = (productId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_products: checked
        ? [...prev.selected_products, productId]
        : prev.selected_products.filter(id => id !== productId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ FIX: Validation - Title required
    if (!formData.title.trim()) {
      toast.error('Please enter an offer title');
      return;
    }

    // ✅ FIX: Validation - Discount percentage (0-100%)
    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      toast.error('Discount percentage must be between 0 and 100');
      return;
    }

    // ✅ FIX: Validation - Date range
    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        toast.error('End date must be after start date');
        return;
      }
    }

    // ✅ FIX: Validation - At least one product selected
    if (formData.selected_products.length === 0) {
      toast.error('Please select at least one product for this offer');
      return;
    }

    // ✅ FIX: Validation - Flash sale duration
    if (formData.offer_type === 'flash_sale' && !formData.flash_sale_duration) {
      toast.error('Please enter flash sale duration');
      return;
    }

    setLoading(true);
    try {
      let offerId: string;

      if (editingOffer) {
        // Update existing offer
        const { error: updateError } = await supabase
          .from('offers')
          .update({
            title: formData.title,
            description: formData.description || null,
            banner_url: formData.banner_url || null,
            discount_percentage: formData.discount_percentage || null,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            is_active: formData.is_active,
            // FOMO fields
            offer_type: formData.offer_type,
            max_quantity: formData.max_quantity,
            flash_sale_duration: formData.flash_sale_duration,
            urgency_message: formData.urgency_message || null,
            show_countdown: formData.show_countdown,
            show_stock_warning: formData.show_stock_warning,
            stock_warning_threshold: formData.stock_warning_threshold,
            priority_level: formData.priority_level,
            auto_expire: formData.auto_expire,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOffer);

        if (updateError) throw updateError;
        offerId = editingOffer;
        toast.success('Offer updated successfully');
      } else {
        // Create new offer
        const { data: newOffer, error: createError } = await supabase
          .from('offers')
          .insert({
            title: formData.title,
            description: formData.description || null,
            banner_url: formData.banner_url || null,
            discount_percentage: formData.discount_percentage || null,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            is_active: formData.is_active,
            // FOMO fields
            offer_type: formData.offer_type,
            max_quantity: formData.max_quantity,
            flash_sale_duration: formData.flash_sale_duration,
            urgency_message: formData.urgency_message || null,
            show_countdown: formData.show_countdown,
            show_stock_warning: formData.show_stock_warning,
            stock_warning_threshold: formData.stock_warning_threshold,
            priority_level: formData.priority_level,
            auto_expire: formData.auto_expire
          })
          .select()
          .single();

        if (createError) throw createError;
        offerId = newOffer.id;
        toast.success('Offer created successfully');
      }

      // Update offer-product associations
      if (formData.selected_products.length > 0) {
        // Remove existing associations
        await supabase
          .from('offer_products')
          .delete()
          .eq('offer_id', offerId);

        // Add new associations
        const offerProducts = formData.selected_products.map(productId => ({
          offer_id: offerId,
          product_id: productId
        }));

        const { error: associationError } = await supabase
          .from('offer_products')
          .insert(offerProducts);

        if (associationError) throw associationError;
      }

      // Reset form and close
      setFormData(defaultFormData);
      setIsFormOpen(false);
      setEditingOffer(null);
      refetchOffers();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast.error(error.message || 'Failed to save offer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (offer: any) => {
    setFormData({
      title: offer.title,
      description: offer.description || '',
      banner_url: offer.banner_url || '',
      discount_percentage: offer.discount_percentage || 0,
      start_date: offer.start_date.split('T')[0],
      end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
      is_active: offer.is_active,
      selected_products: offer.products.map((p: any) => p.id),
      // FOMO fields
      offer_type: offer.offer_type || 'regular',
      max_quantity: offer.max_quantity,
      flash_sale_duration: offer.flash_sale_duration,
      urgency_message: offer.urgency_message || '',
      show_countdown: offer.show_countdown || false,
      show_stock_warning: offer.show_stock_warning || false,
      stock_warning_threshold: offer.stock_warning_threshold || 10,
      priority_level: offer.priority_level || 1,
      auto_expire: offer.auto_expire || false
    });
    setEditingOffer(offer.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This will also remove all product associations.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      toast.success('Offer deleted successfully');
      refetchOffers();
    } catch (error: any) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;
      toast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      refetchOffers();
    } catch (error: any) {
      console.error('Error toggling offer status:', error);
      toast.error('Failed to update offer status');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Offer Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create and manage special offers with product associations
          </p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="h-11 sm:h-10 md:h-11 touch-manipulation w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  className="touch-manipulation"
                />
                <Label htmlFor="show-inactive" className="text-xs sm:text-sm cursor-pointer">
                  Show inactive offers
                </Label>
              </div>
              
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <Label className="text-xs sm:text-sm whitespace-nowrap">Offer Type:</Label>
                <Select value={filterOfferType} onValueChange={setFilterOfferType}>
                  <SelectTrigger className="w-full sm:w-48 h-9 sm:h-8 md:h-9">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="flash_sale">Flash Sale</SelectItem>
                    <SelectItem value="limited_stock">Limited Stock</SelectItem>
                    <SelectItem value="countdown">Countdown</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Badge variant="secondary" className="w-fit">
                {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offers List */}
      <div className="grid gap-4 sm:gap-5 md:gap-6">
        {filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Offers Found</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {showInactive ? 'No offers available.' : 'No active offers found. Try showing inactive offers or create a new one.'}
              </p>
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Offer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedOffers.map((offer) => (
            <Card key={offer.id} className={!offer.is_active ? 'opacity-60' : ''}>
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base sm:text-lg md:text-xl">{offer.title}</CardTitle>
                      <Badge variant={offer.is_active ? 'default' : 'secondary'} className="text-xs">
                        {offer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {offer.discount_percentage && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          <Percent className="h-3 w-3 mr-1" />
                          {offer.discount_percentage}% OFF
                        </Badge>
                      )}
                    </div>
                    {offer.description && (
                      <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">{offer.description}</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">Start: {new Date(offer.start_date).toLocaleDateString()}</span>
                      </div>
                      {offer.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">End: {new Date(offer.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        {offer.products.length} product{offer.products.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col lg:flex-row items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                      className="h-9 sm:h-8 md:h-9 touch-manipulation flex-1 sm:flex-none"
                    >
                      {offer.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="ml-2 sm:hidden lg:inline">{offer.is_active ? 'Hide' : 'Show'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(offer)}
                      className="h-9 sm:h-8 md:h-9 touch-manipulation flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="ml-2 sm:hidden lg:inline">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(offer.id)}
                      className="text-red-600 hover:text-red-700 h-9 sm:h-8 md:h-9 touch-manipulation flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2 sm:hidden lg:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {offer.products.length > 0 && (
                <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="font-medium text-sm sm:text-base">Associated Products</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {offer.products.map((product: any) => (
                        <div key={product.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">₹{product.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-9 touch-manipulation"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 touch-manipulation"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
        )}
      </div>

      {/* Offer Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <Card className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto">
            <CardHeader className="p-4 sm:p-5 md:p-6 sticky top-0 bg-white dark:bg-gray-950 z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">
                  {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingOffer(null);
                    setFormData(defaultFormData);
                  }}
                  className="h-9 w-9 touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium mb-1.5 block">
                      Offer Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter offer title"
                      required
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_percentage" className="text-sm font-medium mb-1.5 block">
                      Discount Percentage
                    </Label>
                    <Input
                      id="discount_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => handleInputChange('discount_percentage', Number(e.target.value))}
                      placeholder="0"
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter offer description"
                    rows={3}
                    className="resize-none touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="banner_url" className="text-sm font-medium mb-1.5 block">
                    Banner Image URL
                  </Label>
                  <Input
                    id="banner_url"
                    value={formData.banner_url}
                    onChange={(e) => handleInputChange('banner_url', e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="start_date" className="text-sm font-medium mb-1.5 block">
                      Start Date *
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      required
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date" className="text-sm font-medium mb-1.5 block">
                      End Date
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    className="touch-manipulation"
                  />
                  <Label htmlFor="is_active" className="text-sm cursor-pointer">Active Offer</Label>
                </div>

                <Separator />

                {/* FOMO Settings */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                    FOMO Settings
                  </h3>
                  
                  {/* Offer Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="offer_type" className="text-sm font-medium mb-1.5 block">
                        Offer Type
                      </Label>
                      <Select
                        value={formData.offer_type}
                        onValueChange={(value) => handleInputChange('offer_type', value)}
                      >
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                          <SelectValue placeholder="Select offer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular Offer</SelectItem>
                          <SelectItem value="flash_sale">Flash Sale</SelectItem>
                          <SelectItem value="limited_stock">Limited Stock</SelectItem>
                          <SelectItem value="countdown">Countdown Deal</SelectItem>
                          <SelectItem value="bundle">Bundle Offer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority_level" className="text-sm font-medium mb-1.5 block">
                        Priority Level
                      </Label>
                      <Select
                        value={formData.priority_level.toString()}
                        onValueChange={(value) => handleInputChange('priority_level', parseInt(value))}
                      >
                        <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low Priority</SelectItem>
                          <SelectItem value="2">Medium Priority</SelectItem>
                          <SelectItem value="3">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Stock Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="max_quantity" className="text-sm font-medium mb-1.5 block">
                        Maximum Quantity (Optional)
                      </Label>
                      <Input
                        id="max_quantity"
                        type="number"
                        min="1"
                        value={formData.max_quantity || ''}
                        onChange={(e) => handleInputChange('max_quantity', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Leave empty for unlimited"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Set a limit to create scarcity
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="stock_warning_threshold" className="text-sm font-medium mb-1.5 block">
                        Stock Warning Threshold
                      </Label>
                      <Input
                        id="stock_warning_threshold"
                        type="number"
                        min="1"
                        value={formData.stock_warning_threshold}
                        onChange={(e) => handleInputChange('stock_warning_threshold', parseInt(e.target.value))}
                        placeholder="10"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Show "low stock" when remaining items ≤ this number
                      </p>
                    </div>
                  </div>

                  {/* Flash Sale Duration */}
                  {formData.offer_type === 'flash_sale' && (
                    <div>
                      <Label htmlFor="flash_sale_duration" className="text-sm font-medium mb-1.5 block">
                        Flash Sale Duration (minutes)
                      </Label>
                      <Input
                        id="flash_sale_duration"
                        type="number"
                        min="5"
                        max="1440"
                        value={formData.flash_sale_duration || ''}
                        onChange={(e) => handleInputChange('flash_sale_duration', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="120"
                        className="h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration for each flash sale slot (5-1440 minutes)
                      </p>
                    </div>
                  )}

                  {/* Urgency Message */}
                  <div>
                    <Label htmlFor="urgency_message" className="text-sm font-medium mb-1.5 block">
                      Urgency Message
                    </Label>
                    <Input
                      id="urgency_message"
                      value={formData.urgency_message}
                      onChange={(e) => handleInputChange('urgency_message', e.target.value)}
                      placeholder="Limited time offer - Act fast!"
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom message to create urgency
                    </p>
                  </div>

                  {/* FOMO Display Options */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm sm:text-base">Display Options</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show_countdown"
                        checked={formData.show_countdown}
                        onCheckedChange={(checked) => handleInputChange('show_countdown', checked)}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="show_countdown" className="flex items-center gap-2 text-sm cursor-pointer">
                        <Clock className="h-4 w-4" />
                        Show Countdown Timer
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show_stock_warning"
                        checked={formData.show_stock_warning}
                        onCheckedChange={(checked) => handleInputChange('show_stock_warning', checked)}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="show_stock_warning" className="flex items-center gap-2 text-sm cursor-pointer">
                        <AlertTriangle className="h-4 w-4" />
                        Show Stock Warnings
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto_expire"
                        checked={formData.auto_expire}
                        onCheckedChange={(checked) => handleInputChange('auto_expire', checked)}
                        className="touch-manipulation"
                      />
                      <Label htmlFor="auto_expire" className="flex items-center gap-2 text-sm cursor-pointer">
                        <TrendingUp className="h-4 w-4" />
                        Auto-expire when sold out
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Product Selection */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-semibold">Select Products</h3>
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 h-11 sm:h-10 md:h-11 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-lg p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-muted rounded touch-manipulation">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={formData.selected_products.includes(product.id)}
                            onCheckedChange={(checked) => handleProductSelection(product.id, checked as boolean)}
                            className="touch-manipulation flex-shrink-0"
                          />
                          <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor={`product-${product.id}`}
                              className="text-xs sm:text-sm font-medium cursor-pointer truncate block"
                            >
                              {product.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">₹{product.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.selected_products.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formData.selected_products.length} product{formData.selected_products.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : editingOffer ? 'Update Offer' : 'Create Offer'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingOffer(null);
                        setFormData(defaultFormData);
                      }}
                      className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}