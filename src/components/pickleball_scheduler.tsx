'use client'
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Calendar, Shuffle, Trophy, RotateCcw, X, HelpCircle, Heart } from 'lucide-react';

// Type definitions
interface Match {
  team1: string[];
  team2: string[];
  court: number;
  winner?: number;
}

interface Round {
  round: number;
  matches: Match[];
  sitOut: string[];
  gameCount: { [key: string]: number };
}

interface PlayerStats {
  wins: number;
  losses: number;
  games: number;
}

const PickleballScheduler = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [rounds, setRounds] = useState(8);
  const [availableCourts, setAvailableCourts] = useState(2);
  const [schedule, setSchedule] = useState<Round[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playerStats, setPlayerStats] = useState<{ [key: string]: PlayerStats }>({});
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isUpdatingPlayers, setIsUpdatingPlayers] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(0);

  // Function to get all possible team combinations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAllTeamCombinations = (playerList: string[]) => {
    const teams = [];
    for (let i = 0; i < playerList.length; i++) {
      for (let j = i + 1; j < playerList.length; j++) {
        teams.push([playerList[i], playerList[j]]);
      }
    }
    return teams;
  };

  // Function to check if two teams have played against each other
  const teamsHavePlayed = (team1: string[], team2: string[], usedMatchups: [string[], string[]][]) => {
    return usedMatchups.some(matchup => {
      const [t1, t2] = matchup;
      return (
        (t1[0] === team1[0] && t1[1] === team1[1] && t2[0] === team2[0] && t2[1] === team2[1]) ||
        (t1[0] === team2[0] && t1[1] === team2[1] && t2[0] === team1[0] && t2[1] === team1[1]) ||
        (t1[0] === team1[1] && t1[1] === team1[0] && t2[0] === team2[0] && t2[1] === team2[1]) ||
        (t1[0] === team1[1] && t1[1] === team1[0] && t2[0] === team2[1] && t2[1] === team2[0])
      );
    });
  };

  // Function to shuffle array randomly
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Load players from Google Sheets
  const loadPlayers = async () => {
    try {
      setIsLoadingPlayers(true);
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  // Load schedule and stats from Google Sheets
  const loadSchedule = async () => {
    try {
      setIsLoadingSchedule(true);
      const response = await fetch('/api/schedule');
      const data = await response.json();
      if (data.schedule) {
        setSchedule(data.schedule);
      }
      if (data.stats) {
        setPlayerStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Save schedule and stats to Google Sheets
  const saveSchedule = async () => {
    try {
      setIsSavingSchedule(true);
      setLastSaveTime(Date.now());
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, stats: playerStats })
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Load players when component mounts
  useEffect(() => {
    loadPlayers();
    loadSchedule();
  }, []);

  // Auto-save schedule whenever it changes
  useEffect(() => {
    if (schedule.length > 0 && !isLoadingSchedule) {
      const timeoutId = setTimeout(() => {
        saveSchedule();
      }, 1000); // Debounce for 1 second
      return () => clearTimeout(timeoutId);
    }
  }, [schedule, playerStats]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isSavingSchedule && !isGenerating && document.visibilityState === 'visible' && Date.now() - lastSaveTime > 3000) {
        loadSchedule();
      }
    }, 10000); // Changed to 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isSavingSchedule, isGenerating, lastSaveTime]);

  // Function to generate schedule with better team variety and equal playing time
  const generateSchedule = () => {
    if (players.length < 4) {
      alert('Need at least 4 players to create matches!');
      return;
    }

    setIsGenerating(true);
    
    // Reset stats when generating new schedule
    setPlayerStats({});
    
    setTimeout(() => {
      const newSchedule: Round[] = [];
      const usedMatchups: [string[], string[]][] = [];
      const playerGameCount: { [key: string]: number } = {};
      const playerPartnershipCount: { [key: string]: { [key: string]: number } } = {}; // Track how often players team together
      
      // Shuffle players randomly for better variety
      const shuffledPlayers = shuffleArray(players);
      
      // Initialize counts for each player
      shuffledPlayers.forEach(player => {
        playerGameCount[player] = 0;
        playerPartnershipCount[player] = {};
        shuffledPlayers.forEach(otherPlayer => {
          if (player !== otherPlayer) {
            playerPartnershipCount[player][otherPlayer] = 0;
          }
        });
      });
      
      for (let round = 1; round <= rounds; round++) {
        const roundMatches = [];
        const maxMatchesPerRound = availableCourts;
        let matchesInRound = 0;
        
        // Sort players by number of games played (ascending) to prioritize those who've played less
        const playersByGamesPlayed = [...shuffledPlayers].sort((a, b) => {
          const gamesDiff = playerGameCount[a] - playerGameCount[b];
          if (gamesDiff === 0) {
            return Math.random() - 0.5; // Randomize players with same game count
          }
          return gamesDiff;
        });
        
        const availablePlayers = [...playersByGamesPlayed];
        
        while (availablePlayers.length >= 4 && matchesInRound < maxMatchesPerRound) {
          let bestMatch = null;
          let bestScore = -Infinity;
          
          // Try all possible team combinations from available players
          for (let i = 0; i < availablePlayers.length - 3; i++) {
            for (let j = i + 1; j < availablePlayers.length - 2; j++) {
              const team1 = [availablePlayers[i], availablePlayers[j]];
              
              for (let k = 0; k < availablePlayers.length - 1; k++) {
                if (k === i || k === j) continue;
                for (let l = k + 1; l < availablePlayers.length; l++) {
                  if (l === i || l === j) continue;
                  
                  const team2 = [availablePlayers[k], availablePlayers[l]];
                  
                  // Calculate score for this matchup (higher = better)
                  let score = 0;
                  
                  // HEAVILY prioritize players who have played fewer games
                  const team1Games = team1.reduce((sum, p) => sum + playerGameCount[p], 0);
                  const team2Games = team2.reduce((sum, p) => sum + playerGameCount[p], 0);
                  const totalGames = team1Games + team2Games;
                  score += (shuffledPlayers.length * 10 - totalGames * 5); // Strong bonus for less-played players
                  
                  // HEAVILY penalize repeated partnerships
                  const team1Partnerships = playerPartnershipCount[team1[0]][team1[1]] || 0;
                  const team2Partnerships = playerPartnershipCount[team2[0]][team2[1]] || 0;
                  
                  // Exponential penalty for repeated partnerships
                  score -= Math.pow(team1Partnerships, 3) * 50; // Massive penalty for repeated partnerships
                  score -= Math.pow(team2Partnerships, 3) * 50;
                  
                  // Additional penalty if either team has partnered before
                  if (team1Partnerships > 0) score -= 25;
                  if (team2Partnerships > 0) score -= 25;
                  
                  // Prefer matchups where teams haven't played against each other before
                  if (!teamsHavePlayed(team1, team2, usedMatchups)) {
                    score += 30; // Big bonus for new matchups
                  } else {
                    score -= 15; // Penalty for repeated matchups
                  }
                  
                  // Slight preference for balanced teams (similar total game counts)
                  const teamBalance = Math.abs(team1Games - team2Games);
                  score -= teamBalance * 2;
                  
                  // Small random factor for variety
                  score += Math.random() * 3;
                  
                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = { team1, team2, score };
                  }
                }
              }
            }
          }
          
          if (bestMatch) {
            console.log(`Round ${round}, Match ${matchesInRound + 1}:`, 
              `${bestMatch.team1.join(' & ')} vs ${bestMatch.team2.join(' & ')} (Score: ${bestMatch.score.toFixed(1)})`);
            
            roundMatches.push({
              team1: [...bestMatch.team1],
              team2: [...bestMatch.team2],
              court: matchesInRound + 1
            });
            
            usedMatchups.push([bestMatch.team1, bestMatch.team2] as [string[], string[]]);
            
            // Update game counts and partnership counts
            [...bestMatch.team1, ...bestMatch.team2].forEach(player => {
              playerGameCount[player]++;
              const index = availablePlayers.indexOf(player);
              if (index > -1) availablePlayers.splice(index, 1);
            });
            
            // Update partnership counts - this is crucial for preventing repeats
            playerPartnershipCount[bestMatch.team1[0]][bestMatch.team1[1]]++;
            playerPartnershipCount[bestMatch.team1[1]][bestMatch.team1[0]]++;
            playerPartnershipCount[bestMatch.team2[0]][bestMatch.team2[1]]++;
            playerPartnershipCount[bestMatch.team2[1]][bestMatch.team2[0]]++;
            
            matchesInRound++;
          } else {
            console.log(`No valid matches found for round ${round}`);
            break; // No valid matches found
          }
        }
        
        if (roundMatches.length > 0) {
          newSchedule.push({
            round: round,
            matches: roundMatches,
            sitOut: availablePlayers,
            gameCount: {...playerGameCount}
          });
        }
      }
      
      // Log partnership summary for debugging
      console.log('Final Partnership Counts:');
      Object.keys(playerPartnershipCount).forEach(player => {
        const partnerships = Object.entries(playerPartnershipCount[player])
          .filter(([, count]) => count > 0)
          .map(([partner, count]) => `${partner}:${count}`)
          .join(', ');
        if (partnerships) {
          console.log(`${player}: ${partnerships}`);
        }
      });
      
      setSchedule(newSchedule);
      setIsGenerating(false);
    }, 500);
  };

  const addPlayer = async () => {
    if (newPlayerName.trim() && !isUpdatingPlayers) {
      // Handle comma-separated names
      const names = newPlayerName.split(',').map(name => name.trim()).filter(name => name.length > 0);
      const newNames = names.filter(name => !players.includes(name));
      
      if (newNames.length > 0) {
        try {
          setIsUpdatingPlayers(true);
          await fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', names: newNames })
          });
          await loadPlayers(); // Reload from sheets
        } catch (error) {
          console.error('Error adding players:', error);
        } finally {
          setIsUpdatingPlayers(false);
        }
      }
      setNewPlayerName('');
    }
  };

  const removePlayer = async (playerToRemove: string) => {
    if (!isUpdatingPlayers) {
      try {
        setIsUpdatingPlayers(true);
        await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remove', name: playerToRemove })
        });
        await loadPlayers(); // Reload from sheets
      } catch (error) {
        console.error('Error removing player:', error);
      } finally {
        setIsUpdatingPlayers(false);
      }
    }
  };

  const clearAllPlayers = () => {
    if (!isUpdatingPlayers) {
      setModalType('clearPlayers');
      setShowModal(true);
    }
  };

  // Function to reset all stats
  const resetStats = () => {
    if (!isUpdatingPlayers && !isGenerating) {
      setModalType('resetStats');
      setShowModal(true);
    }
  };

  // Handle modal actions
  const handleModalConfirm = async () => {
    if (modalType === 'clearPlayers') {
      try {
        setIsUpdatingPlayers(true);
        await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear' })
        });
        await loadPlayers(); // Reload from sheets
        setSchedule([]);
        setPlayerStats({});
      } catch (error) {
        console.error('Error clearing players:', error);
      } finally {
        setIsUpdatingPlayers(false);
      }
    } else if (modalType === 'resetStats') {
      setPlayerStats({});
      // Clear winners from all matches
      const newSchedule = schedule.map(round => ({
        ...round,
        matches: round.matches.map(match => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { winner, ...matchWithoutWinner } = match;
          return matchWithoutWinner;
        })
      }));
      setSchedule(newSchedule);
    }
    setShowModal(false);
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  // Function to record match winner
  const recordWinner = (roundIndex: number, matchIndex: number, winningTeam: number) => {
    console.log('Recording winner:', { roundIndex, matchIndex, winningTeam });
    
    const newSchedule = [...schedule];
    const match = newSchedule[roundIndex].matches[matchIndex];
    
    // Set the winner
    match.winner = winningTeam;
    
    // Create a completely new stats object
    const newStats: { [key: string]: PlayerStats } = {};
    
    // Copy existing stats
    Object.keys(playerStats).forEach(player => {
      newStats[player] = { ...playerStats[player] };
    });
    
    // Initialize stats for all players in this match if they don't exist
    [...match.team1, ...match.team2].forEach(player => {
      if (!newStats[player]) {
        newStats[player] = { wins: 0, losses: 0, games: 0 };
      }
    });
    
    // Update wins and losses
    if (winningTeam === 1) {
      match.team1.forEach(player => {
        newStats[player].wins = (newStats[player].wins || 0) + 1;
        newStats[player].games = (newStats[player].games || 0) + 1;
      });
      match.team2.forEach(player => {
        newStats[player].losses = (newStats[player].losses || 0) + 1;
        newStats[player].games = (newStats[player].games || 0) + 1;
      });
    } else if (winningTeam === 2) {
      match.team2.forEach(player => {
        newStats[player].wins = (newStats[player].wins || 0) + 1;
        newStats[player].games = (newStats[player].games || 0) + 1;
      });
      match.team1.forEach(player => {
        newStats[player].losses = (newStats[player].losses || 0) + 1;
        newStats[player].games = (newStats[player].games || 0) + 1;
      });
    }
    
    console.log('New stats object:', newStats);
    
    setSchedule(newSchedule);
    setPlayerStats(newStats);
  };

  // Function to clear match result
  const clearMatchResult = (roundIndex: number, matchIndex: number) => {
    const newSchedule = [...schedule];
    const match = newSchedule[roundIndex].matches[matchIndex];
    
    if (match.winner) {
      const newStats = { ...playerStats };
      
      // Revert the stats
      if (match.winner === 1) {
        match.team1.forEach(player => {
          if (newStats[player]) {
            newStats[player].wins--;
            newStats[player].games--;
          }
        });
        match.team2.forEach(player => {
          if (newStats[player]) {
            newStats[player].losses--;
            newStats[player].games--;
          }
        });
      } else {
        match.team2.forEach(player => {
          if (newStats[player]) {
            newStats[player].wins--;
            newStats[player].games--;
          }
        });
        match.team1.forEach(player => {
          if (newStats[player]) {
            newStats[player].losses--;
            newStats[player].games--;
          }
        });
      }
      
      delete match.winner;
      setSchedule(newSchedule);
      setPlayerStats(newStats);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addPlayer();
    }
  };

