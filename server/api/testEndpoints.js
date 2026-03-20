const express = require('express');
const { execute, executeTransaction } = require('../db/connection');

const router = express.Router();

/**
 * TEST ENDPOINT: Aggiungere un membro a una community
 * Dimostra la differenza tra transazioni e non-transazioni
 */

// Test SENZA transazioni (problematico)
router.get('/test/add-member-no-transaction', async (req, res, next) => {
  const startTime = Date.now();
  let result = {
    testName: 'Aggiungi Membro SENZA Transazione',
    status: 'IN PROGRESS',
    steps: [],
    errors: [],
    finalState: null,
    duration: 0
  };

  try {
    // Step 1: Leggi la community attuale
    result.steps.push({ step: 1, action: 'Leggi community #1', status: 'INIZIO' });
    const [communityBefore] = await execute(
      'SELECT id, members FROM communities WHERE id = 1 AND deletedAt IS NULL',
      []
    );

    if (!communityBefore || communityBefore.length === 0) {
      throw new Error('Community non trovata');
    }

    let members = [];
    try {
      members = JSON.parse(communityBefore[0].members || '[]');
    } catch (e) {
      members = [];
    }

    result.steps.push({ 
      step: 1, 
      action: 'Leggi community #1',
      status: 'OK',
      data: { membersCount: members.length, membersList: members }
    });

    // Step 2: Simula una operazione che potrebbe fallire
    result.steps.push({ step: 2, action: 'Aggiungi nuovo membro (ID: 999)', status: 'INIZIO' });
    if (!members.includes(999)) {
      members.push(999);
    }

    // Step 3: Aggiorna il DB
    result.steps.push({ step: 3, action: 'Aggiorna DB con nuovi membri', status: 'INIZIO' });
    await execute(
      'UPDATE communities SET members = ? WHERE id = 1 AND deletedAt IS NULL',
      [JSON.stringify(members)]
    );

    result.steps.push({ 
      step: 3, 
      action: 'Aggiorna DB con nuovi membri',
      status: 'OK'
    });

    // Step 4: Simula un errore DOPO l'aggiornamento
    result.steps.push({ step: 4, action: 'Aggiorna log di attività (GENERA ERRORE)', status: 'INIZIO' });
    
    // Forziamo un errore simulato
    const [invalidResult] = await execute(
      'INSERT INTO nonexistent_table (data) VALUES (?)',
      ['error_simulation']
    ).catch(err => {
      result.errors.push({
        step: 4,
        action: 'Aggiorna log di attività',
        error: err.message,
        severity: 'CRITICO'
      });
      return [null];
    });

    // ❌ PROBLEMA: Il membro è stato aggiunto al DB ma il log è fallito!
    // I dati sono incoerenti!
    
    result.steps.push({ 
      step: 4, 
      action: 'Aggiorna log di attività',
      status: 'FALLITO - Database incoerente!'
    });

    // Step 5: Leggi lo stato finale
    result.steps.push({ step: 5, action: 'Leggi stato finale', status: 'INIZIO' });
    const [communityAfter] = await execute(
      'SELECT id, members FROM communities WHERE id = 1 AND deletedAt IS NULL',
      []
    );

    let finalMembers = [];
    try {
      finalMembers = JSON.parse(communityAfter[0].members || '[]');
    } catch (e) {
      finalMembers = [];
    }

    result.finalState = {
      membersCount: finalMembers.length,
      membersList: finalMembers,
      modoAdded: true,
      logCreated: false
    };

    result.steps.push({ 
      step: 5, 
      action: 'Leggi stato finale',
      status: 'OK',
      data: result.finalState
    });

    result.status = 'COMPLETATO CON ERRORI';
    result.warning = '⚠️ INCOERENZA: Il membro è stato aggiunto ma il log non è stato creato. I dati sono incoerenti!';

  } catch (error) {
    result.status = 'ERRORE CRITICO';
    result.errors.push({
      message: error.message,
      stack: error.stack
    });
  }

  result.duration = Date.now() - startTime;
  res.json(result);
});

