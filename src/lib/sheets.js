import { google } from 'googleapis';

// Initialize auth with credentials
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: 'picklematcher',
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '')}`,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Use environment variable for spreadsheet ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Players Management Functions
export async function getPlayers() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!A2:A100',
    });
    
    const rows = response.data.values || [];
    const players = rows.map(row => row[0]).filter(Boolean);
    
    return players;
  } catch (error) {
    console.error('Error getting players:', error);
    throw error;
  }
}

export async function addPlayers(names) {
  try {
    const currentPlayers = await getPlayers();
    const startRow = currentPlayers.length + 2;
    
    const values = names.map(name => [name]);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `Players!A${startRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error adding players:', error);
    throw error;
  }
}

export async function removePlayer(name) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!A2:A100',
    });
    
    const rows = response.data.values || [];
    const playerIndex = rows.findIndex(row => row[0] === name);
    
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }
    
    const rowToDelete = playerIndex + 2;
    
    // Get the actual sheet ID for Players sheet
    const sheetId = await getSheetId('Players');
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowToDelete - 1,
              endIndex: rowToDelete,
            },
          },
        }],
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
}

export async function clearAllPlayers() {
  try {
    // Clear players
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!A2:A100',
    });
    
    // Also clear the schedule and stats when clearing players
    await clearSchedule();
    await clearStats();
    
    return true;
  } catch (error) {
    console.error('Error clearing players:', error);
    throw error;
  }
}

// Schedule Management Functions
export async function getSchedule() {
  try {
    // Ensure the ScheduleData sheet exists
    await ensureSheetExists('ScheduleData');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ScheduleData!A1:A1',
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0 || !rows[0][0]) {
      return { schedule: [], stats: {} };
    }
    
    // Parse the JSON data
    try {
      const data = JSON.parse(rows[0][0]);
      return data;
    } catch (parseError) {
      console.error('Error parsing schedule data:', parseError);
      return { schedule: [], stats: {} };
    }
  } catch (error) {
    console.error('Error getting schedule:', error);
    // Return empty data if there's any error
    return { schedule: [], stats: {} };
  }
}

export async function saveSchedule(schedule, stats) {
  try {
    // Ensure the ScheduleData sheet exists
    await ensureSheetExists('ScheduleData');
    
    // Convert to JSON string
    const dataToStore = JSON.stringify({ schedule, stats });
    
    // Clear existing data first
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ScheduleData!A1:A1',
    });
    
    // Update the first cell with the JSON data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ScheduleData!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[dataToStore]],
      },
    });
    
    // Also update the visible Stats sheet
    await updateStatsSheet(stats);
    
    return true;
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw error;
  }
}

// Update the visible Stats sheet
async function updateStatsSheet(stats) {
  try {
    await ensureSheetExists('Stats');
    
    // Clear existing stats
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Stats!A2:D100',
    });
    
    // Prepare stats data
    const statsData = [];
    for (const [player, playerStats] of Object.entries(stats)) {
      if (playerStats.games > 0) {
        statsData.push([
          player,
          playerStats.wins || 0,
          playerStats.losses || 0,
          `${Math.round((playerStats.wins / playerStats.games) * 100)}%`
        ]);
      }
    }
    
    // Sort by win percentage (descending)
    statsData.sort((a, b) => {
      const aWinPct = parseInt(a[3]);
      const bWinPct = parseInt(b[3]);
      return bWinPct - aWinPct;
    });
    
    if (statsData.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Stats!A2',
        valueInputOption: 'RAW',
        requestBody: {
          values: statsData,
        },
      });
    }
  } catch (error) {
    console.error('Error updating stats sheet:', error);
  }
}

export async function clearSchedule() {
  try {
    // Clear the ScheduleData sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ScheduleData!A1:A1',
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing schedule:', error);
    // Don't throw error, just log it
  }
}

export async function clearStats() {
  try {
    // Clear the Stats sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Stats!A2:D100',
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing stats:', error);
    // Don't throw error, just log it
  }
}

// Helper Functions
async function getSheetId(sheetName) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheet = response.data.sheets.find(
      s => s.properties.title === sheetName
    );
    
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    
    return sheet.properties.sheetId;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    throw error;
  }
}

async function ensureSheetExists(sheetName) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheetExists = response.data.sheets.some(
      s => s.properties.title === sheetName
    );
    
    if (!sheetExists) {
      console.log(`Creating ${sheetName} sheet...`);
      
      // Create the sheet if it doesn't exist
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                hidden: sheetName === 'ScheduleData', // Only hide ScheduleData
              },
            },
          }],
        },
      });
      
      // Add headers for Stats sheet
      if (sheetName === 'Stats') {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Stats!A1:D1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['Player', 'Wins', 'Losses', 'Win %']],
          },
        });
      }
      
      console.log(`${sheetName} sheet created successfully`);
    }
  } catch (error) {
    console.error('Error ensuring sheet exists:', error);
    // Don't throw the error, just log it
  }
}

// Initialize sheets on first use
export async function initializeSheets() {
  try {
    await ensureSheetExists('Players');
    await ensureSheetExists('ScheduleData');
    await ensureSheetExists('Stats');
    return true;
  } catch (error) {
    console.error('Error initializing sheets:', error);
    throw error;
  }
}

// Export all functions as default object for easier imports
export default {
  getPlayers,
  addPlayers,
  removePlayer,
  clearAllPlayers,
  getSchedule,
  saveSchedule,
  clearSchedule,
  clearStats,
  initializeSheets
};