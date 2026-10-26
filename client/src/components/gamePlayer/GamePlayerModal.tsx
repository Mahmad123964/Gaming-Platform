import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GamePlayerModal.module.css';
import { CyberInvadersCanvas, CyberInvadersRef } from './CyberInvadersCanvas';
import { Classic2048, Classic2048Ref } from './Classic2048';
import { SnakeArcade, SnakeArcadeRef } from './SnakeArcade';
import { BrickBreaker, BrickBreakerRef } from './BrickBreaker';
import { TicTacToePro, TicTacToeProRef } from './TicTacToePro';
import { ClassicCheckers, ClassicCheckersRef } from './ClassicCheckers';
import { SolitaireRoyale, SolitaireRoyaleRef } from './SolitaireRoyale';
import { NeonHorizonRacer, NeonHorizonRacerRef } from './NeonHorizonRacer';
import { BlockPuzzle, BlockPuzzleRef } from './BlockPuzzle';
import { BubbleShooter, BubbleShooterRef } from './BubbleShooter';
import { ArcadeCricket, ArcadeCricketRef } from './ArcadeCricket';
import { FlappyNeon, FlappyNeonRef } from './FlappyNeon';
import { GalacticDodge, GalacticDodgeRef } from './GalacticDodge';
import { MemoryMatch, MemoryMatchRef } from './MemoryMatch';
import { MinesweeperRetro, MinesweeperRetroRef } from './MinesweeperRetro';
import { SudokuClassic, SudokuClassicRef } from './SudokuClassic';
import { SlidePuzzle15, SlidePuzzle15Ref } from './SlidePuzzle15';
import { ConnectFour, ConnectFourRef } from './ConnectFour';
import { ReversiOthello, ReversiOthelloRef } from './ReversiOthello';
import { TowerDefenseLite, TowerDefenseLiteRef } from './TowerDefenseLite';
import { EndlessNeonRunner, EndlessNeonRunnerRef } from './EndlessNeonRunner';
import { RetroPong, RetroPongRef } from './RetroPong';
import { WhackAMole, WhackAMoleRef } from './WhackAMole';
import { SimonMemory, SimonMemoryRef } from './SimonMemory';
import { WordGrid, WordGridRef } from './WordGrid';
import { CricketBowlingPro, CricketBowlingProRef } from './CricketBowlingPro';
import { TableTennisRally, TableTennisRallyRef } from './TableTennisRally';
import { SoccerFreeKick, SoccerFreeKickRef } from './SoccerFreeKick';
import { BasketballShootout, BasketballShootoutRef } from './BasketballShootout';
import { CyberSprintRunner, CyberSprintRunnerRef } from './CyberSprintRunner';
import { TurboKart2D, TurboKart2DRef } from './TurboKart2D';
import { GravityRunner, GravityRunnerRef } from './GravityRunner';
import { SunsetDrift, SunsetDriftRef } from './SunsetDrift';
import { AsteroidBeltPilot, AsteroidBeltPilotRef } from './AsteroidBeltPilot';
import { SpaceDefenseLaser, SpaceDefenseLaserRef } from './SpaceDefenseLaser';
import { PixelDungeonRogue, PixelDungeonRogueRef } from './PixelDungeonRogue';
import { AlienPopDefense, AlienPopDefenseRef } from './AlienPopDefense';
import { NeonPacMaze, NeonPacMazeRef } from './NeonPacMaze';
import { NonogramPicross, NonogramPicrossRef } from './NonogramPicross';
import { NumberSequenceMerge, NumberSequenceMergeRef } from './NumberSequenceMerge';
import { LightsOutNeon, LightsOutNeonRef } from './LightsOutNeon';
import { TangramShapeFit, TangramShapeFitRef } from './TangramShapeFit';
import { LaserMirrorRelay, LaserMirrorRelayRef } from './LaserMirrorRelay';
import { PipeConnectHydro, PipeConnectHydroRef } from './PipeConnectHydro';
import { ChessMicroTactics, ChessMicroTacticsRef } from './ChessMicroTactics';
import { SeaBattleNaval, SeaBattleNavalRef } from './SeaBattleNaval';
import { HexConquest, HexConquestRef } from './HexConquest';
import { DotsAndBoxes, DotsAndBoxesRef } from './DotsAndBoxes';
import { AnagramSolverBlitz, AnagramSolverBlitzRef } from './AnagramSolverBlitz';
import { MathBlitzArcade, MathBlitzArcadeRef } from './MathBlitzArcade';
import { BadmintonChallenge, BadmintonChallengeRef } from './BadmintonChallenge';
import { TennisChampionship, TennisChampionshipRef } from './TennisChampionship';
import { HockeyShootout, HockeyShootoutRef } from './HockeyShootout';
import { CricketSuperOver, CricketSuperOverRef } from './CricketSuperOver';
import { FootballPenaltyTournament, FootballPenaltyTournamentRef } from './FootballPenaltyTournament';
import { OffRoadRally, OffRoadRallyRef } from './OffRoadRally';
import { MotorcycleCircuit, MotorcycleCircuitRef } from './MotorcycleCircuit';
import { DriftChampionship, DriftChampionshipRef } from './DriftChampionship';
import { TrafficEscape, TrafficEscapeRef } from './TrafficEscape';
import { MiniGolfDuel, MiniGolfDuelRef } from './MiniGolfDuel';
import { TopDownArenaSurvival, TopDownArenaSurvivalRef } from './TopDownArenaSurvival';
import { RobotCombatArena, RobotCombatArenaRef } from './RobotCombatArena';
import { PlatformAdventure, PlatformAdventureRef } from './PlatformAdventure';
import { StealthMazeMission, StealthMazeMissionRef } from './StealthMazeMission';
import { SpaceBossBattle, SpaceBossBattleRef } from './SpaceBossBattle';
import { TacticalGridBattle, TacticalGridBattleRef } from './TacticalGridBattle';
import { MiniCityBuilder, MiniCityBuilderRef } from './MiniCityBuilder';
import { NavalCommander, NavalCommanderRef } from './NavalCommander';
import { ResourceDefense, ResourceDefenseRef } from './ResourceDefense';
import { ArenaTag, ArenaTagRef } from './ArenaTag';
import { FourPlayerPartyChallenge, FourPlayerPartyChallengeRef } from './FourPlayerPartyChallenge';
import { PhysicsMarbleMaze, PhysicsMarbleMazeRef } from './PhysicsMarbleMaze';
import { ChessPuzzleChallenges, ChessPuzzleChallengesRef } from './ChessPuzzleChallenges';
import { LogicCircuitBuilder, LogicCircuitBuilderRef } from './LogicCircuitBuilder';
import { RhythmReflexChallenge, RhythmReflexChallengeRef } from './RhythmReflexChallenge';
import { NexusCricketChampionship, NexusCricketChampionshipRef } from './NexusCricketChampionship';
import { BadmintonDoublesChallenge, BadmintonDoublesChallengeRef } from './BadmintonDoublesChallenge';
import { TennisGrandSlamMini, TennisGrandSlamMiniRef } from './TennisGrandSlamMini';
import { StreetBasketballDuel, StreetBasketballDuelRef } from './StreetBasketballDuel';
import { HockeyLeagueArena, HockeyLeagueArenaRef } from './HockeyLeagueArena';
import { FormulaSprint, FormulaSprintRef } from './FormulaSprint';
import { MotoStuntChallenge, MotoStuntChallengeRef } from './MotoStuntChallenge';
import { DesertRallyAdventure, DesertRallyAdventureRef } from './DesertRallyAdventure';
import { UrbanTrafficRacer, UrbanTrafficRacerRef } from './UrbanTrafficRacer';
import { NexusArenaShooter, NexusArenaShooterRef } from './NexusArenaShooter';
import { CyberNinjaAdventure, CyberNinjaAdventureRef } from './CyberNinjaAdventure';
import { ZombieSurvivalMini, ZombieSurvivalMiniRef } from './ZombieSurvivalMini';
import { SpaceExplorationMission, SpaceExplorationMissionRef } from './SpaceExplorationMission';
import { DungeonQuestRpgLite, DungeonQuestRpgLiteRef } from './DungeonQuestRpgLite';
import { KingdomDefense, KingdomDefenseRef } from './KingdomDefense';
import { CityTrafficManager, CityTrafficManagerRef } from './CityTrafficManager';
import { IslandSurvivalBuilder, IslandSurvivalBuilderRef } from './IslandSurvivalBuilder';
import { ChessTacticalAcademy, ChessTacticalAcademyRef } from './ChessTacticalAcademy';
import { BusinessTycoonMini, BusinessTycoonMiniRef } from './BusinessTycoonMini';
import { NexusPartyArena, NexusPartyArenaRef } from './NexusPartyArena';
import { AirHockeyChampionship, AirHockeyChampionshipRef } from './AirHockeyChampionship';
import { ArcheryPrecisionChallenge, ArcheryPrecisionChallengeRef } from './ArcheryPrecisionChallenge';
import { PhysicsPinballArcade, PhysicsPinballArcadeRef } from './PhysicsPinballArcade';
import { ColorRhythmArena, ColorRhythmArenaRef } from './ColorRhythmArena';
import { MazeEscapeAdventure, MazeEscapeAdventureRef } from './MazeEscapeAdventure';

