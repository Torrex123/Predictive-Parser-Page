'use client';
import { useState } from 'react';
import styles from './page.module.css';
import ContextFreeGrammar from '@/logic/logic';

const cfg = new ContextFreeGrammar();

export default function Home() {
  const [grammarString, setGrammarString] = useState('');
  const [isValid, setIsValid] = useState(false);

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
    const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    let valid = true;

    for (const line of lines) {
      const productionRegex = /^[A-Z]->[A-Za-z&]+$/;
      if (!productionRegex.test(line)) {
        console.error(`Invalid production: ${line}`);
        valid = false;
        break;
      }
    }

    if (valid) {
      console.log('Grammar is valid.');
      const grammarString = lines.join('\n');
      cfg.addCFG(grammarString);
      console.log(cfg);
      setIsValid(true);
      setGrammarString(grammarString);
    } else {
      console.error('Grammar validation failed.');
      setIsValid(false);
    }
  };

  const grammar = () => {
    if (!grammarString) return null;
  
    // Parse the cfg object and display the grammar rules in the specified order
    const rules = [];
    
    // Iterate over cfg.order to maintain the desired sequence
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
          <h2>Example Grammar:</h2>
          <pre>
            S-{">"}(L)<br/>
            S-{">"}a<br/>
            L-{">"}L,S<br/>
            L-{">"}S
          </pre>
          <input type="file" accept=".txt" onChange={handleFileUpload} />
          
        </div>
      </div>

      {isValid && (
        <div className={styles.container}>
          <h2>Grammar after factorization and without left recursion
          </h2>
          <div className={styles.box}>
            <pre>
            {grammar()}
            </pre>
          </div>
        </div>
      )}

      {isValid && (
        <div className={styles.container}>
          <h2>First and Follow Sets</h2>
          {generateTables()}
        </div>
      )}


    </div>
  );
}