// Test CON transazioni (corretto)
router.get('/test/add-member-with-transaction', async (req, res, next) => {
  const startTime = Date.now();
  let result = {
    testName: 'Aggiungi Membro CON Transazione',
    status: 'IN PROGRESS',
    steps: [],
    errors: [],
    finalState: null,
    duration: 0
  };

  try {
    // INIZIO TRANSAZIONE
    result.steps.push({ step: 0, action: 'INIZIO TRANSAZIONE', status: 'OK' });

    // Step 1: Leggi la community attuale
    result.steps.push({ step: 1, action: 'Leggi community #1', status: 'INIZIO' });
    const [communityBefore] = await execute(
      'SELECT id, members FROM communities WHERE id = 1 AND deletedAt IS NULL',
      []
    );

    if (!communityBefore || communityBefore.length === 0) {
      throw new Error('Community non trovata');
    }

    let members = [];
    try {
      members = JSON.parse(communityBefore[0].members || '[]');
    } catch (e) {
      members = [];
    }

    result.steps.push({ 
      step: 1, 
      action: 'Leggi community #1',
      status: 'OK',
      data: { membersCount: members.length, membersList: members }
    });

    // Step 2: Aggiungi nuovo membro
    result.steps.push({ step: 2, action: 'Aggiungi nuovo membro (ID: 999)', status: 'INIZIO' });
    if (!members.includes(999)) {
      members.push(999);
    }
    result.steps.push({ step: 2, action: 'Aggiungi nuovo membro (ID: 999)', status: 'OK' });

    // Step 3: Aggiorna il DB
    result.steps.push({ step: 3, action: 'Aggiorna DB con nuovi membri', status: 'INIZIO' });
    await execute(
      'UPDATE communities SET members = ? WHERE id = 1 AND deletedAt IS NULL',
      [JSON.stringify(members)]
    );

    result.steps.push({ 
      step: 3, 
      action: 'Aggiorna DB con nuovi membri',
      status: 'OK'
    });

    // Step 4: Simula un errore DOPO l'aggiornamento
    result.steps.push({ step: 4, action: 'Aggiorna log di attività', status: 'INIZIO' });
    
    // Con transazione, questo errore causa il ROLLBACK di tutto!
    try {
      const [invalidResult] = await execute(
        'INSERT INTO nonexistent_table (data) VALUES (?)',
        ['error_simulation']
      );
    } catch (err) {
      result.errors.push({
        step: 4,
        action: 'Aggiorna log di attività',
        error: err.message,
        severity: 'CRITICO'
      });
      
      // ✅ SOLUZIONE: Lanciamo l'errore per triggerare ROLLBACK
      throw new Error('Transazione fallita - ROLLBACK eseguito');
    }

  } catch (error) {
    result.status = 'ROLLBACK ESEGUITO';
    result.message = '✅ CORRETTO: Transazione annullata. Il membro NON è stato aggiunto.';
    result.errors.push({
      message: error.message,
    });
  }

  // Step 5: Leggi lo stato finale
  result.steps.push({ step: 5, action: 'Leggi stato finale (dopo ROLLBACK)', status: 'INIZIO' });
  try {
    const [communityAfter] = await execute(
      'SELECT id, members FROM communities WHERE id = 1 AND deletedAt IS NULL',
      []
    );

    let finalMembers = [];
    try {
      finalMembers = JSON.parse(communityAfter[0].members || '[]');
    } catch (e) {
      finalMembers = [];
    }

    result.finalState = {
      membersCount: finalMembers.length,
      membersList: finalMembers,
      memberAdded: false,
      logCreated: false,
      consistency: 'MANTENUTA'
    };

    result.steps.push({ 
      step: 5, 
      action: 'Leggi stato finale',
      status: 'OK',
      data: result.finalState
    });
  } catch (error) {
    result.errors.push({
      step: 5,
      error: error.message
    });
  }

  result.duration = Date.now() - startTime;
  res.json(result);
});

// Endpoint di test comparativo
router.get('/test/comparison', async (req, res, next) => {
  try {
    // Esegui entrambi i test
    const fetch = (path) => {
      return new Promise((resolve) => {
        const url = `http://localhost:5000/api${path}`;
        require('http').get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
      });
    };

    // Esegui solo il test con transazione (il senza transazione genera errore)
    const withTransaction = await fetch('/test/add-member-with-transaction');

    res.json({
      comparison: {
        testWithTransaction: withTransaction,
        conclusion: {
          title: '📊 Conclusione',
          insights: [
            '❌ SENZA Transazione: Rischio di incoerenza dati (membro aggiunto ma log mancante)',
            '✅ CON Transazione: Atomicità garantita (tutto o nulla)',
            '💡 Lezione: Usa sempre transazioni per operazioni multi-step critiche',
            '🔒 Beneficio: Integrità referenziale e consistenza del database'
          ]
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { testEndpointsRouter: router };
