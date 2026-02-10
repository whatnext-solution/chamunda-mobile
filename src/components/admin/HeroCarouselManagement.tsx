import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  Image as ImageIcon,
  Save,
  X
} from 'lucide-react';
import { 
  useAllHeroCarouselSlides, 
  createHeroCarouselSlide, 
  updateHeroCarouselSlide, 
  deleteHeroCarouselSlide,
  reorderHeroCarouselSlides,
  type HeroCarouselSlide 
} from '@/hooks/useHeroCarouselSlides';
import { TableShimmer } from '@/components/ui/Shimmer';

interface SlideFormData {
  title: string;
  description: string;
  background_image_url: string;
  cta_text: string;
  cta_url: string;
  display_order: number;
  is_active: boolean;
}

const initialFormData: SlideFormData = {
  title: '',
  description: '',
  background_image_url: '',
  cta_text: '',
  cta_url: '',
  display_order: 1,
  is_active: true,
};

export default function HeroCarouselManagement() {
  const { data: slides = [], isLoading, error } = useAllHeroCarouselSlides();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroCarouselSlide | null>(null);
  const [formData, setFormData] = useState<SlideFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof SlideFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.background_image_url.trim()) {
      toast.error('Title and background image are required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingSlide) {
        await updateHeroCarouselSlide(editingSlide.id, formData);
        toast.success('Slide updated successfully');
      } else {
        await createHeroCarouselSlide(formData);
        toast.success('Slide created successfully');
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['hero-carousel-slides'] });
      queryClient.invalidateQueries({ queryKey: ['all-hero-carousel-slides'] });
      
      // Reset form
      setFormData(initialFormData);
      setEditingSlide(null);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving slide:', error);
      toast.error(`Error saving slide: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (slide: HeroCarouselSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description || '',
      background_image_url: slide.background_image_url,
      cta_text: slide.cta_text || '',
      cta_url: slide.cta_url || '',
      display_order: slide.display_order,
      is_active: slide.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (slide: HeroCarouselSlide) => {
    if (!confirm(`Are you sure you want to delete "${slide.title}"?`)) {
      return;
    }

    try {
      await deleteHeroCarouselSlide(slide.id);
      toast.success('Slide deleted successfully');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['hero-carousel-slides'] });
      queryClient.invalidateQueries({ queryKey: ['all-hero-carousel-slides'] });
    } catch (error: any) {
      console.error('Error deleting slide:', error);
      toast.error(`Error deleting slide: ${error.message}`);
    }
  };

  const handleToggleActive = async (slide: HeroCarouselSlide) => {
    try {
      await updateHeroCarouselSlide(slide.id, { is_active: !slide.is_active });
      toast.success(`Slide ${slide.is_active ? 'deactivated' : 'activated'} successfully`);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['hero-carousel-slides'] });
      queryClient.invalidateQueries({ queryKey: ['all-hero-carousel-slides'] });
    } catch (error: any) {
      console.error('Error toggling slide status:', error);
      toast.error(`Error updating slide: ${error.message}`);
    }
  };

  const handleReorder = async (slideId: string, direction: 'up' | 'down') => {
    const currentSlide = slides.find(s => s.id === slideId);
    if (!currentSlide) return;

    const sortedSlides = [...slides].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedSlides.findIndex(s => s.id === slideId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedSlides.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetSlide = sortedSlides[targetIndex];

    try {
      await reorderHeroCarouselSlides([
        { id: currentSlide.id, display_order: targetSlide.display_order },
        { id: targetSlide.id, display_order: currentSlide.display_order }
      ]);
      
      toast.success('Slides reordered successfully');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['hero-carousel-slides'] });
      queryClient.invalidateQueries({ queryKey: ['all-hero-carousel-slides'] });
    } catch (error: any) {
      console.error('Error reordering slides:', error);
      toast.error(`Error reordering slides: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSlide(null);
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <TableShimmer rows={3} columns={6} />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading carousel slides: {error.message}</p>
        <p className="text-red-600 text-sm mt-1">Make sure the hero_carousel_slides table exists in your database.</p>
      </div>
    );
  }

  const sortedSlides = [...slides].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Carousel Slides</h3>
          <p className="text-sm text-gray-600">
            Manage dynamic hero carousel slides for your home page
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Slide
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSlide ? 'Edit Slide' : 'Add New Slide'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter slide title"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter slide description"
                    rows={3}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="background_image_url">Background Image URL *</Label>
                  <Input
                    id="background_image_url"
                    value={formData.background_image_url}
                    onChange={(e) => handleInputChange('background_image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                  {formData.background_image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.background_image_url}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="cta_text">CTA Button Text</Label>
                  <Input
                    id="cta_text"
                    value={formData.cta_text}
                    onChange={(e) => handleInputChange('cta_text', e.target.value)}
                    placeholder="Shop Now"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cta_url">CTA Button URL</Label>
                  <Input
                    id="cta_url"
                    value={formData.cta_url}
                    onChange={(e) => handleInputChange('cta_url', e.target.value)}
                    placeholder="/products"
                  />
                </div>
                
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingSlide ? 'Update' : 'Create'} Slide
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Slides List */}
      {sortedSlides.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No slides yet</h3>
            <p className="text-gray-600 mb-4">Create your first carousel slide to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Slide
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedSlides.map((slide, index) => (
            <Card key={slide.id} className={slide.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={slide.background_image_url}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K';
                      }}
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{slide.title}</h4>
                        {slide.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{slide.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={slide.is_active ? 'default' : 'secondary'}>
                            {slide.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-gray-500">Order: {slide.display_order}</span>
                          {slide.cta_text && slide.cta_url && (
                            <Badge variant="outline" className="text-xs">
                              CTA: {slide.cta_text}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        {/* Reorder buttons */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(slide.id, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(slide.id, 'down')}
                          disabled={index === sortedSlides.length - 1}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        
                        {/* Toggle active */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(slide)}
                          title={slide.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {slide.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(slide)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(slide)}
                          title="Delete"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        {/* Preview link */}
                        {slide.cta_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title="Preview link"
                          >
                            <a href={slide.cta_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Carousel Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use high-quality images (1920x1080 or larger) for best results</li>
            <li>• Keep titles short and impactful for mobile readability</li>
            <li>• Test your CTA links to ensure they work correctly</li>
            <li>• Use display order to control slide sequence</li>
            <li>• Inactive slides won't appear on the website</li>
            <li>• Changes appear immediately on your website</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}