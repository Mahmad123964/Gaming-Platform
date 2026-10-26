import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './ExpandedGames.module.css';

export interface CricketSuperOverRef {
  restart: () => void;
  getScore: () => number;
}

interface CricketSuperOverProps {
  initialScore?: number;
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onRestart?: () => void;
  soundEnabled?: boolean;
}

type ShotType = 'DRIVE' | 'LOFT' | 'CUT' | 'DEFEND';
type DeliveryType = 'FAST_YORKER' | 'OUTSWINGER' | 'INSWINGER' | 'BOUNCER' | 'SLOWER_BALL';

interface Ball3D {
  x: number;       // Lateral position across pitch (0 = center, -60 = wide leg, +60 = wide off)
  y: number;       // Distance down pitch (0 = bowler hand, 300 = batting crease, 340 = keeper)
  z: number;       // Height above ground (0 = ground, 40 = release/bounce apex)
  vx: number;
  vy: number;
  vz: number;
  bounced: boolean;
  active: boolean;
  hit: boolean;
  deliveryType: DeliveryType;
  isWide: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export const CricketSuperOver = forwardRef<CricketSuperOverRef, CricketSuperOverProps>(({
  initialScore = 0,
  onScoreUpdate,
  onGameOver,
  onRestart,
  soundEnabled = true
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match State
  const [runs, setRuns] = useState<number>(initialScore);
  const [wickets, setWickets] = useState<number>(0);
  const [legalBalls, setLegalBalls] = useState<number>(0); // 0 to 6
  const targetRuns = 16; // Super over target to win
  const [state, setState] = useState<'READY' | 'BOWLING' | 'SHOT_RESULT' | 'MATCH_OVER'>('READY');
  const [commentary, setCommentary] = useState<string>('Nexus Stars need 16 runs from 6 balls to win the Super Over!');
  const [matchResult, setMatchResult] = useState<'WON' | 'LOST' | null>(null);
  const [autoBowlCountdown, setAutoBowlCountdown] = useState<number>(0);

  // Stats
  const [fours, setFours] = useState<number>(0);
  const [sixes, setSixes] = useState<number>(0);
  const [currentDeliveryName, setCurrentDeliveryName] = useState<string>('Ready');

  // Batsman stance
  const batsmanXRef = useRef<number>(0); // -40 to +40 offset
  const batsmanStanceRef = useRef<'NORMAL' | 'DRIVE' | 'LOFT' | 'CUT' | 'DEFEND'>('NORMAL');

  // Ball physics
  const ballRef = useRef<Ball3D>({
    x: 0,
    y: 0,
    z: 45,
    vx: 0,
    vy: 0,
    vz: 0,
    bounced: false,
    active: false,
    hit: false,
    deliveryType: 'FAST_YORKER',
    isWide: false
  });

  const stumpsBrokenRef = useRef<boolean>(false);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(initialScore);
  const animFrameRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio Synthesizer
  const playSound = useCallback((type: 'BAT' | 'WICKET' | 'CHEER' | 'WHISTLE' | 'DOT') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      if (type === 'BAT') {
        // High impact wooden crack: filtered noise burst + sharp click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'WICKET') {
        // Wooden timber crash
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.25);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'CHEER') {
        // Crowd roar: dual harmonic chord
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(554.37, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.85);
        osc2.stop(now + 0.85);
      } else if (type === 'WHISTLE') {
        // Umpire whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.setValueAtTime(2200, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  const updateScore = useCallback((newRuns: number) => {
    scoreRef.current = newRuns;
    setRuns(newRuns);
    onScoreUpdate?.(newRuns);
  }, [onScoreUpdate]);

  const restart = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    scoreRef.current = 0;
    setRuns(0);
    setWickets(0);
    setLegalBalls(0);
    setFours(0);
    setSixes(0);
    setState('READY');
    setMatchResult(null);
    setAutoBowlCountdown(0);
    setCurrentDeliveryName('Ready');
    setCommentary('Nexus Stars need 16 runs from 6 balls to win the Super Over! Tap "Bowl Now" or prepare to bat.');
    batsmanXRef.current = 0;
    batsmanStanceRef.current = 'NORMAL';
    stumpsBrokenRef.current = false;
    particlesRef.current = [];
    ballRef.current = {
      x: 0,
      y: 0,
      z: 45,
      vx: 0,
      vy: 0,
      vz: 0,
      bounced: false,
      active: false,
      hit: false,
      deliveryType: 'FAST_YORKER',
      isWide: false
    };
    onScoreUpdate?.(0);
    onRestart?.();
  }, [onScoreUpdate, onRestart]);