return (
  <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8" style={{ fontFamily: 'Roboto Flex, Roboto, system-ui, -apple-system, sans-serif' }}>
    <div className="max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8 px-4">
        <h1 className="font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-lg w-full max-w-4xl mx-auto"
            style={{ 
              filter: 'drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.3))',
              fontFamily: 'Roboto Flex, Roboto, system-ui, -apple-system, sans-serif',
              fontWeight: '900',
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2.5rem, 8vw, 6rem)' // Responsive font size
            }}>
          PickleMatcher
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-4 font-medium" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
          Where pickleball meets its perfect match! 🏓
        </p>
        
        {/* Help Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-blue-200 hover:border-blue-300"
            title="Help & Getting Started"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Help
          </button>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player Management */}
          <div className="bg-white rounded-lg shadow-lg p-6" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Players</h2>
              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {players.length}
              </span>
            </div>
            
            {/* Add Player */}
            <div className="flex mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter player names (comma-separated)"
                disabled={isLoadingPlayers || isUpdatingPlayers}
                className={`flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 ${
                  isLoadingPlayers || isUpdatingPlayers ? 'bg-gray-100 cursor-not-allowed' : 'cursor-text'
                }`}
              />
              <button
                onClick={addPlayer}
                disabled={isLoadingPlayers || isUpdatingPlayers}
                className={`px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isLoadingPlayers || isUpdatingPlayers ? 'bg-gray-400 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isUpdatingPlayers ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Player List */}
            <div className="space-y-2 mb-6">
              {isLoadingPlayers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading players...</p>
                </div>
              ) : isUpdatingPlayers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Updating players...</p>
                </div>
              ) : (
                players.map((player, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 bg-gray-50 rounded-md ${
                    isUpdatingPlayers ? 'opacity-50' : ''
                  }`}>
                    <span className="font-medium text-gray-900">{player}</span>
                    <button
                      onClick={() => removePlayer(player)}
                      disabled={isUpdatingPlayers}
                      className={`text-red-500 hover:text-red-700 transition-colors ${
                        isUpdatingPlayers ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Clear All Button */}
            {players.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={clearAllPlayers}
                  disabled={isLoadingPlayers || isUpdatingPlayers}
                  className={`w-full px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                    isLoadingPlayers || isUpdatingPlayers ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  Clear All Players
                </button>
              </div>
            )}

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rounds
                </label>
                <select
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value))}
                  disabled={isGenerating || isUpdatingPlayers}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    isGenerating || isUpdatingPlayers ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} Round{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Courts
                </label>
                <select
                  value={availableCourts}
                  onChange={(e) => setAvailableCourts(parseInt(e.target.value))}
                  disabled={isGenerating || isUpdatingPlayers}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    isGenerating || isUpdatingPlayers ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} Court{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateSchedule}
              disabled={isGenerating || players.length < 4 || isUpdatingPlayers}
              className={`w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${
                !isGenerating && players.length >= 4 && !isUpdatingPlayers ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Shuffle className="w-5 h-5 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Schedule'}
            </button>
            
            {players.length < 4 && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Need at least 4 players to generate matches
              </p>
            )}
          </div>

          {/* Schedule Display */}
          <div className="bg-white rounded-lg shadow-lg p-6" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <div className="flex items-center mb-4">
              <Calendar className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">Schedule</h2>
            </div>

            {schedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Generate a schedule to see matches here</p>
                {isLoadingSchedule && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">Loading schedule...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {isSavingSchedule && (
                  <div className="flex items-center justify-center p-2 bg-blue-50 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-600">Saving to Google Sheets...</span>
                  </div>
                )}
                {schedule.map((round, roundIndex) => (
                  <div key={roundIndex} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Round {round.round}
                    </h3>
                    
                    <div className="space-y-3">
                      {round.matches.map((match, matchIndex) => (
                        <div key={matchIndex} className="bg-gray-50 p-4 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-gray-600 font-medium">
                              Court {match.court}
                            </div>
                            {match.winner && (
                              <button
                                onClick={() => clearMatchResult(roundIndex, matchIndex)}
                                className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                                title="Clear result"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {/* Team 1 */}
                            <div className={`p-3 rounded-md border-2 transition-all ${
                              match.winner === 1 
                                ? 'border-green-500 bg-green-50' 
                                : match.winner === 2 
                                ? 'border-red-200 bg-gray-50' 
                                : 'border-blue-200 bg-white hover:border-blue-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-blue-600">
                                  {match.team1.join(' & ')}
                                  {match.winner === 1 && (
                                    <Trophy className="inline w-4 h-4 ml-2 text-yellow-500" />
                                  )}
                                </div>
                                {!match.winner && (
                                  <button
                                    onClick={() => recordWinner(roundIndex, matchIndex, 1)}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors cursor-pointer"
                                  >
                                    Winner
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-center text-gray-500 text-sm font-medium">vs</div>
                            
                            {/* Team 2 */}
                            <div className={`p-3 rounded-md border-2 transition-all ${
                              match.winner === 2 
                                ? 'border-green-500 bg-green-50' 
                                : match.winner === 1 
                                ? 'border-red-200 bg-gray-50' 
                                : 'border-red-200 bg-white hover:border-red-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-red-600">
                                  {match.team2.join(' & ')}
                                  {match.winner === 2 && (
                                    <Trophy className="inline w-4 h-4 ml-2 text-yellow-500" />
                                  )}
                                </div>
                                {!match.winner && (
                                  <button
                                    onClick={() => recordWinner(roundIndex, matchIndex, 2)}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors cursor-pointer"
                                  >
                                    Winner
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {round.sitOut.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded-md">
                          <div className="text-sm font-medium text-yellow-800">
                            Sitting out: {round.sitOut.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Game Distribution with Stats */}
        {schedule.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Player Game Distribution & Stats</h3>
              {Object.keys(playerStats).length > 0 && (
                <button
                  onClick={resetStats}
                  disabled={isUpdatingPlayers || isGenerating}
                  className={`px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                    isUpdatingPlayers || isGenerating ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  Reset All Stats
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {(() => {
                const finalGameCount = schedule[schedule.length - 1]?.gameCount || {};
                return players.map(player => {
                  const gameCount = finalGameCount[player] || 0;
                  const stats = playerStats[player] || { wins: 0, losses: 0, games: 0 };
                  return (
                    <div key={player} className="p-4 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{player}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                          {gameCount} scheduled
                        </span>
                      </div>
                      <div className="flex space-x-2 text-sm">
                        <span className={`px-2 py-1 rounded font-medium ${
                          stats.wins > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {stats.wins}W
                        </span>
                        <span className={`px-2 py-1 rounded font-medium ${
                          stats.losses > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {stats.losses}L
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                          {stats.games > 0 ? `${Math.round((stats.wins / stats.games) * 100)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Statistics Summary */}
        {schedule.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Schedule Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-md">
                <div className="text-2xl font-bold text-blue-600">
                  {schedule.reduce((total, round) => total + round.matches.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-600">{players.length}</div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-md">
                <div className="text-2xl font-bold text-purple-600">{rounds}</div>
                <div className="text-sm text-gray-600">Rounds</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-md">
                <div className="text-2xl font-bold text-orange-600">{availableCourts}</div>
                <div className="text-sm text-gray-600">Courts Available</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Made with love */}
      <div className="text-center mt-16 mb-8">
        <p className="text-sm text-gray-500 flex items-center justify-center mb-1">
          Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> by MO
        </p>
        <a 
          href="https://www.malcolmo.co" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
        >
          www.malcolmo.co
        </a>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'clearPlayers' ? 'Clear All Players' : 'Reset Statistics'}
              </h3>
              <button
                onClick={handleModalCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                {modalType === 'clearPlayers' 
                  ? 'Are you sure you want to clear all players? This will also reset the schedule and statistics.'
                  : 'Are you sure you want to reset all player statistics? This will clear all match results.'
                }
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={handleModalCancel}
                  disabled={isUpdatingPlayers}
                  className={`px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    isUpdatingPlayers ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalConfirm}
                  disabled={isUpdatingPlayers}
                  className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                    isUpdatingPlayers ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  {isUpdatingPlayers && modalType === 'clearPlayers' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Clearing...
                    </div>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <HelpCircle className="w-6 h-6 text-blue-600 mr-2" />
                Getting Started Guide
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* App Overview */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">📋 What This App Does</h4>
                <p className="text-gray-700 mb-3">
                  PickleMatcher creates fair, randomized match schedules for your pickleball league. 
                  It ensures equal playing time, avoids repeated partnerships, tracks win/loss statistics, and syncs everything in real-time.
                </p>
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-blue-800 text-sm">
                    <strong>✨ Key Features:</strong> Smart team mixing • Equal playing time • Live win/loss tracking • Real-time sync for all users
                  </p>
                </div>
              </div>

              {/* Important Warning */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>⚠️ Important:</strong> This app should only be used by one group at a time. Clearing players or generating a new schedule will affect what everyone sees. Coordinate with your group before making major changes.
                </p>
              </div>

              {/* Quick Start */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">🚀 Quick Start (3 Steps)</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</span>
                    <div>
                      <strong className="text-gray-900">Add Players:</strong>
                      <p className="text-gray-600 text-sm">Type player names in the input field. Use commas to add multiple players at once (e.g., &ldquo;John, Jane, Mike&rdquo;).</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</span>
                    <div>
                      <strong className="text-gray-900">Configure Settings:</strong>
                      <p className="text-gray-600 text-sm">Choose the number of rounds and available courts for your session.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</span>
                    <div>
                      <strong className="text-gray-900">Generate & Play:</strong>
                      <p className="text-gray-600 text-sm">Click &ldquo;Generate Schedule&rdquo; and start playing! Record match winners as you go.</p>
                    </div>
                  </div>
                </div>
              </div>

{/* Detailed Features */}
<div className="mb-6">
  <h4 className="text-lg font-semibold text-gray-900 mb-3">🎯 How It Works</h4>
  <div className="space-y-4">
    <div>
      <strong className="text-gray-900">Smart Team Generation:</strong>
      <p className="text-gray-600 text-sm">The algorithm ensures players don&apos;t partner with the same person repeatedly and that everyone gets equal playing time.</p>
    </div>
    <div>
      <strong className="text-gray-900">Court Management:</strong>
      <p className="text-gray-600 text-sm">Set your available courts to limit simultaneous matches. Players not playing will sit out that round.</p>
    </div>
    <div>
      <strong className="text-gray-900">Win/Loss Tracking:</strong>
      <p className="text-gray-600 text-sm">Click &ldquo;Winner&rdquo; buttons to record match results. Stats are automatically saved and visible in the Player Game Distribution & Stats area.</p>
    </div>
    <div>
      <strong className="text-gray-900">Real-Time Updates:</strong>
      <p className="text-gray-600 text-sm">All changes are saved automatically and visible to everyone using the app in real-time.</p>
    </div>
  </div>
</div>

              {/* Tips */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">💡 Pro Tips</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>Minimum Players:</strong> You need at least 4 players to generate matches</li>
                    <li>• <strong>Optimal Size:</strong> 6-12 players work best for good variety and rotation</li>
                    <li>• <strong>Adding Players:</strong> You can add players even after generating a schedule</li>
                    <li>• <strong>Court Strategy:</strong> Use fewer courts to ensure everyone plays more often</li>
                    <li>• <strong>Fair Play:</strong> The algorithm prioritizes players who have played fewer games</li>
                    <li>• <strong>Stats Tracking:</strong> Win/loss statistics are tracked and visible</li>
                    <li>• <strong>Clear All:</strong> Clearing all players also resets the schedule and all statistics</li>
                  </ul>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">🔧 Common Questions</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-gray-900">Q: Can I modify the schedule after generating it?</strong>
                    <p className="text-gray-600">A: Yes! You can add/remove players and generate a new schedule anytime. Win/loss stats are preserved unless you reset them.</p>
                  </div>
                  <div>
                    <strong className="text-gray-900">Q: What if I have an odd number of players?</strong>
                    <p className="text-gray-600">A: The app will automatically rotate who sits out each round to ensure fair playing time for everyone.</p>
                  </div>
                  <div>
                    <strong className="text-gray-900">Q: How do I share this with my league?</strong>
                    <p className="text-gray-600">A: Everyone can access the same URL and see real-time updates. The app syncs every 10 seconds automatically.</p>
                  </div>
                  <div>
  <strong className="text-gray-900">Q: Where can I see player statistics?</strong>
  <p className="text-gray-600">A: Statistics are displayed in the app after each match. View win percentages in the Player Game Distribution section below the schedule.</p>
</div>
                  <div>
                    <strong className="text-gray-900">Q: Why does the winner selection sometimes need two clicks?</strong>
                    <p className="text-gray-600">A: The app syncs data every 10 seconds. If you click right before a sync, wait a moment and click again. Your selection will save properly.</p>
                  </div>
                  <div>
                    <strong className="text-gray-900">Q: What happens when I clear all players?</strong>
                    <p className="text-gray-600">A: Clearing all players also resets the entire schedule and all statistics, giving you a fresh start.</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickleballScheduler;