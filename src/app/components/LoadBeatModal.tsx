import { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { edgeFunctionsBaseUrl, publicAnonKey, EDGE_FUNCTION_COLD_START_TIMEOUT_MS } from '@/config/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Skeleton } from './ui/skeleton';

interface Beat {
  id: string;
  name: string;
  pattern: boolean[][];
  tempo: number;
  createdAt: string;
}

interface LoadBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (pattern: boolean[][], tempo: number) => void;
  getAccessToken: () => Promise<string | null>;
}

export function LoadBeatModal({ isOpen, onClose, onLoad, getAccessToken }: LoadBeatModalProps) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [error, setError] = useState('');
  const [deleteBeatId, setDeleteBeatId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBeats();
    }
  }, [isOpen]);

  const loadBeats = async () => {
    const token = await getAccessToken();
    if (!token) {
      setError('Please log in to load beats');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingMessage('Loading...');
    setError('');

    const timeoutMs = EDGE_FUNCTION_COLD_START_TIMEOUT_MS;
    const maxRetries = 2;

    const slowMessageTimer = setTimeout(
      () => setLoadingMessage('Waking up server—first load may take a minute...'),
      5000
    );

    const fetchWithRetry = async (retriesLeft: number): Promise<Response> => {
      if (retriesLeft < maxRetries) {
        setLoadingMessage('Retrying...');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${edgeFunctionsBaseUrl}/beats`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Access-Token': token,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' && retriesLeft > 0) {
          return fetchWithRetry(retriesLeft - 1);
        }
        throw err;
      }
    };

    try {
      const response = await fetchWithRetry(maxRetries);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load beats');
      }

      setBeats(data.beats || []);
    } catch (err: any) {
      const message =
        err.name === 'AbortError'
          ? 'Request timed out. The server may be starting up—try again in a moment.'
          : err.message || 'Failed to load beats';
      console.error('Load beats error:', err);
      setError(message);
    } finally {
      clearTimeout(slowMessageTimer);
      setLoading(false);
    }
  };

  const handleDeleteClick = (beatId: string) => {
    setDeleteBeatId(beatId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBeatId) return;

    const token = await getAccessToken();
    if (!token) {
      setDeleteBeatId(null);
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`${edgeFunctionsBaseUrl}/beats/${deleteBeatId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'X-Access-Token': token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete beat');
      }

      toast.success('Beat deleted');
      setDeleteBeatId(null);
      loadBeats();
    } catch (err: any) {
      console.error('Delete beat error:', err);
      toast.error(err.message || 'Failed to delete beat');
    } finally {
      setDeleting(false);
    }
  };

  const handleLoadBeat = (beat: Beat) => {
    onLoad(beat.pattern, beat.tempo);
    // Parent closes modal when load is applied (or shows unsaved dialog)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#18181b] rounded-[12px] p-[32px] w-[500px] max-h-[600px] border-2 border-[#3f3f47] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] text-[#9f9fa9] hover:text-[#f1f5f9] transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="font-['Inter:Medium',sans-serif] font-medium text-[#f8fafc] text-[24px] mb-[24px]">
          Load Beat
        </h2>

        {loading ? (
          <div className="flex flex-col gap-[12px]">
            <p className="text-[#9f9fa9] font-['Inter:Medium',sans-serif] font-medium text-[16px]">
              {loadingMessage}
            </p>
            <div className="flex flex-col gap-[8px]">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-[8px] bg-[#27272a]" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-[12px]">
            <p className="text-red-500 font-['Inter:Medium',sans-serif] font-medium text-[16px]">
              {error}
            </p>
            <button
              onClick={() => loadBeats()}
              className="self-start bg-[#8200db] border border-[#ad46ff] rounded-[8px] px-[16px] py-[8px] text-[#f8fafc] font-['Geist:Medium',sans-serif] font-medium text-[14px] hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        ) : beats.length === 0 ? (
          <div className="flex flex-col gap-[16px] items-center py-[24px]">
            <p className="text-[#9f9fa9] font-['Inter:Medium',sans-serif] font-medium text-[16px] text-center">
              No saved beats yet.
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-[#8200db] border border-[#ad46ff] rounded-[8px] px-[16px] py-[10px] text-[#f8fafc] font-['Geist:Medium',sans-serif] font-medium text-[14px] hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              Create your first beat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[8px] overflow-y-auto max-h-[400px]">
            {beats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#27272a] border border-[#3f3f47] rounded-[8px] p-[16px] flex items-center justify-between hover:border-[#8200db] transition-colors"
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleLoadBeat(beat)}
                >
                  <p className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[16px]">
                    {beat.name}
                  </p>
                  <p className="font-['Inter:Medium',sans-serif] font-medium text-[#9f9fa9] text-[12px] mt-[4px]">
                    {new Date(beat.createdAt).toLocaleDateString()} • {beat.tempo} BPM
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(beat.id);
                  }}
                  className="text-[#9f9fa9] hover:text-red-500 transition-colors p-[8px]"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteBeatId} onOpenChange={(open) => !open && setDeleteBeatId(null)}>
        <AlertDialogContent className="bg-[#18181b] border-[#3f3f47]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#f8fafc]">Delete beat?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9f9fa9]">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="bg-[#27272a] border-[#3f3f47] text-[#f1f5f9] hover:bg-[#3f3f46]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}