  useImperativeHandle(ref, () => ({
    restart,
    getScore: () => scoreRef.current
  }));

  // AI Bowler starts delivery
  const bowlNextBall = useCallback(() => {
    if (state === 'BOWLING' || state === 'MATCH_OVER') return;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoBowlCountdown(0);
    stumpsBrokenRef.current = false;
    batsmanStanceRef.current = 'NORMAL';

    // AI selects delivery variation
    const pool: DeliveryType[] = ['FAST_YORKER', 'OUTSWINGER', 'INSWINGER', 'BOUNCER', 'SLOWER_BALL'];
    const selected = pool[Math.floor(Math.random() * pool.length)];

    let vx = (Math.random() - 0.5) * 0.4;
    let vy = 6.2;
    let vz = -1.2;
    let initialZ = 50;
    let isWide = false;

    // Small chance (10%) of bowler slipping a wide ball outside tramline
    if (Math.random() < 0.12) {
      isWide = true;
      vx = (Math.random() > 0.5 ? 1 : -1) * 1.6;
    }

    if (selected === 'FAST_YORKER') {
      vy = 7.4;
      vz = -1.6;
      setCurrentDeliveryName('⚡ Fast Yorker');
      setCommentary('Bowler fires a rapid toe-crushing yorker on middle stump!');
    } else if (selected === 'OUTSWINGER') {
      vx = 0.9;
      vy = 6.4;
      vz = -1.1;
      setCurrentDeliveryName('🌀 Outswinger');
      setCommentary('Curving away outside off-stump! Watch your edge!');
    } else if (selected === 'INSWINGER') {
      vx = -0.8;
      vy = 6.6;
      vz = -1.1;
      setCurrentDeliveryName('🎯 Inswinger');
      setCommentary('Darting sharp into the pads! Guard your wickets!');
    } else if (selected === 'BOUNCER') {
      vy = 6.0;
      vz = -1.8;
      initialZ = 55;
      setCurrentDeliveryName('💥 Sharp Bouncer');
      setCommentary('Rising fast towards the helmet! Duck or pull!');
    } else {
      // SLOWER_BALL
      vy = 4.2;
      vz = -0.7;
      setCurrentDeliveryName('🐢 Deceptive Slower Ball');
      setCommentary('Pace taken off the ball... floating towards you!');
    }

    ballRef.current = {
      x: 0,
      y: 10,
      z: initialZ,
      vx,
      vy,
      vz,
      bounced: false,
      active: true,
      hit: false,
      deliveryType: selected,
      isWide
    };

    setState('BOWLING');
  }, [state]);

