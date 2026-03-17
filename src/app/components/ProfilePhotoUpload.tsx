import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { edgeFunctionsBaseUrl, publicAnonKey } from '@/config/supabase';
import { Progress } from './ui/progress';

const MAX_FILE_SIZE = 5242880; // 5MB

interface ProfilePhotoUploadProps {
  getAccessToken: () => Promise<string | null>;
  onPhotoUploaded: (photoUrl: string) => void;
}

function getUploadErrorMessage(error: unknown, fileSize?: number): string {
  const msg = error instanceof Error ? error.message : 'Failed to upload photo';
  if (fileSize !== undefined && fileSize > MAX_FILE_SIZE) {
    return 'Image must be less than 5MB';
  }
  if (msg.toLowerCase().includes('large') || msg.toLowerCase().includes('size')) {
    return 'Image must be less than 5MB';
  }
  if (msg.toLowerCase().includes('image') && msg.toLowerCase().includes('invalid')) {
    return 'Please select a valid image file (JPEG, PNG, GIF, or WebP)';
  }
  return msg;
}

export function ProfilePhotoUpload({ getAccessToken, onPhotoUploaded }: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 300);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Please log in to upload a photo');
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${edgeFunctionsBaseUrl}/profile/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
          'X-Access-Token': accessToken,
        },
        body: JSON.stringify({ photo: base64, contentType: file.type }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      onPhotoUploaded(data.photoUrl);
      toast.success('Profile photo updated');
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(getUploadErrorMessage(error, file.size));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="profile-photo-input"
      />
      <div className="flex flex-col gap-[6px]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-[4px] p-[6px] bg-[#27272a] hover:bg-[#3f3f46] rounded-[4px] border border-[#3f3f47] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Upload profile photo"
        >
          {uploading ? (
            <Loader2 className="size-[14px] text-[#99a1af] animate-spin" />
          ) : (
            <Upload className="size-[14px] text-[#99a1af]" />
          )}
          <span className="font-['Inter:Medium',sans-serif] font-medium text-[12px] text-[#99a1af]">
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </span>
        </button>
        {uploading && (
          <Progress value={uploadProgress} className="h-1 w-full [&>div]:bg-[#8200db]" />
        )}
      </div>
    </>
  );
}