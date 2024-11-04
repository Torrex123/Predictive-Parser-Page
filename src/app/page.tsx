'use client';
import { useState } from 'react';
import styles from './page.module.css';
import ContextFreeGrammar from '@/logic/logic';

const cfg = new ContextFreeGrammar();

export default function Home() {
  const [grammarString, setGrammarString] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState(false);
  const [stringToEvaluate, setStringToEvaluate] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<string[][] | null>(null);
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target ? e.target.result : null;
        if (content) {
          if (typeof content === 'string') {
            validateGrammar(content);
          } else {
            console.error('File content is not a string.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const validateGrammar = (content: string) => {

    setGrammarString('');
    cfg.reset();
    setEvaluationResult(null);

    const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    let valid = true;

    for (const line of lines) {
      const productionRegex = /^[A-Z]+->.+$/;
      if (!productionRegex.test(line)) {
        valid = false;
      }
    }

    const grammarString = lines.join('\n');

    if (!valid) {
      setError(true);
      setIsValid(false);
      setGrammarString(grammarString);
    } else {
      cfg.addCFG(grammarString);
      console.log(cfg);
      setIsValid(true);
      setError(false);
      setGrammarString(grammarString);
    }
  };

  const input = () => {
    return (
      <div className={styles.container}>
        <h2>Input Grammar</h2>
        <div className={styles.box}>
          <div className={styles.results}>
            {grammarString}
          </div>
        </div>
      </div>
    );
  }

  const grammar = () => {

    if (!grammarString) return null;
  
    const rules = [];
    
    for (const nonTerminal of cfg.getOrder()) {
      const productions = cfg.getGrammar()[nonTerminal];
      if (productions) {
        for (const production of productions) {
          rules.push(
            <div key={`${nonTerminal}-${production}`}>
              {nonTerminal}-{'>'}{production}
            </div>
          );
        }
      }
    }
  
    return <div className={styles.grammar}>{rules}</div>;
  };

  const generateTables = () => {
    const firsts = cfg.getFirsts(); 
    const follows = cfg.getFollows(); 

    interface TableData {
      [key: string]: Set<string>;
    }
  
    const createTableRows = (data: TableData) => {
      return cfg.getOrder().map((nonTerminal) => {
        const set = data[nonTerminal];
        const elements = `{${Array.from(set || []).join(', ')}}`;
        return (
          <tr key={nonTerminal}>
            <td>{nonTerminal}</td>
            <td>{elements}</td>
          </tr>
        );
      });
    };
  
    return (
      <div className={styles.tablesContainer}>
        <div className={styles.tableWrapper}>
          <h3>First Sets</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Non-Terminal</th>
                <th>First</th>
              </tr>
            </thead>
            <tbody>{createTableRows(firsts)}</tbody>
          </table>
        </div>
        <div className={styles.tableWrapper}>
          <h3>Follow Sets</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Non-Terminal</th>
                <th>Follow</th>
              </tr>
            </thead>
            <tbody>{createTableRows(follows)}</tbody>
          </table>
        </div>
      </div>
    );
  };

  const showErrorMessage = () => {
    return (
      <div className={styles.container}>
        <h2>Invalid Grammar</h2>
        <p>Please upload a valid .txt file containing a context-free grammar.</p>
        <h3>File Content</h3>
        <div className={styles.box}>
          <div className={styles.results}>
            {grammarString}
          </div>
        </div>
      </div>
    );
  }

  const mTable = () => {
    const terminals = Array.from(cfg.getTerminals()); 
    terminals.push('$'); 
    const order = cfg.getOrder(); 
    const tableM = cfg.getTable(); 
  
    const headers = (
      <tr>
        <th></th>
        {terminals.map((terminal) => (
          <th key={terminal}>{terminal}</th>
        ))}
      </tr>
    );
  
    const rows = order.map((nonTerminal) => {
      return (
        <tr key={nonTerminal}>
          <td>{nonTerminal}</td>
          {terminals.map((terminal) => {
            const production = tableM[nonTerminal] ? tableM[nonTerminal][terminal] : null;
            return (
              <td key={`${nonTerminal}-${terminal}`}>
                {production ? `${nonTerminal}->${production}` : ""}
              </td>
            );
          })}
        </tr>
      );
    });
  
    return (
      <div className={styles.mtable}>
        <table className={styles.table}>
          <thead>{headers}</thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  };

  const validateInput = () => {
    
    const evaliuateString = (string: string) => {
      const result = cfg.ASDalgorithm(string);    
      const rows = result
                  .split('\n')
                  .map(line => line.split('\t'))
                  .filter(
                    row => row.some(cell => cell.trim() !== '') && row.join('\t') !== 'Stack\tInput\tOutput'
                  );

      const lastLine = rows[rows.length - 1];
      const accepted = lastLine[0] === '$' && lastLine[1] === '$';
    
      setEvaluationResult(rows);
      setIsAccepted(accepted);
    };
  
    return (
      <div className={styles.container}>
        <h2>String Recognition</h2>
        <div className={styles.inputwrapper}>
          <input
            type="text"
            placeholder="Enter a string"
            className={styles.inputstring}
            onChange={(e) => setStringToEvaluate(e.target.value)}
          />
          <button
            className={styles.inputbutton}
            onClick={() => evaliuateString(stringToEvaluate)}
          >
            Validate
          </button>
        </div>
        
        {evaluationResult && (
          <div className={styles.resultContainer}>
            <h3>Parsing Steps</h3>
            <table className={styles.resultTable}>
              <thead>
                <tr>
                  <th>Stack</th>
                  <th>Input</th>
                  <th>Output</th>
                </tr>
              </thead>
              <tbody>
                {evaluationResult.map((row, index) => (
                  <tr key={index}>
                    <td>{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 className={styles.acceptanceStatus}>
              {isAccepted ? 'String is accepted!' : 'String is not accepted.'}
            </h4>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Predictive Parser</h1>
        <p>
          Please upload a .txt file containing a context-free grammar. Ensure that you follow these rules:
        </p>
        <ul>
          <li>Uppercase letters represent non-terminals.</li>
          <li>Lowercase letters and any other symbols are terminals.</li>
          <li>Each terminal and non-terminal is represented by a single character, with no spaces between symbols.</li>
        </ul>
        <div className={styles.box}>
          <h2>Example Grammar</h2>
          <pre>
            S-{">"}(L)<br/>
            S-{">"}a<br/>
            L-{">"}L,S<br/>
            L-{">"}S
          </pre>
          <input type="file" accept=".txt" onChange={handleFileUpload} />
          
        </div>
      </div>

      {isValid && input()}

      {error && showErrorMessage()}

      {isValid && (
        <div className={styles.container}>
          <h2>Grammar After Factorization and Without Left Recursion
          </h2>
          <div className={styles.box}>
            <div className={styles.results}>
            {grammar()}
            </div>
          </div>
        </div>
      )}

      {isValid && (
        <div className={styles.container}>
          <h2>First and Follow Sets</h2>
          {generateTables()}
        </div>
      )}

      {isValid && (
        <div className={styles.container}>
          <h2>M-Table</h2>
          {mTable()}
        </div>
      )}

      {isValid && validateInput()}

    </div>
  );
}