interface GamePlayerModalProps {
  gameIdOrSlug: string;
  resume?: boolean;
  onClose: () => void;
  onOpenPlans?: () => void;
  onLog?: (message: string, type?: 'green' | 'blue' | 'yellow' | 'rose' | 'dim' | 'cyan') => void;
}

interface LaunchData {
  launchTicket: string;
  sessionId: string;
  resumption?: {
    resumed: boolean;
    level: number;
    score: number;
    message?: string;
  };
  game: {
    id: string;
    title: string;
    slug: string;
    description: string;
    launchUrl: string;
    isPremium: boolean;
    category?: { id: string; name: string; slug: string };
    minPlayers: number;
    maxPlayers: number;
    supportsBots: boolean;
    integrationType?: string;
  };
  compatibility: {
    status: string;
    code: string;
    message: string;
    details?: any;
  };
}

export const GamePlayerModal: React.FC<GamePlayerModalProps> = ({
  gameIdOrSlug,
  resume = false,
  onClose,
  onOpenPlans,
  onLog
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; code?: string; details?: any } | null>(null);
  const [launchData, setLaunchData] = useState<LaunchData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [scorePersisted, setScorePersisted] = useState<boolean>(false);

  const canvasRef = useRef<CyberInvadersRef | null>(null);
  const c2048Ref = useRef<Classic2048Ref | null>(null);
  const snakeRef = useRef<SnakeArcadeRef | null>(null);
  const breakerRef = useRef<BrickBreakerRef | null>(null);
  const tttRef = useRef<TicTacToeProRef | null>(null);
  const checkersRef = useRef<ClassicCheckersRef | null>(null);
  const solitaireRef = useRef<SolitaireRoyaleRef | null>(null);
  const racerRef = useRef<NeonHorizonRacerRef | null>(null);
  const blockRef = useRef<BlockPuzzleRef | null>(null);
  const bubbleRef = useRef<BubbleShooterRef | null>(null);
  const cricketRef = useRef<ArcadeCricketRef | null>(null);
  const flappyRef = useRef<FlappyNeonRef | null>(null);
  const dodgeRef = useRef<GalacticDodgeRef | null>(null);
  const memoryRef = useRef<MemoryMatchRef | null>(null);
  const minesRef = useRef<MinesweeperRetroRef | null>(null);
  const sudokuRef = useRef<SudokuClassicRef | null>(null);
  const slideRef = useRef<SlidePuzzle15Ref | null>(null);
  const c4Ref = useRef<ConnectFourRef | null>(null);
  const reversiRef = useRef<ReversiOthelloRef | null>(null);
  const tdRef = useRef<TowerDefenseLiteRef | null>(null);
  const runnerRef = useRef<EndlessNeonRunnerRef | null>(null);
  const pongRef = useRef<RetroPongRef | null>(null);
  const moleRef = useRef<WhackAMoleRef | null>(null);
  const simonRef = useRef<SimonMemoryRef | null>(null);
  const wordRef = useRef<WordGridRef | null>(null);
  const bowlingRef = useRef<CricketBowlingProRef | null>(null);
  const ttRallyRef = useRef<TableTennisRallyRef | null>(null);
  const soccerRef = useRef<SoccerFreeKickRef | null>(null);
  const basketRef = useRef<BasketballShootoutRef | null>(null);
  const sprintRef = useRef<CyberSprintRunnerRef | null>(null);
  const kartRef = useRef<TurboKart2DRef | null>(null);
  const gravityRef = useRef<GravityRunnerRef | null>(null);
  const driftRef = useRef<SunsetDriftRef | null>(null);
  const pilotRef = useRef<AsteroidBeltPilotRef | null>(null);
  const laserDefRef = useRef<SpaceDefenseLaserRef | null>(null);
  const rogueRef = useRef<PixelDungeonRogueRef | null>(null);
  const popDefRef = useRef<AlienPopDefenseRef | null>(null);
  const pacRef = useRef<NeonPacMazeRef | null>(null);
  const picrossRef = useRef<NonogramPicrossRef | null>(null);
  const numSeqRef = useRef<NumberSequenceMergeRef | null>(null);
  const lightsRef = useRef<LightsOutNeonRef | null>(null);
  const tangramRef = useRef<TangramShapeFitRef | null>(null);
  const opticsRef = useRef<LaserMirrorRelayRef | null>(null);
  const hydroRef = useRef<PipeConnectHydroRef | null>(null);
  const chessRef = useRef<ChessMicroTacticsRef | null>(null);
  const navalRef = useRef<SeaBattleNavalRef | null>(null);
  const hexRef = useRef<HexConquestRef | null>(null);
  const dotsRef = useRef<DotsAndBoxesRef | null>(null);
  const anagramRef = useRef<AnagramSolverBlitzRef | null>(null);
  const mathRef = useRef<MathBlitzArcadeRef | null>(null);
  const badmintonRef = useRef<BadmintonChallengeRef | null>(null);
  const tennisRef = useRef<TennisChampionshipRef | null>(null);
  const hockeyRef = useRef<HockeyShootoutRef | null>(null);
  const csoRef = useRef<CricketSuperOverRef | null>(null);
  const penaltyRef = useRef<FootballPenaltyTournamentRef | null>(null);
  const rallyRef = useRef<OffRoadRallyRef | null>(null);
  const motoRef = useRef<MotorcycleCircuitRef | null>(null);
  const driftChampRef = useRef<DriftChampionshipRef | null>(null);
  const trafficRef = useRef<TrafficEscapeRef | null>(null);
  const golfRef = useRef<MiniGolfDuelRef | null>(null);
  const arenaSurvRef = useRef<TopDownArenaSurvivalRef | null>(null);
  const botRef = useRef<RobotCombatArenaRef | null>(null);
  const platRef = useRef<PlatformAdventureRef | null>(null);
  const stealthRef = useRef<StealthMazeMissionRef | null>(null);
  const spaceBossRef = useRef<SpaceBossBattleRef | null>(null);
  const tacticalRef = useRef<TacticalGridBattleRef | null>(null);
  const cityRef = useRef<MiniCityBuilderRef | null>(null);
  const navalCmdRef = useRef<NavalCommanderRef | null>(null);
  const resDefRef = useRef<ResourceDefenseRef | null>(null);
  const tagRef = useRef<ArenaTagRef | null>(null);
  const partyRef = useRef<FourPlayerPartyChallengeRef | null>(null);
  const marbleRef = useRef<PhysicsMarbleMazeRef | null>(null);
  const cpuzzRef = useRef<ChessPuzzleChallengesRef | null>(null);
  const circuitRef = useRef<LogicCircuitBuilderRef | null>(null);
  const rhythmRef = useRef<RhythmReflexChallengeRef | null>(null);
  const cricketChampRef = useRef<NexusCricketChampionshipRef | null>(null);
  const badDoublesRef = useRef<BadmintonDoublesChallengeRef | null>(null);
  const tennisGrandRef = useRef<TennisGrandSlamMiniRef | null>(null);
  const streetballRef = useRef<StreetBasketballDuelRef | null>(null);
  const hockeyLeagueRef = useRef<HockeyLeagueArenaRef | null>(null);
  const formulaRef = useRef<FormulaSprintRef | null>(null);
  const motoStuntRef = useRef<MotoStuntChallengeRef | null>(null);
  const desertRallyRef = useRef<DesertRallyAdventureRef | null>(null);
  const urbanTrafficRef = useRef<UrbanTrafficRacerRef | null>(null);
  const arenaShooterRef = useRef<NexusArenaShooterRef | null>(null);
  const cyberNinjaRef = useRef<CyberNinjaAdventureRef | null>(null);
  const zombieSurvRef = useRef<ZombieSurvivalMiniRef | null>(null);
  const spaceExpRef = useRef<SpaceExplorationMissionRef | null>(null);
  const dungeonQuestRef = useRef<DungeonQuestRpgLiteRef | null>(null);
  const kingdomDefRef = useRef<KingdomDefenseRef | null>(null);
  const cityTrafficRef = useRef<CityTrafficManagerRef | null>(null);
  const islandSurvRef = useRef<IslandSurvivalBuilderRef | null>(null);
  const chessTacticsRef = useRef<ChessTacticalAcademyRef | null>(null);
  const tycoonRef = useRef<BusinessTycoonMiniRef | null>(null);
  const nexusPartyRef = useRef<NexusPartyArenaRef | null>(null);
  const airHockeyRef = useRef<AirHockeyChampionshipRef | null>(null);
  const archeryRef = useRef<ArcheryPrecisionChallengeRef | null>(null);
  const pinballRef = useRef<PhysicsPinballArcadeRef | null>(null);
  const colorRhythmRef = useRef<ColorRhythmArenaRef | null>(null);
  const mazeEscapeRef = useRef<MazeEscapeAdventureRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Initialize Game Launch Lifecycle (EP03-01, EP03-03, EP03-04, EP04-01, EP07-02)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setLaunchData(null);
    setScore(0);
    sessionStartTimeRef.current = Date.now();

    // Evaluate client capabilities
    const clientCapabilities = {
      hasCanvas: !!document.createElement('canvas').getContext,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    fetch(`/api/v1/games/${encodeURIComponent(gameIdOrSlug)}/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ clientCapabilities, resume })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const err = new Error(data.message || `Launch failed with HTTP ${res.status}`);
          (err as any).code = data.error || 'LaunchError';
          (err as any).details = data.details;
          (err as any).status = res.status;
          throw err;
        }
        return data as LaunchData;
      })
      .then((data) => {
        if (!mounted) return;
        const resolvedSessionId = data.sessionId || (data as any).session?.sessionId || '';
        data.sessionId = resolvedSessionId;
        setLaunchData(data);
        if (data.resumption?.resumed) {
          setScore(data.resumption.score || 0);
        }
        setLoading(false);
        if (onLog) {
          const resumeMsg = data.resumption?.resumed
            ? ` [Resumed at Wave ${data.resumption.level}]`
            : '';
          onLog(`Game launched successfully: "${data.game.title}" (Session: ${resolvedSessionId.slice(0, 12)}...)${resumeMsg}`, 'green');
          if (data.compatibility.status === 'INCONCLUSIVE') {
            onLog(`Compatibility notice: ${data.compatibility.message}`, 'yellow');
          }
        }
      })
      .catch((err: any) => {
        if (!mounted) return;
        setLoading(false);
        setError({
          message: err.message,
          code: err.code,
          details: err.details
        });
        if (onLog) {
          onLog(`Game launch blocked: ${err.message}`, 'rose');
        }
      });

    return () => {
      mounted = false;
    };
  }, [gameIdOrSlug, resume, onLog]);

  // Handle Session Restart (EP04-03, AC-15.1, AC-15.3)
  const handleRestart = useCallback(async () => {
    if (!launchData) return;

    try {
      const res = await fetch(`/api/v1/sessions/${encodeURIComponent(launchData.sessionId)}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok) {
        setScore(0);
        c2048Ref.current?.restart();
        snakeRef.current?.restart();
        breakerRef.current?.restart();
        tttRef.current?.restart();
        checkersRef.current?.restart();
        solitaireRef.current?.restart();
        racerRef.current?.restart();
        blockRef.current?.restart();
        bubbleRef.current?.restart();
        cricketRef.current?.restart();
        flappyRef.current?.restart();
        dodgeRef.current?.restart();
        memoryRef.current?.restart();
        minesRef.current?.restart();
        sudokuRef.current?.restart();
        slideRef.current?.restart();
        c4Ref.current?.restart();
        reversiRef.current?.restart();
        tdRef.current?.restart();
        runnerRef.current?.restart();
        pongRef.current?.restart();
        moleRef.current?.restart();
        simonRef.current?.restart();
        wordRef.current?.restart();
        bowlingRef.current?.restart();
        ttRallyRef.current?.restart();
        soccerRef.current?.restart();
        basketRef.current?.restart();
        sprintRef.current?.restart();
        kartRef.current?.restart();
        gravityRef.current?.restart();
        driftRef.current?.restart();
        pilotRef.current?.restart();
        laserDefRef.current?.restart();
        rogueRef.current?.restart();
        popDefRef.current?.restart();
        pacRef.current?.restart();
        picrossRef.current?.restart();
        numSeqRef.current?.restart();
        lightsRef.current?.restart();
        tangramRef.current?.restart();
        opticsRef.current?.restart();
        hydroRef.current?.restart();
        chessRef.current?.restart();
        navalRef.current?.restart();
        hexRef.current?.restart();
        dotsRef.current?.restart();
        anagramRef.current?.restart();
        mathRef.current?.restart();
        badmintonRef.current?.restart();
        tennisRef.current?.restart();
        hockeyRef.current?.restart();
        csoRef.current?.restart();
        penaltyRef.current?.restart();
        rallyRef.current?.restart();
        motoRef.current?.restart();
        driftChampRef.current?.restart();
        trafficRef.current?.restart();
        golfRef.current?.restart();
        arenaSurvRef.current?.restart();
        botRef.current?.restart();
        platRef.current?.restart();
        stealthRef.current?.restart();
        spaceBossRef.current?.restart();
        tacticalRef.current?.restart();
        cityRef.current?.restart();
        navalCmdRef.current?.restart();
        resDefRef.current?.restart();
        tagRef.current?.restart();
        partyRef.current?.restart();
        marbleRef.current?.restart();
        cpuzzRef.current?.restart();
        circuitRef.current?.restart();
        rhythmRef.current?.restart();
        cricketChampRef.current?.restart();
        badDoublesRef.current?.restart();
        tennisGrandRef.current?.restart();
        streetballRef.current?.restart();
        hockeyLeagueRef.current?.restart();
        formulaRef.current?.restart();
        motoStuntRef.current?.restart();
        desertRallyRef.current?.restart();
        urbanTrafficRef.current?.restart();
        arenaShooterRef.current?.restart();
        cyberNinjaRef.current?.restart();
        zombieSurvRef.current?.restart();
        spaceExpRef.current?.restart();
        dungeonQuestRef.current?.restart();
        kingdomDefRef.current?.restart();
        cityTrafficRef.current?.restart();
        islandSurvRef.current?.restart();
        chessTacticsRef.current?.restart();
        tycoonRef.current?.restart();
        nexusPartyRef.current?.restart();
        airHockeyRef.current?.restart();
        archeryRef.current?.restart();
        pinballRef.current?.restart();
        colorRhythmRef.current?.restart();
        mazeEscapeRef.current?.restart();
        canvasRef.current?.restart();
        if (onLog) {
          onLog(`Session restarted: Score reset to 0, wave 1 reinitialized (AC-15.1, AC-15.3).`, 'blue');
        }
      } else {
        if (onLog) {
          onLog(`Restart failed: ${data.message}`, 'rose');
        }
      }
    } catch (e: any) {
      if (onLog) onLog(`Restart network error: ${e.message}`, 'rose');
    }
  }, [launchData, onLog]);

  // Handle Return to Catalog & Session Termination (EP04-01, AC-13.3)
  const handleExitAndReturn = useCallback(async () => {
    if (launchData) {
      const activeSessionId = launchData.sessionId || (launchData as any).session?.sessionId;
      if (activeSessionId) {
        try {
          await fetch(`/api/v1/sessions/${encodeURIComponent(activeSessionId)}/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (onLog) {
            onLog(`Single-player session ${activeSessionId.slice(0, 12)} concluded and marked ended (AC-13.3).`, 'dim');
          }
        } catch (_) {}
      }
    }
    onClose();
  }, [launchData, onClose, onLog]);

  // Handle Game Over: record completion score in game_history and evaluate achievements (EP07-01, EP07-04)
  const handleGameOver = useCallback(async (finalScore: number, finalWave: number) => {
    if (!launchData) return;
    if (onLog) {
      onLog(`Game Over recorded for "${launchData.game.title}". Final Score: ${finalScore}, Wave: ${finalWave}`, 'yellow');
    }

    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      const res = await fetch('/api/v1/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gameId: launchData.game.id,
          sessionId: launchData.sessionId,
          score: finalScore,
          level: finalWave,
          durationSeconds,
          state: { wave: finalWave, score: finalScore }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScorePersisted(true);
        if (onLog) {
          onLog(`Game score ${finalScore} successfully saved to player career history (AC-23.1).`, 'green');
        }
        if (data.newAchievements && data.newAchievements.length > 0) {
          setUnlockedAchievements(data.newAchievements);
          for (const ach of data.newAchievements) {
            if (onLog) {
              onLog(`🏆 Achievement Unlocked: "${ach.title}" (+${ach.points} PTS)!`, 'cyan');
            }
          }
        }
      }
    } catch (_) {}
  }, [launchData, onLog]);

  // Handle Wave Complete: save checkpoint progression (EP07-02, AC-24.1)
  const handleWaveComplete = useCallback(async (wave: number, waveScore: number) => {
    if (!launchData) return;
    try {
      await fetch('/api/v1/progress/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gameId: launchData.game.id,
          level: wave,
          score: waveScore,
          state: { wave, score: waveScore }
        })
      });
      if (onLog) {
        onLog(`Checkpoint saved: Advanced to Wave ${wave} (Score: ${waveScore}) (AC-24.1).`, 'blue');
      }
    } catch (_) {}
  }, [launchData, onLog]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleExitAndReturn();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-player-title"
      id="game-player-modal"
    >
      <div className={styles.modalContainer} ref={containerRef}>
        {/* Top Header Bar */}
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <svg className={styles.gameIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <line x1="6" y1="12" x2="10" y2="12" />
              <line x1="8" y1="10" x2="8" y2="14" />
              <circle cx="15" cy="11" r="1" />
              <circle cx="17" cy="13" r="1" />
            </svg>
            <h2 id="game-player-title" className={styles.gameTitle}>
              {launchData?.game.title || 'Game Player Container'}
            </h2>
            <div className={styles.badgeGroup}>
              {launchData?.game.category && (
                <span className={styles.categoryBadge}>{launchData.game.category.name}</span>
              )}
              <span className={styles.modeBadge} id="badge-solo-mode">Single Player</span>
              {launchData?.resumption?.resumed && (
                <span className={styles.categoryBadge} style={{ background: 'rgba(0, 240, 255, 0.2)', color: '#00F0FF' }} id="badge-resumed-wave">
                  Resumed Wave {launchData.resumption.level}
                </span>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.toolButton}
              onClick={handleRestart}
              id="btn-restart-game"
              title="Restart Game Session"
              aria-label="Restart Game Session"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Restart
            </button>
            <button
              className={styles.exitButton}
              onClick={handleExitAndReturn}
              id="btn-exit-game"
              aria-label="Exit Game and Return to Catalog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Exit to Catalog
            </button>
          </div>
        </div>

        {/* Telemetry Strip (Active when game loaded) */}
        {launchData && !error && (
          <div className={styles.telemetryStrip} id="game-telemetry-bar">
            <div className={styles.telemetryLeft}>
              <div className={styles.telemetryItem}>
                <span>SESSION:</span>
                <span className={styles.telemetryValue} id="telemetry-session-id">
                  {(launchData.sessionId || (launchData as any).session?.sessionId || '').slice(0, 14)}...
                </span>
              </div>
              <div className={styles.telemetryItem}>
                <span>LIVE SCORE:</span>
                <span className={styles.telemetryValue} id="telemetry-live-score">
                  {score}
                </span>
                {scorePersisted && (
                  <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 700, marginLeft: '8px' }} id="score-persisted-indicator">
                    ✓ SAVED
                  </span>
                )}
              </div>
            </div>

            <div className={styles.telemetryRight}>
              <button
                className={`${styles.toolButton} ${soundEnabled ? styles.toolButtonActive : ''}`}
                onClick={() => setSoundEnabled(v => !v)}
                title={soundEnabled ? 'Mute Sound (8-Bit Audio Active)' : 'Unmute Sound'}
                id="btn-toggle-sound"
                aria-label="Toggle Sound"
              >
                {soundEnabled ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>

              <button
                className={styles.toolButton}
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                id="btn-toggle-fullscreen"
                aria-label="Toggle Fullscreen"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Viewport Area */}
        <div className={styles.viewportArea}>
          {/* Loading State */}
          {loading && (
            <div className={styles.loadingSpinner} id="game-loading-state">
              <div className={styles.spinnerOrb} />
              <div>Initiating authorized runtime container & licensing clearance...</div>
            </div>
          )}

          {/* Error / Restriction State (AC-9.2, AC-9.3, AC-11.1, AC-12.1) */}
          {error && (
            <div className={`${styles.alertBanner} ${styles.alertError}`} id="game-launch-error-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF0055" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Launch Authorization Failed:</strong> {error.message}
                {(error.code === 'ENTITLEMENT_REQUIRED' || error.code === 'VIP_SUBSCRIPTION_REQUIRED') && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
                      This premium title requires an active Nexus Pro or Nexus Ultimate membership tier (AC-28.2, AC-30.1).
                    </div>
                    {onOpenPlans && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPlans();
                        }}
                        id="btn-player-modal-upgrade"
                        style={{
                          background: 'linear-gradient(135deg, #00F0FF 0%, #3B82F6 100%)',
                          color: '#0B0F19',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ★ View Plans & Upgrade (AC-30.2)
                      </button>
                    )}
                  </div>
                )}
                {error.code === 'ENTITLEMENT_EXPIRED' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
                      Your membership subscription has expired. Please renew your plan to restore instant launch clearance (AC-28.3).
                    </div>
                    {onOpenPlans && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPlans();
                        }}
                        id="btn-player-modal-renew"
                        style={{
                          background: 'linear-gradient(135deg, #FFB800 0%, #FF0055 100%)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ↺ Renew Membership (AC-30.2)
                      </button>
                    )}
                  </div>
                )}
                {error.code === 'CANVAS_UNSUPPORTED' && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
                    Your current client does not support HTML5 Canvas rendering. Please update your browser to Chrome, Edge, or Safari.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compatibility Inconclusive Warning (AC-11.3) */}
          {launchData?.compatibility.status === 'INCONCLUSIVE' && (
            <div className={`${styles.alertBanner} ${styles.alertWarning}`} id="compatibility-fallback-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>Compatibility Notice:</strong> {launchData.compatibility.message}
              </div>
            </div>
          )}

          {/* Active Playable Canvas Viewport */}
          {launchData && !error && (
            <>
              {/* Unlocked Achievements Banner Toast (EP07-04, AC-26.1) */}
              {unlockedAchievements.length > 0 && (
                <div className={styles.achievementToast} id="achievement-unlocked-banner">
                  <div className={styles.achToastIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" />
                    </svg>
                  </div>
                  <div className={styles.achToastText}>
                    <h4>🏆 Achievement Unlocked: {unlockedAchievements[0].title} (+{unlockedAchievements[0].points} PTS)</h4>
                    <p>{unlockedAchievements[0].description}</p>
                  </div>
                </div>
              )}

              {/* Game Viewport Switcher */}
              {(launchData.game.slug === '2048-classic' || launchData.game.slug === '2048') ? (
                <Classic2048
                  ref={c2048Ref}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore, maxTile) => handleGameOver(finalScore, maxTile)}
                />
              ) : (launchData.game.slug === 'snake-arcade' || launchData.game.slug === 'snake') ? (
                <SnakeArcade
                  ref={snakeRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'brick-breaker' || launchData.game.slug === 'neon-breaker') ? (
                <BrickBreaker
                  ref={breakerRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'tic-tac-toe-pro' || launchData.game.slug === 'tic-tac-toe') ? (
                <TicTacToePro
                  ref={tttRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(winner) => handleGameOver(winner === 'X' ? 100 : 0, 1)}
                />
              ) : (launchData.game.slug === 'classic-checkers' || launchData.game.slug === 'checkers') ? (
                <ClassicCheckers
                  ref={checkersRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(winner) => handleGameOver(winner === 'CYAN' ? 200 : 0, 1)}
                />
              ) : (launchData.game.slug === 'solitaire-royale' || launchData.game.slug === 'solitaire') ? (
                <SolitaireRoyale
                  ref={solitaireRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'neon-racer' || launchData.game.slug === 'neon-horizon') ? (
                <NeonHorizonRacer
                  ref={racerRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'block-puzzle' || launchData.game.slug === 'quantum-grid') ? (
                <BlockPuzzle
                  ref={blockRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'bubble-shooter') ? (
                <BubbleShooter
                  ref={bubbleRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'arcade-cricket' || launchData.game.slug === 'cricket') ? (
                <ArcadeCricket
                  ref={cricketRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'flappy-neon' || launchData.game.slug === 'flappy') ? (
                <FlappyNeon
                  ref={flappyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'galactic-dodge' || launchData.game.slug === 'space-dodge') ? (
                <GalacticDodge
                  ref={dodgeRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'memory-match' || launchData.game.slug === 'memory') ? (
                <MemoryMatch
                  ref={memoryRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'minesweeper-retro' || launchData.game.slug === 'minesweeper') ? (
                <MinesweeperRetro
                  ref={minesRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'sudoku-classic' || launchData.game.slug === 'sudoku') ? (
                <SudokuClassic
                  ref={sudokuRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'slide-puzzle-15' || launchData.game.slug === 'slide-puzzle') ? (
                <SlidePuzzle15
                  ref={slideRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'connect-four' || launchData.game.slug === 'connect-4') ? (
                <ConnectFour
                  ref={c4Ref}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(winner) => handleGameOver(winner === 'PLAYER' ? 200 : 0, 1)}
                />
              ) : (launchData.game.slug === 'reversi-othello' || launchData.game.slug === 'reversi' || launchData.game.slug === 'othello') ? (
                <ReversiOthello
                  ref={reversiRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(winner) => handleGameOver(winner === 'BLACK' ? 200 : 0, 1)}
                />
              ) : (launchData.game.slug === 'tower-defense-lite' || launchData.game.slug === 'tower-defense') ? (
                <TowerDefenseLite
                  ref={tdRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'endless-neon-runner' || launchData.game.slug === 'neon-runner') ? (
                <EndlessNeonRunner
                  ref={runnerRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'retro-pong' || launchData.game.slug === 'pong') ? (
                <RetroPong
                  ref={pongRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'whack-a-mole' || launchData.game.slug === 'whackamole') ? (
                <WhackAMole
                  ref={moleRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'simon-memory' || launchData.game.slug === 'simon') ? (
                <SimonMemory
                  ref={simonRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'word-grid' || launchData.game.slug === 'word-hunt') ? (
                <WordGrid
                  ref={wordRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'cricket-bowling-pro') ? (
                <CricketBowlingPro
                  ref={bowlingRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'table-tennis-rally') ? (
                <TableTennisRally
                  ref={ttRallyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'soccer-free-kick') ? (
                <SoccerFreeKick
                  ref={soccerRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'basketball-shootout') ? (
                <BasketballShootout
                  ref={basketRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'cyber-sprint-runner') ? (
                <CyberSprintRunner
                  ref={sprintRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'turbo-kart-2d') ? (
                <TurboKart2D
                  ref={kartRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'gravity-runner') ? (
                <GravityRunner
                  ref={gravityRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'sunset-drift') ? (
                <SunsetDrift
                  ref={driftRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'asteroid-belt-pilot') ? (
                <AsteroidBeltPilot
                  ref={pilotRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'space-defense-laser') ? (
                <SpaceDefenseLaser
                  ref={laserDefRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'pixel-dungeon-rogue') ? (
                <PixelDungeonRogue
                  ref={rogueRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'alien-pop-defense') ? (
                <AlienPopDefense
                  ref={popDefRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'neon-pac-maze') ? (
                <NeonPacMaze
                  ref={pacRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'nonogram-picross') ? (
                <NonogramPicross
                  ref={picrossRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'number-sequence-merge') ? (
                <NumberSequenceMerge
                  ref={numSeqRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'lights-out-neon') ? (
                <LightsOutNeon
                  ref={lightsRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'tangram-shape-fit') ? (
                <TangramShapeFit
                  ref={tangramRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'laser-mirror-relay') ? (
                <LaserMirrorRelay
                  ref={opticsRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'pipe-connect-hydro') ? (
                <PipeConnectHydro
                  ref={hydroRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'chess-micro-tactics') ? (
                <ChessMicroTactics
                  ref={chessRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'sea-battle-naval') ? (
                <SeaBattleNaval
                  ref={navalRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'hex-conquest') ? (
                <HexConquest
                  ref={hexRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'dots-and-boxes') ? (
                <DotsAndBoxes
                  ref={dotsRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'anagram-solver-blitz') ? (
                <AnagramSolverBlitz
                  ref={anagramRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'math-blitz-arcade') ? (
                <MathBlitzArcade
                  ref={mathRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'badminton-challenge') ? (
                <BadmintonChallenge
                  ref={badmintonRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'tennis-championship') ? (
                <TennisChampionship
                  ref={tennisRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'hockey-shootout') ? (
                <HockeyShootout
                  ref={hockeyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'cricket-super-over') ? (
                <CricketSuperOver
                  ref={csoRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'football-penalty-tournament') ? (
                <FootballPenaltyTournament
                  ref={penaltyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'off-road-rally') ? (
                <OffRoadRally
                  ref={rallyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'motorcycle-circuit') ? (
                <MotorcycleCircuit
                  ref={motoRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'drift-championship') ? (
                <DriftChampionship
                  ref={driftChampRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'traffic-escape') ? (
                <TrafficEscape
                  ref={trafficRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'mini-golf-duel') ? (
                <MiniGolfDuel
                  ref={golfRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'top-down-arena-survival') ? (
                <TopDownArenaSurvival
                  ref={arenaSurvRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'robot-combat-arena') ? (
                <RobotCombatArena
                  ref={botRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'platform-adventure') ? (
                <PlatformAdventure
                  ref={platRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'stealth-maze-mission') ? (
                <StealthMazeMission
                  ref={stealthRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'space-boss-battle') ? (
                <SpaceBossBattle
                  ref={spaceBossRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'tactical-grid-battle') ? (
                <TacticalGridBattle
                  ref={tacticalRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'mini-city-builder') ? (
                <MiniCityBuilder
                  ref={cityRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'naval-commander') ? (
                <NavalCommander
                  ref={navalCmdRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'resource-defense') ? (
                <ResourceDefense
                  ref={resDefRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'arena-tag') ? (
                <ArenaTag
                  ref={tagRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'four-player-party-challenge') ? (
                <FourPlayerPartyChallenge
                  ref={partyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'physics-marble-maze') ? (
                <PhysicsMarbleMaze
                  ref={marbleRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'chess-puzzle-challenges') ? (
                <ChessPuzzleChallenges
                  ref={cpuzzRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'logic-circuit-builder') ? (
                <LogicCircuitBuilder
                  ref={circuitRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'rhythm-reflex-challenge') ? (
                <RhythmReflexChallenge
                  ref={rhythmRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'nexus-cricket-championship') ? (
                <NexusCricketChampionship
                  ref={cricketChampRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'badminton-doubles-challenge') ? (
                <BadmintonDoublesChallenge
                  ref={badDoublesRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'tennis-grand-slam-mini') ? (
                <TennisGrandSlamMini
                  ref={tennisGrandRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'street-basketball-duel') ? (
                <StreetBasketballDuel
                  ref={streetballRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'hockey-league-arena') ? (
                <HockeyLeagueArena
                  ref={hockeyLeagueRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'formula-sprint') ? (
                <FormulaSprint
                  ref={formulaRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'moto-stunt-challenge') ? (
                <MotoStuntChallenge
                  ref={motoStuntRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'desert-rally-adventure') ? (
                <DesertRallyAdventure
                  ref={desertRallyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'urban-traffic-racer') ? (
                <UrbanTrafficRacer
                  ref={urbanTrafficRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'nexus-arena-shooter') ? (
                <NexusArenaShooter
                  ref={arenaShooterRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'cyber-ninja-adventure') ? (
                <CyberNinjaAdventure
                  ref={cyberNinjaRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'zombie-survival-mini') ? (
                <ZombieSurvivalMini
                  ref={zombieSurvRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'space-exploration-mission') ? (
                <SpaceExplorationMission
                  ref={spaceExpRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'dungeon-quest-rpg-lite') ? (
                <DungeonQuestRpgLite
                  ref={dungeonQuestRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'kingdom-defense') ? (
                <KingdomDefense
                  ref={kingdomDefRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'city-traffic-manager') ? (
                <CityTrafficManager
                  ref={cityTrafficRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'island-survival-builder') ? (
                <IslandSurvivalBuilder
                  ref={islandSurvRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'chess-tactical-academy') ? (
                <ChessTacticalAcademy
                  ref={chessTacticsRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'business-tycoon-mini') ? (
                <BusinessTycoonMini
                  ref={tycoonRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'nexus-party-arena') ? (
                <NexusPartyArena
                  ref={nexusPartyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'air-hockey-championship') ? (
                <AirHockeyChampionship
                  ref={airHockeyRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'archery-precision-challenge') ? (
                <ArcheryPrecisionChallenge
                  ref={archeryRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'physics-pinball-arcade') ? (
                <PhysicsPinballArcade
                  ref={pinballRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'color-rhythm-arena') ? (
                <ColorRhythmArena
                  ref={colorRhythmRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : (launchData.game.slug === 'maze-escape-adventure') ? (
                <MazeEscapeAdventure
                  ref={mazeEscapeRef}
                  initialScore={launchData?.resumption?.score || 0}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={(finalScore) => handleGameOver(finalScore, 1)}
                />
              ) : launchData.game.integrationType === 'AUTHORIZED_IFRAME' ? (
                <div style={{ width: '100%', height: '540px', position: 'relative' }} id="authorized-iframe-container">
                  <iframe
                    src={launchData.launchDestination}
                    title={launchData.game.title}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    allow="autoplay; fullscreen"
                    id="game-runtime-iframe"
                  />
                </div>
              ) : (
                <CyberInvadersCanvas
                  ref={canvasRef}
                  initialWave={launchData?.resumption?.level || 1}
                  initialScore={launchData?.resumption?.score || 0}
                  soundEnabled={soundEnabled}
                  onScoreUpdate={(s) => setScore(s)}
                  onGameOver={handleGameOver}
                  onWaveComplete={handleWaveComplete}
                />
              )}

              {/* In-Game Footer Controls */}
              <div className={styles.footerControls}>
                <button
                  className={styles.restartBtn}
                  onClick={handleRestart}
                  id="btn-session-restart"
                  title="Restart session and reset score to 0 (AC-15.1, AC-15.3)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Restart Mission
                </button>

                <button
                  className={styles.returnCatalogBtn}
                  onClick={handleExitAndReturn}
                  id="btn-return-catalog"
                >
                  Return to Catalog
                </button>
              </div>
            </>
          )}

          {/* If launch failed, provide Return button */}
          {error && (
            <button
              className={styles.returnCatalogBtn}
              onClick={onClose}
              id="btn-dismiss-error"
              style={{ marginTop: '20px' }}
            >
              Return to Catalog
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
