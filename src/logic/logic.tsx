export default class ContextFreeGrammar {

    private nonterminals: Set<string>;
    private terminals: Set<string>;
    private grammar: { [key: string]: Set<string> };
    private order: string[];
    private firsts: { [key: string]: Set<string> };
    private follows: { [key: string]: Set<string> };
    private table: { [key: string]: { [key: string]: string } };

    constructor() {
        this.nonterminals = new Set()
        this.terminals = new Set()
        this.grammar = {}
        this.order = []
        this.firsts = {}
        this.follows = {}
        this.table = {}
    }

    reset() {
        this.nonterminals = new Set()
        this.terminals = new Set()
        this.grammar = {}
        this.order = []
        this.firsts = {}
        this.follows = {}
        this.table = {}
    }

    addCFG(cfg: string) {
        this.#parseGrammar(cfg)
        this.#eliminateLeftRecursion()
    }

    #isNonterminal(symbol: string) {
        return /^[A-Z]'*$/.test(symbol);
    }

    #splitSymbols(rule: string): string[] | null {
        return rule.match(/[A-Z]'*|./g);
    }

    #getLeftNonterminal(rule: string): string | null {
        return rule.match(/^[A-Z]'*/g)?.[0] || null;
    }

    #isLeftRecursive(nonterminal: string, rules: string[] | Set<string>){ 
        for (const rule of rules) {
            if (rule.startsWith(nonterminal)) return true;
        }
        return false;
    }

    #generateNewNonterminal(base: string) {
        let newNonterminal = base + "'";
        while (this.nonterminals.has(newNonterminal)) {
            newNonterminal += "'";
        }

        this.nonterminals.add(newNonterminal);
        this.order.splice(this.order.indexOf(base) + 1, 0, newNonterminal);
        this.grammar[newNonterminal] = new Set();
        return newNonterminal;
    }

    #parseGrammar(cfg: string) {
        cfg.split("\n").forEach(production => {
            const sides = production.split("->");
            const nonterminal = sides[0];
            let rule = sides[1];
            this.#initializeNonterminal(nonterminal);
            rule = rule.replace(/&/g, '');
            if (rule === '') {
                rule = '&';
            }
            this.grammar[nonterminal].add(rule);
            this.#classifySymbols(rule);
        });
    }

    #initializeNonterminal(nonterminal: string) {
        if (nonterminal in this.grammar) {
            return;
        }
        if (!this.#isNonterminal(nonterminal)) {
            throw new Error(`El símbolo '${nonterminal}' no es un no-terminal válido`);
        }
        this.grammar[nonterminal] = new Set();
        this.nonterminals.add(nonterminal);
        this.order.push(nonterminal);
    }

    #classifySymbols(rule: string) {
        const symbols = this.#splitSymbols(rule);
        if (symbols) {
            symbols.forEach(symbol => {
                if (this.#isNonterminal(symbol)) {
                    this.nonterminals.add(symbol);
                    return;
                }
                this.terminals.add(symbol);
            });
        }
    }

    #eliminateLeftRecursion() {
        for (const nonterminal of this.order) {
            if (this.#isLeftRecursive(nonterminal, this.grammar[nonterminal])) {
                this.#removeDirectLeftRecursion(nonterminal);
            }
            this.#leftFactoring(nonterminal)  
        }

        this.#calculateFirstSet()
        this.#calculateFollowSet()
        this.#table()
    }

    #leftFactoring(nonterminal: string) {
        const productions = Array.from(this.grammar[nonterminal]);
    
        const commonPrefix = (productions: string[]): string => {
            const symbols = productions.map(production => this.#splitSymbols(production));
        
            if (symbols.length < 2) return ""; 
            
            const findCommonPrefix = (arr1: string[], arr2: string[]): string[] => {
            const common: string[] = [];
            const minLength = Math.min(arr1.length, arr2.length); 
            for (let i = 0; i < minLength; i++) {
                if (arr1[i] !== arr2[i]) break;
                common.push(arr1[i]);
            }
            return common;
            };
        
            let longestPrefix: string[] = [];
            for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                const currentPrefix = findCommonPrefix(symbols[i] as string[], symbols[j] as string[]);
                if (currentPrefix.length > longestPrefix.length) {
                longestPrefix = currentPrefix;
                }
            }
            }
        
            return longestPrefix.join("");
        };
    
        let prefix: string;
        while ((prefix = commonPrefix(productions)).length > 0) {
            const newNonterminal = this.#generateNewNonterminal(nonterminal);
            const newProductions = new Set<string>();
            const updatedProductions = new Set<string>();
    
            productions.forEach(production => {
                if (production.startsWith(prefix)) {
                    const remainder = production.slice(prefix.length);
                    if (remainder === "") {
                        newProductions.add("&"); 
                    } else {
                        newProductions.add(remainder);
                    }
                    updatedProductions.add(prefix + newNonterminal);
                } else {
                    updatedProductions.add(production); 
                }
            });
    
            this.grammar[nonterminal] = updatedProductions;
            this.grammar[newNonterminal] = newProductions;
    
            productions.length = 0; 
            productions.push(...updatedProductions);
        }
    }
    
    #removeDirectLeftRecursion(nonterminal: string) {
        const newNonterminal = this.#generateNewNonterminal(nonterminal);
        const rules = new Set<string>();
        
        this.grammar[nonterminal].forEach(rule => {
            const leftNonterminal = this.#getLeftNonterminal(rule);
            if (leftNonterminal === nonterminal) {
                this.grammar[newNonterminal].add(rule.slice(leftNonterminal.length) + newNonterminal);
            } else {
                if (rule === "&") {
                    rules.add(newNonterminal);
                } else {
                    rules.add(rule + newNonterminal);
                }
            }
        });

        if (rules.size === 0) {
            rules.add(newNonterminal)
        }

        this.grammar[newNonterminal].add("&");
        this.grammar[nonterminal] = rules;
    }

    #calculateFirstSet() {
        const firstSet: { [key: string]: Set<string> } = {};
        for (const nonterminal of this.order) {
            firstSet[nonterminal] = new Set();
        }
    
        const computeFirst = (symbol: string) => {

            if (!this.#isNonterminal(symbol)) {
                return new Set([symbol]);
            }
    
            const result = firstSet[symbol];
            if (result.size > 0) {
                return result;
            }
    
            for (const rule of this.grammar[symbol]) {
                const symbols = this.#splitSymbols(rule);
                let i = 0;
                while (symbols && i < symbols.length) {
                    const firstOfCurrent = computeFirst(symbols[i]);
                    for (const item of firstOfCurrent) {
                        result.add(item);
                    }
                    if (!firstOfCurrent.has('&')) {
                        break;
                    }
                    i++;
                }
            }

            return result;
        };
    
        for (const nonterminal of this.order) {
            computeFirst(nonterminal);
        }
    
        this.firsts = firstSet;
        return firstSet;
    }
    
    #calculateFollowSet() {

        const followSet: { [key: string]: Set<string> } = {};
        
        for (const nonterminal of this.order) {
            followSet[nonterminal] = new Set();
        }
    
        followSet[this.order[0]].add('$');
    

        const addSet = (targetSet: Set<string>, sourceSet: Set<string>): void => {
            for (const item of sourceSet) {
                targetSet.add(item);
            }
        };
    
        let changed = true;
        while (changed) {
            changed = false;
            for (const nonterminal of this.order) {
                for (const rule of this.grammar[nonterminal]) {
                    const symbols = this.#splitSymbols(rule);

                    if (!symbols) continue;
    
                    for (let i = 0; i < symbols.length; i++) {
                        const symbol = symbols[i];
                        if (this.#isNonterminal(symbol)) {
                            if (i + 1 < symbols.length) {
                                const nextSymbol = symbols[i + 1];
                                if (this.#isNonterminal(nextSymbol)) {
                                    const firstSetOfNext = this.firsts[nextSymbol];
                                    const beforeChangeSize = followSet[symbol].size;
                                    for (const item of firstSetOfNext) {
                                        if (item !== '&') {
                                            followSet[symbol].add(item);
                                        }
                                    }
                                    if (followSet[symbol].size > beforeChangeSize) {
                                        changed = true;
                                    }
                                } else {
                                    const beforeChangeSize = followSet[symbol].size;
                                    followSet[symbol].add(nextSymbol);
                                    if (followSet[symbol].size > beforeChangeSize) {
                                        changed = true;
                                    }
                                }
                            }
    
                            if (i + 1 === symbols.length || symbols.slice(i + 1).every(s => this.firsts[s]?.has('&'))) {
                                const beforeChangeSize = followSet[symbol].size;
                                addSet(followSet[symbol], followSet[nonterminal]);
                                if (followSet[symbol].size > beforeChangeSize) {
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    
        this.follows = followSet;
        return followSet;
    }

    #table() {
        const m: { [key: string]: { [key: string]: string } } = {};
    
        for (const nonterminal of this.order) {
            m[nonterminal] = {}; 
        }
    
        for (const nonterminal of this.order) {
            for (const rule of this.grammar[nonterminal]) {
                const symbols = this.#splitSymbols(rule);
                if (!symbols) continue;
    
                if (symbols[0] === '&') {
                    for (const terminal of this.follows[nonterminal]) {
                        m[nonterminal][terminal] = rule;
                    }
                    continue;
                }
    
                let index = 0;
                let hasEpsilon = true;
    
                while (hasEpsilon && index < symbols.length) {
                    const currentSymbol = symbols[index];
    
                    if (!this.#isNonterminal(currentSymbol)) {
                        m[nonterminal][currentSymbol] = rule;
                        hasEpsilon = false;
                    } else {
                        const firstSet = new Set(this.firsts[currentSymbol]);
                        if (firstSet.has('&')) {
                            firstSet.delete('&');
                        } else {
                            hasEpsilon = false;
                        }
    
                        for (const terminal of firstSet) {
                            m[nonterminal][terminal] = rule;
                        }
                    }
                    index++;
                }
    
                if (hasEpsilon) {
                    for (const terminal of this.follows[nonterminal]) {
                        m[nonterminal][terminal] = rule;
                    }
                }
            }
        }
    
        this.table = m;
        return m;
    }
    

    ASDalgorithm(input: string) {
        const stack = ["$", this.order[0]];
        input = input + "$";
        const table = this.table;
    
        const formatState = (stack: string[], input: string, production: string): string => {
            return `${stack.join("")}\t${input}\t${production}\n`;
        };
        
        const splitSymbols = (rule: string) => {
            const symbols = [];
            let i = 0;
            while (i < rule.length) {
                if (i < rule.length - 1 && rule[i + 1] === "'") {
                    symbols.push(rule[i] + "'");
                    i += 2;
                } else {
                    symbols.push(rule[i]);
                    i++;
                }
            }
            return symbols;
        };
        
        const updateStack = (rule: string) => {
            if (rule !== "&") { 
                const symbols = splitSymbols(rule);
                for (let i = symbols.length - 1; i >= 0; i--) {
                    stack.push(symbols[i]);
                }
            }
        };
    
        let process = "Stack\tInput\tOutput\n";
    
        while (stack.length > 0) {
            const currentSymbol = stack[stack.length - 1];
            const currentInput = input[0];
            let production = "";

            if (this.#isNonterminal(currentSymbol)) {
                const rule = table[currentSymbol][currentInput];
                if (!rule) {
                    process += formatState([...stack], input, 'Error');
                    return process;
                }
                production = `${currentSymbol} -> ${rule}`;
                process += formatState([...stack], input, production);
                stack.pop(); 
                updateStack(rule);
            } else {
                process += formatState([...stack], input, production);
                input = input.slice(1);
                stack.pop();
            }
        }
        
        return process;
    }

    getGrammar() {
        return this.grammar;
    }

    getFirsts() {
        return this.firsts;
    }

    getFollows() {
        return this.follows;
    }

    getTable() {
        return this.table;
    }

    getOrder() {
        return this.order;
    }

    getTerminals() {
        return this.terminals;
    }
}