  // Trigger auto-bowl countdown after shot resolution
  const scheduleNextDelivery = useCallback((currentBalls: number, currentRuns: number, currentWickets: number) => {
    // Check match completion
    if (currentRuns >= targetRuns) {
      setState('MATCH_OVER');
      setMatchResult('WON');
      playSound('CHEER');
      setCommentary(`🏆 CHAMPIONS! Nexus Stars score ${currentRuns} runs and WIN the Super Over!`);
      onGameOver?.(currentRuns);
      return;
    }

    if (currentWickets >= 2) {
      setState('MATCH_OVER');
      setMatchResult('LOST');
      setCommentary(`❌ ALL OUT! 2 wickets down for ${currentRuns} runs. Opponent wins.`);
      onGameOver?.(currentRuns);
      return;
    }

    if (currentBalls >= 6) {
      setState('MATCH_OVER');
      setMatchResult(currentRuns >= targetRuns ? 'WON' : 'LOST');
      setCommentary(`MATCH OVER! 6 balls bowled. Final score: ${currentRuns}/${currentWickets}. Needed ${targetRuns}.`);
      onGameOver?.(currentRuns);
      return;
    }

    // Otherwise countdown to next ball
    let count = 3;
    setAutoBowlCountdown(count);
    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setAutoBowlCountdown(0);
        bowlNextBall();
      } else {
        setAutoBowlCountdown(count);
      }
    }, 1000);
  }, [targetRuns, onGameOver, playSound, bowlNextBall]);

  // Batsman plays shot
  const playShot = useCallback((shot: ShotType) => {
    if (state !== 'BOWLING' || !ballRef.current.active || ballRef.current.hit) return;
    const b = ballRef.current;
    batsmanStanceRef.current = shot;

    // Contact timing check: ball must be within batting strike zone (y: 260 to 310)
    const timing = b.y;
    const lateralDiff = Math.abs(b.x - batsmanXRef.current);

    // If swung far too early or late
    if (timing < 230 || timing > 325) {
      // Swung in air, miss
      setCommentary('Swung too early! Ball completely beat the bat.');
      return;
    }

    b.hit = true;
    b.active = false;
    playSound('BAT');

    // Spawn sparks
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: 240 + b.x * 2.2,
        y: 280,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: '#fbbf24',
        life: 25
      });
    }

    let runsEarned = 0;
    let isOut = false;
    let shotNarrative = '';

    if (shot === 'LOFT') {
      // High risk / high reward
      if (lateralDiff < 14 && timing >= 270 && timing <= 300) {
        runsEarned = 6;
        setSixes(s => s + 1);
        playSound('CHEER');
        shotNarrative = '💥 MASSIVE SIX! Clean strike sailed high into the upper deck!';
      } else if (lateralDiff < 25 && timing >= 255 && timing <= 315) {
        runsEarned = 4;
        setFours(f => f + 1);
        playSound('CHEER');
        shotNarrative = '🔥 ONE BOUNCE FOUR! Cleared mid-off into the boundary cushion!';
      } else {
        // Mistimed loft = caught out!
        isOut = true;
        playSound('WICKET');
        shotNarrative = 'OUT! Mistimed aerial shot caught safely by long-on!';
      }
    } else if (shot === 'DRIVE') {
      // Classic ground drive
      if (lateralDiff < 18 && timing >= 265 && timing <= 305) {
        runsEarned = 4;
        setFours(f => f + 1);
        playSound('CHEER');
        shotNarrative = '🏏 GLORIOUS FOUR! Crisp straight drive pierced the infield gap!';
      } else if (lateralDiff < 32) {
        runsEarned = 2;
        shotNarrative = 'Good placement! Hustled back for a tight couple of runs.';
      } else {
        runsEarned = 1;
        shotNarrative = 'Single taken down to long-off.';
      }
    } else if (shot === 'CUT') {
      // Square cut
      if (b.x > 5 && timing >= 270 && timing <= 310) {
        runsEarned = 4;
        setFours(f => f + 1);
        playSound('CHEER');
        shotNarrative = '⚡ CRACKING CUT SHOT! Carved through backward point for FOUR!';
      } else if (lateralDiff < 30) {
        runsEarned = 2;
        shotNarrative = 'Thick outside edge flies down to third man for 2.';
      } else {
        isOut = true;
        playSound('WICKET');
        shotNarrative = 'OUT! Feathered edge through to the wicketkeeper!';
      }
    } else {
      // DEFEND
      runsEarned = 0;
      shotNarrative = 'Solid defensive block down on the pitch. No run.';
    }

    const nextRuns = scoreRef.current + runsEarned;
    const nextWickets = wickets + (isOut ? 1 : 0);
    const nextBalls = legalBalls + 1;

    if (runsEarned > 0) updateScore(nextRuns);
    if (isOut) setWickets(nextWickets);
    setLegalBalls(nextBalls);
    setCommentary(shotNarrative);
    setState('SHOT_RESULT');

    scheduleNextDelivery(nextBalls, nextRuns, nextWickets);
  }, [state, wickets, legalBalls, playSound, updateScore, scheduleNextDelivery]);

  // Lateral stance adjustment
  const moveBatsman = useCallback((delta: number) => {
    batsmanXRef.current = Math.max(-35, Math.min(35, batsmanXRef.current + delta));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state === 'MATCH_OVER') {
        if (e.key === 'Enter') restart();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        moveBatsman(-12);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        moveBatsman(12);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (state === 'READY' || state === 'SHOT_RESULT') {
          bowlNextBall();
        } else if (state === 'BOWLING') {
          playShot('DRIVE');
        }
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        if (state === 'BOWLING') playShot('LOFT');
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        if (state === 'BOWLING') playShot('DEFEND');
      } else if (e.key === 'c' || e.key === 'C') {
        if (state === 'BOWLING') playShot('CUT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, moveBatsman, bowlNextBall, playShot, restart]);

  // Main 60 FPS Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const W = canvas.width;
      const H = canvas.height;

      // 1. Stadium Grass Outfield with mowing stripes
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5, 150, 105, 0.12)';
      for (let y = 0; y < H; y += 30) {
        ctx.fillRect(0, y, W, 15);
      }

      // Boundary Rope Arc (Top & Bottom)
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, -100, 360, 0, Math.PI);
      ctx.stroke();

      // 2. 2.5D Perspective Pitch (Trapezoid: narrower at bowler, wider at batsman)
      ctx.fillStyle = '#b45309'; // Clay/dirt pitch
      ctx.beginPath();
      ctx.moveTo(W / 2 - 32, 40);
      ctx.lineTo(W / 2 + 32, 40);
      ctx.lineTo(W / 2 + 56, 310);
      ctx.lineTo(W / 2 - 56, 310);
      ctx.closePath();
      ctx.fill();

      // Pitch Turf edge highlights
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Crease Markings (Crisp white lines)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      // Bowling Crease (Top)
      ctx.beginPath();
      ctx.moveTo(W / 2 - 30, 65);
      ctx.lineTo(W / 2 + 30, 65);
      ctx.stroke();

      // Batting Popping Crease (Bottom)
      ctx.beginPath();
      ctx.moveTo(W / 2 - 52, 280);
      ctx.lineTo(W / 2 + 52, 280);
      ctx.stroke();

      // Wide Tramlines (Left & Right of batsman)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 42, 260);
      ctx.lineTo(W / 2 - 42, 295);
      ctx.moveTo(W / 2 + 42, 260);
      ctx.lineTo(W / 2 + 42, 295);
      ctx.stroke();

      // 4. Stumps & Bails
      // Bowler Stumps
      ctx.fillStyle = '#fde047';
      ctx.fillRect(W / 2 - 6, 45, 12, 12);

      // Batsman Stumps
      if (!stumpsBrokenRef.current) {
        ctx.fillStyle = '#fde047';
        // 3 wooden stumps
        ctx.fillRect(W / 2 - 7, 295, 3, 16);
        ctx.fillRect(W / 2 - 1, 295, 3, 16);
        ctx.fillRect(W / 2 + 5, 295, 3, 16);
        // Bails
        ctx.fillStyle = '#f97316';
        ctx.fillRect(W / 2 - 8, 293, 17, 2.5);
      } else {
        // Dislodged stumps
        ctx.fillStyle = '#fde047';
        ctx.fillRect(W / 2 - 14, 298, 12, 3);
        ctx.fillRect(W / 2 + 4, 302, 12, 3);
      }

      // 5. Ball Physics & Rendering
      const b = ballRef.current;
      if (b.active) {
        // Apply velocity
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;

        // Gravity pull on z
        b.vz -= 0.08;

        // Bounce on pitch (z <= 0)
        if (b.z <= 0 && !b.bounced && b.y >= 100 && b.y <= 240) {
          b.bounced = true;
          b.z = 0;
          b.vz = Math.abs(b.vz) * 0.75 + (b.deliveryType === 'BOUNCER' ? 1.8 : 0.8);

          // Seam movement off pitch
          if (b.deliveryType === 'OUTSWINGER') b.vx += 0.35;
          if (b.deliveryType === 'INSWINGER') b.vx -= 0.35;

          // Dust particles on pitch impact
          for (let p = 0; p < 4; p++) {
            particlesRef.current.push({
              x: W / 2 + b.x * 1.5,
              y: b.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2,
              color: '#d97706',
              life: 15
            });
          }
        }

        // Projection mapping to screen coordinates
        const progress = b.y / 300; // 0 to 1
        const pitchWidthFactor = 1.0 + progress * 0.7; // perspective widening
        const screenX = W / 2 + b.x * pitchWidthFactor;
        const screenY = 40 + b.y * 0.85;
        const ballElevation = Math.max(0, b.z) * 0.6;
        const ballRadius = Math.max(3.5, 4.0 + progress * 3.5);

        // Ground shadow directly below ball
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, ballRadius * 1.1, ballRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leather Cricket Ball
        ctx.fillStyle = '#dc2626'; // Deep cricket cherry red
        ctx.beginPath();
        ctx.arc(screenX, screenY - ballElevation, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // White seam seam highlight
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenX, screenY - ballElevation, ballRadius * 0.7, -0.4, 0.4);
        ctx.stroke();

        // AUTOMATED DELIVERY TERMINATION: Ball passes batsman without hit
        if (b.y > 330 && !b.hit) {
          b.active = false;

          // Check if ball bowled the batsman (hit middle/off stumps)
          const hitStumps = Math.abs(b.x) < 8 && b.z < 28 && Math.abs(b.x - batsmanXRef.current) > 10;

          if (hitStumps) {
            stumpsBrokenRef.current = true;
            playSound('WICKET');
            const nextWickets = wickets + 1;
            const nextBalls = legalBalls + 1;
            setWickets(nextWickets);
            setLegalBalls(nextBalls);
            setCommentary('💥 BOWLED HIM! Off-stump knocked out of the ground!');
            setState('SHOT_RESULT');
            scheduleNextDelivery(nextBalls, scoreRef.current, nextWickets);
          } else if (b.isWide || Math.abs(b.x) > 34) {
            // WIDE BALL: 1 extra run, ball re-bowled!
            playSound('WHISTLE');
            const nextRuns = scoreRef.current + 1;
            updateScore(nextRuns);
            setCommentary('🔔 WIDE BALL! Way outside off tramline. 1 extra run, ball to be re-bowled.');
            setState('SHOT_RESULT');
            scheduleNextDelivery(legalBalls, nextRuns, wickets); // Legal balls does NOT advance
          } else {
            // Standard Dot Ball left alone
            playSound('DOT');
            const nextBalls = legalBalls + 1;
            setLegalBalls(nextBalls);
            setCommentary('Dot ball. Clean take by the wicketkeeper behind the stumps.');
            setState('SHOT_RESULT');
            scheduleNextDelivery(nextBalls, scoreRef.current, wickets);
          }
        }
      }

      // 6. Draw Batsman (Nexus Stars Blue Jersey)
      const batX = W / 2 + batsmanXRef.current * 1.6;
      const batY = 275;

      // Batsman body shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(batX, batY + 14, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Batsman legs/pads (White pads)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(batX - 7, batY + 4, 6, 12);
      ctx.fillRect(batX + 1, batY + 4, 6, 12);

      // Torso (Nexus Blue)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(batX, batY - 2, 9, 0, Math.PI * 2);
      ctx.fill();

      // Helmet (Dark Navy)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(batX, batY - 12, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // English Willow Bat (Brown wood with grip)
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(batX, batY);

      if (batsmanStanceRef.current === 'LOFT') {
        ctx.lineTo(batX - 22, batY - 22); // High backlift finish
      } else if (batsmanStanceRef.current === 'CUT') {
        ctx.lineTo(batX - 24, batY + 6); // Horizontal square cut
      } else if (batsmanStanceRef.current === 'DEFEND') {
        ctx.lineTo(batX + 6, batY + 12); // Pushed down forward defense
      } else {
        // DRIVE or NORMAL
        ctx.lineTo(batX + 18, batY - 14); // Extended follow-through
      }
      ctx.stroke();

      // 7. Render Particle Effects
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [legalBalls, wickets, playSound, updateScore, scheduleNextDelivery]);

  return (
    <div className={styles.container} id="cricket-super-over-game" style={{ maxWidth: '680px' }}>
      {/* Super Over Scoreboard */}
      <div className={styles.scoreboard} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
        <div className={styles.scoreItem}>
          <span>Runs</span>
          <span className={styles.scoreValue} id="cricket-runs" style={{ color: '#38bdf8' }}>{runs}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Wickets</span>
          <span className={styles.scoreValue} style={{ color: wickets >= 2 ? '#ef4444' : '#f8fafc' }}>{wickets} / 2</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Balls Bowled</span>
          <span className={styles.scoreValue}>{legalBalls} / 6</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Target</span>
          <span className={styles.scoreValue} style={{ color: '#fbbf24' }}>{targetRuns}</span>
        </div>
        <div className={styles.scoreItem}>
          <span>Need</span>
          <span className={styles.scoreValue} style={{ color: '#10b981' }}>
            {Math.max(0, targetRuns - runs)} off {Math.max(0, 6 - legalBalls)}b
          </span>
        </div>
      </div>

      {/* 2.5D Cricket Pitch Canvas */}
      <div className={styles.canvasWrapper} style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10' }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={320}
          className={styles.gameCanvas}
          id="cso-canvas"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* In-pitch Delivery & Countdown Tag */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.3)'
        }}>
          {currentDeliveryName}
        </div>

        {autoBowlCountdown > 0 && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            background: 'rgba(239, 68, 68, 0.85)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#ffffff',
            fontWeight: 700
          }}>
            Next Ball in {autoBowlCountdown}s
          </div>
        )}

        {/* Victory / Defeat Modal Overlay */}
        {state === 'MATCH_OVER' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>
              {matchResult === 'WON' ? '🏆' : '🏏'}
            </div>
            <h2 style={{
              margin: '0 0 6px 0',
              fontSize: '22px',
              color: matchResult === 'WON' ? '#10b981' : '#f43f5e',
              fontFamily: 'var(--font-heading, sans-serif)'
            }}>
              {matchResult === 'WON' ? 'NEXUS STARS WIN SUPER OVER!' : 'MATCH LOST!'}
            </h2>
            <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#cbd5e1' }}>
              Final: {runs} runs for {wickets} wickets in {legalBalls} balls. (4s: {fours}, 6s: {sixes})
            </p>
            <button
              type="button"
              className={styles.restartBtn}
              id="btn-cso-restart-overlay"
              onClick={restart}
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              🏏 Play Another Super Over
            </button>
          </div>
        )}
      </div>

      {/* Commentary Bar */}
      <div style={{
        margin: '8px 0',
        padding: '6px 12px',
        fontSize: '13px',
        color: '#fef08a',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '6px',
        borderLeft: '3px solid #38bdf8',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {commentary}
      </div>

      {/* On-Screen Touch Controls */}
      <div className={styles.touchControls}>
        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnPrimary}`}
          id="btn-cso-bowl-next"
          onClick={bowlNextBall}
          disabled={state === 'BOWLING' || state === 'MATCH_OVER'}
        >
          🏏 Bowl Now {autoBowlCountdown > 0 ? `(${autoBowlCountdown}s)` : ''}
        </button>

        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-step-left"
          onClick={() => moveBatsman(-12)}
          disabled={state === 'MATCH_OVER'}
          title="Step Stance Left"
        >
          ← Move Left
        </button>

        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-step-right"
          onClick={() => moveBatsman(12)}
          disabled={state === 'MATCH_OVER'}
          title="Step Stance Right"
        >
          Move Right →
        </button>

        <button
          type="button"
          className={`${styles.touchBtn} ${styles.touchBtnDanger}`}
          id="btn-cso-loft"
          onClick={() => playShot('LOFT')}
          disabled={state !== 'BOWLING'}
        >
          🚀 Loft for 6 (↑)
        </button>

        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-drive"
          onClick={() => playShot('DRIVE')}
          disabled={state !== 'BOWLING'}
        >
          🏏 Drive (Space)
        </button>

        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-cut"
          onClick={() => playShot('CUT')}
          disabled={state !== 'BOWLING'}
        >
          ⚡ Cut / Glance (C)
        </button>

        <button
          type="button"
          className={styles.touchBtn}
          id="btn-cso-defend"
          onClick={() => playShot('DEFEND')}
          disabled={state !== 'BOWLING'}
        >
          🛡️ Defend (↓)
        </button>
      </div>

      {/* Bottom Action Strip */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
        <button
          type="button"
          className={styles.restartBtn}
          id="btn-cso-restart"
          onClick={restart}
        >
          Reset Super Over
        </button>
      </div>
    </div>
  );
});

CricketSuperOver.displayName = 'CricketSuperOver';
