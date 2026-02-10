import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp,
  Clock,
  IndianRupee,
  User,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackModalProps {
  repairRequest: {
    id: string;
    request_id: string;
    customer_name: string;
    brand: string;
    model: string;
    repair_quotations?: Array<{
      total_amount: number;
    }>;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface FeedbackData {
  rating: number;
  comment: string;
  serviceQualityRating: number;
  technicianRating: number;
  deliveryTimeRating: number;
  priceSatisfactionRating: number;
  wouldRecommend: boolean;
  improvementSuggestions: string;
}

export const FeedbackModal = ({ repairRequest, onClose, onSuccess }: FeedbackModalProps) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 5,
    comment: '',
    serviceQualityRating: 5,
    technicianRating: 5,
    deliveryTimeRating: 5,
    priceSatisfactionRating: 5,
    wouldRecommend: true,
    improvementSuggestions: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('repair_feedback')
        .insert([{
          repair_request_id: repairRequest.id,
          rating: feedback.rating,
          comment: feedback.comment || null,
          service_quality_rating: feedback.serviceQualityRating,
          technician_rating: feedback.technicianRating,
          delivery_time_rating: feedback.deliveryTimeRating,
          price_satisfaction_rating: feedback.priceSatisfactionRating,
          would_recommend: feedback.wouldRecommend,
          improvement_suggestions: feedback.improvementSuggestions || null,
          customer_name: repairRequest.customer_name
        }]);

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (rating: number) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs sm:text-sm font-medium">{label}</Label>
      <div className="flex gap-1 sm:gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 sm:p-1.5 rounded transition-colors touch-manipulation ${
              star <= value 
                ? 'text-yellow-500 hover:text-yellow-600' 
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Star className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Share Your Repair Experience
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Repair Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Request ID:</span>
                <span className="ml-2 font-medium">#{repairRequest.request_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Device:</span>
                <span className="ml-2 font-medium">{repairRequest.brand} {repairRequest.model}</span>
              </div>
              {repairRequest.repair_quotations?.[0] && (
                <div className="sm:col-span-2">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="ml-2 font-medium">
                    ₹{repairRequest.repair_quotations[0].total_amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Rating */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Overall Experience</h3>
            <StarRating
              value={feedback.rating}
              onChange={(rating) => setFeedback(prev => ({ ...prev, rating }))}
              label="How would you rate your overall experience?"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Detailed Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium">Service Quality</span>
                </div>
                <StarRating
                  value={feedback.serviceQualityRating}
                  onChange={(rating) => setFeedback(prev => ({ ...prev, serviceQualityRating: rating }))}
                  label="Quality of repair work"
                />
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium">Technician</span>
                </div>
                <StarRating
                  value={feedback.technicianRating}
                  onChange={(rating) => setFeedback(prev => ({ ...prev, technicianRating: rating }))}
                  label="Technician professionalism"
                />
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs sm:text-sm font-medium">Delivery Time</span>
                </div>
                <StarRating
                  value={feedback.deliveryTimeRating}
                  onChange={(rating) => setFeedback(prev => ({ ...prev, deliveryTimeRating: rating }))}
                  label="Timeliness of service"
                />
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="h-4 w-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium">Value for Money</span>
                </div>
                <StarRating
                  value={feedback.priceSatisfactionRating}
                  onChange={(rating) => setFeedback(prev => ({ ...prev, priceSatisfactionRating: rating }))}
                  label="Price satisfaction"
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <Label htmlFor="comment" className="text-xs sm:text-sm font-medium">
              Share your experience (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your repair experience..."
              value={feedback.comment}
              onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="mt-1 touch-manipulation resize-none"
            />
          </div>

          {/* Recommendation */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recommend"
              checked={feedback.wouldRecommend}
              onCheckedChange={(checked) => 
                setFeedback(prev => ({ ...prev, wouldRecommend: checked as boolean }))
              }
              className="touch-manipulation"
            />
            <Label htmlFor="recommend" className="text-xs sm:text-sm flex items-center gap-2 cursor-pointer">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              I would recommend this repair service to others
            </Label>
          </div>

          {/* Improvement Suggestions */}
          <div>
            <Label htmlFor="improvements" className="text-xs sm:text-sm font-medium">
              How can we improve? (Optional)
            </Label>
            <Textarea
              id="improvements"
              placeholder="Share your suggestions for improvement..."
              value={feedback.improvementSuggestions}
              onChange={(e) => setFeedback(prev => ({ ...prev, improvementSuggestions: e.target.value }))}
              rows={3}
              className="mt-1 touch-manipulation resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 sm:h-10 md:h-11 touch-manipulation"
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 md:h-11 touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>

          {/* Thank You Note */}
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-xs sm:text-sm text-blue-800">
              Your feedback helps us improve our service quality and customer experience.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};