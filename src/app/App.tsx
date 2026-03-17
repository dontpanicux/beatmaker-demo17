import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Toaster, toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';
import svgPaths from '../imports/svg-9daivwmx0y';
import { BeatGrid } from './components/BeatGrid';
import { AudioEngine } from './components/AudioEngine';
import { ProfilePhotoUpload } from './components/ProfilePhotoUpload';
import { edgeFunctionsBaseUrl, publicAnonKey, EDGE_FUNCTION_COLD_START_TIMEOUT_MS } from '@/config/supabase';
import { getSupabaseClient } from './utils/supabase';
import { User } from 'lucide-react';

const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const SaveBeatModal = lazy(() => import('./components/SaveBeatModal').then((m) => ({ default: m.SaveBeatModal })));
const LoadBeatModal = lazy(() => import('./components/LoadBeatModal').then((m) => ({ default: m.LoadBeatModal })));

interface NavbarProps {
  onAuthClick: () => void;
  onSignUpClick: () => void;
  onLogInClick: () => void;
  user: any;
  onLogout: () => void;
  profilePhotoUrl: string | null;
  accessToken: string | null;
  getAccessToken: () => Promise<string | null>;
  onPhotoUploaded: (photoUrl: string) => void;
}

function Navbar({ onSignUpClick, onLogInClick, user, onLogout, profilePhotoUrl, accessToken, getAccessToken, onPhotoUploaded }: NavbarProps) {
  return (
    <div className="bg-[#18181b] relative shrink-0 w-full" data-name="Navbar">
      <div className="flex flex-row items-center justify-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-end px-[40px] py-[24px] relative w-full">
          <div className="content-stretch flex gap-[8px] items-center justify-end relative shrink-0">
            {user ? (
              <>
                {/* Profile Photo Avatar */}
                <div className="flex items-center justify-center size-[32px] rounded-full overflow-hidden bg-[#27272a] border border-[#3f3f47] shrink-0">
                  {profilePhotoUrl ? (
                    <img 
                      src={profilePhotoUrl} 
                      alt="Profile" 
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="size-[18px] text-[#99a1af]" />
                  )}
                </div>
                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] text-[#f1f5f9] text-[14px] mr-[8px]">
                  {user.user_metadata?.name || user.email}
                </p>
                {accessToken && (
                  <ProfilePhotoUpload 
                    getAccessToken={getAccessToken}
                    onPhotoUploaded={onPhotoUploaded}
                  />
                )}
                <button
                  onClick={onLogout}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Log Out</p>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSignUpClick}
                  className="bg-[#8200db] content-stretch flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div aria-hidden="true" className="absolute border border-[#ad46ff] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f8fafc] text-[16px]">Sign Up</p>
                </button>
                <button
                  onClick={onLogInClick}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Log In</p>
                </button>
              </>
            )}
          </div>
          <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[#8200db] content-stretch flex items-center justify-center left-1/2 px-[16px] py-[4px] top-[calc(50%+1px)]">
            <p className="font-['Inter:Black_Italic',sans-serif] font-black italic leading-[normal] relative shrink-0 text-[#f8fafc] text-[36px]">Super Beats</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-[#3f3f47] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

const TRACKS = ['Kick', 'Snare', 'Open Hi-hat', 'Closed Hi-hat', 'Clap'];
const STEPS = 16;

export default function App() {
  const [tempo, setTempo] = useState(120);
  const [tempoInput, setTempoInput] = useState('120');
  const [isPlaying, setIsPlaying] = useState(false);
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(TRACKS.length).fill(null).map(() => Array(STEPS).fill(false))
  );
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<{ pattern: boolean[][]; tempo: number } | null>(null);

  // Check for existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  // Keyboard shortcuts: Space = play/stop, Escape = close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
      if (e.key === 'Escape') {
        if (showAuthModal) setShowAuthModal(false);
        else if (showSaveModal) setShowSaveModal(false);
        else if (showLoadModal) setShowLoadModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuthModal, showSaveModal, showLoadModal]);

  const getFreshAccessToken = async (): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;
      return session.access_token;
    } catch {
      return null;
    }
  };

  const loadProfilePhoto = async (retries = 1) => {
    const token = await getFreshAccessToken();
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_COLD_START_TIMEOUT_MS);
      const response = await fetch(
        `${edgeFunctionsBaseUrl}/profile/photo`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Access-Token': token
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) return;
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load profile photo:', response.status, errorData);
        return;
      }

      const data = await response.json();
      if (data.photoUrl) {
        setProfilePhotoUrl(data.photoUrl);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' && retries > 0) {
        loadProfilePhoto(retries - 1);
      } else {
        console.log('Profile photo load failed:', error?.message);
      }
    }
  };

  // Warm up Edge Function and load profile photo when user logs in
  useEffect(() => {
    if (accessToken && user) {
      // Fire health check in background to wake Edge Function (reduces cold start for later requests)
      fetch(`${edgeFunctionsBaseUrl}/health`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }).catch(() => {});

      loadProfilePhoto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user]);

  const checkSession = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Invalid refresh token, expired session, or auth error - clear stored session
        if (error.message?.includes('refresh_token') || error.message?.includes('Invalid')) {
          await supabase.auth.signOut();
        }
        setAccessToken(null);
        setUser(null);
        return;
      }
      
      if (session) {
        setAccessToken(session.access_token);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setAccessToken(null);
      setUser(null);
    }
  };

  const handleAuthSuccess = (token: string, authUser: any) => {
    setAccessToken(token);
    setUser(authUser);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setAccessToken(null);
      setUser(null);
      setProfilePhotoUrl(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveBeat = async (beatName: string, onSuccess?: () => void): Promise<boolean> => {
    const token = await getFreshAccessToken();
    if (!token) {
      toast.error('Please log in to save beats');
      setShowAuthModal(true);
      return false;
    }

    try {
      const response = await fetch(
        `${edgeFunctionsBaseUrl}/beats/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Access-Token': token
          },
          body: JSON.stringify({
            beatName,
            pattern,
            tempo
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save beat');
      }

      toast.success(`Beat "${beatName}" saved successfully!`);
      setIsDirty(false);
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error('Save beat error:', error);
      toast.error(error.message || 'Failed to save beat');
      return false;
    }
  };

  const handleLoadBeat = (loadedPattern: boolean[][], loadedTempo: number) => {
    if (isDirty) {
      setPendingLoad({ pattern: loadedPattern, tempo: loadedTempo });
      setShowLoadModal(false);
      return;
    }
    applyLoadBeat(loadedPattern, loadedTempo);
  };

  const applyLoadBeat = (loadedPattern: boolean[][], loadedTempo: number) => {
    setPattern(loadedPattern);
    setTempo(loadedTempo);
    setTempoInput(loadedTempo.toString());
    setIsPlaying(false);
    setIsDirty(false);
    setPendingLoad(null);
    setShowLoadModal(false);
  };

  const handleConfirmDiscard = () => {
    if (pendingLoad) {
      applyLoadBeat(pendingLoad.pattern, pendingLoad.tempo);
    }
  };

  const handleCancelDiscard = () => {
    setPendingLoad(null);
  };

  const handleCellToggle = useCallback((trackIndex: number, stepIndex: number) => {
    setIsDirty(true);
    setPattern(prev => {
      const newPattern = prev.map(row => [...row]);
      newPattern[trackIndex][stepIndex] = !newPattern[trackIndex][stepIndex];
      return newPattern;
    });
  }, []);

  const handleTempoChange = (value: string) => {
    setTempoInput(value);
    const newTempo = parseInt(value);
    if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
      setTempo(newTempo);
    }
  };

  const handleTempoBlur = () => {
    const newTempo = parseInt(tempoInput);
    if (isNaN(newTempo) || newTempo < 40 || newTempo > 240) {
      setTempoInput(tempo.toString());
    }
  };

  const handleNewBeat = () => {
    if (isDirty) {
      setPendingLoad({
        pattern: Array(TRACKS.length).fill(null).map(() => Array(STEPS).fill(false)),
        tempo: 120,
      });
      return;
    }
    applyNewBeat();
  };

  const applyNewBeat = () => {
    setPattern(Array(TRACKS.length).fill(null).map(() => Array(STEPS).fill(false)));
    setTempoInput('120');
    setTempo(120);
    setIsPlaying(false);
    setIsDirty(false);
    setPendingLoad(null);
  };


  const handleSaveClick = () => {
    if (!accessToken) {
      toast.error('Please log in to save beats');
      setAuthMode('login');
      setShowAuthModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  const handleLoadClick = () => {
    if (!accessToken) {
      toast.error('Please log in to load beats');
      setAuthMode('login');
      setShowAuthModal(true);
    } else {
      setShowLoadModal(true);
    }
  };

  const handleSignUpClick = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleLogInClick = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] overflow-auto">
      <Toaster theme="dark" position="bottom-right" richColors />
      <Navbar 
        onAuthClick={() => setShowAuthModal(true)}
        onSignUpClick={handleSignUpClick}
        onLogInClick={handleLogInClick}
        user={user}
        onLogout={handleLogout}
        profilePhotoUrl={profilePhotoUrl}
        accessToken={accessToken}
        getAccessToken={getFreshAccessToken}
        onPhotoUploaded={setProfilePhotoUrl}
      />
      
      <div className="flex flex-col items-center px-[40px] py-[40px] gap-[0px]">
        {/* Playback Tools */}
        <div className="bg-[#18181b] relative rounded-tl-[12px] rounded-tr-[12px] shrink-0 w-full max-w-[1200px]">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-start justify-between px-[40px] py-[16px] relative w-full">
              {/* Left side controls */}
              <div className="content-stretch flex gap-[40px] items-center relative shrink-0">
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                  <p className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f1f5f9] text-[16px]">Tempo</p>
                  <div className="bg-[#27272a] content-stretch flex items-center justify-center px-[16px] py-[4px] relative rounded-[2px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[2px]" />
                    <input
                      type="text"
                      value={tempoInput}
                      onChange={(e) => handleTempoChange(e.target.value)}
                      onBlur={handleTempoBlur}
                      className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f1f5f9] text-[16px] bg-transparent border-none outline-none w-[50px] text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-[#8200db] content-stretch flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div aria-hidden="true" className="absolute border border-[#ad46ff] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <div className="overflow-clip relative shrink-0 size-[20px]">
                    <div className="absolute inset-[12.5%]">
                      <div className="absolute inset-[-5%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.5 16.5">
                          <g>
                            <path d={svgPaths.p3031a300} stroke="var(--stroke-0, #F8FAFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            <path d={svgPaths.p2aad7200} stroke="var(--stroke-0, #F8FAFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f8fafc] text-[16px]">
                    {isPlaying ? 'Stop' : 'Playback'}
                  </p>
                </button>
              </div>

              {/* Right side controls */}
              <div className="content-stretch flex gap-[16px] items-center relative shrink-0">
                <button 
                  onClick={handleSaveClick}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[18.75%_9.38%]">
                        <div className="absolute inset-[-6%_-4.62%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.75 14">
                            <path d={svgPaths.pb0ea00} stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Save Beat</p>
                </button>
                <button 
                  onClick={handleLoadClick}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[15.63%_7.68%]">
                        <div className="absolute inset-[-5.45%_-4.43%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.4272 15.25">
                            <path d={svgPaths.p14df6180} stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Open Beat</p>
                </button>
                <button
                  onClick={handleNewBeat}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[9.38%_15.63%]">
                        <div className="absolute inset-[-4.62%_-5.45%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.25 17.75">
                            <path d={svgPaths.p2543cf1} stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">New Beat</p>
                </button>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="absolute border-2 border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-tl-[12px] rounded-tr-[12px]" />
        </div>

        {/* Beat Grid Container */}
        <div className="bg-[#18181b] relative rounded-bl-[12px] rounded-br-[12px] shrink-0 w-full max-w-[1200px] border-2 border-t-0 border-[#3f3f47]">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="px-[40px] py-[32px]">
              <BeatGrid
                tracks={TRACKS}
                steps={STEPS}
                isPlaying={isPlaying}
                tempo={tempo}
                onCellToggle={handleCellToggle}
                pattern={pattern}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio Engine */}
      <AudioEngine
        isPlaying={isPlaying}
        tempo={tempo}
        pattern={pattern}
        tracks={TRACKS}
      />

      {/* Modals - lazy loaded */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
        />

        <SaveBeatModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveBeat}
        />

        <LoadBeatModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoad={handleLoadBeat}
          getAccessToken={getFreshAccessToken}
        />
      </Suspense>

      <AlertDialog open={!!pendingLoad} onOpenChange={(open) => !open && handleCancelDiscard()}>
        <AlertDialogContent className="bg-[#18181b] border-[#3f3f47]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#f8fafc]">Discard changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9f9fa9]">
              You have unsaved changes to your beat. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelDiscard}
              className="bg-[#27272a] border-[#3f3f47] text-[#f1f5f9] hover:bg-[#3f3f46]"
            >
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}