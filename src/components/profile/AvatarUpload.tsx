'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';

interface AvatarUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (url: string) => void;
  currentAvatarUrl?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const OUTPUT_SIZE = 256;

/**
 * Crop the selected area from an image and return a 256x256 webp Blob.
 */
async function cropImage(imageSrc: string, cropArea: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/webp',
      0.85,
    );
  });
}

export default function AvatarUpload({ isOpen, onClose, onSaved, currentAvatarUrl }: AvatarUploadProps) {
  const { user } = useAuth();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setUploading(false);
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[AvatarUpload] File selected:', file.name, file.type, file.size);

    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 10 MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      console.log('[AvatarUpload] Image loaded into cropper');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedArea || !user?.id) return;

    setUploading(true);
    setError(null);
    console.log('[AvatarUpload] Starting upload for user:', user.id);

    try {
      // 1. Crop to 256x256 webp
      const blob = await cropImage(imageSrc, croppedArea);
      console.log('[AvatarUpload] Cropped blob size:', blob.size);

      // 2. Upload to Supabase Storage
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const filePath = `${user.id}/avatar.webp`;
      console.log('[AvatarUpload] Uploading to storage path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        console.error('[AvatarUpload] Storage upload failed:', uploadError);
        throw new Error(uploadError.message);
      }

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Append cache-buster so the browser picks up the new image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('[AvatarUpload] Public URL:', publicUrl);

      // 4. Update user_profiles.avatar_url
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (profileError) {
        console.error('[AvatarUpload] Profile update failed:', profileError);
        throw new Error(profileError.message);
      }

      console.log('[AvatarUpload] Avatar saved successfully');
      onSaved(publicUrl);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      console.error('[AvatarUpload] Error:', message);
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-white text-center mb-4">
          {imageSrc ? 'Crop Your Avatar' : 'Upload Avatar'}
        </h2>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 text-center mb-4 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!imageSrc ? (
          /* File picker view */
          <div className="flex flex-col items-center gap-4">
            {/* Current avatar preview */}
            {currentAvatarUrl && (
              <img
                src={currentAvatarUrl}
                alt="Current avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-600"
              />
            )}

            <label className="w-full cursor-pointer">
              <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-500/5 transition-colors">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" />
                </svg>
                <span className="text-sm text-gray-400">Click to select an image</span>
                <span className="text-xs text-gray-600">Max 10 MB</span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Crop view */
          <div className="flex flex-col gap-4">
            {/* Crop area */}
            <div className="relative w-full h-64 bg-gray-950 rounded-xl overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 px-1">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setImageSrc(null)}
                className="flex-1 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-xl text-center transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !croppedArea}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl text-center transition-all shadow-lg shadow-purple-900/30"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
