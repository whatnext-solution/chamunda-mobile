import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileText, File, Loader2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { storageTrackingService, UPLOAD_SOURCES, type StorageTrackingData } from '@/services/storageTrackingService';

interface FileUploadProps {
  onFileUploaded: (fileUrl: string) => void;
  currentFile?: string;
  className?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  uploadSource: string; // Required for tracking
  metadata?: Record<string, any>;
  accept?: string; // HTML accept attribute
  multiple?: boolean;
  showPreview?: boolean;
}

export function FileUpload({ 
  onFileUploaded, 
  currentFile, 
  className = '',
  maxSize = 10,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  uploadSource,
  metadata = {},
  accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png',
  multiple = false,
  showPreview = true
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentFile || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes.map(type => {
        const ext = type.split('/')[1];
        return ext.toUpperCase();
      }).join(', ');
      toast.error(`Only ${allowedExtensions} files are allowed`);
      return false;
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    try {
      console.log('🔍 Starting file upload process...');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadSource,
        lastModified: file.lastModified
      });

      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        toast.error('Supabase client not initialized');
        return null;
      }

      const fileName = storageTrackingService.generateFileName(file.name, uploadSource);
      const bucketName = storageTrackingService.getBucketName(uploadSource);
      
      console.log('📁 Generated filename:', fileName);
      console.log('🪣 Target bucket:', bucketName);
      
      console.log('🚀 Attempting upload to Supabase Storage...');
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('Upload response:', { data, error });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', publicUrl);

      // Track the upload for storage management
      const trackingData: StorageTrackingData = {
        file_name: fileName,
        bucket_name: bucketName,
        file_size_bytes: file.size,
        file_type: file.type,
        upload_source: uploadSource,
        metadata: {
          ...metadata,
          original_name: file.name,
          public_url: publicUrl
        }
      };

      await storageTrackingService.trackUpload(trackingData);
      
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Upload error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        statusCode: error.statusCode
      });
      
      if (error.message?.includes('Bucket not found')) {
        const bucketName = storageTrackingService.getBucketName(uploadSource);
        toast.error(`Storage bucket "${bucketName}" not found. Please ensure it exists in Supabase Dashboard → Storage.`);
      } else if (error.message?.includes('The resource already exists')) {
        toast.error('File already exists. Please try again.');
      } else if (error.message?.includes('Permission denied') || error.message?.includes('Unauthorized')) {
        toast.error('Permission denied. Please ensure you are logged in and the bucket is public.');
      } else if (error.message?.includes('Invalid JWT')) {
        toast.error('Authentication expired. Please refresh the page and try again.');
      } else if (error.statusCode === 413) {
        toast.error('File too large. Please use a smaller file.');
      } else {
        toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      }
      
      return null;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Show preview immediately for supported file types
      if (showPreview) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          // For non-image files, show file name as preview
          setPreview(file.name);
        }
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Supabase
      const fileUrl = await uploadToSupabase(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (fileUrl) {
        onFileUploaded(fileUrl);
        toast.success(`${storageTrackingService.getSourceLabel(uploadSource)} uploaded successfully! 🎉`);
      } else {
        // Reset preview if upload failed
        setPreview(currentFile || null);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      setPreview(currentFile || null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    handleFileUpload(file);
  };

  const handleRemove = async () => {
    if (currentFile) {
      try {
        // Extract file path from URL for deletion
        const url = new URL(currentFile);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const bucketName = storageTrackingService.getBucketName(uploadSource);
        
        const { error } = await supabase.storage
          .from(bucketName)
          .remove([fileName]);

        if (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete file');
          return;
        }

        // Track the deletion for storage management
        await storageTrackingService.trackDeletion(fileName, bucketName);

        toast.success(`${storageTrackingService.getSourceLabel(uploadSource)} deleted successfully`);
      } catch (error) {
        console.error('Delete error:', error);
        // Continue with removal even if delete fails
      }
    }
    
    setPreview(null);
    onFileUploaded('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'txt':
        return <FileText className="h-8 w-8 text-gray-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <File className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const isImageFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* File Preview */}
      {showPreview && preview ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <div className="relative group">
              {typeof preview === 'string' && preview.startsWith('data:') && isImageFile(preview) ? (
                // Image preview
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              ) : typeof preview === 'string' && preview.startsWith('http') && isImageFile(preview) ? (
                // Image URL preview
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              ) : (
                // File name preview for non-images
                <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    {getFileIcon(typeof preview === 'string' ? preview : currentFile || '')}
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {typeof preview === 'string' && !preview.startsWith('http') ? preview : 
                       currentFile ? currentFile.split('/').pop() : 'File'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(currentFile, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentFile || '';
                          link.download = currentFile?.split('/').pop() || 'file';
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>

              {/* Upload progress overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Uploading...</p>
                    <p className="text-xs">{uploadProgress}%</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Upload Area */
        <Card 
          className={cn(
            'border-2 border-dashed transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
            uploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8 text-center">
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploading to Supabase...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Click to upload or drag & drop file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {storageTrackingService.getSourceLabel(uploadSource)} (Max {maxSize}MB)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Button (when no preview) */}
      {!showPreview || !preview ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {storageTrackingService.getSourceLabel(uploadSource)}
            </>
          )}
        </Button>
      ) : null}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress (separate from preview) */}
      {uploading && !showPreview && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            Uploading to Supabase... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Maximum file size: {maxSize}MB</p>
        <p>• Supported formats: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
        <p>• Files are stored securely in Supabase Storage</p>
        <p>• Upload tracked for storage management</p>
      </div>
    </div>
  );
}