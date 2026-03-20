import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TestPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState({
    withTransaction: null,
    withoutTransaction: null,
    isLoading: false,
    error: null
  });

  const runTests = async () => {
    setResults(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Test SENZA transazione
      const withoutTransRes = await fetch('/api/test/add-member-no-transaction');
      const withoutTransData = await withoutTransRes.json();

      // Test CON transazione
      const withTransRes = await fetch('/api/test/add-member-with-transaction');
      const withTransData = await withTransRes.json();

      setResults({
        withTransaction: withTransData,
        withoutTransaction: withoutTransData,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setResults(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  const TestResult = ({ test, title, isSuccess }) => (
    <div className={`test-result ${isSuccess ? 'success' : 'failure'}`}>
      <div className="test-header">
        <h3>{title}</h3>
        <span className={`status-badge ${isSuccess ? 'bg-success' : 'bg-danger'}`}>
          {isSuccess ? '✅ CORRETTO' : '❌ PROBLEMATICO'}
        </span>
      </div>

      {test.warning && (
        <div className="warning-box">
          ⚠️ {test.warning}
        </div>
      )}

      {test.message && (
        <div className="success-box">
          {test.message}
        </div>
      )}

      <div className="test-details">
        <div className="section">
          <h4>📋 Passi Esecuzione:</h4>
          <div className="steps-list">
            {test.steps && test.steps.map((step, idx) => (
              <div key={idx} className={`step step-${step.status}`}>
                <span className="step-number">{step.step}</span>
                <span className="step-action">{step.action}</span>
                <span className={`step-status status-${step.status}`}>
                  {step.status}
                </span>
                {step.data && (
                  <div className="step-data">
                    <code>{JSON.stringify(step.data, null, 2)}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {test.errors && test.errors.length > 0 && (
          <div className="section error-section">
            <h4>🔴 Errori Rilevati:</h4>
            {test.errors.map((err, idx) => (
              <div key={idx} className="error-item">
                <strong>{err.step ? `Step ${err.step}:` : ''} {err.action || err.message}</strong>
                <p>{err.error || err.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="section final-state">
          <h4>🔍 Stato Finale:</h4>
          {test.finalState ? (
            <div className="state-box">
              <p><strong>Coerenza Data:</strong> 
                <span className={test.finalState.consistency || 'N/D'}>
                  {test.finalState.consistency || (test.finalState.memberAdded ? 'MANTIENE' : 'MANCANTE')}
                </span>
              </p>
              <p><strong>Membro Aggiunto:</strong> {test.finalState.memberAdded ? '✅ Sì' : '❌ No'}</p>
              <p><strong>Log Creato:</strong> {test.finalState.logCreated ? '✅ Sì' : '❌ No'}</p>
              <p><strong>Total Members:</strong> {test.finalState.membersCount}</p>
              <p><strong>Members:</strong> <code>{JSON.stringify(test.finalState.membersList)}</code></p>
            </div>
          ) : (
            <p>N/D</p>
          )}
        </div>

        <div className="section timing">
          <h4>⏱️ Performance:</h4>
          <p>Tempo esecuzione: <strong>{test.duration}ms</strong></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="test-page-container">
      <div className="test-header-section">
        <button className="back-btn" onClick={() => navigate('/')}>← Indietro</button>
        <h1>🧪 Test Database Transazioni</h1>
        <p>Confronto tra operazioni CON e SENZA transazioni</p>
      </div>

      {results.error && (
        <div className="alert alert-danger">
          ❌ Errore: {results.error}
        </div>
      )}

      <div className="test-controls">
        <button 
          className="btn btn-primary btn-lg"
          onClick={runTests}
          disabled={results.isLoading}
        >
          {results.isLoading ? '⏳ Test in corso...' : '▶️ Esegui Test'}
        </button>
      </div>

      {results.withoutTransaction || results.withTransaction ? (
        <div className="test-results-container">
          <div className="intro-section">
            <h2>📚 Cosa testiano?</h2>
            <p>
              Simuliamo l'aggiunta di un membro a una community (ID: 999). 
              Il processo ha 4 step:
            </p>
            <ol>
              <li>Leggi i membri attuali dalla community #1</li>
              <li>Aggiungi il nuovo membro (ID: 999) alla lista</li>
              <li>Aggiorna il database con i nuovi membri</li>
              <li>Registra l'operazione in un log (⚠️ Qui generiamo un errore)</li>
            </ol>
            <p><strong>Il problema:</strong> Se step 3 succede ma step 4 fallisce:</p>
            <ul>
              <li>❌ SENZA transazione: Il membro è stato aggiunto ma il log non esiste → INCOERENZA</li>
              <li>✅ CON transazione: Tutto viene annullato (ROLLBACK) → COERENZA MANTENUTA</li>
            </ul>
          </div>

          <div className="results-grid">
            {results.withoutTransaction && (
              <TestResult 
                test={results.withoutTransaction}
                title="❌ Test SENZA Transazione"
                isSuccess={false}
              />
            )}

            {results.withTransaction && (
              <TestResult 
                test={results.withTransaction}
                title="✅ Test CON Transazione"
                isSuccess={true}
              />
            )}
          </div>

          <div className="conclusion-section">
            <h2>💡 Conclusioni</h2>
            <div className="conclusion-box">
              <h3>Perché le transazioni sono critiche:</h3>
              <ul>
                <li><strong>Atomicità:</strong> Tutte le operazioni si completano o nessuna si completa</li>
                <li><strong>Consistenza:</strong> I dati rimangono coerenti anche in caso di errori</li>
                <li><strong>Isolamento:</strong> Le modifiche non viste finché non è committed</li>
                <li><strong>Durabilità:</strong> Una volta committed, i dati sono permanenti</li>
              </ul>

              <h3>Vantaggi Transazioni in questo test:</h3>
              <ul>
                <li>✅ Se step 4 fallisce, step 3 viene annullato automaticamente</li>
                <li>✅ Il database rimane in uno stato valido e coerente</li>
                <li>✅ Non ci sono record "orfani" o incoerenze</li>
                <li>✅ Niente operazioni parziali incomplete</li>
              </ul>

              <h3>Quando usarle:</h3>
              <ul>
                <li>Multi-stapp operazioni che dipendono l'una dall'altra</li>
                <li>Operazioni di business logic critica</li>
                <li>Quando un fallimento parziale danneggerebbe l'integrità</li>
                <li>Aggiunta/rimozione di utenti da referenze complesse</li>
              </ul>
            </div>
          </div>
        </div>
      ) : !results.isLoading && (
        <div className="empty-state">
          <p>Clicca "Esegui Test" per vedere il confronto</p>
        </div>
      )}
    </div>
  );
}
