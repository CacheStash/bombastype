import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Trophy, Heart, RotateCcw, Gamepad2 } from 'lucide-react';

interface SpaceImpactGameProps {
  brand?: 'subqi' | 'bombastype';
  themeColor?: string;
  accentColor?: string;
  bgColor?: string;
}

// 8-Bit Sprite Bitmaps (1 = solid pixel, 0 = transparent)
const SPRITES = {
  // Player Ship (Space Impact Hero Ship: 14x9)
  player: [
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Alien Scout (Classic Space Impact Bug: 11x8)
  alienScout: [
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  ],
  // Alien Cruiser (12x9)
  alienCruiser: [
    [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  ],
  // Asteroid (8x8)
  asteroid: [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ],
  // Powerup Heart/Repair (7x6)
  heart: [
    [0, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ]
};

// Web Audio API 8-Bit Chiptune Synthesizer
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {}

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  playHit() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  playExplode() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch {}
  }

  playPowerup() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.05);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  playGameOver() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [440, 392, 349, 261];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        const start = this.ctx!.currentTime + idx * 0.12;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.11);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }
}

const sfx = new SoundFX();

export const SpaceImpactGame: React.FC<SpaceImpactGameProps> = ({
  brand = 'bombastype',
  themeColor = '#2c241a',
  accentColor = '#b45309',
  bgColor = '#fdf6e3',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `space_impact_highscore_${brand}`;
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(storageKey) || '0', 10);
    } catch {
      return 0;
    }
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [soundMuted, setSoundMuted] = useState(false);

  const stateRef = useRef({
    score: 0,
    lives: 3,
    highScore: highScore,
    gameState: 'idle' as 'idle' | 'playing' | 'gameover',
    player: { x: 30, y: 100, vx: 0, vy: 0, speed: 3.5, width: 28, height: 18, invulnerable: 0 },
    lasers: [] as Array<{ x: number; y: number; vx: number; width: number; height: number }>,
    enemies: [] as Array<{
      id: number;
      type: 'scout' | 'cruiser' | 'asteroid' | 'glyph';
      glyphChar?: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      hp: number;
      maxHp: number;
      points: number;
    }>,
    powerups: [] as Array<{ x: number; y: number; vx: number; width: number; height: number; type: 'heart' }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>,
    stars: [] as Array<{ x: number; y: number; speed: number; size: number; char?: string }>,
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false },
    lastShootTime: 0,
    spawnTimer: 0,
    powerupTimer: 0,
    internalWidth: 640,
    internalHeight: 280,
  });

  const toggleSound = () => {
    sfx.enabled = !sfx.enabled;
    setSoundMuted(!sfx.enabled);
  };

  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    matrix: number[][],
    x: number,
    y: number,
    pixelSize: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col] === 1) {
          ctx.fillRect(
            Math.round(x + col * pixelSize),
            Math.round(y + row * pixelSize),
            pixelSize,
            pixelSize
          );
        }
      }
    }
  };

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.gameState = 'playing';
    s.player.x = 30;
    s.player.y = s.internalHeight / 2 - 9;
    s.player.invulnerable = 60;
    s.lasers = [];
    s.enemies = [];
    s.powerups = [];
    s.particles = [];
    s.spawnTimer = 0;
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const k = e.code;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(k)) {
        if (s.gameState === 'playing' || k === 'Space') {
          e.preventDefault();
        }
      }

      if (k === 'Space' || k === 'Enter') {
        if (s.gameState === 'idle' || s.gameState === 'gameover') {
          startGame();
          return;
        }
      }

      if (k === 'ArrowUp' || k === 'KeyW') s.keys.ArrowUp = true;
      if (k === 'ArrowDown' || k === 'KeyS') s.keys.ArrowDown = true;
      if (k === 'ArrowLeft' || k === 'KeyA') s.keys.ArrowLeft = true;
      if (k === 'ArrowRight' || k === 'KeyD') s.keys.ArrowRight = true;
      if (k === 'Space') s.keys.Space = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const k = e.code;
      if (k === 'ArrowUp' || k === 'KeyW') s.keys.ArrowUp = false;
      if (k === 'ArrowDown' || k === 'KeyS') s.keys.ArrowDown = false;
      if (k === 'ArrowLeft' || k === 'KeyA') s.keys.ArrowLeft = false;
      if (k === 'ArrowRight' || k === 'KeyD') s.keys.ArrowRight = false;
      if (k === 'Space') s.keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const glyphChars = ['&', '%', '§', '¶', '✦', 'Q', 'B', 'M', 'W'];

    const s = stateRef.current;
    s.stars = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * s.internalWidth,
      y: Math.random() * s.internalHeight,
      speed: 0.5 + Math.random() * 2,
      size: Math.random() > 0.85 ? 2 : 1,
      char: Math.random() > 0.75 ? glyphChars[Math.floor(Math.random() * glyphChars.length)] : undefined,
    }));

    let animationFrameId: number;

    const gameLoop = () => {
      const { internalWidth: W, internalHeight: H } = s;

      if (s.gameState === 'playing') {
        if (s.keys.ArrowUp && s.player.y > 6) s.player.y -= s.player.speed;
        if (s.keys.ArrowDown && s.player.y < H - s.player.height - 6) s.player.y += s.player.speed;
        if (s.keys.ArrowLeft && s.player.x > 8) s.player.x -= s.player.speed;
        if (s.keys.ArrowRight && s.player.x < W * 0.7) s.player.x += s.player.speed;

        const now = Date.now();
        if (s.keys.Space && now - s.lastShootTime > 160) {
          s.lasers.push({
            x: s.player.x + s.player.width,
            y: s.player.y + s.player.height / 2 - 2,
            vx: 8.5,
            width: 10,
            height: 3,
          });
          s.lastShootTime = now;
          sfx.playShoot();
        }

        if (s.player.invulnerable > 0) {
          s.player.invulnerable--;
        }

        s.spawnTimer++;
        const spawnInterval = Math.max(35, 75 - Math.floor(s.score / 200));
        if (s.spawnTimer > spawnInterval) {
          s.spawnTimer = 0;
          const types: Array<'scout' | 'cruiser' | 'asteroid' | 'glyph'> = ['scout', 'scout', 'cruiser', 'asteroid', 'glyph'];
          const chosen = types[Math.floor(Math.random() * types.length)];
          const yPos = 15 + Math.random() * (H - 45);

          if (chosen === 'scout') {
            s.enemies.push({
              id: Math.random(),
              type: 'scout',
              x: W + 20,
              y: yPos,
              vx: -(2.5 + Math.random() * 1.5),
              vy: Math.sin(Date.now() / 300) * 0.8,
              width: 22,
              height: 16,
              hp: 1,
              maxHp: 1,
              points: 50,
            });
          } else if (chosen === 'cruiser') {
            s.enemies.push({
              id: Math.random(),
              type: 'cruiser',
              x: W + 20,
              y: yPos,
              vx: -1.8,
              vy: (Math.random() - 0.5) * 1.2,
              width: 24,
              height: 18,
              hp: 3,
              maxHp: 3,
              points: 120,
            });
          } else if (chosen === 'asteroid') {
            s.enemies.push({
              id: Math.random(),
              type: 'asteroid',
              x: W + 20,
              y: yPos,
              vx: -(1.5 + Math.random()),
              vy: 0,
              width: 18,
              height: 18,
              hp: 2,
              maxHp: 2,
              points: 30,
            });
          } else {
            const rogueGlyph = glyphChars[Math.floor(Math.random() * glyphChars.length)];
            s.enemies.push({
              id: Math.random(),
              type: 'glyph',
              glyphChar: rogueGlyph,
              x: W + 20,
              y: yPos,
              vx: -2.2,
              vy: Math.cos(Date.now() / 400) * 1.2,
              width: 20,
              height: 20,
              hp: 2,
              maxHp: 2,
              points: 80,
            });
          }
        }

        s.powerupTimer++;
        if (s.powerupTimer > 900) {
          s.powerupTimer = 0;
          if (s.lives < 4) {
            s.powerups.push({
              x: W + 10,
              y: 20 + Math.random() * (H - 50),
              vx: -1.4,
              width: 14,
              height: 12,
              type: 'heart',
            });
          }
        }

        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const l = s.lasers[i];
          l.x += l.vx;
          if (l.x > W) {
            s.lasers.splice(i, 1);
            continue;
          }

          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const e = s.enemies[j];
            if (
              l.x < e.x + e.width &&
              l.x + l.width > e.x &&
              l.y < e.y + e.height &&
              l.y + l.height > e.y
            ) {
              e.hp -= 1;
              s.lasers.splice(i, 1);

              for (let p = 0; p < 4; p++) {
                s.particles.push({
                  x: l.x,
                  y: l.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 12,
                  maxLife: 12,
                  color: accentColor,
                  size: 2,
                });
              }

              if (e.hp <= 0) {
                sfx.playExplode();
                s.score += e.points;
                setScore(s.score);
                if (s.score > s.highScore) {
                  s.highScore = s.score;
                  setHighScore(s.highScore);
                  try {
                    localStorage.setItem(storageKey, String(s.score));
                  } catch {}
                }

                for (let p = 0; p < 14; p++) {
                  s.particles.push({
                    x: e.x + e.width / 2,
                    y: e.y + e.height / 2,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    color: p % 2 === 0 ? themeColor : accentColor,
                    size: Math.random() > 0.5 ? 3 : 2,
                  });
                }
                s.enemies.splice(j, 1);
              } else {
                sfx.playHit();
              }
              break;
            }
          }
        }

        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          e.x += e.vx;
          e.y += e.vy;

          if (e.y < 8 || e.y > H - e.height - 8) {
            e.vy *= -1;
          }

          if (e.x < -40) {
            s.enemies.splice(i, 1);
            continue;
          }

          if (
            s.player.invulnerable === 0 &&
            s.player.x < e.x + e.width &&
            s.player.x + s.player.width > e.x &&
            s.player.y < e.y + e.height &&
            s.player.y + s.player.height > e.y
          ) {
            s.lives -= 1;
            setLives(s.lives);
            s.player.invulnerable = 60;
            sfx.playHit();

            for (let p = 0; p < 10; p++) {
              s.particles.push({
                x: s.player.x + 10,
                y: s.player.y + 10,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 16,
                maxLife: 16,
                color: '#ef4444',
                size: 2,
              });
            }

            if (s.lives <= 0) {
              s.gameState = 'gameover';
              setGameState('gameover');
              sfx.playGameOver();
            }
          }
        }

        for (let i = s.powerups.length - 1; i >= 0; i--) {
          const p = s.powerups[i];
          p.x += p.vx;
          if (p.x < -20) {
            s.powerups.splice(i, 1);
            continue;
          }

          if (
            s.player.x < p.x + p.width &&
            s.player.x + s.player.width > p.x &&
            s.player.y < p.y + p.height &&
            s.player.y + s.player.height > p.y
          ) {
            s.lives = Math.min(4, s.lives + 1);
            setLives(s.lives);
            s.score += 100;
            setScore(s.score);
            sfx.playPowerup();
            s.powerups.splice(i, 1);
          }
        }
      }

      s.stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = W;
          star.y = Math.random() * H;
        }
      });

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(44, 36, 26, 0.04)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      s.stars.forEach((star) => {
        if (star.char) {
          ctx.fillStyle = 'rgba(44, 36, 26, 0.22)';
          ctx.font = '10px serif';
          ctx.fillText(star.char, star.x, star.y);
        } else {
          ctx.fillStyle = 'rgba(44, 36, 26, 0.35)';
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
      });

      s.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      });

      ctx.fillStyle = accentColor;
      s.lasers.forEach((l) => {
        ctx.fillRect(l.x, l.y, l.width, l.height);
      });

      s.powerups.forEach((pu) => {
        drawSprite(ctx, SPRITES.heart, pu.x, pu.y, 2, '#ef4444');
      });

      s.enemies.forEach((e) => {
        if (e.type === 'scout') {
          drawSprite(ctx, SPRITES.alienScout, e.x, e.y, 2, themeColor);
        } else if (e.type === 'cruiser') {
          drawSprite(ctx, SPRITES.alienCruiser, e.x, e.y, 2, themeColor);
        } else if (e.type === 'asteroid') {
          drawSprite(ctx, SPRITES.asteroid, e.x, e.y, 2, themeColor);
        } else if (e.type === 'glyph' && e.glyphChar) {
          ctx.save();
          ctx.fillStyle = accentColor;
          ctx.font = 'bold 20px serif';
          ctx.fillText(e.glyphChar, e.x, e.y + 16);
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(e.x - 2, e.y, 22, 20);
          ctx.restore();
        }
      });

      if (s.gameState === 'playing' || s.gameState === 'idle') {
        const shouldBlink = s.player.invulnerable > 0 && Math.floor(s.player.invulnerable / 4) % 2 === 0;
        if (!shouldBlink) {
          drawSprite(ctx, SPRITES.player, s.player.x, s.player.y, 2, themeColor);
          if (s.gameState === 'playing' && Math.random() > 0.3) {
            ctx.fillStyle = accentColor;
            ctx.fillRect(s.player.x - 4, s.player.y + 7, 4, 4);
          }
        }
      }

      if (s.gameState === 'playing') {
        ctx.fillStyle = themeColor;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`SCORE: ${s.score}`, 12, 18);
        ctx.fillText(`HI: ${s.highScore}`, 120, 18);

        for (let i = 0; i < s.lives; i++) {
          drawSprite(ctx, SPRITES.heart, W - 18 - i * 16, 8, 1.5, '#ef4444');
        }
      }

      if (s.gameState === 'idle') {
        ctx.fillStyle = 'rgba(44, 36, 26, 0.72)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#fdf6e3';
        ctx.textAlign = 'center';

        ctx.font = 'bold 16px monospace';
        ctx.fillText('SPACE IMPACT : VINTAGE ATELIER EDITION', W / 2, H / 2 - 28);

        ctx.font = '11px monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('PRESS [SPACEBAR] OR TAP TO LAUNCH', W / 2, H / 2 + 6);

        ctx.font = '10px monospace';
        ctx.fillStyle = '#fdf6e3';
        ctx.fillText('CONTROLS: ARROWS / WASD = MOVE  •  SPACE = FIRE', W / 2, H / 2 + 32);

        ctx.textAlign = 'left';
      }

      if (s.gameState === 'gameover') {
        ctx.fillStyle = 'rgba(44, 36, 26, 0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('MISSION COMPROMISED (GAME OVER)', W / 2, H / 2 - 24);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#fdf6e3';
        ctx.fillText(`FINAL SCORE: ${s.score}   •   HIGH SCORE: ${s.highScore}`, W / 2, H / 2 + 6);

        ctx.font = '11px monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('PRESS [SPACEBAR] OR TAP TO RETRY', W / 2, H / 2 + 34);

        ctx.textAlign = 'left';
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [brand, themeColor, accentColor, bgColor]);

  const handleTouchDir = (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => {
    const s = stateRef.current;
    if (dir === 'up') s.keys.ArrowUp = pressed;
    if (dir === 'down') s.keys.ArrowDown = pressed;
    if (dir === 'left') s.keys.ArrowLeft = pressed;
    if (dir === 'right') s.keys.ArrowRight = pressed;
  };

  const handleTouchFire = (pressed: boolean) => {
    const s = stateRef.current;
    if (pressed) {
      if (s.gameState === 'idle' || s.gameState === 'gameover') {
        startGame();
        return;
      }
    }
    s.keys.Space = pressed;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full relative border-2 border-vintage-ink bg-vintage-paper shadow-md"
    >
      {/* Top Arcade Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-vintage-ink/30 bg-vintage-ink text-vintage-paper text-[10px] font-mono uppercase font-bold tracking-widest">
        <div className="flex items-center gap-2">
          <Gamepad2 size={13} className="text-amber-400 animate-pulse" />
          <span>Space Impact [Heritage 8-Bit]</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Trophy size={12} className="text-amber-400" />
            <span>HI: {highScore}</span>
          </div>
          <button
            onClick={toggleSound}
            className="hover:opacity-70 p-1 flex items-center gap-1 transition-opacity"
            title={soundMuted ? 'Unmute 8-Bit Audio' : 'Mute 8-Bit Audio'}
          >
            {soundMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-green-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        className="relative w-full cursor-crosshair overflow-hidden select-none"
        onClick={() => {
          if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={280}
          className="w-full h-[220px] sm:h-[280px] block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Mobile Touch Controller */}
      <div className="p-3 border-t border-vintage-ink/20 bg-vintage-ink/5 flex items-center justify-between sm:hidden">
        <div className="grid grid-cols-3 gap-1 w-28">
          <div />
          <button
            onTouchStart={() => handleTouchDir('up', true)}
            onTouchEnd={() => handleTouchDir('up', false)}
            className="w-8 h-8 bg-vintage-ink text-vintage-paper font-bold text-xs flex items-center justify-center rounded active:bg-amber-700"
          >
            ▲
          </button>
          <div />
          <button
            onTouchStart={() => handleTouchDir('left', true)}
            onTouchEnd={() => handleTouchDir('left', false)}
            className="w-8 h-8 bg-vintage-ink text-vintage-paper font-bold text-xs flex items-center justify-center rounded active:bg-amber-700"
          >
            ◀
          </button>
          <button
            onTouchStart={() => handleTouchDir('down', true)}
            onTouchEnd={() => handleTouchDir('down', false)}
            className="w-8 h-8 bg-vintage-ink text-vintage-paper font-bold text-xs flex items-center justify-center rounded active:bg-amber-700"
          >
            ▼
          </button>
          <button
            onTouchStart={() => handleTouchDir('right', true)}
            onTouchEnd={() => handleTouchDir('right', false)}
            className="w-8 h-8 bg-vintage-ink text-vintage-paper font-bold text-xs flex items-center justify-center rounded active:bg-amber-700"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-3">
          {gameState === 'gameover' && (
            <button
              onClick={startGame}
              className="px-3 py-2 bg-vintage-ink text-vintage-paper text-[10px] font-mono font-bold uppercase rounded flex items-center gap-1 active:bg-amber-700"
            >
              <RotateCcw size={12} /> Retry
            </button>
          )}
          <button
            onTouchStart={() => handleTouchFire(true)}
            onTouchEnd={() => handleTouchFire(false)}
            onMouseDown={() => handleTouchFire(true)}
            onMouseUp={() => handleTouchFire(false)}
            className="w-14 h-14 rounded-full font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center border-2 border-vintage-ink shadow active:scale-95 transition-transform bg-[#b45309] text-white"
          >
            FIRE
          </button>
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-between px-3 py-1 text-[9px] font-mono text-vintage-ink/50 bg-vintage-paper">
        <span>Heritage Arcade Protocol • Press [Space] or [Tap] to play</span>
        <span>Destroy rogue letterforms & space aliens</span>
      </div>
    </div>
  );
};

export default SpaceImpactGame;
