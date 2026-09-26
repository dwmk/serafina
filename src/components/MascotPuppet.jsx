import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playEntranceSound,
  playExitSound,
  playMessageSound,
  playTapSound,
  playBubbleClickSound,
} from '../lib/mascotAudio';

const IMAGES = {
  frontHair: 'https://huanmux.github.io/assets/image/serafina/front-hair.png',
  eyes: 'https://huanmux.github.io/assets/image/serafina/eyes-irises.png',
  face: 'https://huanmux.github.io/assets/image/serafina/face.png',
  torsoNeck: 'https://huanmux.github.io/assets/image/serafina/torso-neck.png',
  backHair: 'https://huanmux.github.io/assets/image/serafina/back-hair.png',
};

const OFFLINE_STEP_3_TEXT = 'Tap or click on that Offline icon on the top-right corner to know how';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning.';
  if (hour >= 12 && hour < 17) return 'Good afternoon.';
  if (hour >= 17 && hour < 22) return 'Good evening.';
  return 'Late night, isn’t it?';
}

export function MascotPuppet({ isOnline = true, onOpenServerModal }) {
  const [dismissed, setDismissed] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(getTimeGreeting());
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [bounceKey, setBounceKey] = useState(0);
  const puppetRef = useRef(null);

  // Track if server was ever detected as offline in this session
  const serverWasOfflineRef = useRef(!isOnline);

  // Mouse eye-tracking physics (subtle, very tiny movements only: max 2.4px)
  useEffect(() => {
    if (dismissed) return;

    const handleMouseMove = (e) => {
      if (!puppetRef.current) return;
      const rect = puppetRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width * 0.5;
      const eyeCenterY = rect.top + rect.height * 0.38;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;

      const angle = Math.atan2(dy, dx);
      const MAX_OFFSET = 2.4;
      const intensity = Math.min(dist / 320, 1) * MAX_OFFSET;

      setEyeOffset({
        x: Math.cos(angle) * intensity,
        y: Math.sin(angle) * intensity,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [dismissed]);

  // Play entrance sound on mount
  useEffect(() => {
    playEntranceSound();
  }, []);

  // Play message sound when thought bubble text changes
  const isInitialMsgRef = useRef(true);
  useEffect(() => {
    if (isInitialMsgRef.current) {
      isInitialMsgRef.current = false;
      return;
    }
    if (currentMessage && !dismissed) {
      playMessageSound();
    }
  }, [currentMessage, dismissed]);

  // Dialogue sequencing and automatic exit upon server being online
  useEffect(() => {
    let t1, t2, t3, tExit;

    if (!isOnline) {
      serverWasOfflineRef.current = true;
      setCurrentMessage(getTimeGreeting());

      // 1. Offline detection warning
      t1 = setTimeout(() => {
        setCurrentMessage('Uh oh, looks like the default server is offline right now.');
      }, 2500);

      // 2. Advice to turn on own server
      t2 = setTimeout(() => {
        setCurrentMessage('You can turn on your own server if you want.');
      }, 6500);

      // 3. Instruction to click the offline icon
      t3 = setTimeout(() => {
        setCurrentMessage(OFFLINE_STEP_3_TEXT);
      }, 10500);
    } else {
      // Server is ONLINE
      if (serverWasOfflineRef.current) {
        // Was previously offline (after detecting offline or server selection advice)
        setCurrentMessage('Ah, the server is online now!');
        t1 = setTimeout(() => {
          setCurrentMessage('Talk to me by typing messages here');
          // Wait a few seconds after the last message is sent, then exit
          tExit = setTimeout(() => {
            playExitSound();
            setDismissed(true);
          }, 3800);
        }, 2800);
      } else {
        // Server was online at moment of page visit / reload
        setCurrentMessage(getTimeGreeting());
        t1 = setTimeout(() => {
          setCurrentMessage('Talk to me by typing messages here');
          // Wait a few seconds after the last message is sent, then exit
          tExit = setTimeout(() => {
            playExitSound();
            setDismissed(true);
          }, 3800);
        }, 2500);
      }
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tExit);
    };
  }, [isOnline]);

  const handlePuppetClick = () => {
    // Play cute bouncy sound & animation, do NOT dismiss her
    playTapSound();
    setBounceKey((k) => k + 1);
  };

  const isOfflineHelpActive = currentMessage === OFFLINE_STEP_3_TEXT;

  const handleThoughtBubbleClick = () => {
    if (isOfflineHelpActive && onOpenServerModal) {
      playBubbleClickSound();
      onOpenServerModal();
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.7 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: 'spring',
              stiffness: 320,
              damping: 14,
              mass: 0.8,
            },
          }}
          exit={{
            y: 90,
            opacity: 0,
            scale: 0.6,
            transition: {
              type: 'spring',
              stiffness: 280,
              damping: 20,
              duration: 0.35,
            },
          }}
          className="absolute bottom-full left-0 mb-1.5 z-30 flex items-end gap-2.5 pointer-events-auto select-none"
        >
          {/* Layered Live2D-like Puppet Mascot with Bouncy Click Animation */}
          <motion.div
            ref={puppetRef}
            key={bounceKey}
            animate={
              bounceKey > 0
                ? {
                    scale: [1, 0.82, 1.2, 0.92, 1.08, 1],
                    y: [0, 6, -12, 3, -3, 0],
                    rotate: [0, -6, 6, -3, 2, 0],
                  }
                : {}
            }
            transition={{ duration: 0.45, ease: 'easeOut' }}
            whileTap={{ scale: 0.86 }}
            onClick={handlePuppetClick}
            title="Serafina"
            className="group relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 cursor-pointer filter drop-shadow-md"
          >
            {/* Layer 5 (furthest / back): Back Hair */}
            <img
              src={IMAGES.backHair}
              alt="Back Hair"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]"
              loading="eager"
              decoding="sync"
            />

            {/* Layer 4: Torso & Neck */}
            <img
              src={IMAGES.torsoNeck}
              alt="Torso and Neck"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[2]"
              loading="eager"
              decoding="sync"
            />

            {/* Layer 3: Face */}
            <img
              src={IMAGES.face}
              alt="Face"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[3]"
              loading="eager"
              decoding="sync"
            />

            {/* Layer 2: Eyes Irises (physics tracking mouse cursor) */}
            <img
              src={IMAGES.eyes}
              alt="Eyes"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[4]"
              style={{
                transform: `translate3d(${eyeOffset.x}px, ${eyeOffset.y}px, 0)`,
                transition: 'transform 0.08s ease-out',
                willChange: 'transform',
              }}
              loading="eager"
              decoding="sync"
            />

            {/* Layer 1 (nearest / front): Front Hair */}
            <img
              src={IMAGES.frontHair}
              alt="Front Hair"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[5]"
              loading="eager"
              decoding="sync"
            />
          </motion.div>

          {/* Thought Bubble to the right side of the face */}
          <div className="relative mb-3 sm:mb-4 flex items-center">
            {/* Trailing thought bubble dots */}
            <div className="absolute -left-2.5 bottom-1.5 flex flex-col items-center gap-1 pointer-events-none">
              <span className="w-2 h-2 rounded-full themed-ai-bubble border shadow-xs" />
              <span className="w-1.5 h-1.5 rounded-full themed-ai-bubble border shadow-xs -ml-1" />
            </div>

            {/* Main thought bubble container */}
            <motion.div
              layout
              onClick={handleThoughtBubbleClick}
              className={`themed-ai-bubble px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl rounded-bl-sm border shadow-lg backdrop-blur-md text-xs sm:text-sm font-medium max-w-[200px] sm:max-w-[270px] leading-snug transition-all duration-200 ${
                isOfflineHelpActive
                  ? 'cursor-pointer hover:border-amber-500/60 hover:shadow-amber-500/10 active:scale-98 ring-1 ring-amber-500/30'
                  : 'cursor-default'
              }`}
              title={isOfflineHelpActive ? 'Click to configure server' : undefined}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  className="break-words"
                >
                  {currentMessage}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
